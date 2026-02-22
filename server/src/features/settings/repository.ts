/**
 * Settings Feature - Repository
 * 
 * @description Data access layer for settings management.
 */
import { prisma } from '../../config/index.js';
import { cacheInvalidate } from '../../shared/infrastructure/services/redisCache.js';

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
     * Update store settings (deep-merge with existing, same as company settings)
     */
    async updateStoreSettings(storeId: string, settings: Record<string, any>) {
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { settings: true },
        });
        const existingSettings = (store?.settings as Record<string, any>) || {};
        const mergedSettings = { ...existingSettings, ...settings };
        return prisma.store.update({
            where: { id: storeId },
            data: {
                settings: mergedSettings,
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
     * Update company settings (deep-merge with existing)
     */
    async updateCompanySettings(companyId: string, settings: Record<string, any>) {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });
        const existingSettings = (company?.settings as Record<string, any>) || {};
        const mergedSettings = { ...existingSettings, ...settings };
        const result = await prisma.company.update({
            where: { id: companyId },
            data: {
                settings: mergedSettings,
                updatedAt: new Date(),
            },
        });
        // Invalidate cached company settings
        await cacheInvalidate(`company-settings:${companyId}`);
        return result;
    },

    /**
     * Get first active store for a company (used for AIMS operations that need a store context)
     */
    async getFirstCompanyStore(companyId: string) {
        return prisma.store.findFirst({
            where: { companyId, isActive: true },
            select: { id: true },
        });
    },

    /**
     * Check if a user has allStoresAccess for the company that owns a given store.
     * Returns the store (with company) if access is granted, null otherwise.
     */
    async checkAllStoresAccess(userId: string, storeId: string) {
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { id: true, name: true, code: true, companyId: true, settings: true },
        });
        if (!store) return null;

        const uc = await prisma.userCompany.findFirst({
            where: { userId, companyId: store.companyId, allStoresAccess: true },
        });
        return uc ? store : null;
    },
};
