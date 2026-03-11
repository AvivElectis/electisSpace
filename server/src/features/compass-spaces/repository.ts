import { prisma } from '../../config/index.js';
import type { CompassSpaceMode, CompassSpaceType, Prisma } from '@prisma/client';

// ─── Space Queries (Compass Context) ─────────────────

export const findCompassSpaces = async (params: {
    branchId: string;
    buildingId?: string;
    floorId?: string;
    areaId?: string;
    neighborhoodId?: string;
    spaceType?: CompassSpaceType;
    amenities?: string[];
    minCapacity?: number;
    compassMode?: CompassSpaceMode;
    includeAllModes?: boolean;
}) => {
    const where: Prisma.SpaceWhereInput = {
        storeId: params.branchId,
        deletedAt: null,
        ...(params.includeAllModes
            ? {}
            : { compassMode: params.compassMode
                ? params.compassMode
                : { in: ['AVAILABLE', 'PERMANENT'] } }),
    };

    if (params.buildingId) where.buildingId = params.buildingId;
    if (params.floorId) where.floorId = params.floorId;
    if (params.areaId) where.areaId = params.areaId;
    if (params.neighborhoodId) where.neighborhoodId = params.neighborhoodId;
    if (params.spaceType) where.compassSpaceType = params.spaceType;
    if (params.amenities?.length) {
        where.structuredAmenities = {
            some: { amenity: { name: { in: params.amenities } } },
        };
    }
    if (params.minCapacity) {
        where.maxCapacity = { gte: params.minCapacity };
    }

    return prisma.space.findMany({
        where,
        select: {
            id: true,
            externalId: true,
            data: true,
            buildingId: true,
            floorId: true,
            areaId: true,
            neighborhoodId: true,
            compassMode: true,
            compassSpaceType: true,
            compassCapacity: true,
            compassAmenities: true,
            minCapacity: true,
            maxCapacity: true,
            permanentAssigneeId: true,
            sortOrder: true,
            mapX: true,
            mapY: true,
            mapRotation: true,
            building: { select: { id: true, name: true } },
            floor: { select: { id: true, name: true, sortOrder: true } },
            area: { select: { id: true, name: true } },
            neighborhood: { select: { id: true, name: true } },
            permanentAssignee: { select: { id: true, displayName: true } },
            structuredAmenities: {
                select: {
                    quantity: true,
                    amenity: { select: { id: true, name: true, nameHe: true, icon: true, category: true } },
                },
            },
        },
        orderBy: { sortOrder: 'asc' },
    });
};

export const findSpaceById = async (spaceId: string) => {
    return prisma.space.findUnique({
        where: { id: spaceId },
        select: {
            id: true,
            externalId: true,
            storeId: true,
            data: true,
            buildingId: true,
            floorId: true,
            areaId: true,
            compassMode: true,
            compassCapacity: true,
            compassAmenities: true,
            permanentAssigneeId: true,
            sortOrder: true,
        },
    });
};

// ─── Space Availability ──────────────────────────────

export const getSpaceAvailability = async (
    spaceIds: string[],
    startTime: Date,
    endTime: Date,
) => {
    // Find all active bookings for these spaces in the time range
    const bookings = await prisma.booking.findMany({
        where: {
            spaceId: { in: spaceIds },
            status: { in: ['BOOKED', 'CHECKED_IN'] },
            startTime: { lt: endTime },
            OR: [
                { endTime: { gt: startTime } },
                { endTime: null },
            ],
        },
        select: {
            spaceId: true,
            status: true,
            startTime: true,
            endTime: true,
            companyUser: { select: { id: true, displayName: true } },
        },
    });

    // Group by space
    const bookingsBySpace = new Map<string, typeof bookings>();
    for (const booking of bookings) {
        const existing = bookingsBySpace.get(booking.spaceId) ?? [];
        existing.push(booking);
        bookingsBySpace.set(booking.spaceId, existing);
    }

    return bookingsBySpace;
};

// ─── Admin: Update Compass Mode ──────────────────────

export const updateCompassMode = async (
    spaceId: string,
    mode: CompassSpaceMode,
    permanentAssigneeId?: string | null,
) => {
    return prisma.space.update({
        where: { id: spaceId },
        data: {
            compassMode: mode,
            ...(permanentAssigneeId !== undefined
                ? { permanentAssigneeId }
                : {}),
        },
    });
};

// ─── Admin: Update Compass Properties ────────────────

export const updateCompassProperties = async (
    spaceId: string,
    data: {
        compassSpaceType?: string | null;
        compassCapacity?: number | null;
        minCapacity?: number | null;
        maxCapacity?: number | null;
        buildingId?: string | null;
        floorId?: string | null;
        areaId?: string | null;
        neighborhoodId?: string | null;
        permanentAssigneeId?: string | null;
        sortOrder?: number;
    },
) => {
    return prisma.space.update({
        where: { id: spaceId },
        data: data as any,
    });
};

// ─── Admin: Sync Space Amenities ────────────────────

export const syncSpaceAmenities = async (
    spaceId: string,
    amenityIds: string[],
) => {
    return prisma.$transaction(async (tx) => {
        await tx.spaceAmenity.deleteMany({ where: { spaceId } });
        if (amenityIds.length > 0) {
            await tx.spaceAmenity.createMany({
                data: amenityIds.map((amenityId) => ({ spaceId, amenityId })),
            });
        }
    });
};

// ─── Buildings / Floors / Areas ──────────────────────

export const findBuildings = async (companyId: string) => {
    return prisma.building.findMany({
        where: { companyId, isActive: true },
        include: {
            floors: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
                include: {
                    areas: {
                        where: { isActive: true },
                        orderBy: { name: 'asc' },
                    },
                },
            },
        },
        orderBy: { name: 'asc' },
    });
};
