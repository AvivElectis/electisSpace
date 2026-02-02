import type { SolumConfig, SolumTokens } from '@shared/domain/types';
import { logger } from '../logger';
import axios from 'axios';

/**
 * @deprecated This service is deprecated. Use the backend sync API instead.
 * 
 * Direct AIMS authentication from the frontend is being replaced by 
 * backend-managed AIMS connections. The backend stores AIMS credentials
 * per company and handles token refresh automatically.
 * 
 * SoluM Authentication Service (DEPRECATED)
 * Handles login, token refresh, and token management
 */

/**
 * Build cluster-aware URL
 * Inserts '/c1' prefix when cluster is 'c1'
 * @param config - SoluM configuration
 * @param path - API path starting with '/common/api/v2/...'
 * @returns Full URL with cluster prefix if applicable
 * @example
 * // Common cluster: https://eu.common.solumesl.com/common/api/v2/token
 * // C1 cluster: https://eu.common.solumesl.com/c1/common/api/v2/token
 */
export function buildUrl(config: SolumConfig, path: string): string {
    const { baseUrl, cluster } = config;

    // Insert '/c1' before the path for c1 cluster
    const clusterPrefix = cluster === 'c1' ? '/c1' : '';

    return `${baseUrl}${clusterPrefix}${path}`;
}

/**
 * Login to SoluM API
 * @param config - SoluM configuration
 * @returns Access and refresh tokens
 */
export async function login(config: SolumConfig): Promise<SolumTokens> {
    logger.info('SolumAuthService', 'Logging in to SoluM API', {
        company: config.companyName,
        cluster: config.cluster,
        baseUrl: config.baseUrl
    });

    const url = buildUrl(config, '/common/api/v2/token');

    logger.debug('SolumAuthService', 'Login request', {
        url,
        method: 'POST',
        bodyKeys: ['username', 'password']
    });

    try {
        const response = await axios.post(url, {
            username: config.username,
            password: config.password,
        });

        const tokenData = response.data.responseMessage;
        const tokens: SolumTokens = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + (tokenData.expires_in * 1000),
        };

        logger.info('SolumAuthService', 'Login successful');
        return tokens;
    } catch (error: any) {
        const status = error.response?.status || 'unknown';
        const errorData = error.response?.data || error.message;
        logger.error('SolumAuthService', 'Login failed', { status, error: errorData });
        throw new Error(`SoluM login failed: ${status} - ${JSON.stringify(errorData)}`);
    }
}

/**
 * Refresh access token
 * @param config - SoluM configuration
 * @param refreshTokenValue - Current refresh Token
 * @returns New access and refresh tokens
 */
export async function refreshToken(
    config: SolumConfig,
    refreshTokenValue: string
): Promise<SolumTokens> {
    logger.info('SolumAuthService', 'Refreshing token');

    const url = buildUrl(config, '/common/api/v2/token/refresh');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            refreshToken: refreshTokenValue,  // API expects camelCase, not underscore
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumAuthService', 'Token refresh failed', { status: response.status, error });
        throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    const tokenData = data.responseMessage;  // Match login response structure

    const tokens: SolumTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };

    logger.info('SolumAuthService', 'Token refreshed successfully');
    return tokens;
}

/**
 * Check if token is expired or near expiry
 * @param tokens - SoluM tokens
 * @param bufferMinutes - Minutes before expiry to consider expired (default 5)
 */
export function isTokenExpired(tokens: SolumTokens | undefined, bufferMinutes: number = 5): boolean {
    if (!tokens) return true;
    const now = Date.now();
    const buffer = bufferMinutes * 60 * 1000;
    return tokens.expiresAt - now < buffer;
}

/**
 * Check if token should be refreshed (every 3 hours or near expiry)
 * @param config - SoluM configuration with tokens
 */
export function shouldRefreshToken(config: SolumConfig): boolean {
    if (!config.tokens || !config.isConnected) return false;

    const now = Date.now();
    const threeHours = 3 * 60 * 60 * 1000; // 3 hours in ms

    // Refresh if token expires soon (< 5 minutes)
    if (isTokenExpired(config.tokens, 5)) return true;

    // Refresh if it's been more than 3 hours since last refresh
    if (config.lastRefreshed && (now - config.lastRefreshed > threeHours)) {
        return true;
    }

    return false;
}

/**
 * Wrapper function for API calls with automatic token refresh on 403 errors
 * @param config - SoluM configuration
 * @param onTokenRefresh - Callback to update tokens in settings
 * @param apiCall - Function that makes the API call with a token
 */
export async function withTokenRefresh<T>(
    config: SolumConfig,
    onTokenRefresh: (tokens: SolumTokens) => void,
    apiCall: (token: string) => Promise<T>
): Promise<T> {
    // Check if we have a valid token
    if (!config.tokens?.accessToken) {
        throw new Error('No active token. Please connect to SoluM API first.');
    }

    try {
        // Try the API call with current token
        return await apiCall(config.tokens.accessToken);
    } catch (error: any) {
        // If 403 error, refresh token and retry
        if (error.status === 403 || error.message?.includes('403')) {
            logger.info('SolumAuthService', '403 error detected, refreshing token and retrying');

            try {
                // Refresh the token
                const newTokens = await refreshToken(config, config.tokens.refreshToken);

                // Update tokens via callback
                onTokenRefresh(newTokens);

                // Retry the API call with new token
                logger.info('SolumAuthService', 'Retrying API call with refreshed token');
                return await apiCall(newTokens.accessToken);
            } catch (refreshError) {
                logger.error('SolumAuthService', 'Token refresh failed during retry', refreshError);
                throw new Error('Failed to refresh token. Please reconnect to SoluM API.');
            }
        }

        // Re-throw if not a 403 error
        throw error;
    }
}
