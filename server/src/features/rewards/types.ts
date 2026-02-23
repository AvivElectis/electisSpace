import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

export const storeIdQuerySchema = z.object({
    storeId: z.string().uuid(),
});

export const createCampaignSchema = z.object({
    storeId: z.string().uuid(),
    name: z.string().min(1).max(200),
    nameHe: z.string().max(200).optional(),
    description: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    templateKey: z.string().max(50).optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y', 'LOYALTY_POINTS']).optional(),
    discountValue: z.number().min(0).optional(),
    labelCodes: z.array(z.string()).default([]),
    priority: z.number().int().min(0).default(0),
    metadata: z.record(z.unknown()).default({}),
});

export const updateCampaignSchema = createCampaignSchema.partial().omit({ storeId: true }).extend({
    storeId: z.string().uuid(),
});

export const campaignIdParamSchema = z.object({
    id: z.string().uuid(),
});

// ============================================================================
// DTOs
// ============================================================================

export type CreateCampaignDTO = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignDTO = z.infer<typeof updateCampaignSchema>;

// ============================================================================
// Interfaces
// ============================================================================

export interface RewardsUserContext {
    userId: string;
    globalRole?: string | null;
    storeIds: string[];
}
