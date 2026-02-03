/**
 * Spaces Feature - Types
 * 
 * @description Validation schemas, DTOs and types for spaces management.
 */
import { z } from 'zod';

// ======================
// Validation Schemas
// ======================

export const createSpaceSchema = z.object({
    storeId: z.string().uuid(),
    externalId: z.string().max(50),
    labelCode: z.string().max(50).optional(),
    templateName: z.string().max(100).optional(),
    data: z.record(z.unknown()).default({}),
});

export const updateSpaceSchema = z.object({
    labelCode: z.string().max(50).optional().nullable(),
    templateName: z.string().max(100).optional().nullable(),
    data: z.record(z.unknown()).optional(),
});

export const assignLabelSchema = z.object({
    labelCode: z.string(),
});

// ======================
// DTOs
// ======================

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
export type AssignLabelInput = z.infer<typeof assignLabelSchema>;

// ======================
// Filter Types
// ======================

export interface ListSpacesFilters {
    page: number;
    limit: number;
    search?: string;
    hasLabel?: string;
    syncStatus?: string;
    storeId?: string;
}

// ======================
// User Context
// ======================

export interface SpacesUserContext {
    id: string;
    stores?: Array<{ id: string }>;
}
