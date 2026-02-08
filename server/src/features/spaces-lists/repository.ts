/**
 * Spaces Lists Feature - Repository
 */
import { prisma } from '../../config/index.js';

export const spacesListsRepository = {
    async list(storeIds: string[], storeId?: string) {
        return prisma.spacesList.findMany({
            where: {
                storeId: storeId ? storeId : { in: storeIds },
            },
            select: {
                id: true,
                storeId: true,
                name: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
                content: true,
                store: { select: { name: true, code: true } },
            },
            orderBy: { name: 'asc' },
        });
    },

    async getById(id: string) {
        return prisma.spacesList.findUnique({
            where: { id },
            include: {
                store: { select: { name: true, code: true } },
            },
        });
    },

    async findByStoreAndName(storeId: string, name: string) {
        return prisma.spacesList.findFirst({
            where: { storeId, name },
        });
    },

    async create(data: {
        storeId: string;
        name: string;
        content: unknown;
        createdById?: string;
    }) {
        return prisma.spacesList.create({
            data: {
                storeId: data.storeId,
                name: data.name,
                content: data.content as any,
                createdById: data.createdById,
            },
            include: {
                store: { select: { name: true, code: true } },
            },
        });
    },

    async update(id: string, data: {
        name?: string;
        content?: unknown;
    }) {
        return prisma.spacesList.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.content !== undefined && { content: data.content as any }),
            },
            include: {
                store: { select: { name: true, code: true } },
            },
        });
    },

    async delete(id: string) {
        return prisma.spacesList.delete({
            where: { id },
        });
    },
};
