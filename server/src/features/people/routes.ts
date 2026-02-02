import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission, notFound, badRequest } from '../../shared/middleware/index.js';
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';
import type { Prisma } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to get store IDs user has access to
const getUserStoreIds = (req: { user?: { stores?: { id: string }[] } }): string[] => {
    return req.user?.stores?.map(s => s.id) || [];
};

// Validation schemas
const createPersonSchema = z.object({
    storeId: z.string().uuid(),
    externalId: z.string().max(50).optional(),
    data: z.record(z.unknown()).default({}),
});

const updatePersonSchema = z.object({
    data: z.record(z.unknown()).optional(),
});

const assignSchema = z.object({
    spaceId: z.string().uuid(),
});

// GET /people - List all people for user's stores
router.get('/', requirePermission('people', 'read'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const search = req.query.search as string;
        const assigned = req.query.assigned as string;
        const listId = req.query.listId as string;
        const { storeId: queryStoreId } = req.query;
        const storeIds = getUserStoreIds(req);
        
        // Determine store filter
        let storeFilter: { storeId?: string | { in: string[] } } = {};
        if (queryStoreId && typeof queryStoreId === 'string') {
            // Filter by specific store (must be one user has access to)
            if (!storeIds.includes(queryStoreId)) {
                throw badRequest('Access denied to this store');
            }
            storeFilter = { storeId: queryStoreId };
        } else {
            // Get people from all user's stores
            storeFilter = { storeId: { in: storeIds } };
        }

        const where = {
            ...storeFilter,
            ...(assigned === 'true' && { assignedSpaceId: { not: null } }),
            ...(assigned === 'false' && { assignedSpaceId: null }),
            ...(listId && {
                listMemberships: { some: { listId } },
            }),
        } as Prisma.PersonWhereInput;

        const [people, total] = await Promise.all([
            prisma.person.findMany({
                where,
                include: {
                    assignedSpace: {
                        select: { id: true, externalId: true, labelCode: true },
                    },
                    store: {
                        select: { name: true, code: true }
                    }
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.person.count({ where }),
        ]);

        res.json({
            data: people,
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

// GET /people/:id - Get person details
router.get('/:id', requirePermission('people', 'read'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        
        const person = await prisma.person.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
            include: {
                assignedSpace: true,
                listMemberships: {
                    include: { list: true },
                },
                store: {
                    select: { name: true, code: true }
                }
            },
        });

        if (!person) {
            throw notFound('Person');
        }

        res.json(person);
    } catch (error) {
        next(error);
    }
});

// POST /people - Create new person
router.post('/', requirePermission('people', 'create'), async (req, res, next) => {
    try {
        const data = createPersonSchema.parse(req.body);
        const storeIds = getUserStoreIds(req);
        
        // Check user has access to the store
        if (!storeIds.includes(data.storeId)) {
            throw badRequest('Access denied to this store');
        }

        // Generate virtual space ID (POOL-XXXX)
        const count = await prisma.person.count({
            where: { storeId: data.storeId },
        });
        const virtualSpaceId = `POOL-${String(count + 1).padStart(4, '0')}`;

        const person = await prisma.person.create({
            data: {
                externalId: data.externalId,
                data: data.data as Prisma.InputJsonValue,
                virtualSpaceId,
                storeId: data.storeId,
                syncStatus: 'PENDING',
            },
        });

        // Queue sync job
        await syncQueueService.queueCreate(data.storeId, 'person', person.id, data.data);

        res.status(201).json(person);
    } catch (error) {
        next(error);
    }
});

// PATCH /people/:id - Update person
router.patch('/:id', requirePermission('people', 'update'), async (req, res, next) => {
    try {
        const data = updatePersonSchema.parse(req.body);
        const storeIds = getUserStoreIds(req);

        const existing = await prisma.person.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
        });

        if (!existing) {
            throw notFound('Person');
        }

        const mergedData = data.data
            ? { ...existing.data as object, ...data.data }
            : existing.data;

        const person = await prisma.person.update({
            where: { id: req.params.id as string },
            data: {
                data: mergedData as Prisma.InputJsonValue,
                syncStatus: 'PENDING',
            },
        });

        // Queue sync job
        await syncQueueService.queueUpdate(existing.storeId, 'person', person.id, data);

        res.json(person);
    } catch (error) {
        next(error);
    }
});

// DELETE /people/:id - Delete person
router.delete('/:id', requirePermission('people', 'delete'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        
        const existing = await prisma.person.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
        });

        if (!existing) {
            throw notFound('Person');
        }

        // Queue sync job to clear from AIMS before deleting
        await syncQueueService.queueDelete(
            existing.storeId, 
            'person', 
            existing.id, 
            existing.externalId || existing.virtualSpaceId || undefined
        );

        await prisma.person.delete({
            where: { id: req.params.id as string },
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// POST /people/:id/assign - Assign person to space
router.post('/:id/assign', requirePermission('people', 'assign'), async (req, res, next) => {
    try {
        const { spaceId } = assignSchema.parse(req.body);
        const storeIds = getUserStoreIds(req);

        const person = await prisma.person.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
        });

        if (!person) {
            throw notFound('Person');
        }

        const space = await prisma.space.findFirst({
            where: {
                id: spaceId,
                storeId: { in: storeIds },
            },
        });

        if (!space) {
            throw notFound('Space');
        }

        // Check if space is already assigned
        const alreadyAssigned = await prisma.person.findFirst({
            where: {
                assignedSpaceId: spaceId,
                id: { not: req.params.id as string },
            },
        });

        if (alreadyAssigned) {
            throw badRequest('Space is already assigned to another person');
        }

        const updated = await prisma.person.update({
            where: { id: req.params.id as string },
            data: {
                assignedSpaceId: spaceId,
                syncStatus: 'PENDING',
            },
            include: { assignedSpace: true },
        });

        // TODO: Queue sync job

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// DELETE /people/:id/unassign - Unassign person from space
router.delete('/:id/unassign', requirePermission('people', 'assign'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        
        const person = await prisma.person.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
        });

        if (!person) {
            throw notFound('Person');
        }

        const updated = await prisma.person.update({
            where: { id: req.params.id as string },
            data: {
                assignedSpaceId: null,
                syncStatus: 'PENDING',
            },
        });

        // TODO: Queue sync job

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// GET /people/lists - Get all people lists for user's stores
router.get('/lists', requirePermission('people', 'read'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        const { storeId: queryStoreId } = req.query;
        
        // Determine store filter
        let storeFilter: { storeId?: string | { in: string[] } } = {};
        if (queryStoreId && typeof queryStoreId === 'string') {
            if (!storeIds.includes(queryStoreId)) {
                throw badRequest('Access denied to this store');
            }
            storeFilter = { storeId: queryStoreId };
        } else {
            storeFilter = { storeId: { in: storeIds } };
        }
        
        const lists = await prisma.peopleList.findMany({
            where: storeFilter,
            include: {
                _count: { select: { memberships: true } },
                store: { select: { name: true, code: true } }
            },
            orderBy: { name: 'asc' },
        });

        res.json(lists);
    } catch (error) {
        next(error);
    }
});

// POST /people/import - Bulk import from CSV
router.post('/import', requirePermission('people', 'import'), async (req, res, next) => {
    try {
        // TODO: Implement CSV parsing and bulk import
        res.status(202).json({
            message: 'Import started',
            jobId: 'import-' + Date.now(),
        });
    } catch (error) {
        next(error);
    }
});

export default router;
