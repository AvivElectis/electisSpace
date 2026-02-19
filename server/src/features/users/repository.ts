/**
 * Users Feature - Repository
 * 
 * @description Data access layer for user management. All Prisma operations.
 */
import { prisma } from '../../config/index.js';
import type { Prisma, StoreRole, CompanyRole } from '@prisma/client';

// ======================
// User Queries
// ======================

export const userRepository = {
    /**
     * Find users with pagination and filters
     */
    async findMany(params: {
        where?: Prisma.UserWhereInput;
        skip?: number;
        take?: number;
        orderBy?: Prisma.UserOrderByWithRelationInput;
    }) {
        return prisma.user.findMany({
            ...params,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                globalRole: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                userCompanies: {
                    select: {
                        companyId: true,
                        role: true,
                        allStoresAccess: true,
                        company: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            }
                        }
                    }
                },
                userStores: {
                    select: {
                        id: true,
                        storeId: true,
                        role: true,
                        features: true,
                        store: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            }
                        }
                    }
                }
            },
        });
    },

    /**
     * Count users matching criteria
     */
    async count(where?: Prisma.UserWhereInput) {
        return prisma.user.count({ where });
    },

    /**
     * Find user by ID
     */
    async findById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                globalRole: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                userCompanies: {
                    select: {
                        id: true,
                        companyId: true,
                        role: true,
                        allStoresAccess: true,
                        company: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            }
                        }
                    }
                },
                userStores: {
                    select: {
                        id: true,
                        storeId: true,
                        role: true,
                        features: true,
                        store: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                companyId: true,
                                company: {
                                    select: {
                                        id: true,
                                        name: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
        });
    },

    /**
     * Find user by email
     */
    async findByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email },
        });
    },

    /**
     * Find user with stores
     */
    async findWithStores(id: string) {
        return prisma.user.findUnique({
            where: { id },
            include: { userStores: true },
        });
    },

    /**
     * Create user with company and store assignments
     */
    async create(data: {
        email: string;
        firstName?: string;
        lastName?: string;
        passwordHash: string;
        activeCompanyId: string;
        companyAssignment: {
            companyId: string;
            allStoresAccess: boolean;
            role: CompanyRole;
        };
        storeAssignments?: Array<{
            storeId: string;
            role: StoreRole;
            features: string[];
        }>;
    }) {
        return prisma.user.create({
            data: {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                passwordHash: data.passwordHash,
                activeCompanyId: data.activeCompanyId,
                userCompanies: {
                    create: {
                        companyId: data.companyAssignment.companyId,
                        allStoresAccess: data.companyAssignment.allStoresAccess,
                        role: data.companyAssignment.role,
                    },
                },
                userStores: data.storeAssignments ? {
                    create: data.storeAssignments.map(sa => ({
                        storeId: sa.storeId,
                        role: sa.role,
                        features: sa.features,
                    })),
                } : undefined,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                globalRole: true,
                isActive: true,
                createdAt: true,
                activeCompanyId: true,
                userCompanies: {
                    select: {
                        companyId: true,
                        allStoresAccess: true,
                        role: true,
                        company: {
                            select: { id: true, code: true, name: true },
                        },
                    },
                },
                userStores: {
                    select: {
                        storeId: true,
                        role: true,
                        features: true,
                        store: {
                            select: { id: true, code: true, name: true },
                        },
                    },
                },
            },
        });
    },

    /**
     * Update user basic info
     */
    async update(id: string, data: Prisma.UserUpdateInput) {
        return prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                globalRole: true,
                isActive: true,
                updatedAt: true,
            },
        });
    },

    /**
     * Delete user
     */
    async delete(id: string) {
        return prisma.user.delete({ where: { id } });
    },

    // ======================
    // User-Store Operations
    // ======================

    /**
     * Find user-store assignment
     */
    async findUserStore(userId: string, storeId: string) {
        return prisma.userStore.findUnique({
            where: { userId_storeId: { userId, storeId } },
        });
    },

    /**
     * Create user-store assignment
     */
    async createUserStore(data: {
        userId: string;
        storeId: string;
        role: StoreRole;
        features: string[];
    }) {
        return prisma.userStore.create({
            data,
            include: {
                store: {
                    select: { name: true, code: true }
                }
            }
        });
    },

    /**
     * Update user-store assignment
     */
    async updateUserStore(userId: string, storeId: string, data: {
        role?: StoreRole;
        features?: string[];
    }) {
        return prisma.userStore.update({
            where: { userId_storeId: { userId, storeId } },
            data,
            include: {
                store: {
                    select: { name: true, code: true }
                }
            }
        });
    },

    /**
     * Delete user-store assignment
     */
    async deleteUserStore(userId: string, storeId: string) {
        return prisma.userStore.delete({
            where: { userId_storeId: { userId, storeId } },
        });
    },

    // ======================
    // User-Company Operations
    // ======================

    /**
     * Find user-company assignment
     */
    async findUserCompany(userId: string, companyId: string) {
        return prisma.userCompany.findUnique({
            where: { userId_companyId: { userId, companyId } },
        });
    },

    /**
     * Get user's company assignments
     */
    async getUserCompanies(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                userCompanies: {
                    select: {
                        companyId: true,
                        allStoresAccess: true,
                        role: true,
                        company: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                                location: true,
                            },
                        },
                    },
                },
            },
        });
    },

    /**
     * Create user-company assignment
     */
    async createUserCompany(data: {
        userId: string;
        companyId: string;
        allStoresAccess: boolean;
        role: CompanyRole;
    }) {
        return prisma.userCompany.create({
            data,
            include: {
                company: {
                    select: { id: true, code: true, name: true, location: true },
                },
            },
        });
    },

    /**
     * Update user-company assignment
     */
    async updateUserCompany(userId: string, companyId: string, data: {
        allStoresAccess?: boolean;
        role?: CompanyRole;
    }) {
        return prisma.userCompany.update({
            where: { userId_companyId: { userId, companyId } },
            data,
            include: {
                company: {
                    select: { code: true, name: true },
                },
            },
        });
    },

    /**
     * Upsert user-company with company admin role
     */
    async upsertUserCompanyAdmin(userId: string, companyId: string) {
        return prisma.userCompany.upsert({
            where: { userId_companyId: { userId, companyId } },
            create: {
                userId,
                companyId,
                role: 'COMPANY_ADMIN',
                allStoresAccess: true,
            },
            update: {
                role: 'COMPANY_ADMIN',
                allStoresAccess: true,
            },
        });
    },

    /**
     * Delete user-company assignment with cascade
     */
    async deleteUserCompanyWithCascade(userId: string, companyId: string) {
        return prisma.$transaction(async (tx) => {
            // Get company stores
            const companyStores = await tx.store.findMany({
                where: { companyId },
                select: { id: true },
            });

            // Remove user from all company stores
            await tx.userStore.deleteMany({
                where: {
                    userId,
                    storeId: { in: companyStores.map(s => s.id) },
                },
            });

            // Remove company assignment
            await tx.userCompany.delete({
                where: { userId_companyId: { userId, companyId } },
            });

            // Clear active company if needed
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (user?.activeCompanyId === companyId) {
                await tx.user.update({
                    where: { id: userId },
                    data: { activeCompanyId: null, activeStoreId: null },
                });
            }
        });
    },

    /**
     * Count company admins
     */
    async countCompanyAdmins(companyId: string) {
        return prisma.userCompany.count({
            where: { companyId, role: 'COMPANY_ADMIN' },
        });
    },

    // ======================
    // Context Operations
    // ======================

    /**
     * Get user context (active company/store)
     */
    async getUserContext(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                activeCompanyId: true,
                activeStoreId: true,
                userCompanies: {
                    select: {
                        companyId: true,
                        allStoresAccess: true,
                        role: true,
                        company: {
                            select: { id: true, code: true, name: true },
                        },
                    },
                },
                userStores: {
                    select: {
                        storeId: true,
                        role: true,
                        features: true,
                        store: {
                            select: { id: true, code: true, name: true, companyId: true },
                        },
                    },
                },
            },
        });
    },

    /**
     * Update user context
     */
    async updateContext(userId: string, data: {
        activeCompanyId?: string | null;
        activeStoreId?: string | null;
    }) {
        return prisma.user.update({
            where: { id: userId },
            data,
            select: { activeCompanyId: true, activeStoreId: true },
        });
    },

    // ======================
    // Company/Store Lookups
    // ======================

    /**
     * Find company by ID
     */
    async findCompany(id: string) {
        return prisma.company.findUnique({ where: { id } });
    },

    /**
     * Find company by code
     */
    async findCompanyByCode(code: string) {
        return prisma.company.findUnique({ where: { code } });
    },

    /**
     * Create company
     */
    async createCompany(data: {
        code: string;
        name: string;
        location?: string;
        description?: string;
    }) {
        return prisma.company.create({ data });
    },

    /**
     * Find store by ID
     */
    async findStore(id: string) {
        return prisma.store.findUnique({
            where: { id },
            select: { id: true, companyId: true },
        });
    },

    /**
     * Find store by company and code
     */
    async findStoreByCompanyAndCode(companyId: string, code: string) {
        return prisma.store.findFirst({
            where: { companyId, code },
        });
    },

    /**
     * Create store
     */
    async createStore(data: {
        code: string;
        name: string;
        companyId: string;
    }) {
        return prisma.store.create({ data });
    },

    /**
     * Get company stores
     */
    async getCompanyStores(companyId: string) {
        return prisma.store.findMany({
            where: { companyId },
            select: { id: true },
        });
    },

    /**
     * Batch-fetch active stores for multiple companies (for allStoresAccess expansion)
     */
    async findStoresByCompanyIds(companyIds: string[]) {
        if (companyIds.length === 0) return [];
        return prisma.store.findMany({
            where: { companyId: { in: companyIds }, isActive: true },
            select: { id: true, name: true, code: true, companyId: true },
        });
    },

    // ======================
    // Elevation Operations
    // ======================

    /**
     * Update user global role
     */
    async updateGlobalRole(userId: string, globalRole: 'PLATFORM_ADMIN' | null) {
        return prisma.user.update({
            where: { id: userId },
            data: { globalRole },
            select: { id: true, email: true, globalRole: true },
        });
    },

    /**
     * Get user with company admin info
     */
    async getUserWithCompanyAdmin(userId: string, companyId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                globalRole: true,
                userCompanies: {
                    where: { companyId },
                    select: {
                        companyId: true,
                        role: true,
                        allStoresAccess: true,
                        company: {
                            select: { name: true, code: true },
                        },
                    },
                },
            },
        });
    },
};
