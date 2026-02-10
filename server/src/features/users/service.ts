/**
 * Users Feature - Service
 * 
 * @description Business logic for user management. Authorization, validation,
 * and orchestration of repository calls.
 */
import bcrypt from 'bcrypt';
import { GlobalRole, StoreRole, CompanyRole } from '@prisma/client';
import { prisma } from '../../config/index.js';
import { userRepository } from './repository.js';
import type {
    UserContext,
    UserListParams,
    CreateUserDto,
    UpdateUserDto,
    UpdateUserStoreDto,
    ElevateUserDto,
    AssignUserToCompanyDto,
    UpdateUserCompanyDto,
    UpdateContextDto,
    CompanyRef,
    StoreRef,
    UserListItem,
    UserListResponse,
    UserStoreInfo,
    UserCompanyInfo,
    UserContextResponse,
    AVAILABLE_FEATURES,
} from './types.js';

// ======================
// Authorization Helpers
// ======================

export function isPlatformAdmin(user: UserContext): boolean {
    return user.globalRole === GlobalRole.PLATFORM_ADMIN;
}

export async function isCompanyAdmin(userId: string, companyId: string): Promise<boolean> {
    const userCompany = await userRepository.findUserCompany(userId, companyId);
    return userCompany?.role === 'COMPANY_ADMIN';
}

export async function canManageCompany(user: UserContext, companyId: string): Promise<boolean> {
    if (isPlatformAdmin(user)) return true;
    return await isCompanyAdmin(user.id, companyId);
}

export function canManageStore(user: UserContext, storeId: string): boolean {
    if (isPlatformAdmin(user)) return true;
    const storeAccess = user.stores?.find(s => s.id === storeId);
    return storeAccess?.role === 'STORE_ADMIN';
}

// ======================
// Service
// ======================

