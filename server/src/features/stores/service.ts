/**
 * Stores Feature - Service
 * 
 * @description Business logic for store management.
 */
import { GlobalRole, CompanyRole, StoreRole } from '@prisma/client';
import { storeRepository, companyRepository, userCompanyRepository } from './repository.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import type { StoreUserContext, CreateStoreInput, UpdateStoreInput, StoreResponse, StoreListResponse, CodeValidationResponse } from './types.js';
import { storeCodeSchema } from './types.js';
import {
    extractCompanyFeatures,
    extractSpaceType,
    extractStoreFeatures,
    extractStoreSpaceType,
    resolveEffectiveFeatures,
    resolveEffectiveSpaceType,
} from '../../shared/utils/featureResolution.js';

// ======================
// Authorization Helpers
// ======================

const isPlatformAdmin = (user: StoreUserContext): boolean => {
    return user.globalRole === GlobalRole.PLATFORM_ADMIN;
};

const canManageCompany = (user: StoreUserContext, companyId: string): boolean => {
    if (isPlatformAdmin(user)) return true;
    
    const companyAccess = user.companies?.find(c => c.id === companyId);
    return companyAccess?.role === CompanyRole.COMPANY_ADMIN;
};

const canManageStore = (user: StoreUserContext, storeId: string): boolean => {
    if (isPlatformAdmin(user)) return true;
    
    const storeAccess = user.stores?.find(s => s.id === storeId);
    return storeAccess?.role === StoreRole.STORE_ADMIN;
};

const hasCompanyAccess = (user: StoreUserContext, companyId: string): boolean => {
    if (isPlatformAdmin(user)) return true;
    return user.companies?.some(c => c.id === companyId) ?? false;
};

const hasStoreAccess = (user: StoreUserContext, storeId: string, companyId?: string): boolean => {
    if (isPlatformAdmin(user)) return true;
    
    // Direct store access
    if (user.stores?.some(s => s.id === storeId)) return true;
    
    // Company-wide access
    if (companyId) {
        const companyAccess = user.companies?.find(c => c.id === companyId);
        if (companyAccess?.allStoresAccess) return true;
    }
    
    return false;
};

// ======================
// Service
// ======================

