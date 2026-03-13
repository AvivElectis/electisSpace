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

// API base URL from environment or derived from Vite base path
// In dev: BASE_URL='./' → './api/v1' (works with Vite proxy / nginx dev)
// In Windows prod: BASE_URL='/app/' → '/app/api/v1' (works with nginx prod)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${import.meta.env.BASE_URL}api/v1`;

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

import { getSseClientId } from './sseClientId';

// Auth-flow endpoints that should NOT trigger proactive refresh or 401 retry
const AUTH_FLOW_PATHS = ['/auth/login', '/auth/verify-2fa', '/auth/refresh', '/auth/device-auth', '/auth/resend-code', '/auth/forgot-password', '/auth/reset-password'];

/**
 * Check if a JWT access token is expired or near expiry.
 * Decodes the base64 payload to read the `exp` claim.
 * Returns true if the token expires within the given buffer (default 60s).
 */
function isTokenNearExpiry(token: string, bufferMs = 60_000): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now() + bufferMs;
    } catch {
        return false; // If we can't decode, let the request proceed as-is
    }
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempt to refresh the access token using the httpOnly cookie.
 * Deduplicates concurrent refresh attempts via a shared promise.
 */
function doRefresh(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
    ).then((response) => {
        const { accessToken } = response.data;
        tokenManager.setAccessToken(accessToken);
        // Notify SSE hook to reconnect with fresh token
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('auth:token-refreshed'));
        }
        return accessToken as string;
    }).catch(() => {
        return null;
    }).finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
}

// Request interceptor - proactive token refresh + attach JWT + SSE client ID
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const isAuthEndpoint = AUTH_FLOW_PATHS.some(p => config.url?.includes(p));

        // Proactively refresh the token before it expires to prevent 401 console errors.
        // Only for non-auth-flow endpoints that would carry a Bearer token.
        if (!isAuthEndpoint) {
            const token = tokenManager.getAccessToken();
            if (token && isTokenNearExpiry(token)) {
                const newToken = await doRefresh();
                if (newToken && config.headers) {
                    config.headers.Authorization = `Bearer ${newToken}`;
                }
            }
        }

        // Attach current token (may have been refreshed above)
        const token = tokenManager.getAccessToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Attach SSE client ID so server can exclude originator from broadcasts
        const sseClientId = getSseClientId();
        if (sseClientId && config.headers) {
            config.headers['x-sse-client-id'] = sseClientId;
        }
        return config;
    },
    (error) => Promise.reject(error)
);
// Response interceptor - fallback 401 handler for cases where proactive refresh missed
// (e.g., token revoked server-side, clock skew, etc.)
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        const isAuthEndpoint = AUTH_FLOW_PATHS.some(p => originalRequest.url?.includes(p));

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;
            try {
                const newToken = await doRefresh();
                if (newToken) {
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    return api(originalRequest);
                }
                // Refresh returned null — session is gone
                tokenManager.clearTokens();
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('auth:logout'));
                }
            } catch (refreshError) {
                tokenManager.clearTokens();
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('auth:logout'));
                }
                return Promise.reject(refreshError);
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

// Health check (uses auth-protected API path)
export const checkHealth = async (): Promise<{ status: string; timestamp: string }> => {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
};

/**
 * Lightweight server health check (no auth required).
 * Returns true if the server is reachable, false otherwise.
 * Uses the /health endpoint which doesn't require authentication.
 */
export const checkServerHealth = async (): Promise<boolean> => {
    try {
        // The health endpoint is at /health (outside /api/v1), but we go through the proxy
        // Try the proxied path first: /api/v1/../health → /health won't work via proxy
        // So just try a HEAD request to the API base — any response (even 401) means server is up
        const response = await axios.get(`${API_BASE_URL}/health`, { 
            timeout: 5000,
            validateStatus: () => true, // Accept any status code
        });
        return response.status < 500;
    } catch {
        return false;
    }
};

export default api;
