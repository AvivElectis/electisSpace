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
            const result = await syncService.getJob(id);
            
            if (!result) {
                res.status(404).json({ error: 'Job not found' });
                return;
            }

            res.json(result);
        } catch (error) {
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
            if (error.message === 'FORBIDDEN') return next(badRequest('Access denied to this store'));
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
};
