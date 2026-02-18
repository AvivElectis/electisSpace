import { prisma } from '../../config/index.js';
import type { CreateRoomDTO, UpdateRoomDTO, ToggleMeetingDTO } from './types.js';

// ============================================================================
// Conference Repository - Database operations
// ============================================================================

export const conferenceRepository = {
    /**
     * List rooms by store IDs with optional filter
     */
    async list(storeIds: string[] | undefined, filterStoreId?: string) {
        const where: any = {};
        if (filterStoreId) {
            where.storeId = filterStoreId;
        } else if (storeIds) {
            where.storeId = { in: storeIds };
        }

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
    async getByIdWithAccess(roomId: string, storeIds: string[] | undefined) {
        const where: any = { id: roomId };
        if (storeIds) where.storeId = { in: storeIds };
        return prisma.conferenceRoom.findFirst({
            where,
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
                hasMeeting: data.hasMeeting ?? false,
                meetingName: data.hasMeeting ? (data.meetingName || null) : null,
                startTime: data.hasMeeting ? (data.startTime || null) : null,
                endTime: data.hasMeeting ? (data.endTime || null) : null,
                participants: data.hasMeeting ? (data.participants || []) : [],
                syncStatus: 'PENDING',
            },
        });
    },

    /**
     * Update a conference room
     */
    async update(roomId: string, data: UpdateRoomDTO) {
        // Build update payload, handling meeting fields explicitly
        const updateData: Record<string, unknown> = { syncStatus: 'PENDING' };
        if (data.roomName !== undefined) updateData.roomName = data.roomName;
        if (data.labelCode !== undefined) updateData.labelCode = data.labelCode;
        if (data.hasMeeting !== undefined) {
            updateData.hasMeeting = data.hasMeeting;
            updateData.meetingName = data.hasMeeting ? (data.meetingName || null) : null;
            updateData.startTime = data.hasMeeting ? (data.startTime || null) : null;
            updateData.endTime = data.hasMeeting ? (data.endTime || null) : null;
            updateData.participants = data.hasMeeting ? (data.participants || []) : [];
        }
        return prisma.conferenceRoom.update({
            where: { id: roomId },
            data: updateData,
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
