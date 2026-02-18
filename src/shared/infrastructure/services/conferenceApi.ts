/**
 * Conference API Service
 * 
 * Frontend service for conference room CRUD operations via backend.
 * Backend handles AIMS sync through SyncQueue.
 */

import { api } from './apiClient';
import type { ConferenceRoom } from '@shared/domain/types';

// Response types
export interface ConferenceRoomsResponse {
    data: ConferenceRoom[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ConferenceRoomResponse {
    data: ConferenceRoom;
}

// Query parameters
export interface ListConferenceRoomsParams {
    storeId: string;
    page?: number;
    limit?: number;
    search?: string;
    syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED';
}

// Create/Update DTOs
export interface CreateConferenceRoomDto {
    storeId: string;
    externalId: string;
    name: string;
    capacity?: number;
    floor?: string;
    building?: string;
    labelCode?: string;
    amenities?: string[];
    data?: Record<string, unknown>;
}

export interface UpdateConferenceRoomDto {
    name?: string;
    capacity?: number | null;
    floor?: string | null;
    building?: string | null;
    labelCode?: string | null;
    amenities?: string[];
    data?: Record<string, unknown>;
}

export interface BulkCreateConferenceRoomsDto {
    storeId: string;
    rooms: Omit<CreateConferenceRoomDto, 'storeId'>[];
}

// API functions
export const conferenceApi = {
    /**
     * List conference rooms with pagination and filters
     */
    async list(params: ListConferenceRoomsParams): Promise<ConferenceRoomsResponse> {
        const { storeId, ...queryParams } = params;
        const response = await api.get<ConferenceRoomsResponse>('/conference-rooms', {
            params: { storeId, ...queryParams },
        });
        return response.data;
    },

    /**
     * Get a single conference room by ID
     */
    async getById(id: string): Promise<ConferenceRoomResponse> {
        const response = await api.get<ConferenceRoomResponse>(`/conference-rooms/${id}`);
        return response.data;
    },

    /**
     * Create a new conference room
     * Backend will queue for AIMS sync
     */
    async create(data: CreateConferenceRoomDto): Promise<ConferenceRoomResponse> {
        const response = await api.post<ConferenceRoomResponse>('/conference-rooms', data);
        return response.data;
    },

    /**
     * Update an existing conference room
     * Backend will queue for AIMS sync
     */
    async update(id: string, data: UpdateConferenceRoomDto): Promise<ConferenceRoomResponse> {
        const response = await api.patch<ConferenceRoomResponse>(`/conference-rooms/${id}`, data);
        return response.data;
    },

    /**
     * Delete a conference room
     * Backend will queue for AIMS sync
     */
    async delete(id: string): Promise<void> {
        await api.delete(`/conference-rooms/${id}`);
    },

    /**
     * Bulk create conference rooms
     * Backend will queue all for AIMS sync
     */
    async bulkCreate(data: BulkCreateConferenceRoomsDto): Promise<{ created: number }> {
        const response = await api.post<{ created: number }>('/conference-rooms/bulk', data);
        return response.data;
    },

    /**
     * Assign label to conference room
     */
    async assignLabel(roomId: string, labelCode: string): Promise<ConferenceRoomResponse> {
        const response = await api.post<ConferenceRoomResponse>(`/conference-rooms/${roomId}/label`, { labelCode });
        return response.data;
    },

    /**
     * Unassign label from conference room
     */
    async unassignLabel(roomId: string): Promise<ConferenceRoomResponse> {
        const response = await api.delete<ConferenceRoomResponse>(`/conference-rooms/${roomId}/label`);
        return response.data;
    },
};
