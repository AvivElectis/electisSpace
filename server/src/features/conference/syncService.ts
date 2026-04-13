/**
 * Conference Sync Service
 *
 * Handles pull-from-AIMS for C-prefixed articles → ConferenceRoom upserts.
 * Called by spacesSyncService.pullFromAims when the conference feature is enabled.
 */
import { prisma } from '../../config/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import { conferenceRepository } from './repository.js';

// ============================================================================
// Types
// ============================================================================

export interface ConferenceSyncUserContext {
    id: string;
    globalRole?: string;
    stores?: { id: string }[];
}

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
 */
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
        user: ConferenceSyncUserContext,
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

            const normalizedData = normalizeArticleData(article.data);
            const normalizedArticleName =
                typeof article.articleName === 'string' && article.articleName
                    ? (normalizeStringValue(article.articleName) as string)
                    : undefined;
            const roomName = extractRoomName(normalizedArticleName, normalizedData, externalId);
            const existing = await conferenceRepository.findByExternalId(storeId, externalId);

            if (existing) {
                // Detect change: compare roomName (primary identifier pulled from AIMS)
                const existingRoomName = existing.roomName ?? '';
                if (existingRoomName === roomName) {
                    result.unchanged++;
                } else {
                    await prisma.conferenceRoom.update({
                        where: { id: existing.id },
                        data: {
                            roomName,
                            syncStatus: 'SYNCED',
                        },
                    });
                    result.updated++;
                }
            } else {
                await prisma.conferenceRoom.create({
                    data: {
                        storeId,
                        externalId,
                        roomName,
                        syncStatus: 'SYNCED',
                    },
                });
                result.created++;
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
