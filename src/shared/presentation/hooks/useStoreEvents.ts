/**
 * useStoreEvents — React hook for real-time store updates via SSE
 * 
 * Connects to the server's SSE endpoint for the active store.
 * Automatically refetches people when changes are made by other users.
 * Shows toast alerts when another user loads or frees a list.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import { connectToStoreEvents, type StoreEvent } from '@shared/infrastructure/services/storeEventsService';
import { setSseClientId } from '@shared/infrastructure/services/sseClientId';
import { logger } from '@shared/infrastructure/services/logger';

interface UseStoreEventsOptions {
    /** Called when another user loads a list */
    onListLoaded?: (event: StoreEvent) => void;
    /** Called when another user frees a list */
    onListFreed?: (event: StoreEvent) => void;
    /** Called when people data changed by another user */
    onPeopleChanged?: (event: StoreEvent) => void;
    /** Called when another user updates a list */
    onListUpdated?: (event: StoreEvent) => void;
    /** Called when conference data changed by another user */
    onConferenceChanged?: (event: StoreEvent) => void;
}

export function useStoreEvents(options: UseStoreEventsOptions = {}) {
    const activeStoreId = useAuthStore(state => state.activeStoreId);
    const fetchPeople = usePeopleStore(state => state.fetchPeople);
    const disconnectRef = useRef<(() => void) | null>(null);
    const getClientIdRef = useRef<(() => string | null) | null>(null);

    // Store options in ref to avoid re-connecting on every render
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const handleEvent = useCallback((event: StoreEvent) => {
        switch (event.type) {
            case 'connected':
                setSseClientId(event.clientId || null);
                logger.info('StoreEvents', 'SSE connected', { clientId: event.clientId });
                break;

            case 'people:changed':
                logger.info('StoreEvents', 'People changed by another user', { action: event.action, personId: event.personId });
                // Refetch people from server to stay in sync
                fetchPeople().catch(err => {
                    logger.warn('StoreEvents', 'Failed to refetch people after SSE event', { error: err.message });
                });
                optionsRef.current.onPeopleChanged?.(event);
                break;

            case 'list:loaded':
                logger.info('StoreEvents', 'List loaded by another user', {
                    listName: event.listName,
                    loadedBy: event.loadedByName,
                });
                // Another user loaded a list — refetch to get the new people set
                fetchPeople().catch(err => {
                    logger.warn('StoreEvents', 'Failed to refetch after list:loaded', { error: err.message });
                });
                // Update local list tracking
                if (event.listId) {
                    usePeopleStore.getState().setActiveListId(event.listId);
                    usePeopleStore.getState().setActiveListName(event.listName);
                    usePeopleStore.getState().clearPendingChanges();
                }
                optionsRef.current.onListLoaded?.(event);
                break;

            case 'list:freed':
                logger.info('StoreEvents', 'List freed by another user', {
                    freedBy: event.freedByName,
                });
                // Clear local list tracking
                usePeopleStore.getState().setActiveListId(undefined);
                usePeopleStore.getState().setActiveListName(undefined);
                usePeopleStore.getState().clearPendingChanges();
                optionsRef.current.onListFreed?.(event);
                break;

            case 'list:updated':
                logger.info('StoreEvents', 'List updated by another user', {
                    listName: event.listName,
                    updatedBy: event.updatedByName,
                });
                // Another user updated a list — refetch to get the latest content
                fetchPeople().catch(err => {
                    logger.warn('StoreEvents', 'Failed to refetch after list:updated', { error: err.message });
                });
                optionsRef.current.onListUpdated?.(event);
                break;

            case 'conference:changed':
                logger.info('StoreEvents', 'Conference changed by another user', {
                    action: event.action,
                    roomId: event.roomId,
                });
                // Notify callback (component will refetch conference rooms)
                optionsRef.current.onConferenceChanged?.(event);
                break;
        }
    }, [fetchPeople]);

    useEffect(() => {
        if (!activeStoreId) {
            // Clean up any existing connection
            if (disconnectRef.current) {
                disconnectRef.current();
                disconnectRef.current = null;
                getClientIdRef.current = null;
                setSseClientId(null);
            }
            return;
        }

        logger.info('StoreEvents', 'Connecting to SSE', { storeId: activeStoreId });

        const { getClientId, disconnect } = connectToStoreEvents(
            activeStoreId,
            handleEvent,
            (_error) => {
                logger.warn('StoreEvents', 'SSE connection error, will auto-reconnect');
            },
        );

        disconnectRef.current = disconnect;
        getClientIdRef.current = getClientId;

        return () => {
            logger.info('StoreEvents', 'Disconnecting SSE');
            disconnect();
            disconnectRef.current = null;
            getClientIdRef.current = null;
            setSseClientId(null);
        };
        // handleEvent is memoized with useCallback and uses stable Zustand actions
        // Only reconnect when activeStoreId changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStoreId]);

    return {
        getClientId: () => getClientIdRef.current?.() || null,
    };
}
