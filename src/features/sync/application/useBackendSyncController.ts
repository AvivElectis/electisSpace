import { useCallback, useEffect, useRef, useState } from 'react';
import { useSyncStore } from '../infrastructure/syncStore';
import { syncApi } from '@shared/infrastructure/services/syncApi';
import { spacesApi } from '@shared/infrastructure/services/spacesApi';
import { logger } from '@shared/infrastructure/services/logger';
import type { Space } from '@shared/domain/types';
import type { SyncStatusResponse, PullSyncResult, PushSyncResult } from '@shared/infrastructure/services/syncApi';

/**
 * Backend Sync Controller Hook
 * 
 * This is the new sync controller that routes all sync operations through
 * the backend API. AIMS communication happens server-side via SyncQueue.
 * 
 * Key differences from legacy useSyncController:
 * - No direct AIMS/SoluM API calls from frontend
 * - All sync operations go through backend
 * - Backend handles token management and AIMS auth
 * - Uses REST API instead of SolumSyncAdapter
 */

interface UseBackendSyncControllerProps {
    storeId: string | null;
    autoSyncEnabled: boolean;
    autoSyncInterval?: number;  // in seconds
    onSpaceUpdate?: (spaces: Space[]) => void;
    onSyncComplete?: (result: PullSyncResult | PushSyncResult) => void;
    onError?: (error: Error) => void;
}

