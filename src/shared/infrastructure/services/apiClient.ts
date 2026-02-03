/**
 * API Client - Centralized HTTP client for server communication
 * 
 * Features:
 * - Axios-based HTTP client
 * - JWT token auto-attachment
 * - Token refresh on 401 errors (uses httpOnly cookie)
 * - Typed responses
 * 
 * Security:
 * - Access token stored in memory only (not localStorage)
 * - Refresh token stored in httpOnly cookie (server-side)
 */

import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// API base URL from environment or default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Required for httpOnly cookies
});

/**
 * Token management
 * 
 * Security: Access token is stored in memory only (not localStorage)
 * This protects against XSS attacks as memory is not accessible from JavaScript injection.
 * 
 * The refresh token is stored as an httpOnly cookie by the server,
 * which is automatically sent with requests due to withCredentials: true.
 */
let accessTokenInMemory: string | null = null;

export const tokenManager = {
    getAccessToken: (): string | null => accessTokenInMemory,
    
    setAccessToken: (token: string): void => {
        accessTokenInMemory = token;
    },
    
    // Refresh token is in httpOnly cookie, we don't store it client-side
    // These methods exist for backward compatibility but the cookie handles it
    getRefreshToken: (): string | null => {
        // The actual refresh token is in the httpOnly cookie
        // This returns null since we can't access it from JS (by design)
        return null;
    },
    
    setRefreshToken: (_token: string): void => {
        // No-op: refresh token is managed via httpOnly cookie by the server
        // The cookie is automatically included in requests due to withCredentials: true
    },
    
    clearTokens: (): void => {
        accessTokenInMemory = null;
        // Refresh token cookie will be cleared by the logout endpoint
    },
    
    setTokens: (accessToken: string, _refreshToken?: string): void => {
        tokenManager.setAccessToken(accessToken);
        // Refresh token is in httpOnly cookie, no client-side storage needed
    },
    
    // Check if user has a valid session (access token in memory)
    hasAccessToken: (): boolean => {
        return !!accessTokenInMemory;
    },
};

// Request interceptor - attach JWT token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = tokenManager.getAccessToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and refresh token
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Don't try to refresh for auth endpoints (login, verify-2fa, etc.)
        const isAuthEndpoint = originalRequest.url?.includes('/auth/');
        
        // Handle 401 Unauthorized - only for non-auth endpoints
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint - refresh token is in httpOnly cookie
                // The server will read it from the cookie automatically
                const response = await axios.post(
                    `${API_BASE_URL}/auth/refresh`,
                    {}, // No body needed - cookie contains refresh token
                    { withCredentials: true }
                );

                const { accessToken } = response.data;
                tokenManager.setAccessToken(accessToken);

                processQueue(null, accessToken);

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                tokenManager.clearTokens();

                // Dispatch event for auth store to handle
                window.dispatchEvent(new CustomEvent('auth:logout'));

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// API response types
export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

// Health check
export const checkHealth = async (): Promise<{ status: string; timestamp: string }> => {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
};

export default api;
