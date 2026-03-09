import { badRequest, notFound, conflict, forbidden } from '../../shared/middleware/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import { emitBookingEvent } from '../../shared/infrastructure/services/compassSocket.js';
import { prisma } from '../../config/index.js';
import * as repo from './repository.js';
import * as ruleEngine from './ruleEngine.js';
import { resolveWorkHours, isWithinWorkingHours } from './workHoursService.js';

// ─── Create Booking ──────────────────────────────────

export const createBooking = async (params: {
    companyUserId: string;
    companyId: string;
    branchId: string;
    spaceId: string;
    startTime: Date;
    endTime: Date | null;
    bookedBy?: string;
    notes?: string;
    recurrenceRule?: string;
}) => {
    const { companyUserId, companyId, branchId, spaceId, startTime, endTime, bookedBy, notes } = params;

    // If recurrence rule is provided, create a recurring series
    if (params.recurrenceRule) {
        const { createRecurringSeries } = await import('./recurrenceService.js');
        return createRecurringSeries({
            rrule: params.recurrenceRule,
            startTime: startTime.toISOString().slice(11, 16),
            endTime: endTime?.toISOString().slice(11, 16) ?? null,
            spaceId,
            companyUserId,
            companyId,
            branchId,
            notes,
            bookedBy,
            prisma,
        });
    }

    // L3: Require endTime
    if (!endTime) {
        throw badRequest('End time is required');
    }

    // S2: Verify space belongs to the user's branch
    const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { storeId: true } });
    if (!space) throw notFound('Space not found');
    if (space.storeId !== branchId) throw forbidden('Space does not belong to your branch');

    // Resolve rules for this branch
    const rules = await ruleEngine.resolveRules(companyId, branchId);

    // Validate duration
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);

    if (durationMinutes < rules.minBookingDurationMinutes) {
        throw badRequest('BOOKING_TOO_SHORT', {
            min: rules.minBookingDurationMinutes,
        });
    }

    if (durationMinutes > rules.maxBookingDurationMinutes) {
        throw badRequest('BOOKING_TOO_LONG', {
            max: rules.maxBookingDurationMinutes,
        });
    }

    // Validate advance booking
    const now = new Date();
    const advanceDays = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (advanceDays > rules.advanceBookingDays) {
        throw badRequest('BOOKING_TOO_FAR_AHEAD', {
            maxDays: rules.advanceBookingDays,
        });
    }

    // Validate against work hours if enforced
    if (rules.enforceWorkingHours) {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { workingHoursStart: true, workingHoursEnd: true, workingDays: true, defaultTimezone: true },
        });
        const store = await prisma.store.findUnique({
            where: { id: branchId },
            select: { workingHoursStart: true, workingHoursEnd: true, workingDays: true },
        });
        const workHours = resolveWorkHours(
            company ? { ...company, workingDays: company.workingDays as Record<string, boolean> | null } : {},
            store ? { ...store, workingDays: store.workingDays as Record<string, boolean> | null } : {},
        );

        if (!isWithinWorkingHours(startTime, endTime, workHours)) {
            throw badRequest('BOOKING_OUTSIDE_WORKING_HOURS');
        }
    }

    // L2: Atomic conflict check + concurrent limit + create in a serializable transaction
    const booking = await prisma.$transaction(async (tx) => {
        // Check concurrent bookings limit inside transaction for atomicity
        const activeCount = await tx.booking.count({
            where: {
                companyUserId,
                companyId,
                status: { in: ['BOOKED', 'CHECKED_IN'] },
            },
        });
        if (activeCount >= rules.maxConcurrentBookings) {
            throw badRequest('MAX_CONCURRENT_BOOKINGS_EXCEEDED', {
                max: rules.maxConcurrentBookings,
            });
        }

        const conflicts = await tx.booking.findMany({
            where: {
                spaceId,
                status: { in: ['BOOKED', 'CHECKED_IN'] },
                startTime: { lt: endTime },
                OR: [{ endTime: null }, { endTime: { gt: startTime } }],
            },
        });
        if (conflicts.length > 0) {
            throw conflict('SPACE_ALREADY_BOOKED');
        }

        return tx.booking.create({
            data: {
                companyUserId,
                spaceId,
                branchId,
                companyId,
                startTime,
                endTime,
                bookedBy: bookedBy ?? null,
                notes: notes ?? null,
            },
            include: {
                space: { select: { id: true, externalId: true, data: true, buildingId: true, floorId: true } },
                companyUser: { select: { id: true, displayName: true, email: true } },
            },
        });
    }, { isolationLevel: 'Serializable' });

    appLogger.info('CompassBooking', `Booking created: ${booking.id}`, {
        spaceId,
        companyUserId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
    });

    emitBookingEvent('space:booked', branchId, {
        bookingId: booking.id,
        spaceId,
        companyUserId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
    });

    return booking;
};

