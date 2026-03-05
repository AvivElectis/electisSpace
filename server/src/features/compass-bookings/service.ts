import { badRequest, notFound, conflict, forbidden } from '../../shared/middleware/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import { emitBookingEvent } from '../../shared/infrastructure/services/compassSocket.js';
import * as repo from './repository.js';
import * as ruleEngine from './ruleEngine.js';

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
}) => {
    const { companyUserId, companyId, branchId, spaceId, startTime, endTime, bookedBy, notes } = params;

    // Resolve rules for this branch
    const rules = await ruleEngine.resolveRules(companyId, branchId);

    // Validate duration
    if (endTime) {
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
    }

    // Validate advance booking
    const now = new Date();
    const advanceDays = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (advanceDays > rules.advanceBookingDays) {
        throw badRequest('BOOKING_TOO_FAR_AHEAD', {
            maxDays: rules.advanceBookingDays,
        });
    }

    // Check concurrent bookings limit
    const activeCount = await repo.countActiveByUser(companyUserId, companyId);
    if (activeCount >= rules.maxConcurrentBookings) {
        throw badRequest('MAX_CONCURRENT_BOOKINGS_EXCEEDED', {
            max: rules.maxConcurrentBookings,
        });
    }

    // Check for conflicts
    const conflicts = await repo.findActiveBySpace(spaceId, startTime, endTime);
    if (conflicts.length > 0) {
        throw conflict('SPACE_ALREADY_BOOKED');
    }

    // Create the booking
    const booking = await repo.createBooking({
        companyUserId,
        spaceId,
        branchId,
        companyId,
        startTime,
        endTime,
        bookedBy,
        notes,
    });

    appLogger.info('CompassBooking', `Booking created: ${booking.id}`, {
        spaceId,
        companyUserId,
        startTime: startTime.toISOString(),
        endTime: endTime?.toISOString(),
    });

    emitBookingEvent('space:booked', branchId, {
        bookingId: booking.id,
        spaceId,
        companyUserId,
        startTime: startTime.toISOString(),
        endTime: endTime?.toISOString(),
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
    });

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
    });

    appLogger.info('CompassBooking', `Released: ${bookingId}`, { companyUserId });

    emitBookingEvent('space:released', booking.branchId, {
        bookingId,
        spaceId: booking.spaceId,
        companyUserId,
    });

    return updated;
};

// ─── Cancel ──────────────────────────────────────────

export const cancel = async (bookingId: string, companyUserId: string, companyId: string) => {
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

    const updated = await repo.updateBookingStatus(bookingId, 'CANCELLED');

    appLogger.info('CompassBooking', `Cancelled: ${bookingId}`, { companyUserId });

    emitBookingEvent('space:released', booking.branchId, {
        bookingId,
        spaceId: booking.spaceId,
        companyUserId,
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

    // Check for conflicts in the extended window
    const conflicts = await repo.findActiveBySpace(
        booking.spaceId,
        booking.endTime,
        newEndTime,
        bookingId,
    );
    if (conflicts.length > 0) {
        throw conflict('SPACE_ALREADY_BOOKED');
    }

    const updated = await repo.updateBookingStatus(bookingId, booking.status, {
        endTime: newEndTime,
    });

    appLogger.info('CompassBooking', `Extended: ${bookingId}`, {
        companyUserId,
        newEndTime: newEndTime.toISOString(),
    });

    return updated;
};

// ─── List User Bookings ──────────────────────────────

export const listUserBookings = async (
    companyUserId: string,
    companyId: string,
    status?: string,
) => {
    const statusFilter = status
        ? (status.split(',') as any[])
        : undefined;

    return repo.findByUser(companyUserId, companyId, statusFilter);
};

// ─── Auto-Release Job Logic ──────────────────────────

export const processAutoRelease = async () => {
    const now = new Date();
    const expired = await repo.findExpiredBookings(now);

    let count = 0;
    for (const booking of expired) {
        await repo.updateBookingStatus(booking.id, 'AUTO_RELEASED', {
            autoReleased: true,
            releasedAt: now,
        });
        count++;
    }

    if (count > 0) {
        appLogger.info('CompassBooking', `Auto-released ${count} expired bookings`);
    }

    return count;
};

// ─── No-Show Detection Job Logic ─────────────────────

export const processNoShows = async () => {
    const now = new Date();
    // Default check-in window: 15 minutes
    const defaultWindow = ruleEngine.getDefaults().checkInWindowMinutes;
    const cutoff = new Date(now.getTime() - defaultWindow * 60 * 1000);

    const candidates = await repo.findNoShowBookings(cutoff);

    let count = 0;
    for (const booking of candidates) {
        // Resolve per-branch rules for accurate check-in window
        const rules = await ruleEngine.resolveRules(
            booking.companyId,
            booking.branchId,
        );

        const deadline = new Date(
            booking.startTime.getTime() + rules.checkInWindowMinutes * 60 * 1000,
        );

        if (now > deadline && rules.autoReleaseOnNoShow) {
            await repo.updateBookingStatus(booking.id, 'NO_SHOW', {
                autoReleased: true,
                releasedAt: now,
            });
            count++;
        }
    }

    if (count > 0) {
        appLogger.info('CompassBooking', `Marked ${count} bookings as no-show`);
    }

    return count;
};
