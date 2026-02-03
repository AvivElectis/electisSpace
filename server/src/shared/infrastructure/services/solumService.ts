import axios, { AxiosInstance } from 'axios';

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

/**
 * SoluM Service for Server-Side Communication
 * Handles authentication and article management with AIMS
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
            if (config.username && config.password) {
                await this.login(config);
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
    async fetchArticles(config: SolumConfig, token: string, page = 0, size = 100): Promise<any[]> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/config/article/info?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`);

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
            // Handle 204 treated as error by some clients/axios (rare but possible if configuration is strict)
            if (error.response?.status === 204) return [];
            throw new Error(`Fetch articles failed: ${error.message}`);
        }
    }

    /**
     * Push articles (Create/Update)
     */
    async pushArticles(config: SolumConfig, token: string, articles: any[]): Promise<void> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/articles?company=${config.companyName}&store=${config.storeCode}`);

        try {
            await this.client.post(url, articles, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error: any) {
            throw new Error(`Push articles failed: ${error.message}`);
        }
    }

    /**
     * Delete articles
     */
    async deleteArticles(config: SolumConfig, token: string, articleIds: string[]): Promise<void> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/articles?company=${config.companyName}&store=${config.storeCode}`);

        try {
            await this.client.delete(url, {
                headers: { 'Authorization': `Bearer ${token}` },
                data: { articleDeleteList: articleIds }
            });
        } catch (error: any) {
            throw new Error(`Delete articles failed: ${error.message}`);
        }
    }

    // ============== Label Operations ==============

    /**
     * Fetch labels from AIMS
     */
    async fetchLabels(config: SolumConfig, token: string, page = 0, size = 100): Promise<any[]> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels?company=${config.companyName}&store=${config.storeCode}&page=${page}&size=${size}`);

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
    }

    /**
     * Fetch all labels with pagination
     */
    async fetchAllLabels(config: SolumConfig, token: string): Promise<any[]> {
        const allLabels: any[] = [];
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
    async fetchUnassignedLabels(config: SolumConfig, token: string): Promise<any[]> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/unassigned?company=${config.companyName}&store=${config.storeCode}`);

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
    }

    /**
     * Fetch label images
     */
    async fetchLabelImages(config: SolumConfig, token: string, labelCode: string): Promise<{ displayImageList?: any[] }> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/detail?company=${config.companyName}&store=${config.storeCode}&label=${labelCode}`);

        try {
            const response = await this.client.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data || {};
        } catch (error: any) {
            throw new Error(`Fetch label images failed: ${error.message}`);
        }
    }

    /**
     * Link label to article
     */
    async linkLabel(config: SolumConfig, token: string, labelCode: string, articleId: string, templateName?: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/link?company=${config.companyName}&store=${config.storeCode}`);

        const body: any = {
            labelCode,
            articleId,
        };
        if (templateName) {
            body.templateName = templateName;
        }

        try {
            const response = await this.client.post(url, body, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Link label failed: ${error.message}`);
        }
    }

    /**
     * Unlink label from article
     */
    async unlinkLabel(config: SolumConfig, token: string, labelCode: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/unlink?company=${config.companyName}&store=${config.storeCode}`);

        try {
            const response = await this.client.post(url, { labelCode }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Unlink label failed: ${error.message}`);
        }
    }

    /**
     * Change label page/template
     */
    async changeLabelPage(config: SolumConfig, token: string, labelCode: string, page: number): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/changePage?company=${config.companyName}&store=${config.storeCode}`);

        try {
            const response = await this.client.post(url, { labelCode, page }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Change label page failed: ${error.message}`);
        }
    }

    /**
     * Blink/flash a label for identification
     */
    async blinkLabel(config: SolumConfig, token: string, labelCode: string): Promise<any> {
        if (!config.storeCode) throw new Error('Store code required');

        const url = this.buildUrl(config, `/common/api/v2/common/labels/blink?company=${config.companyName}&store=${config.storeCode}`);

        try {
            const response = await this.client.post(url, { labelCode }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Blink label failed: ${error.message}`);
        }
    }
}

export const solumService = new SolumService();
