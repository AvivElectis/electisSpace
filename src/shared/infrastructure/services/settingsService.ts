/**
 * Settings Service - Server-side settings persistence
 */

import api from './apiClient';
import type { SettingsData } from '@features/settings/domain/types';

// Response types
export interface StoreSettingsResponse {
    storeId: string;
    storeName: string;
    storeNumber: string;
    settings: Partial<SettingsData>;
}

export interface CompanySettingsResponse {
    companyId: string;
    companyName: string;
    aimsCompanyCode: string;
    settings: Partial<SettingsData>;
}

export interface UpdateSettingsResponse {
    storeId?: string;
    companyId?: string;
    settings: Partial<SettingsData>;
    message: string;
}

// Settings service
export const settingsService = {
    /**
     * Get settings for a specific store
     */
    getStoreSettings: async (storeId: string): Promise<StoreSettingsResponse> => {
        const response = await api.get<StoreSettingsResponse>(`/settings/store/${storeId}`);
        return response.data;
    },

    /**
     * Update settings for a specific store
     */
    updateStoreSettings: async (storeId: string, settings: Partial<SettingsData>): Promise<UpdateSettingsResponse> => {
        const response = await api.put<UpdateSettingsResponse>(`/settings/store/${storeId}`, { settings });
        return response.data;
    },

    /**
     * Get settings for a specific company
     */
    getCompanySettings: async (companyId: string): Promise<CompanySettingsResponse> => {
        const response = await api.get<CompanySettingsResponse>(`/settings/company/${companyId}`);
        return response.data;
    },

    /**
     * Update settings for a specific company
     */
    updateCompanySettings: async (companyId: string, settings: Partial<SettingsData>): Promise<UpdateSettingsResponse> => {
        const response = await api.put<UpdateSettingsResponse>(`/settings/company/${companyId}`, { settings });
        return response.data;
    },
};
