/**
 * Spaces Lists Feature - Types
 */
import { z } from 'zod';

export const createSpacesListSchema = z.object({
    storeId: z.string().uuid(),
    name: z.string().min(1).max(100),
    content: z.array(z.object({
        id: z.string(),
        externalId: z.string().optional(),
        data: z.record(z.unknown()).default({}),
        labelCode: z.string().optional().nullable(),
        templateName: z.string().optional().nullable(),
        assignedLabels: z.array(z.string()).optional(),
        syncStatus: z.string().optional(),
    })).default([]),
});

export const updateSpacesListSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    content: z.array(z.object({
        id: z.string(),
        externalId: z.string().optional(),
        data: z.record(z.unknown()).default({}),
        labelCode: z.string().optional().nullable(),
        templateName: z.string().optional().nullable(),
        assignedLabels: z.array(z.string()).optional(),
        syncStatus: z.string().optional(),
    })).optional(),
});

export type CreateSpacesListInput = z.infer<typeof createSpacesListSchema>;
export type UpdateSpacesListInput = z.infer<typeof updateSpacesListSchema>;

export interface ListsUserContext {
    id: string;
    globalRole?: string | null;
    stores?: Array<{ id: string }>;
}
