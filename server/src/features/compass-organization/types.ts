import { z } from 'zod';

export const createDepartmentSchema = z.object({
    name: z.string().min(1).max(100),
    code: z.string().max(20).optional(),
    parentId: z.string().uuid().nullable().optional(),
    managerId: z.string().uuid().nullable().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createTeamSchema = z.object({
    name: z.string().min(1).max(100),
    departmentId: z.string().uuid().nullable().optional(),
    leadId: z.string().uuid().nullable().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

export const addTeamMemberSchema = z.object({
    companyUserId: z.string().uuid(),
    role: z.enum(['MEMBER', 'LEAD']).optional(),
});
