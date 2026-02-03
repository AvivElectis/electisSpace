/**
 * Spaces Feature - Repository
 * 
 * @description Data access layer for spaces management.
 */
import { prisma } from '../../config/index.js';
import { Prisma, SyncStatus } from '@prisma/client';

export const spacesRepository = {
    async list(
        storeIds: string[],
        filters: { storeId?: string; search?: string; hasLabel?: string; syncStatus?: string },
        skip: number,
        take: number
    ) {
        const where: Prisma.SpaceWhereInput = {
            storeId: filters.storeId ? filters.storeId : { in: storeIds },
        };

        if (filters.search) {
            where.OR = [{ externalId: { contains: filters.search, mode: 'insensitive' } }];
        }
        if (filters.hasLabel === 'true') where.labelCode = { not: null };
        else if (filters.hasLabel === 'false') where.labelCode = null;
        if (filters.syncStatus) where.syncStatus = filters.syncStatus as SyncStatus;

        const [spaces, total] = await Promise.all([
            prisma.space.findMany({
                where,
                include: { store: { select: { name: true, code: true } } },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.space.count({ where }),
        ]);
        return { spaces, total };
    },

    async getById(id: string, storeIds: string[]) {
        return prisma.space.findFirst({
            where: { id, storeId: { in: storeIds } },
            include: {
                assignedPeople: { select: { id: true, externalId: true, data: true } },
                store: { select: { name: true, code: true } },
            },
        });
    },

    async findByExternalId(storeId: string, externalId: string) {
        return prisma.space.findFirst({ where: { storeId, externalId } });
    },

    async findByIdWithAccess(id: string, storeIds: string[]) {
        return prisma.space.findFirst({ where: { id, storeId: { in: storeIds } } });
    },

    async create(data: {
        storeId: string;
        externalId: string;
        labelCode?: string;
        templateName?: string;
        data: Prisma.InputJsonValue;
        createdById: string;
        updatedById: string;
        syncStatus: SyncStatus;
    }) {
        return prisma.space.create({ data });
    },

    async update(id: string, data: {
        labelCode?: string | null;
        templateName?: string | null;
        data?: Prisma.InputJsonValue;
        updatedById?: string;
        syncStatus?: SyncStatus;
    }) {
        return prisma.space.update({ where: { id }, data });
    },

    async delete(id: string) {
        return prisma.space.delete({ where: { id } });
    },

    async findLabelInStore(storeId: string, labelCode: string, excludeId: string) {
        return prisma.space.findFirst({
            where: { storeId, labelCode, id: { not: excludeId } },
        });
    },
};
