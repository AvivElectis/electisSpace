/**
 * Auth Service - Authentication API methods
 */

import api, { tokenManager } from './apiClient';

// Types
export interface Store {
    id: string;
    name: string;
    storeNumber: string;
    role: 'STORE_ADMIN' | 'STORE_MANAGER' | 'STORE_EMPLOYEE' | 'STORE_VIEWER';
    companyId: string;
    companyName: string;
}

export interface Company {
    id: string;
    name: string;
    aimsCompanyCode: string;
    role: 'COMPANY_ADMIN' | 'VIEWER';
}

export interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    globalRole: 'PLATFORM_ADMIN' | null;
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
     */
    verify2FA: async (credentials: Verify2FACredentials): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/auth/verify-2fa', credentials);
        const { accessToken, refreshToken } = response.data;
        tokenManager.setTokens(accessToken, refreshToken);
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
     */
    refreshToken: async (): Promise<{ accessToken: string; refreshToken: string }> => {
        const refreshToken = tokenManager.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await api.post('/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        tokenManager.setTokens(accessToken, newRefreshToken);
        return { accessToken, refreshToken: newRefreshToken };
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
