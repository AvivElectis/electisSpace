/**
 * Server-Sent Events (SSE) Manager
 * 
 * Manages SSE connections per store. When a people mutation occurs,
 * the relevant store's connections are notified so all clients
 * see the same current table state.
 * 
 * Events:
 *   people:changed  — people table was modified (create/delete/assign/unassign/load-list)
 *   list:loaded     — a user loaded a list (includes list name + who loaded it)
 *   list:freed      — a user freed the loaded list
 */
import { Response } from 'express';

export interface SseClient {
    id: string;       // unique connection ID
    res: Response;
    storeId: string;
    userId: string;
    userName?: string;
}

export interface StoreEvent {
    type: 'people:changed' | 'list:loaded' | 'list:freed';
    payload: Record<string, unknown>;
    /** If set, this client will NOT receive the event (originator) */
    excludeClientId?: string;
}

class SseManager {
    private clients: Map<string, SseClient> = new Map();

    /**
     * Register a new SSE client connection
     */
    addClient(client: SseClient): void {
        this.clients.set(client.id, client);
        console.log(`[SSE] Client connected: ${client.id} (store=${client.storeId}, user=${client.userId}). Total: ${this.clients.size}`);

        // Send initial connection confirmation
        this.sendToClient(client, {
            type: 'connected',
            clientId: client.id,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Remove a client connection (on disconnect)
     */
    removeClient(clientId: string): void {
        this.clients.delete(clientId);
        console.log(`[SSE] Client disconnected: ${clientId}. Total: ${this.clients.size}`);
    }

    /**
     * Broadcast an event to all clients connected to a specific store
     */
    broadcastToStore(storeId: string, event: StoreEvent): void {
        let sent = 0;
        for (const [id, client] of this.clients) {
            if (client.storeId === storeId) {
                if (event.excludeClientId && id === event.excludeClientId) {
                    continue; // Skip the originator
                }
                this.sendToClient(client, {
                    type: event.type,
                    ...event.payload,
                    timestamp: new Date().toISOString(),
                });
                sent++;
            }
        }
        console.log(`[SSE] Broadcast ${event.type} to store ${storeId}: ${sent} clients`);
    }

    /**
     * Get count of connected clients for a store
     */
    getStoreClientCount(storeId: string): number {
        let count = 0;
        for (const client of this.clients.values()) {
            if (client.storeId === storeId) count++;
        }
        return count;
    }

    private sendToClient(client: SseClient, data: Record<string, unknown>): void {
        try {
            client.res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
            // Connection broken — clean up
            console.warn(`[SSE] Failed to send to client ${client.id}, removing`);
            this.removeClient(client.id);
        }
    }
}

// Singleton
export const sseManager = new SseManager();
