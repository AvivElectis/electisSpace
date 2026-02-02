import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/index.js';
import { authenticate, notFound, conflict, badRequest, forbidden } from '../../shared/middleware/index.js';
import { StoreRole, GlobalRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Available features for assignment
const AVAILABLE_FEATURES = ['dashboard', 'spaces', 'conference', 'people'] as const;
type Feature = typeof AVAILABLE_FEATURES[number];

// Company code validation regex (3+ uppercase letters)
const COMPANY_CODE_REGEX = /^[A-Z]{3,}$/;

// Store code validation regex (numeric string)
const STORE_CODE_REGEX = /^\d+$/;

// ===========================
// Enhanced Validation Schemas
// ===========================

// Company reference - existing or new
const companyRefSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('existing'),
        id: z.string().uuid(),
    }),
    z.object({
        type: z.literal('new'),
        code: z.string().regex(COMPANY_CODE_REGEX, 'Company code must be 3+ uppercase letters'),
        name: z.string().min(1).max(200),
        location: z.string().max(200).optional(),
        description: z.string().max(500).optional(),
    }),
]);

// Store reference - existing or new
const storeRefSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('existing'),
        id: z.string().uuid(),
        role: z.enum(['STORE_ADMIN', 'STORE_MANAGER', 'STORE_EMPLOYEE', 'STORE_VIEWER']).default('STORE_VIEWER'),
        features: z.array(z.enum(AVAILABLE_FEATURES)).default(['dashboard']),
    }),
    z.object({
        type: z.literal('new'),
        code: z.string().regex(STORE_CODE_REGEX, 'Store code must be numeric'),
        name: z.string().min(1).max(200),
        role: z.enum(['STORE_ADMIN', 'STORE_MANAGER', 'STORE_EMPLOYEE', 'STORE_VIEWER']).default('STORE_VIEWER'),
        features: z.array(z.enum(AVAILABLE_FEATURES)).default(['dashboard']),
    }),
]);

// Enhanced create user schema with company/store inline creation
const createUserSchema = z.object({
    email: z.string().email(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    password: z.string().min(8),
    company: companyRefSchema,
    allStoresAccess: z.boolean().default(false),
    stores: z.array(storeRefSchema).min(1, 'At least one store is required when allStoresAccess is false').optional(),
}).refine(
    (data) => data.allStoresAccess || (data.stores && data.stores.length > 0),
    { message: 'Either allStoresAccess must be true or at least one store must be specified', path: ['stores'] }
);

const updateUserSchema = z.object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    isActive: z.boolean().optional(),
});

const updateUserStoreSchema = z.object({
    role: z.enum(['STORE_ADMIN', 'STORE_MANAGER', 'STORE_EMPLOYEE', 'STORE_VIEWER']).optional(),
    features: z.array(z.enum(AVAILABLE_FEATURES)).optional(),
});

const assignUserToStoreSchema = z.object({
    userId: z.string().uuid(),
    storeId: z.string().uuid(),
    role: z.enum(['STORE_ADMIN', 'STORE_MANAGER', 'STORE_EMPLOYEE', 'STORE_VIEWER']).default('STORE_VIEWER'),
    features: z.array(z.enum(AVAILABLE_FEATURES)).default(['dashboard']),
});

// User elevation schema
const elevateUserSchema = z.object({
    globalRole: z.enum(['USER', 'COMPANY_ADMIN', 'PLATFORM_ADMIN']),
    companyId: z.string().uuid().optional(), // Required for COMPANY_ADMIN
}).refine(
    (data) => data.globalRole !== 'COMPANY_ADMIN' || data.companyId,
    { message: 'companyId is required when elevating to COMPANY_ADMIN', path: ['companyId'] }
);

// User company assignment schema
const assignUserToCompanySchema = z.object({
    company: companyRefSchema,
    allStoresAccess: z.boolean().default(false),
    isCompanyAdmin: z.boolean().default(false),
});

// Context update schema
const updateContextSchema = z.object({
    activeCompanyId: z.string().uuid().nullable().optional(),
    activeStoreId: z.string().uuid().nullable().optional(),
});

