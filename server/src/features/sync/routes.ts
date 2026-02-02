import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission, badRequest, notFound, forbidden } from '../../shared/middleware/index.js';
import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';
import { syncQueueProcessor } from '../../shared/infrastructure/jobs/SyncQueueProcessor.js';
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';
import type { Prisma } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to get store IDs user has access to
const getUserStoreIds = (req: { user?: { stores?: { id: string }[] } }): string[] => {
    return req.user?.stores?.map(s => s.id) || [];
};

// Helper to validate store access
const validateStoreAccess = (storeId: string, storeIds: string[]): void => {
    if (!storeIds.includes(storeId)) {
        throw forbidden('Access denied to this store');
    }
};

// GET /sync/status - Get current sync status
router.get('/status', requirePermission('sync', 'view'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        const { storeId: queryStoreId } = req.query;
        
        // Validate store ID if provided
        let targetStoreIds = storeIds;
        if (queryStoreId && typeof queryStoreId === 'string') {
            validateStoreAccess(queryStoreId, storeIds);
            targetStoreIds = [queryStoreId];
        }

        // Get queue stats across stores
        const [pending, failed] = await Promise.all([
            prisma.syncQueueItem.count({
                where: { storeId: { in: targetStoreIds }, status: 'PENDING' },
            }),
            prisma.syncQueueItem.count({
                where: { storeId: { in: targetStoreIds }, status: 'FAILED' },
            }),
        ]);

        // Get last successful sync
        const lastSync = await prisma.syncQueueItem.findFirst({
            where: { storeId: { in: targetStoreIds }, status: 'COMPLETED' },
            orderBy: { processedAt: 'desc' },
            select: { processedAt: true },
        });

        // Check actual AIMS connection (use first store if multiple)
        let aimsConnected = false;
        if (targetStoreIds.length > 0) {
            aimsConnected = await aimsGateway.checkHealth(targetStoreIds[0]);
        }

        res.json({
            status: pending > 0 ? 'syncing' : 'idle',
            lastSync: lastSync?.processedAt || null,
            pendingItems: pending,
            failedItems: failed,
            aimsConnected,
        });
    } catch (error) {
        next(error);
    }
});

// POST /sync/trigger - Manually trigger sync (legacy endpoint)
router.post('/trigger', requirePermission('sync', 'trigger'), async (req, res, next) => {
    try {
        const schema = z.object({
            storeId: z.string().uuid(),
            type: z.enum(['full', 'push', 'pull']).default('full'),
            entities: z.array(z.enum(['spaces', 'people', 'conference'])).optional(),
        });

        const { type, storeId } = schema.parse(req.body);
        const storeIds = getUserStoreIds(req);
        
        // Validate access to store
        validateStoreAccess(storeId, storeIds);

        // Check store exists and has AIMS config
        const storeConfig = await aimsGateway.getStoreConfig(storeId);
        if (!storeConfig) {
            throw badRequest('AIMS configuration missing or incomplete for this store');
        }

        // Create a sync record
        const job = await prisma.syncQueueItem.create({
            data: {
                storeId,
                entityType: 'ALL',
                entityId: 'global',
                action: 'SYNC_FULL',
                payload: { type } as Prisma.InputJsonValue,
                status: 'PROCESSING',
            }
        });

        let resultSummary: { articlesFetched?: number; articlesPushed?: number } = {};

        try {
            if (type === 'pull' || type === 'full') {
                // Pull from AIMS
                const articles = await aimsGateway.pullArticles(storeId);
                resultSummary.articlesFetched = articles.length;

                // TODO: Map articles to entities and update DB
            }

            if (type === 'push' || type === 'full') {
                // Process pending queue items synchronously
                const result = await syncQueueProcessor.processPendingItems();
                resultSummary.articlesPushed = result.succeeded;
            }

            // Success
            await prisma.syncQueueItem.update({
                where: { id: job.id },
                data: {
                    status: 'COMPLETED',
                    processedAt: new Date(),
                    payload: { ...job.payload as object, result: resultSummary } as Prisma.InputJsonValue,
                }
            });

            // Update store lastAimsSyncAt
            await prisma.store.update({
                where: { id: storeId },
                data: { lastAimsSyncAt: new Date() },
            });

        } catch (err: any) {
            await prisma.syncQueueItem.update({
                where: { id: job.id },
                data: {
                    status: 'FAILED',
                    errorMessage: err.message,
                    processedAt: new Date()
                }
            });
            throw err;
        }

        res.status(200).json({
            message: 'Sync completed',
            jobId: job.id,
            stats: resultSummary
        });
    } catch (error) {
        next(error);
    }
});

