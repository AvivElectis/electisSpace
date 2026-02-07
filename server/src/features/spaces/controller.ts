/**
 * Spaces Feature - Controller
 * 
 * @description HTTP request/response handling for spaces management endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { notFound, conflict, badRequest } from '../../shared/middleware/index.js';
import { spacesService } from './service.js';
import { createSpaceSchema, updateSpaceSchema, assignLabelSchema } from './types.js';
import type { SpacesUserContext } from './types.js';

function getUserContext(req: Request): SpacesUserContext {
    return { id: req.user!.id, stores: req.user?.stores?.map(s => ({ id: s.id })) };
}

export const spacesController = {
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(parseInt(req.query.limit as string) || 50, 10000);
            const result = await spacesService.list({
                page, limit,
                search: req.query.search as string,
                hasLabel: req.query.hasLabel as string,
                syncStatus: req.query.syncStatus as string,
                storeId: req.query.storeId as string,
            }, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(badRequest('Access denied to this store'));
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
            const data = createSpaceSchema.parse(req.body);
            const result = await spacesService.create(data, getUserContext(req));
            res.status(201).json(result);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(badRequest('Access denied to this store'));
            if (error.message === 'CONFLICT') return next(conflict('Space with this ID already exists'));
            next(error);
        }
    },

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const data = updateSpaceSchema.parse(req.body);
            const result = await spacesService.update(req.params.id as string, data, getUserContext(req));
            res.json(result);
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') return next(notFound('Space'));
            next(error);
        }
    },

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await spacesService.delete(req.params.id as string, getUserContext(req));
            res.status(204).send();
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') return next(notFound('Space'));
            next(error);
        }
    },

    async assignLabel(req: Request, res: Response, next: NextFunction) {
        try {
            const { labelCode } = assignLabelSchema.parse(req.body);
            const result = await spacesService.assignLabel(req.params.id as string, labelCode, getUserContext(req));
            res.json(result);
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
            if (error.message === 'FORBIDDEN') return next(badRequest('Access denied to this store'));
            next(error);
        }
    },
};
