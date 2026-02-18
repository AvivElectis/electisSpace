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

export const labelTypeInfoSchema = z.object({
    storeId: z.string().uuid(),
    labelCode: z.string().min(1),
});

export const imagePushSchema = z.object({
    storeId: z.string().uuid(),
    labelCode: z.string().min(1),
    image: z.string().min(1),  // base64 PNG
    page: z.number().int().min(1).default(1),
    frontPage: z.number().int().min(1).default(1),
    dithering: z.boolean().optional().default(true),
    optAlgType: z.number().int().optional(),
});

export const ditherPreviewSchema = z.object({
    storeId: z.string().uuid(),
    labelCode: z.string().min(1),
    image: z.string().min(1),  // base64 PNG
    optAlgType: z.number().int().optional(),
});

// ============================================================================
// DTOs
// ============================================================================

export type StoreIdQueryDTO = z.infer<typeof storeIdQuerySchema>;
export type LinkLabelDTO = z.infer<typeof linkLabelSchema>;
export type UnlinkLabelDTO = z.infer<typeof unlinkLabelSchema>;
export type BlinkLabelDTO = z.infer<typeof blinkLabelSchema>;
export type LabelTypeInfoDTO = z.infer<typeof labelTypeInfoSchema>;
export type ImagePushDTO = z.infer<typeof imagePushSchema>;
export type DitherPreviewDTO = z.infer<typeof ditherPreviewSchema>;

// ============================================================================
// Interfaces
// ============================================================================

export interface LabelsUserContext {
    userId: string;
    globalRole?: string | null;
    storeIds: string[];
}
