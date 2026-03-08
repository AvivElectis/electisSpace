import { notFound, badRequest } from '../../shared/middleware/index.js';
import * as repo from './repository.js';
import type { CompassSpaceMode, CompassSpaceType } from '@prisma/client';

// ─── List Compass Spaces with Availability ───────────

export const listSpaces = async (params: {
    branchId: string;
    buildingId?: string;
    floorId?: string;
    areaId?: string;
    neighborhoodId?: string;
    spaceType?: CompassSpaceType;
    amenities?: string[];
    minCapacity?: number;
    startTime?: Date;
    endTime?: Date;
}) => {
    const spaces = await repo.findCompassSpaces({
        branchId: params.branchId,
        buildingId: params.buildingId,
        floorId: params.floorId,
        areaId: params.areaId,
        neighborhoodId: params.neighborhoodId,
        spaceType: params.spaceType,
        amenities: params.amenities,
        minCapacity: params.minCapacity,
    });

    // If time range provided, attach availability info
    if (params.startTime && params.endTime) {
        const spaceIds = spaces.map(s => s.id);
        const bookingsMap = await repo.getSpaceAvailability(
            spaceIds,
            params.startTime,
            params.endTime,
        );

        return spaces.map(space => ({
            ...space,
            isAvailable: !bookingsMap.has(space.id),
            currentBooking: bookingsMap.get(space.id)?.[0] ?? null,
        }));
    }

    return spaces.map(space => ({
        ...space,
        isAvailable: space.compassMode === 'AVAILABLE',
        currentBooking: null,
    }));
};

// ─── List Buildings (hierarchy) ──────────────────────

export const listBuildings = async (companyId: string) => {
    return repo.findBuildings(companyId);
};

// ─── Admin: Update Space Compass Mode ────────────────

export const updateSpaceMode = async (
    spaceId: string,
    mode: CompassSpaceMode,
    permanentAssigneeId?: string | null,
) => {
    const space = await repo.findSpaceById(spaceId);
    if (!space) {
        throw notFound('Space not found');
    }

    if (mode === 'PERMANENT' && !permanentAssigneeId) {
        throw badRequest('Permanent mode requires an assignee');
    }

    return repo.updateCompassMode(
        spaceId,
        mode,
        mode === 'PERMANENT' ? permanentAssigneeId : null,
    );
};

// ─── Admin: Update Space Properties ──────────────────

export const updateSpaceProperties = async (
    spaceId: string,
    data: {
        compassSpaceType?: string | null;
        compassCapacity?: number | null;
        buildingId?: string | null;
        floorId?: string | null;
        areaId?: string | null;
        neighborhoodId?: string | null;
    },
) => {
    const space = await repo.findSpaceById(spaceId);
    if (!space) {
        throw notFound('Space not found');
    }
    return repo.updateCompassProperties(spaceId, data);
};
