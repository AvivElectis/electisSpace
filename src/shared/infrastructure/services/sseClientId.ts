/**
 * SSE Client ID Store
 * 
 * Simple module that holds the current SSE client ID.
 * Used by the API interceptor to attach x-sse-client-id header
 * and by useStoreEvents to set the ID on connection.
 * 
 * Kept separate to avoid circular dependencies between apiClient and hooks.
 */

let sseClientId: string | null = null;

export function getSseClientId(): string | null {
    return sseClientId;
}

export function setSseClientId(id: string | null): void {
    sseClientId = id;
}
