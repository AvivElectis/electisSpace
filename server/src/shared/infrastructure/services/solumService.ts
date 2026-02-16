import axios, { AxiosInstance, AxiosError } from 'axios';
import type { AimsArticle, AimsLabel, AimsLabelDetail, AimsStore, AimsLinkEntry, AimsApiResponse, AimsLabelTypeInfo, AimsImagePushRequest, AimsDitherPreviewRequest } from './aims.types.js';

// Types definition (replicating needed parts from shared/domain/types)
export interface SolumConfig {
    baseUrl: string;
    companyName: string;
    cluster?: string;
    storeCode?: string;
    username?: string;
    password?: string;
}

export interface SolumTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export interface MappingInfo {
    store: string;          // e.g., "STORE_ID"
    articleId: string;      // e.g., "ARTICLE_ID"
    articleName: string;    // e.g., "ITEM_NAME"
    nfcUrl?: string;       // e.g., "NFC_URL"
    [key: string]: string | undefined;
}

export interface ArticleFormat {
    fileExtension: string;       // e.g., "csv"
    delimeter: string;           // SoluM's spelling of delimiter
    mappingInfo: MappingInfo;
    articleBasicInfo: string[];  // e.g., ["store", "articleId", "articleName", "nfcUrl"]
    articleData: string[];       // e.g., ["STORE_ID", "ARTICLE_ID", "ITEM_NAME", ...]
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 10000; // 10 seconds

/**
 * Check if an error is retryable (transient failure)
 */
function isRetryableError(error: AxiosError): boolean {
    // Network errors (no response)
    if (!error.response) return true;

    const status = error.response.status;

    // Retry on server errors (5xx)
    if (status >= 500 && status < 600) return true;

    // Retry on 429 Too Many Requests
    if (status === 429) return true;

    // Retry on timeout
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return true;

    return false;
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
    // Add jitter (up to 25% random variation)
    const jitter = delay * 0.25 * Math.random();
    return Math.min(delay + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * SoluM Service for Server-Side Communication
 * Handles authentication and article management with AIMS
 * Includes automatic retry with exponential backoff for transient failures
 */
export class SolumService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Execute an HTTP request with automatic retry for transient failures
     */
    private async withRetry<T>(
        operation: string,
        fn: () => Promise<T>
    ): Promise<T> {
        let lastError: any;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;

                // Don't retry auth errors (401/403) - those need token refresh, not retry
                if (error.response?.status === 401 || error.response?.status === 403) {
                    throw error;
                }

                // Don't retry on 4xx client errors (except 429)
                if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
                    throw error;
                }

                // Check if this is a retryable error
                if (attempt < MAX_RETRIES && isRetryableError(error)) {
                    const delay = getRetryDelay(attempt);
                    console.warn(`[SoluM] ${operation} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${Math.round(delay)}ms:`, error.message);
                    await sleep(delay);
                    continue;
                }

                throw error;
            }
        }

