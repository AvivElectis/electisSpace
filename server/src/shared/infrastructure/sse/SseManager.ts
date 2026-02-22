/**
 * Server-Sent Events (SSE) Manager
 * 
 * Manages SSE connections per store. When a people mutation occurs,
 * the relevant store's connections are notified so all clients
 * see the same current table state.
 * 
 * Events:
 *   people:changed     — people table was modified (create/delete/assign/unassign/load-list)
 *   list:loaded        — a user loaded a list (includes list name + who loaded it)
 *   list:freed         — a user freed the loaded list
 *   list:updated       — a user updated a list's content
 *   conference:changed — conference room was modified (create/update/delete/toggle)
 */
import { Response } from 'express';
import { appLogger } from '../services/appLogger.js';

export interface SseClient {
    id: string;       // unique connection ID
    res: Response;
    storeId: string;
    userId: string;
    userName?: string;
}

export interface StoreEvent {
    type: 'people:changed' | 'list:loaded' | 'list:freed' | 'list:updated' | 'conference:changed';
    payload: Record<string, unknown>;
    /** If set, this client will NOT receive the event (originator) */
    excludeClientId?: string;
}

// Connection limits to prevent resource exhaustion
const MAX_TOTAL_CONNECTIONS = 500;
const MAX_CONNECTIONS_PER_STORE = 50;

class SseManager {
    private clients: Map<string, SseClient> = new Map();

    /**
     * Register a new SSE client connection.
     * Returns false if connection limits are exceeded.
     */
    addClient(client: SseClient): boolean {
        // Enforce total connection limit
        if (this.clients.size >= MAX_TOTAL_CONNECTIONS) {
            appLogger.warn('SSE', `Total connection limit reached (${MAX_TOTAL_CONNECTIONS}), rejecting client ${client.id}`);
            return false;
        }

        // Enforce per-store connection limit
        const storeCount = this.getStoreClientCount(client.storeId);
        if (storeCount >= MAX_CONNECTIONS_PER_STORE) {
            appLogger.warn('SSE', `Store ${client.storeId} connection limit reached (${MAX_CONNECTIONS_PER_STORE}), rejecting client ${client.id}`);
            return false;
        }

        this.clients.set(client.id, client);
        appLogger.info('SSE', `Client connected: ${client.id} (store=${client.storeId}, user=${client.userId}). Total: ${this.clients.size}`);

        // Send initial connection confirmation
        this.sendToClient(client, {
            type: 'connected',
            clientId: client.id,
            timestamp: new Date().toISOString(),
        });

        return true;
    }

    /**
     * Remove a client connection (on disconnect)
     */
    removeClient(clientId: string): void {
        this.clients.delete(clientId);
        appLogger.info('SSE', `Client disconnected: ${clientId}. Total: ${this.clients.size}`);
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
        appLogger.info('SSE', `Broadcast ${event.type} to store ${storeId}: ${sent} clients`);
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
            appLogger.warn('SSE', `Failed to send to client ${client.id}, removing`);
            this.removeClient(client.id);
        }
    }
}

// Singleton
export const sseManager = new SseManager();
