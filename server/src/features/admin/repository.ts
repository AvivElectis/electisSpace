/**
 * Admin Feature - Repository
 * 
 * @description Data access layer for admin panel operations.
 */
import { prisma } from '../../config/index.js';

// ======================
// Overview Queries
// ======================

export const adminRepository = {
    /**
     * Get platform-wide statistics
     */
    async getOverviewStats() {
        const [
            companiesCount,
            storesCount,
            usersCount,
            activeUsersCount,
            spacesCount,
            peopleCount,
            conferenceRoomsCount,
            pendingSyncCount,
            failedSyncCount,
        ] = await Promise.all([
            prisma.company.count({ where: { isActive: true } }),
            prisma.store.count({ where: { isActive: true } }),
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.space.count(),
            prisma.person.count(),
            prisma.conferenceRoom.count(),
            prisma.syncQueueItem.count({ where: { status: 'PENDING' } }),
            prisma.syncQueueItem.count({ where: { status: 'FAILED' } }),
        ]);

        return {
            companiesCount,
            storesCount,
            usersCount,
            activeUsersCount,
            spacesCount,
            peopleCount,
            conferenceRoomsCount,
            pendingSyncCount,
            failedSyncCount,
        };
    },

    // ======================
    // Company Queries
    // ======================

    /**
     * List companies with counts
     */
    async listCompanies(search: string | undefined, skip: number, take: number) {
        const where = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { code: { contains: search, mode: 'insensitive' as const } },
                { location: { contains: search, mode: 'insensitive' as const } },
            ],
        } : {};

        const [companies, total] = await Promise.all([
            prisma.company.findMany({
                where,
                include: {
                    _count: {
                        select: { stores: true, userCompanies: true },
                    },
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.company.count({ where }),
        ]);

        return { companies, total };
    },

    /**
     * Get company with full details
     */
    async getCompanyDetails(companyId: string) {
        return prisma.company.findUnique({
            where: { id: companyId },
            include: {
                stores: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        isActive: true,
                        syncEnabled: true,
                        lastAimsSyncAt: true,
                        _count: {
                            select: { spaces: true, people: true, conferenceRooms: true },
                        },
                    },
                },
                userCompanies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                isActive: true,
                                lastLogin: true,
                            },
                        },
                    },
                },
            },
        });
    },

    // ======================
    // Store Queries
    // ======================

    /**
     * List stores with company info and counts
     */
    async listStores(search: string | undefined, companyId: string | undefined, skip: number, take: number) {
        const where: any = {};
        
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }
        
        if (companyId) {
            where.companyId = companyId;
        }

        const [stores, total] = await Promise.all([
            prisma.store.findMany({
                where,
                include: {
                    company: {
                        select: { id: true, code: true, name: true },
                    },
                    _count: {
                        select: { spaces: true, people: true, conferenceRooms: true },
                    },
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.store.count({ where }),
        ]);

        return { stores, total };
    },

    /**
     * Get pending sync counts for multiple stores
     */
    async getPendingSyncCounts(storeIds: string[]) {
        return prisma.syncQueueItem.groupBy({
            by: ['storeId'],
            where: {
                storeId: { in: storeIds },
                status: 'PENDING',
            },
            _count: { id: true },
        });
    },

    /**
     * Get store with full details
     */
    async getStoreDetails(storeId: string) {
        return prisma.store.findUnique({
            where: { id: storeId },
            include: {
                company: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        aimsBaseUrl: true,
                        aimsCluster: true,
                    },
                },
                _count: {
                    select: { spaces: true, people: true, conferenceRooms: true, userStores: true },
                },
            },
        });
    },

    /**
     * Get sync queue stats for a store
     */
    async getStoreSyncStats(storeId: string) {
        const [pending, failed, completed] = await Promise.all([
            prisma.syncQueueItem.count({ where: { storeId, status: 'PENDING' } }),
            prisma.syncQueueItem.count({ where: { storeId, status: 'FAILED' } }),
            prisma.syncQueueItem.count({ where: { storeId, status: 'COMPLETED' } }),
        ]);
        return { pending, failed, completed };
    },

    /**
     * Get recent sync items for a store
     */
    async getRecentSyncItems(storeId: string, take: number = 10) {
        return prisma.syncQueueItem.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            take,
            select: {
                id: true,
                entityType: true,
                action: true,
                status: true,
                errorMessage: true,
                createdAt: true,
                processedAt: true,
            },
        });
    },

    // ======================
    // Entity Queries
    // ======================

    /**
     * Check if store exists
     */
    async storeExists(storeId: string) {
        return prisma.store.findUnique({ where: { id: storeId } });
    },

    /**
     * List spaces in a store
     */
    async listSpaces(storeId: string, search: string | undefined, skip: number, take: number) {
        const where: any = { storeId };
        if (search) {
            where.OR = [
                { externalId: { contains: search, mode: 'insensitive' } },
                { labelCode: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [spaces, total] = await Promise.all([
            prisma.space.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
            prisma.space.count({ where }),
        ]);

        return { spaces, total };
    },

    /**
     * List people in a store
     */
    async listPeople(storeId: string, search: string | undefined, skip: number, take: number) {
        const where: any = { storeId };
        if (search) {
            where.OR = [
                { externalId: { contains: search, mode: 'insensitive' } },
                { labelCode: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [people, total] = await Promise.all([
            prisma.person.findMany({
                where,
                include: {
                    assignedSpace: {
                        select: { id: true, externalId: true, labelCode: true },
                    },
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.person.count({ where }),
        ]);

        return { people, total };
    },

    /**
     * List conference rooms in a store
     */
    async listConferenceRooms(storeId: string, search: string | undefined, skip: number, take: number) {
        const where: any = { storeId };
        if (search) {
            where.OR = [
                { externalId: { contains: search, mode: 'insensitive' } },
                { labelCode: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [rooms, total] = await Promise.all([
            prisma.conferenceRoom.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
            prisma.conferenceRoom.count({ where }),
        ]);

        return { rooms, total };
    },

    /**
     * List sync queue items for a store
     */
    async listSyncQueue(storeId: string, status: string | undefined, skip: number, take: number) {
        const where: any = { storeId };
        if (status) {
            where.status = status;
        }

        const [items, total] = await Promise.all([
            prisma.syncQueueItem.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
            prisma.syncQueueItem.count({ where }),
        ]);

        return { items, total };
    },

    // ======================
    // Context Queries
    // ======================

    /**
     * Get company for impersonate context
     */
    async getCompanyForContext(companyId: string) {
        return prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                code: true,
                name: true,
                aimsBaseUrl: true,
                aimsCluster: true,
                aimsUsername: true,
                aimsPasswordEnc: true,
            },
        });
    },

    /**
     * Get store for impersonate context
     */
    async getStoreForContext(storeId: string) {
        return prisma.store.findUnique({
            where: { id: storeId },
            select: {
                id: true,
                code: true,
                name: true,
                settings: true,
                syncEnabled: true,
            },
        });
    },

    /**
     * Verify store belongs to company
     */
    async verifyStoreInCompany(storeId: string, companyId: string) {
        return prisma.store.findFirst({
            where: { id: storeId, companyId },
        });
    },

    // ======================
    // Audit Log Queries
    // ======================

    /**
     * List audit log entries
     */
    async listAuditLog(
        filters: { userId?: string; companyId?: string; storeId?: string; action?: string },
        skip: number,
        take: number
    ) {
        const where: any = {};
        if (filters.userId) where.userId = filters.userId;
        if (filters.companyId) where.companyId = filters.companyId;
        if (filters.storeId) where.storeId = filters.storeId;
        if (filters.action) where.action = filters.action;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { email: true, firstName: true, lastName: true },
                    },
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.auditLog.count({ where }),
        ]);

        return { logs, total };
    },
};
