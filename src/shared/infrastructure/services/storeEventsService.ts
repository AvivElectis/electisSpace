/**
 * Store Events Service — SSE client for real-time store updates
 * 
 * Subscribes to server-sent events for a specific store.
 * Used by useStoreEvents hook to keep all clients in sync.
 */
import { tokenManager } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export type StoreEventType = 'connected' | 'people:changed' | 'list:loaded' | 'list:freed';

export interface StoreEvent {
    type: StoreEventType;
    timestamp: string;
    // people:changed
    action?: 'create' | 'delete' | 'assign' | 'unassign';
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

    eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onmessage = (e) => {
        try {
            const data: StoreEvent = JSON.parse(e.data);
            if (data.type === 'connected') {
                clientId = data.clientId || null;
            }
            onEvent(data);
        } catch {
            // Ignore malformed events
        }
    };

    eventSource.onerror = (e) => {
        if (onError) onError(e);
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
