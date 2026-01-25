import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission } from '../../shared/middleware/index.js';
import { solumService, SolumConfig } from '../../shared/infrastructure/services/solumService.js';
import { decrypt } from '../../shared/utils/encryption.js';
import { env } from '../../config/env.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to get SoluM config
async function getSolumConfig(organizationId: string): Promise<SolumConfig | null> {
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { solumConfig: true }
    });

    if (!org?.solumConfig) return null;

    // Decrypt if necessary. We assume the stored JSON values might be encrypted strings
    // or the whole JSON structure is what we need.
    // Based on typical pattern: solumConfig is JSON object. Passwords inside might be encrypted.
    // Simplifying assumption: usage of EncryptionService implies specific fields are encrypted or the whole blob.
    // For now, let's assume the client stores it as a plain JSON object in the 'Json' field for simplicity,
    // OR we decrypt specific fields like password.

    // If the client sends encrypted password, we decrypt it.
    const config = org.solumConfig as unknown as SolumConfig;

    // NOTE: In a real prod scenario with client-side encryption, we need to share the key or 
    // mechanism. If 'env.ENCRYPTION_KEY' is shared, we can decrypt.
    // Here we assume the config is ready to use (or we'd decrypt password).

    // Mock decryption for password if it looks like a cipher (checking length/format)
    // This is a placeholder for the actual agreed encryption contract.
    // if (config.password && config.password.length > 50) {
    //    config.password = decrypt(config.password, env.ENCRYPTION_KEY);
    // }

    return config;
}

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

        // Check actual SoluM connection
        let solumConnected = false;
        const config = await getSolumConfig(orgId);

        if (config) {
            solumConnected = await solumService.checkHealth(config);
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
            type: z.enum(['full', 'push', 'pull']).default('full'),
            entities: z.array(z.enum(['spaces', 'people', 'conference'])).optional(),
        });

        const { type } = schema.parse(req.body);
        const orgId = req.user!.organizationId;

        const config = await getSolumConfig(orgId);
        if (!config || !config.storeNumber) {
            res.status(400).json({ error: 'SoluM configuration missing or incomplete' });
            return;
        }

        // Create a sync record
        const job = await prisma.syncQueueItem.create({
            data: {
                organizationId: orgId,
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