// ─── Check In ────────────────────────────────────────

export const checkIn = async (bookingId: string, companyUserId: string, companyId: string) => {
    const booking = await repo.findBookingById(bookingId, companyId);
    if (!booking) {
        throw notFound('Booking not found');
    }

    if (booking.companyUserId !== companyUserId) {
        throw forbidden('Not your booking');
    }

    if (booking.status !== 'BOOKED') {
        throw badRequest('INVALID_BOOKING_STATUS', {
            current: booking.status,
            expected: 'BOOKED',
        });
    }

    const rules = await ruleEngine.resolveRules(companyId, booking.branchId);
    const now = new Date();
    const deadline = new Date(booking.startTime.getTime() + rules.checkInWindowMinutes * 60 * 1000);

    if (now < booking.startTime) {
        throw badRequest('CHECK_IN_TOO_EARLY');
    }

    if (now > deadline) {
        throw badRequest('CHECK_IN_WINDOW_EXPIRED');
    }

    const updated = await repo.updateBookingStatus(bookingId, 'CHECKED_IN', {
        checkedInAt: now,
    }, 'BOOKED');

    appLogger.info('CompassBooking', `Check-in: ${bookingId}`, { companyUserId });

    emitBookingEvent('space:checkedIn', booking.branchId, {
        bookingId,
        spaceId: booking.spaceId,
        companyUserId,
    });

    return updated;
};

// ─── Release ─────────────────────────────────────────

export const release = async (bookingId: string, companyUserId: string, companyId: string) => {
    const booking = await repo.findBookingById(bookingId, companyId);
    if (!booking) {
        throw notFound('Booking not found');
    }

    if (booking.companyUserId !== companyUserId) {
        throw forbidden('Not your booking');
    }

    if (booking.status !== 'CHECKED_IN') {
        throw badRequest('INVALID_BOOKING_STATUS', {
            current: booking.status,
            expected: 'CHECKED_IN',
        });
    }

    const updated = await repo.updateBookingStatus(bookingId, 'RELEASED', {
        releasedAt: new Date(),
    }, 'CHECKED_IN');

    appLogger.info('CompassBooking', `Released: ${bookingId}`, { companyUserId });

    emitBookingEvent('space:released', booking.branchId, {
        bookingId,
        spaceId: booking.spaceId,
        companyUserId,
    });

    return updated;
};

// ─── Cancel ──────────────────────────────────────────

export const cancel = async (
    bookingId: string,
    companyUserId: string,
    companyId: string,
    scope?: 'instance' | 'future' | 'all',
) => {
    const booking = await repo.findBookingById(bookingId, companyId);
    if (!booking) {
        throw notFound('Booking not found');
    }

    if (booking.companyUserId !== companyUserId) {
        throw forbidden('Not your booking');
    }

    if (booking.status !== 'BOOKED') {
        throw badRequest('INVALID_BOOKING_STATUS', {
            current: booking.status,
            expected: 'BOOKED',
        });
    }

    // Handle scoped cancellation for recurring bookings
    if (booking.recurrenceGroupId && (scope === 'all' || scope === 'future')) {
        const result = await prisma.booking.updateMany({
            where: {
                recurrenceGroupId: booking.recurrenceGroupId,
                status: { in: ['BOOKED'] },
                ...(scope === 'future' ? { startTime: { gte: booking.startTime } } : {}),
            },
            data: { status: 'CANCELLED' },
        });

        appLogger.info('CompassBooking', `Cancelled ${result.count} recurring bookings (scope=${scope})`, {
            companyUserId,
            recurrenceGroupId: booking.recurrenceGroupId,
        });

        emitBookingEvent('space:released', booking.branchId, {
            bookingId,
            spaceId: booking.spaceId,
            companyUserId,
            scope,
            cancelledCount: result.count,
        });

        return { cancelled: result.count, scope };
    }

    // Single instance cancellation (default)
    const updated = await repo.updateBookingStatus(bookingId, 'CANCELLED');

    appLogger.info('CompassBooking', `Cancelled: ${bookingId}`, { companyUserId });

    emitBookingEvent('space:released', booking.branchId, {
        bookingId,
        spaceId: booking.spaceId,
        companyUserId,
    });

    return updated;
};

