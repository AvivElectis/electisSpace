import { prisma } from '../../config/index.js';
import { notFound, badRequest } from '../../shared/middleware/index.js';
import type { BookingStatus } from '@prisma/client';

// ─── Booking Queries ─────────────────────────────────

export const findBookingById = async (id: string, companyId: string) => {
    return prisma.booking.findFirst({
        where: { id, companyId },
        include: {
            space: { select: { id: true, externalId: true, data: true, buildingId: true, floorId: true } },
            companyUser: { select: { id: true, displayName: true, email: true } },
        },
    });
};

export const findByUser = async (
    companyUserId: string,
    companyId: string,
    statusFilter?: BookingStatus[],
) => {
    return prisma.booking.findMany({
        where: {
            companyUserId,
            companyId,
            ...(statusFilter ? { status: { in: statusFilter } } : {}),
        },
        include: {
            space: {
                select: {
                    id: true, externalId: true, data: true, buildingId: true, floorId: true,
                    compassAmenities: true, compassMode: true,
                },
            },
        },
        orderBy: { startTime: 'asc' },
    });
};

export const findByCompany = async (
    companyId: string,
    statusFilter?: string,
) => {
    return prisma.booking.findMany({
        where: {
            companyId,
            ...(statusFilter ? { status: statusFilter as BookingStatus } : {}),
        },
        include: {
            space: { select: { id: true, externalId: true, data: true } },
            companyUser: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: { startTime: 'desc' },
        take: 200,
    });
};

export const createBooking = async (data: {
    companyUserId: string;
    spaceId: string;
    branchId: string;
    companyId: string;
    startTime: Date;
    endTime: Date | null;
    bookedBy?: string;
    notes?: string;
}) => {
    return prisma.booking.create({
        data: {
            companyUserId: data.companyUserId,
            spaceId: data.spaceId,
            branchId: data.branchId,
            companyId: data.companyId,
            startTime: data.startTime,
            endTime: data.endTime,
            bookedBy: data.bookedBy ?? null,
            notes: data.notes ?? null,
        },
        include: {
            space: { select: { id: true, externalId: true, data: true, buildingId: true, floorId: true } },
            companyUser: { select: { id: true, displayName: true, email: true } },
        },
    });
};

export const updateBookingStatus = async (
    id: string,
    status: BookingStatus,
    extra?: Partial<{
        checkedInAt: Date;
        releasedAt: Date;
        autoReleased: boolean;
        endTime: Date;
    }>,
) => {
    return prisma.booking.update({
        where: { id },
        data: { status, ...extra },
        include: {
            space: { select: { id: true, externalId: true, data: true, buildingId: true, floorId: true } },
            companyUser: { select: { id: true, displayName: true, email: true } },
        },
    });
};

export const updateBooking = async (
    id: string,
    data: Partial<{
        startTime: Date;
        endTime: Date | null;
        notes: string | null;
    }>,
) => {
    return prisma.booking.update({
        where: { id },
        data,
        include: {
            space: { select: { id: true, externalId: true, data: true, buildingId: true, floorId: true } },
            companyUser: { select: { id: true, displayName: true, email: true } },
        },
    });
};

// ─── Auto-Release & No-Show Queries ──────────────────

export const findExpiredBookings = async (cutoff: Date) => {
    return prisma.booking.findMany({
        where: {
            status: { in: ['BOOKED', 'CHECKED_IN'] },
            endTime: { not: null, lt: cutoff },
        },
    });
};

export const findNoShowBookings = async (cutoff: Date) => {
    // Find BOOKED bookings where startTime + checkInWindow < now
    // checkInWindow is resolved per-booking in the job, so we fetch
    // all BOOKED bookings that started before the cutoff
    return prisma.booking.findMany({
        where: {
            status: 'BOOKED',
            startTime: { lt: cutoff },
        },
        include: {
            space: { select: { id: true, storeId: true } },
        },
    });
};

// ─── Booking Rule Queries ────────────────────────────

export const findRulesByCompany = async (companyId: string) => {
    return prisma.bookingRule.findMany({
        where: { companyId, isActive: true },
        orderBy: { priority: 'desc' },
    });
};

export const findRuleById = async (id: string, companyId: string) => {
    return prisma.bookingRule.findFirst({
        where: { id, companyId },
    });
};

export const createRule = async (data: {
    companyId: string;
    name: string;
    ruleType: string;
    config: unknown;
    applyTo?: string;
    targetBranchIds?: string[];
    targetSpaceTypes?: string[];
    priority?: number;
}) => {
    return prisma.bookingRule.create({
        data: {
            companyId: data.companyId,
            name: data.name,
            ruleType: data.ruleType as any,
            config: data.config as any,
            applyTo: (data.applyTo as any) ?? 'ALL_BRANCHES',
            targetBranchIds: data.targetBranchIds ?? [],
            targetSpaceTypes: data.targetSpaceTypes ?? [],
            priority: data.priority ?? 0,
        },
    });
};

export const updateRule = async (id: string, companyId: string, data: Partial<{
    name: string;
    config: unknown;
    isActive: boolean;
    applyTo: string;
    targetBranchIds: string[];
    targetSpaceTypes: string[];
    priority: number;
}>) => {
    // Verify the rule belongs to the company before updating
    const existing = await prisma.bookingRule.findFirst({ where: { id, companyId } });
    if (!existing) throw notFound('Rule not found');
    return prisma.bookingRule.update({
        where: { id },
        data: data as any,
    });
};

export const deleteRule = async (id: string, companyId: string) => {
    // Verify the rule belongs to the company before deleting
    const existing = await prisma.bookingRule.findFirst({ where: { id, companyId } });
    if (!existing) throw notFound('Rule not found');
    return prisma.bookingRule.delete({ where: { id } });
};
