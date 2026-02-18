/**
 * Sync Feature - Repository
 * 
 * @description Data access layer for sync operations.
 */
import { prisma } from '../../config/index.js';
import { Prisma, QueueStatus, SyncStatus } from '@prisma/client';

// ======================
// Repository
// ======================

export const syncRepository = {
    // ======================
    // Queue Queries
    // ======================

    /**
     * Get pending count for stores
     */
    async getPendingCount(storeIds: string[]) {
        return prisma.syncQueueItem.count({
            where: { storeId: { in: storeIds }, status: 'PENDING' },
        });
    },

    /**
     * Get failed count for stores
     */
    async getFailedCount(storeIds: string[]) {
        return prisma.syncQueueItem.count({
            where: { storeId: { in: storeIds }, status: 'FAILED' },
        });
    },

    /**
     * Get last sync time
     */
    async getLastSync(storeIds: string[]) {
        return prisma.syncQueueItem.findFirst({
            where: { storeId: { in: storeIds }, status: 'COMPLETED' },
            orderBy: { processedAt: 'desc' },
            select: { processedAt: true },
        });
    },

    /**
     * Create sync queue item
     */
    async createQueueItem(data: {
        storeId: string;
        entityType: string;
        entityId: string;
        action: string;
        payload: Prisma.InputJsonValue;
        status: QueueStatus;
    }) {
        return prisma.syncQueueItem.create({
            data,
        });
    },

    /**
     * Update sync queue item
     */
    async updateQueueItem(id: string, data: {
        status?: QueueStatus;
        processedAt?: Date;
        errorMessage?: string;
        payload?: Prisma.InputJsonValue;
    }) {
        return prisma.syncQueueItem.update({
            where: { id },
            data,
        });
    },

    /**
     * Get sync job by ID
     */
    async getJob(id: string) {
        return prisma.syncQueueItem.findUnique({
            where: { id },
        });
    },

    /**
     * List queue items
     */
    async listQueueItems(storeIds: string[] | undefined, storeId?: string, status?: string) {
        const whereClause: any = {};

        if (storeId) {
            whereClause.storeId = storeId;
        } else if (storeIds) {
            whereClause.storeId = { in: storeIds };
        }
        
        if (status) {
            whereClause.status = status;
        }

        return prisma.syncQueueItem.findMany({
            where: whereClause,
            include: {
                store: { select: { name: true, code: true } }
            },
            orderBy: { scheduledAt: 'desc' },
            take: 50,
        });
    },

    /**
     * Get failed item by ID
     */
    async getFailedItem(id: string, storeIds: string[] | undefined) {
        const where: any = { id, status: 'FAILED' };
        if (storeIds) {
            where.storeId = { in: storeIds };
        }
        return prisma.syncQueueItem.findFirst({ where });
    },

    /**
     * Get failed item for store
     */
    async getFailedItemForStore(id: string, storeId: string) {
        return prisma.syncQueueItem.findFirst({
            where: {
                id,
                storeId,
                status: 'FAILED',
            },
        });
    },

    // ======================
    // Store Queries
    // ======================

    /**
     * Get store by ID
     */
    async getStore(storeId: string) {
        return prisma.store.findUnique({
            where: { id: storeId },
            select: { id: true, code: true, syncEnabled: true, lastAimsSyncAt: true, name: true },
        });
    },

    /**
     * Update store last sync time
     */
    async updateStoreLastSync(storeId: string) {
        return prisma.store.update({
            where: { id: storeId },
            data: { lastAimsSyncAt: new Date() },
        });
    },

    /**
     * Get store completed count
     */
    async getCompletedCount(storeId: string) {
        return prisma.syncQueueItem.count({
            where: { storeId, status: 'COMPLETED' },
        });
    },

    // ======================
    // Space Queries (for pull sync)
    // ======================

    /**
     * Find existing space by external ID
     */
    async findSpaceByExternalId(storeId: string, externalId: string) {
        return prisma.space.findFirst({
            where: { storeId, externalId },
        });
    },

    /**
     * Create space
     */
    async createSpace(data: {
        storeId: string;
        externalId: string;
        labelCode: string | null;
        data: Prisma.InputJsonValue;
        syncStatus: SyncStatus;
        lastSyncedAt: Date;
    }) {
        return prisma.space.create({ data });
    },

    /**
     * Update space
     */
    async updateSpace(id: string, data: {
        data: Prisma.InputJsonValue;
        labelCode?: string | null;
        syncStatus: SyncStatus;
        lastSyncedAt: Date;
    }) {
        return prisma.space.update({
            where: { id },
            data,
        });
    },
};
