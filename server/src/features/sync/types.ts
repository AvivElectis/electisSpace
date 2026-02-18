/**
 * Sync Feature - Types
 * 
 * @description Validation schemas, DTOs and types for sync operations.
 */
import { z } from 'zod';

// ======================
// Validation Schemas
// ======================

/** Schema for trigger sync request */
export const triggerSyncSchema = z.object({
    storeId: z.string().uuid(),
    type: z.enum(['full', 'push', 'pull']).default('full'),
    entities: z.array(z.enum(['spaces', 'people', 'conference'])).optional(),
});

// ======================
// DTOs
// ======================

export type TriggerSyncInput = z.infer<typeof triggerSyncSchema>;

// ======================
// Response Types
// ======================

export interface SyncStatusResponse {
    status: 'syncing' | 'idle';
    lastSync: Date | null;
    pendingItems: number;
    failedItems: number;
    aimsConnected: boolean;
}

export interface SyncJobResponse {
    jobId: string;
    status: string;
    type: string;
    startedAt: Date;
    completedAt: Date | null;
    error: string | null;
    stats: any;
}

export interface TriggerSyncResponse {
    message: string;
    jobId: string;
    stats: {
        articlesFetched?: number;
        articlesPushed?: number;
    };
}

export interface SyncQueueItem {
    id: string;
    storeId: string;
    entityType: string;
    entityId: string;
    action: string;
    status: string;
    payload: any;
    errorMessage: string | null;
    retryCount: number;
    scheduledAt: Date;
    processedAt: Date | null;
    createdAt: Date;
    store?: { name: string; code: string };
}

export interface PullSyncResponse {
    message: string;
    stats: {
        total: number;
        created: number;
        updated: number;
        unchanged: number;
    };
}

export interface PushSyncResponse {
    message: string;
    stats: {
        processed: number;
        succeeded: number;
        failed: number;
    };
}

export interface StoreSyncStatusResponse {
    store: {
        id: string;
        name: string;
        code: string;
    };
    syncEnabled: boolean;
    lastSyncAt: Date | null;
    queue: {
        pending: number;
        failed: number;
        completed: number;
    };
    aimsConnected: boolean;
}

// ======================
// User Context for Authorization
// ======================

export interface SyncUserContext {
    id: string;
    globalRole?: string | null;
    stores?: Array<{ id: string }>;
}
