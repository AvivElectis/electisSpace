import type { SolumConfig, SolumTokens } from '@shared/domain/types';
import { logger } from './logger';

/**
 * SoluM ESL API Service
 * Handles all interactions with the SoluM ESL API including authentication and CRUD operations
 */

/**
 * Login to SoluM API
 * @param config - SoluM configuration
 * @returns Access and refresh tokens
 */
export async function login(config: SolumConfig): Promise<SolumTokens> {
    logger.info('SolumService', 'Logging in to SoluM API', { company: config.companyName });

    const url = `${config.baseUrl}/api/v2/auth/login`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            company: config.companyName,
            username: config.username,
            password: config.password,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumService', 'Login failed', { status: response.status, error });
        throw new Error(`SoluM login failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    const tokens: SolumTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000), // Convert seconds to milliseconds
    };

    logger.info('SolumService', 'Login successful');
    return tokens;
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

    const url = `${config.baseUrl}/api/v2/auth/refresh`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            refreshToken,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumService', 'Token refresh failed', { status: response.status, error });
        throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();

    const tokens: SolumTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
    };

    logger.info('SolumService', 'Token refreshed successfully');
    return tokens;
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
    logger.info('SolumService', 'Fetching articles', { storeId });

    const url = `${config.baseUrl}/api/v2/stores/${storeId}/articles`;

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
    logger.info('SolumService', 'Articles fetched', { count: data.length });
    return data;
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

    const url = `${config.baseUrl}/api/v2/stores/${storeId}/articles`;

    const response = await fetch(url, {
        method: 'PUT',
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

    const url = `${config.baseUrl}/api/v2/stores/${storeId}/labels`;

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

    const data = await response.json();
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

    const url = `${config.baseUrl}/api/v2/stores/${storeId}/labels/${labelCode}/assign`;

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

    const url = `${config.baseUrl}/api/v2/stores/${storeId}/labels/${labelCode}/page`;

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

    const url = `${config.baseUrl}/api/v2/common/labels/unassigned/detail?labelCode=${labelCode}&storeCode=${storeId}`;

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