export const storeService = {
    /**
     * List stores in a company
     */
    async listByCompany(companyId: string, user: StoreUserContext): Promise<StoreListResponse> {
        const company = await companyRepository.findById(companyId);
        if (!company) {
            throw new Error('COMPANY_NOT_FOUND');
        }
        
        if (!hasCompanyAccess(user, companyId)) {
            throw new Error('FORBIDDEN_COMPANY');
        }
        
        const userCompanyAccess = await userCompanyRepository.getUserCompanyAccess(user.id, companyId);
        const allStoresAccess = isPlatformAdmin(user) || (userCompanyAccess?.allStoresAccess ?? false);
        const userStoreIds = user.stores?.map(s => s.id) || [];
        
        const stores = await storeRepository.listByCompany(companyId, user.id);
        
        // Filter stores based on access (unless allStoresAccess)
        const accessibleStores: StoreResponse[] = stores
            .filter(s => allStoresAccess || userStoreIds.includes(s.id))
            .map(s => ({
                id: s.id,
                code: s.code,
                name: s.name,
                timezone: s.timezone,
                syncEnabled: s.syncEnabled,
                lastAimsSyncAt: s.lastAimsSyncAt,
                isActive: s.isActive,
                spaceCount: s._count.spaces,
                peopleCount: s._count.people,
                conferenceRoomCount: s._count.conferenceRooms,
                userRole: s.userStores[0]?.role || (allStoresAccess ? 'COMPANY_WIDE_ACCESS' : null),
                userFeatures: (s.userStores[0]?.features as string[]) || (allStoresAccess ? ['dashboard', 'spaces', 'conference', 'people', 'sync', 'settings', 'labels'] : []),
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
            }));
        
        return {
            company: {
                id: company.id,
                code: company.code,
                name: company.name,
            },
            stores: accessibleStores,
            allStoresAccess,
        };
    },

    /**
     * Validate if a store code is available
     */
    async validateCode(companyId: string, code: string): Promise<CodeValidationResponse> {
        const validation = storeCodeSchema.safeParse(code);
        if (!validation.success) {
            return {
                available: false,
                reason: validation.error.errors[0].message
            };
        }
        
        const existing = await storeRepository.findByCompanyAndCode(companyId, code);
        return {
            available: !existing,
            reason: existing ? 'Store code already exists in this company' : null
        };
    },

    /**
     * Get store details
     */
    async getById(id: string, user: StoreUserContext) {
        const store = await storeRepository.findByIdWithDetails(id, user.id);
        
        if (!store) {
            throw new Error('STORE_NOT_FOUND');
        }
        
        if (!hasStoreAccess(user, id, store.companyId)) {
            throw new Error('FORBIDDEN_STORE');
        }
        
        return {
            store: {
                id: store.id,
                code: store.code,
                name: store.name,
                timezone: store.timezone,
                syncEnabled: store.syncEnabled,
                lastAimsSyncAt: store.lastAimsSyncAt,
                isActive: store.isActive,
                spaceCount: store._count.spaces,
                peopleCount: store._count.people,
                conferenceRoomCount: store._count.conferenceRooms,
                userCount: store._count.userStores,
                userRole: store.userStores[0]?.role,
                userFeatures: store.userStores[0]?.features as string[] | undefined,
                createdAt: store.createdAt,
                updatedAt: store.updatedAt,
            },
            company: store.company,
        };
    },

    /**
     * Create a new store
     */
    async create(companyId: string, data: CreateStoreInput, user: StoreUserContext) {
        const company = await companyRepository.findById(companyId);
        if (!company) {
            throw new Error('COMPANY_NOT_FOUND');
        }
        
        if (!canManageCompany(user, companyId)) {
            throw new Error('FORBIDDEN_CREATE');
        }
        
        // Check code uniqueness within company
        const existing = await storeRepository.findByCompanyAndCode(companyId, data.code);
        if (existing) {
            throw new Error('CODE_EXISTS');
        }
        
        const store = await storeRepository.create({
            companyId,
            code: data.code,
            name: data.name,
            timezone: data.timezone,
            syncEnabled: data.syncEnabled,
        });
        
        return {
            store: {
                id: store.id,
                code: store.code,
                name: store.name,
                timezone: store.timezone,
                syncEnabled: store.syncEnabled,
                isActive: store.isActive,
                spaceCount: store._count.spaces,
                peopleCount: store._count.people,
                createdAt: store.createdAt,
            }
        };
    },

    /**
     * Update a store
     */
    async update(id: string, data: UpdateStoreInput, user: StoreUserContext) {
        const existingStore = await storeRepository.findById(id);

        if (!existingStore) {
            throw new Error('STORE_NOT_FOUND');
        }

        // Check permission (store admin or company admin)
        if (!canManageStore(user, id) && !canManageCompany(user, existingStore.companyId)) {
            throw new Error('FORBIDDEN_UPDATE');
        }

        // Build update data
        const updateData: any = {
            name: data.name,
            timezone: data.timezone,
            syncEnabled: data.syncEnabled,
            isActive: data.isActive,
        };

        // Handle store feature overrides via settings JSON
        if (data.storeFeatures !== undefined || data.storeSpaceType !== undefined) {
            const existingSettings = (existingStore.settings as Record<string, unknown>) || {};
            const newSettings = { ...existingSettings };

            // null = clear override (inherit from company), object = set override
            if (data.storeFeatures === null) {
                delete newSettings.storeFeatures;
            } else if (data.storeFeatures) {
                newSettings.storeFeatures = data.storeFeatures;
            }

            if (data.storeSpaceType === null) {
                delete newSettings.storeSpaceType;
            } else if (data.storeSpaceType) {
                newSettings.storeSpaceType = data.storeSpaceType;
            }

            updateData.settings = newSettings;
        }

        // Remove undefined keys
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const store = await storeRepository.update(id, updateData);

        return {
            store: {
                id: store.id,
                code: store.code,
                name: store.name,
                timezone: store.timezone,
                syncEnabled: store.syncEnabled,
                isActive: store.isActive,
                updatedAt: store.updatedAt,
            }
        };
    },

    /**
     * Delete a store
     */
    async delete(id: string, user: StoreUserContext) {
        const store = await storeRepository.findWithCounts(id);
        
        if (!store) {
            throw new Error('STORE_NOT_FOUND');
        }
        
        // Only company admins or platform admins can delete stores
        if (!canManageCompany(user, store.companyId)) {
            throw new Error('FORBIDDEN_DELETE');
        }
        
        // Warn about cascading deletes
        const totalEntities = store._count.spaces + store._count.people + store._count.conferenceRooms;
        if (totalEntities > 0) {
            appLogger.warn('StoreService', `Deleting store ${store.code} with ${totalEntities} entities`);
        }
        
        await storeRepository.delete(id);
        
        return {
            success: true,
            message: `Store ${store.code} deleted`,
            deletedSpaces: store._count.spaces,
            deletedPeople: store._count.people,
            deletedConferenceRooms: store._count.conferenceRooms,
        };
    },
};