// ─── Admin Cancel (allows BOOKED or CHECKED_IN) ─────

export const adminCancel = async (
    bookingId: string,
    companyId: string,
    scope?: 'instance' | 'future' | 'all',
) => {
    const booking = await repo.findBookingById(bookingId, companyId);
    if (!booking) {
        throw notFound('Booking not found');
    }

    if (!['BOOKED', 'CHECKED_IN'].includes(booking.status)) {
        throw badRequest('INVALID_BOOKING_STATUS', {
            current: booking.status,
            expected: 'BOOKED or CHECKED_IN',
        });
    }

    // Handle scoped cancellation for recurring bookings
    if (booking.recurrenceGroupId && (scope === 'all' || scope === 'future')) {
        const result = await prisma.booking.updateMany({
            where: {
                recurrenceGroupId: booking.recurrenceGroupId,
                status: { in: ['BOOKED', 'CHECKED_IN'] },
                ...(scope === 'future' ? { startTime: { gte: booking.startTime } } : {}),
            },
            data: { status: 'CANCELLED' },
        });

        appLogger.info('CompassBooking', `Admin cancelled ${result.count} recurring bookings (scope=${scope})`, {
            companyUserId: booking.companyUserId,
            recurrenceGroupId: booking.recurrenceGroupId,
        });

        emitBookingEvent('space:released', booking.branchId, {
            bookingId,
            spaceId: booking.spaceId,
            companyUserId: booking.companyUserId,
            scope,
            cancelledCount: result.count,
        });

        return { cancelled: result.count, scope };
    }

    const updated = await repo.updateBookingStatus(bookingId, 'CANCELLED');

    appLogger.info('CompassBooking', `Admin cancelled: ${bookingId}`, { companyUserId: booking.companyUserId });

    emitBookingEvent('space:released', booking.branchId, {
        bookingId,
        spaceId: booking.spaceId,
        companyUserId: booking.companyUserId,
    });

    return updated;
};

// ─── Extend ──────────────────────────────────────────

export const extend = async (
    bookingId: string,
    companyUserId: string,
    companyId: string,
    newEndTime: Date,
) => {
    const booking = await repo.findBookingById(bookingId, companyId);
    if (!booking) {
        throw notFound('Booking not found');
    }

    if (booking.companyUserId !== companyUserId) {
        throw forbidden('Not your booking');
    }

    if (!['BOOKED', 'CHECKED_IN'].includes(booking.status)) {
        throw badRequest('INVALID_BOOKING_STATUS', {
            current: booking.status,
            expected: 'BOOKED or CHECKED_IN',
        });
    }

    if (!booking.endTime || newEndTime <= booking.endTime) {
        throw badRequest('New end time must be after current end time');
    }

    // Validate extended duration against rules
    const rules = await ruleEngine.resolveRules(companyId, booking.branchId);
    const newDurationMinutes =
        (newEndTime.getTime() - booking.startTime.getTime()) / (1000 * 60);

    if (newDurationMinutes > rules.maxBookingDurationMinutes) {
        throw badRequest('BOOKING_TOO_LONG', {
            max: rules.maxBookingDurationMinutes,
        });
    }

    // Atomic conflict check + update in a serializable transaction
    const updated = await prisma.$transaction(async (tx) => {
        const conflicts = await tx.booking.findMany({
            where: {
                spaceId: booking.spaceId,
                id: { not: bookingId },
                status: { in: ['BOOKED', 'CHECKED_IN'] },
                startTime: { lt: newEndTime },
                OR: [{ endTime: null }, { endTime: { gt: booking.endTime! } }],
            },
        });
        if (conflicts.length > 0) {
            throw conflict('SPACE_ALREADY_BOOKED');
        }

        return tx.booking.update({
            where: { id: bookingId },
            data: { endTime: newEndTime },
            include: {
                space: { select: { id: true, externalId: true, data: true, buildingId: true, floorId: true } },
                companyUser: { select: { id: true, displayName: true, email: true } },
            },
        });
    }, { isolationLevel: 'Serializable' });

    appLogger.info('CompassBooking', `Extended: ${bookingId}`, {
        companyUserId,
        newEndTime: newEndTime.toISOString(),
    });

    return updated;
};

// ─── List User Bookings ──────────────────────────────

