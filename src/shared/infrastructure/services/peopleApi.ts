/**
 * People API Service
 * 
 * Frontend service for people CRUD operations via backend.
 * Backend handles AIMS sync through SyncQueue.
 */

import { api } from './apiClient';
import type { Person } from '@shared/domain/types';

// Response types
export interface PeopleResponse {
    data: Person[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface PersonResponse {
    data: Person;
}

// Query parameters
export interface ListPeopleParams {
    storeId: string;
    page?: number;
    limit?: number;
    search?: string;
    listId?: string;
    syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED';
}

// Create/Update DTOs
export interface CreatePersonDto {
    storeId: string;
    externalId: string;
    firstName: string;
    lastName: string;
    email?: string;
    department?: string;
    labelCode?: string;
    listIds?: string[];
    data?: Record<string, unknown>;
}

export interface UpdatePersonDto {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    department?: string | null;
    labelCode?: string | null;
    listIds?: string[];
    data?: Record<string, unknown>;
}

export interface BulkCreatePeopleDto {
    storeId: string;
    people: Omit<CreatePersonDto, 'storeId'>[];
}

// People List types
export interface PeopleListItem {
    id: string;
    storeId: string;
    name: string;
    storageName: string;
    itemCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface PeopleListFull extends PeopleListItem {
    content: Array<{
        id: string;
        virtualSpaceId?: string;
        data: Record<string, unknown>;
        assignedSpaceId?: string | null;
        listMemberships?: Array<{ listName: string; spaceId?: string }>;
    }>;
}

export interface CreatePeopleListDto {
    storeId: string;
    name: string;
    content?: Array<{
        id: string;
        virtualSpaceId?: string;
        data: Record<string, unknown>;
        assignedSpaceId?: string | null;
        listMemberships?: Array<{ listName: string; spaceId?: string }>;
    }>;
    memberIds?: string[];  // Legacy, not used
}

export interface UpdatePeopleListDto {
    name?: string;
    content?: Array<{
        id: string;
        virtualSpaceId?: string;
        data: Record<string, unknown>;
        assignedSpaceId?: string | null;
        listMemberships?: Array<{ listName: string; spaceId?: string }>;
    }>;
}

// API functions
export const peopleApi = {
    /**
     * List people with pagination and filters
     */
    async list(params: ListPeopleParams): Promise<PeopleResponse> {
        const { storeId, ...queryParams } = params;
        const response = await api.get<PeopleResponse>('/people', {
            params: { storeId, ...queryParams },
        });
        return response.data;
    },

    /**
     * Get a single person by ID
     */
    async getById(id: string): Promise<PersonResponse> {
        const response = await api.get<PersonResponse>(`/people/${id}`);
        return response.data;
    },

    /**
     * Create a new person
     * Backend will queue for AIMS sync
     */
    async create(data: CreatePersonDto): Promise<PersonResponse> {
        const response = await api.post<PersonResponse>('/people', data);
        return response.data;
    },

    /**
     * Update an existing person
     * Backend will queue for AIMS sync
     */
    async update(id: string, data: UpdatePersonDto): Promise<PersonResponse> {
        const response = await api.patch<PersonResponse>(`/people/${id}`, data);
        return response.data;
    },

    /**
     * Delete a person
     * Backend will queue for AIMS sync
     */
    async delete(id: string): Promise<void> {
        await api.delete(`/people/${id}`);
    },

    /**
     * Bulk create people
     * Backend will queue all for AIMS sync
     */
    async bulkCreate(data: BulkCreatePeopleDto): Promise<{ created: number }> {
        const response = await api.post<{ created: number }>('/people/bulk', data);
        return response.data;
    },

    /**
     * Assign label to person
     */
    async assignLabel(personId: string, labelCode: string): Promise<PersonResponse> {
        const response = await api.post<PersonResponse>(`/people/${personId}/label`, { labelCode });
        return response.data;
    },

    /**
     * Add person to a list
     */
    async addToList(personId: string, listId: string): Promise<void> {
        await api.post(`/people/${personId}/lists/${listId}`);
    },

    /**
     * Remove person from a list
     */
    async removeFromList(personId: string, listId: string): Promise<void> {
        await api.delete(`/people/${personId}/lists/${listId}`);
    },

    // People Lists - DB-backed, shared between all users in the store
    lists: {
        /**
         * List all people lists for a store (metadata only, no content)
         */
        async list(storeId: string): Promise<{ data: PeopleListItem[] }> {
            const response = await api.get('/people-lists', {
                params: { storeId },
            });
            return response.data;
        },

        /**
         * Get a single list with full content
         */
        async getById(id: string): Promise<{ data: PeopleListFull }> {
            const response = await api.get(`/people-lists/${id}`);
            return response.data;
        },

        /**
         * Create a new people list (unique name per store)
         */
        async create(data: CreatePeopleListDto): Promise<{ data: PeopleListFull }> {
            const response = await api.post('/people-lists', data);
            return response.data;
        },

        /**
         * Update a people list (name and/or content)
         */
        async update(id: string, data: UpdatePeopleListDto): Promise<{ data: PeopleListFull }> {
            const response = await api.patch(`/people-lists/${id}`, data);
            return response.data;
        },

        /**
         * Delete a people list
         */
        async delete(id: string): Promise<void> {
            await api.delete(`/people-lists/${id}`);
        },

        /**
         * Load a list — atomically replaces all people in the store with list snapshot.
         * Server handles full replacement + AIMS sync.
         */
        async load(listId: string): Promise<{ data: { list: { id: string; name: string; storageName: string }; people: unknown[] } }> {
            const response = await api.post(`/people-lists/${listId}/load`);
            return response.data;
        },

        /**
         * Free (unload) the current list. People remain in DB; list tracking is cleared.
         */
        async free(storeId: string): Promise<void> {
            await api.post('/people-lists/free', { storeId });
        },
    },
};

export default peopleApi;
