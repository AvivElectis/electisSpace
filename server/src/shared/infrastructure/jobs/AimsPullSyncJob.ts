/**
 * AIMS Reconciliation Sync Job
 * 
 * Periodically reconciles articles in AIMS with the server database.
 * The SERVER DB is the single source of truth — AIMS is kept in sync.
 * 
 * Working-mode logic:
 *  - People mode  (settings.peopleManagerEnabled === true):
 *      Expected articles = assigned people (articleId = assignedSpaceId) + conference rooms
 *  - Spaces mode  (default):
 *      Expected articles = spaces (articleId = externalId) + conference rooms
 * 
 * On each cycle (60s):
 *  1. Build the set of expected articles from DB (based on working mode)
 *  2. Fetch current articles from AIMS
 *  3. Diff → push missing, update changed, DELETE extras
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
import type { AimsArticle } from '../services/aims.types.js';
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
    deleted: number;   // stale articles removed from AIMS
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
                } else if (r.pushed > 0 || r.deleted > 0 || r.repaired > 0) {
                    appLogger.info('AimsReconcile', `${r.storeName} (${r.mode}): pushed ${r.pushed}, deleted ${r.deleted}, unchanged ${r.unchanged}${r.repaired > 0 ? `, repaired ${r.repaired}` : ''} (expected ${r.totalExpected}, aims had ${r.totalInAims})`);
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
                    pushed: 0, deleted: 0, unchanged: 0, repaired: 0,
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
    }): Promise<ReconcileStoreResult> {
        const storeId = store.id;
        const storeName = store.name || store.code;

        // 0. Fetch company settings ONCE with Redis caching (eliminates N+1 queries)
        const cacheKey = `company-settings:${store.companyId}`;
        let companySettings: Record<string, any> = {};
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

        // peopleManagerEnabled is a company-level setting (saved via /settings/company endpoint),
        // NOT a store-level setting. Read from companySettings, fall back to store.settings.
        const isPeopleMode =
            companySettings.peopleManagerEnabled === true ||
            ((store.settings ?? {}) as Record<string, any>).peopleManagerEnabled === true;
        const mode: 'people' | 'spaces' = isPeopleMode ? 'people' : 'spaces';

        const result: ReconcileStoreResult = {
            storeId, storeName, mode,
            success: true,
            pushed: 0, deleted: 0, unchanged: 0, repaired: 0,
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

        // Fetch the company's article format from AIMS (cached per company)
        let format: ArticleFormat | null = null;
        try {
            format = await aimsGateway.fetchArticleFormat(storeId);
        } catch (error: any) {
            appLogger.warn('AimsReconcile', `Could not fetch article format for ${storeName}: ${error.message}. Articles will be sent without format mapping.`);
        }

        // 1. Build expected article map  { articleId → articlePayload }
        const expectedMap = new Map<string, AimsArticle>();

        // Always include conference rooms
        const rooms = await prisma.conferenceRoom.findMany({
            where: { storeId },
        });

        for (const room of rooms) {
            const article = buildConferenceArticle(room, format, conferenceMapping);
            expectedMap.set(article.articleId, article);
        }

        if (isPeopleMode) {
            // People mode → push assigned people (articleId = assignedSpaceId)
            const people = await prisma.person.findMany({
                where: { storeId, assignedSpaceId: { not: null } },
            });
            const occupiedSlots = new Set<string>();
            for (const person of people) {
                if (!person.assignedSpaceId) continue;
                const article = buildPersonArticle(person as any, format, globalFields);
                if (article) {
                    expectedMap.set(person.assignedSpaceId, article);
                    occupiedSlots.add(person.assignedSpaceId);
                }
            }

            // Also include empty slot articles for unoccupied spaces (1..totalSpaces)
            // so AIMS always has all slots present
            for (let i = 1; i <= totalSpaces; i++) {
                const slotId = String(i);
                if (!occupiedSlots.has(slotId)) {
                    const emptyArticle = buildEmptySlotArticle(slotId, format);
                    expectedMap.set(slotId, emptyArticle);
                }
            }
        } else {
            // Spaces mode → push all spaces (articleId = externalId)
            const spaces = await prisma.space.findMany({
                where: { storeId },
            });
            for (const space of spaces) {
                const article = buildSpaceArticle(space, format);
                expectedMap.set(space.externalId, article);
            }
        }

        result.totalExpected = expectedMap.size;

        // 2. Fetch current AIMS articles
        let aimsArticles: AimsArticle[];
        try {
            aimsArticles = await aimsGateway.pullArticles(storeId);
        } catch (error: any) {
            result.success = false;
            result.error = `Failed to fetch AIMS articles: ${error.message}`;
            return result;
        }

        const aimsMap = new Map<string, AimsArticle>();
        for (const a of aimsArticles) {
            const id = a.articleId || a.article_id;
            if (id) aimsMap.set(id, a);
        }
        result.totalInAims = aimsMap.size;

        // 3. Diff
        const toPush: AimsArticle[] = [];   // create or update in AIMS
        const toDelete: string[] = []; // remove from AIMS

        // Articles that should exist
        for (const [artId, article] of expectedMap) {
            const aimsArticle = aimsMap.get(artId);
            if (!aimsArticle) {
                // Missing → push
                toPush.push(article);
            } else if (articleNeedsUpdate(article, aimsArticle)) {
                // Changed → update (AIMS upserts on push)
                toPush.push(article);
            } else {
                result.unchanged++;
            }
        }

        // Articles that should NOT exist
        for (const aimsId of aimsMap.keys()) {
            if (!expectedMap.has(aimsId)) {
                toDelete.push(aimsId);
            }
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

        // Mass-deletion safeguard: if we're about to delete a large portion of AIMS
        // articles while expected is very small, something is likely wrong (e.g., people
        // mode flag lost, DB query returned empty). Refuse to delete and log an error.
        const MIN_DELETION_THRESHOLD = 5;
        if (
            toDelete.length >= MIN_DELETION_THRESHOLD &&
            aimsMap.size > 0 &&
            toDelete.length > aimsMap.size * 0.5
        ) {
            appLogger.error('AimsReconcile', `SAFETY: Refusing to delete ${toDelete.length} of ${aimsMap.size} AIMS articles for ${storeName} (${mode}). Expected map has ${expectedMap.size} articles. This looks like a data issue — skipping deletion to protect existing articles.`, { ids: toDelete.slice(0, 20) });
            result.error = `Safety: refused mass deletion of ${toDelete.length}/${aimsMap.size} articles`;
        } else if (toDelete.length > 0) {
            try {
                await aimsGateway.deleteArticles(storeId, toDelete);
                result.deleted = toDelete.length;
            } catch (error: any) {
                appLogger.error('AimsReconcile', `Delete failed for ${storeName}: ${error.message}`);
                // Non-fatal — we still pushed successfully
                result.error = `Delete failed (${toDelete.length} stale articles): ${error.message}`;
            }
        }

        // 5. Sync assignedLabels from AIMS article info endpoint + post-sync validation
        //    If validation finds articles missing from AIMS (push didn't land), re-push them.
        const { missingIds } = await this.syncAssignedLabels(storeId, expectedMap, isPeopleMode);

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
     * Fetch article info from AIMS (which includes assignedLabel) and persist to DB.
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
    ): Promise<{ missingIds: string[] }> {
        try {
            const articleInfoList = await aimsGateway.pullArticleInfo(storeId);

            const withLabels = articleInfoList.filter(a => Array.isArray(a.assignedLabel) && a.assignedLabel.length > 0);
            appLogger.info('AimsReconcile', `Article info: fetched ${articleInfoList.length} articles, ${withLabels.length} have assignedLabel(s)`);

            // --- Sync assignedLabels to DB ---
            for (const info of articleInfoList) {
                const artId = info.articleId;
                if (!artId) continue;

                // Only sync when AIMS actually returned label data (array).
                // If the field is missing/undefined, skip — don't overwrite DB with empty.
                if (!Array.isArray(info.assignedLabel)) continue;
                const labels: string[] = info.assignedLabel;

                if (artId.startsWith('C')) {
                    // Conference room (articleId = "C" + externalId)
                    const externalId = artId.slice(1);
                    await prisma.conferenceRoom.updateMany({
                        where: { storeId, externalId },
                        data: { assignedLabels: labels },
                    });
                } else if (isPeopleMode) {
                    // People mode: article IDs are slot numbers (= person.assignedSpaceId).
                    // Person model has no assignedLabels column — store in the Space record
                    // that matches this slot so labels are still tracked for the store.
                    await prisma.space.updateMany({
                        where: { storeId, externalId: artId },
                        data: { assignedLabels: labels },
                    });
                } else {
                    // Spaces mode: article IDs are space externalIds → sync to Space records
                    await prisma.space.updateMany({
                        where: { storeId, externalId: artId },
                        data: { assignedLabels: labels },
                    });
                }
            }

            // --- Post-sync validation (informational only) ---
            const aimsInfoMap = new Map<string, typeof articleInfoList[number]>();
            for (const info of articleInfoList) {
                if (info.articleId) aimsInfoMap.set(info.articleId, info);
            }

            const missingInAims: string[] = [];
            for (const artId of expectedMap.keys()) {
                if (!aimsInfoMap.has(artId)) {
                    missingInAims.push(artId);
                }
            }

            const extraInAims: string[] = [];
            for (const artId of aimsInfoMap.keys()) {
                if (!expectedMap.has(artId)) {
                    extraInAims.push(artId);
                }
            }

            if (missingInAims.length > 0) {
                appLogger.warn('AimsReconcile', `Validation: ${missingInAims.length} expected article(s) missing from AIMS (will attempt repair): ${missingInAims.slice(0, 10).join(', ')}${missingInAims.length > 10 ? '...' : ''}`);
            }
            if (extraInAims.length > 0) {
                appLogger.warn('AimsReconcile', `Validation: ${extraInAims.length} unexpected article(s) found in AIMS article info (should have been deleted): ${extraInAims.slice(0, 10).join(', ')}${extraInAims.length > 10 ? '...' : ''}`);
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