// ===========================
// Helper Functions
// ===========================

// Helper: Check if user is platform admin
const isPlatformAdmin = (req: any): boolean => {
    return req.user?.globalRole === GlobalRole.PLATFORM_ADMIN;
};

// Helper: Check if user is company admin for a specific company
const isCompanyAdmin = async (req: any, companyId: string): Promise<boolean> => {
    if (isPlatformAdmin(req)) return true;
    
    // Check UserCompany for company admin role
    const userCompany = await prisma.userCompany.findUnique({
        where: {
            userId_companyId: {
                userId: req.user!.id,
                companyId,
            }
        }
    });
    
    return userCompany?.isCompanyAdmin === true;
};

// Helper: Check if current user can manage a company
const canManageCompany = async (req: any, companyId: string): Promise<boolean> => {
    if (isPlatformAdmin(req)) return true;
    return await isCompanyAdmin(req, companyId);
};

// Helper: Check if current user can manage users in a store
const canManageStore = (req: any, storeId: string): boolean => {
    // Platform admins can manage any store
    if (req.user?.globalRole === GlobalRole.PLATFORM_ADMIN) return true;
    
    // Check if user is store admin for this store
    const storeAccess = req.user?.stores?.find((s: any) => s.id === storeId);
    return storeAccess?.role === 'STORE_ADMIN';
};

// GET /users - List users for current user's stores
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const search = req.query.search as string;
        const storeId = req.query.storeId as string;

        // Get stores the current user can manage
        let managedStoreIds: string[] = [];
        
        if (req.user?.globalRole === GlobalRole.PLATFORM_ADMIN) {
            // Platform admins see all users, optionally filtered by store
            if (storeId) {
                managedStoreIds = [storeId];
            }
        } else {
            // Regular users only see users in stores where they are admin
            managedStoreIds = (req.user?.stores || [])
                .filter((s: any) => s.role === 'STORE_ADMIN')
                .map((s: any) => s.id);
            
            if (storeId && managedStoreIds.includes(storeId)) {
                managedStoreIds = [storeId];
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

        // For non-platform admins, filter by managed stores
        if (managedStoreIds.length > 0 && req.user?.globalRole !== GlobalRole.PLATFORM_ADMIN) {
            where.userStores = {
                some: {
                    storeId: { in: managedStoreIds }
                }
            };
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    globalRole: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
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
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        // Transform response to flatten store access
        const transformedUsers = users.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            globalRole: user.globalRole,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            stores: user.userStores.map(us => ({
                id: us.storeId,
                name: us.store.name,
                code: us.store.code,
                role: us.role,
                features: us.features as string[],
            })),
        }));

        res.json({
            data: transformedUsers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /users/features - Get available features
router.get('/features', async (_req, res) => {
    res.json({
        features: AVAILABLE_FEATURES.map(f => ({
            id: f,
            name: f.charAt(0).toUpperCase() + f.slice(1),
        })),
    });
});

// GET /users/:id - Get user details
router.get('/:id', async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
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

        if (!user) {
            throw notFound('User');
        }

        res.json({
            ...user,
            stores: user.userStores.map(us => ({
                id: us.storeId,
                name: us.store.name,
                code: us.store.code,
                role: us.role,
                features: us.features as string[],
                companyId: us.store.companyId,
                companyName: us.store.company.name,
            })),
            userStores: undefined,
        });
    } catch (error) {
        next(error);
    }
});

