import type { SolumConfig, SolumTokens } from '@shared/domain/types';
import { logger } from './logger';
import axios from 'axios';

/**
 * SoluM ESL API Service
 * Handles all interactions with the SoluM ESL API including authentication and CRUD operations
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
    logger.info('SolumService', 'Logging in to SoluM API', {
        company: config.companyName,
        cluster: config.cluster,
        baseUrl: config.baseUrl
    });

    // Login endpoint only requires username and password
    const url = buildUrl(config, '/common/api/v2/token');

    // console.log('[SoluM Request] Login:', {
    //     url,
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: { username: config.username, password: '***' }
    // });

    logger.debug('SolumService', 'Login request', {
        url,
        method: 'POST',
        bodyKeys: ['username', 'password']
    });

    try {
        const response = await axios.post(url, {
            username: config.username,
            password: config.password,
        });

        // console.log('[SoluM Response] Login:', response.status, response.statusText);
        // console.log('[SoluM Response] Login Data:', response.data);

        const tokenData = response.data.responseMessage;
        const tokens: SolumTokens = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + (tokenData.expires_in * 1000),
        };

        logger.info('SolumService', 'Login successful');
        return tokens;
    } catch (error: any) {
        const status = error.response?.status || 'unknown';
        const errorData = error.response?.data || error.message;
        // console.error('[SoluM Error] Login failed:', { status, error: errorData });
        logger.error('SolumService', 'Login failed', { status, error: errorData });
        throw new Error(`SoluM login failed: ${status} - ${JSON.stringify(errorData)}`);
    }
}

/**
 * Refresh access token
 * @param config - SoluM configuration
 * @param refreshToken - Current refresh Token
 * @returns New access and refresh tokens
 */
export async function refreshToken(
    config: SolumConfig,
    refreshToken: string
): Promise<SolumTokens> {
    logger.info('SolumService', 'Refreshing token');

    const url = buildUrl(config, '/common/api/v2/token/refresh');

    // console.log('[SoluM Request] Refresh Token:', {
    //     url,
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: { refreshToken: '***' }  // camelCase as per API spec line 196-200
    // });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            refreshToken: refreshToken,  // API expects camelCase, not underscore
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumService', 'Token refresh failed', { status: response.status, error });
        throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    const tokenData = data.responseMessage;  // Match login response structure

    const tokens: SolumTokens = {
        accessToken: tokenData.access_token,  // Use underscore field names
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };

    logger.info('SolumService', 'Token refreshed successfully');
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
            logger.info('SolumService', '403 error detected, refreshing token and retrying');

            try {
                // Refresh the token
                const newTokens = await refreshToken(config, config.tokens.refreshToken);

                // Update tokens via callback
                onTokenRefresh(newTokens);

                // Retry the API call with new token
                logger.info('SolumService', 'Retrying API call with refreshed token');
                return await apiCall(newTokens.accessToken);
            } catch (refreshError) {
                logger.error('SolumService', 'Token refresh failed during retry', refreshError);
                throw new Error('Failed to refresh token. Please reconnect to SoluM API.');
            }
        }

        // Re-throw if not a 403 error
        throw error;
    }
}

/**
 * Fetch articles from SoluM API
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @returns Array of articles
 */
export async function fetchArticles(
    config: SolumConfig,
    storeId: string,
    token: string
): Promise<any[]> {
    logger.info('SolumService', 'Fetching articles with details', { storeId });

    // Use the detailed articles endpoint to get full article data
    const url = buildUrl(config, `/common/api/v2/common/config/article/info?company=${config.companyName}&store=${storeId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumService', 'Fetch articles failed', { status: response.status, error });
        throw new Error(`Fetch articles failed: ${response.status}`);
    }

    const data = await response.json();

    // Debug: Log the raw response to see structure
    // console.log('[DEBUG] AIMS API Raw Response:', JSON.stringify(data, null, 2));
    // console.log('[DEBUG] Response is array?', Array.isArray(data));
    // console.log('[DEBUG] Response.articleList exists?', !!data.articleList);

    // The API returns an object with articleList array
    // Example: { totalArticleCnt: 1, articleList: [...], responseCode: "200" }
    const articles = Array.isArray(data) ? data : (data.articleList || data.content || data.data || []);

    // console.log('[DEBUG] Extracted articles:', articles);

    logger.info('SolumService', 'Articles fetched', { count: articles.length });
    return articles;
}

/**
 * Push updated articles to SoluM API
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @param articles - Articles to update
 */
export async function pushArticles(
    config: SolumConfig,
    storeId: string,
    token: string,
    articles: any[]
): Promise<void> {
    logger.info('SolumService', 'Pushing articles', { storeId, count: articles.length });

    const url = buildUrl(config, `/common/api/v2/common/articles?company=${config.companyName}&store=${storeId}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(articles),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumService', 'Push articles failed', { status: response.status, error });
        throw new Error(`Push articles failed: ${response.status}`);
    }

    logger.info('SolumService', 'Articles pushed successfully');
}

