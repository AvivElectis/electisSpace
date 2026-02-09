/**
 * Store Events Service — SSE client for real-time store updates
 * 
 * Subscribes to server-sent events for a specific store.
 * Used by useStoreEvents hook to keep all clients in sync.
 */
import { tokenManager } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export type StoreEventType = 'connected' | 'people:changed' | 'list:loaded' | 'list:freed' | 'list:updated' | 'conference:changed';

export interface StoreEvent {
    type: StoreEventType;
    timestamp: string;
    // people:changed, conference:changed
    action?: 'create' | 'delete' | 'assign' | 'unassign' | 'update' | 'toggle';
    personId?: string;
    spaceId?: string;
    // list:loaded
    listId?: string;
    listName?: string;
    loadedBy?: string;
    loadedByName?: string;
    peopleCount?: number;
    // list:freed
    freedBy?: string;
    freedByName?: string;
    // list:updated
    updatedBy?: string;
    updatedByName?: string;
    // conference:changed
    roomId?: string;
    hasMeeting?: boolean;
    userName?: string;
    // connected
    clientId?: string;
}

export type StoreEventHandler = (event: StoreEvent) => void;

/**
 * Create an SSE connection to the store events endpoint.
 * Returns a clientId (from the 'connected' event) and a cleanup function.
 * 
 * Note: EventSource doesn't support custom headers, so we pass the token
 * as a query parameter. The server should accept token from query OR header.
 */
export function connectToStoreEvents(
    storeId: string,
    onEvent: StoreEventHandler,
    onError?: (error: Event) => void,
): { getClientId: () => string | null; disconnect: () => void } {
    let clientId: string | null = null;
    let eventSource: EventSource | null = null;

    const token = tokenManager.getAccessToken();
    const url = `${API_BASE_URL}/stores/${storeId}/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    console.log('[StoreEventsService] Connecting to SSE:', { url: url.replace(/token=[^&]+/, 'token=***'), storeId });

    eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onmessage = (e) => {
        try {
            const data: StoreEvent = JSON.parse(e.data);
            console.log('[StoreEventsService] SSE message received:', data.type, data);
            if (data.type === 'connected') {
                clientId = data.clientId || null;
                console.log('[StoreEventsService] SSE connected, clientId:', clientId);
            }
            onEvent(data);
        } catch (err) {
            console.error('[StoreEventsService] Failed to parse SSE message:', err);
            // Ignore malformed events
        }
    };

    eventSource.onerror = (e) => {
        console.error('[StoreEventsService] SSE error:', e, 'readyState:', eventSource?.readyState);
        if (onError) onError(e);
    };

    eventSource.onopen = () => {
        console.log('[StoreEventsService] SSE connection opened');
    };

    return {
        getClientId: () => clientId,
        disconnect: () => {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
        },
    };
}
