import { useCallback, useEffect, useRef } from 'react';
import { useSyncStore } from '../infrastructure/syncStore';
import { useConferenceStore } from '@features/conference/infrastructure/conferenceStore';
import { SolumSyncAdapter } from '../infrastructure/SolumSyncAdapter';
import type { SyncAdapter } from '../domain/types';
import type { Space, ConferenceRoom, SolumConfig, CSVConfig } from '@shared/domain/types';
import { logger } from '@shared/infrastructure/services/logger';
import type { SolumMappingConfig } from '@features/settings/domain/types';

/**
 * @deprecated This hook is deprecated. Use useBackendSyncController instead.
 * 
 * The legacy useSyncController makes direct AIMS API calls from the frontend.
 * The new useBackendSyncController routes all sync operations through the backend,
 * which handles AIMS communication via the SyncQueue.
 * 
 * Migration: Replace useSyncController with useBackendSyncController
 * 
 * Legacy Sync Controller Hook
 * Main orchestration for sync operations using SoluM API (DEPRECATED)
 */

interface UseSyncControllerProps {
    solumConfig?: SolumConfig;
    csvConfig: CSVConfig;
    autoSyncEnabled: boolean;
    autoSyncInterval?: number;  // Auto-sync interval in seconds (from settings)
    onSpaceUpdate: (spaces: Space[]) => void;
    onConferenceUpdate?: (conferenceRooms: ConferenceRoom[]) => void;
    solumMappingConfig?: SolumMappingConfig;
    isConnected?: boolean;  // Connection status from settings
}

