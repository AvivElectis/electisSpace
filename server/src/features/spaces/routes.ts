import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission, notFound, conflict } from '../../shared/middleware/index.js';
import type { Prisma } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createSpaceSchema = z.object({
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

// GET /spaces - List all spaces
router.get('/', requirePermission('spaces', 'read'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const search = req.query.search as string;
        const hasLabel = req.query.hasLabel as string;
        const syncStatus = req.query.syncStatus as string;

        const where = {
            organizationId: req.user!.organizationId,
            ...(search && {
                OR: [
                    { externalId: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
            ...(hasLabel === 'true' && { labelCode: { not: null } }),
            ...(hasLabel === 'false' && { labelCode: null }),
            ...(syncStatus && { syncStatus: syncStatus as any }),
        };

        const [spaces, total] = await Promise.all([
            prisma.space.findMany({
                where,
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
        const space = await prisma.space.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
            },
            include: {
                assignedPeople: {
                    select: {
                        id: true,
                        externalId: true,
                        data: true,
                    },
                },
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

        // Check external ID unique
        const existing = await prisma.space.findFirst({
            where: {
                organizationId: req.user!.organizationId,
                externalId: data.externalId,
            },
        });

        if (existing) {
            throw conflict('Space with this ID already exists');
        }

        // Create space
        const space = await prisma.space.create({
            data: {
                externalId: data.externalId,
                labelCode: data.labelCode,
                templateName: data.templateName,
                data: data.data as Prisma.InputJsonValue,
                organizationId: req.user!.organizationId,
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

        // Find space
        const existing = await prisma.space.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
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
        const existing = await prisma.space.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
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

        const existing = await prisma.space.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
            },
        });

        if (!existing) {
            throw notFound('Space');
        }

        // Check if label is already assigned elsewhere
        const labelInUse = await prisma.space.findFirst({
            where: {
                organizationId: req.user!.organizationId,
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
