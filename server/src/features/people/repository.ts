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
        storeIds: string[],
        filters: {
            storeId?: string;
            assigned?: string;
            listId?: string;
        },
        skip: number,
        take: number
    ) {
        const where: Prisma.PersonWhereInput = {
            storeId: filters.storeId ? filters.storeId : { in: storeIds },
        };

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
                    assignedSpace: {
                        select: { id: true, externalId: true, labelCode: true },
                    },
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
    async getById(id: string, storeIds: string[]) {
        return prisma.person.findFirst({
            where: {
                id,
                storeId: { in: storeIds },
            },
            include: {
                assignedSpace: true,
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
    async findByIdWithAccess(id: string, storeIds: string[]) {
        return prisma.person.findFirst({
            where: {
                id,
                storeId: { in: storeIds },
            },
        });
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
            data: {
                ...data,
                assignedSpace: data.assignedSpaceId !== undefined
                    ? data.assignedSpaceId
                        ? { connect: { id: data.assignedSpaceId } }
                        : { disconnect: true }
                    : undefined,
                assignedSpaceId: undefined, // Remove raw field, use relation
            },
            include: { assignedSpace: true },
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
     * Check if space is assigned to another person
     */
    async isSpaceAssigned(spaceId: string, excludePersonId: string) {
        return prisma.person.findFirst({
            where: {
                assignedSpaceId: spaceId,
                id: { not: excludePersonId },
            },
        });
    },

    /**
     * List people lists
     */
    async listPeopleLists(storeIds: string[], storeId?: string) {
        return prisma.peopleList.findMany({
            where: {
                storeId: storeId ? storeId : { in: storeIds },
            },
            include: {
                _count: { select: { memberships: true } },
                store: { select: { name: true, code: true } }
            },
            orderBy: { name: 'asc' },
        });
    },
};
