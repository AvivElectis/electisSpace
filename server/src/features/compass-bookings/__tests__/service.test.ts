/**
 * Compass Bookings Service - Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma (hoisted to avoid TDZ issues)
const { mockPrismaSpace, mockPrismaBooking, mockTransaction } = vi.hoisted(() => ({
    mockPrismaSpace: { findUnique: vi.fn() },
    mockPrismaBooking: { findMany: vi.fn(), create: vi.fn() },
    mockTransaction: vi.fn(),
}));

vi.mock('../../../config/index.js', () => ({
    prisma: {
        space: mockPrismaSpace,
        booking: mockPrismaBooking,
        $transaction: (...args: any[]) => mockTransaction(...args),
    },
}));

// Mock repository
vi.mock('../repository.js', () => ({
    createBooking: vi.fn(),
    findBookingById: vi.fn(),
    updateBookingStatus: vi.fn(),
    findByUser: vi.fn(),
    findExpiredBookings: vi.fn(),
    findNoShowBookings: vi.fn(),
}));

// Mock rule engine
vi.mock('../ruleEngine.js', () => ({
    resolveRules: vi.fn(),
    getDefaults: vi.fn(() => ({
        maxBookingDurationMinutes: 600,
        minBookingDurationMinutes: 30,
        checkInWindowMinutes: 15,
        advanceBookingDays: 7,
        maxConcurrentBookings: 1,
        autoReleaseOnNoShow: true,
        bookingGranularityMinutes: 30,
    })),
}));

// Mock logger
vi.mock('../../../shared/infrastructure/services/appLogger.js', () => ({
    appLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock socket
vi.mock('../../../shared/infrastructure/services/compassSocket.js', () => ({
    emitBookingEvent: vi.fn(),
}));

// Mock middleware error factories
vi.mock('../../../shared/middleware/index.js', () => {
    class AppError extends Error {
        statusCode: number;
        details?: unknown;
        constructor(message: string, statusCode: number, details?: unknown) {
            super(message);
            this.statusCode = statusCode;
            this.details = details;
        }
    }
    return {
        badRequest: (msg: string, details?: unknown) => new AppError(msg, 400, details),
        notFound: (msg: string) => new AppError(msg, 404),
        conflict: (msg: string) => new AppError(msg, 409),
        forbidden: (msg: string) => new AppError(msg, 403),
    };
});

import * as repo from '../repository.js';
import * as ruleEngine from '../ruleEngine.js';
import * as service from '../service.js';

const mockRepo = repo as unknown as {
    createBooking: ReturnType<typeof vi.fn>;
    findBookingById: ReturnType<typeof vi.fn>;
    updateBookingStatus: ReturnType<typeof vi.fn>;
    findByUser: ReturnType<typeof vi.fn>;
    findExpiredBookings: ReturnType<typeof vi.fn>;
    findNoShowBookings: ReturnType<typeof vi.fn>;
};

const mockRuleEngine = ruleEngine as {
    resolveRules: ReturnType<typeof vi.fn>;
    getDefaults: ReturnType<typeof vi.fn>;
};

// ─── Test Data ──────────────────────────────────────

const defaultRules = {
    maxBookingDurationMinutes: 600,
    minBookingDurationMinutes: 30,
    checkInWindowMinutes: 15,
    advanceBookingDays: 7,
    maxConcurrentBookings: 1,
    autoReleaseOnNoShow: true,
    bookingGranularityMinutes: 30,
};

const baseParams = {
    companyUserId: 'user-1',
    companyId: 'company-1',
    branchId: 'branch-1',
    spaceId: 'space-1',
    startTime: new Date('2026-03-05T09:00:00Z'),
    endTime: new Date('2026-03-05T10:00:00Z'),
};

const mockBookingBooked = {
    id: 'booking-1',
    companyUserId: 'user-1',
    spaceId: 'space-1',
    branchId: 'branch-1',
    companyId: 'company-1',
    status: 'BOOKED',
    startTime: new Date('2026-03-05T09:00:00Z'),
    endTime: new Date('2026-03-05T10:00:00Z'),
};

const mockBookingCheckedIn = {
    ...mockBookingBooked,
    status: 'CHECKED_IN',
    checkedInAt: new Date('2026-03-05T09:02:00Z'),
};

// ─── createBooking ──────────────────────────────────

describe('createBooking', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRuleEngine.resolveRules.mockResolvedValue(defaultRules);
        // Default: space exists and belongs to branch
        mockPrismaSpace.findUnique.mockResolvedValue({ storeId: 'branch-1' });
        // Default: transaction executes the callback
        mockTransaction.mockImplementation(async (cb: any) => cb({
            booking: {
                count: vi.fn().mockResolvedValue(0),
                findMany: vi.fn().mockResolvedValue([]),
                create: vi.fn().mockResolvedValue({ id: 'booking-new', ...baseParams }),
            },
        }));
    });

    it('should create a booking successfully', async () => {
        const result = await service.createBooking(baseParams);

        expect((result as any).id).toBe('booking-new');
        expect(mockRuleEngine.resolveRules).toHaveBeenCalledWith('company-1', 'branch-1');
    });

    it('should throw when endTime is null', async () => {
        const params = {
            ...baseParams,
            endTime: null as Date | null,
        };

        await expect(service.createBooking(params))
            .rejects.toThrow('End time is required');
    });

    it('should throw when space does not belong to branch', async () => {
        mockPrismaSpace.findUnique.mockResolvedValue({ storeId: 'other-branch' });

        await expect(service.createBooking(baseParams))
            .rejects.toThrow('Space does not belong to your branch');
    });

    it('should throw BOOKING_TOO_SHORT when duration is below minimum', async () => {
        const params = {
            ...baseParams,
            startTime: new Date('2026-03-05T09:00:00Z'),
            endTime: new Date('2026-03-05T09:15:00Z'), // 15 min < 30 min minimum
        };

        await expect(service.createBooking(params))
            .rejects.toThrow('BOOKING_TOO_SHORT');
    });

    it('should throw BOOKING_TOO_LONG when duration exceeds maximum', async () => {
        const params = {
            ...baseParams,
            startTime: new Date('2026-03-05T09:00:00Z'),
            endTime: new Date('2026-03-05T20:30:00Z'), // 11.5 hours > 10 hours max
        };

        await expect(service.createBooking(params))
            .rejects.toThrow('BOOKING_TOO_LONG');
    });

    it('should throw BOOKING_TOO_FAR_AHEAD when exceeding advance booking days', async () => {
        const futureStart = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days ahead
        const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000);

        const params = {
            ...baseParams,
            startTime: futureStart,
            endTime: futureEnd,
        };

        await expect(service.createBooking(params))
            .rejects.toThrow('BOOKING_TOO_FAR_AHEAD');
    });

    it('should throw MAX_CONCURRENT_BOOKINGS_EXCEEDED when at limit', async () => {
        mockTransaction.mockImplementation(async (cb: any) => cb({
            booking: {
                count: vi.fn().mockResolvedValue(1), // max is 1
                findMany: vi.fn().mockResolvedValue([]),
                create: vi.fn(),
            },
        }));

        await expect(service.createBooking(baseParams))
            .rejects.toThrow('MAX_CONCURRENT_BOOKINGS_EXCEEDED');
    });

    it('should throw SPACE_ALREADY_BOOKED on conflict', async () => {
        mockTransaction.mockImplementation(async (cb: any) => cb({
            booking: {
                count: vi.fn().mockResolvedValue(0),
                findMany: vi.fn().mockResolvedValue([{ id: 'existing-booking' }]),
                create: vi.fn(),
            },
        }));

        await expect(service.createBooking(baseParams))
            .rejects.toThrow('SPACE_ALREADY_BOOKED');
    });
});

// ─── checkIn ────────────────────────────────────────

describe('checkIn', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRuleEngine.resolveRules.mockResolvedValue(defaultRules);
    });

    it('should throw notFound when booking does not exist', async () => {
        mockRepo.findBookingById.mockResolvedValue(null);

        await expect(service.checkIn('booking-1', 'user-1', 'company-1'))
            .rejects.toThrow('Booking not found');
    });

    it('should throw forbidden when booking belongs to another user', async () => {
        mockRepo.findBookingById.mockResolvedValue({
            ...mockBookingBooked,
            companyUserId: 'other-user',
        });

        await expect(service.checkIn('booking-1', 'user-1', 'company-1'))
            .rejects.toThrow('Not your booking');
    });

    it('should throw INVALID_BOOKING_STATUS when not in BOOKED status', async () => {
        mockRepo.findBookingById.mockResolvedValue(mockBookingCheckedIn);

        await expect(service.checkIn('booking-1', 'user-1', 'company-1'))
            .rejects.toThrow('INVALID_BOOKING_STATUS');
    });

    it('should throw CHECK_IN_TOO_EARLY when before start time', async () => {
        const futureBooking = {
            ...mockBookingBooked,
            startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        };
        mockRepo.findBookingById.mockResolvedValue(futureBooking);

        await expect(service.checkIn('booking-1', 'user-1', 'company-1'))
            .rejects.toThrow('CHECK_IN_TOO_EARLY');
    });

    it('should throw CHECK_IN_WINDOW_EXPIRED when past the window', async () => {
        const pastBooking = {
            ...mockBookingBooked,
            startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago (window is 15 min)
        };
        mockRepo.findBookingById.mockResolvedValue(pastBooking);

        await expect(service.checkIn('booking-1', 'user-1', 'company-1'))
            .rejects.toThrow('CHECK_IN_WINDOW_EXPIRED');
    });

    it('should check in successfully within the window', async () => {
        const recentBooking = {
            ...mockBookingBooked,
            startTime: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago (within 15 min window)
        };
        mockRepo.findBookingById.mockResolvedValue(recentBooking);
        mockRepo.updateBookingStatus.mockResolvedValue({
            ...recentBooking,
            status: 'CHECKED_IN',
        });

        const result = await service.checkIn('booking-1', 'user-1', 'company-1');

        expect(result.status).toBe('CHECKED_IN');
        expect(mockRepo.updateBookingStatus).toHaveBeenCalledWith(
            'booking-1',
            'CHECKED_IN',
            { checkedInAt: expect.any(Date) },
        );
    });
});

// ─── release ────────────────────────────────────────

describe('release', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should throw notFound when booking does not exist', async () => {
        mockRepo.findBookingById.mockResolvedValue(null);

        await expect(service.release('booking-1', 'user-1', 'company-1'))
            .rejects.toThrow('Booking not found');
    });

    it('should throw forbidden when not the booking owner', async () => {
        mockRepo.findBookingById.mockResolvedValue({
            ...mockBookingCheckedIn,
            companyUserId: 'other-user',
        });

        await expect(service.release('booking-1', 'user-1', 'company-1'))
            .rejects.toThrow('Not your booking');
    });

    it('should throw INVALID_BOOKING_STATUS when not CHECKED_IN', async () => {
        mockRepo.findBookingById.mockResolvedValue(mockBookingBooked);

        await expect(service.release('booking-1', 'user-1', 'company-1'))
            .rejects.toThrow('INVALID_BOOKING_STATUS');
    });

    it('should release successfully', async () => {
        mockRepo.findBookingById.mockResolvedValue(mockBookingCheckedIn);
        mockRepo.updateBookingStatus.mockResolvedValue({
            ...mockBookingCheckedIn,
            status: 'RELEASED',
        });

        const result = await service.release('booking-1', 'user-1', 'company-1');

        expect(result.status).toBe('RELEASED');
        expect(mockRepo.updateBookingStatus).toHaveBeenCalledWith(
            'booking-1',
            'RELEASED',
            { releasedAt: expect.any(Date) },
        );
    });
});

// ─── cancel ─────────────────────────────────────────

describe('cancel', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should throw notFound when booking does not exist', async () => {
        mockRepo.findBookingById.mockResolvedValue(null);

        await expect(service.cancel('booking-1', 'user-1', 'company-1'))
            .rejects.toThrow('Booking not found');
    });

    it('should throw forbidden when not the owner', async () => {
        mockRepo.findBookingById.mockResolvedValue({
            ...mockBookingBooked,
            companyUserId: 'other-user',
        });

        await expect(service.cancel('booking-1', 'user-1', 'company-1'))
            .rejects.toThrow('Not your booking');
    });

    it('should throw INVALID_BOOKING_STATUS when already checked in', async () => {
        mockRepo.findBookingById.mockResolvedValue(mockBookingCheckedIn);

        await expect(service.cancel('booking-1', 'user-1', 'company-1'))
            .rejects.toThrow('INVALID_BOOKING_STATUS');
    });

    it('should cancel successfully', async () => {
        mockRepo.findBookingById.mockResolvedValue(mockBookingBooked);
        mockRepo.updateBookingStatus.mockResolvedValue({
            ...mockBookingBooked,
            status: 'CANCELLED',
        });

        const result = await service.cancel('booking-1', 'user-1', 'company-1');

        expect((result as any).status).toBe('CANCELLED');
        expect(mockRepo.updateBookingStatus).toHaveBeenCalledWith('booking-1', 'CANCELLED');
    });
});

// ─── extend ─────────────────────────────────────────

describe('extend', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRuleEngine.resolveRules.mockResolvedValue(defaultRules);
    });

    it('should throw notFound when booking does not exist', async () => {
        mockRepo.findBookingById.mockResolvedValue(null);

        await expect(
            service.extend('booking-1', 'user-1', 'company-1', new Date('2026-03-05T11:00:00Z')),
        ).rejects.toThrow('Booking not found');
    });

    it('should throw when new end time is before current end time', async () => {
        mockRepo.findBookingById.mockResolvedValue(mockBookingBooked);

        await expect(
            service.extend('booking-1', 'user-1', 'company-1', new Date('2026-03-05T09:30:00Z')),
        ).rejects.toThrow('New end time must be after current end time');
    });

    it('should throw BOOKING_TOO_LONG when extended duration exceeds max', async () => {
        mockRepo.findBookingById.mockResolvedValue(mockBookingBooked);

        const tooLong = new Date('2026-03-05T20:00:00Z'); // 11 hours from start

        await expect(
            service.extend('booking-1', 'user-1', 'company-1', tooLong),
        ).rejects.toThrow('BOOKING_TOO_LONG');
    });

    it('should throw SPACE_ALREADY_BOOKED on conflict in extended window', async () => {
        mockRepo.findBookingById.mockResolvedValue(mockBookingBooked);
        mockTransaction.mockImplementation(async (fn: (tx: any) => any) => {
            return fn({
                booking: {
                    findMany: vi.fn().mockResolvedValue([{ id: 'conflict-booking' }]),
                    update: vi.fn(),
                },
            });
        });

        await expect(
            service.extend('booking-1', 'user-1', 'company-1', new Date('2026-03-05T11:00:00Z')),
        ).rejects.toThrow('SPACE_ALREADY_BOOKED');
    });

    it('should extend successfully', async () => {
        mockRepo.findBookingById.mockResolvedValue(mockBookingBooked);
        const newEnd = new Date('2026-03-05T11:00:00Z');
        const extendedBooking = { ...mockBookingBooked, endTime: newEnd };
        mockTransaction.mockImplementation(async (fn: (tx: any) => any) => {
            return fn({
                booking: {
                    findMany: vi.fn().mockResolvedValue([]),
                    update: vi.fn().mockResolvedValue(extendedBooking),
                },
            });
        });

        const result = await service.extend('booking-1', 'user-1', 'company-1', newEnd);

        expect(result.endTime).toEqual(newEnd);
    });
});

// ─── listUserBookings ───────────────────────────────

describe('listUserBookings', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should list bookings without status filter', async () => {
        mockRepo.findByUser.mockResolvedValue([mockBookingBooked]);

        const result = await service.listUserBookings('user-1', 'company-1');

        expect(result).toHaveLength(1);
        expect(mockRepo.findByUser).toHaveBeenCalledWith('user-1', 'company-1', undefined);
    });

    it('should split comma-separated status filter', async () => {
        mockRepo.findByUser.mockResolvedValue([]);

        await service.listUserBookings('user-1', 'company-1', 'BOOKED,CHECKED_IN');

        expect(mockRepo.findByUser).toHaveBeenCalledWith(
            'user-1',
            'company-1',
            ['BOOKED', 'CHECKED_IN'],
        );
    });
});

// ─── processAutoRelease ─────────────────────────────

describe('processAutoRelease', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return 0 when no expired bookings', async () => {
        mockRepo.findExpiredBookings.mockResolvedValue([]);

        const count = await service.processAutoRelease();

        expect(count).toBe(0);
    });

    it('should auto-release expired bookings', async () => {
        mockRepo.findExpiredBookings.mockResolvedValue([
            { id: 'b1', branchId: 'branch-1', spaceId: 'space-1' },
            { id: 'b2', branchId: 'branch-1', spaceId: 'space-2' },
        ]);
        mockRepo.updateBookingStatus.mockResolvedValue({});

        const count = await service.processAutoRelease();

        expect(count).toBe(2);
        expect(mockRepo.updateBookingStatus).toHaveBeenCalledTimes(2);
        expect(mockRepo.updateBookingStatus).toHaveBeenCalledWith('b1', 'AUTO_RELEASED', {
            autoReleased: true,
            releasedAt: expect.any(Date),
        });
    });
});

// ─── processNoShows ─────────────────────────────────

describe('processNoShows', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRuleEngine.resolveRules.mockResolvedValue(defaultRules);
    });

    it('should return 0 when no no-show candidates', async () => {
        mockRepo.findNoShowBookings.mockResolvedValue([]);

        const count = await service.processNoShows();

        expect(count).toBe(0);
    });

    it('should mark no-shows when past deadline and autoRelease enabled', async () => {
        const pastStart = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
        mockRepo.findNoShowBookings.mockResolvedValue([
            {
                id: 'b1',
                companyId: 'company-1',
                branchId: 'branch-1',
                spaceId: 'space-1',
                startTime: pastStart,
            },
        ]);
        mockRepo.updateBookingStatus.mockResolvedValue({});

        const count = await service.processNoShows();

        expect(count).toBe(1);
        expect(mockRepo.updateBookingStatus).toHaveBeenCalledWith('b1', 'NO_SHOW', {
            autoReleased: true,
            releasedAt: expect.any(Date),
        });
    });

    it('should skip no-shows when autoReleaseOnNoShow is false', async () => {
        mockRuleEngine.resolveRules.mockResolvedValue({
            ...defaultRules,
            autoReleaseOnNoShow: false,
        });

        const pastStart = new Date(Date.now() - 30 * 60 * 1000);
        mockRepo.findNoShowBookings.mockResolvedValue([
            {
                id: 'b1',
                companyId: 'company-1',
                branchId: 'branch-1',
                spaceId: 'space-1',
                startTime: pastStart,
            },
        ]);

        const count = await service.processNoShows();

        expect(count).toBe(0);
        expect(mockRepo.updateBookingStatus).not.toHaveBeenCalled();
    });
});
