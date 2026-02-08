/**
 * People Lists Feature - Controller
 */
import { Request, Response, NextFunction } from 'express';
import { peopleListsService } from './service.js';
import { createPeopleListSchema, updatePeopleListSchema } from './types.js';
import type { ListsUserContext } from './types.js';

export const peopleListsController = {
    /**
     * GET /people-lists?storeId=xxx
     * List all people lists for a store
     */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user as ListsUserContext;
            const storeId = req.query.storeId as string | undefined;
            const lists = await peopleListsService.list(user, storeId);
            res.json({ data: lists });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied to this store' } });
            }
            next(error);
        }
    },

    /**
     * GET /people-lists/:id
     * Get a single people list with content
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user as ListsUserContext;
            const id = req.params.id as string;
            const list = await peopleListsService.getById(user, id);
            res.json({ data: list });
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'People list not found' } });
            }
            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
            }
            next(error);
        }
    },

    /**
     * POST /people-lists
     * Create a new people list
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user as ListsUserContext;
            const input = createPeopleListSchema.parse(req.body);
            const list = await peopleListsService.create(user, input);
            res.status(201).json({ data: list });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
            }
            if (error.message === 'LIST_NAME_EXISTS') {
                return res.status(409).json({ error: { code: 'LIST_NAME_EXISTS', message: 'A list with this name already exists in this store' } });
            }
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } });
            }
            next(error);
        }
    },

    /**
     * PATCH /people-lists/:id
     * Update a people list (name and/or content)
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user as ListsUserContext;
            const id = req.params.id as string;
            const input = updatePeopleListSchema.parse(req.body);
            const list = await peopleListsService.update(user, id, input);
            res.json({ data: list });
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'People list not found' } });
            }
            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
            }
            if (error.message === 'LIST_NAME_EXISTS') {
                return res.status(409).json({ error: { code: 'LIST_NAME_EXISTS', message: 'A list with this name already exists in this store' } });
            }
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } });
            }
            next(error);
        }
    },

    /**
     * DELETE /people-lists/:id
     * Delete a people list
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user as ListsUserContext;
            const id = req.params.id as string;
            await peopleListsService.delete(user, id);
            res.status(204).send();
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'People list not found' } });
            }
            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
            }
            next(error);
        }
    },
};
