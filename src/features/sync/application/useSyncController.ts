import { useCallback, useEffect, useRef } from 'react';
import { useSyncStore } from '../infrastructure/syncStore';
import { SFTPSyncAdapter } from '../infrastructure/SFTPSyncAdapter';
import { SolumSyncAdapter } from '../infrastructure/SolumSyncAdapter';
import type { SyncAdapter } from '../domain/types';
import type { Space, SFTPCredentials, SolumConfig, CSVConfig } from '@shared/domain/types';
import { logger } from '@shared/infrastructure/services/logger';

/**
 * Sync Controller Hook
 * Main orchestration for sync operations
 * Dynamically selects SFTP or SoluM adapter based on working mode
 */

interface UseSyncControllerProps {
    sftpCredentials?: SFTPCredentials;
    solumConfig?: SolumConfig;
    csvConfig: CSVConfig;
    onSpaceUpdate: (spaces: Space[]) => void;
}

export function useSyncController({
    sftpCredentials,
    solumConfig,
    csvConfig,
    onSpaceUpdate,
}: UseSyncControllerProps) {
    const {
        workingMode,
        syncState,
        autoSyncEnabled,
        autoSyncInterval,
        solumTokens,
        setSyncState,
        setSolumTokens,
    } = useSyncStore();

    const adapterRef = useRef<SyncAdapter | null>(null);
    const autoSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Get current adapter based on working mode
     */
    const getAdapter = useCallback((): SyncAdapter => {
        // Reuse existing adapter if same mode
        if (adapterRef.current) {
            return adapterRef.current;
        }

        if (workingMode === 'SFTP') {
            if (!sftpCredentials) {
                throw new Error('SFTP credentials not configured');
            }
            logger.info('SyncController', 'Creating SFTP adapter');
            adapterRef.current = new SFTPSyncAdapter(sftpCredentials, csvConfig);
        } else {
            if (!solumConfig) {
                throw new Error('SoluM configuration not configured');
            }
            logger.info('SyncController', 'Creating SoluM adapter');
            adapterRef.current = new SolumSyncAdapter(
                solumConfig,
                csvConfig,
                (tokens) => setSolumTokens(tokens),
                solumTokens || undefined
            );
        }

        return adapterRef.current;
    }, [workingMode, sftpCredentials, solumConfig, csvConfig, solumTokens, setSolumTokens]);

    /**
     * Connect to external system
     */
    const connect = useCallback(async (): Promise<void> => {
        logger.info('SyncController', 'Connecting', { mode: workingMode });

        try {
            const adapter = getAdapter();
            await adapter.connect();

            const status = adapter.getStatus();
            setSyncState(status);

            logger.info('SyncController', 'Connected successfully');
        } catch (error) {
            logger.error('SyncController', 'Connection failed', { error });
            setSyncState({
                status: 'error',
                isConnected: false,
                lastError: error instanceof Error ? error.message : 'Connection failed',
            });
            throw error;
        }
    }, [workingMode, getAdapter, setSyncState]);

    /**
     * Disconnect from external system
     */
    const disconnect = useCallback(async (): Promise<void> => {
        logger.info('SyncController', 'Disconnecting');

        if (adapterRef.current) {
            await adapterRef.current.disconnect();
            adapterRef.current = null;
        }

        setSyncState({
            status: 'disconnected',
            isConnected: false,
        });
    }, [setSyncState]);

    /**
     * Perform sync (download data)
     */
    const sync = useCallback(async (): Promise<void> => {
        logger.info('SyncController', 'Starting sync', { mode: workingMode });

        try {
            setSyncState({ status: 'syncing', progress: 0 });

            const adapter = getAdapter();

            // Ensure connected
            if (!syncState.isConnected) {
                await adapter.connect();
            }

            // Download spaces
            const spaces = await adapter.download();

            // Update spaces in parent
            onSpaceUpdate(spaces);

            const status = adapter.getStatus();
            setSyncState(status);

            logger.info('SyncController', 'Sync complete', { count: spaces.length });
        } catch (error) {
            logger.error('SyncController', 'Sync failed', { error });
            setSyncState({
                status: 'error',
                lastError: error instanceof Error ? error.message : 'Sync failed',
                progress: 0,
            });
            throw error;
        }
    }, [workingMode, syncState.isConnected, getAdapter, onSpaceUpdate, setSyncState]);

    /**
     * Upload space data
     */
    const upload = useCallback(async (spaces: Space[]): Promise<void> => {
        logger.info('SyncController', 'Uploading spaces', { count: spaces.length });

        try {
            setSyncState({ status: 'syncing', progress: 0 });

            const adapter = getAdapter();

            // Ensure connected
            if (!syncState.isConnected) {
                await adapter.connect();
            }

            await adapter.upload(spaces);

            const status = adapter.getStatus();
            setSyncState(status);

            logger.info('SyncController', 'Upload complete');
        } catch (error) {
            logger.error('SyncController', 'Upload failed', { error });
            setSyncState({
                status: 'error',
                lastError: error instanceof Error ? error.message : 'Upload failed',
                progress: 0,
            });
            throw error;
        }
    }, [syncState.isConnected, getAdapter, setSyncState]);

    /**
     * Setup auto-sync interval
     */
    useEffect(() => {
        if (!autoSyncEnabled || autoSyncInterval <= 0) {
            // Clear existing timer
            if (autoSyncTimerRef.current) {
                clearInterval(autoSyncTimerRef.current);
                autoSyncTimerRef.current = null;
            }
            return;
        }

        logger.info('SyncController', 'Setting up auto-sync', {
            interval: autoSyncInterval
        });

        // Clear existing timer
        if (autoSyncTimerRef.current) {
            clearInterval(autoSyncTimerRef.current);
        }

        // Setup new timer
        autoSyncTimerRef.current = setInterval(() => {
            logger.info('SyncController', 'Auto-sync triggered');
            sync().catch((error) => {
                logger.error('SyncController', 'Auto-sync failed', { error });
            });
        }, autoSyncInterval * 1000);

        // Cleanup on unmount
        return () => {
            if (autoSyncTimerRef.current) {
                clearInterval(autoSyncTimerRef.current);
                autoSyncTimerRef.current = null;
            }
        };
    }, [autoSyncEnabled, autoSyncInterval, sync]);

    /**
     * Cleanup adapter when working mode changes
     */
    useEffect(() => {
        return () => {
            if (adapterRef.current) {
                adapterRef.current.disconnect().catch(console.error);
                adapterRef.current = null;
            }
        };
    }, [workingMode]);

    return {
        connect,
        disconnect,
        sync,
        upload,
        syncState,
        workingMode,
        autoSyncEnabled,
    };
}
