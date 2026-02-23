import type { Request, Response, NextFunction } from 'express';
import { rewardsService } from './service.js';
import {
    storeIdQuerySchema,
    createCampaignSchema,
    updateCampaignSchema,
    campaignIdParamSchema,
} from './types.js';
import type { RewardsUserContext } from './types.js';
import { badRequest, forbidden } from '../../shared/middleware/index.js';

// ============================================================================
// Helpers
// ============================================================================

function getUserContext(req: Request): RewardsUserContext {
    return {
        userId: req.user?.id || '',
        globalRole: req.user?.globalRole,
        storeIds: req.user?.stores?.map((s) => s.id) || [],
    };
}

function mapServiceError(error: unknown): Error {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === 'FORBIDDEN') return forbidden('Access denied to this store');
    if (msg === 'NOT_FOUND') return badRequest('Campaign not found');
    if (msg === 'INVALID_TRANSITION') return badRequest('Invalid campaign status transition');
    if (msg === 'CANNOT_DELETE_ACTIVE') return badRequest('Cannot delete an active campaign — pause or cancel it first');
    if (msg === 'INVALID_DATE_RANGE') return badRequest('Start date must be before end date');
    if (error instanceof Error) return error;
    return new Error(String(error));
}

// ============================================================================
// Rewards Controller
// ============================================================================

export const rewardsController = {
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { storeId } = storeIdQuerySchema.parse(req.query);
            const ctx = getUserContext(req);
            const campaigns = await rewardsService.list(ctx, storeId);
            res.json({ data: campaigns });
        } catch (err) {
            next(mapServiceError(err));
        }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = campaignIdParamSchema.parse(req.params);
            const { storeId } = storeIdQuerySchema.parse(req.query);
            const ctx = getUserContext(req);
            const campaign = await rewardsService.getById(ctx, storeId, id);
            res.json({ data: campaign });
        } catch (err) {
            next(mapServiceError(err));
        }
    },

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const data = createCampaignSchema.parse(req.body);
            const ctx = getUserContext(req);
            const campaign = await rewardsService.create(ctx, data);
            res.status(201).json({ data: campaign });
        } catch (err) {
            next(mapServiceError(err));
        }
    },

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = campaignIdParamSchema.parse(req.params);
            const { storeId, ...updateData } = updateCampaignSchema.parse(req.body);
            const ctx = getUserContext(req);
            const campaign = await rewardsService.update(ctx, storeId, id, { storeId, ...updateData });
            res.json({ data: campaign });
        } catch (err) {
            next(mapServiceError(err));
        }
    },

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = campaignIdParamSchema.parse(req.params);
            const { storeId } = storeIdQuerySchema.parse(req.query);
            const ctx = getUserContext(req);
            await rewardsService.delete(ctx, storeId, id);
            res.json({ success: true });
        } catch (err) {
            next(mapServiceError(err));
        }
    },

    async activate(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = campaignIdParamSchema.parse(req.params);
            const { storeId } = storeIdQuerySchema.parse(req.body);
            const ctx = getUserContext(req);
            const campaign = await rewardsService.updateStatus(ctx, storeId, id, 'ACTIVE');
            res.json({ data: campaign });
        } catch (err) {
            next(mapServiceError(err));
        }
    },

    async pause(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = campaignIdParamSchema.parse(req.params);
            const { storeId } = storeIdQuerySchema.parse(req.body);
            const ctx = getUserContext(req);
            const campaign = await rewardsService.updateStatus(ctx, storeId, id, 'PAUSED');
            res.json({ data: campaign });
        } catch (err) {
            next(mapServiceError(err));
        }
    },

    async complete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = campaignIdParamSchema.parse(req.params);
            const { storeId } = storeIdQuerySchema.parse(req.body);
            const ctx = getUserContext(req);
            const campaign = await rewardsService.updateStatus(ctx, storeId, id, 'COMPLETED');
            res.json({ data: campaign });
        } catch (err) {
            next(mapServiceError(err));
        }
    },

    async analytics(req: Request, res: Response, next: NextFunction) {
        try {
            const { storeId } = storeIdQuerySchema.parse(req.query);
            const ctx = getUserContext(req);
            const data = await rewardsService.analytics(ctx, storeId);
            res.json({ data });
        } catch (err) {
            next(mapServiceError(err));
        }
    },
};
