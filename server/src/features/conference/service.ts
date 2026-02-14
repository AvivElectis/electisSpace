import { conferenceRepository } from './repository.js';
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';
import type {
    ConferenceUserContext,
    ConferenceRoomStats,
    ListRoomsFilters,
    CreateRoomDTO,
    UpdateRoomDTO,
    ToggleMeetingDTO,
} from './types.js';

// ============================================================================
// Conference Service - Business Logic
// ============================================================================

export const conferenceService = {
    /**
     * List conference rooms for user's accessible stores
     */
    async list(userContext: ConferenceUserContext, filters: ListRoomsFilters) {
        const { storeIds } = userContext;
        const { storeId: filterStoreId } = filters;

        // Validate store access if filtering by specific store
        if (filterStoreId && !storeIds.includes(filterStoreId)) {
            throw 'STORE_ACCESS_DENIED';
        }

        const rooms = await conferenceRepository.list(storeIds, filterStoreId);

        // Calculate stats
        const stats: ConferenceRoomStats = {
            total: rooms.length,
            withLabels: rooms.filter((r) => r.labelCode || (r.assignedLabels && r.assignedLabels.length > 0)).length,
            withMeetings: rooms.filter((r) => r.hasMeeting).length,
            available: rooms.filter((r) => !r.hasMeeting).length,
        };

        return { rooms, stats };
    },

    /**
     * Get a conference room by ID
     */
    async getById(userContext: ConferenceUserContext, roomId: string) {
        const { storeIds } = userContext;
        const room = await conferenceRepository.getByIdWithAccess(roomId, storeIds);

        if (!room) {
            throw 'NOT_FOUND';
        }

        return room;
    },

    /**
     * Create a new conference room
     */
    async create(userContext: ConferenceUserContext, data: CreateRoomDTO) {
        const { storeIds } = userContext;

        // Check user has access to the target store
        if (!storeIds.includes(data.storeId)) {
            throw 'STORE_ACCESS_DENIED';
        }

        // Check external ID uniqueness within store
        const existing = await conferenceRepository.findByExternalId(data.storeId, data.externalId);
        if (existing) {
            throw 'CONFLICT';
        }

        const room = await conferenceRepository.create(data);

        // Queue sync job
        await syncQueueService.queueCreate(data.storeId, 'conference', room.id);

        return room;
    },

    /**
     * Update a conference room
     */
    async update(userContext: ConferenceUserContext, roomId: string, data: UpdateRoomDTO) {
        const { storeIds } = userContext;

        const existing = await conferenceRepository.getByIdWithAccess(roomId, storeIds);
        if (!existing) {
            throw 'NOT_FOUND';
        }

        const room = await conferenceRepository.update(roomId, data);

        // Queue sync job
        await syncQueueService.queueUpdate(existing.storeId, 'conference', room.id, data);

        return room;
    },

    /**
     * Delete a conference room
     */
    async delete(userContext: ConferenceUserContext, roomId: string) {
        const { storeIds } = userContext;

        const existing = await conferenceRepository.getByIdWithAccess(roomId, storeIds);
        if (!existing) {
            throw 'NOT_FOUND';
        }

        // Queue sync job to delete from AIMS first (with 'C' prefix)
        await syncQueueService.queueDelete(existing.storeId, 'conference', existing.id, `C${existing.externalId}`);

        await conferenceRepository.delete(roomId);
    },

    /**
     * Toggle meeting status on a conference room
     */
    async toggleMeeting(userContext: ConferenceUserContext, roomId: string, meetingData: ToggleMeetingDTO) {
        const { storeIds } = userContext;

        const existing = await conferenceRepository.getByIdWithAccess(roomId, storeIds);
        if (!existing) {
            throw 'NOT_FOUND';
        }

        // Toggle meeting status
        const newHasMeeting = !existing.hasMeeting;

        const room = await conferenceRepository.toggleMeeting(roomId, newHasMeeting, meetingData);

        // Queue sync job to update AIMS and flip ESL page
        await syncQueueService.queueUpdate(existing.storeId, 'conference', room.id, { hasMeeting: newHasMeeting });

        return room;
    },

    /**
     * Request ESL page flip for a room
     */
    async flipPage(userContext: ConferenceUserContext, roomId: string) {
        const { storeIds } = userContext;

        const existing = await conferenceRepository.getByIdWithAccess(roomId, storeIds);
        if (!existing) {
            throw 'NOT_FOUND';
        }

        if (!existing.labelCode) {
            throw 'NO_LABEL_ASSIGNED';
        }

        // Queue job to flip ESL page in AIMS
        await syncQueueService.queueUpdate(existing.storeId, 'conference', existing.id, { flipPage: true });

        return {
            message: 'Page flip requested',
            roomId: existing.id,
            labelCode: existing.labelCode,
        };
    },
};