const VALID_BOOKING_STATUSES = new Set([
    'BOOKED', 'CHECKED_IN', 'RELEASED', 'AUTO_RELEASED', 'CANCELLED', 'NO_SHOW',
]);

export const listUserBookings = async (
    companyUserId: string,
    companyId: string,
    status?: string,
) => {
    let statusFilter: string[] | undefined;
    if (status) {
        const values = status.split(',').filter(s => s.trim());
        const invalid = values.filter(v => !VALID_BOOKING_STATUSES.has(v));
        if (invalid.length > 0) {
            throw badRequest(`Invalid booking status: ${invalid.join(', ')}`);
        }
        statusFilter = values;
    }

    return repo.findByUser(companyUserId, companyId, statusFilter as any);
};

// ─── Admin Create Booking (skips rules, allows null endTime) ────

export const adminCreateBooking = async (params: {
    companyUserId: string;
    companyId: string;
    branchId: string;
    spaceId: string;
    startTime: Date;
    endTime: Date | null;
    notes?: string;
    recurrenceRule?: string;
}) => {
    const { companyUserId, companyId, branchId, spaceId, startTime, endTime, notes } = params;

    // If recurrence rule is provided, create a recurring series
    if (params.recurrenceRule) {
        const { createRecurringSeries } = await import('./recurrenceService.js');
        return createRecurringSeries({
            rrule: params.recurrenceRule,
            startTime: startTime.toISOString().slice(11, 16),
            endTime: endTime?.toISOString().slice(11, 16) ?? null,
            spaceId,
            companyUserId,
            companyId,
            branchId,
            notes,
            bookedBy: 'ADMIN',
            prisma,
        });
    }

    // Verify space belongs to the branch
    const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { storeId: true } });
    if (!space) throw notFound('Space not found');
    if (space.storeId !== branchId) throw forbidden('Space does not belong to this branch');

    // Verify employee exists and belongs to company
    const employee = await prisma.companyUser.findFirst({ where: { id: companyUserId, companyId } });
    if (!employee) throw notFound('Employee not found');

    // Atomic conflict check + create
    const booking = await prisma.$transaction(async (tx) => {
        const conflictWhere: any = {
            spaceId,
            status: { in: ['BOOKED', 'CHECKED_IN'] },
        };

        if (endTime) {
            // Finite reservation: check overlap
            conflictWhere.startTime = { lt: endTime };
            conflictWhere.OR = [{ endTime: null }, { endTime: { gt: startTime } }];
        } else {
            // Open-ended reservation: conflicts with anything that hasn't ended before start
            conflictWhere.OR = [
                { endTime: null },
                { endTime: { gt: startTime } },
            ];
        }

        const conflicts = await tx.booking.findMany({ where: conflictWhere });
        if (conflicts.length > 0) {
            throw conflict('SPACE_ALREADY_BOOKED');
        }

        return tx.booking.create({
            data: {
                companyUserId,
                spaceId,
                branchId,
                companyId,
                startTime,
                endTime: endTime ?? null,
                bookedBy: 'ADMIN',
                notes: notes ?? null,
            },
            include: {
                space: { select: { id: true, externalId: true, data: true, buildingId: true, floorId: true } },
                companyUser: { select: { id: true, displayName: true, email: true } },
            },
        });
    }, { isolationLevel: 'Serializable' });

    appLogger.info('CompassBooking', `Admin booking created: ${booking.id}`, {
        spaceId,
        companyUserId,
        startTime: startTime.toISOString(),
        endTime: endTime?.toISOString() ?? 'unlimited',
    });

    emitBookingEvent('space:booked', branchId, {
        bookingId: booking.id,
        spaceId,
        companyUserId,
        startTime: startTime.toISOString(),
        endTime: endTime?.toISOString() ?? null,
    });

    return booking;
};

// ─── Admin Update Booking ───────────────────────────