export function useBackendSyncController({
    storeId,
    autoSyncEnabled: autoSyncEnabledProp,
    autoSyncInterval: autoSyncIntervalProp = 300,
    onSpaceUpdate,
    onSyncComplete,
    onError,
}: UseBackendSyncControllerProps) {
    const {
        syncState,
        autoSyncEnabled,
        autoSyncInterval,
        setSyncState,
        setAutoSyncEnabled,
        setAutoSyncInterval,
    } = useSyncStore();

    const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
    const autoSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastStoreIdRef = useRef<string | null>(null);

    // Sync settings to store
    useEffect(() => {
        if (autoSyncEnabledProp !== autoSyncEnabled) {
            setAutoSyncEnabled(autoSyncEnabledProp);
        }
        if (autoSyncIntervalProp !== autoSyncInterval) {
            setAutoSyncInterval(autoSyncIntervalProp);
        }
    }, [autoSyncEnabledProp, autoSyncEnabled, setAutoSyncEnabled, autoSyncIntervalProp, autoSyncInterval, setAutoSyncInterval]);

    // Reset state when store changes
    useEffect(() => {
        if (lastStoreIdRef.current !== storeId) {
            logger.info('BackendSyncController', `Store changed from ${lastStoreIdRef.current} to ${storeId}`);
            lastStoreIdRef.current = storeId;
            setSyncState({
                status: storeId ? 'idle' : 'disconnected',
                isConnected: !!storeId,
            });
            setSyncStatus(null);
        }
    }, [storeId, setSyncState]);

    /**
     * Fetch current sync status from backend
     */
    const refreshStatus = useCallback(async (): Promise<SyncStatusResponse | null> => {
        if (!storeId) {
            return null;
        }

        try {
            const status = await syncApi.getStatus(storeId);
            setSyncStatus(status);
            setSyncState({
                status: status.status === 'syncing' ? 'syncing' : (status.aimsConnected ? 'connected' : 'idle'),
                isConnected: status.aimsConnected,
                lastSync: status.lastSync ? new Date(status.lastSync) : undefined,
            });
            return status;
        } catch (error) {
            logger.error('BackendSyncController', 'Failed to get sync status', { error });
            return null;
        }
    }, [storeId, setSyncState]);

    /**
     * Check AIMS connection health
     */
    const checkConnection = useCallback(async (): Promise<boolean> => {
        if (!storeId) {
            return false;
        }

        try {
            const result = await syncApi.checkConnection(storeId);
            setSyncState({ isConnected: result.connected });
            return result.connected;
        } catch (error) {
            logger.error('BackendSyncController', 'Connection check failed', { error });
            setSyncState({ isConnected: false });
            return false;
        }
    }, [storeId, setSyncState]);

    /**
     * Connect to AIMS through backend
     */
    const connect = useCallback(async (): Promise<void> => {
        if (!storeId) {
            throw new Error('No store selected');
        }

        logger.info('BackendSyncController', 'Connecting to AIMS via backend', { storeId });
        setSyncState({ status: 'connecting' });

        try {
            const result = await syncApi.connect(storeId);
            if (result.success) {
                setSyncState({
                    status: 'connected',
                    isConnected: true,
                });
                logger.info('BackendSyncController', 'Connected successfully');
            } else {
                throw new Error(result.error || 'Connection failed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';
            logger.error('BackendSyncController', 'Connection failed', { error });
            setSyncState({
                status: 'error',
                isConnected: false,
                lastError: errorMessage,
            });
            onError?.(error instanceof Error ? error : new Error(errorMessage));
            throw error;
        }
    }, [storeId, setSyncState, onError]);

    /**
     * Disconnect from AIMS
     */
    const disconnect = useCallback(async (): Promise<void> => {
        if (!storeId) {
            return;
        }

        logger.info('BackendSyncController', 'Disconnecting from AIMS');

        try {
            await syncApi.disconnect(storeId);
        } catch (error) {
            logger.warn('BackendSyncController', 'Disconnect failed', { error });
        }

        setSyncState({
            status: 'disconnected',
            isConnected: false,
        });
    }, [storeId, setSyncState]);

    /**
     * Pull data from AIMS (download)
     */
    const pull = useCallback(async (): Promise<PullSyncResult | null> => {
        if (!storeId) {
            throw new Error('No store selected');
        }

        logger.info('BackendSyncController', 'Starting pull sync', { storeId });
        logger.startTimer('backend-sync-pull');
        setSyncState({ status: 'syncing', progress: 0 });

        try {
            const result = await syncApi.pull(storeId);
            
            // Fetch updated spaces if callback provided
            if (onSpaceUpdate) {
                const spacesResponse = await spacesApi.list({ storeId, limit: 1000 });
                onSpaceUpdate(spacesResponse.data);
            }

            const status = await refreshStatus();
            setSyncState({
                status: 'connected',
                lastSync: status?.lastSync ? new Date(status.lastSync) : new Date(),
            });

            logger.endTimer('backend-sync-pull', 'BackendSyncController', 'Pull completed', { result });
            onSyncComplete?.(result);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Pull sync failed';
            logger.endTimer('backend-sync-pull', 'BackendSyncController', 'Pull failed', { error: errorMessage });
            logger.error('BackendSyncController', 'Pull sync failed', { error });
            setSyncState({
                status: 'error',
                lastError: errorMessage,
                progress: 0,
            });
            onError?.(error instanceof Error ? error : new Error(errorMessage));
            throw error;
        }
    }, [storeId, setSyncState, onSpaceUpdate, onSyncComplete, onError, refreshStatus]);

    /**
     * Push pending changes to AIMS (upload)
     */
    const push = useCallback(async (): Promise<PushSyncResult | null> => {
        if (!storeId) {
            throw new Error('No store selected');
        }

        logger.info('BackendSyncController', 'Starting push sync', { storeId });
        logger.startTimer('backend-sync-push');
        setSyncState({ status: 'syncing', progress: 0 });

        try {
            const result = await syncApi.push(storeId);
            await refreshStatus();

            setSyncState({ status: 'connected' });
            logger.endTimer('backend-sync-push', 'BackendSyncController', 'Push completed', { result });
            onSyncComplete?.(result);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Push sync failed';
            logger.endTimer('backend-sync-push', 'BackendSyncController', 'Push failed', { error: errorMessage });
            logger.error('BackendSyncController', 'Push sync failed', { error });
            setSyncState({
                status: 'error',
                lastError: errorMessage,
                progress: 0,
            });
            onError?.(error instanceof Error ? error : new Error(errorMessage));
            throw error;
        }
    }, [storeId, setSyncState, onSyncComplete, onError, refreshStatus]);

    /**
     * Full sync (pull + push)
     */
    const fullSync = useCallback(async (): Promise<void> => {
        if (!storeId) {
            throw new Error('No store selected');
        }

        logger.info('BackendSyncController', 'Starting full sync', { storeId });
        logger.startTimer('backend-sync-full');
        setSyncState({ status: 'syncing', progress: 0 });

        try {
            const result = await syncApi.fullSync(storeId);

            // Fetch updated spaces if callback provided
            if (onSpaceUpdate) {
                const spacesResponse = await spacesApi.list({ storeId, limit: 1000 });
                onSpaceUpdate(spacesResponse.data);
            }

            await refreshStatus();
            setSyncState({
                status: 'connected',
                lastSync: new Date(),
            });

            logger.endTimer('backend-sync-full', 'BackendSyncController', 'Full sync completed', { result });
            onSyncComplete?.(result.pull);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Full sync failed';
            logger.endTimer('backend-sync-full', 'BackendSyncController', 'Full sync failed', { error: errorMessage });
            logger.error('BackendSyncController', 'Full sync failed', { error });
            setSyncState({
                status: 'error',
                lastError: errorMessage,
                progress: 0,
            });
            onError?.(error instanceof Error ? error : new Error(errorMessage));
            throw error;
        }
    }, [storeId, setSyncState, onSpaceUpdate, onSyncComplete, onError, refreshStatus]);

    // Keep a ref to the sync function to avoid resetting the timer when dependencies change
    const syncRef = useRef(pull);
    useEffect(() => {
        syncRef.current = pull;
    }, [pull]);

    /**
     * Setup auto-sync interval
     */
    useEffect(() => {
        const shouldAutoSync = autoSyncEnabled && autoSyncInterval > 0 && !!storeId;

        logger.info('BackendSyncController', 'Auto-sync effect triggered', {
            enabled: autoSyncEnabled,
            interval: autoSyncInterval,
            storeId,
            shouldAutoSync,
            hasTimer: !!autoSyncTimerRef.current,
        });

        if (!shouldAutoSync) {
            if (autoSyncTimerRef.current) {
                logger.info('BackendSyncController', 'Clearing auto-sync timer');
                clearInterval(autoSyncTimerRef.current);
                autoSyncTimerRef.current = null;
            }
            return;
        }

        logger.info('BackendSyncController', 'Setting up auto-sync timer', { interval: autoSyncInterval });

        if (autoSyncTimerRef.current) {
            clearInterval(autoSyncTimerRef.current);
        }

        autoSyncTimerRef.current = setInterval(() => {
            logger.info('BackendSyncController', 'Auto-sync triggered by timer');
            syncRef.current().catch((error: any) => {
                logger.error('BackendSyncController', 'Auto-sync failed', { error });
                // Stop auto-sync on auth errors to prevent 401 retry loops
                const isAuthError = error?.response?.status === 401 || 
                    error?.response?.status === 403 ||
                    error?.message?.includes('401') ||
                    error?.message?.includes('Unauthorized');
                if (isAuthError && autoSyncTimerRef.current) {
                    logger.warn('BackendSyncController', 'Auth error detected, stopping auto-sync timer');
                    clearInterval(autoSyncTimerRef.current);
                    autoSyncTimerRef.current = null;
                }
            });
        }, autoSyncInterval * 1000);

        return () => {
            if (autoSyncTimerRef.current) {
                logger.info('BackendSyncController', 'Cleaning up auto-sync timer');
                clearInterval(autoSyncTimerRef.current);
                autoSyncTimerRef.current = null;
            }
        };
    }, [autoSyncEnabled, autoSyncInterval, storeId]);

    // Initial status fetch when store changes
    useEffect(() => {
        if (storeId) {
            refreshStatus();
        }
    }, [storeId, refreshStatus]);

    return {
        // Connection
        connect,
        disconnect,
        checkConnection,
        
        // Sync operations
        pull,
        push,
        fullSync,
        refreshStatus,
        
        // State
        syncState,
        syncStatus,
        autoSyncEnabled,
        storeId,
        
        // Legacy compatibility aliases
        sync: pull,          // sync() now means pull
        upload: push,        // upload() now means push
        safeUpload: push,    // safeUpload() now means push (backend handles merge)
    };
}
