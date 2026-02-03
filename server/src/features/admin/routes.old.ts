/**
 * Admin Routes
 * Platform Admin only - Browse and view any company/store data
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, forbidden, notFound, badRequest } from '../../shared/middleware/index.js';
import { GlobalRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ======================
// Middleware: Platform Admin Only
// ======================
const requirePlatformAdmin = (req: any, res: any, next: any) => {
    if (req.user?.globalRole !== GlobalRole.PLATFORM_ADMIN) {
        return next(forbidden('Platform Admin access required'));
    }
    next();
};

router.use(requirePlatformAdmin);

// ======================
// Pagination Schema
// ======================
const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
});

// ======================
// Admin Dashboard Overview
// ======================

/**
 * GET /admin/overview
 * Platform-wide statistics
 */
router.get('/overview', async (_req, res, next) => {
    try {
        const [
            companiesCount,
            storesCount,
            usersCount,
            activeUsersCount,
            spacesCount,
            peopleCount,
            conferenceRoomsCount,
            pendingSyncCount,
            failedSyncCount,
        ] = await Promise.all([
            prisma.company.count({ where: { isActive: true } }),
            prisma.store.count({ where: { isActive: true } }),
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.space.count(),
            prisma.person.count(),
            prisma.conferenceRoom.count(),
            prisma.syncQueueItem.count({ where: { status: 'PENDING' } }),
            prisma.syncQueueItem.count({ where: { status: 'FAILED' } }),
        ]);

        res.json({
            companies: {
                total: companiesCount,
            },
            stores: {
                total: storesCount,
            },
            users: {
                total: usersCount,
                active: activeUsersCount,
            },
            entities: {
                spaces: spacesCount,
                people: peopleCount,
                conferenceRooms: conferenceRoomsCount,
            },
            sync: {
                pending: pendingSyncCount,
                failed: failedSyncCount,
            },
        });
    } catch (error) {
        next(error);
    }
});

// ======================
// Browse Companies
// ======================

/**
 * GET /admin/companies
 * List all companies with detailed stats
 */
router.get('/companies', async (req, res, next) => {
    try {
        const { page, limit, search } = paginationSchema.parse(req.query);
        const skip = (page - 1) * limit;

        const where = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { code: { contains: search, mode: 'insensitive' as const } },
                { location: { contains: search, mode: 'insensitive' as const } },
            ],
        } : {};

        const [companies, total] = await Promise.all([
            prisma.company.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            stores: true,
                            userCompanies: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.company.count({ where }),
        ]);

        res.json({
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
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /admin/companies/:companyId
 * Get detailed company info including AIMS config status
 */
router.get('/companies/:companyId', async (req, res, next) => {
    try {
        const { companyId } = req.params;

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                stores: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        isActive: true,
                        syncEnabled: true,
                        lastAimsSyncAt: true,
                        _count: {
                            select: {
                                spaces: true,
                                people: true,
                                conferenceRooms: true,
                            },
                        },
                    },
                },
                userCompanies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                isActive: true,
                                lastLogin: true,
                            },
                        },
                    },
                },
            },
        });

        if (!company) {
            throw notFound('Company');
        }

        res.json({
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
        });
    } catch (error) {
        next(error);
    }
});

// ======================
// Browse Stores
// ======================

/**
 * GET /admin/stores
 * List all stores across all companies
 */
