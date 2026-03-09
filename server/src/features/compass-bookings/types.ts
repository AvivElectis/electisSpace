import { z } from 'zod';

// ─── Booking Request Schemas ─────────────────────────

export const createBookingSchema = z.object({
    spaceId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    title: z.string().max(255).optional(),
    notes: z.string().max(500).optional(),
    recurrenceRule: z.string().max(255).optional(),
});

export const adminCreateBookingSchema = z.object({
    companyUserId: z.string().uuid(),
    branchId: z.string().uuid(),
    spaceId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime().nullable().optional(),
    title: z.string().max(255).optional(),
    notes: z.string().max(500).optional(),
    recurrenceRule: z.string().max(255).optional(),
});

export const extendBookingSchema = z.object({
    newEndTime: z.string().datetime(),
});

// ─── Booking Rule Schemas ────────────────────────────

export const createBookingRuleSchema = z.object({
    name: z.string().min(1).max(100),
    ruleType: z.enum([
        'MAX_DURATION',
        'MAX_ADVANCE_BOOKING',
        'MAX_CONCURRENT',
        'CHECK_IN_WINDOW',
        'AUTO_RELEASE',
        'MIN_DURATION',
        'BOOKING_GRANULARITY',
    ]),
    config: z.object({ value: z.unknown() }).passthrough(),
    applyTo: z.enum(['ALL_BRANCHES', 'SELECTED_BRANCHES']).optional(),
    targetBranchIds: z.array(z.string()).optional(),
    targetSpaceTypes: z.array(z.string()).optional(),
    priority: z.number().int().min(0).max(100).optional(),
});

export const updateBookingRuleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    config: z.object({ value: z.unknown() }).passthrough().optional(),
    isActive: z.boolean().optional(),
    applyTo: z.enum(['ALL_BRANCHES', 'SELECTED_BRANCHES']).optional(),
    targetBranchIds: z.array(z.string()).optional(),
    targetSpaceTypes: z.array(z.string()).optional(),
    priority: z.number().int().min(0).max(100).optional(),
});

export const adminUpdateBookingSchema = z.object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
});

export const bulkCancelBookingsSchema = z.object({
    bookingIds: z.array(z.string().uuid()).min(1).max(100),
});

// ─── Query Schemas ───────────────────────────────────

const VALID_BOOKING_STATUSES = ['BOOKED', 'CHECKED_IN', 'RELEASED', 'AUTO_RELEASED', 'NO_SHOW', 'CANCELLED'] as const;

export const bookingQuerySchema = z.object({
    status: z.string().optional().refine(
        (val) => !val || val.split(',').every(s => (VALID_BOOKING_STATUSES as readonly string[]).includes(s.trim())),
        { message: 'Invalid booking status value' },
    ),
});