// GET /sync/jobs/:id - Get sync job status
router.get('/jobs/:id', requirePermission('sync', 'view'), async (req, res, next) => {
    try {
        const job = await prisma.syncQueueItem.findUnique({
            where: { id: String(req.params.id) }
        });

        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        res.json({
            jobId: job.id,
            status: job.status.toLowerCase(),
            type: job.action,
            startedAt: job.createdAt,
            completedAt: job.processedAt,
            error: job.errorMessage,
            stats: job.payload
        });
    } catch (error) {
        next(error);
    }
});

// GET /sync/queue - View sync queue items
router.get('/queue', requirePermission('sync', 'view'), async (req, res, next) => {
    try {
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const { storeId: queryStoreId } = req.query;
        const storeIds = getUserStoreIds(req);
        
        // Determine store filter
        let storeFilter: { storeId?: string | { in: string[] } } = {};
        if (queryStoreId && typeof queryStoreId === 'string') {
            if (!storeIds.includes(queryStoreId)) {
                throw badRequest('Access denied to this store');
            }
            storeFilter = { storeId: queryStoreId };
        } else {
            storeFilter = { storeId: { in: storeIds } };
        }

        const items = await prisma.syncQueueItem.findMany({
            where: {
                ...storeFilter,
                ...(status && { status: status as any }),
            },
            include: {
                store: { select: { name: true, code: true } }
            },
            orderBy: { scheduledAt: 'desc' },
            take: 50,
        });

        res.json(items);
    } catch (error) {
        next(error);
    }
});

// POST /sync/queue/:id/retry - Retry failed sync item
router.post('/queue/:id/retry', requirePermission('sync', 'trigger'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        
        const item = await prisma.syncQueueItem.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
                status: 'FAILED',
            },
        });

        if (!item) {
            throw notFound('Item not found or not failed');
        }

        // Use the processor to retry
        try {
            await syncQueueProcessor.processItemById(item.id);
            res.json({ message: 'Retry completed successfully' });
        } catch (error: any) {
            res.status(200).json({ 
                message: 'Retry attempted but failed', 
                error: error.message 
            });
        }
    } catch (error) {
        next(error);
    }
});

// ============================================
// Store-specific sync routes
// ============================================

// POST /sync/stores/:storeId/pull - Pull from AIMS → Save to DB
router.post('/stores/:storeId/pull', requirePermission('sync', 'trigger'), async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const storeIds = getUserStoreIds(req);
        validateStoreAccess(storeId, storeIds);

        // Check store exists
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { id: true, code: true, syncEnabled: true },
        });

        if (!store) {
            throw notFound('Store');
        }

        if (!store.syncEnabled) {
            throw badRequest('Sync is disabled for this store');
        }

        // Pull articles from AIMS
        const articles = await aimsGateway.pullArticles(storeId);

        // Process articles and update DB
        const stats = {
            total: articles.length,
            created: 0,
            updated: 0,
            unchanged: 0,
        };

        for (const article of articles) {
            const articleId = article.articleId || article.article_id;
            if (!articleId) continue;

            // Check if space exists
            const existingSpace = await prisma.space.findFirst({
                where: { storeId, externalId: articleId },
            });

            if (existingSpace) {
                // Update existing space
                const newData = {
                    ...existingSpace.data as object,
                    name: article.articleName || article.article_name,
                    data1: article.data1,
                    data2: article.data2,
                    data3: article.data3,
                    data4: article.data4,
                    data5: article.data5,
                    nfc: article.nfc,
                };

                await prisma.space.update({
                    where: { id: existingSpace.id },
                    data: {
                        data: newData as Prisma.InputJsonValue,
                        labelCode: article.labelCode || article.label_code || existingSpace.labelCode,
                        syncStatus: 'SYNCED',
                        lastSyncedAt: new Date(),
                    },
                });
                stats.updated++;
            } else {
                // Create new space
                await prisma.space.create({
                    data: {
                        storeId,
                        externalId: articleId,
                        labelCode: article.labelCode || article.label_code || null,
                        data: {
                            name: article.articleName || article.article_name,
                            data1: article.data1,
                            data2: article.data2,
                            data3: article.data3,
                            data4: article.data4,
                            data5: article.data5,
                            nfc: article.nfc,
                        } as Prisma.InputJsonValue,
                        syncStatus: 'SYNCED',
                        lastSyncedAt: new Date(),
                    },
                });
                stats.created++;
            }
        }

        stats.unchanged = stats.total - stats.created - stats.updated;

        // Update store lastAimsSyncAt
        await prisma.store.update({
            where: { id: storeId },
            data: { lastAimsSyncAt: new Date() },
        });

        res.json({
            message: 'Pull completed',
            stats,
        });
    } catch (error) {
        next(error);
    }
});

