/**
 * Conference API Service
 * Server API calls for conference room management
 */

import api from '@shared/infrastructure/services/apiClient';
import type { ConferenceRoom } from '@shared/domain/types';

// Server conference room type (matches server response)
interface ServerConferenceRoom {
    id: string;
    name: string;
    labelCode: string | null;
    templateName: string | null;
    hasMeeting: boolean;
    meetingName: string | null;
    startTime: string | null;
    endTime: string | null;
    participants: string[];
    data: Record<string, unknown>;
    syncStatus: 'PENDING' | 'SYNCED' | 'ERROR';
    syncError: string | null;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
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
    // Convert data values to strings (client type expects Record<string, string>)
    const stringData: Record<string, string> = {};
    if (serverRoom.data) {
        for (const [key, value] of Object.entries(serverRoom.data)) {
            stringData[key] = value != null ? String(value) : '';
        }
    }

    return {
        id: serverRoom.id,
        hasMeeting: serverRoom.hasMeeting,
        meetingName: serverRoom.meetingName || '',
        startTime: serverRoom.startTime || '',
        endTime: serverRoom.endTime || '',
        participants: serverRoom.participants || [],
        labelCode: serverRoom.labelCode || undefined,
        data: stringData,
    };
}

// Conference API service
export const conferenceApi = {
    /**
     * Get all conference rooms with stats
     */
    getAll: async (): Promise<{ rooms: ConferenceRoom[]; stats: ConferenceStatsResponse['stats'] }> => {
        const response = await api.get<ConferenceStatsResponse>('/conference');
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
        name: string;
        labelCode?: string;
        templateName?: string;
        data?: Record<string, unknown>;
    }): Promise<ConferenceRoom> => {
        const response = await api.post<ServerConferenceRoom>('/conference', data);
        return transformRoom(response.data);
    },

    /**
     * Update an existing conference room
     */
    update: async (id: string, data: {
        name?: string;
        labelCode?: string | null;
        templateName?: string | null;
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
     * Flip ESL page manually
     */
    flipPage: async (id: string): Promise<{ message: string; roomId: string; labelCode: string }> => {
        const response = await api.post<{ message: string; roomId: string; labelCode: string }>(
            `/conference/${id}/flip-page`
        );
        return response.data;
    },
};

export default conferenceApi;
