/**
 * Labels API Service
 * 
 * Frontend service for label operations via backend.
 * Backend handles AIMS communication.
 */

import { api } from './apiClient';

// Label types
export interface Label {
    id: string;
    storeId: string;
    code: string;
    macAddress?: string;
    type: string;
    width: number;
    height: number;
    status: 'AVAILABLE' | 'ASSIGNED' | 'OFFLINE';
    battery?: number;
    signal?: number;
    assignedToId?: string;
    assignedToType?: 'SPACE' | 'PERSON' | 'CONFERENCE_ROOM';
    lastSeen?: string;
    createdAt: string;
    updatedAt: string;
}

export interface LabelsResponse {
    data: Label[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface LabelResponse {
    data: Label;
}

// Query parameters
export interface ListLabelsParams {
    storeId: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: 'AVAILABLE' | 'ASSIGNED' | 'OFFLINE';
    type?: string;
}

// API functions
export const labelsApi = {
    /**
     * List labels with pagination and filters
     */
    async list(params: ListLabelsParams): Promise<LabelsResponse> {
        const { storeId, ...queryParams } = params;
        const response = await api.get<LabelsResponse>('/labels', {
            params: { storeId, ...queryParams },
        });
        return response.data;
    },

    /**
     * Get a single label by ID
     */
    async getById(id: string): Promise<LabelResponse> {
        const response = await api.get<LabelResponse>(`/labels/${id}`);
        return response.data;
    },

    /**
     * Get a label by code
     */
    async getByCode(storeId: string, code: string): Promise<LabelResponse> {
        const response = await api.get<LabelResponse>(`/labels/by-code/${code}`, {
            params: { storeId },
        });
        return response.data;
    },

    /**
     * Get available labels for assignment
     */
    async getAvailable(storeId: string, type?: string): Promise<LabelsResponse> {
        const response = await api.get<LabelsResponse>('/labels/available', {
            params: { storeId, type },
        });
        return response.data;
    },

    /**
     * Refresh labels from AIMS
     * Fetches latest label data from AIMS and updates local database
     */
    async refresh(storeId: string): Promise<{ updated: number; created: number }> {
        const response = await api.post<{ updated: number; created: number }>('/labels/refresh', { storeId });
        return response.data;
    },

    /**
     * Assign a label to an entity
     */
    async assign(labelId: string, entityId: string, entityType: 'SPACE' | 'PERSON' | 'CONFERENCE_ROOM'): Promise<LabelResponse> {
        const response = await api.post<LabelResponse>(`/labels/${labelId}/assign`, {
            entityId,
            entityType,
        });
        return response.data;
    },

    /**
     * Unassign a label from its current entity
     */
    async unassign(labelId: string): Promise<LabelResponse> {
        const response = await api.post<LabelResponse>(`/labels/${labelId}/unassign`);
        return response.data;
    },

    /**
     * Get label statistics for a store
     */
    async getStats(storeId: string): Promise<{
        total: number;
        available: number;
        assigned: number;
        offline: number;
        byType: Record<string, number>;
    }> {
        const response = await api.get('/labels/stats', {
            params: { storeId },
        });
        return response.data;
    },

    /**
     * Blink/flash a label for identification
     */
    async blink(labelId: string): Promise<{ success: boolean }> {
        const response = await api.post<{ success: boolean }>(`/labels/${labelId}/blink`);
        return response.data;
    },
};

export default labelsApi;
