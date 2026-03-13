/**
 * Spaces Sync Service
 *
 * Dedicated sync operations for spaces mode.
 * Handles pull from AIMS, push to AIMS, and full bi-directional sync.
 */
import { prisma } from '../../config/index.js';
import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';
import { syncQueueProcessor } from '../../shared/infrastructure/jobs/SyncQueueProcessor.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import type { SpacesUserContext } from './types.js';
import type { Prisma } from '@prisma/client';

const isPlatformAdmin = (user: SpacesUserContext): boolean => user.globalRole === 'PLATFORM_ADMIN';

const validateStoreAccess = (storeId: string, user: SpacesUserContext): void => {
    if (isPlatformAdmin(user)) return;
    const storeIds = user.stores?.map(s => s.id) || [];
    if (!storeIds.includes(storeId)) throw new Error('FORBIDDEN');
};

export interface SyncResult {
    total: number;
    created: number;
    updated: number;
    unchanged: number;
    deleted: number;
    errors: string[];
}

export const spacesSyncService = {
    /**
     * Pull articles from AIMS and upsert as local spaces.
     */
    async pullFromAims(storeId: string, user: SpacesUserContext): Promise<SyncResult> {
        validateStoreAccess(storeId, user);

        const result: SyncResult = { total: 0, created: 0, updated: 0, unchanged: 0, deleted: 0, errors: [] };

        try {
            // Use /config/article/info endpoint which returns full data fields
            // (the /articles endpoint only returns summary without data)
            const articles = await aimsGateway.pullArticleInfo(storeId);
            result.total = articles.length;

            // Pre-fetch all existing spaces for this store to avoid N+1 queries
            const existingSpaces = await prisma.space.findMany({
                where: { storeId },
                select: { id: true, externalId: true, data: true },
            });
            const spacesByExternalId = new Map(
                existingSpaces.map(s => [s.externalId, s])
            );

            for (const article of articles) {
                const articleId = article.articleId;
                if (!articleId) {
                    result.errors.push(`Article missing articleId`);
                    continue;
                }

                try {
                    const existing = spacesByExternalId.get(String(articleId));

                    // The /config/article/info endpoint returns data as a nested object
                    const rawData: Record<string, unknown> = article.data && typeof article.data === 'object'
                        ? { ...article.data }
                        : {};
                    // Unescape CSV-style double-quoting: "ד""ר" → ד"ר
                    const articleData: Record<string, unknown> = {};
                    for (const [key, value] of Object.entries(rawData)) {
                        if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"') && value.includes('""')) {
                            articleData[key] = value.slice(1, -1).replace(/""/g, '"');
                        } else {
                            articleData[key] = value;
                        }
                    }

                    if (existing) {
                        // Check if data actually changed
                        const existingData = existing.data as Record<string, unknown>;
                        const hasChanges = JSON.stringify(existingData) !== JSON.stringify(articleData);

                        if (hasChanges) {
                            await prisma.space.update({
                                where: { id: existing.id },
                                data: {
                                    data: articleData as Prisma.InputJsonValue,
                                    syncStatus: 'SYNCED',
                                    updatedById: user.id,
                                },
                            });
                            result.updated++;
                        } else {
                            result.unchanged++;
                        }
                    } else {
                        await prisma.space.create({
                            data: {
                                storeId,
                                externalId: String(articleId),
                                data: articleData as Prisma.InputJsonValue,
                                syncStatus: 'SYNCED',
                                createdById: user.id,
                                updatedById: user.id,
                            },
                        });
                        result.created++;
                    }
                } catch (err) {
                    result.errors.push(`Article ${articleId}: ${String(err)}`);
                }
            }

            // Update store sync timestamp
            await prisma.store.update({
                where: { id: storeId },
                data: { lastAimsSyncAt: new Date() },
            });

            appLogger.info('spacesSyncService', `Pull from AIMS complete for store ${storeId}`, { ...result });
        } catch (err) {
            appLogger.error('spacesSyncService', `Pull from AIMS failed for store ${storeId}`, { error: String(err) });
            throw err;
        }

        return result;
    },

    /**
     * Push pending spaces to AIMS via the sync queue processor.
     */
    async pushToAims(storeId: string, user: SpacesUserContext): Promise<{ processed: number; pending: number }> {
        validateStoreAccess(storeId, user);

        const pendingCount = await prisma.syncQueueItem.count({
            where: { storeId, entityType: 'space', status: 'PENDING' },
        });

        if (pendingCount > 0) {
            // Trigger the sync queue processor for this store
            await syncQueueProcessor.processPendingItems(storeId);
        }

        const remainingPending = await prisma.syncQueueItem.count({
            where: { storeId, entityType: 'space', status: 'PENDING' },
        });

        appLogger.info('spacesSyncService', `Push to AIMS for store ${storeId}`, { processed: pendingCount - remainingPending, pending: remainingPending });

        return { processed: pendingCount - remainingPending, pending: remainingPending };
    },

    /**
     * Full bi-directional sync: push pending → pull from AIMS.
     * AIMS wins on conflicts (pull overwrites local on conflict).
     */
    async fullSync(storeId: string, user: SpacesUserContext): Promise<{ push: { processed: number; pending: number }; pull: SyncResult }> {
        validateStoreAccess(storeId, user);

        // First push local changes
        const pushResult = await this.pushToAims(storeId, user);

        // Then pull from AIMS (AIMS wins on conflicts)
        const pullResult = await this.pullFromAims(storeId, user);

        return { push: pushResult, pull: pullResult };
    },

    /**
     * Get sync status for a store's spaces.
     */
    async getSyncStatus(storeId: string, user: SpacesUserContext) {
        validateStoreAccess(storeId, user);

        const [totalSpaces, pendingSpaces, syncedSpaces, errorSpaces, pendingQueueItems, failedQueueItems, store] = await Promise.all([
            prisma.space.count({ where: { storeId } }),
            prisma.space.count({ where: { storeId, syncStatus: 'PENDING' } }),
            prisma.space.count({ where: { storeId, syncStatus: 'SYNCED' } }),
            prisma.space.count({ where: { storeId, syncStatus: 'FAILED' } }),
            prisma.syncQueueItem.count({ where: { storeId, entityType: 'space', status: 'PENDING' } }),
            prisma.syncQueueItem.count({ where: { storeId, entityType: 'space', status: 'FAILED' } }),
            prisma.store.findUnique({ where: { id: storeId }, select: { lastAimsSyncAt: true, syncEnabled: true } }),
        ]);

        let aimsConnected = false;
        try {
            aimsConnected = await aimsGateway.checkHealth(storeId);
        } catch {
            // Health check failed — AIMS not connected
        }

        return {
            totalSpaces,
            pendingSpaces,
            syncedSpaces,
            errorSpaces,
            pendingQueueItems,
            failedQueueItems,
            lastSyncAt: store?.lastAimsSyncAt?.toISOString() || null,
            syncEnabled: store?.syncEnabled ?? false,
            aimsConnected,
        };
    },
};
