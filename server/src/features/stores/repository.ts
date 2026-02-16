/**
 * Stores Feature - Repository
 * 
 * @description Data access layer for store operations.
 */
import { prisma } from '../../config/index.js';
import type { Prisma } from '@prisma/client';

// ======================
// Store Queries
// ======================

export const storeRepository = {
    /**
     * Find a store by ID
     */
    async findById(id: string) {
        return prisma.store.findUnique({
            where: { id },
        });
    },

    /**
     * Find a store by ID with relations
     */
    async findByIdWithDetails(id: string, userId: string) {
        return prisma.store.findUnique({
            where: { id },
            include: {
                company: {
                    select: { id: true, code: true, name: true }
                },
                _count: {
                    select: { spaces: true, people: true, conferenceRooms: true, userStores: true }
                },
                userStores: {
                    where: { userId },
                    select: { role: true, features: true }
                }
            }
        });
    },

    /**
     * Find a store by company ID and code
     */
    async findByCompanyAndCode(companyId: string, code: string) {
        return prisma.store.findUnique({
            where: { companyId_code: { companyId, code } },
            select: { id: true }
        });
    },

    /**
     * List stores in a company with counts
     */
    async listByCompany(companyId: string, userId: string) {
        return prisma.store.findMany({
            where: { companyId },
            include: {
                _count: {
                    select: { spaces: true, people: true, conferenceRooms: true }
                },
                userStores: {
                    where: { userId },
                    select: { role: true, features: true }
                }
            },
            orderBy: { code: 'asc' }
        });
    },

    /**
     * Create a new store
     */
    async create(data: {
        companyId: string;
        code: string;
        name: string;
        timezone?: string;
        syncEnabled?: boolean;
    }) {
        return prisma.store.create({
            data,
            include: {
                _count: {
                    select: { spaces: true, people: true }
                }
            }
        });
    },

    /**
     * Update a store
     */
    async update(id: string, data: {
        name?: string;
        timezone?: string;
        syncEnabled?: boolean;
        isActive?: boolean;
        settings?: Prisma.InputJsonValue;
    }) {
        return prisma.store.update({
            where: { id },
            data: data as Prisma.StoreUpdateInput,
        });
    },

    /**
     * Delete a store
     */
    async delete(id: string) {
        return prisma.store.delete({
            where: { id }
        });
    },

    /**
     * Find store with counts for delete check
     */
    async findWithCounts(id: string) {
        return prisma.store.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { spaces: true, people: true, conferenceRooms: true }
                }
            }
        });
    },
};

// ======================
// Company Queries
// ======================

export const companyRepository = {
    /**
     * Find a company by ID
     */
    async findById(id: string) {
        return prisma.company.findUnique({
            where: { id },
            select: { id: true, code: true, name: true }
        });
    },
};

// ======================
// User-Company Queries
// ======================

export const userCompanyRepository = {
    /**
     * Get user's company access
     */
    async getUserCompanyAccess(userId: string, companyId: string) {
        return prisma.userCompany.findUnique({
            where: { userId_companyId: { userId, companyId } },
            select: { allStoresAccess: true }
        });
    },
};
