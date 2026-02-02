/**
 * Sync Queue Processor
 * 
 * Background job that processes sync queue items.
 * Handles:
 * - Fetching pending items older than 5 seconds
 * - Processing CREATE/UPDATE/DELETE operations
 * - Retry logic with exponential backoff
 * - Updating store lastAimsSyncAt timestamp
 */

import { prisma } from '../../../config/index.js';
import { aimsGateway } from '../services/aimsGateway.js';
import { QueueStatus, SyncStatus } from '@prisma/client';

// Processing delay (items must be at least this old)
const PROCESSING_DELAY_MS = 5000;

// Max items to process per batch
const BATCH_SIZE = 50;

// Exponential backoff settings
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60000;

interface ProcessResult {
    processed: number;
    succeeded: number;
    failed: number;
    errors: Array<{ itemId: string; error: string }>;
}

/**
 * Sync Queue Processor
 */
export class SyncQueueProcessor {
    private isRunning = false;
    private intervalId: ReturnType<typeof setInterval> | null = null;

    /**
     * Start the processor with interval
     */
    start(intervalMs = 10000): void {
        if (this.intervalId) {
            console.log('[SyncQueue] Processor already running');
            return;
        }

        console.log(`[SyncQueue] Starting processor with ${intervalMs}ms interval`);
        this.intervalId = setInterval(() => this.tick(), intervalMs);

        // Run immediately
        this.tick();
    }

