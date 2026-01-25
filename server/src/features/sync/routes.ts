import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission } from '../../shared/middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /sync/status - Get current sync status
router.get('/status', requirePermission('sync', 'view'), async (req, res, next) => {
    try {
        const orgId = req.user!.organizationId;

        // Get queue stats
        const [pending, failed] = await Promise.all([
            prisma.syncQueueItem.count({
                where: { organizationId: orgId, status: 'PENDING' },
            }),
            prisma.syncQueueItem.count({
                where: { organizationId: orgId, status: 'FAILED' },
            }),
        ]);

        // Get last successful sync
        const lastSync = await prisma.syncQueueItem.findFirst({
            where: { organizationId: orgId, status: 'COMPLETED' },
            orderBy: { processedAt: 'desc' },
            select: { processedAt: true },
        });

        res.json({
            status: pending > 0 ? 'syncing' : 'idle',
            lastSync: lastSync?.processedAt || null,
            pendingItems: pending,
            failedItems: failed,
            solumConnected: true, // TODO: Check actual connection
        });
    } catch (error) {
        next(error);
    }
});

// POST /sync/trigger - Manually trigger sync
router.post('/trigger', requirePermission('sync', 'trigger'), async (req, res, next) => {
    try {
        const schema = z.object({
            type: z.enum(['full', 'push', 'pull']).default('full'),
            entities: z.array(z.enum(['spaces', 'people', 'conference'])).optional(),
        });

        const { type, entities } = schema.parse(req.body);

        // TODO: Queue sync job using BullMQ

        res.status(202).json({
            message: 'Sync triggered',
            jobId: `sync-${Date.now()}`,
            type,
            entities: entities || ['spaces', 'people', 'conference'],
        });
    } catch (error) {
        next(error);
    }
});

// GET /sync/jobs/:id - Get sync job status
router.get('/jobs/:id', requirePermission('sync', 'view'), async (req, res, next) => {
    try {
        // TODO: Query BullMQ for job status
        res.json({
            jobId: req.params.id as string,
            status: 'completed',
            type: 'full',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            stats: {
                downloaded: 0,
                uploaded: 0,
                errors: 0,
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /sync/queue - View sync queue items
router.get('/queue', requirePermission('sync', 'view'), async (req, res, next) => {
    try {
        const status = req.query.status as string;

        const items = await prisma.syncQueueItem.findMany({
            where: {
                organizationId: req.user!.organizationId,
                ...(status && { status: status as any }),
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
        const item = await prisma.syncQueueItem.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
                status: 'FAILED',
            },
        });

        if (!item) {
            res.status(404).json({ error: 'Item not found or not failed' });
            return;
        }

        await prisma.syncQueueItem.update({
            where: { id: req.params.id as string },
            data: {
                status: 'PENDING',
                attempts: 0,
                errorMessage: null,
                scheduledAt: new Date(),
            },
        });

        res.json({ message: 'Retry scheduled' });
    } catch (error) {
        next(error);
    }
});

export default router;
