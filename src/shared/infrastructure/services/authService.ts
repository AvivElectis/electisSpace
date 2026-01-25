/**
 * Auth Service - Authentication API methods
 */

import api, { tokenManager } from './apiClient';

// Types
export interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: 'ADMIN' | 'MANAGER' | 'VIEWER';
    organization: {
        id: string;
        name: string;
        code: string;
    };
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

// Auth service
export const authService = {
    /**
     * Login with email and password
     */
    login: async (credentials: AuthCredentials): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/auth/login', credentials);
        const { accessToken, refreshToken } = response.data;
        tokenManager.setTokens(accessToken, refreshToken);
        return response.data;
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