export const adminUpdateBooking = async (
    bookingId: string,
    companyId: string,
    updates: {
        startTime?: Date;
        endTime?: Date | null;
        notes?: string | null;
    },
) => {
    const booking = await repo.findBookingById(bookingId, companyId);
    if (!booking) throw notFound('Booking not found');

    if (booking.status !== 'BOOKED') {
        throw badRequest('INVALID_BOOKING_STATUS', {
            current: booking.status,
            expected: 'BOOKED',
        });
    }

    const newStart = updates.startTime ?? booking.startTime;
    const newEnd = updates.endTime !== undefined ? updates.endTime : booking.endTime;

    // If time changed, do conflict check in serializable transaction
    const timeChanged = updates.startTime || updates.endTime !== undefined;

    if (timeChanged) {
        return prisma.$transaction(async (tx) => {
            const conflictWhere: any = {
                spaceId: booking.spaceId,
                id: { not: bookingId },
                status: { in: ['BOOKED', 'CHECKED_IN'] },
            };

            if (newEnd) {
                conflictWhere.startTime = { lt: newEnd };
                conflictWhere.OR = [{ endTime: null }, { endTime: { gt: newStart } }];
            } else {
                conflictWhere.OR = [
                    { endTime: null },
                    { endTime: { gt: newStart } },
                ];
            }

            const conflicts = await tx.booking.findMany({ where: conflictWhere });
            if (conflicts.length > 0) {
                throw conflict('SPACE_ALREADY_BOOKED');
            }

            const updated = await tx.booking.update({
                where: { id: bookingId },
                data: {
                    ...(updates.startTime ? { startTime: updates.startTime } : {}),
                    ...(updates.endTime !== undefined ? { endTime: updates.endTime } : {}),
                    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
                },
                include: {
                    space: { select: { id: true, externalId: true, data: true, buildingId: true, floorId: true } },
                    companyUser: { select: { id: true, displayName: true, email: true } },
                },
            });

            appLogger.info('CompassBooking', `Admin updated: ${bookingId}`, { updates: JSON.stringify(updates) });

            emitBookingEvent('booking:updated', booking.branchId, {
                bookingId,
                spaceId: booking.spaceId,
                companyUserId: booking.companyUserId,
            });

            return updated;
        }, { isolationLevel: 'Serializable' });
    }

    // Notes-only update (no conflict check needed)
    const updated = await repo.updateBooking(bookingId, { notes: updates.notes ?? null });

    appLogger.info('CompassBooking', `Admin updated notes: ${bookingId}`);

    return updated;
};

// ─── Auto-Release Job Logic ──────────────────────────

export const processAutoRelease = async () => {
    const now = new Date();
    const expired = await repo.findExpiredBookings(now);

    let count = 0;
    for (const booking of expired) {
        try {
            await repo.updateBookingStatus(booking.id, 'AUTO_RELEASED', {
                autoReleased: true,
                releasedAt: now,
            });

            emitBookingEvent('space:released', booking.branchId, {
                bookingId: booking.id,
                spaceId: booking.spaceId,
                status: 'AUTO_RELEASED',
            });

            count++;
        } catch (error) {
            appLogger.error('CompassBooking', `Failed to auto-release booking ${booking.id}`, { error: String(error) });
        }
    }

    if (count > 0) {
        appLogger.info('CompassBooking', `Auto-released ${count} expired bookings`);
    }

    return count;
};

// ─── No-Show Detection Job Logic ─────────────────────

export const processNoShows = async () => {
    const now = new Date();
    // Use a generous 24h cutoff to capture all candidates;
    // per-booking rule resolution below handles accurate filtering
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const candidates = await repo.findNoShowBookings(cutoff);

    // Cache resolved rules per company+branch to avoid redundant DB queries
    const rulesCache = new Map<string, ruleEngine.ResolvedRules>();

    let count = 0;
    for (const booking of candidates) {
        try {
            // Resolve per-branch rules for accurate check-in window (cached)
            const cacheKey = `${booking.companyId}:${booking.branchId}`;
            let rules = rulesCache.get(cacheKey);
            if (!rules) {
                rules = await ruleEngine.resolveRules(
                    booking.companyId,
                    booking.branchId,
                );
                rulesCache.set(cacheKey, rules);
            }

            const deadline = new Date(
                booking.startTime.getTime() + rules.checkInWindowMinutes * 60 * 1000,
            );

            if (now > deadline && rules.autoReleaseOnNoShow) {
                await repo.updateBookingStatus(booking.id, 'NO_SHOW', {
                    autoReleased: true,
                    releasedAt: now,
                });

                emitBookingEvent('space:released', booking.branchId, {
                    bookingId: booking.id,
                    spaceId: booking.spaceId,
                    status: 'NO_SHOW',
                });

                count++;
            }
        } catch (error) {
            appLogger.error('CompassBooking', `Failed to process no-show for booking ${booking.id}`, { error: String(error) });
        }
    }

    if (count > 0) {
        appLogger.info('CompassBooking', `Marked ${count} bookings as no-show`);
    }

    return count;
};
