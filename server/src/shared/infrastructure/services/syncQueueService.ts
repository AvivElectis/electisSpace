/**
 * Sync Queue Service
 * 
 * Helper service for queueing sync operations from entity CRUD endpoints.
 * Provides simple methods to queue create/update/delete operations.
 */

import { prisma } from '../../../config/index.js';
import { QueueStatus, SyncStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

export type EntityType = 'space' | 'person' | 'conference' | 'list';
export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';

interface QueueOptions {
    /** Delay before processing (default: 5000ms) */
    delayMs?: number;
    /** Max retry attempts (default: 5) */
    maxAttempts?: number;
    /** Additional payload data */
    payload?: Record<string, any>;
}

/**
 * Sync Queue Service
 */
export class SyncQueueService {
    /**
     * Queue a sync operation for an entity
     */
    async queue(
        storeId: string,
        entityType: EntityType,
        entityId: string,
        action: SyncAction,
        options: QueueOptions = {}
    ): Promise<string> {
        const { delayMs = 0, maxAttempts = 5, payload = {} } = options;

        // Check if there's already a pending item for this entity
        const existing = await prisma.syncQueueItem.findFirst({
            where: {
                storeId,
                entityType,
                entityId,
                status: { in: [QueueStatus.PENDING, QueueStatus.PROCESSING] },
            },
        });

        if (existing) {
            // Update existing item with new action/payload
            await prisma.syncQueueItem.update({
                where: { id: existing.id },
                data: {
                    action,
                    payload: payload as Prisma.InputJsonValue,
                    scheduledAt: new Date(Date.now() + delayMs),
                },
            });
            return existing.id;
        }

        // Create new queue item
        const item = await prisma.syncQueueItem.create({
            data: {
                storeId,
                entityType,
                entityId,
                action,
                payload: payload as Prisma.InputJsonValue,
                status: QueueStatus.PENDING,
                maxAttempts,
                scheduledAt: new Date(Date.now() + delayMs),
            },
        });

        return item.id;
    }

    /**
     * Queue a CREATE operation
     */
    async queueCreate(
        storeId: string,
        entityType: EntityType,
        entityId: string,
        entityData?: Record<string, any>
    ): Promise<string> {
        // Update entity sync status to PENDING
        await this.updateEntitySyncStatus(entityType, entityId, SyncStatus.PENDING);

        return this.queue(storeId, entityType, entityId, 'CREATE', {
            payload: entityData ? { entityData } : {},
        });
    }

    /**
     * Queue an UPDATE operation
     */
    async queueUpdate(
        storeId: string,
        entityType: EntityType,
        entityId: string,
        changes?: Record<string, any>
    ): Promise<string> {
        // Update entity sync status to PENDING
        await this.updateEntitySyncStatus(entityType, entityId, SyncStatus.PENDING);

        return this.queue(storeId, entityType, entityId, 'UPDATE', {
            payload: changes ? { changes } : {},
        });
    }

    /**
     * Queue a DELETE operation
     */
    async queueDelete(
        storeId: string,
        entityType: EntityType,
        entityId: string,
        externalId?: string
    ): Promise<string> {
        return this.queue(storeId, entityType, entityId, 'DELETE', {
            payload: externalId ? { externalId } : {},
        });
    }

    /**
     * Cancel pending sync for an entity
     */
    async cancel(storeId: string, entityType: EntityType, entityId: string): Promise<void> {
        await prisma.syncQueueItem.updateMany({
            where: {
                storeId,
                entityType,
                entityId,
                status: QueueStatus.PENDING,
            },
            data: {
                status: QueueStatus.COMPLETED,
                errorMessage: 'Cancelled',
                processedAt: new Date(),
            },
        });
    }

    /**
     * Get pending sync count for a store
     */
    async getPendingCount(storeId: string): Promise<number> {
        return prisma.syncQueueItem.count({
            where: {
                storeId,
                status: { in: [QueueStatus.PENDING, QueueStatus.PROCESSING] },
            },
        });
    }

    /**
     * Get failed sync count for a store
     */
    async getFailedCount(storeId: string): Promise<number> {
        return prisma.syncQueueItem.count({
            where: {
                storeId,
                status: QueueStatus.FAILED,
            },
        });
    }

    /**
     * Update entity sync status
     */
    private async updateEntitySyncStatus(
        entityType: EntityType,
        entityId: string,
        status: SyncStatus
    ): Promise<void> {
        try {
            switch (entityType) {
                case 'space':
                    await prisma.space.update({
                        where: { id: entityId },
                        data: { syncStatus: status },
                    });
                    break;

                case 'person':
                    await prisma.person.update({
                        where: { id: entityId },
                        data: { syncStatus: status },
                    });
                    break;

                case 'conference':
                    await prisma.conferenceRoom.update({
                        where: { id: entityId },
                        data: { syncStatus: status },
                    });
                    break;

                // 'list' doesn't have sync status
            }
        } catch {
            // Entity might not exist yet or was deleted
        }
    }

    /**
     * Cleanup orphaned/stale sync queue items
     * - Removes COMPLETED items older than 7 days
     * - Marks PROCESSING items older than 1 hour as FAILED (stuck)
     * - Removes FAILED items older than 30 days
     * - Removes items for deleted entities
     */
    async cleanup(): Promise<{
        completedRemoved: number;
        stuckMarked: number;
        failedRemoved: number;
        orphanedRemoved: number;
    }> {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Remove old completed items
        const completedResult = await prisma.syncQueueItem.deleteMany({
            where: {
                status: QueueStatus.COMPLETED,
                processedAt: { lt: sevenDaysAgo },
            },
        });

        // Mark stuck PROCESSING items as FAILED
        // Note: SyncQueueItem doesn't have updatedAt, use createdAt instead
        const stuckResult = await prisma.syncQueueItem.updateMany({
            where: {
                status: QueueStatus.PROCESSING,
                createdAt: { lt: oneHourAgo },
            },
            data: {
                status: QueueStatus.FAILED,
                errorMessage: 'Processing timeout - marked as stuck',
            },
        });

        // Remove old failed items
        const failedResult = await prisma.syncQueueItem.deleteMany({
            where: {
                status: QueueStatus.FAILED,
                createdAt: { lt: thirtyDaysAgo },
            },
        });

        // Find orphaned items (entity no longer exists)
        let orphanedRemoved = 0;
        const pendingItems = await prisma.syncQueueItem.findMany({
            where: {
                status: { in: [QueueStatus.PENDING, QueueStatus.FAILED] },
            },
            select: {
                id: true,
                entityType: true,
                entityId: true,
            },
            take: 1000, // Limit batch size
        });

        for (const item of pendingItems) {
            let entityExists = false;
            
            try {
                // entityType is lowercase in the service
                switch (item.entityType.toLowerCase()) {
                    case 'space':
                        entityExists = !!(await prisma.space.findUnique({ where: { id: item.entityId } }));
                        break;
                    case 'person':
                        entityExists = !!(await prisma.person.findUnique({ where: { id: item.entityId } }));
                        break;
                    case 'conference':
                        entityExists = !!(await prisma.conferenceRoom.findUnique({ where: { id: item.entityId } }));
                        break;
                    case 'list':
                        entityExists = !!(await prisma.peopleList.findUnique({ where: { id: item.entityId } }));
                        break;
                    default:
                        entityExists = true; // Unknown type, keep it
                }
            } catch {
                // On error, assume entity might exist
                entityExists = true;
            }

            if (!entityExists) {
                await prisma.syncQueueItem.delete({ where: { id: item.id } });
                orphanedRemoved++;
            }
        }

        return {
            completedRemoved: completedResult.count,
            stuckMarked: stuckResult.count,
            failedRemoved: failedResult.count,
            orphanedRemoved,
        };
    }
}

// Singleton instance
export const syncQueueService = new SyncQueueService();
