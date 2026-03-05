import { z } from 'zod';

export const sendFriendRequestSchema = z.object({
    addresseeId: z.string().uuid(),
});

export const createCompanyUserSchema = z.object({
    email: z.string().email().max(255),
    displayName: z.string().min(1).max(100),
    branchId: z.string().uuid(),
    role: z.enum(['EMPLOYEE', 'MANAGER', 'ADMIN']).optional(),
    buildingId: z.string().uuid().optional(),
    floorId: z.string().uuid().optional(),
});

export const updateCompanyUserSchema = z.object({
    displayName: z.string().min(1).max(100).optional(),
    role: z.enum(['EMPLOYEE', 'MANAGER', 'ADMIN']).optional(),
    branchId: z.string().uuid().optional(),
    buildingId: z.string().uuid().nullable().optional(),
    floorId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
});
