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
}

// Singleton instance
export const syncQueueService = new SyncQueueService();
