/**
 * Sync Feature - Controller
 * 
 * @description HTTP request/response handling for sync endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { badRequest, notFound, forbidden } from '../../shared/middleware/index.js';
import { syncService } from './service.js';
import { triggerSyncSchema } from './types.js';
import type { SyncUserContext } from './types.js';
import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';

// ======================
// Helpers
// ======================

function getUserContext(req: Request): SyncUserContext {
    return {
        id: req.user!.id,
        stores: req.user?.stores?.map(s => ({ id: s.id })),
    };
}

// ======================
// Controller
// ======================

export const syncController = {
    /**
     * GET /sync/status
     * Get current sync status
     */
    async getStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            const storeId = req.query.storeId as string | undefined;
            
            const result = await syncService.getStatus(user, storeId);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            next(error);
        }
    },

    /**
     * POST /sync/trigger
     * Manually trigger sync
     */
    async triggerSync(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = triggerSyncSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const user = getUserContext(req);
            const result = await syncService.triggerSync(validation.data, user);
            res.status(200).json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            if (error.message === 'AIMS_NOT_CONFIGURED') return next(badRequest('AIMS configuration missing or incomplete for this store'));
            next(error);
        }
    },

    /**
     * GET /sync/jobs/:id
     * Get sync job status
     */
    async getJob(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = getUserContext(req);
            const result = await syncService.getJob(id, user);

            if (!result) {
                res.status(404).json({ error: 'Job not found' });
                return;
            }

            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this job'));
            next(error);
        }
    },

    /**
     * GET /sync/queue
     * View sync queue items
     */
    async listQueue(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            const storeId = req.query.storeId as string | undefined;
            const status = req.query.status as string | undefined;
            
            const result = await syncService.listQueue(user, storeId, status);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            next(error);
        }
    },

    /**
     * POST /sync/queue/:id/retry
     * Retry failed sync item
     */
    async retryItem(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = getUserContext(req);
            
            const result = await syncService.retryItem(id, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') return next(notFound('Item not found or not failed'));
            next(error);
        }
    },

    /**
     * POST /sync/stores/:storeId/pull
     * Pull from AIMS
     */
    async pullFromAims(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.params.storeId as string;
            const user = getUserContext(req);
            
            const result = await syncService.pullFromAims(storeId, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'SYNC_DISABLED') return next(badRequest('Sync is disabled for this store'));
            next(error);
        }
    },

    /**
     * POST /sync/stores/:storeId/push
     * Push to AIMS
     */
    async pushToAims(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.params.storeId as string;
            const user = getUserContext(req);
            
            const result = await syncService.pushToAims(storeId, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'SYNC_DISABLED') return next(badRequest('Sync is disabled for this store'));
            next(error);
        }
    },

    /**
     * GET /sync/stores/:storeId/status
     * Get store sync status
     */
    async getStoreStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.params.storeId as string;
            const user = getUserContext(req);
            
            const result = await syncService.getStoreStatus(storeId, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            next(error);
        }
    },

    /**
     * POST /sync/stores/:storeId/retry/:itemId
     * Retry specific failed item
     */
    async retryStoreItem(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.params.storeId as string;
            const itemId = req.params.itemId as string;
            const user = getUserContext(req);
            
            const result = await syncService.retryStoreItem(storeId, itemId, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            if (error.message === 'NOT_FOUND') return next(notFound('Failed item not found for this store'));
            next(error);
        }
    },

    // ======================
    // Body-based sync endpoints (used by frontend syncApi)
    // ======================

    /**
     * GET /sync/health
     * Check AIMS connection health for a store
     */
    async checkHealth(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.query.storeId as string;
            if (!storeId) return next(badRequest('storeId is required'));

            const user = getUserContext(req);
            const storeIds = user.stores?.map(s => s.id) || [];
            if (!storeIds.includes(storeId)) return next(forbidden('Access denied to this store'));

            const start = Date.now();
            const connected = await aimsGateway.checkHealth(storeId);
            const latency = Date.now() - start;

            res.json({ connected, latency });
        } catch (error: any) {
            res.json({ connected: false, error: error.message });
        }
    },

    /**
     * POST /sync/connect
     * Connect to AIMS for a store (triggers server-side AIMS login)
     */
    async connectToAims(req: Request, res: Response, next: NextFunction) {
        try {
            const { storeId } = req.body;
            if (!storeId) return next(badRequest('storeId is required'));

            const user = getUserContext(req);
            const storeIds = user.stores?.map(s => s.id) || [];
            if (!storeIds.includes(storeId)) return next(forbidden('Access denied to this store'));

            const storeConfig = await aimsGateway.getStoreConfig(storeId);
            if (!storeConfig) {
                return res.json({ success: false, error: 'AIMS not configured for this store' });
            }

            // Force a fresh token (validates credentials)
            await aimsGateway.getToken(storeConfig.companyId);

            res.json({ success: true });
        } catch (error: any) {
            res.json({ success: false, error: error.message });
        }
    },

    /**
     * POST /sync/disconnect
     * Disconnect from AIMS for a store (invalidates cached token)
     */
    async disconnectFromAims(req: Request, res: Response, next: NextFunction) {
        try {
            const { storeId } = req.body;
            if (!storeId) return next(badRequest('storeId is required'));

            const user = getUserContext(req);
            const storeIds = user.stores?.map(s => s.id) || [];
            if (!storeIds.includes(storeId)) return next(forbidden('Access denied to this store'));

            const storeConfig = await aimsGateway.getStoreConfig(storeId);
            if (storeConfig) {
                aimsGateway.invalidateToken(storeConfig.companyId);
            }

            res.json({ success: true });
        } catch (error: any) {
            next(error);
        }
    },

    /**
     * POST /sync/pull
     * Pull from AIMS (body-based storeId)
     */
    async pull(req: Request, res: Response, next: NextFunction) {
        try {
            const { storeId } = req.body;
            if (!storeId) return next(badRequest('storeId is required'));

            const user = getUserContext(req);
            const result = await syncService.pullFromAims(storeId, user);

            // Map response to match PullSyncResult format expected by frontend
            res.json({
                spaces: result.stats.total,
                people: 0,
                conferenceRooms: 0,
                created: result.stats.created,
                updated: result.stats.updated,
                duration: 0,
            });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'SYNC_DISABLED') return next(badRequest('Sync is disabled for this store'));
            next(error);
        }
    },

    /**
     * POST /sync/push
     * Push to AIMS (body-based storeId)
     */
    async push(req: Request, res: Response, next: NextFunction) {
        try {
            const { storeId } = req.body;
            if (!storeId) return next(badRequest('storeId is required'));

            const user = getUserContext(req);
            const result = await syncService.pushToAims(storeId, user);

            // Map response to match PushSyncResult format
            res.json({
                processed: result.stats.processed,
                succeeded: result.stats.succeeded,
                failed: result.stats.failed,
                duration: 0,
            });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'SYNC_DISABLED') return next(badRequest('Sync is disabled for this store'));
            next(error);
        }
    },

    /**
     * POST /sync/full
     * Full sync: pull then push (body-based storeId)
     */
    async fullSync(req: Request, res: Response, next: NextFunction) {
        try {
            const { storeId } = req.body;
            if (!storeId) return next(badRequest('storeId is required'));

            const user = getUserContext(req);

            // Pull
            const pullResult = await syncService.pullFromAims(storeId, user);

            // Push
            const pushResult = await syncService.pushToAims(storeId, user);

            res.json({
                pull: {
                    spaces: pullResult.stats.total,
                    people: 0,
                    conferenceRooms: 0,
                    created: pullResult.stats.created,
                    updated: pullResult.stats.updated,
                    duration: 0,
                },
                push: {
                    processed: pushResult.stats.processed,
                    succeeded: pushResult.stats.succeeded,
                    failed: pushResult.stats.failed,
                    duration: 0,
                },
            });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'SYNC_DISABLED') return next(badRequest('Sync is disabled for this store'));
            next(error);
        }
    },
};
