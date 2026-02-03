import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

export const storeIdQuerySchema = z.object({
    storeId: z.string().uuid(),
});

export const linkLabelSchema = z.object({
    storeId: z.string().uuid(),
    labelCode: z.string().min(1),
    articleId: z.string().min(1),
    templateName: z.string().optional(),
});

export const unlinkLabelSchema = z.object({
    storeId: z.string().uuid(),
    labelCode: z.string().min(1),
});

export const blinkLabelSchema = z.object({
    storeId: z.string().uuid(),
});

// ============================================================================
// DTOs
// ============================================================================

export type StoreIdQueryDTO = z.infer<typeof storeIdQuerySchema>;
export type LinkLabelDTO = z.infer<typeof linkLabelSchema>;
export type UnlinkLabelDTO = z.infer<typeof unlinkLabelSchema>;
export type BlinkLabelDTO = z.infer<typeof blinkLabelSchema>;

// ============================================================================
// Interfaces
// ============================================================================

export interface LabelsUserContext {
    userId: string;
    storeIds: string[];
}
