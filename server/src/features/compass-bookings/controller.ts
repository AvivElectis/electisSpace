import type { Request, Response, NextFunction } from 'express';
import { badRequest, notFound } from '../../shared/middleware/index.js';
import {
    createBookingSchema,
    extendBookingSchema,
    bookingQuerySchema,
    createBookingRuleSchema,
    updateBookingRuleSchema,
    adminCreateBookingSchema,
} from './types.js';
import * as service from './service.js';
import * as repo from './repository.js';

// ─── POST /api/v2/compass/bookings ───────────────────

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = createBookingSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const { spaceId, startTime, endTime, notes, recurrenceRule } = parsed.data;
        const user = req.compassUser!;

        const result = await service.createBooking({
            companyUserId: user.id,
            companyId: user.companyId,
            branchId: user.branchId,
            spaceId,
            startTime: new Date(startTime),
            endTime: endTime ? new Date(endTime) : null,
            notes,
            recurrenceRule,
        });

        res.status(201).json({ data: result });
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/v2/compass/bookings ────────────────────

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = bookingQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw badRequest('Invalid query', parsed.error.format());
        }

        const user = req.compassUser!;
        const bookings = await service.listUserBookings(
            user.id,
            user.companyId,
            parsed.data.status,
        );

        res.json({ data: bookings });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /api/v2/compass/bookings/:id/check-in ────

export const checkIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.compassUser!;
        const booking = await service.checkIn(
            req.params.id as string,
            user.id,
            user.companyId,
        );

        res.json({ data: booking });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /api/v2/compass/bookings/:id/release ─────

export const release = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.compassUser!;
        const booking = await service.release(
            req.params.id as string,
            user.id,
            user.companyId,
        );

        res.json({ data: booking });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /api/v2/compass/bookings/:id/extend ──────

export const extend = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = extendBookingSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const user = req.compassUser!;
        const booking = await service.extend(
            req.params.id as string,
            user.id,
            user.companyId,
            new Date(parsed.data.newEndTime),
        );

        res.json({ data: booking });
    } catch (error) {
        next(error);
    }
};

// ─── DELETE /api/v2/compass/bookings/:id ─────────────

export const cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.compassUser!;
        const scope = req.query.scope as 'instance' | 'future' | 'all' | undefined;
        const result = await service.cancel(
            req.params.id as string,
            user.id,
            user.companyId,
            scope,
        );

        res.json({ data: result });
    } catch (error) {
        next(error);
    }
};

// ─── Admin: Booking List & Cancel ────────────────────

export const adminList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const statusFilter = req.query.status as string | undefined;
        const bookings = await repo.findByCompany(companyId, statusFilter);
        res.json({ data: bookings });
    } catch (error) {
        next(error);
    }
};

export const adminCreate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = adminCreateBookingSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const companyId = req.params.companyId as string;
        const { companyUserId, branchId, spaceId, startTime, endTime, notes, recurrenceRule } = parsed.data;

        const result = await service.adminCreateBooking({
            companyUserId,
            companyId,
            branchId,
            spaceId,
            startTime: new Date(startTime),
            endTime: endTime ? new Date(endTime) : null,
            notes,
            recurrenceRule,
        });

        res.status(201).json({ data: result });
    } catch (error) {
        next(error);
    }
};

export const adminCancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const bookingId = req.params.bookingId as string;
        const companyId = req.params.companyId as string;
        const scope = req.query.scope as 'instance' | 'future' | 'all' | undefined;
        const booking = await repo.findBookingById(bookingId, companyId);
        if (!booking) throw notFound('Booking not found');
        const result = await service.adminCancel(bookingId, companyId, scope);
        res.json({ data: result });
    } catch (error) {
        next(error);
    }
};

// ─── Admin: Booking Rules CRUD ───────────────────────

export const listRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const rules = await repo.findRulesByCompany(companyId);
        res.json({ data: rules });
    } catch (error) {
        next(error);
    }
};

export const createRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = createBookingRuleSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const companyId = req.params.companyId as string;
        const rule = await repo.createRule({
            companyId,
            ...parsed.data,
        });

        res.status(201).json({ data: rule });
    } catch (error) {
        next(error);
    }
};

export const updateRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = updateBookingRuleSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const companyId = req.params.companyId as string;
        const rule = await repo.updateRule(
            req.params.ruleId as string,
            companyId,
            parsed.data,
        );

        res.json({ data: rule });
    } catch (error) {
        next(error);
    }
};

export const deleteRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        await repo.deleteRule(req.params.ruleId as string, companyId);
        res.json({ message: 'Rule deleted' });
    } catch (error) {
        next(error);
    }
};
