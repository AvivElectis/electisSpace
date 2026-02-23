import { prisma } from '../../shared/infrastructure/database/prisma.js';
import type { RewardsUserContext, CreateCampaignDTO, UpdateCampaignDTO } from './types.js';

// ============================================================================
// Authorization Helpers
// ============================================================================

function validateStoreAccess(storeId: string, ctx: RewardsUserContext): void {
    if (ctx.globalRole === 'PLATFORM_ADMIN') return;
    if (!ctx.storeIds.includes(storeId)) {
        throw new Error('FORBIDDEN');
    }
}

function validateDates(startDate?: string, endDate?: string): void {
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        throw new Error('INVALID_DATE_RANGE');
    }
}

// ============================================================================
// Rewards Service - Business Logic
// ============================================================================

export const rewardsService = {
    /**
     * List all campaigns for a store
     */
    async list(ctx: RewardsUserContext, storeId: string) {
        validateStoreAccess(storeId, ctx);
        
        return prisma.rewardsCampaign.findMany({
            where: { storeId },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });
    },

    /**
     * Get a single campaign by ID
     */
    async getById(ctx: RewardsUserContext, storeId: string, campaignId: string) {
        validateStoreAccess(storeId, ctx);
        
        const campaign = await prisma.rewardsCampaign.findFirst({
            where: { id: campaignId, storeId },
        });
        
        if (!campaign) throw new Error('NOT_FOUND');
        return campaign;
    },

    /**
     * Create a new campaign
     */
    async create(ctx: RewardsUserContext, data: CreateCampaignDTO) {
        validateStoreAccess(data.storeId, ctx);
        validateDates(data.startDate, data.endDate);
        
        return prisma.rewardsCampaign.create({
            data: {
                storeId: data.storeId,
                name: data.name,
                nameHe: data.nameHe,
                description: data.description,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
                templateKey: data.templateKey,
                discountType: data.discountType,
                discountValue: data.discountValue,
                labelCodes: data.labelCodes,
                priority: data.priority,
                metadata: data.metadata,
                createdBy: ctx.userId,
            },
        });
    },

    /**
     * Update a campaign
     */
    async update(ctx: RewardsUserContext, storeId: string, campaignId: string, data: UpdateCampaignDTO) {
        validateStoreAccess(storeId, ctx);
        validateDates(data.startDate, data.endDate);
        
        const existing = await prisma.rewardsCampaign.findFirst({
            where: { id: campaignId, storeId },
        });
        if (!existing) throw new Error('NOT_FOUND');
        
        return prisma.rewardsCampaign.update({
            where: { id: campaignId },
            data: {
                name: data.name,
                nameHe: data.nameHe,
                description: data.description,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
                templateKey: data.templateKey,
                discountType: data.discountType,
                discountValue: data.discountValue,
                labelCodes: data.labelCodes,
                priority: data.priority,
                metadata: data.metadata,
            },
        });
    },

    /**
     * Delete a campaign
     */
    async delete(ctx: RewardsUserContext, storeId: string, campaignId: string) {
        validateStoreAccess(storeId, ctx);
        
        const existing = await prisma.rewardsCampaign.findFirst({
            where: { id: campaignId, storeId },
        });
        if (!existing) throw new Error('NOT_FOUND');
        if (existing.status === 'ACTIVE') throw new Error('CANNOT_DELETE_ACTIVE');
        
        await prisma.rewardsCampaign.delete({ where: { id: campaignId } });
    },

    /**
     * Transition campaign status
     */
    async updateStatus(ctx: RewardsUserContext, storeId: string, campaignId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED') {
        validateStoreAccess(storeId, ctx);
        
        const campaign = await prisma.rewardsCampaign.findFirst({
            where: { id: campaignId, storeId },
        });
        if (!campaign) throw new Error('NOT_FOUND');
        
        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
            DRAFT: ['SCHEDULED', 'ACTIVE', 'CANCELLED'],
            SCHEDULED: ['ACTIVE', 'CANCELLED'],
            ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
            PAUSED: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
        };
        
        const allowed = validTransitions[campaign.status] || [];
        if (!allowed.includes(newStatus)) {
            throw new Error('INVALID_TRANSITION');
        }
        
        return prisma.rewardsCampaign.update({
            where: { id: campaignId },
            data: { status: newStatus },
        });
    },

    /**
     * Get analytics for rewards campaigns in a store
     */
    async analytics(ctx: RewardsUserContext, storeId: string) {
        validateStoreAccess(storeId, ctx);
        
        const campaigns = await prisma.rewardsCampaign.findMany({
            where: { storeId },
        });
        
        const totalCampaigns = campaigns.length;
        const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
        const totalLabelsInRewards = new Set(
            campaigns.filter(c => c.status === 'ACTIVE').flatMap(c => c.labelCodes)
        ).size;
        
        const byStatus = campaigns.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const byDiscountType = campaigns.reduce((acc, c) => {
            if (c.discountType) {
                acc[c.discountType] = (acc[c.discountType] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        
        return {
            totalCampaigns,
            activeCampaigns,
            totalLabelsInRewards,
            byStatus,
            byDiscountType,
        };
    },
};
