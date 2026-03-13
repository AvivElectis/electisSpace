import { conferenceRepository } from './repository.js';
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';
import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import type {
    ConferenceUserContext,
    ConferenceRoomStats,
    ListRoomsFilters,
    CreateRoomDTO,
    UpdateRoomDTO,
    ToggleMeetingDTO,
} from './types.js';

// ============================================================================
// Helpers
// ============================================================================

const isPlatformAdmin = (ctx: ConferenceUserContext): boolean =>
    ctx.globalRole === 'PLATFORM_ADMIN';

const getEffectiveStoreIds = (ctx: ConferenceUserContext): string[] | undefined =>
    isPlatformAdmin(ctx) ? undefined : ctx.storeIds;

const validateStoreAccess = (storeId: string, ctx: ConferenceUserContext): void => {
    if (isPlatformAdmin(ctx)) return;
    if (!ctx.storeIds.includes(storeId)) {
        throw 'STORE_ACCESS_DENIED';
    }
};

// ============================================================================
// Conference Service - Business Logic
// ============================================================================

export const conferenceService = {
    /**
     * List conference rooms for user's accessible stores
     */
    async list(userContext: ConferenceUserContext, filters: ListRoomsFilters) {
        const { storeId: filterStoreId } = filters;

        // Validate store access if filtering by specific store
        if (filterStoreId) {
            validateStoreAccess(filterStoreId, userContext);
        }

        const storeIds = getEffectiveStoreIds(userContext);
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
        const storeIds = getEffectiveStoreIds(userContext);
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
        // Check user has access to the target store
        validateStoreAccess(data.storeId, userContext);

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
        const storeIds = getEffectiveStoreIds(userContext);
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
        const storeIds = getEffectiveStoreIds(userContext);
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
        const storeIds = getEffectiveStoreIds(userContext);
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
     * Get current page for all conference room labels from AIMS
     * Returns map of labelCode → currentPage
     */
    async getLabelPages(userContext: ConferenceUserContext, storeId: string): Promise<Record<string, number>> {
        validateStoreAccess(storeId, userContext);

        // Get all conference rooms for this store
        const storeIds = getEffectiveStoreIds(userContext);
        const rooms = await conferenceRepository.list(storeIds, storeId);

        // Collect all label codes
        const labelCodes: string[] = [];
        for (const room of rooms) {
            if (room.labelCode) labelCodes.push(room.labelCode);
            if (room.assignedLabels?.length) {
                for (const lc of room.assignedLabels) {
                    if (!labelCodes.includes(lc)) labelCodes.push(lc);
                }
            }
        }

        if (labelCodes.length === 0) return {};

        // Fetch all labels from AIMS for this store (they include currentPage)
        const labels = await aimsGateway.fetchLabels(storeId);
        const pageMap: Record<string, number> = {};
        for (const label of labels) {
            if (labelCodes.includes(label.labelCode)) {
                pageMap[label.labelCode] = (label as any).currentPage ?? 1;
            }
        }

        return pageMap;
    },

    /**
     * Flip ESL page for a room — direct AIMS API call (not queued)
     * Supports multiple labels per room (all get same page)
     * Page 1 = Available, Page 2 = Busy
     */
    async flipPage(userContext: ConferenceUserContext, roomId: string, page: number) {
        const storeIds = getEffectiveStoreIds(userContext);
        const existing = await conferenceRepository.getByIdWithAccess(roomId, storeIds);
        if (!existing) {
            throw 'NOT_FOUND';
        }

        // Collect all label codes for this room
        const labelCodes: string[] = [];
        if (existing.labelCode) labelCodes.push(existing.labelCode);
        if (existing.assignedLabels?.length) {
            for (const lc of existing.assignedLabels) {
                if (!labelCodes.includes(lc)) labelCodes.push(lc);
            }
        }

        if (labelCodes.length === 0) {
            throw 'NO_LABEL_ASSIGNED';
        }

        // Direct AIMS API call — requires 200 for success
        appLogger.info('ConferenceService', `Flipping page for room ${roomId}`, { labelCodes, page });
        const result = await aimsGateway.changeLabelPage(existing.storeId, labelCodes, page);
        appLogger.info('ConferenceService', `Page flip successful for room ${roomId}`, { labelCodes, page });

        return {
            message: 'Page flip successful',
            roomId: existing.id,
            storeId: existing.storeId,
            externalId: existing.externalId,
            labelCodes,
            page,
            aimsResponse: result,
        };
    },
};
