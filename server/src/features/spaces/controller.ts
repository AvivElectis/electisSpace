/**
 * Spaces Feature - Controller
 * 
 * @description HTTP request/response handling for spaces management endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { notFound, conflict, badRequest, forbidden } from '../../shared/middleware/index.js';
import { spacesService } from './service.js';
import { spacesSyncService } from './syncService.js';
import { createSpaceSchema, updateSpaceSchema, assignLabelSchema, bulkDeleteSpacesSchema } from './types.js';
import type { SpacesUserContext } from './types.js';
import { sseManager } from '../../shared/infrastructure/sse/SseManager.js';

function getUserContext(req: Request): SpacesUserContext {
    return { id: req.user!.id, globalRole: req.user?.globalRole, stores: req.user?.stores?.map(s => ({ id: s.id })) };
}

function getSseClientId(req: Request): string | undefined {
    return req.headers['x-sse-client-id'] as string | undefined;
}

export const spacesController = {
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
            const result = await spacesService.list({
                page, limit,
                search: req.query.search as string,
                hasLabel: req.query.hasLabel as string,
                syncStatus: req.query.syncStatus as string,
                storeId: req.query.storeId as string,
            }, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            next(error);
        }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await spacesService.getById(req.params.id as string, getUserContext(req));
            res.json(result);
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') return next(notFound('Space'));
            next(error);
        }
    },

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            const data = createSpaceSchema.parse(req.body);
            const result = await spacesService.create(data, user);
            res.status(201).json(result);

            sseManager.broadcastToStore(result.storeId, {
                type: 'spaces:changed',
                payload: {
                    action: 'create',
                    spaceId: result.id,
                    externalId: result.externalId,
                    userName: req.user?.email || 'Unknown',
                },
                excludeClientId: getSseClientId(req),
            });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            if (error.message === 'CONFLICT') return next(conflict('Space with this ID already exists'));
            next(error);
        }
    },

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const data = updateSpaceSchema.parse(req.body);
            const result = await spacesService.update(req.params.id as string, data, getUserContext(req));
            res.json(result);

            sseManager.broadcastToStore(result.storeId, {
                type: 'spaces:changed',
                payload: {
                    action: 'update',
                    spaceId: result.id,
                    externalId: result.externalId,
                    userName: req.user?.email || 'Unknown',
                },
                excludeClientId: getSseClientId(req),
            });
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') return next(notFound('Space'));
            next(error);
        }
    },

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = getUserContext(req);

            // Get storeId before deletion (for SSE broadcast)
            let existing: any = null;
            try {
                existing = await spacesService.getById(id, user);
            } catch {
                // Fall through; spacesService.delete will throw NOT_FOUND
            }

            await spacesService.delete(id, user);
            res.status(204).send();

            if (existing) {
                sseManager.broadcastToStore(existing.storeId, {
                    type: 'spaces:changed',
                    payload: {
                        action: 'delete',
                        spaceId: id,
                        externalId: existing.externalId,
                        userName: req.user?.email || 'Unknown',
                    },
                    excludeClientId: getSseClientId(req),
                });
            }
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') return next(notFound('Space'));
            next(error);
        }
    },

    async deleteBulk(req: Request, res: Response, next: NextFunction) {
        try {
            const { ids } = bulkDeleteSpacesSchema.parse(req.body);
            const result = await spacesService.deleteBulk(ids, getUserContext(req));
            res.json(result);

            // One broadcast per affected store; payload tells clients to refetch
            const sseClientId = getSseClientId(req);
            const userName = req.user?.email || 'Unknown';
            for (const storeId of result.storeIds) {
                sseManager.broadcastToStore(storeId, {
                    type: 'spaces:changed',
                    payload: { action: 'bulk-delete', count: result.deleted.length, userName },
                    excludeClientId: sseClientId,
                });
            }
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') {
                return next(forbidden('One or more spaces belong to a store you cannot access'));
            }
            next(error);
        }
    },

    async assignLabel(req: Request, res: Response, next: NextFunction) {
        try {
            const { labelCode } = assignLabelSchema.parse(req.body);
            const result = await spacesService.assignLabel(req.params.id as string, labelCode, getUserContext(req));
            res.json(result);

            sseManager.broadcastToStore(result.storeId, {
                type: 'spaces:changed',
                payload: {
                    action: 'assign-label',
                    spaceId: result.id,
                    externalId: result.externalId,
                    labelCode,
                    userName: req.user?.email || 'Unknown',
                },
                excludeClientId: getSseClientId(req),
            });
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') return next(notFound('Space'));
            if (error.message === 'LABEL_IN_USE') return next(conflict('Label is already assigned to another space'));
            next(error);
        }
    },

    async forceSync(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await spacesService.forceSync(req.body.storeId, getUserContext(req));
            res.status(202).json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            next(error);
        }
    },

    async syncPull(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.body.storeId;
            if (!storeId) return next(badRequest('storeId is required'));
            const result = await spacesSyncService.pullFromAims(storeId, getUserContext(req));
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            next(error);
        }
    },

    async syncPush(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.body.storeId;
            if (!storeId) return next(badRequest('storeId is required'));
            const result = await spacesSyncService.pushToAims(storeId, getUserContext(req));
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            next(error);
        }
    },

    async syncFull(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.body.storeId;
            if (!storeId) return next(badRequest('storeId is required'));
            const result = await spacesSyncService.fullSync(storeId, getUserContext(req));
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            next(error);
        }
    },

    async syncStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.query.storeId as string;
            if (!storeId) return next(badRequest('storeId query parameter is required'));
            const result = await spacesSyncService.getSyncStatus(storeId, getUserContext(req));
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            next(error);
        }
    },
};
