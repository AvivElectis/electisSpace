/**
 * Conference API Service
 * Server API calls for conference room management
 */

import api from '@shared/infrastructure/services/apiClient';
import type { ConferenceRoom } from '@shared/domain/types';

// Server conference room type (matches actual Prisma ConferenceRoom response)
interface ServerConferenceRoom {
    id: string;              // Server UUID
    storeId: string;
    externalId: string;      // Display ID (e.g., "12", "C01")
    roomName: string;
    labelCode: string | null;
    hasMeeting: boolean;
    meetingName: string | null;
    startTime: string | null;
    endTime: string | null;
    participants: string[];
    assignedLabels?: string[];  // Label codes assigned to this room's article from AIMS
    syncStatus: 'PENDING' | 'SYNCED' | 'ERROR';
    createdAt: string;
    updatedAt: string;
    store?: { name: string; code: string };
}

// Stats response
interface ConferenceStatsResponse {
    data: ServerConferenceRoom[];
    stats: {
        total: number;
        withLabels: number;
        withMeetings: number;
        available: number;
    };
}

// Transform server conference room to client format
function transformRoom(serverRoom: ServerConferenceRoom): ConferenceRoom {
    return {
        id: serverRoom.externalId,          // Display ID (e.g., "12", "C01")
        serverId: serverRoom.id,             // Server UUID for API calls
        roomName: serverRoom.roomName,
        hasMeeting: serverRoom.hasMeeting,
        meetingName: serverRoom.meetingName || '',
        startTime: serverRoom.startTime || '',
        endTime: serverRoom.endTime || '',
        participants: serverRoom.participants || [],
        labelCode: serverRoom.labelCode || undefined,
        assignedLabels: Array.isArray(serverRoom.assignedLabels) && serverRoom.assignedLabels.length > 0
            ? serverRoom.assignedLabels
            : undefined,
        data: {
            roomName: serverRoom.roomName,   // Keep in data for backward compat
        },
    };
}

// Conference API service
export const conferenceApi = {
    /**
     * Get all conference rooms with stats
     */
    getAll: async (params?: { storeId?: string }): Promise<{ rooms: ConferenceRoom[]; stats: ConferenceStatsResponse['stats'] }> => {
        const response = await api.get<ConferenceStatsResponse>('/conference', { params });
        return {
            rooms: response.data.data.map(transformRoom),
            stats: response.data.stats,
        };
    },

    /**
     * Get a single conference room by ID
     */
    getById: async (id: string): Promise<ConferenceRoom> => {
        const response = await api.get<ServerConferenceRoom>(`/conference/${id}`);
        return transformRoom(response.data);
    },

    /**
     * Create a new conference room
     */
    create: async (data: {
        storeId: string;
        externalId: string;
        roomName: string;
        labelCode?: string;
        hasMeeting?: boolean;
        meetingName?: string;
        startTime?: string;
        endTime?: string;
        participants?: string[];
        data?: Record<string, unknown>;
    }): Promise<ConferenceRoom> => {
        const response = await api.post<ServerConferenceRoom>('/conference', data);
        return transformRoom(response.data);
    },

    /**
     * Update an existing conference room
     */
    update: async (id: string, data: {
        roomName?: string;
        labelCode?: string | null;
        hasMeeting?: boolean;
        meetingName?: string | null;
        startTime?: string | null;
        endTime?: string | null;
        participants?: string[];
        data?: Record<string, unknown>;
    }): Promise<ConferenceRoom> => {
        const response = await api.patch<ServerConferenceRoom>(`/conference/${id}`, data);
        return transformRoom(response.data);
    },

    /**
     * Delete a conference room
     */
    delete: async (id: string): Promise<void> => {
        await api.delete(`/conference/${id}`);
    },

    /**
     * Toggle meeting status for a conference room
     */
    toggleMeeting: async (id: string, meetingData?: {
        meetingName?: string;
        startTime?: string;
        endTime?: string;
        participants?: string[];
    }): Promise<ConferenceRoom> => {
        const response = await api.post<ServerConferenceRoom>(`/conference/${id}/toggle`, meetingData || {});
        return transformRoom(response.data);
    },

    /**
     * Get current page for all conference room labels from AIMS
     * Returns map of labelCode → currentPage
     */
    getLabelPages: async (storeId: string): Promise<Record<string, number>> => {
        const response = await api.get<Record<string, number>>('/conference/label-pages', {
            params: { storeId },
        });
        return response.data;
    },

    /**
     * Flip ESL page via server → AIMS API
     * Page 1 = Available, Page 2 = Busy
     */
    flipPage: async (id: string, page: number): Promise<{ message: string; roomId: string; labelCodes: string[]; page: number }> => {
        const response = await api.post<{ message: string; roomId: string; labelCodes: string[]; page: number }>(
            `/conference/${id}/flip-page`,
            { page }
        );
        return response.data;
    },
};

export default conferenceApi;
