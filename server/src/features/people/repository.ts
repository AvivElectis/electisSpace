/**
 * People Feature - Repository
 * 
 * @description Data access layer for people management.
 */
import { prisma } from '../../config/index.js';
import { Prisma, SyncStatus } from '@prisma/client';

// ======================
// Repository
// ======================

export const peopleRepository = {
    /**
     * List people with filters
     */
    async list(
        storeIds: string[] | undefined,
        filters: {
            storeId?: string;
            search?: string;
            assigned?: string;
            listId?: string;
        },
        skip: number,
        take: number
    ) {
        const where: Prisma.PersonWhereInput = {};
        if (filters.storeId) {
            where.storeId = filters.storeId;
        } else if (storeIds) {
            where.storeId = { in: storeIds };
        }

        if (filters.search) {
            // Search in JSON data fields and externalId
            where.OR = [
                { externalId: { contains: filters.search, mode: 'insensitive' } },
                { virtualSpaceId: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        if (filters.assigned === 'true') {
            where.assignedSpaceId = { not: null };
        } else if (filters.assigned === 'false') {
            where.assignedSpaceId = null;
        }

        if (filters.listId) {
            where.listMemberships = { some: { listId: filters.listId } };
        }

        const [people, total] = await Promise.all([
            prisma.person.findMany({
                where,
                include: {
                    store: {
                        select: { name: true, code: true }
                    }
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
     * Get person by ID with store access check
     */
    async getById(id: string, storeIds: string[] | undefined) {
        const where: any = { id };
        if (storeIds) where.storeId = { in: storeIds };
        return prisma.person.findFirst({
            where,
            include: {
                listMemberships: {
                    include: { list: true },
                },
                store: {
                    select: { name: true, code: true }
                }
            },
        });
    },

    /**
     * Count people in store
     */
    async countInStore(storeId: string) {
        return prisma.person.count({
            where: { storeId },
        });
    },

    /**
     * Create person
     */
    async create(data: {
        externalId?: string;
        data: Prisma.InputJsonValue;
        virtualSpaceId: string;
        storeId: string;
        syncStatus: SyncStatus;
    }) {
        return prisma.person.create({
            data,
        });
    },

    /**
     * Find person by ID with store access check
     */
    async findByIdWithAccess(id: string, storeIds: string[] | undefined) {
        const where: any = { id };
        if (storeIds) where.storeId = { in: storeIds };
        return prisma.person.findFirst({ where });
    },

    /**
     * Update person
     */
    async update(id: string, data: {
        data?: Prisma.InputJsonValue;
        syncStatus?: SyncStatus;
        assignedSpaceId?: string | null;
    }) {
        return prisma.person.update({
            where: { id },
            data,
        });
    },

    /**
     * Delete person
     */
    async delete(id: string) {
        return prisma.person.delete({
            where: { id },
        });
    },

    /**
     * Find space by ID with store access check
     */
    async findSpace(spaceId: string, storeIds: string[]) {
        return prisma.space.findFirst({
            where: {
                id: spaceId,
                storeId: { in: storeIds },
            },
        });
    },

    /**
     * Check if space is assigned to another person within the same store
     */
    async isSpaceAssigned(spaceId: string, excludePersonId: string, storeId?: string) {
        const where: any = {
            assignedSpaceId: spaceId,
            id: { not: excludePersonId },
        };
        if (storeId) {
            where.storeId = storeId;
        }
        return prisma.person.findFirst({ where });
    },

    /**
     * List people lists
     */
    async listPeopleLists(storeIds: string[] | undefined, storeId?: string) {
        const where: any = {};
        if (storeId) {
            where.storeId = storeId;
        } else if (storeIds) {
            where.storeId = { in: storeIds };
        }
        return prisma.peopleList.findMany({
            where,
            include: {
                _count: { select: { memberships: true } },
                store: { select: { name: true, code: true } }
            },
            orderBy: { name: 'asc' },
        });
    },
};
