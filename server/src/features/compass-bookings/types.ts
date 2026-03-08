import { z } from 'zod';

// ─── Booking Request Schemas ─────────────────────────

export const createBookingSchema = z.object({
    spaceId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    notes: z.string().max(500).optional(),
    recurrenceRule: z.string().max(255).optional(),
});

export const adminCreateBookingSchema = z.object({
    companyUserId: z.string().uuid(),
    branchId: z.string().uuid(),
    spaceId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime().nullable().optional(),
    notes: z.string().max(500).optional(),
    recurrenceRule: z.string().max(255).optional(),
});

export const extendBookingSchema = z.object({
    endTime: z.string().datetime(),
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
    config: z.record(z.unknown()),
    applyTo: z.enum(['ALL_BRANCHES', 'SELECTED_BRANCHES']).optional(),
    targetBranchIds: z.array(z.string()).optional(),
    targetSpaceTypes: z.array(z.string()).optional(),
    priority: z.number().int().min(0).max(100).optional(),
});

export const updateBookingRuleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    config: z.record(z.unknown()).optional(),
    isActive: z.boolean().optional(),
    applyTo: z.enum(['ALL_BRANCHES', 'SELECTED_BRANCHES']).optional(),
    targetBranchIds: z.array(z.string()).optional(),
    targetSpaceTypes: z.array(z.string()).optional(),
    priority: z.number().int().min(0).max(100).optional(),
});

// ─── Query Schemas ───────────────────────────────────

export const bookingQuerySchema = z.object({
    status: z.string().optional(), // comma-separated: BOOKED,CHECKED_IN
});
