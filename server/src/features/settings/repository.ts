/**
 * Settings Feature - Repository
 * 
 * @description Data access layer for settings management.
 */
import { prisma } from '../../config/index.js';

// ======================
// Repository
// ======================

export const settingsRepository = {
    // ======================
    // Store Queries
    // ======================

    /**
     * Get store by ID
     */
    async getStore(storeId: string) {
        return prisma.store.findUnique({
            where: { id: storeId },
        });
    },

    /**
     * Get user's store access
     */
    async getUserStoreAccess(userId: string, storeId: string) {
        return prisma.userStore.findFirst({
            where: { userId, storeId },
            include: { store: true },
        });
    },

    /**
     * Update store settings
     */
    async updateStoreSettings(storeId: string, settings: Record<string, any>) {
        return prisma.store.update({
            where: { id: storeId },
            data: {
                settings,
                updatedAt: new Date(),
            },
        });
    },

    // ======================
    // Company Queries
    // ======================

    /**
     * Get company by ID
     */
    async getCompany(companyId: string) {
        return prisma.company.findUnique({
            where: { id: companyId },
        });
    },

    /**
     * Get user's company access
     */
    async getUserCompanyAccess(userId: string, companyId: string) {
        return prisma.userCompany.findFirst({
            where: { userId, companyId },
            include: { company: true },
        });
    },

    /**
     * Get user's company admin access
     */
    async getUserCompanyAdminAccess(userId: string, companyId: string) {
        return prisma.userCompany.findFirst({
            where: { userId, companyId, role: 'COMPANY_ADMIN' },
            include: { company: true },
        });
    },

    /**
     * Update company settings
     */
    async updateCompanySettings(companyId: string, settings: Record<string, any>) {
        return prisma.company.update({
            where: { id: companyId },
            data: {
                settings,
                updatedAt: new Date(),
            },
        });
    },
};
