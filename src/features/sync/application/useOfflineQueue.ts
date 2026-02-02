/**
 * useOfflineQueue Hook
 * 
 * Hook for managing offline operations queue.
 * Automatically syncs queued items when back online.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useOfflineQueueStore, type OfflineQueueItem, type OfflineEntityType, type OfflineOperationType } from '../infrastructure/offlineQueueStore';
import { spacesApi } from '@shared/infrastructure/services/spacesApi';
import { peopleApi } from '@shared/infrastructure/services/peopleApi';
import { conferenceApi } from '@shared/infrastructure/services/conferenceApi';
import { logger } from '@shared/infrastructure/services/logger';

interface UseOfflineQueueOptions {
    storeId: string | null;
    autoSync?: boolean;
    maxRetries?: number;
    retryDelay?: number;  // ms
    onSyncComplete?: (succeeded: number, failed: number) => void;
    onItemSynced?: (item: OfflineQueueItem) => void;
    onItemFailed?: (item: OfflineQueueItem, error: Error) => void;
}

export function useOfflineQueue({
    storeId,
    autoSync = true,
    maxRetries = 3,
    retryDelay = 5000,
    onSyncComplete,
    onItemSynced,
    onItemFailed,
}: UseOfflineQueueOptions) {
    const {
        isOnline,
        isSyncing,
        addItem,
        removeItem,
        clearItems,
        markError,
        incrementRetry,
        setOnline,
        setSyncing,
        setLastSyncAttempt,
        getItemsByStore,
        getPendingCount,
    } = useOfflineQueueStore();

    const syncingRef = useRef(false);

    // Listen for online/offline events
    useEffect(() => {
        const handleOnline = () => {
            logger.info('OfflineQueue', 'Back online');
            setOnline(true);
        };

        const handleOffline = () => {
            logger.info('OfflineQueue', 'Gone offline');
            setOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Set initial state
        setOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [setOnline]);

    /**
     * Process a single queued item
     */
    const processItem = useCallback(async (item: OfflineQueueItem): Promise<boolean> => {
        try {
            const { entityType, operation, payload, entityId } = item;

            switch (entityType) {
                case 'space':
                    if (operation === 'CREATE') {
                        await spacesApi.create(payload as any);
                    } else if (operation === 'UPDATE' && entityId) {
                        await spacesApi.update(entityId, payload as any);
                    } else if (operation === 'DELETE' && entityId) {
                        await spacesApi.delete(entityId);
                    }
                    break;

                case 'person':
                    if (operation === 'CREATE') {
                        await peopleApi.create(payload as any);
                    } else if (operation === 'UPDATE' && entityId) {
                        await peopleApi.update(entityId, payload as any);
                    } else if (operation === 'DELETE' && entityId) {
                        await peopleApi.delete(entityId);
                    }
                    break;

                case 'conferenceRoom':
                    if (operation === 'CREATE') {
                        await conferenceApi.create(payload as any);
                    } else if (operation === 'UPDATE' && entityId) {
                        await conferenceApi.update(entityId, payload as any);
                    } else if (operation === 'DELETE' && entityId) {
                        await conferenceApi.delete(entityId);
                    }
                    break;

                case 'peopleList':
                    if (operation === 'CREATE') {
                        await peopleApi.lists.create(payload as any);
                    } else if (operation === 'UPDATE' && entityId) {
                        await peopleApi.lists.update(entityId, payload as any);
                    } else if (operation === 'DELETE' && entityId) {
                        await peopleApi.lists.delete(entityId);
                    }
                    break;
            }

            return true;
        } catch (error) {
            logger.error('OfflineQueue', `Failed to process item ${item.id}`, { error });
            return false;
        }
    }, []);

    /**
     * Sync all pending items for the current store
     */
    const syncQueue = useCallback(async (): Promise<{ succeeded: number; failed: number }> => {
        if (!storeId || syncingRef.current) {
            return { succeeded: 0, failed: 0 };
        }

        const pendingItems = getItemsByStore(storeId);
        if (pendingItems.length === 0) {
            return { succeeded: 0, failed: 0 };
        }

        logger.info('OfflineQueue', `Starting sync of ${pendingItems.length} items`);
        syncingRef.current = true;
        setSyncing(true);
        setLastSyncAttempt(Date.now());

        let succeeded = 0;
        let failed = 0;

        // Process items in order (oldest first)
        const sortedItems = [...pendingItems].sort((a, b) => a.timestamp - b.timestamp);

        for (const item of sortedItems) {
            if (item.retryCount >= maxRetries) {
                logger.warn('OfflineQueue', `Item ${item.id} exceeded max retries, skipping`);
                failed++;
                continue;
            }

            const success = await processItem(item);

            if (success) {
                removeItem(item.id);
                succeeded++;
                onItemSynced?.(item);
                logger.info('OfflineQueue', `Successfully synced item ${item.id}`);
            } else {
                incrementRetry(item.id);
                markError(item.id, 'Sync failed');
                failed++;
                onItemFailed?.(item, new Error('Sync failed'));
            }

            // Small delay between items to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        syncingRef.current = false;
        setSyncing(false);

        logger.info('OfflineQueue', `Sync complete: ${succeeded} succeeded, ${failed} failed`);
        onSyncComplete?.(succeeded, failed);

        return { succeeded, failed };
    }, [
        storeId,
        getItemsByStore,
        processItem,
        removeItem,
        incrementRetry,
        markError,
        maxRetries,
        setSyncing,
        setLastSyncAttempt,
        onSyncComplete,
        onItemSynced,
        onItemFailed,
    ]);

    // Auto-sync when back online
    useEffect(() => {
        if (!autoSync || !isOnline || !storeId) return;

        const pendingCount = getPendingCount(storeId);
        if (pendingCount > 0 && !syncingRef.current) {
            logger.info('OfflineQueue', `Auto-syncing ${pendingCount} items after coming online`);
            // Small delay before syncing
            const timeout = setTimeout(() => {
                syncQueue();
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [isOnline, storeId, autoSync, getPendingCount, syncQueue]);

    // Retry failed items periodically
    useEffect(() => {
        if (!autoSync || !isOnline || !storeId) return;

        const interval = setInterval(() => {
            const pendingItems = getItemsByStore(storeId);
            const hasRetryable = pendingItems.some(item => item.retryCount < maxRetries);
            
            if (hasRetryable && !syncingRef.current) {
                syncQueue();
            }
        }, retryDelay);

        return () => clearInterval(interval);
    }, [autoSync, isOnline, storeId, retryDelay, maxRetries, getItemsByStore, syncQueue]);

    /**
     * Queue an operation for later sync
     */
    const queueOperation = useCallback((
        entityType: OfflineEntityType,
        operation: OfflineOperationType,
        payload: Record<string, unknown>,
        entityId?: string,
    ): string | null => {
        if (!storeId) {
            logger.warn('OfflineQueue', 'Cannot queue operation: no store selected');
            return null;
        }

        const id = addItem({
            entityType,
            entityId,
            operation,
            payload,
            storeId,
        });

        logger.info('OfflineQueue', `Queued ${operation} operation for ${entityType}`, { id, entityId });
        return id;
    }, [storeId, addItem]);

    /**
     * Execute operation with offline fallback
     * Tries to execute immediately, queues for later if offline or failed
     */
    const executeWithFallback = useCallback(async <T>(
        entityType: OfflineEntityType,
        operation: OfflineOperationType,
        payload: Record<string, unknown>,
        executor: () => Promise<T>,
        entityId?: string,
    ): Promise<{ success: boolean; data?: T; queued: boolean }> => {
        if (!isOnline) {
            const id = queueOperation(entityType, operation, payload, entityId);
            return { success: false, queued: !!id };
        }

        try {
            const data = await executor();
            return { success: true, data, queued: false };
        } catch (error) {
            logger.warn('OfflineQueue', `Operation failed, queueing for retry`, { entityType, operation });
            const id = queueOperation(entityType, operation, payload, entityId);
            return { success: false, queued: !!id };
        }
    }, [isOnline, queueOperation]);

    return {
        // State
        isOnline,
        isSyncing,
        pendingCount: storeId ? getPendingCount(storeId) : 0,
        items: storeId ? getItemsByStore(storeId) : [],

        // Actions
        queueOperation,
        executeWithFallback,
        syncQueue,
        clearQueue: () => storeId && clearItems(storeId),
        removeItem,
    };
}
