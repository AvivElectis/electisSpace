/**
 * AIMS Reconciliation Sync Job
 *
 * Periodically reconciles articles in AIMS with the server database.
 *
 * Working-mode logic:
 *  - People mode  (settings.peopleManagerEnabled === true):
 *      DB is source of truth. Expected articles = assigned people + conference rooms.
 *      Extras in AIMS that aren't in DB → deleted from AIMS.
 *  - Spaces mode  (default):
 *      AIMS is source of truth. DB spaces → pushed to AIMS if missing/changed.
 *      Extras in AIMS that aren't in DB → IMPORTED into DB (never deleted from AIMS).
 *      Deletion from AIMS only happens via explicit user action (SyncQueueProcessor DELETE).
 *
 * On each cycle (60s):
 *  1. Build the set of expected articles from DB (based on working mode)
 *  2. Fetch current articles from AIMS
 *  3. Diff → push missing, update changed
 *  4. Spaces mode: import unknown AIMS articles into DB
 *  5. People mode: delete extras from AIMS
 */

import { prisma } from '../../../config/index.js';
import { aimsGateway } from '../services/aimsGateway.js';
import { cacheGet, cacheSet } from '../services/redisCache.js';
import {
    buildSpaceArticle,
    buildPersonArticle,
    buildEmptySlotArticle,
    buildConferenceArticle,
    articleNeedsUpdate,
    type ConferenceMappingConfig,
} from '../services/articleBuilder.js';
import type { ArticleFormat } from '../services/solumService.js';
import type { AimsArticle, AimsArticleInfo } from '../services/aims.types.js';
import { appLogger } from '../services/appLogger.js';

// Cache TTL for company settings (60 seconds — matches reconciliation interval)
const COMPANY_SETTINGS_TTL = 60;

// Default interval: 60 seconds
const DEFAULT_INTERVAL_MS = 60 * 1000;

// Initial delay before first run (let server fully boot)
const INITIAL_DELAY_MS = 15000;

export interface ReconcileStoreResult {
    storeId: string;
    storeName: string;
    mode: 'people' | 'spaces';
    success: boolean;
    pushed: number;    // articles created/updated in AIMS
    deleted: number;   // stale articles removed from AIMS (people mode only)
    imported: number;  // AIMS articles imported into DB (spaces mode only)
    unchanged: number; // articles already in sync
    repaired: number;  // articles re-pushed after post-sync validation found them missing
    totalExpected: number;
    totalInAims: number;
    error?: string;
}

/**
 * AIMS Reconciliation Sync Job
 */
export class AimsSyncReconciliationJob {
    private isRunning = false;
    private intervalId: ReturnType<typeof setInterval> | null = null;

    // ───── lifecycle ─────

