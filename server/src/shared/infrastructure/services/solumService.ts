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
     */
    private buildUrl(config: SolumConfig, path: string): string {
        const { baseUrl, cluster } = config;
        const clusterPrefix = cluster === 'c1' ? '/c1' : '';
        // Handles generic cluster configuration logic
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
}

export const solumService = new SolumService();
