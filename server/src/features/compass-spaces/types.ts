import { z } from 'zod';

export const spacesQuerySchema = z.object({
    buildingId: z.string().uuid().optional(),
    floorId: z.string().uuid().optional(),
    areaId: z.string().uuid().optional(),
    amenities: z.string().optional(), // comma-separated
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    sort: z.enum(['sortOrder', 'nearFriends']).optional(),
});

export const updateSpaceModeSchema = z.object({
    mode: z.enum(['AVAILABLE', 'EXCLUDED', 'PERMANENT', 'MAINTENANCE']),
    permanentAssigneeId: z.string().uuid().nullable().optional(),
});
