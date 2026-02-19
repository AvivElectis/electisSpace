/**
 * Auth Service - Authentication API methods
 */

import api, { tokenManager } from './apiClient';

// Types

/** Company-level feature toggles */
export interface CompanyFeatures {
    spacesEnabled: boolean;
    peopleEnabled: boolean;
    conferenceEnabled: boolean;
    simpleConferenceMode: boolean;
    labelsEnabled: boolean;
}

export const DEFAULT_COMPANY_FEATURES: CompanyFeatures = {
    spacesEnabled: false,
    peopleEnabled: true,
    conferenceEnabled: true,
    simpleConferenceMode: false,
    labelsEnabled: true,
};

export type SpaceType = 'office' | 'room' | 'chair' | 'person-tag';

export interface Store {
    id: string;
    name: string;
    code: string;
    role: 'STORE_ADMIN' | 'STORE_MANAGER' | 'STORE_EMPLOYEE' | 'STORE_VIEWER';
    features: string[]; // Available features: 'dashboard', 'spaces', 'conference', 'people'
    companyId: string;
    companyName: string;
    effectiveFeatures?: CompanyFeatures;
    effectiveSpaceType?: SpaceType;
}

export interface Company {
    id: string;
    name: string;
    code: string;
    role: 'SUPER_USER' | 'COMPANY_ADMIN' | 'STORE_ADMIN' | 'STORE_VIEWER' | 'VIEWER';
    allStoresAccess: boolean;
    companyFeatures?: CompanyFeatures;
    spaceType?: SpaceType;
}

export interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    globalRole: 'PLATFORM_ADMIN' | null;
    activeCompanyId: string | null;
    activeStoreId: string | null;
    stores: Store[];
    companies: Company[];
}

export interface LoginStepOneResponse {
    message: string;
    email: string;
    requiresVerification: true;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: User;
}

export interface AuthCredentials {
    email: string;
    password: string;
}

export interface Verify2FACredentials {
    email: string;
    code: string;
}

export interface SolumConnectResponse {
    connected: boolean;
    config: {
        baseUrl: string;
        cluster: 'common' | 'c1';
        companyCode: string;
        storeCode: string;
    };
    tokens: {
        accessToken: string;
    };
}

export interface StoreConnectionInfo {
    storeId: string;
    storeName: string;
    companyId: string;
    companyName: string;
    companyCode: string;
    aimsConfigured: boolean;
    isAdmin: boolean;
    adminContacts: Array<{ name: string; email: string; role: string }>;
}

// Auth service
export const authService = {
    /**
     * Login Step 1: Verify credentials and request 2FA code
     */
    login: async (credentials: AuthCredentials): Promise<LoginStepOneResponse> => {
        const response = await api.post<LoginStepOneResponse>('/auth/login', credentials);
        return response.data;
    },

    /**
     * Login Step 2: Verify 2FA code and get tokens
     * Note: The refresh token is set as httpOnly cookie by the server
     */
    verify2FA: async (credentials: Verify2FACredentials): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/auth/verify-2fa', credentials);
        const { accessToken } = response.data;
        // Only store access token in memory - refresh token is in httpOnly cookie
        tokenManager.setAccessToken(accessToken);
        return response.data;
    },

    /**
     * Resend 2FA verification code
     */
    resendCode: async (email: string): Promise<void> => {
        await api.post('/auth/resend-code', { email });
    },

    /**
     * Logout - revoke tokens
     * Server will clear the httpOnly refresh token cookie
     */
    logout: async (): Promise<void> => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Ignore errors on logout
        } finally {
            tokenManager.clearTokens();
        }
    },

    /**
     * Refresh access token
     * The refresh token is in httpOnly cookie, sent automatically
     */
    refreshToken: async (): Promise<{ accessToken: string }> => {
        // Refresh token is in httpOnly cookie - sent automatically with credentials
        const response = await api.post('/auth/refresh', {});
        const { accessToken } = response.data;
        tokenManager.setAccessToken(accessToken);
        return { accessToken };
    },

    /**
     * Get current user info (validates session)
     */
    me: async (): Promise<{ user: User }> => {
        const response = await api.get<{ user: User }>('/auth/me');
        return response.data;
    },

    /**
     * Change password
     */
    changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        await api.post('/auth/change-password', { currentPassword, newPassword });
    },

    /**
     * Request password reset code
     */
    forgotPassword: async (email: string): Promise<void> => {
        await api.post('/auth/forgot-password', { email });
    },

    /**
     * Reset password with code
     */
    resetPassword: async (email: string, code: string, newPassword: string): Promise<void> => {
        await api.post('/auth/reset-password', { email, code, newPassword });
    },

    /**
     * Admin reset user password (requires PLATFORM_ADMIN)
     */
    adminResetPassword: async (userId: string, resetType: 'temporary' | 'fixed', newPassword?: string): Promise<{ temporaryPassword?: string }> => {
        const response = await api.post('/auth/admin/reset-password', { userId, resetType, newPassword });
        return response.data;
    },

    /**
     * Update user's active company/store context.
     * The PATCH endpoint only returns { activeCompanyId, activeStoreId },
     * so we follow up with /auth/me to get the full user object.
     */
    updateContext: async (activeCompanyId?: string | null, activeStoreId?: string | null): Promise<{ user: User }> => {
        await api.patch('/users/me/context', {
            activeCompanyId,
            activeStoreId,
        });
        // Fetch full user object after context update
        const meResponse = await api.get<{ user: User }>('/auth/me');
        return meResponse.data;
    },

    /**
     * Connect to SOLUM using company credentials
     * Called after login to auto-connect to AIMS
     */
    solumConnect: async (storeId: string): Promise<SolumConnectResponse> => {
        const response = await api.post<SolumConnectResponse>('/auth/solum-connect', { storeId });
        return response.data;
    },

    /**
     * Refresh AIMS/SoluM token via server
     * Server handles re-login with stored company credentials
     * Returns a fresh access token for AIMS API calls
     */
    solumRefresh: async (storeId: string): Promise<{ accessToken: string; expiresAt: number }> => {
        const response = await api.post<{ accessToken: string; expiresAt: number }>('/auth/solum-refresh', { storeId });
        return response.data;
    },

    /**
     * Get store connection info (AIMS status + admin contacts)
     * Used to determine the connection flow for first-time users
     */
    getStoreConnectionInfo: async (storeId: string): Promise<StoreConnectionInfo> => {
        const response = await api.get<StoreConnectionInfo>('/auth/store-connection-info', {
            params: { storeId },
        });
        return response.data;
    },

    /**
     * Check if user is authenticated (has tokens)
     */
    isAuthenticated: (): boolean => {
        return !!tokenManager.getAccessToken();
    },

    /**
     * Get stored tokens
     */
    getTokens: () => ({
        accessToken: tokenManager.getAccessToken(),
        refreshToken: tokenManager.getRefreshToken(),
    }),
};
