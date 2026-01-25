import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/index.js';
import { authenticate, authorize, notFound, conflict, badRequest } from '../../shared/middleware/index.js';
import { Role } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createUserSchema = z.object({
    email: z.string().email(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']).default('VIEWER'),
    password: z.string().min(8),
});

const updateUserSchema = z.object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']).optional(),
    isActive: z.boolean().optional(),
});

// GET /users - List all users (Admin only)
router.get('/', authorize('ADMIN'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const search = req.query.search as string;
        const role = req.query.role as Role;

        const where = {
            organizationId: req.user!.organizationId,
            ...(search && {
                OR: [
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { firstName: { contains: search, mode: 'insensitive' as const } },
                    { lastName: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
            ...(role && { role }),
        };

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        res.json({
            data: users,
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

// GET /users/:id - Get user details
router.get('/:id', authorize('ADMIN'), async (req, res, next) => {
    try {
        const user = await prisma.user.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw notFound('User');
        }

        res.json(user);
    } catch (error) {
        next(error);
    }
});

// POST /users - Create new user (Admin only)
router.post('/', authorize('ADMIN'), async (req, res, next) => {
    try {
        const data = createUserSchema.parse(req.body);

        // Check email unique
        const existing = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existing) {
            throw conflict('Email already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(data.password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role,
                passwordHash,
                organizationId: req.user!.organizationId,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
});

// PATCH /users/:id - Update user (Admin only)
router.patch('/:id', authorize('ADMIN'), async (req, res, next) => {
    try {
        const data = updateUserSchema.parse(req.body);

        // Find user
        const existing = await prisma.user.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
            },
        });

        if (!existing) {
            throw notFound('User');
        }

        // Prevent self-demotion
        if (req.params.id as string === req.user!.id && data.role && data.role !== 'ADMIN') {
            throw badRequest('Cannot demote yourself');
        }

        // Update user
        const user = await prisma.user.update({
            where: { id: req.params.id as string },
            data,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                updatedAt: true,
            },
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
});

// DELETE /users/:id - Delete user (Admin only)
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
    try {
        // Prevent self-deletion
        if (req.params.id as string === req.user!.id) {
            throw badRequest('Cannot delete yourself');
        }

        // Find user
        const existing = await prisma.user.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
            },
        });

        if (!existing) {
            throw notFound('User');
        }

        // Delete user
        await prisma.user.delete({
            where: { id: req.params.id as string },
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
