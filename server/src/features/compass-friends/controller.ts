import type { Request, Response, NextFunction } from 'express';
import { badRequest } from '../../shared/middleware/index.js';
import { sendFriendRequestSchema, createCompanyUserSchema, updateCompanyUserSchema } from './types.js';
import * as service from './service.js';
import * as repo from './repository.js';

// ─── GET /api/v2/compass/friends ─────────────────────

export const listFriends = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const friends = await service.listFriends(req.compassUser!.id);
        res.json({ data: friends });
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/v2/compass/friends/requests ────────────

export const listRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requests = await service.listPendingRequests(req.compassUser!.id);
        res.json({ data: requests });
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/v2/compass/friends/request ────────────

export const sendRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = sendFriendRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const friendship = await service.sendRequest(
            req.compassUser!.id,
            parsed.data.addresseeId,
        );

        res.status(201).json({ data: friendship });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /api/v2/compass/friends/:id/accept ────────

export const acceptRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await service.acceptRequest(
            req.compassUser!.id,
            req.params.id as string,
        );

        res.json({ data: result });
    } catch (error) {
        next(error);
    }
};

// ─── DELETE /api/v2/compass/friends/:id ──────────────

export const removeFriend = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await service.removeFriend(
            req.compassUser!.id,
            req.params.id as string,
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /api/v2/compass/friends/:id/block ─────────

export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await service.blockUser(
            req.compassUser!.id,
            req.params.id as string,
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/v2/compass/friends/locations ───────────

export const friendLocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const locations = await service.getFriendLocations(req.compassUser!.id);
        res.json({ data: locations });
    } catch (error) {
        next(error);
    }
};

// ─── Admin: Company User CRUD ────────────────────────

export const listEmployees = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const users = await repo.findCompanyUsers(companyId);
        res.json({ data: users });
    } catch (error) {
        next(error);
    }
};

export const createEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = createCompanyUserSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const companyId = req.params.companyId as string;
        const user = await repo.createCompanyUser({
            companyId,
            ...parsed.data,
        });

        res.status(201).json({ data: user });
    } catch (error) {
        next(error);
    }
};

export const updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = updateCompanyUserSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const user = await repo.updateCompanyUser(
            req.params.userId as string,
            parsed.data as any,
        );

        res.json({ data: user });
    } catch (error) {
        next(error);
    }
};