export const userService = {
    /**
     * Get current user's full profile
     */
    async getMyProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                userCompanies: {
                    include: {
                        company: true,
                    },
                },
                userStores: {
                    include: {
                        store: {
                            include: {
                                company: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            globalRole: user.globalRole,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            lastActivity: user.lastActivity,
            loginCount: user.loginCount,
            createdAt: user.createdAt,
            companies: user.userCompanies.map(uc => ({
                company: {
                    id: uc.company.id,
                    name: uc.company.name,
                    code: uc.company.code,
                },
                role: uc.role,
                allStoresAccess: uc.allStoresAccess,
            })),
            stores: user.userStores.map(us => ({
                store: {
                    id: us.store.id,
                    name: us.store.name,
                    code: us.store.code,
                },
                role: us.role,
                features: us.features as string[],
            })),
        };
    },

    /**
     * Update current user's profile
     */
    async updateMyProfile(userId: string, data: { firstName?: string | null; lastName?: string | null; phone?: string | null }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: data.firstName !== undefined ? data.firstName : undefined,
                lastName: data.lastName !== undefined ? data.lastName : undefined,
                phone: data.phone !== undefined ? data.phone : undefined,
                lastActivity: new Date(),
            },
            include: {
                userCompanies: {
                    include: {
                        company: true,
                    },
                },
                userStores: {
                    include: {
                        store: {
                            include: {
                                company: true,
                            },
                        },
                    },
                },
            },
        });

        return {
            id: updated.id,
            email: updated.email,
            firstName: updated.firstName,
            lastName: updated.lastName,
            phone: updated.phone,
            globalRole: updated.globalRole,
            isActive: updated.isActive,
            lastLogin: updated.lastLogin,
            lastActivity: updated.lastActivity,
            loginCount: updated.loginCount,
            createdAt: updated.createdAt,
            companies: updated.userCompanies.map(uc => ({
                company: {
                    id: uc.company.id,
                    name: uc.company.name,
                    code: uc.company.code,
                },
                role: uc.role,
                allStoresAccess: uc.allStoresAccess,
            })),
            stores: updated.userStores.map(us => ({
                store: {
                    id: us.store.id,
                    name: us.store.name,
                    code: us.store.code,
                },
                role: us.role,
                features: us.features as string[],
            })),
        };
    },

    /**
     * Change current user's password
     */
    async changeMyPassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        
        if (!isValidPassword) {
            throw new Error('INVALID_PASSWORD');
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 12);
        
        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: newPasswordHash,
                passwordChangedAt: new Date(),
                lastActivity: new Date(),
            },
        });
    },

    /**
     * List users with filtering and pagination
     */
    async list(params: UserListParams, user: UserContext): Promise<UserListResponse> {
        const { page, limit, search, storeId, companyId } = params;
        const skip = (page - 1) * limit;

        // Get manageable stores
        let managedStoreIds: string[] = [];

        if (isPlatformAdmin(user)) {
            if (storeId) {
                managedStoreIds = [storeId];
            } else if (companyId) {
                const companyStores = await userRepository.getCompanyStores(companyId);
                managedStoreIds = companyStores.map(s => s.id);
            }
        } else {
            managedStoreIds = (user.stores || [])
                .filter(s => s.role === 'STORE_ADMIN')
                .map(s => s.id);

            if (storeId && managedStoreIds.includes(storeId)) {
                managedStoreIds = [storeId];
            }

            // Non-admin users with no managed stores cannot list any users
            if (managedStoreIds.length === 0) {
                return {
                    data: [],
                    pagination: { page, limit, total: 0, totalPages: 0 },
                };
            }
        }

        // Build query
        const where: any = {
            ...(search && {
                OR: [
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { firstName: { contains: search, mode: 'insensitive' as const } },
                    { lastName: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        // Always scope non-admin users to their managed stores
        if (!isPlatformAdmin(user)) {
            where.userStores = {
                some: { storeId: { in: managedStoreIds } }
            };
        }

        const [users, total] = await Promise.all([
            userRepository.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
            userRepository.count(where),
        ]);

        const data: UserListItem[] = users.map(u => ({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            globalRole: u.globalRole,
            isActive: u.isActive,
            lastLogin: u.lastLogin,
            createdAt: u.createdAt,
            stores: u.userStores.map(us => ({
                id: us.storeId,
                name: us.store.name,
                code: us.store.code,
                role: us.role,
                features: us.features as string[],
            })),
        }));

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Get user by ID
     */
    async getById(id: string) {
        const user = await userRepository.findById(id);
        if (!user) return null;

        return {
            ...user,
            companies: user.userCompanies.map(uc => ({
                company: {
                    id: uc.company.id,
                    name: uc.company.name,
                    code: uc.company.code,
                },
                role: uc.role,
                allStoresAccess: uc.allStoresAccess,
            })),
            stores: user.userStores.map(us => ({
                store: {
                    id: us.store.id,
                    name: us.store.name,
                    code: us.store.code,
                    companyId: us.store.companyId,
                },
                role: us.role,
                features: us.features as string[],
            })),
            userCompanies: undefined,
            userStores: undefined,
        };
    },

    /**
     * Check if an email is already registered
     */
    async checkEmailExists(email: string): Promise<boolean> {
        const existing = await userRepository.findByEmail(email);
        return !!existing;
    },

    /**
     * Create user with company/store assignments
     */
    async create(data: CreateUserDto, currentUser: UserContext) {
        // Check email unique
        const existing = await userRepository.findByEmail(data.email);
        if (existing) {
            throw new Error('EMAIL_EXISTS');
        }

        // Only platform admins can create new companies
        if (data.company.type === 'new' && !isPlatformAdmin(currentUser)) {
            throw new Error('FORBIDDEN_CREATE_COMPANY');
        }

        return prisma.$transaction(async (tx) => {
            // Resolve company
            let companyId: string;

            if (data.company.type === 'existing') {
                const company = await tx.company.findUnique({ where: { id: data.company.id } });
                if (!company) throw new Error('COMPANY_NOT_FOUND');

                if (!isPlatformAdmin(currentUser)) {
                    const canManage = await isCompanyAdmin(currentUser.id, company.id);
                    if (!canManage) throw new Error('FORBIDDEN_MANAGE_COMPANY');
                }
                companyId = company.id;
            } else {
                const existingCode = await tx.company.findUnique({ where: { code: data.company.code } });
                if (existingCode) throw new Error('COMPANY_CODE_EXISTS');

                const newCompany = await tx.company.create({
                    data: {
                        code: data.company.code,
                        name: data.company.name,
                        location: data.company.location,
                        description: data.company.description,
                    },
                });
                companyId = newCompany.id;
            }

            // Resolve stores
            const storeAssignments: Array<{ storeId: string; role: StoreRole; features: string[] }> = [];

            if (!data.allStoresAccess && data.stores) {
                for (const storeRef of data.stores) {
                    if (storeRef.type === 'existing') {
                        const store = await tx.store.findUnique({ where: { id: storeRef.id } });
                        if (!store) throw new Error('STORE_NOT_FOUND');
                        if (store.companyId !== companyId) throw new Error('STORE_COMPANY_MISMATCH');

                        storeAssignments.push({
                            storeId: store.id,
                            role: storeRef.role as StoreRole,
                            features: storeRef.features || ['dashboard'],
                        });
                    } else {
                        const existingCode = await tx.store.findFirst({
                            where: { companyId, code: storeRef.code },
                        });
                        if (existingCode) throw new Error(`STORE_CODE_EXISTS:${storeRef.code}`);

                        const newStore = await tx.store.create({
                            data: { code: storeRef.code, name: storeRef.name, companyId },
                        });
                        storeAssignments.push({
                            storeId: newStore.id,
                            role: storeRef.role as StoreRole,
                            features: storeRef.features || ['dashboard'],
                        });
                    }
                }
            }

            // Hash password
            const passwordHash = await bcrypt.hash(data.password, 12);

            // Create user
            const user = await tx.user.create({
                data: {
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    phone: data.phone,
                    passwordHash,
                    activeCompanyId: companyId,
                    userCompanies: {
                        create: {
                            companyId,
                            allStoresAccess: data.allStoresAccess,
                            role: 'VIEWER',
                        },
                    },
                    userStores: data.allStoresAccess ? undefined : {
                        create: storeAssignments.map(sa => ({
                            storeId: sa.storeId,
                            role: sa.role,
                            features: sa.features,
                        })),
                    },
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    globalRole: true,
                    isActive: true,
                    createdAt: true,
                    activeCompanyId: true,
                    userCompanies: {
                        select: {
                            companyId: true,
                            allStoresAccess: true,
                            role: true,
                            company: { select: { id: true, code: true, name: true } },
                        },
                    },
                    userStores: {
                        select: {
                            storeId: true,
                            role: true,
                            features: true,
                            store: { select: { id: true, code: true, name: true } },
                        },
                    },
                },
            });

            return user;
        });
    },

    /**
     * Update user basic info
     */
    async update(id: string, data: UpdateUserDto, currentUser: UserContext) {
        const existing = await userRepository.findWithStores(id);
        if (!existing) throw new Error('USER_NOT_FOUND');

        // Check permission
        const canManage = existing.userStores.some(us => canManageStore(currentUser, us.storeId));
        if (!canManage && !isPlatformAdmin(currentUser)) {
            throw new Error('FORBIDDEN');
        }

        // Prevent self-deactivation
        if (id === currentUser.id && data.isActive === false) {
            throw new Error('CANNOT_DEACTIVATE_SELF');
        }

        // Hash password if provided
        const { password, ...rest } = data;
        const updateData: Record<string, any> = { ...rest };
        if (password) {
            updateData.passwordHash = await bcrypt.hash(password, 12);
        }

        return userRepository.update(id, updateData);
    },

    /**
     * Update user-store assignment
     */
    async updateUserStore(userId: string, storeId: string, data: UpdateUserStoreDto, currentUser: UserContext) {
        if (!canManageStore(currentUser, storeId)) {
            throw new Error('FORBIDDEN');
        }

        const userStore = await userRepository.findUserStore(userId, storeId);
        if (!userStore) throw new Error('USER_STORE_NOT_FOUND');

        // Prevent self-demotion
        if (userId === currentUser.id && data.role && data.role !== 'STORE_ADMIN' && userStore.role === 'STORE_ADMIN') {
            throw new Error('CANNOT_DEMOTE_SELF');
        }

        return userRepository.updateUserStore(userId, storeId, {
            ...(data.role && { role: data.role as StoreRole }),
            ...(data.features && { features: data.features }),
        });
    },

    /**
     * Assign user to store
     */
    async assignToStore(userId: string, storeId: string, role: string, features: string[], currentUser: UserContext) {
        if (!canManageStore(currentUser, storeId)) {
            throw new Error('FORBIDDEN');
        }

        const user = await userRepository.findById(userId);
        if (!user) throw new Error('USER_NOT_FOUND');

        const store = await userRepository.findStore(storeId);
        if (!store) throw new Error('STORE_NOT_FOUND');

        const existing = await userRepository.findUserStore(userId, storeId);
        if (existing) throw new Error('ALREADY_ASSIGNED');

        return userRepository.createUserStore({
            userId,
            storeId,
            role: role as StoreRole,
            features,
        });
    },

    /**
     * Remove user from store
     */
    async removeFromStore(userId: string, storeId: string, currentUser: UserContext) {
        if (!canManageStore(currentUser, storeId)) {
            throw new Error('FORBIDDEN');
        }

        if (userId === currentUser.id) {
            throw new Error('CANNOT_REMOVE_SELF');
        }

        const userStore = await userRepository.findUserStore(userId, storeId);
        if (!userStore) throw new Error('USER_STORE_NOT_FOUND');

        await userRepository.deleteUserStore(userId, storeId);
    },

    /**
     * Delete user
     */
    async delete(id: string, currentUser: UserContext) {
        if (id === currentUser.id) {
            throw new Error('CANNOT_DELETE_SELF');
        }

        const existing = await userRepository.findWithStores(id);
        if (!existing) throw new Error('USER_NOT_FOUND');

        if (!isPlatformAdmin(currentUser)) {
            const canDeleteAll = existing.userStores.every(us => canManageStore(currentUser, us.storeId));
            if (!canDeleteAll) throw new Error('FORBIDDEN');
        }

        await userRepository.delete(id);
    },

    /**
     * Elevate user role
     */
    async elevate(userId: string, data: ElevateUserDto, currentUser: UserContext) {
        if (!isPlatformAdmin(currentUser)) {
            throw new Error('FORBIDDEN');
        }

        if (userId === currentUser.id && data.globalRole === 'USER') {
            throw new Error('CANNOT_DEMOTE_SELF');
        }

        const user = await userRepository.findById(userId);
        if (!user) throw new Error('USER_NOT_FOUND');

        if (data.globalRole === 'COMPANY_ADMIN' && data.companyId) {
            const company = await userRepository.findCompany(data.companyId);
            if (!company) throw new Error('COMPANY_NOT_FOUND');

            await userRepository.upsertUserCompanyAdmin(userId, data.companyId);
            return userRepository.getUserWithCompanyAdmin(userId, data.companyId);
        } else {
            const newGlobalRole = data.globalRole === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' as const : null;
            return userRepository.updateGlobalRole(userId, newGlobalRole);
        }
    },

    /**
     * Get user's company assignments
     */
    async getUserCompanies(userId: string) {
        const user = await userRepository.getUserCompanies(userId);
        if (!user) throw new Error('USER_NOT_FOUND');

        return {
            userId: user.id,
            companies: user.userCompanies.map(uc => ({
                id: uc.companyId,
                code: uc.company.code,
                name: uc.company.name,
                location: uc.company.location,
                allStoresAccess: uc.allStoresAccess,
                isCompanyAdmin: uc.role === 'COMPANY_ADMIN',
            })),
        };
    },

    /**
     * Assign user to company
     */
    async assignToCompany(userId: string, data: AssignUserToCompanyDto, currentUser: UserContext) {
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('USER_NOT_FOUND');

        if (data.company.type === 'new' && !isPlatformAdmin(currentUser)) {
            throw new Error('FORBIDDEN_CREATE_COMPANY');
        }

        return prisma.$transaction(async (tx) => {
            let companyId: string;

            if (data.company.type === 'existing') {
                const company = await tx.company.findUnique({ where: { id: data.company.id } });
                if (!company) throw new Error('COMPANY_NOT_FOUND');

                if (!isPlatformAdmin(currentUser)) {
                    const canManage = await isCompanyAdmin(currentUser.id, company.id);
                    if (!canManage) throw new Error('FORBIDDEN_MANAGE_COMPANY');
                }
                companyId = company.id;
            } else {
                const existingCode = await tx.company.findUnique({ where: { code: data.company.code } });
                if (existingCode) throw new Error('COMPANY_CODE_EXISTS');

                const newCompany = await tx.company.create({
                    data: {
                        code: data.company.code,
                        name: data.company.name,
                        location: data.company.location,
                        description: data.company.description,
                    },
                });
                companyId = newCompany.id;
            }

            const existing = await tx.userCompany.findUnique({
                where: { userId_companyId: { userId, companyId } },
            });
            if (existing) throw new Error('ALREADY_ASSIGNED');

            return tx.userCompany.create({
                data: {
                    userId,
                    companyId,
                    allStoresAccess: data.allStoresAccess,
                    role: data.isCompanyAdmin ? 'COMPANY_ADMIN' : 'VIEWER',
                },
                include: {
                    company: { select: { id: true, code: true, name: true, location: true } },
                },
            });
        });
    },

    /**
     * Update user-company assignment
     */
    async updateUserCompany(userId: string, companyId: string, data: UpdateUserCompanyDto, currentUser: UserContext) {
        if (!isPlatformAdmin(currentUser)) {
            const canManage = await isCompanyAdmin(currentUser.id, companyId);
            if (!canManage) throw new Error('FORBIDDEN');
            if (data.isCompanyAdmin === true) throw new Error('FORBIDDEN_GRANT_ADMIN');
        }

        const existing = await userRepository.findUserCompany(userId, companyId);
        if (!existing) throw new Error('USER_COMPANY_NOT_FOUND');

        return userRepository.updateUserCompany(userId, companyId, {
            ...(data.allStoresAccess !== undefined && { allStoresAccess: data.allStoresAccess }),
            ...(data.isCompanyAdmin !== undefined && { role: data.isCompanyAdmin ? 'COMPANY_ADMIN' : 'VIEWER' }),
        });
    },

    /**
     * Remove user from company
     */
    async removeFromCompany(userId: string, companyId: string, currentUser: UserContext) {
        if (!isPlatformAdmin(currentUser)) {
            const canManage = await isCompanyAdmin(currentUser.id, companyId);
            if (!canManage) throw new Error('FORBIDDEN');
        }

        if (userId === currentUser.id) {
            const adminCount = await userRepository.countCompanyAdmins(companyId);
            if (adminCount <= 1) throw new Error('LAST_ADMIN');
        }

        const existing = await userRepository.findUserCompany(userId, companyId);
        if (!existing) throw new Error('USER_COMPANY_NOT_FOUND');

        await userRepository.deleteUserCompanyWithCascade(userId, companyId);
    },

    /**
     * Get user context
     */
    async getContext(userId: string): Promise<UserContextResponse> {
        const user = await userRepository.getUserContext(userId);
        if (!user) throw new Error('USER_NOT_FOUND');

        let activeCompany: UserCompanyInfo | null = null;
        if (user.activeCompanyId) {
            const uc = user.userCompanies.find(c => c.companyId === user.activeCompanyId);
            if (uc) {
                activeCompany = {
                    id: uc.companyId,
                    code: uc.company.code,
                    name: uc.company.name,
                    allStoresAccess: uc.allStoresAccess,
                    isCompanyAdmin: uc.role === 'COMPANY_ADMIN',
                };
            }
        }

        let activeStore: UserStoreInfo | null = null;
        if (user.activeStoreId) {
            const us = user.userStores.find(s => s.storeId === user.activeStoreId);
            if (us) {
                activeStore = {
                    id: us.storeId,
                    code: us.store.code,
                    name: us.store.name,
                    role: us.role,
                    features: us.features as string[],
                };
            }
        }

        return {
            activeCompany,
            activeStore,
            availableCompanies: user.userCompanies.map(uc => ({
                id: uc.companyId,
                code: uc.company.code,
                name: uc.company.name,
                allStoresAccess: uc.allStoresAccess,
                isCompanyAdmin: uc.role === 'COMPANY_ADMIN',
            })),
            availableStores: user.userStores.map(us => ({
                id: us.storeId,
                code: us.store.code,
                name: us.store.name,
                companyId: us.store.companyId,
                role: us.role,
                features: us.features as string[],
            })),
        };
    },

    /**
     * Update user context
     */
    async updateContext(userId: string, data: UpdateContextDto) {
        // Validate company access
        if (data.activeCompanyId !== undefined && data.activeCompanyId !== null) {
            const hasAccess = await userRepository.findUserCompany(userId, data.activeCompanyId);
            if (!hasAccess) throw new Error('FORBIDDEN_COMPANY');
        }

        // Validate store access
        if (data.activeStoreId !== undefined && data.activeStoreId !== null) {
            const store = await userRepository.findStore(data.activeStoreId);
            if (!store) throw new Error('STORE_NOT_FOUND');

            const userStore = await userRepository.findUserStore(userId, data.activeStoreId);
            const userCompany = await userRepository.findUserCompany(userId, store.companyId);

            if (!userStore && !userCompany?.allStoresAccess) {
                throw new Error('FORBIDDEN_STORE');
            }

            if (data.activeCompanyId === undefined) {
                data.activeCompanyId = store.companyId;
            }
        }

        return userRepository.updateContext(userId, {
            ...(data.activeCompanyId !== undefined && { activeCompanyId: data.activeCompanyId }),
            ...(data.activeStoreId !== undefined && { activeStoreId: data.activeStoreId }),
        });
    },
};
