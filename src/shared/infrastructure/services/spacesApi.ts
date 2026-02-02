/**
 * Spaces API Service
 * 
 * Frontend service for spaces CRUD operations via backend.
 * Backend handles AIMS sync through SyncQueue.
 */

import { api } from './apiClient';
import type { Space } from '@shared/domain/types';

// Response types
export interface SpacesResponse {
    data: Space[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface SpaceResponse {
    data: Space;
}

// Query parameters
export interface ListSpacesParams {
    storeId: string;
    page?: number;
    limit?: number;
    search?: string;
    hasLabel?: boolean;
    syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED';
}

// Create/Update DTOs
export interface CreateSpaceDto {
    storeId: string;
    externalId: string;
    labelCode?: string;
    templateName?: string;
    data?: Record<string, unknown>;
}

export interface UpdateSpaceDto {
    labelCode?: string | null;
    templateName?: string | null;
    data?: Record<string, unknown>;
}

export interface BulkCreateSpacesDto {
    storeId: string;
    spaces: Omit<CreateSpaceDto, 'storeId'>[];
}

export interface BulkUpdateSpacesDto {
    storeId: string;
    updates: Array<{
        id: string;
        data: UpdateSpaceDto;
    }>;
}

// API functions
export const spacesApi = {
    /**
     * List spaces with pagination and filters
     */
    async list(params: ListSpacesParams): Promise<SpacesResponse> {
        const { storeId, ...queryParams } = params;
        const response = await api.get<SpacesResponse>('/spaces', {
            params: { storeId, ...queryParams },
        });
        return response.data;
    },

    /**
     * Get a single space by ID
     */
    async getById(id: string): Promise<SpaceResponse> {
        const response = await api.get<SpaceResponse>(`/spaces/${id}`);
        return response.data;
    },

    /**
     * Create a new space
     * Backend will queue for AIMS sync
     */
    async create(data: CreateSpaceDto): Promise<SpaceResponse> {
        const response = await api.post<SpaceResponse>('/spaces', data);
        return response.data;
    },

    /**
     * Update an existing space
     * Backend will queue for AIMS sync
     */
    async update(id: string, data: UpdateSpaceDto): Promise<SpaceResponse> {
        const response = await api.patch<SpaceResponse>(`/spaces/${id}`, data);
        return response.data;
    },

    /**
     * Delete a space
     * Backend will queue for AIMS sync
     */
    async delete(id: string): Promise<void> {
        await api.delete(`/spaces/${id}`);
    },

    /**
     * Bulk create spaces
     * Backend will queue all for AIMS sync
     */
    async bulkCreate(data: BulkCreateSpacesDto): Promise<{ created: number }> {
        const response = await api.post<{ created: number }>('/spaces/bulk', data);
        return response.data;
    },

    /**
     * Bulk update spaces
     * Backend will queue all for AIMS sync
     */
    async bulkUpdate(data: BulkUpdateSpacesDto): Promise<{ updated: number }> {
        const response = await api.patch<{ updated: number }>('/spaces/bulk', data);
        return response.data;
    },

    /**
     * Assign label to space
     */
    async assignLabel(spaceId: string, labelCode: string): Promise<SpaceResponse> {
        const response = await api.post<SpaceResponse>(`/spaces/${spaceId}/label`, { labelCode });
        return response.data;
    },

    /**
     * Unassign label from space
     */
    async unassignLabel(spaceId: string): Promise<SpaceResponse> {
        const response = await api.delete<SpaceResponse>(`/spaces/${spaceId}/label`);
        return response.data;
    },
};

export default spacesApi;