        throw lastError;
    }

    /**
     * Build cluster-aware URL
     * Handles both legacy format (domain only) and new format (domain + /common or /c1/common)
     * 
     * New base URL format:
     * - Common cluster: https://eu.common.solumesl.com/common
     * - C1 cluster: https://eu.common.solumesl.com/c1/common
     * 
     * Legacy format (still supported):
     * - https://eu.common.solumesl.com (cluster prefix added dynamically)
     */
    private buildUrl(config: SolumConfig, path: string): string {
        let { baseUrl, cluster } = config;
        
        // Normalize base URL - remove trailing /common or /c1/common if present
        // The new format includes these, but we strip them to build URLs consistently
        baseUrl = baseUrl.replace(/\/(c1\/)?common\/?$/, '');
        
        const clusterPrefix = cluster === 'c1' ? '/c1' : '';
        return `${baseUrl}${clusterPrefix}${path}`;
    }

    /**
     * Login to SoluM API
     */
    async login(config: SolumConfig): Promise<SolumTokens> {
        if (!config.username || !config.password) {
            throw new Error('Username and password required for login');
        }

        const url = this.buildUrl(config, '/common/api/v2/token');

        try {
            const response = await this.client.post(url, {
                username: config.username,
                password: config.password,
            });

            const tokenData = response.data.responseMessage;
            return {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: Date.now() + (tokenData.expires_in * 1000),
            };
        } catch (error: any) {
            const status = error.response?.status || 'unknown';
            const errorData = error.response?.data || error.message;
            throw new Error(`SoluM login failed: ${status} - ${JSON.stringify(errorData)}`);
        }
    }

    /**
     * Check connectivity/health
     * Tries to login or ping a public endpoint if available.
     * Since SoluM doesn't have a public ping without auth, we might just return true if login works
     * or check if the URL is reachable.
     */
    async checkHealth(config: SolumConfig): Promise<boolean> {
        try {
            // If we have credentials, try to login as a health check
            // Use withRetry to handle transient AIMS failures (timeouts, 502s, etc.)
            if (config.username && config.password) {
                await this.withRetry('checkHealth', () => this.login(config));
                return true;
            }
            // Otherwise, just check if the base URL is reachable (simple HEAD request)
            // Note: SoluM might respond 404 on base URL, but connection is successful.
            // We'll try to reach the token endpoint without creds and expect 405 or 400, not connection error.
            const url = this.buildUrl(config, '/common/api/v2/token');
            try {
                await this.client.head(url);
                return true;
            } catch (err: any) {
                // 405 Method Not Allowed or 400 Bad Request means server is UP
                if (err.response && (err.response.status >= 200 && err.response.status < 500)) {
                    return true;
                }
                throw err;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * Fetch articles
     */
    async fetchArticles(config: SolumConfig, token: string, page = 0, size = 100): Promise<AimsArticle[]> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/config/article/info?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`);

        return this.withRetry('fetchArticles', async () => {
            try {
                const response = await this.client.get(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                // Handle empty response
                if (!response.data) return [];

                // Handle 204 No Content
                if (response.status === 204) return [];

                const data = response.data;
                return Array.isArray(data) ? data : (data.articleList || data.content || data.data || []);
            } catch (error: any) {
                // Handle 204 treated as error by some clients/axios
                if (error.response?.status === 204) return [];
                throw new Error(`Fetch articles failed: ${error.message}`);
            }
        });
    }

    /**
     * Fetch article format schema from AIMS
     * Returns the company's article data schema including mappingInfo, articleData fields, etc.
     */
    async fetchArticleFormat(config: SolumConfig, token: string): Promise<ArticleFormat> {
        const url = this.buildUrl(config, `/common/api/v2/common/articles/upload/format?company=${config.companyName}`);

        return this.withRetry('fetchArticleFormat', async () => {
            try {
                const response = await this.client.get(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return response.data as ArticleFormat;
            } catch (error: any) {
                throw new Error(`Fetch article format failed: ${error.message}`);
            }
        });
    }

    /**
     * Save/update article format to AIMS
     * Endpoint: POST /common/api/v2/common/articles/upload/format?company=X
     */
    async saveArticleFormat(config: SolumConfig, token: string, format: ArticleFormat): Promise<void> {
        const url = this.buildUrl(config, `/common/api/v2/common/articles/upload/format?company=${config.companyName}`);

        return this.withRetry('saveArticleFormat', async () => {
            try {
                await this.client.post(url, format, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (error: any) {
                throw new Error(`Save article format failed: ${error.message}`);
            }
        });
    }

    /**
     * Push articles (Create/Update)
     */
    async pushArticles(config: SolumConfig, token: string, articles: AimsArticle[]): Promise<void> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/articles?company=${config.companyName}&store=${config.storeCode}`);

        return this.withRetry('pushArticles', async () => {
            try {
                await this.client.post(url, articles, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (error: any) {
                throw new Error(`Push articles failed: ${error.message}`);
            }
        });
    }

    /**
     * Delete articles
     */
    async deleteArticles(config: SolumConfig, token: string, articleIds: string[]): Promise<void> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/articles?company=${config.companyName}&store=${config.storeCode}`);

        return this.withRetry('deleteArticles', async () => {
            try {
                await this.client.delete(url, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    data: { articleDeleteList: articleIds }
                });
            } catch (error: any) {
                throw new Error(`Delete articles failed: ${error.message}`);
            }
        });
    }

    // ============== Label Operations ==============

    /**
     * Fetch labels from AIMS
     */
    async fetchLabels(config: SolumConfig, token: string, page = 0, size = 100): Promise<AimsLabel[]> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`);

        return this.withRetry('fetchLabels', async () => {
            try {
                const response = await this.client.get(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.data) return [];
                if (response.status === 204) return [];

                const data = response.data;
                return Array.isArray(data) ? data : (data.labelList || data.content || data.data || []);
            } catch (error: any) {
                if (error.response?.status === 204) return [];
                throw new Error(`Fetch labels failed: ${error.message}`);
            }
        });
    }

    /**
     * Fetch all labels with pagination
     */
    async fetchAllLabels(config: SolumConfig, token: string): Promise<AimsLabel[]> {
        const allLabels: AimsLabel[] = [];
        let page = 0;
        const size = 100;
        let hasMore = true;

        while (hasMore) {
            const labels = await this.fetchLabels(config, token, page, size);
            if (labels.length === 0) {
                hasMore = false;
            } else {
                allLabels.push(...labels);
                page++;
                // Safety limit
                if (page > 100) break;
            }
        }

        return allLabels;
    }

    /**
     * Fetch unassigned labels
     */
    async fetchUnassignedLabels(config: SolumConfig, token: string): Promise<AimsLabel[]> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/unassigned?company=${config.companyName}&store=${config.storeCode}`);

        return this.withRetry('fetchUnassignedLabels', async () => {
            try {
                const response = await this.client.get(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.data) return [];
                const data = response.data;
                return Array.isArray(data) ? data : (data.labelList || data.content || data.data || []);
            } catch (error: any) {
                throw new Error(`Fetch unassigned labels failed: ${error.message}`);
            }
        });
    }

    /**
     * Fetch label images
     */
    async fetchLabelImages(config: SolumConfig, token: string, labelCode: string): Promise<AimsLabelDetail> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/detail?company=${config.companyName}&store=${config.storeCode}&label=${labelCode}`);

        return this.withRetry('fetchLabelImages', async () => {
            try {
                const response = await this.client.get(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                return response.data || {};
            } catch (error: any) {
                throw new Error(`Fetch label images failed: ${error.message}`);
            }
        });
    }

    /**
     * Link label to article
     */
    async linkLabel(config: SolumConfig, token: string, labelCode: string, articleId: string, templateName?: string): Promise<AimsApiResponse> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/link?company=${config.companyName}&store=${config.storeCode}`);

        const assignEntry: AimsLinkEntry = {
            labelCode,
            articleIdList: [articleId],
            ...(templateName && { templateName }),
        };
        const body = { assignList: [assignEntry] };

        return this.withRetry('linkLabel', async () => {
            try {
                const response = await this.client.post(url, body, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return response.data;
            } catch (error: any) {
                throw new Error(`Link label failed: ${error.message}`);
            }
        });
    }

    /**
     * Unlink label from article
     */
    async unlinkLabel(config: SolumConfig, token: string, labelCode: string): Promise<AimsApiResponse> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/unlink?company=${config.companyName}&store=${config.storeCode}`);

        return this.withRetry('unlinkLabel', async () => {
            try {
                const response = await this.client.post(url, { unAssignList: [labelCode] }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return response.data;
            } catch (error: any) {
                throw new Error(`Unlink label failed: ${error.message}`);
            }
        });
    }

    /**
     * Change label page/template
     */
    async changeLabelPage(config: SolumConfig, token: string, labelCode: string, page: number): Promise<AimsApiResponse> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/changePage?company=${config.companyName}&store=${config.storeCode}`);

        return this.withRetry('changeLabelPage', async () => {
            try {
                const response = await this.client.post(url, { labelCode, page }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return response.data;
            } catch (error: any) {
                throw new Error(`Change label page failed: ${error.message}`);
            }
        });
    }

    /**
     * Fetch stores from AIMS for a company
     * Uses GET /common/api/v2/common/store?company=XXX
     */
    async fetchStores(config: SolumConfig, token: string): Promise<AimsStore[]> {
        const url = this.buildUrl(config, `/common/api/v2/common/store?company=${config.companyName}`);

        return this.withRetry('fetchStores', async () => {
            try {
                const response = await this.client.get(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.data) return [];
                if (response.status === 204) return [];

                const data = response.data;
                return Array.isArray(data) ? data : (data.stores || data.content || data.data || []);
            } catch (error: any) {
                if (error.response?.status === 204) return [];
                throw new Error(`Fetch stores failed: ${error.message}`);
            }
        });
    }

    /**
     * Fetch label type/hardware info (dimensions, color type, etc.)
     */
    async fetchLabelTypeInfo(config: SolumConfig, token: string, labelCode: string): Promise<AimsLabelTypeInfo> {
        const url = this.buildUrl(config, `/common/api/v2/common/labels/type/info?labelCode=${encodeURIComponent(labelCode)}`);

        return this.withRetry('fetchLabelTypeInfo', async () => {
            try {
                const response = await this.client.get(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return response.data as AimsLabelTypeInfo;
            } catch (error: any) {
                throw new Error(`Fetch label type info failed: ${error.message}`);
            }
        });
    }

    /**
     * Push an image to a label via AIMS
     */
    async pushLabelImage(config: SolumConfig, token: string, request: AimsImagePushRequest): Promise<AimsApiResponse> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/image?company=${config.companyName}&store=${config.storeCode}`);

        return this.withRetry('pushLabelImage', async () => {
            try {
                const response = await this.client.post(url, request, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return response.data;
            } catch (error: any) {
                throw new Error(`Push label image failed: ${error.message}`);
            }
        });
    }

    /**
     * Get dithered preview of an image from AIMS
     */
    async fetchDitherPreview(config: SolumConfig, token: string, labelCode: string, request: AimsDitherPreviewRequest): Promise<AimsApiResponse> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/image/dither/preview?company=${config.companyName}&labelCode=${encodeURIComponent(labelCode)}`);

        return this.withRetry('fetchDitherPreview', async () => {
            try {
                const response = await this.client.put(url, request, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return response.data;
            } catch (error: any) {
                throw new Error(`Fetch dither preview failed: ${error.message}`);
            }
        });
    }

    /**
     * Blink/flash a label for identification
     */
    async blinkLabel(config: SolumConfig, token: string, labelCode: string): Promise<AimsApiResponse> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/blink?company=${config.companyName}&store=${config.storeCode}`);

        return this.withRetry('blinkLabel', async () => {
            try {
                const response = await this.client.post(url, { labelCode }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return response.data;
            } catch (error: any) {
                throw new Error(`Blink label failed: ${error.message}`);
            }
        });
    }
}

export const solumService = new SolumService();