router.get('/stores', async (req, res, next) => {
    try {
        const { page, limit, search } = paginationSchema.parse(req.query);
        const companyId = req.query.companyId as string | undefined;
        const skip = (page - 1) * limit;

        const where: any = {};
        
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }
        
        if (companyId) {
            where.companyId = companyId;
        }

        const [stores, total] = await Promise.all([
            prisma.store.findMany({
                where,
                include: {
                    company: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            spaces: true,
                            people: true,
                            conferenceRooms: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.store.count({ where }),
        ]);

        // Get pending sync counts for each store
        const storeIds = stores.map(s => s.id);
        const pendingSyncCounts = await prisma.syncQueueItem.groupBy({
            by: ['storeId'],
            where: {
                storeId: { in: storeIds },
                status: 'PENDING',
            },
            _count: { id: true },
        });
        const pendingSyncMap = new Map(pendingSyncCounts.map(p => [p.storeId, p._count.id]));

        res.json({
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
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /admin/stores/:storeId
 * Get detailed store info with entity counts and sync status
 */
router.get('/stores/:storeId', async (req, res, next) => {
    try {
        const { storeId } = req.params;

        const store = await prisma.store.findUnique({
            where: { id: storeId },
            include: {
                company: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        aimsBaseUrl: true,
                        aimsCluster: true,
                    },
                },
                _count: {
                    select: {
                        spaces: true,
                        people: true,
                        conferenceRooms: true,
                        userStores: true,
                    },
                },
            },
        });

        if (!store) {
            throw notFound('Store');
        }

        // Get sync queue stats
        const [pendingSync, failedSync, completedSync] = await Promise.all([
            prisma.syncQueueItem.count({ where: { storeId, status: 'PENDING' } }),
            prisma.syncQueueItem.count({ where: { storeId, status: 'FAILED' } }),
            prisma.syncQueueItem.count({ where: { storeId, status: 'COMPLETED' } }),
        ]);

        // Get recent sync activity
        const recentSyncItems = await prisma.syncQueueItem.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                entityType: true,
                action: true,
                status: true,
                errorMessage: true,
                createdAt: true,
                processedAt: true,
            },
        });

        res.json({
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
                aimsConfigured: !!(store.company.aimsBaseUrl),
            },
            counts: {
                spaces: store._count.spaces,
                people: store._count.people,
                conferenceRooms: store._count.conferenceRooms,
                users: store._count.userStores,
            },
            sync: {
                pending: pendingSync,
                failed: failedSync,
                completed: completedSync,
                recentItems: recentSyncItems,
            },
            settings: store.settings,
            createdAt: store.createdAt,
            updatedAt: store.updatedAt,
        });
    } catch (error) {
        next(error);
    }
});

// ======================
// Browse Store Entities
// ======================

/**
 * GET /admin/stores/:storeId/spaces
 * List spaces in a store
 */
router.get('/stores/:storeId/spaces', async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const { page, limit, search } = paginationSchema.parse(req.query);
        const skip = (page - 1) * limit;

        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store) throw notFound('Store');

        const where: any = { storeId };
        if (search) {
            where.OR = [
                { externalId: { contains: search, mode: 'insensitive' } },
                { labelCode: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [spaces, total] = await Promise.all([
            prisma.space.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.space.count({ where }),
        ]);

        res.json({
            data: spaces,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /admin/stores/:storeId/people
 * List people in a store
 */
router.get('/stores/:storeId/people', async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const { page, limit, search } = paginationSchema.parse(req.query);
        const skip = (page - 1) * limit;

        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store) throw notFound('Store');

        const where: any = { storeId };
        if (search) {
            where.OR = [
                { externalId: { contains: search, mode: 'insensitive' } },
                { labelCode: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [people, total] = await Promise.all([
            prisma.person.findMany({
                where,
                include: {
                    assignedSpace: {
                        select: { id: true, externalId: true, labelCode: true },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.person.count({ where }),
        ]);

        res.json({
            data: people,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /admin/stores/:storeId/conference-rooms
 * List conference rooms in a store
 */
router.get('/stores/:storeId/conference-rooms', async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const { page, limit, search } = paginationSchema.parse(req.query);
        const skip = (page - 1) * limit;

        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store) throw notFound('Store');

        const where: any = { storeId };
        if (search) {
            where.OR = [
                { externalId: { contains: search, mode: 'insensitive' } },
                { labelCode: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [rooms, total] = await Promise.all([
            prisma.conferenceRoom.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.conferenceRoom.count({ where }),
        ]);

        res.json({
            data: rooms,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /admin/stores/:storeId/sync-queue
 * View sync queue for a store
 */
router.get('/stores/:storeId/sync-queue', async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const { page, limit } = paginationSchema.parse(req.query);
        const status = req.query.status as string | undefined;
        const skip = (page - 1) * limit;

        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store) throw notFound('Store');

        const where: any = { storeId };
        if (status) {
            where.status = status;
        }

        const [items, total] = await Promise.all([
            prisma.syncQueueItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.syncQueueItem.count({ where }),
        ]);

        res.json({
            data: items,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
});

// ======================
// Admin Context Switch
// ======================

/**
 * POST /admin/impersonate-context
 * Set admin's context to view as if they were in a specific company/store
 * (This doesn't actually switch user, just returns the context data)
 */
router.post('/impersonate-context', async (req, res, next) => {
    try {
        const { companyId, storeId } = z.object({
            companyId: z.string().uuid(),
            storeId: z.string().uuid().optional(),
        }).parse(req.body);

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                code: true,
                name: true,
                aimsBaseUrl: true,
                aimsCluster: true,
                aimsUsername: true,
                aimsPasswordEnc: true,
            },
        });

        if (!company) {
            throw notFound('Company');
        }

        let store = null;
        if (storeId) {
            store = await prisma.store.findUnique({
                where: { id: storeId },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    settings: true,
                    syncEnabled: true,
                },
            });

            if (!store) {
                throw notFound('Store');
            }

            if (store) {
                // Verify store belongs to company
                const storeCheck = await prisma.store.findFirst({
                    where: { id: storeId, companyId },
                });
                if (!storeCheck) {
                    throw badRequest('Store does not belong to the specified company');
                }
            }
        }

        // Return context that can be used by admin to view data
        res.json({
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
        });
    } catch (error) {
        next(error);
    }
});

// ======================
// Audit Log
// ======================

/**
 * GET /admin/audit-log
 * View system audit log
 */
router.get('/audit-log', async (req, res, next) => {
    try {
        const { page, limit } = paginationSchema.parse(req.query);
        const userId = req.query.userId as string | undefined;
        const companyId = req.query.companyId as string | undefined;
        const storeId = req.query.storeId as string | undefined;
        const action = req.query.action as string | undefined;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (userId) where.userId = userId;
        if (companyId) where.companyId = companyId;
        if (storeId) where.storeId = storeId;
        if (action) where.action = action;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { email: true, firstName: true, lastName: true },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.auditLog.count({ where }),
        ]);

        res.json({
            data: logs,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
