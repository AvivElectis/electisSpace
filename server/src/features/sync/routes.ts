import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission, badRequest } from '../../shared/middleware/index.js';
import { solumService, SolumConfig } from '../../shared/infrastructure/services/solumService.js';
import { getSolumConfig } from '../../shared/utils/solumConfig.js';
import { decrypt } from '../../shared/utils/encryption.js';
import { env } from '../../config/env.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to get store IDs user has access to
const getUserStoreIds = (req: { user?: { stores?: { id: string }[] } }): string[] => {
    return req.user?.stores?.map(s => s.id) || [];
};

// GET /sync/status - Get current sync status
router.get('/status', requirePermission('sync', 'view'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        const { storeId: queryStoreId } = req.query;
        
        // Validate store ID if provided
        let targetStoreIds = storeIds;
        if (queryStoreId && typeof queryStoreId === 'string') {
            if (!storeIds.includes(queryStoreId)) {
                throw badRequest('Access denied to this store');
            }
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

        // Check actual SoluM connection (use first store if multiple)
        let solumConnected = false;
        if (targetStoreIds.length > 0) {
            const config = await getSolumConfig(targetStoreIds[0]);
            if (config) {
                solumConnected = await solumService.checkHealth(config);
            }
        }

        res.json({
            status: pending > 0 ? 'syncing' : 'idle',
            lastSync: lastSync?.processedAt || null,
            pendingItems: pending,
            failedItems: failed,
            solumConnected,
        });
    } catch (error) {
        next(error);
    }
});

// POST /sync/trigger - Manually trigger sync
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
        if (!storeIds.includes(storeId)) {
            throw badRequest('Access denied to this store');
        }

        const config = await getSolumConfig(storeId);
        if (!config || !config.storeNumber) {
            res.status(400).json({ error: 'SoluM configuration missing or incomplete' });
            return;
        }

        // Create a sync record
        const job = await prisma.syncQueueItem.create({
            data: {
                storeId,
                entityType: 'ALL',
                entityId: 'global',
                action: 'SYNC_FULL',
                payload: { type },
                status: 'PROCESSING', // Mark as processing since we run it now (sync mode)
            }
        });

        // Execute Sync Logic (Synchronous for now to complete the task)
        // In production, this should be offloaded to BullMQ

        let resultSummary = {};

        try {
            // 1. Authenticate
            const tokens = await solumService.login(config);

            // 2. Fetch data (Pull)
            const articles = await solumService.fetchArticles(config, tokens.accessToken);

            // 3. TODO: Process articles -> Update DB
            // This is where "mapping" logic would go.

            // Success
            await prisma.syncQueueItem.update({
                where: { id: job.id },
                data: {
                    status: 'COMPLETED',
                    processedAt: new Date(),
                    payload: { ...job.payload as object, result: `Fetched ${articles.length} articles` }
                }
            });

            resultSummary = { articlesFetched: articles.length };

        } catch (err: any) {
            // Fail
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
                store: { select: { name: true, storeNumber: true } }
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
            res.status(404).json({ error: 'Item not found or not failed' });
            return;
        }

        const updated = await prisma.syncQueueItem.update({
            where: { id: req.params.id as string },
            data: {
                status: 'PENDING',
                attempts: 0,
                errorMessage: null,
                scheduledAt: new Date(),
            },
        });

        res.json({ message: 'Retry scheduled', item: updated });
    } catch (error) {
        next(error);
    }
});

export default router;
