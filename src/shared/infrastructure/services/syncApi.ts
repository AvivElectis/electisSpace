/**
 * Sync API Service
 * 
 * Frontend service for sync operations via backend.
 * All AIMS communication goes through the backend.
 */

import { api } from './apiClient';

// Sync status types
export type SyncItemStatus = 'PENDING' | 'SYNCED' | 'FAILED';
export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncEntityType = 'SPACE' | 'PERSON' | 'CONFERENCE_ROOM' | 'PEOPLE_LIST';

// Response types
export interface SyncStatusResponse {
    status: 'idle' | 'syncing' | 'error';
    lastSync: string | null;
    pendingItems: number;
    failedItems: number;
    aimsConnected: boolean;
}

export interface SyncQueueItem {
    id: string;
    storeId: string;
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperation;
    status: SyncItemStatus;
    payload: Record<string, unknown>;
    attempts: number;
    lastError?: string;
    createdAt: string;
    processedAt?: string;
}

export interface SyncQueueResponse {
    data: SyncQueueItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface PullSyncResult {
    spaces: number;
    people: number;
    conferenceRooms: number;
    created: number;
    updated: number;
    duration: number;
}

export interface PushSyncResult {
    processed: number;
    succeeded: number;
    failed: number;
    duration: number;
}

// API functions
export const syncApi = {
    /**
     * Get current sync status for a store
     */
    async getStatus(storeId?: string): Promise<SyncStatusResponse> {
        const response = await api.get<SyncStatusResponse>('/sync/status', {
            params: storeId ? { storeId } : undefined,
        });
        return response.data;
    },

    /**
     * Pull data from AIMS to local database
     * This triggers a download from AIMS through the backend
     */
    async pull(storeId: string): Promise<PullSyncResult> {
        const response = await api.post<PullSyncResult>(`/sync/pull`, { storeId });
        return response.data;
    },

    /**
     * Push pending changes to AIMS
     * This processes the sync queue and sends to AIMS
     */
    async push(storeId: string): Promise<PushSyncResult> {
        const response = await api.post<PushSyncResult>(`/sync/push`, { storeId });
        return response.data;
    },

    /**
     * Full sync - pull then push
     */
    async fullSync(storeId: string): Promise<{ pull: PullSyncResult; push: PushSyncResult }> {
        const response = await api.post<{ pull: PullSyncResult; push: PushSyncResult }>('/sync/full', { storeId });
        return response.data;
    },

    /**
     * Get sync queue items
     */
    async getQueue(storeId: string, params?: {
        page?: number;
        limit?: number;
        status?: SyncItemStatus;
        entityType?: SyncEntityType;
    }): Promise<SyncQueueResponse> {
        const response = await api.get<SyncQueueResponse>('/sync/queue', {
            params: { storeId, ...params },
        });
        return response.data;
    },

    /**
     * Retry a failed sync item
     */
    async retryItem(itemId: string): Promise<SyncQueueItem> {
        const response = await api.post<{ data: SyncQueueItem }>(`/sync/queue/${itemId}/retry`);
        return response.data.data;
    },

    /**
     * Retry all failed items for a store
     */
    async retryAllFailed(storeId: string): Promise<{ retried: number }> {
        const response = await api.post<{ retried: number }>('/sync/queue/retry-failed', { storeId });
        return response.data;
    },

    /**
     * Cancel a pending sync item
     */
    async cancelItem(itemId: string): Promise<void> {
        await api.delete(`/sync/queue/${itemId}`);
    },

    /**
     * Clear all failed items for a store
     */
    async clearFailed(storeId: string): Promise<{ cleared: number }> {
        const response = await api.delete<{ cleared: number }>('/sync/queue/failed', {
            params: { storeId },
        });
        return response.data;
    },

    /**
     * Check AIMS connection health for a store
     */
    async checkConnection(storeId: string): Promise<{ connected: boolean; latency?: number; error?: string }> {
        const response = await api.get<{ connected: boolean; latency?: number; error?: string }>('/sync/health', {
            params: { storeId },
        });
        return response.data;
    },

    /**
     * Connect to AIMS for a store (login)
     */
    async connect(storeId: string): Promise<{ success: boolean; error?: string }> {
        const response = await api.post<{ success: boolean; error?: string }>('/sync/connect', { storeId });
        return response.data;
    },

    /**
     * Disconnect from AIMS for a store (logout)
     */
    async disconnect(storeId: string): Promise<void> {
        await api.post('/sync/disconnect', { storeId });
    },
};
