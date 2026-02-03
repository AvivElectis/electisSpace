import type { Request, Response, NextFunction } from 'express';
import { labelsService } from './service.js';
import {
    storeIdQuerySchema,
    linkLabelSchema,
    unlinkLabelSchema,
    blinkLabelSchema,
} from './types.js';
import type { LabelsUserContext } from './types.js';
import { badRequest, forbidden } from '../../shared/middleware/index.js';

// ============================================================================
// Helpers
// ============================================================================

function getUserContext(req: Request): LabelsUserContext {
    return {
        userId: req.user?.id || '',
        storeIds: req.user?.stores?.map((s) => s.id) || [],
    };
}

function mapServiceError(error: unknown): Error {
    if (error === 'FORBIDDEN') {
        return forbidden('Access denied to this store');
    }
    if (error === 'AIMS_NOT_CONFIGURED') {
        return badRequest('AIMS not configured for this store');
    }
    throw error;
}

// ============================================================================
// Labels Controller
// ============================================================================

export const labelsController = {
    /**
     * GET /labels - Fetch all labels for a store
     */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const { storeId } = storeIdQuerySchema.parse(req.query);

            const { labels, total } = await labelsService.list(userContext, storeId);
            res.json({ data: labels, total });
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * GET /labels/unassigned - Fetch unassigned labels
     */
    async listUnassigned(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const { storeId } = storeIdQuerySchema.parse(req.query);

            const { labels, total } = await labelsService.listUnassigned(userContext, storeId);
            res.json({ data: labels, total });
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * GET /labels/:labelCode/images - Fetch label images
     */
    async getLabelImages(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const { storeId } = storeIdQuerySchema.parse(req.query);
            const labelCode = String(req.params.labelCode);

            const result = await labelsService.getLabelImages(userContext, storeId, labelCode);
            res.json({ data: result });
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * POST /labels/link - Link a label to an article
     */
    async linkLabel(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const data = linkLabelSchema.parse(req.body);

            const result = await labelsService.linkLabel(userContext, data);
            res.json({ success: true, data: result });
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * POST /labels/unlink - Unlink a label
     */
    async unlinkLabel(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const data = unlinkLabelSchema.parse(req.body);

            const result = await labelsService.unlinkLabel(userContext, data);
            res.json({ success: true, data: result });
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * POST /labels/:labelCode/blink - Blink a label
     */
    async blinkLabel(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const { storeId } = blinkLabelSchema.parse(req.body);
            const labelCode = String(req.params.labelCode);

            const result = await labelsService.blinkLabel(userContext, storeId, labelCode);
            res.json({ success: true, data: result });
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * GET /labels/status - Check AIMS configuration status
     */
    async getStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const { storeId } = storeIdQuerySchema.parse(req.query);

            const status = await labelsService.getStatus(userContext, storeId);
            res.json(status);
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * GET /labels/articles - Fetch articles for linking
     */
    async getArticles(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const { storeId } = storeIdQuerySchema.parse(req.query);

            const { articles, total } = await labelsService.getArticles(userContext, storeId);
            res.json({ data: articles, total });
        } catch (error) {
            next(mapServiceError(error));
        }
    },
};
