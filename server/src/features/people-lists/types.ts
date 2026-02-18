/**
 * People Lists Feature - Types
 */
import { z } from 'zod';

// ======================
// Validation Schemas
// ======================

export const createPeopleListSchema = z.object({
    storeId: z.string().uuid(),
    name: z.string().min(1).max(100),
    content: z.array(z.object({
        id: z.string(),
        virtualSpaceId: z.string().optional(),
        data: z.record(z.unknown()).default({}),
        assignedSpaceId: z.string().optional().nullable(),
        listMemberships: z.array(z.object({
            listName: z.string(),
            spaceId: z.string().optional(),
        })).optional(),
    })).default([]),
});

export const updatePeopleListSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    content: z.array(z.object({
        id: z.string(),
        virtualSpaceId: z.string().optional(),
        data: z.record(z.unknown()).default({}),
        assignedSpaceId: z.string().optional().nullable(),
        listMemberships: z.array(z.object({
            listName: z.string(),
            spaceId: z.string().optional(),
        })).optional(),
    })).optional(),
});

// ======================
// DTOs
// ======================

export type CreatePeopleListInput = z.infer<typeof createPeopleListSchema>;
export type UpdatePeopleListInput = z.infer<typeof updatePeopleListSchema>;

// ======================
// User Context
// ======================

export interface ListsUserContext {
    id: string;
    globalRole?: string | null;
    stores?: Array<{ id: string }>;
}