// POST /sync/stores/:storeId/push - Push DB changes → AIMS
router.post('/stores/:storeId/push', requirePermission('sync', 'trigger'), async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const storeIds = getUserStoreIds(req);
        validateStoreAccess(storeId, storeIds);

        // Check store exists
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { id: true, syncEnabled: true },
        });

        if (!store) {
            throw notFound('Store');
        }

        if (!store.syncEnabled) {
            throw badRequest('Sync is disabled for this store');
        }

        // Get all pending items for this store
        const pendingCount = await syncQueueService.getPendingCount(storeId);

        if (pendingCount === 0) {
            res.json({
                message: 'No pending changes to push',
                stats: { processed: 0, succeeded: 0, failed: 0 },
            });
            return;
        }

        // Process pending items
        const result = await syncQueueProcessor.processPendingItems();

        // Update store lastAimsSyncAt
        await prisma.store.update({
            where: { id: storeId },
            data: { lastAimsSyncAt: new Date() },
        });

        res.json({
            message: 'Push completed',
            stats: result,
        });
    } catch (error) {
        next(error);
    }
});

// GET /sync/stores/:storeId/status - Get store-specific sync status
router.get('/stores/:storeId/status', requirePermission('sync', 'view'), async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const storeIds = getUserStoreIds(req);
        validateStoreAccess(storeId, storeIds);

        // Get store info
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: {
                id: true,
                name: true,
                code: true,
                syncEnabled: true,
                lastAimsSyncAt: true,
            },
        });

        if (!store) {
            throw notFound('Store');
        }

        // Get queue stats
        const [pending, failed, completed] = await Promise.all([
            syncQueueService.getPendingCount(storeId),
            syncQueueService.getFailedCount(storeId),
            prisma.syncQueueItem.count({
                where: { storeId, status: 'COMPLETED' },
            }),
        ]);

        // Check AIMS connectivity
        const aimsConnected = await aimsGateway.checkHealth(storeId);

        res.json({
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
        });
    } catch (error) {
        next(error);
    }
});

// POST /sync/stores/:storeId/retry/:itemId - Retry specific failed item
router.post('/stores/:storeId/retry/:itemId', requirePermission('sync', 'trigger'), async (req, res, next) => {
    try {
        const { storeId, itemId } = req.params;
        const storeIds = getUserStoreIds(req);
        validateStoreAccess(storeId, storeIds);

        // Verify item belongs to store
        const item = await prisma.syncQueueItem.findFirst({
            where: {
                id: itemId,
                storeId,
                status: 'FAILED',
            },
        });

        if (!item) {
            throw notFound('Failed item not found for this store');
        }

        // Retry the item
        try {
            await syncQueueProcessor.processItemById(itemId);
            res.json({ message: 'Retry completed successfully' });
        } catch (error: any) {
            res.status(200).json({
                message: 'Retry attempted but failed',
                error: error.message,
            });
        }
    } catch (error) {
        next(error);
    }
});

export default router;
