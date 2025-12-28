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
    autoSyncEnabled: boolean;
    onSpaceUpdate: (spaces: Space[]) => void;
}

export function useSyncController({
    sftpCredentials,
    solumConfig,
    csvConfig,
    autoSyncEnabled: autoSyncEnabledProp,
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
        setAutoSyncEnabled,
        setAutoSyncInterval,
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

        if (!adapterRef.current) {
            // Should not happen as we throw above if config missing
            throw new Error('Adapter initialization failed');
        }
        return adapterRef.current;
    }, [workingMode, sftpCredentials, solumConfig, csvConfig, solumTokens, setSolumTokens]);

    /**
     * Sync tokens from settings to store
     * This ensures that when user disconnects in settings, the sync store is updated
     */
    useEffect(() => {
        if (workingMode === 'SOLUM_API') {
            // If settings cleared tokens, clear them in store
            if (!solumConfig?.tokens && solumTokens) {
                logger.info('SyncController', 'Tokens cleared in settings, updating store');
                setSolumTokens(null);
            }
            // Optional: If settings have new tokens, update store (managed by login flow usually, but safe to have)
            else if (solumConfig?.tokens && (!solumTokens || solumConfig.tokens.accessToken !== solumTokens.accessToken)) {
                setSolumTokens(solumConfig.tokens);
            }
        }
    }, [workingMode, solumConfig, solumTokens, setSolumTokens]);

    /**
     * Sync settings to store
     */
    useEffect(() => {
        // Sync enabled state
        if (autoSyncEnabledProp !== autoSyncEnabled) {
            setAutoSyncEnabled(autoSyncEnabledProp);
        }

        // Sync interval if in SoluM mode
        if (workingMode === 'SOLUM_API' && solumConfig?.syncInterval) {
            if (solumConfig.syncInterval !== autoSyncInterval) {
                setAutoSyncInterval(solumConfig.syncInterval);
            }
        }
    }, [autoSyncEnabledProp, autoSyncEnabled, setAutoSyncEnabled, workingMode, solumConfig, autoSyncInterval, setAutoSyncInterval]);

    /**
     * Initialize state from adapter on mount/change
     */
    useEffect(() => {
        // Handle explicit disconnect (tokens removed)
        if (workingMode === 'SOLUM_API' && !solumTokens) {
            if (syncState.isConnected) {
                logger.info('SyncController', 'SoluM tokens removed, disconnecting');
            }

            if (adapterRef.current) {
                adapterRef.current.disconnect().catch(console.error);
                adapterRef.current = null;
            }

            if (syncState.isConnected || syncState.status !== 'disconnected') {
                setSyncState({
                    status: 'disconnected',
                    isConnected: false,
                });
            }
            return;
        }

        try {
            const adapter = getAdapter();
            const status = adapter.getStatus();

            // Aggressively set connected state if we have SoluM tokens to prevent "Disconnected" flash
            if (status.isConnected || (workingMode === 'SOLUM_API' && solumTokens)) {
                setSyncState({
                    ...status,
                    isConnected: true,
                    status: 'connected'
                });
            } else if (status.isConnected) {
                setSyncState(status);
            }
        } catch (e) {
            // Ignore initialization errors
        }
    }, [getAdapter, setSyncState, workingMode, solumTokens]);

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
    // Keep a ref to the sync function to avoid resetting the timer when sync dependencies change
    const syncRef = useRef(sync);
    useEffect(() => {
        syncRef.current = sync;
    }, [sync]);

    /**
     * Setup auto-sync interval
     */
    useEffect(() => {
        logger.info('SyncController', 'Auto-sync effect triggered', {
            enabled: autoSyncEnabled,
            interval: autoSyncInterval,
            hasTimer: !!autoSyncTimerRef.current
        });

        if (!autoSyncEnabled || autoSyncInterval <= 0) {
            // Clear existing timer
            if (autoSyncTimerRef.current) {
                logger.info('SyncController', 'Clearing auto-sync timer (disabled/invalid)');
                clearInterval(autoSyncTimerRef.current);
                autoSyncTimerRef.current = null;
            }
            return;
        }

        logger.info('SyncController', 'Setting up auto-sync timer', {
            interval: autoSyncInterval
        });

        // Clear existing timer
        if (autoSyncTimerRef.current) {
            clearInterval(autoSyncTimerRef.current);
        }

        // Setup new timer
        autoSyncTimerRef.current = setInterval(() => {
            logger.info('SyncController', 'Auto-sync triggered by timer');
            syncRef.current().catch((error) => {
                logger.error('SyncController', 'Auto-sync failed', { error });
            });
        }, autoSyncInterval * 1000);

        // Cleanup on unmount
        return () => {
            if (autoSyncTimerRef.current) {
                logger.info('SyncController', 'Cleaning up auto-sync timer due to dep change/unmount');
                clearInterval(autoSyncTimerRef.current);
                autoSyncTimerRef.current = null;
            }
        };
    }, [autoSyncEnabled, autoSyncInterval]); // Removed sync from dependencies

    /**
     * Cleanup adapter when dependencies change
     * This forces recreation of the adapter with new credentials/tokens
     */
    useEffect(() => {
        // We simply clear the ref. The next call to getAdapter() will create a new one.
        // We don't disconnect() here because we want to maintain the session if we're just updating tokens.
        adapterRef.current = null;
    }, [workingMode, sftpCredentials, solumConfig, csvConfig, solumTokens]);

    /**
     * Component unmount cleanup
     */
    useEffect(() => {
        return () => {
            // Only disconnect on unmount, not on dep change
            if (adapterRef.current) {
                adapterRef.current.disconnect().catch(console.error);
                adapterRef.current = null;
            }
        };
    }, []);

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
