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

// Validation schemas
const createUserSchema = z.object({
    email: z.string().email(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    password: z.string().min(8),
    storeId: z.string().uuid(),
    role: z.enum(['STORE_ADMIN', 'STORE_MANAGER', 'STORE_EMPLOYEE', 'STORE_VIEWER']).default('STORE_VIEWER'),
    features: z.array(z.enum(AVAILABLE_FEATURES)).default(['dashboard']),
});

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
                                    storeNumber: true,
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
                storeNumber: us.store.storeNumber,
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
                                storeNumber: true,
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
                storeNumber: us.store.storeNumber,
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

// POST /users - Create new user and assign to store
router.post('/', async (req, res, next) => {
    try {
        const data = createUserSchema.parse(req.body);

        // Check if user can manage the target store
        if (!canManageStore(req, data.storeId)) {
            throw forbidden('You do not have permission to add users to this store');
        }

        // Check email unique
        const existing = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existing) {
            throw conflict('Email already exists');
        }

        // Verify store exists
        const store = await prisma.store.findUnique({
            where: { id: data.storeId },
        });

        if (!store) {
            throw notFound('Store');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(data.password, 12);

        // Create user with store assignment
        const user = await prisma.user.create({
            data: {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                passwordHash,
                userStores: {
                    create: {
                        storeId: data.storeId,
                        role: data.role as StoreRole,
                        features: data.features,
                    }
                }
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                globalRole: true,
                isActive: true,
                createdAt: true,
                userStores: {
                    select: {
                        storeId: true,
                        role: true,
                        features: true,
                        store: {
                            select: {
                                name: true,
                                storeNumber: true,
                            }
                        }
                    }
                }
            },
        });

        res.status(201).json({
            ...user,
            stores: user.userStores.map(us => ({
                id: us.storeId,
                name: us.store.name,
                storeNumber: us.store.storeNumber,
                role: us.role,
                features: us.features as string[],
            })),
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
                        storeNumber: true,
                    }
                }
            }
        });

        res.json({
            storeId: updated.storeId,
            name: updated.store.name,
            storeNumber: updated.store.storeNumber,
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
                        storeNumber: true,
                    }
                }
            }
        });

        res.status(201).json({
            storeId: userStore.storeId,
            name: userStore.store.name,
            storeNumber: userStore.store.storeNumber,
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

export default router;
