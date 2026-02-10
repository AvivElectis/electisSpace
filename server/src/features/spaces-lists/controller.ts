/**
 * Spaces Lists Feature - Controller
 */
import { Request, Response, NextFunction } from 'express';
import { spacesListsService } from './service.js';
import { createSpacesListSchema, updateSpacesListSchema } from './types.js';
import type { ListsUserContext } from './types.js';

export const spacesListsController = {
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user as ListsUserContext;
            const storeId = req.query.storeId as string | undefined;
            const lists = await spacesListsService.list(user, storeId);

            res.json({ data: lists });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied to this store' } });
            }
            next(error);
        }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user as ListsUserContext;
            const id = req.params.id as string;
            const list = await spacesListsService.getById(user, id);
            res.json({ data: list });
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Spaces list not found' } });
            }
            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
            }
            next(error);
        }
    },

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user as ListsUserContext;
            const input = createSpacesListSchema.parse(req.body);
            const list = await spacesListsService.create(user, input);
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

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user as ListsUserContext;
            const id = req.params.id as string;
            const input = updateSpacesListSchema.parse(req.body);
            const list = await spacesListsService.update(user, id, input);
            res.json({ data: list });
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Spaces list not found' } });
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

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user as ListsUserContext;
            const id = req.params.id as string;
            await spacesListsService.delete(user, id);
            res.status(204).send();
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Spaces list not found' } });
            }
            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
            }
            next(error);
        }
    },
};