    /**
     * Stop the processor
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[SyncQueue] Processor stopped');
        }
    }

    /**
     * Single tick - process pending items
     */
    private async tick(): Promise<void> {
        if (this.isRunning) {
            console.log('[SyncQueue] Previous tick still running, skipping');
            return;
        }

        this.isRunning = true;
        try {
            const result = await this.processPendingItems();
            if (result.processed > 0) {
                console.log(`[SyncQueue] Processed ${result.processed} items: ${result.succeeded} succeeded, ${result.failed} failed`);
            }
        } catch (error) {
            console.error('[SyncQueue] Tick error:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Process pending queue items
     */
    async processPendingItems(): Promise<ProcessResult> {
        const result: ProcessResult = {
            processed: 0,
            succeeded: 0,
            failed: 0,
            errors: [],
        };

        // Get pending items older than processing delay
        const cutoffTime = new Date(Date.now() - PROCESSING_DELAY_MS);
        
        const items = await prisma.syncQueueItem.findMany({
            where: {
                status: QueueStatus.PENDING,
                scheduledAt: { lte: cutoffTime },
            },
            orderBy: { scheduledAt: 'asc' },
            take: BATCH_SIZE,
            include: {
                store: {
                    select: {
                        id: true,
                        code: true,
                        syncEnabled: true,
                        companyId: true,
                    },
                },
            },
        });

        if (items.length === 0) {
            return result;
        }

        // Group items by store for batch processing
        const itemsByStore = new Map<string, typeof items>();
        for (const item of items) {
            const storeId = item.storeId;
            if (!itemsByStore.has(storeId)) {
                itemsByStore.set(storeId, []);
            }
            itemsByStore.get(storeId)!.push(item);
        }

        // Process each store's items
        for (const [storeId, storeItems] of itemsByStore) {
            const store = storeItems[0].store;
            
            // Skip if sync is disabled for this store
            if (!store.syncEnabled) {
                for (const item of storeItems) {
                    await this.markSkipped(item.id, 'Sync disabled for store');
                    result.processed++;
                    result.failed++;
                }
                continue;
            }

            // Process items for this store
            for (const item of storeItems) {
                result.processed++;
                
                try {
                    // Mark as processing
                    await prisma.syncQueueItem.update({
                        where: { id: item.id },
                        data: { status: QueueStatus.PROCESSING },
                    });

                    await this.processItem(item);
                    
                    // Mark as completed
                    await prisma.syncQueueItem.update({
                        where: { id: item.id },
                        data: {
                            status: QueueStatus.COMPLETED,
                            processedAt: new Date(),
                        },
                    });

                    result.succeeded++;
                } catch (error: any) {
                    const errorMsg = error.message || 'Unknown error';
                    result.failed++;
                    result.errors.push({ itemId: item.id, error: errorMsg });

                    await this.handleFailure(item, errorMsg);
                }
            }

            // Update store's lastAimsSyncAt
            await prisma.store.update({
                where: { id: storeId },
                data: { lastAimsSyncAt: new Date() },
            });
        }

        return result;
    }

    /**
     * Process a single queue item
     */
    private async processItem(item: {
        id: string;
        storeId: string;
        entityType: string;
        entityId: string;
        action: string;
        payload: any;
    }): Promise<void> {
        const { storeId, entityType, entityId, action, payload } = item;

        switch (action) {
            case 'CREATE':
            case 'UPDATE':
                await this.syncEntityToAIMS(storeId, entityType, entityId, payload);
                break;

            case 'DELETE':
                await this.deleteEntityFromAIMS(storeId, entityType, entityId);
                break;

            case 'SYNC_FULL':
                // Full sync is handled separately by sync routes
                console.log(`[SyncQueue] Full sync requested for store ${storeId}`);
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        // Update entity sync status
        await this.updateEntitySyncStatus(entityType, entityId, SyncStatus.SYNCED);
    }

    /**
     * Sync entity data to AIMS
     */
    private async syncEntityToAIMS(
        storeId: string,
        entityType: string,
        entityId: string,
        payload: any
    ): Promise<void> {
        // Build article data based on entity type
        const article = await this.buildArticleFromEntity(entityType, entityId, payload);
        
        if (!article) {
            throw new Error(`Failed to build article for ${entityType}/${entityId}`);
        }

        // Push to AIMS
        await aimsGateway.pushArticles(storeId, [article]);
    }

    /**
     * Delete entity from AIMS
     */
    private async deleteEntityFromAIMS(
        storeId: string,
        entityType: string,
        entityId: string
    ): Promise<void> {
        // Get the external ID for the entity
        const externalId = await this.getEntityExternalId(entityType, entityId);
        
        if (!externalId) {
            // Entity might already be deleted, treat as success
            console.log(`[SyncQueue] No external ID for ${entityType}/${entityId}, skipping AIMS delete`);
            return;
        }

        // Delete from AIMS
        await aimsGateway.deleteArticles(storeId, [externalId]);
    }

    /**
     * Build AIMS article from entity
     */
    private async buildArticleFromEntity(
        entityType: string,
        entityId: string,
        payload: any
    ): Promise<any | null> {
        switch (entityType) {
            case 'space': {
                const space = await prisma.space.findUnique({
                    where: { id: entityId },
                });
                if (!space) return null;

                // Build article for space/room
                return {
                    articleId: space.externalId,
                    articleName: (space.data as any)?.name || space.externalId,
                    nfc: (space.data as any)?.nfcData || '',
                    ...this.extractCustomFields(space.data),
                };
            }

            case 'person': {
                const person = await prisma.person.findUnique({
                    where: { id: entityId },
                });
                if (!person) return null;

                // Build article for person
                return {
                    articleId: person.externalId || person.virtualSpaceId || person.id,
                    articleName: (person.data as any)?.name || 'Person',
                    nfc: (person.data as any)?.nfcData || '',
                    ...this.extractCustomFields(person.data),
                };
            }

            case 'conference': {
                const room = await prisma.conferenceRoom.findUnique({
                    where: { id: entityId },
                });
                if (!room) return null;

                // Build article for conference room
                return {
                    articleId: room.externalId,
                    articleName: room.roomName,
                    nfc: '',
                    data1: room.hasMeeting ? 'MEETING' : 'AVAILABLE',
                    data2: room.meetingName || '',
                    data3: room.startTime || '',
                    data4: room.endTime || '',
                    data5: room.participants?.join(', ') || '',
                };
            }

            default:
                console.warn(`[SyncQueue] Unknown entity type: ${entityType}`);
                return null;
        }
    }

    /**
     * Extract custom fields from entity data for AIMS article
     */
    private extractCustomFields(data: any): Record<string, string> {
        const result: Record<string, string> = {};
        
        if (!data || typeof data !== 'object') return result;

        // Map common fields to AIMS data fields
        const fieldMappings: Record<string, string> = {
            'field1': 'data1',
            'field2': 'data2',
            'field3': 'data3',
            'field4': 'data4',
            'field5': 'data5',
            'data1': 'data1',
            'data2': 'data2',
            'data3': 'data3',
            'data4': 'data4',
            'data5': 'data5',
        };

        for (const [sourceKey, targetKey] of Object.entries(fieldMappings)) {
            if (data[sourceKey] !== undefined) {
                result[targetKey] = String(data[sourceKey]);
            }
        }

        return result;
    }

    /**
     * Get external ID for an entity
     */
    private async getEntityExternalId(entityType: string, entityId: string): Promise<string | null> {
        switch (entityType) {
            case 'space': {
                const space = await prisma.space.findUnique({
                    where: { id: entityId },
                    select: { externalId: true },
                });
                return space?.externalId || null;
            }

            case 'person': {
                const person = await prisma.person.findUnique({
                    where: { id: entityId },
                    select: { externalId: true, virtualSpaceId: true },
                });
                return person?.externalId || person?.virtualSpaceId || null;
            }

            case 'conference': {
                const room = await prisma.conferenceRoom.findUnique({
                    where: { id: entityId },
                    select: { externalId: true },
                });
                return room?.externalId || null;
            }

            default:
                return null;
        }
    }

    /**
     * Update entity sync status
     */
    private async updateEntitySyncStatus(
        entityType: string,
        entityId: string,
        status: SyncStatus
    ): Promise<void> {
        const now = status === SyncStatus.SYNCED ? new Date() : undefined;

        try {
            switch (entityType) {
                case 'space':
                    await prisma.space.update({
                        where: { id: entityId },
                        data: { syncStatus: status, lastSyncedAt: now },
                    });
                    break;

                case 'person':
                    await prisma.person.update({
                        where: { id: entityId },
                        data: { syncStatus: status, lastSyncedAt: now },
                    });
                    break;

                case 'conference':
                    await prisma.conferenceRoom.update({
                        where: { id: entityId },
                        data: { syncStatus: status },
                    });
                    break;
            }
        } catch (error) {
            // Entity might have been deleted, ignore
            console.log(`[SyncQueue] Could not update sync status for ${entityType}/${entityId}`);
        }
    }

    /**
     * Handle failed item - increment attempts, schedule retry or mark as failed
     */
    private async handleFailure(
        item: { id: string; attempts: number; maxAttempts: number },
        errorMessage: string
    ): Promise<void> {
        const newAttempts = item.attempts + 1;

        if (newAttempts >= item.maxAttempts) {
            // Max attempts reached, mark as failed
            await prisma.syncQueueItem.update({
                where: { id: item.id },
                data: {
                    status: QueueStatus.FAILED,
                    attempts: newAttempts,
                    errorMessage,
                    processedAt: new Date(),
                },
            });
        } else {
            // Schedule retry with exponential backoff
            const delay = Math.min(
                BASE_RETRY_DELAY_MS * Math.pow(2, newAttempts),
                MAX_RETRY_DELAY_MS
            );
            const nextScheduledAt = new Date(Date.now() + delay);

            await prisma.syncQueueItem.update({
                where: { id: item.id },
                data: {
                    status: QueueStatus.PENDING,
                    attempts: newAttempts,
                    errorMessage,
                    scheduledAt: nextScheduledAt,
                },
            });
        }
    }

    /**
     * Mark item as skipped (treated as failed)
     */
    private async markSkipped(itemId: string, reason: string): Promise<void> {
        await prisma.syncQueueItem.update({
            where: { id: itemId },
            data: {
                status: QueueStatus.FAILED,
                errorMessage: `Skipped: ${reason}`,
                processedAt: new Date(),
            },
        });
    }

    /**
     * Manually process a single item (for retry endpoint)
     */
    async processItemById(itemId: string): Promise<void> {
        const item = await prisma.syncQueueItem.findUnique({
            where: { id: itemId },
            include: {
                store: {
                    select: { id: true, syncEnabled: true },
                },
            },
        });

        if (!item) {
            throw new Error('Item not found');
        }

        if (!item.store.syncEnabled) {
            throw new Error('Sync disabled for store');
        }

        // Mark as processing
        await prisma.syncQueueItem.update({
            where: { id: itemId },
            data: { status: QueueStatus.PROCESSING },
        });

        try {
            await this.processItem(item);
            
            await prisma.syncQueueItem.update({
                where: { id: itemId },
                data: {
                    status: QueueStatus.COMPLETED,
                    processedAt: new Date(),
                },
            });

            // Update store lastAimsSyncAt
            await prisma.store.update({
                where: { id: item.storeId },
                data: { lastAimsSyncAt: new Date() },
            });
        } catch (error: any) {
            await this.handleFailure(item, error.message || 'Unknown error');
            throw error;
        }
    }
}

// Singleton instance
export const syncQueueProcessor = new SyncQueueProcessor();
