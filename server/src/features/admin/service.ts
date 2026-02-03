/**
 * Admin Feature - Service
 * 
 * @description Business logic for admin panel operations.
 */
import { adminRepository } from './repository.js';
import type {
    OverviewResponse,
    PaginationInput,
    StoreListFilters,
    EntityListFilters,
    SyncQueueFilters,
    AuditLogFilters,
    ImpersonateContextInput,
} from './types.js';

// ======================
// Service
// ======================

export const adminService = {
    /**
     * Get platform-wide overview statistics
     */
    async getOverview(): Promise<OverviewResponse> {
        const stats = await adminRepository.getOverviewStats();
        
        return {
            companies: { total: stats.companiesCount },
            stores: { total: stats.storesCount },
            users: { total: stats.usersCount, active: stats.activeUsersCount },
            entities: {
                spaces: stats.spacesCount,
                people: stats.peopleCount,
                conferenceRooms: stats.conferenceRoomsCount,
            },
            sync: { pending: stats.pendingSyncCount, failed: stats.failedSyncCount },
        };
    },

    /**
     * List all companies
     */
    async listCompanies({ page, limit, search }: PaginationInput) {
        const skip = (page - 1) * limit;
        const { companies, total } = await adminRepository.listCompanies(search, skip, limit);

        return {
            data: companies.map(c => ({
                id: c.id,
                code: c.code,
                name: c.name,
                location: c.location,
                isActive: c.isActive,
                hasAimsConfig: !!(c.aimsBaseUrl && c.aimsUsername),
                storesCount: c._count.stores,
                usersCount: c._count.userCompanies,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Get detailed company info
     */
    async getCompanyDetails(companyId: string) {
        const company = await adminRepository.getCompanyDetails(companyId);
        
        if (!company) {
            throw new Error('COMPANY_NOT_FOUND');
        }

        return {
            id: company.id,
            code: company.code,
            name: company.name,
            location: company.location,
            description: company.description,
            isActive: company.isActive,
            aimsConfig: {
                configured: !!(company.aimsBaseUrl && company.aimsUsername),
                baseUrl: company.aimsBaseUrl,
                cluster: company.aimsCluster,
                username: company.aimsUsername,
                // Password intentionally not returned
            },
            stores: company.stores.map(s => ({
                id: s.id,
                code: s.code,
                name: s.name,
                isActive: s.isActive,
                syncEnabled: s.syncEnabled,
                lastSyncAt: s.lastAimsSyncAt,
                spacesCount: s._count.spaces,
                peopleCount: s._count.people,
                conferenceRoomsCount: s._count.conferenceRooms,
            })),
            users: company.userCompanies.map(uc => ({
                id: uc.user.id,
                email: uc.user.email,
                firstName: uc.user.firstName,
                lastName: uc.user.lastName,
                isActive: uc.user.isActive,
                lastLogin: uc.user.lastLogin,
                role: uc.role,
                allStoresAccess: uc.allStoresAccess,
            })),
            createdAt: company.createdAt,
            updatedAt: company.updatedAt,
        };
    },

    /**
     * List all stores
     */
    async listStores({ page, limit, search, companyId }: StoreListFilters) {
        const skip = (page - 1) * limit;
        const { stores, total } = await adminRepository.listStores(search, companyId, skip, limit);

        // Get pending sync counts
        const storeIds = stores.map(s => s.id);
        const pendingSyncCounts = await adminRepository.getPendingSyncCounts(storeIds);
        const pendingSyncMap = new Map(pendingSyncCounts.map(p => [p.storeId, p._count.id]));

        return {
            data: stores.map(s => ({
                id: s.id,
                code: s.code,
                name: s.name,
                isActive: s.isActive,
                syncEnabled: s.syncEnabled,
                lastSyncAt: s.lastAimsSyncAt,
                company: s.company,
                spacesCount: s._count.spaces,
                peopleCount: s._count.people,
                conferenceRoomsCount: s._count.conferenceRooms,
                pendingSyncCount: pendingSyncMap.get(s.id) || 0,
                createdAt: s.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Get detailed store info
     */
    async getStoreDetails(storeId: string) {
        const store = await adminRepository.getStoreDetails(storeId);
        
        if (!store) {
            throw new Error('STORE_NOT_FOUND');
        }

        const syncStats = await adminRepository.getStoreSyncStats(storeId);
        const recentSyncItems = await adminRepository.getRecentSyncItems(storeId);

        return {
            id: store.id,
            code: store.code,
            name: store.name,
            timezone: store.timezone,
            isActive: store.isActive,
            syncEnabled: store.syncEnabled,
            lastSyncAt: store.lastAimsSyncAt,
            company: {
                id: store.company.id,
                code: store.company.code,
                name: store.company.name,
                aimsConfigured: !!store.company.aimsBaseUrl,
            },
            counts: {
                spaces: store._count.spaces,
                people: store._count.people,
                conferenceRooms: store._count.conferenceRooms,
                users: store._count.userStores,
            },
            sync: {
                pending: syncStats.pending,
                failed: syncStats.failed,
                completed: syncStats.completed,
                recentItems: recentSyncItems,
            },
            settings: store.settings,
            createdAt: store.createdAt,
            updatedAt: store.updatedAt,
        };
    },

    /**
     * List spaces in a store
     */
    async listSpaces({ storeId, page, limit, search }: EntityListFilters) {
        const store = await adminRepository.storeExists(storeId);
        if (!store) {
            throw new Error('STORE_NOT_FOUND');
        }

        const skip = (page - 1) * limit;
        const { spaces, total } = await adminRepository.listSpaces(storeId, search, skip, limit);

        return {
            data: spaces,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },

    /**
     * List people in a store
     */
    async listPeople({ storeId, page, limit, search }: EntityListFilters) {
        const store = await adminRepository.storeExists(storeId);
        if (!store) {
            throw new Error('STORE_NOT_FOUND');
        }

        const skip = (page - 1) * limit;
        const { people, total } = await adminRepository.listPeople(storeId, search, skip, limit);

        return {
            data: people,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },

    /**
     * List conference rooms in a store
     */
    async listConferenceRooms({ storeId, page, limit, search }: EntityListFilters) {
        const store = await adminRepository.storeExists(storeId);
        if (!store) {
            throw new Error('STORE_NOT_FOUND');
        }

        const skip = (page - 1) * limit;
        const { rooms, total } = await adminRepository.listConferenceRooms(storeId, search, skip, limit);

        return {
            data: rooms,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },

    /**
     * List sync queue items
     */
    async listSyncQueue({ storeId, page, limit, status }: SyncQueueFilters) {
        const store = await adminRepository.storeExists(storeId);
        if (!store) {
            throw new Error('STORE_NOT_FOUND');
        }

        const skip = (page - 1) * limit;
        const { items, total } = await adminRepository.listSyncQueue(storeId, status, skip, limit);

        return {
            data: items,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },

    /**
     * Get impersonate context for admin viewing
     */
    async getImpersonateContext({ companyId, storeId }: ImpersonateContextInput) {
        const company = await adminRepository.getCompanyForContext(companyId);
        
        if (!company) {
            throw new Error('COMPANY_NOT_FOUND');
        }

        let store = null;
        if (storeId) {
            store = await adminRepository.getStoreForContext(storeId);
            
            if (!store) {
                throw new Error('STORE_NOT_FOUND');
            }

            // Verify store belongs to company
            const storeCheck = await adminRepository.verifyStoreInCompany(storeId, companyId);
            if (!storeCheck) {
                throw new Error('STORE_COMPANY_MISMATCH');
            }
        }

        return {
            context: {
                company: {
                    id: company.id,
                    code: company.code,
                    name: company.name,
                },
                store: store ? {
                    id: store.id,
                    code: store.code,
                    name: store.name,
                    settings: store.settings,
                    syncEnabled: store.syncEnabled,
                } : null,
                aimsConfig: company.aimsBaseUrl ? {
                    baseUrl: company.aimsBaseUrl,
                    cluster: company.aimsCluster,
                    username: company.aimsUsername,
                    hasPassword: !!company.aimsPasswordEnc,
                } : null,
            },
            message: 'Context loaded. Use this data to view store operations.',
        };
    },

    /**
     * List audit log entries
     */
    async listAuditLog({ page, limit, userId, companyId, storeId, action }: AuditLogFilters) {
        const skip = (page - 1) * limit;
        const { logs, total } = await adminRepository.listAuditLog(
            { userId, companyId, storeId, action },
            skip,
            limit
        );

        return {
            data: logs,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },
};