// POST /users - Create new user with company/store assignment (supports inline creation)
router.post('/', async (req, res, next) => {
    try {
        const data = createUserSchema.parse(req.body);

        // Check email unique
        const existing = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existing) {
            throw conflict('Email already exists');
        }

        // Only platform admins can create users with new companies
        if (data.company.type === 'new' && !isPlatformAdmin(req)) {
            throw forbidden('Only platform admins can create new companies');
        }

        // Process in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Resolve or create company
            let companyId: string;
            
            if (data.company.type === 'existing') {
                // Verify company exists and user has permission
                const company = await tx.company.findUnique({ where: { id: data.company.id } });
                if (!company) throw notFound('Company');
                
                if (!isPlatformAdmin(req)) {
                    const canManage = await isCompanyAdmin(req, company.id);
                    if (!canManage) throw forbidden('You do not have permission to add users to this company');
                }
                companyId = company.id;
            } else {
                // Create new company
                const existingCode = await tx.company.findUnique({ 
                    where: { code: data.company.code } 
                });
                if (existingCode) throw conflict('Company code already exists');

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

            // 2. Resolve or create stores
            const storeAssignments: Array<{ storeId: string; role: StoreRole; features: string[] }> = [];

            if (!data.allStoresAccess && data.stores) {
                for (const storeRef of data.stores) {
                    if (storeRef.type === 'existing') {
                        // Verify store exists and belongs to the company
                        const store = await tx.store.findUnique({ where: { id: storeRef.id } });
                        if (!store) throw notFound('Store');
                        if (store.companyId !== companyId) {
                            throw badRequest('Store does not belong to the specified company');
                        }
                        storeAssignments.push({
                            storeId: store.id,
                            role: storeRef.role as StoreRole,
                            features: storeRef.features || ['dashboard'],
                        });
                    } else {
                        // Create new store
                        const existingCode = await tx.store.findFirst({
                            where: { companyId, code: storeRef.code },
                        });
                        if (existingCode) throw conflict(`Store code ${storeRef.code} already exists in this company`);

                        const newStore = await tx.store.create({
                            data: {
                                code: storeRef.code,
                                name: storeRef.name,
                                companyId,
                            },
                        });
                        storeAssignments.push({
                            storeId: newStore.id,
                            role: storeRef.role as StoreRole,
                            features: storeRef.features || ['dashboard'],
                        });
                    }
                }
            }

            // 3. Hash password
            const passwordHash = await bcrypt.hash(data.password, 12);

            // 4. Create user with company and store assignments
            const user = await tx.user.create({
                data: {
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    passwordHash,
                    activeCompanyId: companyId,
                    userCompanies: {
                        create: {
                            companyId,
                            allStoresAccess: data.allStoresAccess,
                            isCompanyAdmin: false, // Default, can be elevated later
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
                    globalRole: true,
                    isActive: true,
                    createdAt: true,
                    activeCompanyId: true,
                    userCompanies: {
                        select: {
                            companyId: true,
                            allStoresAccess: true,
                            isCompanyAdmin: true,
                            company: {
                                select: {
                                    id: true,
                                    code: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    userStores: {
                        select: {
                            storeId: true,
                            role: true,
                            features: true,
                            store: {
                                select: {
                                    id: true,
                                    code: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });

            return user;
        });

        res.status(201).json({
            ...result,
            companies: result.userCompanies.map(uc => ({
                id: uc.companyId,
                code: uc.company.code,
                name: uc.company.name,
                allStoresAccess: uc.allStoresAccess,
                isCompanyAdmin: uc.isCompanyAdmin,
            })),
            stores: result.userStores.map(us => ({
                id: us.storeId,
                code: us.store.code,
                name: us.store.name,
                role: us.role,
                features: us.features as string[],
            })),
            userCompanies: undefined,
            userStores: undefined,
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /users/:id - Update user basic info
router.patch('/:id', async (req, res, next) => {
    try {
        const data = updateUserSchema.parse(req.body);

        // Find user
        const existing = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: { userStores: true }
        });

        if (!existing) {
            throw notFound('User');
        }

        // Check if current user can manage at least one of the target user's stores
        const canManage = existing.userStores.some(us => canManageStore(req, us.storeId));
        if (!canManage && req.user?.globalRole !== GlobalRole.PLATFORM_ADMIN) {
            throw forbidden('You do not have permission to update this user');
        }

        // Prevent self-deactivation
        if (req.params.id === req.user!.id && data.isActive === false) {
            throw badRequest('Cannot deactivate yourself');
        }

        // Update user
        const user = await prisma.user.update({
            where: { id: req.params.id },
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

        res.json(user);
    } catch (error) {
        next(error);
    }
});

// PATCH /users/:id/stores/:storeId - Update user's store role and features
router.patch('/:id/stores/:storeId', async (req, res, next) => {
    try {
        const data = updateUserStoreSchema.parse(req.body);
        const { id: userId, storeId } = req.params;

        // Check if current user can manage this store
        if (!canManageStore(req, storeId)) {
            throw forbidden('You do not have permission to manage users in this store');
        }

        // Find user-store relationship
        const userStore = await prisma.userStore.findUnique({
            where: {
                userId_storeId: {
                    userId,
                    storeId,
                }
            }
        });

        if (!userStore) {
            throw notFound('User is not assigned to this store');
        }

        // Prevent self-demotion from admin
        if (userId === req.user!.id && data.role && data.role !== 'STORE_ADMIN' && userStore.role === 'STORE_ADMIN') {
            throw badRequest('Cannot demote yourself from store admin');
        }

        // Update user-store relationship
        const updated = await prisma.userStore.update({
            where: {
                userId_storeId: {
                    userId,
                    storeId,
                }
            },
            data: {
                ...(data.role && { role: data.role as StoreRole }),
                ...(data.features && { features: data.features }),
            },
            include: {
                store: {
                    select: {
                        name: true,
                        code: true,
                    }
                }
            }
        });

        res.json({
            storeId: updated.storeId,
            name: updated.store.name,
            code: updated.store.code,
            role: updated.role,
            features: updated.features as string[],
        });
    } catch (error) {
        next(error);
    }
});

// POST /users/:id/stores - Assign user to additional store
router.post('/:id/stores', async (req, res, next) => {
    try {
        const data = assignUserToStoreSchema.parse({ ...req.body, userId: req.params.id });

        // Check if current user can manage the target store
        if (!canManageStore(req, data.storeId)) {
            throw forbidden('You do not have permission to add users to this store');
        }

        // Check user exists
        const user = await prisma.user.findUnique({
            where: { id: data.userId }
        });

        if (!user) {
            throw notFound('User');
        }

        // Check store exists
        const store = await prisma.store.findUnique({
            where: { id: data.storeId }
        });

        if (!store) {
            throw notFound('Store');
        }

        // Check if already assigned
        const existing = await prisma.userStore.findUnique({
            where: {
                userId_storeId: {
                    userId: data.userId,
                    storeId: data.storeId,
                }
            }
        });

        if (existing) {
            throw conflict('User is already assigned to this store');
        }

        // Create assignment
        const userStore = await prisma.userStore.create({
            data: {
                userId: data.userId,
                storeId: data.storeId,
                role: data.role as StoreRole,
                features: data.features,
            },
            include: {
                store: {
                    select: {
                        name: true,
                        code: true,
                    }
                }
            }
        });

        res.status(201).json({
            storeId: userStore.storeId,
            name: userStore.store.name,
            code: userStore.store.code,
            role: userStore.role,
            features: userStore.features as string[],
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /users/:id/stores/:storeId - Remove user from store
router.delete('/:id/stores/:storeId', async (req, res, next) => {
    try {
        const { id: userId, storeId } = req.params;

        // Check if current user can manage this store
        if (!canManageStore(req, storeId)) {
            throw forbidden('You do not have permission to remove users from this store');
        }

        // Prevent self-removal
        if (userId === req.user!.id) {
            throw badRequest('Cannot remove yourself from a store');
        }

        // Check assignment exists
        const userStore = await prisma.userStore.findUnique({
            where: {
                userId_storeId: {
                    userId,
                    storeId,
                }
            }
        });

        if (!userStore) {
            throw notFound('User is not assigned to this store');
        }

        // Delete assignment
        await prisma.userStore.delete({
            where: {
                userId_storeId: {
                    userId,
                    storeId,
                }
            }
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// DELETE /users/:id - Delete user entirely
router.delete('/:id', async (req, res, next) => {
    try {
        // Prevent self-deletion
        if (req.params.id === req.user!.id) {
            throw badRequest('Cannot delete yourself');
        }

        // Find user
        const existing = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: { userStores: true }
        });

        if (!existing) {
            throw notFound('User');
        }

        // Only platform admins or store admins who manage ALL of the user's stores can delete
        if (req.user?.globalRole !== GlobalRole.PLATFORM_ADMIN) {
            const canDeleteAll = existing.userStores.every(us => canManageStore(req, us.storeId));
            if (!canDeleteAll) {
                throw forbidden('You do not have permission to delete this user. You must be admin for all their stores.');
            }
        }

        // Delete user (cascade will remove userStores)
        await prisma.user.delete({
            where: { id: req.params.id },
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// ===========================
// User Elevation Routes
// ===========================

// POST /users/:id/elevate - Elevate user to higher global role
router.post('/:id/elevate', async (req, res, next) => {
    try {
        // Only platform admins can elevate users
        if (!isPlatformAdmin(req)) {
            throw forbidden('Only platform admins can elevate user roles');
        }

        const data = elevateUserSchema.parse(req.body);
        const userId = req.params.id;

        // Prevent self-demotion
        if (userId === req.user!.id && data.globalRole === GlobalRole.USER) {
            throw badRequest('Cannot demote yourself');
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw notFound('User');
        }

        // If elevating to COMPANY_ADMIN, verify company exists
        if (data.globalRole === GlobalRole.COMPANY_ADMIN && data.companyId) {
            const company = await prisma.company.findUnique({
                where: { id: data.companyId },
            });
            if (!company) {
                throw notFound('Company');
            }

            // Update user globalRole and set company admin
            const updated = await prisma.$transaction(async (tx) => {
                // Update user global role
                await tx.user.update({
                    where: { id: userId },
                    data: { globalRole: data.globalRole },
                });

                // Upsert UserCompany with isCompanyAdmin = true
                await tx.userCompany.upsert({
                    where: {
                        userId_companyId: { userId, companyId: data.companyId! },
                    },
                    create: {
                        userId,
                        companyId: data.companyId!,
                        isCompanyAdmin: true,
                        allStoresAccess: true, // Company admins have access to all stores
                    },
                    update: {
                        isCompanyAdmin: true,
                        allStoresAccess: true,
                    },
                });

                return tx.user.findUnique({
                    where: { id: userId },
                    select: {
                        id: true,
                        email: true,
                        globalRole: true,
                        userCompanies: {
                            where: { companyId: data.companyId! },
                            select: {
                                companyId: true,
                                isCompanyAdmin: true,
                                allStoresAccess: true,
                                company: {
                                    select: { name: true, code: true },
                                },
                            },
                        },
                    },
                });
            });

            res.json({
                id: updated!.id,
                email: updated!.email,
                globalRole: updated!.globalRole,
                companyAdmin: updated!.userCompanies[0] ? {
                    companyId: updated!.userCompanies[0].companyId,
                    companyName: updated!.userCompanies[0].company.name,
                    companyCode: updated!.userCompanies[0].company.code,
                } : null,
            });
        } else {
            // Just update globalRole (for USER or PLATFORM_ADMIN)
            const updated = await prisma.user.update({
                where: { id: userId },
                data: { globalRole: data.globalRole },
                select: {
                    id: true,
                    email: true,
                    globalRole: true,
                },
            });

            res.json(updated);
        }
    } catch (error) {
        next(error);
    }
});

// ===========================
// User Company Assignment Routes
// ===========================

// GET /users/:id/companies - Get user's company assignments
router.get('/:id/companies', async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                userCompanies: {
                    select: {
                        companyId: true,
                        allStoresAccess: true,
                        isCompanyAdmin: true,
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

        if (!user) {
            throw notFound('User');
        }

        res.json({
            userId: user.id,
            companies: user.userCompanies.map(uc => ({
                id: uc.companyId,
                code: uc.company.code,
                name: uc.company.name,
                location: uc.company.location,
                allStoresAccess: uc.allStoresAccess,
                isCompanyAdmin: uc.isCompanyAdmin,
            })),
        });
    } catch (error) {
        next(error);
    }
});

// POST /users/:id/companies - Assign user to company (with optional inline creation)
router.post('/:id/companies', async (req, res, next) => {
    try {
        const userId = req.params.id;
        const data = assignUserToCompanySchema.parse(req.body);

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw notFound('User');
        }

        // Only platform admins can create new companies
        if (data.company.type === 'new' && !isPlatformAdmin(req)) {
            throw forbidden('Only platform admins can create new companies');
        }

        const result = await prisma.$transaction(async (tx) => {
            // Resolve or create company
            let companyId: string;

            if (data.company.type === 'existing') {
                const company = await tx.company.findUnique({ where: { id: data.company.id } });
                if (!company) throw notFound('Company');
                
                if (!isPlatformAdmin(req)) {
                    const canManage = await isCompanyAdmin(req, company.id);
                    if (!canManage) throw forbidden('You do not have permission to assign users to this company');
                }
                companyId = company.id;
            } else {
                const existingCode = await tx.company.findUnique({ where: { code: data.company.code } });
                if (existingCode) throw conflict('Company code already exists');

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

            // Check if already assigned
            const existing = await tx.userCompany.findUnique({
                where: { userId_companyId: { userId, companyId } },
            });

            if (existing) {
                throw conflict('User is already assigned to this company');
            }

            // Create assignment
            const userCompany = await tx.userCompany.create({
                data: {
                    userId,
                    companyId,
                    allStoresAccess: data.allStoresAccess,
                    isCompanyAdmin: data.isCompanyAdmin,
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            location: true,
                        },
                    },
                },
            });

            return userCompany;
        });

        res.status(201).json({
            companyId: result.companyId,
            code: result.company.code,
            name: result.company.name,
            location: result.company.location,
            allStoresAccess: result.allStoresAccess,
            isCompanyAdmin: result.isCompanyAdmin,
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /users/:id/companies/:companyId - Update user's company assignment
router.patch('/:id/companies/:companyId', async (req, res, next) => {
    try {
        const { id: userId, companyId } = req.params;
        const { allStoresAccess, isCompanyAdmin: makeCompanyAdmin } = req.body;

        // Permission check
        if (!isPlatformAdmin(req)) {
            const canManage = await isCompanyAdmin(req, companyId);
            if (!canManage) throw forbidden('You do not have permission to update this assignment');
            
            // Non-platform admins cannot make someone company admin
            if (makeCompanyAdmin === true) {
                throw forbidden('Only platform admins can grant company admin role');
            }
        }

        const existing = await prisma.userCompany.findUnique({
            where: { userId_companyId: { userId, companyId } },
        });

        if (!existing) {
            throw notFound('User is not assigned to this company');
        }

        const updated = await prisma.userCompany.update({
            where: { userId_companyId: { userId, companyId } },
            data: {
                ...(allStoresAccess !== undefined && { allStoresAccess }),
                ...(makeCompanyAdmin !== undefined && { isCompanyAdmin: makeCompanyAdmin }),
            },
            include: {
                company: {
                    select: {
                        code: true,
                        name: true,
                    },
                },
            },
        });

        res.json({
            companyId: updated.companyId,
            code: updated.company.code,
            name: updated.company.name,
            allStoresAccess: updated.allStoresAccess,
            isCompanyAdmin: updated.isCompanyAdmin,
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /users/:id/companies/:companyId - Remove user from company
router.delete('/:id/companies/:companyId', async (req, res, next) => {
    try {
        const { id: userId, companyId } = req.params;

        // Permission check
        if (!isPlatformAdmin(req)) {
            const canManage = await isCompanyAdmin(req, companyId);
            if (!canManage) throw forbidden('You do not have permission to remove users from this company');
        }

        // Prevent self-removal if you're the only company admin
        if (userId === req.user!.id) {
            const adminCount = await prisma.userCompany.count({
                where: { companyId, isCompanyAdmin: true },
            });
            
            if (adminCount <= 1) {
                throw badRequest('Cannot remove yourself as the only company admin');
            }
        }

        const existing = await prisma.userCompany.findUnique({
            where: { userId_companyId: { userId, companyId } },
        });

        if (!existing) {
            throw notFound('User is not assigned to this company');
        }

        // Delete company assignment and related store assignments
        await prisma.$transaction(async (tx) => {
            // Get all stores in this company
            const companyStores = await tx.store.findMany({
                where: { companyId },
                select: { id: true },
            });

            // Remove user from all stores in this company
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

            // If this was the user's active company, clear it
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (user?.activeCompanyId === companyId) {
                await tx.user.update({
                    where: { id: userId },
                    data: { activeCompanyId: null, activeStoreId: null },
                });
            }
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// ===========================
// User Context Routes (for /me)
// ===========================

// GET /users/me/context - Get current user's active company/store context
router.get('/me/context', async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true,
                activeCompanyId: true,
                activeStoreId: true,
                userCompanies: {
                    select: {
                        companyId: true,
                        allStoresAccess: true,
                        isCompanyAdmin: true,
                        company: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                            },
                        },
                    },
                },
                userStores: {
                    select: {
                        storeId: true,
                        role: true,
                        features: true,
                        store: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                                companyId: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw notFound('User');
        }

        // Get active company details if set
        let activeCompany = null;
        if (user.activeCompanyId) {
            const uc = user.userCompanies.find(c => c.companyId === user.activeCompanyId);
            if (uc) {
                activeCompany = {
                    id: uc.companyId,
                    code: uc.company.code,
                    name: uc.company.name,
                    allStoresAccess: uc.allStoresAccess,
                    isCompanyAdmin: uc.isCompanyAdmin,
                };
            }
        }

        // Get active store details if set
        let activeStore = null;
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

        res.json({
            activeCompany,
            activeStore,
            availableCompanies: user.userCompanies.map(uc => ({
                id: uc.companyId,
                code: uc.company.code,
                name: uc.company.name,
                allStoresAccess: uc.allStoresAccess,
                isCompanyAdmin: uc.isCompanyAdmin,
            })),
            availableStores: user.userStores.map(us => ({
                id: us.storeId,
                code: us.store.code,
                name: us.store.name,
                companyId: us.store.companyId,
                role: us.role,
                features: us.features as string[],
            })),
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /users/me/context - Update current user's active company/store
router.patch('/me/context', async (req, res, next) => {
    try {
        const data = updateContextSchema.parse(req.body);
        const userId = req.user!.id;

        // Validate that user has access to the selected company
        if (data.activeCompanyId !== undefined && data.activeCompanyId !== null) {
            const hasAccess = await prisma.userCompany.findUnique({
                where: { userId_companyId: { userId, companyId: data.activeCompanyId } },
            });
            if (!hasAccess) {
                throw forbidden('You do not have access to this company');
            }
        }

        // Validate that user has access to the selected store
        if (data.activeStoreId !== undefined && data.activeStoreId !== null) {
            const store = await prisma.store.findUnique({
                where: { id: data.activeStoreId },
                select: { id: true, companyId: true },
            });

            if (!store) {
                throw notFound('Store');
            }

            // Check direct store access or allStoresAccess
            const userStore = await prisma.userStore.findUnique({
                where: { userId_storeId: { userId, storeId: data.activeStoreId } },
            });

            const userCompany = await prisma.userCompany.findUnique({
                where: { userId_companyId: { userId, companyId: store.companyId } },
            });

            if (!userStore && !userCompany?.allStoresAccess) {
                throw forbidden('You do not have access to this store');
            }

            // If setting a store, also set the company
            if (data.activeCompanyId === undefined) {
                data.activeCompanyId = store.companyId;
            }
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(data.activeCompanyId !== undefined && { activeCompanyId: data.activeCompanyId }),
                ...(data.activeStoreId !== undefined && { activeStoreId: data.activeStoreId }),
            },
            select: {
                activeCompanyId: true,
                activeStoreId: true,
            },
        });

        res.json({
            activeCompanyId: updated.activeCompanyId,
            activeStoreId: updated.activeStoreId,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
