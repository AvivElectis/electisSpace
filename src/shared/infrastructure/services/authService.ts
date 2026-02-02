/**
 * Auth Service - Authentication API methods
 */

import api, { tokenManager } from './apiClient';

// Types
export interface Store {
    id: string;
    name: string;
    code: string;
    role: 'STORE_ADMIN' | 'STORE_MANAGER' | 'STORE_EMPLOYEE' | 'STORE_VIEWER';
    features: string[]; // Available features: 'dashboard', 'spaces', 'conference', 'people'
    companyId: string;
    companyName: string;
}

export interface Company {
    id: string;
    name: string;
    code: string;
    role: 'COMPANY_ADMIN' | 'VIEWER';
    allStoresAccess: boolean;
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
     * Update user's active company/store context
     */
    updateContext: async (activeCompanyId?: string | null, activeStoreId?: string | null): Promise<{ user: User }> => {
        const response = await api.patch<{ user: User }>('/users/me/context', {
            activeCompanyId,
            activeStoreId,
        });
        return response.data;
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

export default authService;
