/**
 * Store Context API Service
 * 
 * Frontend service for getting current user's context and active store.
 */

import { api } from './apiClient';

// Context types
export interface UserContext {
    user: {
        id: string;
        email: string;
        name: string;
        role: 'PLATFORM_ADMIN' | 'USER';
    };
    companies: CompanyContext[];
    activeCompanyId: string | null;
    activeStoreId: string | null;
    permissions: string[];
}

export interface CompanyContext {
    id: string;
    code: string;
    name: string;
    role: 'COMPANY_ADMIN' | 'STORE_ADMIN' | 'STORE_MANAGER' | 'STORE_EMPLOYEE' | 'STORE_VIEWER';
    stores: StoreContext[];
}

export interface StoreContext {
    id: string;
    code: string;
    name: string;
    role: 'STORE_ADMIN' | 'STORE_MANAGER' | 'STORE_EMPLOYEE' | 'STORE_VIEWER';
    features: string[];
    aimsConnected: boolean;
    lastSync: string | null;
}

export interface SetContextDto {
    companyId?: string;
    storeId?: string;
}

// API functions
export const storeContextApi = {
    /**
     * Get current user's full context
     * Includes all accessible companies, stores, and permissions
     */
    async getContext(): Promise<UserContext> {
        const response = await api.get<UserContext>('/me/context');
        return response.data;
    },

    /**
     * Set active company and/or store
     */
    async setContext(data: SetContextDto): Promise<UserContext> {
        const response = await api.patch<UserContext>('/me/context', data);
        return response.data;
    },

    /**
     * Get available companies for the current user
     */
    async getCompanies(): Promise<CompanyContext[]> {
        const response = await api.get<{ companies: CompanyContext[] }>('/me/companies');
        return response.data.companies;
    },

    /**
     * Get stores for a specific company
     */
    async getStores(companyId: string): Promise<StoreContext[]> {
        const response = await api.get<{ stores: StoreContext[] }>(`/me/companies/${companyId}/stores`);
        return response.data.stores;
    },

    /**
     * Get the currently active store details
     */
    async getActiveStore(): Promise<StoreContext | null> {
        const context = await this.getContext();
        if (!context.activeStoreId || !context.activeCompanyId) {
            return null;
        }
        const company = context.companies.find(c => c.id === context.activeCompanyId);
        return company?.stores.find(s => s.id === context.activeStoreId) || null;
    },
};

export default storeContextApi;
