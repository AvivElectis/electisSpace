/**
 * Spaces API Service
 * Server API calls for spaces management
 */

import api, { type PaginatedResponse } from '@shared/infrastructure/services/apiClient';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import type { Space } from '@shared/domain/types';

// Server space type (matches server response)
interface ServerSpace {
    id: string;
    externalId: string;
    labelCode: string | null;
    templateName: string | null;
    data: Record<string, unknown>;
    assignedLabels?: string[];  // Label codes assigned to this article from AIMS
    syncStatus: 'PENDING' | 'SYNCED' | 'ERROR';
    syncError: string | null;
    organizationId: string;
    createdById: string;
    updatedById: string;
    createdAt: string;
    updatedAt: string;
}

// Transform server space to client space format
function transformSpace(serverSpace: ServerSpace): Space {
    // Convert data values to strings (client Space type expects Record<string, string>)
    const stringData: Record<string, string> = {};

    if (serverSpace.data) {
        for (const [key, value] of Object.entries(serverSpace.data)) {
            stringData[key] = value != null ? String(value) : '';
        }
    }

    return {
        id: serverSpace.id,
        externalId: serverSpace.externalId,
        labelCode: serverSpace.labelCode || undefined,
        templateName: serverSpace.templateName || undefined,
        data: stringData,
        assignedLabels: Array.isArray(serverSpace.assignedLabels) && serverSpace.assignedLabels.length > 0
            ? serverSpace.assignedLabels
            : undefined,
        syncStatus: serverSpace.syncStatus,
    };
}

// API query parameters
interface SpacesQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    hasLabel?: boolean;
}

// Spaces API service
export const spacesApi = {
    /**
     * Get all spaces with optional pagination and filtering
     */
    getAll: async (params?: SpacesQueryParams): Promise<{ spaces: Space[]; total: number }> => {
        const queryParams = { limit: 10000, ...params };
        const response = await api.get<PaginatedResponse<ServerSpace>>('/spaces', { params: queryParams });
        return {
            spaces: response.data.data.map(transformSpace),
            total: response.data.pagination.total,
        };
    },

    /**
     * Get a single space by ID
     */
    getById: async (id: string): Promise<Space> => {
        const response = await api.get<ServerSpace>(`/spaces/${id}`);
        return transformSpace(response.data);
    },

    /**
     * Create a new space
     */
    create: async (data: {
        storeId?: string;
        externalId: string;
        labelCode?: string;
        templateName?: string;
        data?: Record<string, unknown>;
    }): Promise<Space> => {
        // Auto-inject storeId from auth store if not provided
        const payload = {
            ...data,
            storeId: data.storeId || useAuthStore.getState().activeStoreId,
        };
        const response = await api.post<ServerSpace>('/spaces', payload);
        return transformSpace(response.data);
    },

    /**
     * Update an existing space
     */
    update: async (id: string, data: {
        labelCode?: string | null;
        templateName?: string | null;
        data?: Record<string, unknown>;
    }): Promise<Space> => {
        const response = await api.patch<ServerSpace>(`/spaces/${id}`, data);
        return transformSpace(response.data);
    },

    /**
     * Delete a space
     */
    delete: async (id: string): Promise<void> => {
        await api.delete(`/spaces/${id}`);
    },

    /**
     * Assign a label to a space
     */
    assignLabel: async (id: string, labelCode: string): Promise<Space> => {
        const response = await api.post<ServerSpace>(`/spaces/${id}/assign-label`, { labelCode });
        return transformSpace(response.data);
    },

    /**
     * Unassign label from a space
     */
    unassignLabel: async (id: string): Promise<Space> => {
        const response = await api.delete<ServerSpace>(`/spaces/${id}/unassign-label`);
        return transformSpace(response.data);
    },
};

export default spacesApi;
