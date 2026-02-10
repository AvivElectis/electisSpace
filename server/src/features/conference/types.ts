import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

export const createRoomSchema = z.object({
    storeId: z.string().uuid(),
    externalId: z.string().min(1, 'External ID is required').max(50),
    roomName: z.string().min(1, 'Room name is required').max(100),
    labelCode: z.string().max(50).optional(),
    hasMeeting: z.boolean().optional(),
    meetingName: z.string().max(255).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    participants: z.array(z.string()).optional(),
});

export const updateRoomSchema = z.object({
    roomName: z.string().max(100).optional(),
    labelCode: z.string().max(50).optional().nullable(),
    hasMeeting: z.boolean().optional(),
    meetingName: z.string().max(255).optional().nullable(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    participants: z.array(z.string()).optional(),
});

export const toggleMeetingSchema = z.object({
    meetingName: z.string().max(255).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    participants: z.array(z.string()).optional(),
});

// ============================================================================
// DTOs
// ============================================================================

export type CreateRoomDTO = z.infer<typeof createRoomSchema>;
export type UpdateRoomDTO = z.infer<typeof updateRoomSchema>;
export type ToggleMeetingDTO = z.infer<typeof toggleMeetingSchema>;

// ============================================================================
// Interfaces
// ============================================================================

export interface ConferenceUserContext {
    userId: string;
    storeIds: string[];
}

export interface ConferenceRoomStats {
    total: number;
    withLabels: number;
    withMeetings: number;
    available: number;
}

export interface ListRoomsFilters {
    storeId?: string;
}
