import type { Space } from '@shared/domain/types';

/**
 * Sync Feature Domain Types
 */

export type SyncMode = 'SOLUM_API';

export type SyncStatus =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'syncing'
    | 'success'
    | 'error'
    | 'disconnected';

export interface SyncState {
    status: SyncStatus;
    isConnected: boolean;
    lastSync?: Date;
    lastError?: string;
    progress?: number;  // 0-100
    syncStartedAt?: Date;  // When 'syncing' status began — used for elapsed time display
}

/**
 * Unified sync adapter interface
 * SoluM implementations must implement this interface
 */
export interface SyncAdapter {
    /**
     * Connect to external system
     */
    connect(): Promise<void>;

    /**
     * Disconnect from external system
     */
    disconnect(): Promise<void>;

    /**
     * Download space data from external system
     * @returns Array of Space entities
     */
    download(): Promise<Space[]>;

    /**
     * Upload space data to external system
     * @param spaces - Spaces to upload
     */
    upload(spaces: Space[]): Promise<void>;

    /**
     * Upload space data to external system using a safe merge strategy (Fetch-Merge-Push)
     * Recommended for loading lists or partial updates to prevent data corruption
     * @param spaces - Spaces to upload
     */
    safeUpload(spaces: Space[]): Promise<void>;

    /**
     * Perform full synchronization (download + process + upload)
     * @returns Promise
     */
    sync(): Promise<void>;

    /**
     * Get current sync status
     */
    getStatus(): SyncState;
}
