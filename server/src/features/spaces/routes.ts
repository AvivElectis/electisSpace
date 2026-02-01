import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission, notFound, conflict, badRequest } from '../../shared/middleware/index.js';
import type { Prisma } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to get store IDs user has access to
const getUserStoreIds = (req: { user?: { stores?: { id: string }[] } }): string[] => {
    return req.user?.stores?.map(s => s.id) || [];
};

// Validation schemas
const createSpaceSchema = z.object({
    storeId: z.string().uuid(),
    externalId: z.string().max(50),
    labelCode: z.string().max(50).optional(),
    templateName: z.string().max(100).optional(),
    data: z.record(z.unknown()).default({}),
});

const updateSpaceSchema = z.object({
    labelCode: z.string().max(50).optional().nullable(),
    templateName: z.string().max(100).optional().nullable(),
    data: z.record(z.unknown()).optional(),
});

// GET /spaces - List all spaces for user's stores
router.get('/', requirePermission('spaces', 'read'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const search = req.query.search as string;
        const hasLabel = req.query.hasLabel as string;
        const syncStatus = req.query.syncStatus as string;
        const { storeId: queryStoreId } = req.query;
        const storeIds = getUserStoreIds(req);
        
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

        const where = {
            ...storeFilter,
            ...(search && {
                OR: [
                    { externalId: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
            ...(hasLabel === 'true' && { labelCode: { not: null } }),
            ...(hasLabel === 'false' && { labelCode: null }),
            ...(syncStatus && { syncStatus: syncStatus as any }),
        } as Prisma.SpaceWhereInput;

        const [spaces, total] = await Promise.all([
            prisma.space.findMany({
                where,
                include: {
                    store: { select: { name: true, storeNumber: true } }
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.space.count({ where }),
        ]);

        res.json({
            data: spaces,
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

// GET /spaces/:id - Get space details
router.get('/:id', requirePermission('spaces', 'read'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        
        const space = await prisma.space.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
            include: {
                assignedPeople: {
                    select: {
                        id: true,
                        externalId: true,
                        data: true,
                    },
                },
                store: { select: { name: true, storeNumber: true } }
            },
        });

        if (!space) {
            throw notFound('Space');
        }

        res.json(space);
    } catch (error) {
        next(error);
    }
});

// POST /spaces - Create new space
router.post('/', requirePermission('spaces', 'create'), async (req, res, next) => {
    try {
        const data = createSpaceSchema.parse(req.body);
        const storeIds = getUserStoreIds(req);
        
        // Check user has access to the store
        if (!storeIds.includes(data.storeId)) {
            throw badRequest('Access denied to this store');
        }

        // Check external ID unique within store
        const existing = await prisma.space.findFirst({
            where: {
                storeId: data.storeId,
                externalId: data.externalId,
            },
        });

        if (existing) {
            throw conflict('Space with this ID already exists');
        }

        // Create space
        const space = await prisma.space.create({
            data: {
                storeId: data.storeId,
                externalId: data.externalId,
                labelCode: data.labelCode,
                templateName: data.templateName,
                data: data.data as Prisma.InputJsonValue,
                createdById: req.user!.id,
                updatedById: req.user!.id,
                syncStatus: 'PENDING',
            },
        });

        // TODO: Queue sync job to push to SoluM

        res.status(201).json(space);
    } catch (error) {
        next(error);
    }
});

// PATCH /spaces/:id - Update space
router.patch('/:id', requirePermission('spaces', 'update'), async (req, res, next) => {
    try {
        const data = updateSpaceSchema.parse(req.body);
        const storeIds = getUserStoreIds(req);

        // Find space
        const existing = await prisma.space.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
        });

        if (!existing) {
            throw notFound('Space');
        }

        // Merge data
        const mergedData = data.data
            ? { ...existing.data as object, ...data.data }
            : existing.data;

        // Update space
        const space = await prisma.space.update({
            where: { id: req.params.id as string },
            data: {
                labelCode: data.labelCode,
                templateName: data.templateName,
                data: mergedData as Prisma.InputJsonValue,
                updatedById: req.user!.id,
                syncStatus: 'PENDING',
            },
        });

        // TODO: Queue sync job

        res.json(space);
    } catch (error) {
        next(error);
    }
});

// DELETE /spaces/:id - Delete space
router.delete('/:id', requirePermission('spaces', 'delete'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        
        const existing = await prisma.space.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
        });

        if (!existing) {
            throw notFound('Space');
        }

        await prisma.space.delete({
            where: { id: req.params.id as string },
        });

        // TODO: Queue sync job to delete from SoluM

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// POST /spaces/:id/assign-label - Assign ESL label
router.post('/:id/assign-label', requirePermission('spaces', 'update'), async (req, res, next) => {
    try {
        const { labelCode } = z.object({ labelCode: z.string() }).parse(req.body);
        const storeIds = getUserStoreIds(req);

        const existing = await prisma.space.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
        });

        if (!existing) {
            throw notFound('Space');
        }

        // Check if label is already assigned elsewhere within the same store
        const labelInUse = await prisma.space.findFirst({
            where: {
                storeId: existing.storeId,
                labelCode,
                id: { not: req.params.id as string },
            },
        });

        if (labelInUse) {
            throw conflict('Label is already assigned to another space');
        }

        const space = await prisma.space.update({
            where: { id: req.params.id as string },
            data: {
                labelCode,
                syncStatus: 'PENDING',
            },
        });

        // TODO: Queue sync job to link label in SoluM

        res.json(space);
    } catch (error) {
        next(error);
    }
});

// POST /spaces/sync - Force sync all spaces
router.post('/sync', requirePermission('sync', 'trigger'), async (req, res, next) => {
    try {
        // TODO: Queue full sync job

        res.status(202).json({
            message: 'Sync started',
            jobId: 'sync-' + Date.now(),
        });
    } catch (error) {
        next(error);
    }
});

export default router;
