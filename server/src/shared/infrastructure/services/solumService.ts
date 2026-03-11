import axios, { AxiosInstance, AxiosError } from 'axios';
import type { AimsArticle, AimsArticleInfo, AimsLabel, AimsLabelDetail, AimsStore, AimsLinkEntry, AimsApiResponse, AimsLabelTypeInfo, AimsImagePushRequest, AimsDitherPreviewRequest, AimsStoreSummary, AimsLabelStatusSummary, AimsGatewayStatusSummary, AimsLabelModel } from './aims.types.js';
import { appLogger } from './appLogger.js';

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
     * Unwrap AIMS response envelope.
     * AIMS responses come as { responseCode, responseMessage, articleList/labelList/... }
     * where responseMessage can be either an object (the actual payload) or a plain
     * string like "SUCCESS".  When it's a string we must fall back to the top-level
     * object to find the list property.
     */
    private unwrap(data: any): any {
        const payload = data.responseMessage ?? data;
        return (typeof payload === 'string' || payload == null) ? data : payload;
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
                    appLogger.warn('SoluM', `${operation} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${Math.round(delay)}ms`, { error: error.message });
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

        const url = this.buildUrl(config, `/common/api/v2/common/articles?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`);

        return this.withRetry('fetchArticles', async () => {
            const response = await this.client.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Handle empty response / 204
            if (!response.data || response.status === 204) return [];

            const source = this.unwrap(response.data);

            if (Array.isArray(source)) return source;
            return source.articleList || source.content || source.data || [];
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

    // ============== Article Info Operations ==============

    /**
     * Fetch article info (includes assignedLabel) for a single page
     * Endpoint: GET /common/api/v2/common/config/article/info?company=X&store=Y&page=P&size=S
     */
    async fetchArticleInfo(config: SolumConfig, token: string, page = 0, size = 500): Promise<AimsArticleInfo[]> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/config/article/info?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`);

        return this.withRetry('fetchArticleInfo', async () => {
            const response = await this.client.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.data || response.status === 204) return [];

            const source = this.unwrap(response.data);

            if (Array.isArray(source)) return source;
            return source.articleList || source.content || source.data || [];
        });
    }

    /**
     * Fetch all article info with pagination (size=500 per page)
     */
    async fetchAllArticleInfo(config: SolumConfig, token: string): Promise<AimsArticleInfo[]> {
        const allArticles: AimsArticleInfo[] = [];
        let page = 0;
        const size = 500;

        while (page < 100) { // Safety limit
            const articles = await this.fetchArticleInfo(config, token, page, size);
            if (!articles || articles.length === 0) break;
            allArticles.push(...articles);
            if (articles.length < size) break; // Last page
            page++;
        }

        return allArticles;
    }

    // ============== Label Operations ==============

    /**
     * Fetch labels from AIMS
     */
    async fetchLabels(config: SolumConfig, token: string, page = 0, size = 100): Promise<AimsLabel[]> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`);

        return this.withRetry('fetchLabels', async () => {
            const response = await this.client.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.data || response.status === 204) return [];

            const source = this.unwrap(response.data);

            if (Array.isArray(source)) return source;
            return source.labelList || source.content || source.data || [];
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
            const response = await this.client.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.data) return [];
            const source = this.unwrap(response.data);

            if (Array.isArray(source)) return source;
            return source.labelList || source.content || source.data || [];
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
     * Change label page (AIMS API: POST /api/v2/common/labels/page)
     * Body: { pageChangeList: [{ labelCode, page }] }
     * Page values: 1-7 (1=Available, 2=Busy for conference simple mode)
     */
    async changeLabelPage(config: SolumConfig, token: string, labelCodes: string[], page: number): Promise<AimsApiResponse> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/page?company=${config.companyName}&store=${config.storeCode}`);

        const pageChangeList = labelCodes.map(labelCode => ({ labelCode, page }));

        return this.withRetry('changeLabelPage', async () => {
            try {
                const response = await this.client.post(url, { pageChangeList }, {
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
            const response = await this.client.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.data || response.status === 204) return [];

            const source = this.unwrap(response.data);

            if (Array.isArray(source)) return source;
            return source.stores || source.content || source.data || [];
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
                return this.extractResponseData(response.data, 'fetchLabelTypeInfo') as AimsLabelTypeInfo;
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
    async fetchDitherPreview(config: SolumConfig, token: string, labelCode: string, request: AimsDitherPreviewRequest): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/image/dither/preview?company=${config.companyName}&labelCode=${encodeURIComponent(labelCode)}`);

        return this.withRetry('fetchDitherPreview', async () => {
            try {
                const response = await this.client.put(url, request, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return this.extractResponseData(response.data, 'fetchDitherPreview');
            } catch (error: any) {
                throw new Error(`Fetch dither preview failed: ${error.message}`);
            }
        });
    }

    /**
     * Whitelist a label in AIMS
     */
    async whitelistLabel(
        config: SolumConfig,
        token: string,
        labelCode: string
    ): Promise<AimsApiResponse> {
        if (!config.storeCode) {
            throw new Error('Store code is required for whitelist');
        }

        const url = this.buildUrl(
            config,
            `/common/api/v2/common/whitelist?company=${config.companyName}&store=${config.storeCode}`
        );

        return this.withRetry('whitelistLabel', async () => {
            try {
                const response = await this.client.post(url, {
                    labelList: [labelCode],
                }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                return response.data;
            } catch (error: any) {
                throw new Error(`Whitelist label failed: ${error.response?.data?.responseMessage || error.message}`);
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
    // ─── Label Action Operations ────────────────────────────────────────────

    /**
     * Set LED on a label (color/mode control)
     */
    async setLabelLed(config: SolumConfig, token: string, labelCode: string, led: { color?: string; mode?: string }): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/labels/led?company=${config.companyName}&store=${config.storeCode}&labelCode=${labelCode}`);
        return this.withRetry('setLabelLed', async () => {
            const response = await this.client.put(url, led, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'setLabelLed');
        });
    }

    /**
     * Configure NFC URL on a label
     */
    async setLabelNfc(config: SolumConfig, token: string, labelCode: string, nfcUrl: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/labels/nfc?company=${config.companyName}&store=${config.storeCode}&labelCode=${labelCode}`);
        return this.withRetry('setLabelNfc', async () => {
            const response = await this.client.put(url, { nfcUrl }, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'setLabelNfc');
        });
    }

    /**
     * Force a heartbeat/alive signal from a label
     */
    async forceLabelAlive(config: SolumConfig, token: string, labelCode: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/labels/force/alive/signal?company=${config.companyName}&store=${config.storeCode}&labelCode=${labelCode}`);
        return this.withRetry('forceLabelAlive', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'forceLabelAlive');
        });
    }

    /**
     * Fetch article info assigned to a label
     */
    async fetchLabelArticle(config: SolumConfig, token: string, labelCode: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/labels/article?company=${config.companyName}&store=${config.storeCode}&labelCode=${labelCode}`);
        return this.withRetry('fetchLabelArticle', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchLabelArticle');
        });
    }

    /**
     * Fetch label alive/heartbeat history
     */
    async fetchLabelAliveHistory(config: SolumConfig, token: string, labelCode: string, page = 0, size = 50): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/labels/alive/history?company=${config.companyName}&store=${config.storeCode}&label=${labelCode}&page=${page}&size=${size}`);
        return this.withRetry('fetchLabelAliveHistory', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchLabelAliveHistory');
        });
    }

    /**
     * Fetch label operation history (link/unlink/push operations)
     */
    async fetchLabelHistory(config: SolumConfig, token: string, labelCode: string, page = 0, size = 50): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/labels/history?company=${config.companyName}&store=${config.storeCode}&label=${labelCode}&page=${page}&size=${size}`);
        return this.withRetry('fetchLabelHistory', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchLabelHistory');
        });
    }

    // ─── Gateway Operations ─────────────────────────────────────────────────

    async fetchGateways(config: SolumConfig, token: string): Promise<any[]> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/gateway?company=${config.companyName}&store=${config.storeCode}`);
        return this.withRetry('fetchGateways', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            // SoluM returns { gatewayList: [...], responseMessage: "OK" }
            return response.data?.gatewayList ?? response.data?.responseMessage ?? response.data ?? [];
        });
    }

    async fetchGatewayDetail(config: SolumConfig, token: string, gatewayMac: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/gateway/detail?company=${config.companyName}&store=${config.storeCode}&gateway=${gatewayMac}`);
        return this.withRetry('fetchGatewayDetail', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            // SoluM returns gateway detail as flat object with responseCode/responseMessage fields
            const { responseCode, responseMessage, ...detail } = response.data ?? {};
            return Object.keys(detail).length > 0 ? detail : response.data ?? {};
        });
    }

    async fetchFloatingGateways(config: SolumConfig, token: string): Promise<any[]> {
        const url = this.buildUrl(config, `/common/api/v2/common/gateway/floating?company=${config.companyName}`);
        return this.withRetry('fetchFloatingGateways', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            // SoluM may return { gatewayList: [...] } or { responseMessage: [...] }
            return response.data?.gatewayList ?? response.data?.responseMessage ?? response.data ?? [];
        });
    }

    async registerGateway(config: SolumConfig, token: string, gatewayMac: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/gateway`);
        return this.withRetry('registerGateway', async () => {
            const response = await this.client.post(url, {
                company: config.companyName,
                store: config.storeCode,
                gateway: gatewayMac,
            }, { headers: { 'Authorization': `Bearer ${token}` } });
            return response.data;
        });
    }

    async deregisterGateways(config: SolumConfig, token: string, gatewayMacs: string[]): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/gateway?company=${config.companyName}&store=${config.storeCode}&gateways=${gatewayMacs.join(',')}`);
        return this.withRetry('deregisterGateways', async () => {
            const response = await this.client.delete(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return response.data;
        });
    }

    async rebootGateway(config: SolumConfig, token: string, gatewayMac: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/gateway?company=${config.companyName}&store=${config.storeCode}&gateway=${gatewayMac}`);
        return this.withRetry('rebootGateway', async () => {
            const response = await this.client.patch(url, {}, { headers: { 'Authorization': `Bearer ${token}` } });
            return response.data;
        });
    }

    async fetchGatewayDebugReport(config: SolumConfig, token: string, gatewayMac: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/gateway/debug/info?company=${config.companyName}&store=${config.storeCode}&gateway=${gatewayMac}`);
        return this.withRetry('fetchGatewayDebugReport', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            // Strip metadata fields, return the actual debug data
            const { responseCode, responseMessage, ...report } = response.data ?? {};
            return Object.keys(report).length > 0 ? report : response.data ?? {};
        });
    }

    // ─── Gateway Config / Status / Opcodes ─────────────────────────────────

    /**
     * Update gateway configuration (channels, refresh periods, network settings)
     * PUT /api/v2/common/gateway with gateway MAC + config fields in body
     */
    async updateGatewayConfig(config: SolumConfig, token: string, gatewayMac: string, configData: Record<string, any>): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/gateway?company=${config.companyName}&store=${config.storeCode}`);
        return this.withRetry('updateGatewayConfig', async () => {
            const response = await this.client.put(url, { gateway: gatewayMac, ...configData }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return this.extractResponseData(response.data, 'updateGatewayConfig');
        });
    }

    /**
     * Fetch gateway opcodes (pending operations queue)
     */
    async fetchGatewayOpcodes(config: SolumConfig, token: string, gatewayMac: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/gateway/opcode?company=${config.companyName}&store=${config.storeCode}&gateway=${gatewayMac}`);
        return this.withRetry('fetchGatewayOpcodes', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchGatewayOpcodes');
        });
    }

    /**
     * Fetch gateway connection status
     */
    async fetchGatewayStatus(config: SolumConfig, token: string, gatewayMac: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/gateway/status?company=${config.companyName}&store=${config.storeCode}&gateway=${gatewayMac}`);
        return this.withRetry('fetchGatewayStatus', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchGatewayStatus');
        });
    }

    // ─── Label History ──────────────────────────────────────────────────────

    async fetchLabelStatusHistory(config: SolumConfig, token: string, labelCode: string, page = 0, size = 50): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/labels/status/history?company=${config.companyName}&store=${config.storeCode}&label=${labelCode}&page=${page}&size=${size}`);
        return this.withRetry('fetchLabelStatusHistory', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return response.data?.responseMessage ?? response.data ?? {};
        });
    }

    // ─── Article / Batch History ────────────────────────────────────────────

    async fetchBatchHistory(config: SolumConfig, token: string, params: { page?: number; size?: number; fromDate?: string; toDate?: string } = {}): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const { page = 0, size = 20, fromDate, toDate } = params;
        let url = this.buildUrl(config, `/common/api/v2/common/articles/history?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`);
        // AIMS API expects 'start'/'end' date params (format: YYYY-MM-DD HH:mm:ss)
        if (fromDate) url += `&start=${encodeURIComponent(fromDate + ' 00:00:00')}`;
        if (toDate) url += `&end=${encodeURIComponent(toDate + ' 23:59:59')}`;
        return this.withRetry('fetchBatchHistory', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchBatchHistory');
        });
    }

    async fetchBatchDetail(config: SolumConfig, token: string, batchName: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/articles/history/detail?company=${config.companyName}&store=${config.storeCode}&name=${encodeURIComponent(batchName)}`);
        return this.withRetry('fetchBatchDetail', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchBatchDetail');
        });
    }

    async fetchBatchErrors(config: SolumConfig, token: string, batchId: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/articles/validationerror/logs?company=${config.companyName}&store=${config.storeCode}&batchId=${batchId}`);
        return this.withRetry('fetchBatchErrors', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchBatchErrors');
        });
    }

    async fetchArticleUpdateHistory(config: SolumConfig, token: string, articleId: string, page = 0, size = 50): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/articles/update/history?company=${config.companyName}&store=${config.storeCode}&article=${encodeURIComponent(articleId)}&page=${page}&size=${size}`);
        return this.withRetry('fetchArticleUpdateHistory', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchArticleUpdateHistory');
        });
    }

    // ─── Article Browsing Endpoints ─────────────────────────────────────────

    /**
     * Fetch article list for browsing (paginated).
     * Unlike fetchArticles (used for sync), this returns paginated data for UI browsing.
     */
    async fetchArticleList(config: SolumConfig, token: string, params: { page?: number; size?: number; sort?: string } = {}): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const { page = 0, size = 50, sort } = params;
        let urlPath = `/common/api/v2/common/articles?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`;
        if (sort) urlPath += `&sort=${sort}`;
        const url = this.buildUrl(config, urlPath);
        return this.withRetry('fetchArticleList', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchArticleList');
        });
    }

    /**
     * Fetch a single article by its ID
     */
    async fetchArticleById(config: SolumConfig, token: string, articleId: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/articles/id?company=${config.companyName}&store=${config.storeCode}&article=${encodeURIComponent(articleId)}`);
        return this.withRetry('fetchArticleById', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchArticleById');
        });
    }

    /**
     * Fetch articles that are linked to labels
     */
    async fetchLinkedArticles(config: SolumConfig, token: string, params: { page?: number; size?: number } = {}): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const { page = 0, size = 50 } = params;
        const url = this.buildUrl(config, `/common/api/v2/common/articles/linked?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`);
        return this.withRetry('fetchLinkedArticles', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchLinkedArticles');
        });
    }

    /**
     * Fetch all article update history (paginated).
     * AIMS has no "list all" article history endpoint — reuses the batch history
     * endpoint (/articles/history) which returns articleFileHistoryList.
     */
    async fetchArticleUpdateHistoryAll(config: SolumConfig, token: string, params: { page?: number; size?: number } = {}): Promise<any> {
        return this.fetchBatchHistory(config, token, { ...params });
    }

    /**
     * Fetch article update history detail for a specific article
     */
    async fetchArticleUpdateHistoryDetail(config: SolumConfig, token: string, articleId: string, params: { page?: number; size?: number } = {}): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const { page = 0, size = 50 } = params;
        const url = this.buildUrl(config, `/common/api/v2/common/articles/update/history/detail?company=${config.companyName}&store=${config.storeCode}&article=${encodeURIComponent(articleId)}&page=${page}&size=${size}`);
        return this.withRetry('fetchArticleUpdateHistoryDetail', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchArticleUpdateHistoryDetail');
        });
    }

    // ─── Summary / Overview Endpoints ──────────────────────────────────────

    /**
     * Fetch store summary (label + gateway counts, online/offline)
     */
    async fetchStoreSummary(config: SolumConfig, token: string): Promise<AimsStoreSummary> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/store/summary?company=${config.companyName}&store=${config.storeCode}`);
        return this.withRetry('fetchStoreSummary', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchStoreSummary') as AimsStoreSummary;
        });
    }

    /**
     * Fetch label status summary (success/processing/timeout/online/offline counts)
     */
    async fetchLabelStatusSummary(config: SolumConfig, token: string): Promise<AimsLabelStatusSummary> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/labels/summary/status?company=${config.companyName}&store=${config.storeCode}`);
        return this.withRetry('fetchLabelStatusSummary', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchLabelStatusSummary') as AimsLabelStatusSummary;
        });
    }

    /**
     * Fetch gateway status summary (connected/disconnected counts)
     */
    async fetchGatewayStatusSummary(config: SolumConfig, token: string): Promise<AimsGatewayStatusSummary> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/gateway/status/summary?company=${config.companyName}&store=${config.storeCode}`);
        return this.withRetry('fetchGatewayStatusSummary', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchGatewayStatusSummary') as AimsGatewayStatusSummary;
        });
    }

    /**
     * Fetch label models/types with counts
     */
    async fetchLabelModels(config: SolumConfig, token: string): Promise<AimsLabelModel[]> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/labels/model?company=${config.companyName}&store=${config.storeCode}`);
        return this.withRetry('fetchLabelModels', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            // API returns { labelTypeSummary: [{ store, labelTypes: [{ type, linked }] }], responseCode, responseMessage }
            const summary = response.data?.labelTypeSummary;
            if (Array.isArray(summary) && summary.length > 0) {
                // Flatten labelTypes from all stores, map to our AimsLabelModel shape
                return summary.flatMap((s: any) =>
                    (s.labelTypes || []).map((lt: any) => ({
                        labelType: lt.type,
                        count: lt.linked ?? 0,
                    }))
                );
            }
            return [];
        });
    }

    // ─── Template Endpoints ──────────────────────────────────────────────

    /**
     * Fetch templates (paginated)
     */
    async fetchTemplates(config: SolumConfig, token: string, params: { page?: number; size?: number } = {}): Promise<any> {
        const { page = 0, size = 50 } = params;
        const url = this.buildUrl(config, `/common/api/v2/common/templates?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`);
        return this.withRetry('fetchTemplates', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchTemplates');
        });
    }

    /**
     * Fetch a template by name
     */
    async fetchTemplateByName(config: SolumConfig, token: string, templateName: string): Promise<any> {
        const url = this.buildUrl(config, `/common/api/v2/common/templates/name?company=${config.companyName}&name=${encodeURIComponent(templateName)}`);
        return this.withRetry('fetchTemplateByName', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = this.extractResponseData(response.data, 'fetchTemplateByName');
            // API returns a paginated list — extract the first matching template
            const list = data?.content || data?.templateList;
            if (Array.isArray(list)) {
                return list[0] || null;
            }
            return data;
        });
    }

    /**
     * Fetch template types
     */
    async fetchTemplateTypes(config: SolumConfig, token: string): Promise<any[]> {
        const url = this.buildUrl(config, `/common/api/v2/common/templates/type?company=${config.companyName}`);
        return this.withRetry('fetchTemplateTypes', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return response.data?.responseMessage ?? response.data ?? [];
        });
    }

    /**
     * Fetch template mapping conditions
     */
    async fetchTemplateMappingConditions(config: SolumConfig, token: string, page = 0): Promise<any[]> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/templates/mapping/condition?company=${config.companyName}&page=${page}`);
        return this.withRetry('fetchTemplateMappingConditions', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return response.data?.responseMessage ?? response.data ?? [];
        });
    }

    /**
     * Fetch template groups
     */
    async fetchTemplateGroups(config: SolumConfig, token: string): Promise<any[]> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/templates/mapping/group?company=${config.companyName}&store=${config.storeCode}`);
        return this.withRetry('fetchTemplateGroups', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return response.data?.responseMessage ?? response.data ?? [];
        });
    }

    /**
     * Download a template file (XSL or JSON)
     */
    async downloadTemplate(config: SolumConfig, token: string, templateName: string, version: number, fileType: 'XSL' | 'JSON'): Promise<any> {
        const url = this.buildUrl(config, `/common/api/v2/common/templates/download?company=${config.companyName}&version=${version}&fileType=${fileType}`);
        return this.withRetry('downloadTemplate', async () => {
            const response = await this.client.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'templateName': templateName,
                },
            });
            const data = response.data;
            // AIMS returns JSON with base64-encoded template content
            if (data?.template) {
                return { content: data.template, encoding: 'base64' };
            }
            return { content: data, encoding: 'raw' };
        });
    }

    /**
     * Upload a template (XSL + JSON as base64)
     */
    async uploadTemplate(config: SolumConfig, token: string, templateData: Record<string, any>): Promise<any> {
        const url = this.buildUrl(config, `/common/api/v2/common/templates?company=${config.companyName}`);
        return this.withRetry('uploadTemplate', async () => {
            const response = await this.client.post(url, templateData, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            return this.extractResponseData(response.data, 'uploadTemplate');
        });
    }

    // ─── Whitelist ─────────────────────────────────────────────────────

    async fetchWhitelist(config: SolumConfig, token: string, params: { page?: number; size?: number; labelCode?: string; labelModel?: string; sort?: string } = {}): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const { page = 0, size = 50, labelCode, labelModel, sort } = params;
        let urlPath = `/common/api/v2/common/whitelist?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`;
        if (labelCode) urlPath += `&labelCode=${encodeURIComponent(labelCode)}`;
        if (labelModel) urlPath += `&labelModel=${encodeURIComponent(labelModel)}`;
        if (sort) urlPath += `&sort=${sort}`;
        const url = this.buildUrl(config, urlPath);
        return this.withRetry('fetchWhitelist', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchWhitelist');
        });
    }

    async addToWhitelist(config: SolumConfig, token: string, labelCodes: string[]): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/whitelist?company=${config.companyName}&store=${config.storeCode}`);
        return this.withRetry('addToWhitelist', async () => {
            const response = await this.client.post(url, { labelList: labelCodes }, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'addToWhitelist');
        });
    }

    async removeFromWhitelist(config: SolumConfig, token: string, labelCodes: string[]): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/whitelist?company=${config.companyName}&store=${config.storeCode}`);
        return this.withRetry('removeFromWhitelist', async () => {
            const response = await this.client.delete(url, { data: { labelList: labelCodes }, headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'removeFromWhitelist');
        });
    }

    async whitelistBox(config: SolumConfig, token: string, boxId: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const url = this.buildUrl(config, `/common/api/v2/common/whitelist/box?company=${config.companyName}&store=${config.storeCode}&boxid=${encodeURIComponent(boxId)}`);
        return this.withRetry('whitelistBox', async () => {
            const response = await this.client.post(url, {}, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'whitelistBox');
        });
    }

    async syncWhitelistToStorage(config: SolumConfig, token: string, fullUpdate = false): Promise<any> {
        const url = this.buildUrl(config, `/common/api/v2/common/whitelist/update/storage?company=${config.companyName}&isFullUpdateRequired=${fullUpdate ? 'YES' : 'NO'}`);
        return this.withRetry('syncWhitelistToStorage', async () => {
            const response = await this.client.put(url, {}, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'syncWhitelistToStorage');
        });
    }

    async syncWhitelistToGateways(config: SolumConfig, token: string, params: { store?: string; partialDelete?: boolean } = {}): Promise<any> {
        let urlPath = `/common/api/v2/common/whitelist/update/gateway?company=${config.companyName}`;
        if (params.store) urlPath += `&store=${params.store}`;
        if (params.partialDelete) urlPath += `&partialWhitelistDelete=YES`;
        const url = this.buildUrl(config, urlPath);
        return this.withRetry('syncWhitelistToGateways', async () => {
            const response = await this.client.put(url, {}, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'syncWhitelistToGateways');
        });
    }

    async fetchUnassignedWhitelist(config: SolumConfig, token: string, params: { page?: number; size?: number; labelCode?: string; labelModel?: string; sort?: string } = {}): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');
        const { page = 0, size = 50, labelCode, labelModel, sort } = params;
        let urlPath = `/common/api/v2/common/whitelist/unassigned?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`;
        if (labelCode) urlPath += `&labelCode=${encodeURIComponent(labelCode)}`;
        if (labelModel) urlPath += `&labelModel=${encodeURIComponent(labelModel)}`;
        if (sort) urlPath += `&sort=${sort}`;
        const url = this.buildUrl(config, urlPath);
        return this.withRetry('fetchUnassignedWhitelist', async () => {
            const response = await this.client.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            return this.extractResponseData(response.data, 'fetchUnassignedWhitelist');
        });
    }

    /**
     * Extract data from AIMS API response.
     * SoluM responses vary by endpoint:
     *   - Gateway list: { gatewayList: [...], responseCode, responseMessage: "OK" }
     *   - History/paginated: { content: [...], totalPages, totalElements, ..., responseCode, responseMessage }
     *   - Detail: flat object with responseCode/responseMessage mixed in
     *   - Some: responseMessage IS the data (object/array)
     */
    private extractResponseData(data: any, context?: string): any {
        if (!data) return {};

        // Log full response shape for debugging SoluM endpoint variations
        const keys = Object.keys(data);
        appLogger.debug('SolumService', `extractResponseData [${context ?? '?'}] keys=${keys.join(',')} rmType=${typeof data.responseMessage}`);

        // If responseMessage is an object/array, it IS the data
        if (data.responseMessage && typeof data.responseMessage === 'object') {
            return data.responseMessage;
        }
        // Paginated endpoints return { content: [...], totalPages, totalElements, ... }
        if (Array.isArray(data.content)) {
            const { responseCode, responseMessage, ...paginated } = data;
            return paginated;
        }
        // Some endpoints nest under data.data
        if (data.data !== undefined) return data.data;
        // Strip metadata fields and return the rest
        const { responseCode, responseMessage, ...rest } = data;
        return Object.keys(rest).length > 0 ? rest : data;
    }
}

export const solumService = new SolumService();