export function useSyncController({
    solumConfig,
    csvConfig,
    autoSyncEnabled: autoSyncEnabledProp,
    autoSyncInterval: autoSyncIntervalProp,
    onSpaceUpdate,
    onConferenceUpdate,
    solumMappingConfig,
    isConnected: isConnectedProp,
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
    const lastWorkingModeRef = useRef<string>(workingMode);

    // Clear adapter when working mode changes
    useEffect(() => {
        if (lastWorkingModeRef.current !== workingMode) {
            logger.info('SyncController', `Working mode changed from ${lastWorkingModeRef.current} to ${workingMode}, clearing adapter`);
            if (adapterRef.current) {
                adapterRef.current.disconnect().catch(() => {/* ignore */});
                adapterRef.current = null;
            }
            lastWorkingModeRef.current = workingMode;
        }
    }, [workingMode]);

    /**
     * Get current adapter (SoluM only)
     */
    const getAdapter = useCallback((): SyncAdapter => {
        // Reuse existing adapter if available
        if (adapterRef.current) {
            return adapterRef.current;
        }

        if (!solumConfig) {
            throw new Error('SoluM configuration not configured');
        }
        logger.info('SyncController', 'Creating SoluM adapter', {
            hasConfig: !!solumMappingConfig,
            fields: solumMappingConfig?.fields ? Object.keys(solumMappingConfig.fields) : []
        });
        adapterRef.current = new SolumSyncAdapter(
            solumConfig,
            csvConfig,
            (tokens) => setSolumTokens(tokens),
            solumTokens || undefined,
            solumMappingConfig
        );

        if (!adapterRef.current) {
            throw new Error('Adapter initialization failed');
        }
        return adapterRef.current;
    }, [solumConfig, csvConfig, solumTokens, setSolumTokens, solumMappingConfig]);

    /**
     * Sync tokens from settings to store
     * This ensures that when user disconnects in settings, the sync store is updated
     */
    useEffect(() => {
        // If settings cleared tokens, clear them in store
        if (!solumConfig?.tokens && solumTokens) {
                logger.info('SyncController', 'Tokens cleared in settings, updating store');
            setSolumTokens(null);
        }
        // Optional: If settings have new tokens, update store (managed by login flow usually, but safe to have)
        else if (solumConfig?.tokens && (!solumTokens || solumConfig.tokens.accessToken !== solumTokens.accessToken)) {
            setSolumTokens(solumConfig.tokens);
        }
    }, [solumConfig, solumTokens, setSolumTokens]);

    /**
     * Sync settings to store
     */
    useEffect(() => {
        // Sync enabled state
        if (autoSyncEnabledProp !== autoSyncEnabled) {
            setAutoSyncEnabled(autoSyncEnabledProp);
        }

        // Sync interval from solumConfig
        if (solumConfig?.syncInterval && solumConfig.syncInterval !== autoSyncInterval) {
            setAutoSyncInterval(solumConfig.syncInterval);
        }
    }, [autoSyncEnabledProp, autoSyncEnabled, setAutoSyncEnabled, solumConfig, autoSyncInterval, setAutoSyncInterval, autoSyncIntervalProp]);

    /**
     * Handle disconnect from settings
     * When isConnectedProp changes to false, clean up the adapter and reset state
     */
    useEffect(() => {
        if (!isConnectedProp) {
            logger.info('SyncController', 'Connection status changed to disconnected');
            
            // Clear the adapter
            if (adapterRef.current) {
                adapterRef.current.disconnect().catch(() => {/* ignore */});
                adapterRef.current = null;
                logger.info('SyncController', 'Adapter cleared');
            }
            
            // Reset sync state to disconnected
            if (syncState.isConnected || syncState.status !== 'disconnected') {
                setSyncState({
                    status: 'disconnected',
                    isConnected: false,
                });
                logger.info('SyncController', 'Sync state reset to disconnected');
            }
        }
    }, [isConnectedProp, syncState.isConnected, syncState.status, setSyncState]);

    /**
     * Initialize state from adapter on mount/change
     */
    useEffect(() => {
        // Handle explicit disconnect (tokens removed)
        if (!solumTokens) {
            if (syncState.isConnected) {
                logger.info('SyncController', 'SoluM tokens removed, disconnecting');
            }

            if (adapterRef.current) {
                adapterRef.current.disconnect().catch(() => {/* console.error */ });
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
            if (status.isConnected || solumTokens) {
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
    }, [getAdapter, setSyncState, solumTokens]);

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
        logger.info('Sync', 'Starting sync', { mode: workingMode });
        logger.startTimer('sync-download');

        try {
            setSyncState({ status: 'syncing', progress: 0 });

            const adapter = getAdapter();

            // Ensure connected
            if (!syncState.isConnected) {
                await adapter.connect();
            }

            // SoluM mode: just download spaces
            const spaces = await adapter.download();

            // Update spaces in parent
            onSpaceUpdate(spaces);

            const status = adapter.getStatus();
            setSyncState(status);

            logger.endTimer('sync-download', 'Sync', 'Sync download completed', { 
                spacesCount: spaces.length,
                mode: workingMode 
            });
        } catch (error) {
            logger.endTimer('sync-download', 'Sync', 'Sync download failed', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            logger.error('Sync', 'Sync failed', { error });
            setSyncState({
                status: 'error',
                lastError: error instanceof Error ? error.message : 'Sync failed',
                progress: 0,
            });
            throw error;
        }
    }, [workingMode, syncState.isConnected, getAdapter, onSpaceUpdate, onConferenceUpdate, setSyncState]);

    /**
     * Upload space data
     */
    const upload = useCallback(async (spaces: Space[]): Promise<void> => {
        logger.info('Sync', 'Uploading spaces', { 
            count: spaces.length,
        });
        logger.startTimer('sync-upload');

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

            logger.endTimer('sync-upload', 'Sync', 'Upload completed', { 
                spacesCount: spaces.length,
            });
        } catch (error) {
            logger.endTimer('sync-upload', 'Sync', 'Upload failed', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            logger.error('Sync', 'Upload failed', { error });
            setSyncState({
                status: 'error',
                lastError: error instanceof Error ? error.message : 'Upload failed',
                progress: 0,
            });
            throw error;
        }
    }, [workingMode, syncState.isConnected, getAdapter, setSyncState]);

    /**
     * Safe upload space data (Fetch -> Merge -> Push)
     */
    const safeUpload = useCallback(async (spaces: Space[]): Promise<void> => {
        logger.info('SyncController', 'Safe Uploading spaces', { 
            count: spaces.length,
        });

        try {
            setSyncState({ status: 'syncing', progress: 0 });

            const adapter = getAdapter();

            // Ensure connected
            if (!syncState.isConnected) {
                await adapter.connect();
            }

            await adapter.safeUpload(spaces);

            const status = adapter.getStatus();
            setSyncState(status);

            logger.info('SyncController', 'Safe Upload complete');
        } catch (error) {
            logger.error('SyncController', 'Safe Upload failed', { error });
            setSyncState({
                status: 'error',
                lastError: error instanceof Error ? error.message : 'Safe Upload failed',
                progress: 0,
            });
            throw error;
        }
    }, [workingMode, syncState.isConnected, getAdapter, setSyncState]);

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
     * Only runs when connected and enabled
     */
    useEffect(() => {
        const shouldAutoSync = autoSyncEnabled && autoSyncInterval > 0 && isConnectedProp;
        
        logger.info('SyncController', 'Auto-sync effect triggered', {
            enabled: autoSyncEnabled,
            interval: autoSyncInterval,
            isConnected: isConnectedProp,
            shouldAutoSync,
            hasTimer: !!autoSyncTimerRef.current
        });

        if (!shouldAutoSync) {
            // Clear existing timer
            if (autoSyncTimerRef.current) {
                logger.info('SyncController', 'Clearing auto-sync timer (disabled/disconnected)', {
                    reason: !autoSyncEnabled ? 'disabled' : !isConnectedProp ? 'disconnected' : 'invalid interval'
                });
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
            // Double-check connection before syncing
            if (!isConnectedProp) {
                logger.warn('SyncController', 'Auto-sync skipped - not connected');
                return;
            }
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
    }, [autoSyncEnabled, autoSyncInterval, isConnectedProp]); // Added isConnectedProp

    /**
     * Cleanup adapter when dependencies change
     * This forces recreation of the adapter with new credentials/tokens
     */
    useEffect(() => {
        // We simply clear the ref. The next call to getAdapter() will create a new one.
        // We don't disconnect() here because we want to maintain the session if we're just updating tokens.
        adapterRef.current = null;
    }, [workingMode, solumConfig, csvConfig, solumTokens, solumMappingConfig]);

    /**
     * Component unmount cleanup
     */
    useEffect(() => {
        return () => {
            // Only disconnect on unmount, not on dep change
            if (adapterRef.current) {
                adapterRef.current.disconnect().catch(() => {/* console.error */ });
                adapterRef.current = null;
            }
        };
    }, []);

    return {
        connect,
        disconnect,
        sync,
        upload,
        safeUpload,
        syncState,
        workingMode,
        autoSyncEnabled,
    };
}