/**
 * Delete articles from SoluM API
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @param articleIds - Array of article IDs to delete
 */
export async function deleteArticles(
    config: SolumConfig,
    storeId: string,
    token: string,
    articleIds: string[]
): Promise<void> {
    logger.info('SolumService', 'Deleting articles', { storeId, count: articleIds.length, ids: articleIds });

    const url = buildUrl(config, `/common/api/v2/common/articles?company=${config.companyName}&store=${storeId}`);

    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            articleDeleteList: articleIds
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumService', 'Delete articles failed', { status: response.status, error });
        throw new Error(`Delete articles failed: ${response.status}`);
    }

    logger.info('SolumService', 'Articles deleted successfully');
}

/**
 * Get labels from SoluM API
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @returns Array of labels
 */
export async function getLabels(
    config: SolumConfig,
    storeId: string,
    token: string
): Promise<any[]> {
    logger.info('SolumService', 'Fetching labels', { storeId });

    const url = buildUrl(config, `/common/api/v2/common/labels?company=${config.companyName}&store=${storeId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumService', 'Fetch labels failed', { status: response.status, error });
        throw new Error(`Fetch labels failed: ${response.status}`);
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : [];
    logger.info('SolumService', 'Labels fetched', { count: data.length });
    return data;
}

/**
 * Assign label to article
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @param labelCode - Label code (e.g., "ESL001")
 * @param articleId - Article ID
 * @param templateName - Optional template name
 */
export async function assignLabel(
    config: SolumConfig,
    storeId: string,
    token: string,
    labelCode: string,
    articleId: string,
    templateName?: string
): Promise<void> {
    logger.info('SolumService', 'Assigning label', { labelCode, articleId, templateName });

    const url = buildUrl(config, `/common/api/v2/common/labels/assign?company=${config.companyName}&store=${storeId}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            articleId,
            templateName,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumService', 'Assign label failed', { status: response.status, error });
        throw new Error(`Assign label failed: ${response.status}`);
    }

    logger.info('SolumService', 'Label assigned successfully');
}

/**
 * Update label page (for simple conference mode)
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @param labelCode - Label code
 * @param page - Page number (0 or 1)
 */
export async function updateLabelPage(
    config: SolumConfig,
    storeId: string,
    token: string,
    labelCode: string,
    page: number
): Promise<void> {
    logger.info('SolumService', 'Updating label page', { labelCode, page });

    const url = buildUrl(config, `/common/api/v2/common/labels/changePage?company=${config.companyName}&store=${storeId}`);

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumService', 'Update label page failed', { status: response.status, error });
        throw new Error(`Update label page failed: ${response.status}`);
    }

    logger.info('SolumService', 'Label page updated successfully');
}

/**
 * Get label detail (includes active page information)
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @param labelCode - Label code
 * @returns Label details
 */
export async function getLabelDetail(
    config: SolumConfig,
    storeId: string,
    token: string,
    labelCode: string
): Promise<any> {
    logger.info('SolumService', 'Fetching label detail', { labelCode });

    const url = buildUrl(config, `/common/api/v2/common/labels/unassigned/detail?company=${config.companyName}&labelCode=${labelCode}&storeCode=${storeId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumService', 'Fetch label detail failed', { status: response.status, error });
        throw new Error(`Fetch label detail failed: ${response.status}`);
    }

    const data = await response.json();
    logger.info('SolumService', 'Label detail fetched');
    return data;
}

/**
 * Get store summary (for connection verification)
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @returns Store summary with configuration and statistics
 */
export async function getStoreSummary(
    config: SolumConfig,
    storeId: string,
    token: string
): Promise<any> {
    logger.info('SolumService', 'Fetching store summary', { storeId });

    const url = buildUrl(config, `/common/api/v2/common/store/summary?company=${config.companyName}&store=${storeId}`);

    // console.log('[SoluM Request] Get Store Summary:', {
    //     url,
    //     method: 'GET',
    //     headers: {
    //         'Authorization': `Bearer ${token.substring(0, 20)}...`,
    //         'Content-Type': 'application/json'
    //     },
    //     queryParams: { company: config.companyName, store: storeId }
    // });

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumService', 'Fetch store summary failed', { status: response.status, error });
        throw new Error(`Fetch store summary failed: ${response.status}`);
    }

    const data = await response.json();
    logger.info('SolumService', 'Store summary fetched', {
        totalLabelCount: data.totalLabelCount,
        totalProductCount: data.totalProductCount,
        onlineGwCount: data.onlineGwCount
    });
    return data;
}
