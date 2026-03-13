/**
 * Sync Feature - Service
 * 
 * @description Business logic for sync operations.
 */
import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';
import { syncQueueProcessor } from '../../shared/infrastructure/jobs/SyncQueueProcessor.js';
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';
import { syncRepository } from './repository.js';
import type {
    SyncUserContext,
    TriggerSyncInput,
    SyncStatusResponse,
    SyncJobResponse,
    TriggerSyncResponse,
    PullSyncResponse,
    PushSyncResponse,
    StoreSyncStatusResponse,
} from './types.js';
import type { Prisma } from '@prisma/client';

// ======================
// Helpers
// ======================

const isPlatformAdmin = (user: SyncUserContext): boolean =>
    user.globalRole === 'PLATFORM_ADMIN';

const getUserStoreIds = (user: SyncUserContext): string[] => {
    return user.stores?.map(s => s.id) || [];
};

const validateStoreAccess = (storeId: string, user: SyncUserContext): void => {
    if (isPlatformAdmin(user)) return; // Platform admins can access any store
    const storeIds = getUserStoreIds(user);
    if (storeIds.includes(storeId)) return;
    // Safety net: allStoresAccess users have stores expanded in auth middleware,
    // but check companies as a defense-in-depth fallback
    if (user.companies?.some(c => c.allStoresAccess)) return;
    throw new Error('FORBIDDEN');
};

// ======================
// Service
// ======================

