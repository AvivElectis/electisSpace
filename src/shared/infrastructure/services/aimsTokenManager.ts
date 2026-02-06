/**
 * AIMS Token Manager
 * 
 * Client-side middleware for AIMS API calls with automatic token refresh.
 * 
 * Architecture:
 * - Client stores AIMS token received from server during solumConnect
 * - When token expires (or a 401 is received), this manager calls the server's
 *   /auth/solum-refresh endpoint to get a fresh token
 * - Server handles re-login using stored company credentials via aimsGateway
 * - Updated token is stored in settingsStore for all subsequent AIMS calls
 * 
 * Usage:
 *   const token = await getValidAimsToken();
 *   // Use token for AIMS API calls
 * 
 *   // Or wrap an AIMS call with auto-retry on 401:
 *   await withAimsTokenRefresh(async (token) => {
 *     await pushArticles(config, storeNumber, token, articles);
 *   });
 */

import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { authService } from './authService';
import { logger } from './logger';

// Buffer time before actual expiry to trigger refresh (5 minutes)
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

// Prevent concurrent refresh calls
let refreshPromise: Promise<string> | null = null;

/**
 * Check if the current AIMS token is expired or near expiry
 */
export function isAimsTokenExpired(): boolean {
    const settings = useSettingsStore.getState().settings;
    const tokens = settings.solumConfig?.tokens;
    
    if (!tokens?.accessToken) return true;
    if (!tokens.expiresAt) return false; // If no expiry info, assume valid
    
    return tokens.expiresAt - Date.now() < TOKEN_EXPIRY_BUFFER_MS;
}

/**
 * Refresh the AIMS token via server and update settings store
 * De-duplicates concurrent refresh requests
 */
export async function refreshAimsToken(): Promise<string> {
    // If already refreshing, wait for that to complete
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const activeStoreId = useAuthStore.getState().activeStoreId;
            if (!activeStoreId) {
                throw new Error('No active store selected for AIMS token refresh');
            }

            logger.info('AimsTokenManager', 'Refreshing AIMS token via server', { storeId: activeStoreId });

            const result = await authService.solumRefresh(activeStoreId);

            // Update settings store with new token
            const settingsStore = useSettingsStore.getState();
            const currentSettings = settingsStore.settings;

            settingsStore.updateSettings({
                solumConfig: {
                    ...currentSettings.solumConfig,
                    tokens: {
                        ...currentSettings.solumConfig?.tokens,
                        accessToken: result.accessToken,
                        expiresAt: result.expiresAt,
                    },
                    lastConnected: Date.now(),
                },
            });

            logger.info('AimsTokenManager', 'AIMS token refreshed successfully');
            return result.accessToken;
        } catch (error: any) {
            logger.error('AimsTokenManager', 'Failed to refresh AIMS token', { error: error.message });
            throw error;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * Get a valid AIMS token, refreshing if needed
 * Returns the current token if still valid, or refreshes and returns a new one
 */
export async function getValidAimsToken(): Promise<string> {
    const settings = useSettingsStore.getState().settings;
    const tokens = settings.solumConfig?.tokens;

    if (!tokens?.accessToken) {
        throw new Error('Not connected to AIMS. Please connect in Settings first.');
    }

    // If token is expired or near expiry, refresh it
    if (isAimsTokenExpired()) {
        logger.info('AimsTokenManager', 'Token expired or near expiry, refreshing...');
        return await refreshAimsToken();
    }

    return tokens.accessToken;
}

/**
 * Execute an AIMS API call with automatic token refresh on 401/403 errors
 * 
 * @param apiCall - Function that takes a token and makes the AIMS call
 * @returns Result of the API call
 * 
 * @example
 * await withAimsTokenRefresh(async (token) => {
 *   await pushArticles(config, storeNumber, token, articles);
 * });
 */
export async function withAimsTokenRefresh<T>(
    apiCall: (token: string) => Promise<T>
): Promise<T> {
    // Get a valid token (refreshes if expired)
    let token = await getValidAimsToken();

    try {
        return await apiCall(token);
    } catch (error: any) {
        // Check for authentication errors (401/403)
        const isAuthError = 
            error.response?.status === 401 ||
            error.response?.status === 403 ||
            error.message?.includes('401') ||
            error.message?.includes('403') ||
            error.message?.includes('INVALID_USERNAME_AND_PASSWORD') ||
            error.message?.includes('Unauthorized');

        if (isAuthError) {
            logger.info('AimsTokenManager', 'AIMS auth error detected, refreshing token and retrying', {
                status: error.response?.status,
                message: error.message?.substring(0, 100)
            });

            try {
                // Refresh token
                token = await refreshAimsToken();

                // Retry with new token
                return await apiCall(token);
            } catch (retryError: any) {
                logger.error('AimsTokenManager', 'AIMS retry after token refresh failed', {
                    error: retryError.message
                });
                throw retryError;
            }
        }

        // Non-auth error, re-throw
        throw error;
    }
}
