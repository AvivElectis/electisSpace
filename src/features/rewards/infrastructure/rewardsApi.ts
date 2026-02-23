/**
 * Rewards API Service
 * 
 * Frontend service for rewards campaign operations via backend.
 */

import { api } from '@shared/infrastructure/services/apiClient';
import type { RewardsCampaign, RewardsAnalytics, CreateCampaignInput } from '../domain/types';

interface ApiResponse<T> {
    data: T;
}

export const rewardsApi = {
    async list(storeId: string): Promise<RewardsCampaign[]> {
        const res = await api.get<ApiResponse<RewardsCampaign[]>>('/rewards', { params: { storeId } });
        return res.data.data;
    },

    async getById(storeId: string, id: string): Promise<RewardsCampaign> {
        const res = await api.get<ApiResponse<RewardsCampaign>>(`/rewards/${id}`, { params: { storeId } });
        return res.data.data;
    },

    async create(data: CreateCampaignInput): Promise<RewardsCampaign> {
        const res = await api.post<ApiResponse<RewardsCampaign>>('/rewards', data);
        return res.data.data;
    },

    async update(id: string, data: Partial<CreateCampaignInput> & { storeId: string }): Promise<RewardsCampaign> {
        const res = await api.put<ApiResponse<RewardsCampaign>>(`/rewards/${id}`, data);
        return res.data.data;
    },

    async delete(storeId: string, id: string): Promise<void> {
        await api.delete(`/rewards/${id}`, { params: { storeId } });
    },

    async activate(storeId: string, id: string): Promise<RewardsCampaign> {
        const res = await api.post<ApiResponse<RewardsCampaign>>(`/rewards/${id}/activate`, { storeId });
        return res.data.data;
    },

    async pause(storeId: string, id: string): Promise<RewardsCampaign> {
        const res = await api.post<ApiResponse<RewardsCampaign>>(`/rewards/${id}/pause`, { storeId });
        return res.data.data;
    },

    async complete(storeId: string, id: string): Promise<RewardsCampaign> {
        const res = await api.post<ApiResponse<RewardsCampaign>>(`/rewards/${id}/complete`, { storeId });
        return res.data.data;
    },

    async analytics(storeId: string): Promise<RewardsAnalytics> {
        const res = await api.get<ApiResponse<RewardsAnalytics>>('/rewards/analytics', { params: { storeId } });
        return res.data.data;
    },
};