export const syncService = {
    /**
     * Get sync status
     */
    async getStatus(user: SyncUserContext, queryStoreId?: string): Promise<SyncStatusResponse> {
        let targetStoreIds = getUserStoreIds(user);
        if (queryStoreId) {
            validateStoreAccess(queryStoreId, user);
            targetStoreIds = [queryStoreId];
        }

        const [pending, failed] = await Promise.all([
            syncRepository.getPendingCount(targetStoreIds),
            syncRepository.getFailedCount(targetStoreIds),
        ]);

        const lastSync = await syncRepository.getLastSync(targetStoreIds);

        // Check actual AIMS connection
        // When a specific store is queried, check that store directly;
        // otherwise fall back to the first store in the user's list
        let aimsConnected = false;
        if (queryStoreId) {
            aimsConnected = await aimsGateway.checkHealth(queryStoreId);
        } else if (targetStoreIds.length > 0) {
            aimsConnected = await aimsGateway.checkHealth(targetStoreIds[0]);
        }

        return {
            status: pending > 0 ? 'syncing' : 'idle',
            lastSync: lastSync?.processedAt || null,
            pendingItems: pending,
            failedItems: failed,
            aimsConnected,
        };
    },

    /**
     * Trigger sync (legacy endpoint)
     */
    async triggerSync(input: TriggerSyncInput, user: SyncUserContext): Promise<TriggerSyncResponse> {
        validateStoreAccess(input.storeId, user);

        // Check store exists and has AIMS config
        const storeConfig = await aimsGateway.getStoreConfig(input.storeId);
        if (!storeConfig) {
            throw new Error('AIMS_NOT_CONFIGURED');
        }

        // Create a sync record
        const job = await syncRepository.createQueueItem({
            storeId: input.storeId,
            entityType: 'ALL',
            entityId: 'global',
            action: 'SYNC_FULL',
            payload: { type: input.type } as Prisma.InputJsonValue,
            status: 'PROCESSING',
        });

        const resultSummary: { articlesFetched?: number; articlesPushed?: number } = {};

        try {
            if (input.type === 'pull' || input.type === 'full') {
                const articles = await aimsGateway.pullArticles(input.storeId);
                resultSummary.articlesFetched = articles.length;
            }

            if (input.type === 'push' || input.type === 'full') {
                const result = await syncQueueProcessor.processPendingItems(input.storeId);
                resultSummary.articlesPushed = result.succeeded;
            }

            await syncRepository.updateQueueItem(job.id, {
                status: 'COMPLETED',
                processedAt: new Date(),
                payload: { ...(job.payload as object), result: resultSummary } as Prisma.InputJsonValue,
            });

            await syncRepository.updateStoreLastSync(input.storeId);

        } catch (err: any) {
            await syncRepository.updateQueueItem(job.id, {
                status: 'FAILED',
                errorMessage: err.message,
                processedAt: new Date(),
            });
            throw err;
        }

        return {
            message: 'Sync completed',
            jobId: job.id,
            stats: resultSummary,
        };
    },

    /**
     * Get sync job status
     */
    async getJob(id: string, user?: SyncUserContext): Promise<SyncJobResponse | null> {
        const job = await syncRepository.getJob(id);

        if (!job) {
            return null;
        }

        // Validate user has access to the store this job belongs to
        if (user) {
            validateStoreAccess(job.storeId, user);
        }

        return {
            jobId: job.id,
            status: job.status.toLowerCase(),
            type: job.action,
            startedAt: job.createdAt,
            completedAt: job.processedAt,
            error: job.errorMessage,
            stats: job.payload,
        };
    },

    /**
     * List queue items
     */
    async listQueue(user: SyncUserContext, queryStoreId?: string, status?: string) {
        if (queryStoreId) {
            validateStoreAccess(queryStoreId, user);
        }

        const storeIds = isPlatformAdmin(user) ? undefined : getUserStoreIds(user);
        return syncRepository.listQueueItems(storeIds, queryStoreId, status);
    },

    /**
     * Retry failed item
     */
    async retryItem(id: string, user: SyncUserContext): Promise<{ message: string; error?: string }> {
        const storeIds = isPlatformAdmin(user) ? undefined : getUserStoreIds(user);

        const item = await syncRepository.getFailedItem(id, storeIds);
        if (!item) {
            throw new Error('NOT_FOUND');
        }

        try {
            await syncQueueProcessor.processItemById(item.id);
            return { message: 'Retry completed successfully' };
        } catch (error: any) {
            return { message: 'Retry attempted but failed', error: error.message };
        }
    },

    /**
     * Pull from AIMS
     */
    async pullFromAims(storeId: string, user: SyncUserContext): Promise<PullSyncResponse> {
        validateStoreAccess(storeId, user);

        const store = await syncRepository.getStore(storeId);
        if (!store) {
            throw new Error('STORE_NOT_FOUND');
        }

        if (!store.syncEnabled) {
            throw new Error('SYNC_DISABLED');
        }

        // Pull articles from AIMS
        const articles = await aimsGateway.pullArticles(storeId);

        const stats = {
            total: articles.length,
            created: 0,
            updated: 0,
            unchanged: 0,
        };

        // Batch: fetch all existing spaces for this store in one query
        const existingSpaces = await syncRepository.findAllSpacesByStore(storeId);
        const spaceMap = new Map(existingSpaces.map(s => [s.externalId, s]));
        const now = new Date();

        // Build batch operations
        const creates: Parameters<typeof syncRepository.createSpaceBatch>[0] = [];
        const updates: { id: string; data: Prisma.InputJsonValue; labelCode: string | null }[] = [];

        for (const article of articles) {
            const articleId = article.articleId || article.article_id;
            if (!articleId) continue;

            const existingSpace = spaceMap.get(articleId);
            // Store the actual AIMS data fields (e.g., ARTICLE_ID, ITEM_NAME, PRICE...)
            // The `data` object from AIMS contains the real field keys matching the article format.
            // Also preserve top-level articleName/nfcUrl for backwards compatibility.
            const aimsData = (article.data && typeof article.data === 'object') ? { ...article.data } : {};
            const articleData: Record<string, any> = {
                ...aimsData,
                name: article.articleName || article.article_name || aimsData.name || '',
                nfc: article.nfcUrl || article.nfc || aimsData.nfc || '',
            };

            if (existingSpace) {
                updates.push({
                    id: existingSpace.id,
                    data: { ...(existingSpace.data as object), ...articleData } as Prisma.InputJsonValue,
                    labelCode: article.labelCode || article.label_code || existingSpace.labelCode,
                });
            } else {
                creates.push({
                    storeId,
                    externalId: articleId,
                    labelCode: article.labelCode || article.label_code || null,
                    data: articleData as Prisma.InputJsonValue,
                    syncStatus: 'SYNCED' as const,
                    lastSyncedAt: now,
                });
            }
        }

        // Execute batch operations in a transaction
        await syncRepository.batchUpsertSpaces(creates, updates, now);
        stats.created = creates.length;
        stats.updated = updates.length;
        stats.unchanged = stats.total - stats.created - stats.updated;

        await syncRepository.updateStoreLastSync(storeId);

        return {
            message: 'Pull completed',
            stats,
        };
    },

    /**
     * Push to AIMS
     */
    async pushToAims(storeId: string, user: SyncUserContext): Promise<PushSyncResponse> {
        validateStoreAccess(storeId, user);

        const store = await syncRepository.getStore(storeId);
        if (!store) {
            throw new Error('STORE_NOT_FOUND');
        }

        if (!store.syncEnabled) {
            throw new Error('SYNC_DISABLED');
        }

        // Get all pending items for this store
        const pendingCount = await syncQueueService.getPendingCount(storeId);

        if (pendingCount === 0) {
            return {
                message: 'No pending changes to push',
                stats: { processed: 0, succeeded: 0, failed: 0 },
            };
        }

        const result = await syncQueueProcessor.processPendingItems(storeId);

        await syncRepository.updateStoreLastSync(storeId);

        return {
            message: 'Push completed',
            stats: result,
        };
    },

    /**
     * Get store sync status
     */
    async getStoreStatus(storeId: string, user: SyncUserContext): Promise<StoreSyncStatusResponse> {
        validateStoreAccess(storeId, user);

        const store = await syncRepository.getStore(storeId);
        if (!store) {
            throw new Error('STORE_NOT_FOUND');
        }

        const [pending, failed, completed] = await Promise.all([
            syncQueueService.getPendingCount(storeId),
            syncQueueService.getFailedCount(storeId),
            syncRepository.getCompletedCount(storeId),
        ]);

        const aimsConnected = await aimsGateway.checkHealth(storeId);

        return {
            store: {
                id: store.id,
                name: store.name,
                code: store.code,
            },
            syncEnabled: store.syncEnabled,
            lastSyncAt: store.lastAimsSyncAt,
            queue: {
                pending,
                failed,
                completed,
            },
            aimsConnected,
        };
    },

    /**
     * Retry specific failed item for store
     */
    async retryStoreItem(storeId: string, itemId: string, user: SyncUserContext): Promise<{ message: string; error?: string }> {
        validateStoreAccess(storeId, user);

        const item = await syncRepository.getFailedItemForStore(itemId, storeId);
        if (!item) {
            throw new Error('NOT_FOUND');
        }

        try {
            await syncQueueProcessor.processItemById(itemId);
            return { message: 'Retry completed successfully' };
        } catch (error: any) {
            return { message: 'Retry attempted but failed', error: error.message };
        }
    },
};
