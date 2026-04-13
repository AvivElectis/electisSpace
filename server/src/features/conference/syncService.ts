/**
 * Conference Sync Service
 *
 * Handles pull-from-AIMS for C-prefixed articles → ConferenceRoom upserts.
 * Called by spacesSyncService.pullFromAims when the conference feature is enabled.
 * Store-access validation is the caller's responsibility — this service does not
 * check user permissions.
 */
import { prisma } from '../../config/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import { conferenceRepository } from './repository.js';

// ============================================================================
// Types
// ============================================================================

export interface ConferencePullResult {
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
}

export interface RawAimsArticle {
    articleId?: string;
    articleName?: string;
    data?: unknown;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Unescape CSV-style double-quoting from AIMS: "ד""ר" → ד"ר
 *
 * Overload: when called with a string the return type is string;
 * when called with an unknown value the return type is unknown.
 */
function normalizeStringValue(value: string): string;
function normalizeStringValue(value: unknown): unknown;
function normalizeStringValue(value: unknown): unknown {
    if (
        typeof value === 'string' &&
        value.startsWith('"') &&
        value.endsWith('"') &&
        value.includes('""')
    ) {
        return value.slice(1, -1).replace(/""/g, '"');
    }
    return value;
}

/**
 * Normalize all string values in a flat data object.
 */
function normalizeArticleData(raw: unknown): Record<string, unknown> {
    const source: Record<string, unknown> =
        raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {};
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
        out[key] = normalizeStringValue(value);
    }
    return out;
}

/**
 * Extract roomName from AIMS article.
 * Priority: articleName → normalizedData.roomName → normalizedData.name → fallback to externalId.
 *
 * Both `articleName` and `normalizedData` must already be normalized (CSV-unescaped)
 * by the caller before being passed here.
 */
function extractRoomName(
    articleName: string | undefined,
    normalizedData: Record<string, unknown>,
    externalId: string,
): string {
    if (articleName) {
        return articleName;
    }
    if (typeof normalizedData.roomName === 'string' && normalizedData.roomName) {
        return normalizedData.roomName;
    }
    if (typeof normalizedData.name === 'string' && normalizedData.name) {
        return normalizedData.name;
    }
    return `Conference ${externalId}`;
}

// ============================================================================
// Service
// ============================================================================

export const conferenceSyncService = {
    async upsertManyFromArticles(
        articles: RawAimsArticle[],
        storeId: string,
    ): Promise<ConferencePullResult> {
        const result: ConferencePullResult = { created: 0, updated: 0, unchanged: 0, skipped: 0 };

        // Race guard: skip externalIds with non-terminal delete in queue.
        // payload.externalId is stored WITH the "C" prefix (see conference/service.ts:145).
        const pendingDeletes = await prisma.syncQueueItem.findMany({
            where: {
                storeId,
                entityType: 'conference',
                action: 'DELETE',
                status: { in: ['PENDING', 'PROCESSING'] },
            },
            select: { payload: true },
        });
        const pendingDeleteExternalIds = new Set<string>();
        for (const item of pendingDeletes) {
            const payload = item.payload as { externalId?: string } | null;
            // payload.externalId is conventionally prefixed with 'C' (see conference/service.ts:145); guard defensively.
            if (payload?.externalId && payload.externalId.startsWith('C')) {
                pendingDeleteExternalIds.add(payload.externalId.slice(1));
            }
        }

        for (const article of articles) {
            const articleId = article.articleId;
            if (!articleId || articleId.length <= 1) {
                result.skipped++;
                continue;
            }
            const externalId = articleId.slice(1);
            if (!externalId || pendingDeleteExternalIds.has(externalId)) {
                result.skipped++;
                continue;
            }

            try {
                const normalizedData = normalizeArticleData(article.data);
                const normalizedArticleName =
                    typeof article.articleName === 'string' && article.articleName
                        ? normalizeStringValue(article.articleName)
                        : undefined;
                const roomName = extractRoomName(normalizedArticleName, normalizedData, externalId);
                const existing = await conferenceRepository.findByExternalId(storeId, externalId);

                if (existing) {
                    // roomName is the only field synced from AIMS today; if other AIMS-sourced fields are added, change detection must widen.
                    const existingRoomName = existing.roomName ?? '';
                    if (existingRoomName === roomName) {
                        result.unchanged++;
                    } else {
                        await conferenceRepository.syncUpdate(existing.id, { roomName });
                        result.updated++;
                    }
                } else {
                    await conferenceRepository.syncCreate({ storeId, externalId, roomName });
                    result.created++;
                }
            } catch (err) {
                appLogger.warn(
                    'conferenceSyncService',
                    `Failed to upsert conference article externalId=${externalId}; skipping`,
                    { externalId, error: err },
                );
                result.skipped++;
            }
        }

        appLogger.info(
            'conferenceSyncService',
            `Conference upsert from AIMS complete for store ${storeId}`,
            { ...result },
        );

        return result;
    },
};
