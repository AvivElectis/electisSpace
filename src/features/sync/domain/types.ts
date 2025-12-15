import type { Space } from '@shared/domain/types';

/**
 * Sync Feature Domain Types
 */

export type SyncMode = 'SFTP' | 'SOLUM_API';

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
}

/**
 * Unified sync adapter interface
 * All sync implementations (SFTP, SoluM) must implement this interface
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
     * Perform full synchronization (download + process + upload)
     */
    sync(): Promise<void>;

    /**
     * Get current sync status
     */
    getStatus(): SyncState;
}
