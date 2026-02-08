/**
 * People Lists Feature - Repository
 */
import { prisma } from '../../config/index.js';

export const peopleListsRepository = {
    async list(storeIds: string[], storeId?: string) {
        return prisma.peopleList.findMany({
            where: {
                storeId: storeId ? storeId : { in: storeIds },
            },
            select: {
                id: true,
                storeId: true,
                name: true,
                storageName: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
                // Include content for counting items (stripped in service layer)
                content: true,
                store: { select: { name: true, code: true } },
            },
            orderBy: { name: 'asc' },
        });
    },

    async getById(id: string) {
        return prisma.peopleList.findUnique({
            where: { id },
            include: {
                store: { select: { name: true, code: true } },
            },
        });
    },

    async findByStoreAndName(storeId: string, name: string) {
        return prisma.peopleList.findFirst({
            where: { storeId, name },
        });
    },

    async findByStoreAndStorageName(storeId: string, storageName: string) {
        return prisma.peopleList.findFirst({
            where: { storeId, storageName },
        });
    },

    async create(data: {
        storeId: string;
        name: string;
        storageName: string;
        content: unknown;
        createdById?: string;
    }) {
        return prisma.peopleList.create({
            data: {
                storeId: data.storeId,
                name: data.name,
                storageName: data.storageName,
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
        storageName?: string;
        content?: unknown;
    }) {
        return prisma.peopleList.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.storageName !== undefined && { storageName: data.storageName }),
                ...(data.content !== undefined && { content: data.content as any }),
            },
            include: {
                store: { select: { name: true, code: true } },
            },
        });
    },

    async delete(id: string) {
        return prisma.peopleList.delete({
            where: { id },
        });
    },
};
