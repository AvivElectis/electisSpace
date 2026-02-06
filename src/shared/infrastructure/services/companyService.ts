/**
 * Company Service
 * API client for company management operations
 * 
 * @description Provides CRUD operations for companies and their stores.
 * Only PLATFORM_ADMIN can create/delete companies.
 * COMPANY_ADMIN+ can manage stores within their company.
 */
import api from './apiClient';

// ============================================================================
// Types
// ============================================================================

/** Store within a company */
export interface CompanyStore {
    id: string;
    name: string;
    code: string;
    timezone: string;
    syncEnabled: boolean;
    lastAimsSyncAt: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: {
        spaces?: number;
        people?: number;
        conferenceRooms?: number;
    };
}

/** Company entity */
export interface Company {
    id: string;
    name: string;
    code: string;
    location: string | null;
    description: string | null;
    aimsBaseUrl: string | null;
    aimsCluster: string | null;
    aimsUsername: string | null;
    aimsConfigured: boolean; // Computed: has AIMS credentials
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    stores?: CompanyStore[];
    _count?: {
        stores?: number;
        users?: number;
    };
}

/** Paginated list response */
export interface CompanyListResponse {
    data: Company[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

/** Create company DTO */
export interface CreateCompanyDto {
    name: string;
    code: string; // 3+ uppercase letters, unique
    location?: string;
    description?: string;
}

/** Update company DTO */
export interface UpdateCompanyDto {
    name?: string;
    location?: string;
    description?: string;
    isActive?: boolean;
}

/** Update AIMS configuration DTO - matches backend aimsConfigSchema */
export interface UpdateAimsConfigDto {
    baseUrl: string;
    cluster?: string;
    username: string;
    password?: string; // Only sent when changing password
}

/** Create store DTO */
export interface CreateStoreDto {
    name: string;
    code: string; // Numeric string, unique within company
    timezone?: string;
    syncEnabled?: boolean;
}

/** Update store DTO */
export interface UpdateStoreDto {
    name?: string;
    timezone?: string;
    syncEnabled?: boolean;
    isActive?: boolean;
}

/** Query parameters for company list */
export interface CompanyQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
}

/** Query parameters for store list */
export interface StoreQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
}

/** Store list response - actual API response structure */
export interface StoreListResponse {
    company: {
        id: string;
        code: string;
        name: string;
    };
    stores: CompanyStore[];
    allStoresAccess: boolean;
}

/** Code validation response */
export interface CodeValidationResponse {
    available: boolean;
    message?: string;
}

// ============================================================================
// Company Service
// ============================================================================

export const companyService = {
    // ========================================================================
    // Company CRUD
    // ========================================================================

    /**
     * Get all companies accessible to the current user
     */
    getAll: async (params: CompanyQueryParams = {}): Promise<CompanyListResponse> => {
        const response = await api.get<CompanyListResponse>('/companies', { params });
        return response.data;
    },

    /**
     * Get a single company by ID
     */
    getById: async (id: string): Promise<Company> => {
        const response = await api.get<Company>(`/companies/${id}`);
        return response.data;
    },

    /**
     * Create a new company (PLATFORM_ADMIN only)
     */
    create: async (data: CreateCompanyDto): Promise<Company> => {
        const response = await api.post<Company>('/companies', data);
        return response.data;
    },

    /**
     * Update a company
     */
    update: async (id: string, data: UpdateCompanyDto): Promise<Company> => {
        const response = await api.patch<Company>(`/companies/${id}`, data);
        return response.data;
    },

    /**
     * Update AIMS configuration for a company
     */
    updateAimsConfig: async (id: string, data: UpdateAimsConfigDto): Promise<Company> => {
        const response = await api.patch<Company>(`/companies/${id}/aims`, data);
        return response.data;
    },

    /**
     * Test AIMS connection for a company
     */
    testAimsConnection: async (id: string): Promise<{ connected: boolean; error?: string | null }> => {
        const response = await api.post<{ connected: boolean; error?: string | null }>(`/companies/${id}/aims/test`);
        return response.data;
    },

    /**
     * Delete a company (PLATFORM_ADMIN only)
     */
    delete: async (id: string): Promise<void> => {
        await api.delete(`/companies/${id}`);
    },

    /**
     * Validate company code uniqueness
     */
    validateCode: async (code: string): Promise<CodeValidationResponse> => {
        const response = await api.get<CodeValidationResponse>(`/companies/validate-code/${code}`);
        return response.data;
    },

    // ========================================================================
    // Store CRUD
    // ========================================================================

    /**
     * Get all stores for a company
     */
    getStores: async (companyId: string, params: StoreQueryParams = {}): Promise<StoreListResponse> => {
        const response = await api.get<StoreListResponse>(`/companies/${companyId}/stores`, { params });
        return response.data;
    },

    /**
     * Get a single store by ID
     */
    getStore: async (storeId: string): Promise<CompanyStore> => {
        const response = await api.get<CompanyStore>(`/stores/${storeId}`);
        return response.data;
    },

    /**
     * Create a new store in a company
     */
    createStore: async (companyId: string, data: CreateStoreDto): Promise<CompanyStore> => {
        const response = await api.post<CompanyStore>(`/companies/${companyId}/stores`, data);
        return response.data;
    },

    /**
     * Update a store
     */
    updateStore: async (storeId: string, data: UpdateStoreDto): Promise<CompanyStore> => {
        const response = await api.patch<CompanyStore>(`/stores/${storeId}`, data);
        return response.data;
    },

    /**
     * Delete a store
     */
    deleteStore: async (storeId: string): Promise<void> => {
        await api.delete(`/stores/${storeId}`);
    },

    /**
     * Validate store code uniqueness within a company
     */
    validateStoreCode: async (companyId: string, code: string): Promise<CodeValidationResponse> => {
        const response = await api.get<CodeValidationResponse>(
            `/companies/${companyId}/stores/validate-code/${code}`
        );
        return response.data;
    },
};

export default companyService;
