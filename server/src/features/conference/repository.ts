import { prisma } from '../../config/index.js';
import type { CreateRoomDTO, UpdateRoomDTO, ToggleMeetingDTO } from './types.js';

// ============================================================================
// Conference Repository - Database operations
// ============================================================================

export const conferenceRepository = {
    /**
     * List rooms by store IDs with optional filter
     */
    async list(storeIds: string[], filterStoreId?: string) {
        const where: { storeId: string | { in: string[] } } = filterStoreId
            ? { storeId: filterStoreId }
            : { storeId: { in: storeIds } };

        return prisma.conferenceRoom.findMany({
            where,
            orderBy: { externalId: 'asc' },
            include: {
                store: {
                    select: { name: true, code: true },
                },
            },
        });
    },

    /**
     * Get a room by ID within accessible stores
     */
    async getByIdWithAccess(roomId: string, storeIds: string[]) {
        return prisma.conferenceRoom.findFirst({
            where: {
                id: roomId,
                storeId: { in: storeIds },
            },
            include: {
                store: {
                    select: { name: true, code: true },
                },
            },
        });
    },

    /**
     * Find existing room by external ID within a store
     */
    async findByExternalId(storeId: string, externalId: string) {
        return prisma.conferenceRoom.findFirst({
            where: {
                storeId,
                externalId,
            },
        });
    },

    /**
     * Create a new conference room
     */
    async create(data: CreateRoomDTO) {
        return prisma.conferenceRoom.create({
            data: {
                storeId: data.storeId,
                externalId: data.externalId,
                roomName: data.roomName,
                labelCode: data.labelCode,
                syncStatus: 'PENDING',
            },
        });
    },

    /**
     * Update a conference room
     */
    async update(roomId: string, data: UpdateRoomDTO) {
        return prisma.conferenceRoom.update({
            where: { id: roomId },
            data: {
                ...data,
                syncStatus: 'PENDING',
            },
        });
    },

    /**
     * Delete a conference room
     */
    async delete(roomId: string) {
        return prisma.conferenceRoom.delete({
            where: { id: roomId },
        });
    },

    /**
     * Toggle meeting status
     */
    async toggleMeeting(roomId: string, hasMeeting: boolean, meetingData?: ToggleMeetingDTO) {
        return prisma.conferenceRoom.update({
            where: { id: roomId },
            data: {
                hasMeeting,
                meetingName: hasMeeting ? meetingData?.meetingName || null : null,
                startTime: hasMeeting ? meetingData?.startTime || null : null,
                endTime: hasMeeting ? meetingData?.endTime || null : null,
                participants: hasMeeting ? meetingData?.participants || [] : [],
                syncStatus: 'PENDING',
            },
        });
    },
};
