/**
 * People Feature - Controller
 * 
 * @description HTTP request/response handling for people management endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { notFound, badRequest, forbidden } from '../../shared/middleware/index.js';
import { peopleService } from './service.js';
import { createPersonSchema, updatePersonSchema, assignSchema } from './types.js';
import type { PeopleUserContext } from './types.js';
import { sseManager } from '../../shared/infrastructure/sse/SseManager.js';

// ======================
// Helpers
// ======================

function getUserContext(req: Request): PeopleUserContext {
    return {
        id: req.user!.id,
        stores: req.user?.stores?.map(s => ({ id: s.id })),
    };
}

// ======================
// Controller
// ======================

export const peopleController = {
    /**
     * GET /people
     * List all people
     */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
            const search = req.query.search as string | undefined;
            const assigned = req.query.assigned as string | undefined;
            const listId = req.query.listId as string | undefined;
            const storeId = req.query.storeId as string | undefined;

            const result = await peopleService.list(
                { page, limit, search, assigned, listId, storeId },
                user
            );
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            next(error);
        }
    },

    /**
     * GET /people/:id
     * Get person details
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = getUserContext(req);
            
            const result = await peopleService.getById(id, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') return next(notFound('Person'));
            next(error);
        }
    },

    /**
     * POST /people
     * Create new person
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = createPersonSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const user = getUserContext(req);
            const result = await peopleService.create(validation.data, user);
            res.status(201).json(result);

            // Broadcast people change to other clients
            const sseClientId = req.headers['x-sse-client-id'] as string | undefined;
            sseManager.broadcastToStore(validation.data.storeId, {
                type: 'people:changed',
                payload: { action: 'create', personId: result.id },
                excludeClientId: sseClientId,
            });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            next(error);
        }
    },

    /**
     * PATCH /people/:id
     * Update person
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = updatePersonSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const id = req.params.id as string;
            const user = getUserContext(req);
            
            const result = await peopleService.update(id, validation.data, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') return next(notFound('Person'));
            next(error);
        }
    },

    /**
     * DELETE /people/:id
     * Delete person
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = getUserContext(req);
            
            // Get person's storeId before deleting (for SSE broadcast)
            const personForStore = await peopleService.getById(id, user).catch(() => null);
            await peopleService.delete(id, user);
            res.status(204).send();

            // Broadcast people change
            if (personForStore) {
                const sseClientId = req.headers['x-sse-client-id'] as string | undefined;
                sseManager.broadcastToStore((personForStore as any).storeId, {
                    type: 'people:changed',
                    payload: { action: 'delete', personId: id },
                    excludeClientId: sseClientId,
                });
            }
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') return next(notFound('Person'));
            next(error);
        }
    },

    /**
     * POST /people/:id/assign
     * Assign person to space
     */
    async assignToSpace(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = assignSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const personId = req.params.id as string;
            const user = getUserContext(req);
            
            const result = await peopleService.assignToSpace(personId, validation.data.spaceId, user);
            res.json(result);

            // Broadcast people change
            const sseClientId = req.headers['x-sse-client-id'] as string | undefined;
            sseManager.broadcastToStore(result.storeId, {
                type: 'people:changed',
                payload: { action: 'assign', personId, spaceId: validation.data.spaceId },
                excludeClientId: sseClientId,
            });
        } catch (error: any) {
            if (error.message === 'PERSON_NOT_FOUND') return next(notFound('Person'));
            if (error.message === 'SPACE_ALREADY_ASSIGNED') return next(badRequest('Space is already assigned to another person'));
            next(error);
        }
    },

    /**
     * DELETE /people/:id/unassign
     * Unassign person from space
     */
    async unassignFromSpace(req: Request, res: Response, next: NextFunction) {
        try {
            const personId = req.params.id as string;
            const user = getUserContext(req);
            
            const result = await peopleService.unassignFromSpace(personId, user);
            res.json(result);

            // Broadcast people change
            const sseClientId = req.headers['x-sse-client-id'] as string | undefined;
            sseManager.broadcastToStore(result.storeId, {
                type: 'people:changed',
                payload: { action: 'unassign', personId },
                excludeClientId: sseClientId,
            });
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') return next(notFound('Person'));
            next(error);
        }
    },

    /**
     * GET /people/lists
     * Get all people lists
     */
    async listPeopleLists(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            const storeId = req.query.storeId as string | undefined;
            
            const result = await peopleService.listPeopleLists(user, storeId);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Access denied to this store'));
            next(error);
        }
    },

    /**
     * POST /people/import
     * Bulk import from CSV
     */
    async importFromCsv(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            const result = await peopleService.importFromCsv(req.body, user);
            res.status(202).json(result);
        } catch (error) {
            next(error);
        }
    },
};
