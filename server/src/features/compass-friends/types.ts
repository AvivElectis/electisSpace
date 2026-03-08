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
    departmentId: z.string().uuid().optional(),
    jobTitle: z.string().max(100).optional(),
    employeeNumber: z.string().max(50).optional(),
    phone: z.string().max(50).optional(),
    managerId: z.string().uuid().optional(),
    costCenter: z.string().max(50).optional(),
    isRemote: z.boolean().optional(),
});

export const updateCompanyUserSchema = z.object({
    displayName: z.string().min(1).max(100).optional(),
    role: z.enum(['EMPLOYEE', 'MANAGER', 'ADMIN']).optional(),
    branchId: z.string().uuid().optional(),
    buildingId: z.string().uuid().nullable().optional(),
    floorId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
    departmentId: z.string().uuid().nullable().optional(),
    jobTitle: z.string().max(100).nullable().optional(),
    employeeNumber: z.string().max(50).nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    managerId: z.string().uuid().nullable().optional(),
    costCenter: z.string().max(50).nullable().optional(),
    isRemote: z.boolean().optional(),
});
