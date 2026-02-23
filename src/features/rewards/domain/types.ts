export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y' | 'LOYALTY_POINTS';

export interface RewardsCampaign {
    id: string;
    storeId: string;
    name: string;
    nameHe?: string | null;
    description?: string | null;
    status: CampaignStatus;
    startDate?: string | null;
    endDate?: string | null;
    templateKey?: string | null;
    discountType?: DiscountType | null;
    discountValue?: number | null;
    labelCodes: string[];
    priority: number;
    metadata: Record<string, unknown>;
    createdBy?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface RewardsAnalytics {
    totalCampaigns: number;
    activeCampaigns: number;
    totalLabelsInRewards: number;
    byStatus: Record<string, number>;
    byDiscountType: Record<string, number>;
}

export interface CreateCampaignInput {
    storeId: string;
    name: string;
    nameHe?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    templateKey?: string;
    discountType?: DiscountType;
    discountValue?: number;
    labelCodes?: string[];
    priority?: number;
}

export const TEMPLATE_OPTIONS = [
    { key: 'percentage_off', labelEn: 'Percentage Off', labelHe: 'אחוז הנחה' },
    { key: 'fixed_discount', labelEn: 'Fixed Discount', labelHe: 'הנחה קבועה' },
    { key: 'buy_get', labelEn: 'Buy X Get Y', labelHe: 'קנה X קבל Y' },
    { key: 'loyalty_points', labelEn: 'Loyalty Points', labelHe: 'נקודות מועדון' },
    { key: 'flash_sale', labelEn: 'Flash Sale', labelHe: 'מבצע בזק' },
    { key: 'seasonal', labelEn: 'Seasonal', labelHe: 'עונתי' },
] as const;

export const STATUS_COLORS: Record<CampaignStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    DRAFT: 'default',
    SCHEDULED: 'info',
    ACTIVE: 'success',
    PAUSED: 'warning',
    COMPLETED: 'default',
    CANCELLED: 'error',
};
