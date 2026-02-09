/**
 * People API Service
 * Server API calls for people management
 */

import api, { type PaginatedResponse } from '@shared/infrastructure/services/apiClient';
import type { Person } from '../domain/types';

// Server person type (matches server response)
interface ServerPerson {
    id: string;
    virtualSpaceId: string;
    externalId: string | null;
    assignedSpaceId: string | null;
    data: Record<string, unknown>;
    syncStatus: 'PENDING' | 'SYNCED' | 'ERROR';
    syncError: string | null;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
}

// Transform server person to client person format
function transformPerson(serverPerson: ServerPerson): Person {
    // Convert data values to strings (client Person type expects Record<string, string>)
    const stringData: Record<string, string> = {};
    if (serverPerson.data) {
        for (const [key, value] of Object.entries(serverPerson.data)) {
            stringData[key] = value != null ? String(value) : '';
        }
    }

    return {
        id: serverPerson.id,
        virtualSpaceId: serverPerson.virtualSpaceId,
        data: stringData,
        assignedSpaceId: serverPerson.assignedSpaceId || undefined,
        aimsSyncStatus: serverPerson.syncStatus === 'PENDING' ? 'pending' :
            serverPerson.syncStatus === 'SYNCED' ? 'synced' : 'error',
        lastSyncedAt: serverPerson.updatedAt,
    };
}

// API query parameters
interface PeopleQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    storeId?: string;
    assignedOnly?: boolean;
    unassignedOnly?: boolean;
}

// People API service
export const peopleApi = {
    /**
     * Get all people with optional pagination and filtering
     */
    getAll: async (params?: PeopleQueryParams): Promise<{ people: Person[]; total: number }> => {
        const queryParams = { limit: 10000, ...params };
        const response = await api.get<PaginatedResponse<ServerPerson>>('/people', { params: queryParams });
        return {
            people: response.data.data.map(transformPerson),
            total: response.data.pagination.total,
        };
    },

    /**
     * Get a single person by ID
     */
    getById: async (id: string): Promise<Person> => {
        const response = await api.get<ServerPerson>(`/people/${id}`);
        return transformPerson(response.data);
    },

    /**
     * Create a new person
     */
    create: async (data: {
        storeId: string;
        externalId?: string;
        data?: Record<string, unknown>;
    }): Promise<Person> => {
        const response = await api.post<ServerPerson>('/people', data);
        return transformPerson(response.data);
    },

    /**
     * Update an existing person
     */
    update: async (id: string, data: {
        data?: Record<string, unknown>;
    }): Promise<Person> => {
        const response = await api.patch<ServerPerson>(`/people/${id}`, data);
        return transformPerson(response.data);
    },

    /**
     * Delete a person
     */
    delete: async (id: string): Promise<void> => {
        await api.delete(`/people/${id}`);
    },

    /**
     * Assign a person to a space
     */
    assignToSpace: async (id: string, spaceId: string): Promise<Person> => {
        const response = await api.post<ServerPerson>(`/people/${id}/assign`, { spaceId });
        return transformPerson(response.data);
    },

    /**
     * Unassign a person from their space
     */
    unassignFromSpace: async (id: string): Promise<Person> => {
        const response = await api.post<ServerPerson>(`/people/${id}/unassign`);
        return transformPerson(response.data);
    },

    /**
     * Link a person to a label
     */
    linkLabel: async (id: string, labelCode: string): Promise<Person> => {
        const response = await api.post<ServerPerson>(`/people/${id}/link-label`, { labelCode });
        return transformPerson(response.data);
    },

    /**
     * Batch operations for people
     */
    batchUpdate: async (updates: Array<{ id: string; data: Record<string, unknown> }>): Promise<Person[]> => {
        const response = await api.post<ServerPerson[]>('/people/batch', { updates });
        return response.data.map(transformPerson);
    },
};

export default peopleApi;
