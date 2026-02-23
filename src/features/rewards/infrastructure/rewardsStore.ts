import { create } from 'zustand';
import type { RewardsCampaign, RewardsAnalytics, CreateCampaignInput } from '../domain/types';
import { rewardsApi } from './rewardsApi';
import { logger } from '@shared/infrastructure/services/logger';

interface RewardsState {
    campaigns: RewardsCampaign[];
    analytics: RewardsAnalytics | null;
    isLoading: boolean;
    error: string | null;
    selectedCampaign: RewardsCampaign | null;
    
    // Actions
    fetchCampaigns: (storeId: string) => Promise<void>;
    fetchAnalytics: (storeId: string) => Promise<void>;
    createCampaign: (data: CreateCampaignInput) => Promise<RewardsCampaign>;
    updateCampaign: (id: string, data: Partial<CreateCampaignInput> & { storeId: string }) => Promise<void>;
    deleteCampaign: (storeId: string, id: string) => Promise<void>;
    activateCampaign: (storeId: string, id: string) => Promise<void>;
    pauseCampaign: (storeId: string, id: string) => Promise<void>;
    completeCampaign: (storeId: string, id: string) => Promise<void>;
    setSelectedCampaign: (campaign: RewardsCampaign | null) => void;
    clearError: () => void;
}

export const useRewardsStore = create<RewardsState>((set, _get) => ({
    campaigns: [],
    analytics: null,
    isLoading: false,
    error: null,
    selectedCampaign: null,

    fetchCampaigns: async (storeId: string) => {
        set({ isLoading: true, error: null });
        try {
            const campaigns = await rewardsApi.list(storeId);
            set({ campaigns, isLoading: false });
        } catch (err) {
            logger.error('RewardsStore', 'Failed to fetch campaigns', err);
            set({ error: 'Failed to fetch campaigns', isLoading: false });
        }
    },

    fetchAnalytics: async (storeId: string) => {
        try {
            const analytics = await rewardsApi.analytics(storeId);
            set({ analytics });
        } catch (err) {
            logger.error('RewardsStore', 'Failed to fetch analytics', err);
        }
    },

    createCampaign: async (data: CreateCampaignInput) => {
        const campaign = await rewardsApi.create(data);
        set((state) => ({ campaigns: [campaign, ...state.campaigns] }));
        return campaign;
    },

    updateCampaign: async (id: string, data: Partial<CreateCampaignInput> & { storeId: string }) => {
        const campaign = await rewardsApi.update(id, data);
        set((state) => ({
            campaigns: state.campaigns.map((c) => (c.id === id ? campaign : c)),
        }));
    },

    deleteCampaign: async (storeId: string, id: string) => {
        await rewardsApi.delete(storeId, id);
        set((state) => ({
            campaigns: state.campaigns.filter((c) => c.id !== id),
        }));
    },

    activateCampaign: async (storeId: string, id: string) => {
        const campaign = await rewardsApi.activate(storeId, id);
        set((state) => ({
            campaigns: state.campaigns.map((c) => (c.id === id ? campaign : c)),
        }));
    },

    pauseCampaign: async (storeId: string, id: string) => {
        const campaign = await rewardsApi.pause(storeId, id);
        set((state) => ({
            campaigns: state.campaigns.map((c) => (c.id === id ? campaign : c)),
        }));
    },

    completeCampaign: async (storeId: string, id: string) => {
        const campaign = await rewardsApi.complete(storeId, id);
        set((state) => ({
            campaigns: state.campaigns.map((c) => (c.id === id ? campaign : c)),
        }));
    },

    setSelectedCampaign: (campaign) => set({ selectedCampaign: campaign }),
    clearError: () => set({ error: null }),
}));