    start(intervalMs = DEFAULT_INTERVAL_MS): void {
        if (this.intervalId) {
            appLogger.info('AimsPullSync', 'Job already running');
            return;
        }
        appLogger.info('AimsPullSync', `Starting pull sync job with ${intervalMs / 1000}s interval`);
        this.intervalId = setInterval(() => this.tick(), intervalMs);
        setTimeout(() => this.tick(), INITIAL_DELAY_MS);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            appLogger.info('AimsPullSync', 'Job stopped');
        }
    }

    // ───── tick ─────

    private async tick(): Promise<void> {
        if (this.isRunning) return;
        this.isRunning = true;
        try {
            const results = await this.reconcileAllStores();

            for (const r of results) {
                if (!r.success) {
                    appLogger.warn('AimsReconcile', `${r.storeName}: ERROR – ${r.error}`);
                } else if (r.pushed > 0 || r.deleted > 0 || r.imported > 0 || r.repaired > 0) {
                    appLogger.info('AimsReconcile', `${r.storeName} (${r.mode}): pushed ${r.pushed}, deleted ${r.deleted}, imported ${r.imported}, unchanged ${r.unchanged}${r.repaired > 0 ? `, repaired ${r.repaired}` : ''} (expected ${r.totalExpected}, aims had ${r.totalInAims})`);
                }
            }
        } catch (error) {
            appLogger.error('AimsReconcile', 'Tick error', { error: error instanceof Error ? error.message : String(error) });
        } finally {
            this.isRunning = false;
        }
    }

    // ───── main logic ─────

    async reconcileAllStores(): Promise<ReconcileStoreResult[]> {
        const stores = await prisma.store.findMany({
            where: {
                syncEnabled: true,
                isActive: true,
                company: {
                    aimsBaseUrl: { not: null },
                    aimsUsername: { not: null },
                    aimsPasswordEnc: { not: null },
                    isActive: true,
                },
            },
            select: {
                id: true,
                code: true,
                name: true,
                settings: true,
                companyId: true,
                company: { select: { settings: true } },
            },
        });

        if (stores.length === 0) return [];

        const results: ReconcileStoreResult[] = [];
        for (const store of stores) {
            try {
                const result = await this.reconcileStore(store);
                results.push(result);
            } catch (error: any) {
                results.push({
                    storeId: store.id,
                    storeName: store.name || store.code,
                    mode: 'spaces',
                    success: false,
                    pushed: 0, deleted: 0, imported: 0, unchanged: 0, repaired: 0,
                    totalExpected: 0, totalInAims: 0,
                    error: error.message,
                });
            }
        }
        return results;
    }

    /**
     * Reconcile a single store: DB ➜ AIMS
     */
    private async reconcileStore(store: {
        id: string;
        code: string;
        name: string;
        settings: any;
        companyId: string;
        company?: { settings: any } | null;
    }): Promise<ReconcileStoreResult> {
        const storeId = store.id;
        const storeName = store.name || store.code;

        // Company settings: prefer joined data, fall back to Redis cache, then DB query.
        let companySettings: Record<string, any> =
            (store.company?.settings as Record<string, any>) || {};

        if (Object.keys(companySettings).length === 0) {
            // Fallback for manual triggers (reconcileStoreNow) that don't join company
            const cacheKey = `company-settings:${store.companyId}`;
            try {
                const cached = await cacheGet<Record<string, any>>(cacheKey);
                if (cached) {
                    companySettings = cached;
                } else {
                    const company = await prisma.company.findUnique({
                        where: { id: store.companyId },
                        select: { settings: true },
                    });
                    companySettings = (company?.settings as Record<string, any>) || {};
                    await cacheSet(cacheKey, companySettings, COMPANY_SETTINGS_TTL);
                }
            } catch (error: any) {
                appLogger.warn('AimsReconcile', `Could not fetch company settings for ${storeName}: ${error.message}`);
            }
        }

        // peopleManagerEnabled is a company-level setting (saved via /settings/company endpoint),
        // NOT a store-level setting. Read from companySettings, fall back to store.settings.
        const isPeopleMode =
            companySettings.peopleManagerEnabled === true ||
            ((store.settings ?? {}) as Record<string, any>).peopleManagerEnabled === true;
        const mode: 'people' | 'spaces' = isPeopleMode ? 'people' : 'spaces';

        const result: ReconcileStoreResult = {
            storeId, storeName, mode,
            success: true,
            pushed: 0, deleted: 0, imported: 0, unchanged: 0, repaired: 0,
            totalExpected: 0, totalInAims: 0,
        };

        // Extract needed config from company settings
        const mappingConfig = companySettings.solumMappingConfig || {};
        const rawConferenceMapping = mappingConfig.conferenceMapping;
        const conferenceMapping: ConferenceMappingConfig | null =
            rawConferenceMapping?.meetingName && rawConferenceMapping?.meetingTime && rawConferenceMapping?.participants
                ? rawConferenceMapping as ConferenceMappingConfig
                : null;
        const globalFields: Record<string, string> | undefined = mappingConfig.globalFieldAssignments;
        const totalSpaces: number = companySettings.peopleManagerConfig?.totalSpaces ?? 0;

        // 1. Parallel fetch: article format, DB entities, and AIMS articles are all independent.
        //    Run them concurrently to minimize total I/O wait time.
        const [formatResult, rooms, modeEntities, aimsResult] = await Promise.all([
            aimsGateway.fetchArticleFormat(storeId).catch((error: any) => {
                appLogger.warn('AimsReconcile', `Could not fetch article format for ${storeName}: ${error.message}. Articles will be sent without format mapping.`);
                return null as ArticleFormat | null;
            }),
            prisma.conferenceRoom.findMany({ where: { storeId } }),
            isPeopleMode
                ? prisma.person.findMany({ where: { storeId, assignedSpaceId: { not: null } } })
                : prisma.space.findMany({ where: { storeId } }),
            aimsGateway.pullArticleInfo(storeId).then(
                (infos) => ({ infos, articles: null as AimsArticle[] | null, error: null as string | null }),
                (error: any) => ({ infos: [] as AimsArticleInfo[], articles: null as AimsArticle[] | null, error: error.message as string }),
            ),
        ]);

        const format = formatResult;

        // If AIMS fetch failed entirely, bail out
        if (aimsResult.error && aimsResult.infos.length === 0) {
            // Try fallback to basic articles endpoint before giving up
            try {
                const fallbackArticles = await aimsGateway.pullArticles(storeId);
                aimsResult.articles = fallbackArticles;
                aimsResult.error = null;
            } catch (fallbackError: any) {
                result.success = false;
                result.error = `Failed to fetch AIMS articles: ${aimsResult.error}`;
                return result;
            }
        }

        let aimsArticleInfos: AimsArticleInfo[] = aimsResult.infos;
        let aimsArticles: AimsArticle[];

        if (aimsResult.articles) {
            // Used fallback endpoint
            aimsArticles = aimsResult.articles;
            if (aimsArticles.length > 0) {
                appLogger.info('AimsReconcile', `${storeName}: articleInfo failed/empty, /articles returned ${aimsArticles.length} — using basic endpoint`);
            }
        } else if (aimsArticleInfos.length > 0) {
            aimsArticles = aimsArticleInfos as unknown as AimsArticle[];
        } else {
            // Article info returned empty — fall back to basic articles endpoint
            try {
                aimsArticles = await aimsGateway.pullArticles(storeId);
                if (aimsArticles.length > 0) {
                    appLogger.info('AimsReconcile', `${storeName}: articleInfo returned 0 but /articles returned ${aimsArticles.length} — using basic endpoint`);
                }
            } catch (error: any) {
                result.success = false;
                result.error = `Failed to fetch AIMS articles: ${error.message}`;
                return result;
            }
        }

        // 2. Build expected article map from DB entities
        const expectedMap = new Map<string, AimsArticle>();

        for (const room of rooms) {
            const article = buildConferenceArticle(room, format, conferenceMapping);
            expectedMap.set(article.articleId, article);
        }

        if (isPeopleMode) {
            const people = modeEntities as Awaited<ReturnType<typeof prisma.person.findMany>>;
            const occupiedSlots = new Set<string>();
            for (const person of people) {
                if (!person.assignedSpaceId) continue;
                const article = buildPersonArticle(person as any, format, globalFields);
                if (article) {
                    expectedMap.set(person.assignedSpaceId, article);
                    occupiedSlots.add(person.assignedSpaceId);
                }
            }

            for (let i = 1; i <= totalSpaces; i++) {
                const slotId = String(i);
                if (!occupiedSlots.has(slotId)) {
                    const emptyArticle = buildEmptySlotArticle(slotId, format);
                    expectedMap.set(slotId, emptyArticle);
                }
            }
        } else {
            const spaces = modeEntities as Awaited<ReturnType<typeof prisma.space.findMany>>;
            for (const space of spaces) {
                const article = buildSpaceArticle(space, format);
                expectedMap.set(space.externalId, article);
            }
        }

        result.totalExpected = expectedMap.size;

        const aimsMap = new Map<string, AimsArticle>();
        for (const a of aimsArticles) {
            const id = a.articleId || a.article_id;
            if (id) aimsMap.set(String(id), a);
        }
        result.totalInAims = aimsMap.size;

        // 3. Diff
        const toPush: AimsArticle[] = [];   // create or update in AIMS
        const pushReasons: string[] = [];   // diagnostic: why each article is pushed

        // Articles that should exist
        for (const [artId, article] of expectedMap) {
            const aimsArticle = aimsMap.get(artId);
            if (!aimsArticle) {
                // Missing → push
                toPush.push(article);
                if (pushReasons.length < 5) pushReasons.push(`${artId}: missing`);
            } else if (articleNeedsUpdate(article, aimsArticle)) {
                // Changed → update (AIMS upserts on push)
                toPush.push(article);
                if (pushReasons.length < 5) pushReasons.push(`${artId}: changed`);
            } else {
                result.unchanged++;
            }
        }

        // Articles in AIMS that are NOT in the expected map
        const extraInAims: string[] = [];
        for (const aimsId of aimsMap.keys()) {
            if (!expectedMap.has(aimsId)) {
                extraInAims.push(aimsId);
            }
        }

        // Diagnostic logging when changes are detected
        if (toPush.length > 0 || extraInAims.length > 0) {
            const sampleKeys = (map: Map<string, unknown>, n: number) => {
                const keys: string[] = [];
                for (const k of map.keys()) { keys.push(k); if (keys.length >= n) break; }
                return keys.join(', ');
            };
            const extraAction = isPeopleMode ? `delete ${extraInAims.length}` : `import ${extraInAims.length}`;
            appLogger.info('AimsReconcile', `${storeName} diff: push ${toPush.length}, ${extraAction}, unchanged ${result.unchanged}. Expected (sample): [${sampleKeys(expectedMap, 5)}], AIMS (sample): [${sampleKeys(aimsMap, 5)}]. Reasons: ${pushReasons.join('; ') || 'none'}`);
        }

        // 4. Execute (pushArticles already handles batching in groups of 500)
        if (toPush.length > 0) {
            try {
                await aimsGateway.pushArticles(storeId, toPush);
                result.pushed = toPush.length;
            } catch (error: any) {
                appLogger.error('AimsReconcile', `Push failed for ${storeName}: ${error.message}`);
                result.success = false;
                result.error = `Push failed: ${error.message}`;
                return result;
            }
        }

        // 4a. Spaces mode: batch-import AIMS articles that don't exist in DB
        if (!isPeopleMode && extraInAims.length > 0) {
            // Exclude articles with a pending DELETE in the sync queue (user deleted the space,
            // but SyncQueueProcessor hasn't removed it from AIMS yet — don't re-import).
            const pendingDeletes = await prisma.syncQueueItem.findMany({
                where: {
                    storeId,
                    entityType: 'space',
                    action: 'DELETE',
                    status: { in: ['PENDING', 'PROCESSING'] },
                },
                select: { payload: true },
            });
            const pendingDeleteIds = new Set(
                pendingDeletes.map(d => (d.payload as any)?.externalId).filter(Boolean)
            );

            const toImport = extraInAims
                .filter(id => !id.startsWith('C'))          // Skip conference room articles
                .filter(id => !pendingDeleteIds.has(id))     // Skip articles pending deletion
                .map(aimsId => {
                    const aimsArticle = aimsMap.get(aimsId)!;
                    const articleData = (aimsArticle.data || aimsArticle) as Record<string, unknown>;
                    return {
                        storeId,
                        externalId: aimsId,
                        data: articleData as any,
                        syncStatus: 'SYNCED' as const,
                    };
                });

            if (toImport.length > 0) {
                try {
                    const { count } = await prisma.space.createMany({
                        data: toImport,
                        skipDuplicates: true,
                    });
                    result.imported = count;
                } catch (error: any) {
                    appLogger.warn('AimsReconcile', `Batch import failed for ${storeName}, falling back to individual inserts: ${error.message}`);
                    // Fallback: insert one-by-one
                    for (const row of toImport) {
                        try {
                            await prisma.space.create({ data: row });
                            result.imported++;
                        } catch (err: any) {
                            if (err.code !== 'P2002') {
                                appLogger.warn('AimsReconcile', `Failed to import AIMS article ${row.externalId} into DB for ${storeName}: ${err.message}`);
                            }
                        }
                    }
                }
                if (result.imported > 0) {
                    appLogger.info('AimsReconcile', `Imported ${result.imported} AIMS article(s) into DB for ${storeName}: ${extraInAims.slice(0, 10).join(', ')}${extraInAims.length > 10 ? '...' : ''}`);
                }
            }
        }

        // 4b. People mode: delete extras from AIMS (with safety check)
        if (isPeopleMode && extraInAims.length > 0) {
            // Mass-deletion safeguard: if we're about to delete a large portion of AIMS
            // articles while expected is very small, something is likely wrong (e.g., people
            // mode flag lost, DB query returned empty). Refuse to delete and log an error.
            const MIN_DELETION_THRESHOLD = 5;
            if (
                extraInAims.length >= MIN_DELETION_THRESHOLD &&
                aimsMap.size > 0 &&
                extraInAims.length > aimsMap.size * 0.5
            ) {
                appLogger.error('AimsReconcile', `SAFETY: Refusing to delete ${extraInAims.length} of ${aimsMap.size} AIMS articles for ${storeName} (${mode}). Expected map has ${expectedMap.size} articles. This looks like a data issue — skipping deletion to protect existing articles.`, { ids: extraInAims.slice(0, 20) });
                result.error = `Safety: refused mass deletion of ${extraInAims.length}/${aimsMap.size} articles`;
            } else {
                try {
                    await aimsGateway.deleteArticles(storeId, extraInAims);
                    result.deleted = extraInAims.length;
                } catch (error: any) {
                    appLogger.error('AimsReconcile', `Delete failed for ${storeName}: ${error.message}`);
                    // Non-fatal — we still pushed successfully
                    result.error = `Delete failed (${extraInAims.length} stale articles): ${error.message}`;
                }
            }
        }

        // 5. Sync assignedLabels using the already-fetched article info + post-sync validation
        //    Re-fetch from AIMS only when we pushed/deleted — otherwise reuse prefetched data.
        const aimsChanged = result.pushed > 0 || result.deleted > 0;
        const postPushInfos = aimsChanged
            ? await aimsGateway.pullArticleInfo(storeId).catch(() => aimsArticleInfos)
            : aimsArticleInfos;
        const { missingIds } = await this.syncAssignedLabels(storeId, expectedMap, isPeopleMode, postPushInfos);

        if (missingIds.length > 0) {
            const toRepair = missingIds
                .map(id => expectedMap.get(id))
                .filter((a): a is AimsArticle => a !== undefined);

            if (toRepair.length > 0) {
                try {
                    await aimsGateway.pushArticles(storeId, toRepair);
                    result.repaired = toRepair.length;
                    appLogger.warn('AimsReconcile', `Repaired ${toRepair.length} article(s) missing from AIMS for ${storeName}: ${missingIds.slice(0, 10).join(', ')}${missingIds.length > 10 ? '...' : ''}`);
                } catch (error: any) {
                    appLogger.error('AimsReconcile', `Repair push failed for ${storeName}: ${error.message}`);
                }
            }
        }

        // 6. Update store last sync timestamp
        await prisma.store.update({
            where: { id: storeId },
            data: { lastAimsSyncAt: new Date() },
        });

        return result;
    }

    // ───── assigned labels sync + validation ─────

    /**
     * Sync assignedLabel data from AIMS article info to DB records.
     * Also performs post-sync validation: compares article info against expectedMap to
     * detect discrepancies (informational logging only — next reconcile fixes them).
     *
     * Mode-aware: in people mode, syncs to Person records (not Space).
     * Conference articles use a "C" prefix on their articleId (e.g. "C12").
     */
    private async syncAssignedLabels(
        storeId: string,
        expectedMap: Map<string, AimsArticle>,
        isPeopleMode: boolean,
        prefetchedInfos?: AimsArticleInfo[],
    ): Promise<{ missingIds: string[] }> {
        try {
            const articleInfoList = prefetchedInfos ?? await aimsGateway.pullArticleInfo(storeId);

            // --- Batch sync assignedLabels to DB (single transaction instead of N queries) ---
            const labelUpdates: ReturnType<typeof prisma.conferenceRoom.updateMany>[] = [];
            let labelCount = 0;

            for (const info of articleInfoList) {
                const artId = info.articleId != null ? String(info.articleId) : null;
                if (!artId) continue;

                // Only sync when AIMS actually returned label data (array).
                if (!Array.isArray(info.assignedLabel)) continue;
                const labels: string[] = info.assignedLabel;
                labelCount++;

                if (artId.startsWith('C')) {
                    const externalId = artId.slice(1);
                    labelUpdates.push(prisma.conferenceRoom.updateMany({
                        where: { storeId, externalId },
                        data: { assignedLabels: labels },
                    }));
                } else if (isPeopleMode) {
                    labelUpdates.push(prisma.person.updateMany({
                        where: { storeId, assignedSpaceId: artId },
                        data: { assignedLabels: labels },
                    }));
                } else {
                    labelUpdates.push(prisma.space.updateMany({
                        where: { storeId, externalId: artId },
                        data: { assignedLabels: labels },
                    }));
                }
            }

            if (labelUpdates.length > 0) {
                await prisma.$transaction(labelUpdates);
            }
            appLogger.info('AimsReconcile', `Article info: ${articleInfoList.length} articles, ${labelCount} label(s) synced`);

            // --- Post-sync validation: find articles missing from AIMS ---
            const aimsInfoIds = new Set<string>();
            for (const info of articleInfoList) {
                if (info.articleId) aimsInfoIds.add(String(info.articleId));
            }

            const missingInAims: string[] = [];
            for (const artId of expectedMap.keys()) {
                if (!aimsInfoIds.has(artId)) {
                    missingInAims.push(artId);
                }
            }

            if (missingInAims.length > 0) {
                appLogger.warn('AimsReconcile', `Validation: ${missingInAims.length} expected article(s) missing from AIMS (will attempt repair): ${missingInAims.slice(0, 10).join(', ')}${missingInAims.length > 10 ? '...' : ''}`);
            }

            // Log extras count without allocating an intermediate array
            let extraCount = 0;
            for (const i of articleInfoList) {
                if (i.articleId && !expectedMap.has(String(i.articleId))) extraCount++;
            }
            if (extraCount > 0) {
                appLogger.info('AimsReconcile', `Validation: ${extraCount} article(s) in AIMS not in expected map`);
            }

            return { missingIds: missingInAims };
        } catch (error: any) {
            // Non-fatal — don't break the reconcile cycle
            appLogger.error('AimsReconcile', `Failed to sync assignedLabels from article info: ${error.message}`);
            return { missingIds: [] };
        }
    }

    // ───── manual triggers ─────

    async reconcileNow(): Promise<ReconcileStoreResult[]> {
        return this.reconcileAllStores();
    }

    async reconcileStoreNow(storeId: string): Promise<ReconcileStoreResult> {
        const store = await prisma.store.findUniqueOrThrow({
            where: { id: storeId },
            select: { id: true, code: true, name: true, settings: true, companyId: true },
        });
        return this.reconcileStore(store);
    }
}

// Singleton instance (exported name unchanged for server.ts compatibility)
export const aimsPullSyncJob = new AimsSyncReconciliationJob();
