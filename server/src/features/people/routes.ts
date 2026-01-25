import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission, notFound, badRequest } from '../../shared/middleware/index.js';
import type { Prisma } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createPersonSchema = z.object({
    externalId: z.string().max(50).optional(),
    data: z.record(z.unknown()).default({}),
});

const updatePersonSchema = z.object({
    data: z.record(z.unknown()).optional(),
});

const assignSchema = z.object({
    spaceId: z.string().uuid(),
});

// GET /people - List all people
router.get('/', requirePermission('people', 'read'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const search = req.query.search as string;
        const assigned = req.query.assigned as string;
        const listId = req.query.listId as string;

        const where = {
            organizationId: req.user!.organizationId,
            ...(assigned === 'true' && { assignedSpaceId: { not: null } }),
            ...(assigned === 'false' && { assignedSpaceId: null }),
            ...(listId && {
                listMemberships: { some: { listId } },
            }),
        };

        const [people, total] = await Promise.all([
            prisma.person.findMany({
                where,
                include: {
                    assignedSpace: {
                        select: { id: true, externalId: true, labelCode: true },
                    },
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
        const person = await prisma.person.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
            },
            include: {
                assignedSpace: true,
                listMemberships: {
                    include: { list: true },
                },
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

        // Generate virtual space ID (POOL-XXXX)
        const count = await prisma.person.count({
            where: { organizationId: req.user!.organizationId },
        });
        const virtualSpaceId = `POOL-${String(count + 1).padStart(4, '0')}`;

        const person = await prisma.person.create({
            data: {
                externalId: data.externalId,
                data: data.data as Prisma.InputJsonValue,
                virtualSpaceId,
                organizationId: req.user!.organizationId,
                syncStatus: 'PENDING',
            },
        });

        // TODO: Queue sync job

        res.status(201).json(person);
    } catch (error) {
        next(error);
    }
});

// PATCH /people/:id - Update person
router.patch('/:id', requirePermission('people', 'update'), async (req, res, next) => {
    try {
        const data = updatePersonSchema.parse(req.body);

        const existing = await prisma.person.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
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

        // TODO: Queue sync job

        res.json(person);
    } catch (error) {
        next(error);
    }
});

// DELETE /people/:id - Delete person
router.delete('/:id', requirePermission('people', 'delete'), async (req, res, next) => {
    try {
        const existing = await prisma.person.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
            },
        });

        if (!existing) {
            throw notFound('Person');
        }

        await prisma.person.delete({
            where: { id: req.params.id as string },
        });

        // TODO: Queue sync job to clear from SoluM

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// POST /people/:id/assign - Assign person to space
router.post('/:id/assign', requirePermission('people', 'assign'), async (req, res, next) => {
    try {
        const { spaceId } = assignSchema.parse(req.body);

        const person = await prisma.person.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
            },
        });

        if (!person) {
            throw notFound('Person');
        }

        const space = await prisma.space.findFirst({
            where: {
                id: spaceId,
                organizationId: req.user!.organizationId,
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
        const person = await prisma.person.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
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

// GET /people/lists - Get all people lists
router.get('/lists', requirePermission('people', 'read'), async (req, res, next) => {
    try {
        const lists = await prisma.peopleList.findMany({
            where: { organizationId: req.user!.organizationId },
            include: {
                _count: { select: { memberships: true } },
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
