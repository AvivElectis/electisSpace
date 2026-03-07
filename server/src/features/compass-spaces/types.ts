import { z } from 'zod';

export const spacesQuerySchema = z.object({
    buildingId: z.string().uuid().optional(),
    floorId: z.string().uuid().optional(),
    areaId: z.string().uuid().optional(),
    neighborhoodId: z.string().uuid().optional(),
    spaceType: z.enum([
        'DESK', 'MEETING_ROOM', 'PHONE_BOOTH',
        'COLLABORATION_ZONE', 'PARKING', 'LOCKER', 'EVENT_SPACE',
    ]).optional(),
    amenities: z.string().optional(), // comma-separated
    minCapacity: z.coerce.number().int().min(1).optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    sort: z.enum(['sortOrder', 'nearFriends']).optional(),
});

export const updateSpaceModeSchema = z.object({
    mode: z.enum(['AVAILABLE', 'EXCLUDED', 'PERMANENT', 'MAINTENANCE']),
    permanentAssigneeId: z.string().uuid().nullable().optional(),
});
