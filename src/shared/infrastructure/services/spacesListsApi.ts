/**
 * Spaces Lists API Service
 * 
 * Frontend service for spaces list CRUD operations via backend.
 * Lists are stored in DB, shared between all users in the same store.
 */

import { api } from './apiClient';
import type { Space } from '@shared/domain/types';

export interface SpacesListResponse {
    id: string;
    storeId: string;
    name: string;
    itemCount: number;
    content?: Space[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateSpacesListDto {
    storeId: string;
    name: string;
    content: Space[];
}

export interface UpdateSpacesListDto {
    name?: string;
    content?: Space[];
}

export const spacesListsApi = {
    /**
     * List all spaces lists for a store
     */
    async list(storeId: string): Promise<{ data: SpacesListResponse[] }> {
        const response = await api.get('/spaces-lists', { params: { storeId } });
        return response.data;
    },

    /**
     * Get a single spaces list with content
     */
    async getById(id: string): Promise<{ data: SpacesListResponse }> {
        const response = await api.get(`/spaces-lists/${id}`);
        return response.data;
    },

    /**
     * Create a new spaces list
     */
    async create(data: CreateSpacesListDto): Promise<{ data: SpacesListResponse }> {
        const response = await api.post('/spaces-lists', data);
        return response.data;
    },

    /**
     * Update a spaces list (name and/or content)
     */
    async update(id: string, data: UpdateSpacesListDto): Promise<{ data: SpacesListResponse }> {
        const response = await api.patch(`/spaces-lists/${id}`, data);
        return response.data;
    },

    /**
     * Delete a spaces list
     */
    async delete(id: string): Promise<void> {
        await api.delete(`/spaces-lists/${id}`);
    },
};
