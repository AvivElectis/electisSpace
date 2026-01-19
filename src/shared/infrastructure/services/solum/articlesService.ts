import type { SolumConfig } from '@shared/domain/types';
import { logger } from '../logger';
import { buildUrl } from './authService';

/**
 * SoluM Articles Service
 * Handles article CRUD operations
 */

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
    token: string,
    page: number = 0,
    size: number = 100
): Promise<any[]> {
    logger.info('SolumArticlesService', 'Fetching articles with details', { storeId, page, size });

    // Use the detailed articles endpoint to get full article data with pagination
    const url = buildUrl(config, `/common/api/v2/common/config/article/info?company=${config.companyName}&store=${storeId}&page=${page}&size=${size}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumArticlesService', 'Fetch articles failed', { status: response.status, error });
        throw new Error(`Fetch articles failed: ${response.status}`);
    }

    const text = await response.text();
    // Handle empty response (e.g. 204 No Content or just empty body)
    if (!text || text.trim().length === 0) {
        logger.info('SolumArticlesService', 'Articles fetched (empty response)', { count: 0 });
        return [];
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        logger.error('SolumArticlesService', 'Failed to parse SoluM response', { text });
        throw new Error('Invalid JSON response from SoluM API');
    }

    // The API returns an object with articleList array
    // Example: { totalArticleCnt: 1, articleList: [...], responseCode: "200" }
    const articles = Array.isArray(data) ? data : (data.articleList || data.content || data.data || []);

    logger.info('SolumArticlesService', 'Articles fetched', { count: articles.length });
    return articles;
}

/**
 * Push updated articles to SoluM API (POST - Full update/Replace)
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
    const url = buildUrl(config, `/common/api/v2/common/articles?company=${config.companyName}&store=${storeId}`);
    const requestBody = JSON.stringify(articles);
    
    logger.info('SolumArticlesService', 'Pushing articles - FULL REQUEST', { 
        url,
        method: 'POST',
        storeId, 
        count: articles.length,
        headers: {
            'Authorization': `Bearer ${token.substring(0, 20)}...`,
            'Content-Type': 'application/json',
        },
        body: requestBody
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: requestBody,
    });

    const responseText = await response.text();
    
    logger.info('SolumArticlesService', 'Push articles - FULL RESPONSE', { 
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
    });

    if (!response.ok) {
        logger.error('SolumArticlesService', 'Push articles failed', { 
            status: response.status, 
            statusText: response.statusText,
            error: responseText 
        });
        throw new Error(`Push articles failed: ${response.status} - ${responseText}`);
    }

    logger.info('SolumArticlesService', 'Articles pushed successfully');
}

/**
 * Update articles using PUT method (Partial update/Append)
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @param articles - Articles to update
 */
export async function putArticles(
    config: SolumConfig,
    storeId: string,
    token: string,
    articles: any[]
): Promise<void> {
    logger.info('SolumArticlesService', 'Updating articles (PUT)', { storeId, count: articles.length });

    const url = buildUrl(config, `/common/api/v2/common/articles?company=${config.companyName}&store=${storeId}`);

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
        logger.error('SolumArticlesService', 'Update articles failed', { status: response.status, error });
        throw new Error(`Update articles failed: ${response.status}`);
    }

    logger.info('SolumArticlesService', 'Articles updated successfully');
}

/**
 * Fetch detailed article by article ID
 * Uses /common/api/v2/common/config/articleField which returns full data object
 * @param config - SoluM configuration  
 * @param storeId - Store number
 * @param token - Access token
 * @param articleId - Article ID to fetch
 * @returns Article with full data object
 */
export async function fetchArticleDetails(
    config: SolumConfig,
    storeId: string,
    token: string,
    articleId: string
): Promise<any> {
    logger.info('SolumArticlesService', 'Fetching article details', { storeId, articleId });

    const url = buildUrl(config, `/common/api/v2/common/config/articleField?company=${config.companyName}&store=${storeId}&article=${articleId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumArticlesService', 'Fetch article details failed', { status: response.status, error, articleId });
        throw new Error(`Fetch article details failed: ${response.status}`);
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
        logger.warn('SolumArticlesService', 'Article not found', { articleId });
        return null;
    }

    const data = JSON.parse(text);
    logger.info('SolumArticlesService', 'Article details fetched', { articleId, hasData: !!data });
    return data;
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
    logger.info('SolumArticlesService', 'Deleting articles', { storeId, count: articleIds.length, ids: articleIds });

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
        logger.error('SolumArticlesService', 'Delete articles failed', { status: response.status, error });
        throw new Error(`Delete articles failed: ${response.status}`);
    }

    logger.info('SolumArticlesService', 'Articles deleted successfully');
}
