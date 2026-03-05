import type { Request, Response, NextFunction } from 'express';
import { badRequest } from '../../shared/middleware/index.js';
import { spacesQuerySchema, updateSpaceModeSchema } from './types.js';
import * as service from './service.js';

// ─── GET /api/v2/compass/spaces ──────────────────────

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = spacesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw badRequest('Invalid query', parsed.error.format());
        }

        const user = req.compassUser!;
        const { buildingId, floorId, areaId, amenities, startTime, endTime } = parsed.data;

        const spaces = await service.listSpaces({
            branchId: user.branchId,
            buildingId,
            floorId,
            areaId,
            amenities: amenities?.split(',').filter(Boolean),
            startTime: startTime ? new Date(startTime) : undefined,
            endTime: endTime ? new Date(endTime) : undefined,
        });

        res.json({ data: spaces });
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/v2/compass/buildings ───────────────────

export const listBuildings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.compassUser!;
        const buildings = await service.listBuildings(user.companyId);
        res.json({ data: buildings });
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/v2/admin/compass/spaces/:branchId ─────

export const adminList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const branchId = req.params.branchId as string;
        const spaces = await service.listSpaces({ branchId });
        res.json({ data: spaces });
    } catch (error) {
        next(error);
    }
};

// ─── PUT /api/v2/admin/compass/spaces/:id/mode ──────

export const updateMode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = updateSpaceModeSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const space = await service.updateSpaceMode(
            req.params.id as string,
            parsed.data.mode as any,
            parsed.data.permanentAssigneeId,
        );

        res.json({ data: space });
    } catch (error) {
        next(error);
    }
};
