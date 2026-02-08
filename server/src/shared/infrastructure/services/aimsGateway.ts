/**
 * AIMS Gateway Service
 * 
 * Server-side gateway for all AIMS (SoluM) API operations.
 * Handles:
 * - Credential retrieval and decryption from Company records
 * - Token caching per company (in-memory)
 * - Article CRUD operations with proper error handling
 * - Retry logic for transient failures
 */

import { prisma } from '../../../config/index.js';
import { config as appConfig } from '../../../config/index.js';
import { solumService, type SolumConfig, type SolumTokens } from './solumService.js';
import { decrypt } from '../../utils/encryption.js';

interface AIMSCredentials {
    baseUrl: string;
    cluster?: string;
    username: string;
    password: string;
}

interface TokenCacheEntry {
    tokens: SolumTokens;
    companyId: string;
}

// In-memory token cache (per company)
const tokenCache = new Map<string, TokenCacheEntry>();

// Token expiry buffer (5 minutes before actual expiry)
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

/**
 * AIMS Gateway - handles all AIMS operations with proper credential management
 */
export class AIMSGateway {
    /**
     * Get AIMS credentials for a company
     */
    async getCredentials(companyId: string): Promise<AIMSCredentials | null> {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                aimsBaseUrl: true,
                aimsCluster: true,
                aimsUsername: true,
                aimsPasswordEnc: true,
            },
        });

        if (!company || !company.aimsBaseUrl || !company.aimsUsername || !company.aimsPasswordEnc) {
            return null;
        }

        // Decrypt password
        let password: string;
        try {
            password = decrypt(company.aimsPasswordEnc, appConfig.encryptionKey);
        } catch (error) {
            console.error(`[AIMS Gateway] Failed to decrypt password for company ${companyId}:`, error);
            return null;
        }

        return {
            baseUrl: company.aimsBaseUrl,
            cluster: company.aimsCluster || undefined,
            username: company.aimsUsername,
            password,
        };
    }

    /**
     * Get store info with company credentials
     */
    async getStoreConfig(storeId: string): Promise<{ config: SolumConfig; companyId: string } | null> {
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            include: {
                company: {
                    select: {
                        id: true,
                        code: true,
                        aimsBaseUrl: true,
                        aimsCluster: true,
                        aimsUsername: true,
                        aimsPasswordEnc: true,
                    },
                },
            },
        });

        if (!store) {
            return null;
        }

        const { company } = store;
        if (!company.aimsBaseUrl || !company.aimsUsername || !company.aimsPasswordEnc) {
            return null;
        }

        // Decrypt password
        let password: string;
        try {
            password = decrypt(company.aimsPasswordEnc, appConfig.encryptionKey);
        } catch (error) {
            console.error(`[AIMS Gateway] Failed to decrypt password for store ${storeId}:`, error);
            return null;
        }

        const config: SolumConfig = {
            baseUrl: company.aimsBaseUrl,
            companyName: company.code, // AIMS uses company code, not name
            storeCode: store.code,
            cluster: company.aimsCluster || undefined,
            username: company.aimsUsername,
            password,
        };

        return { config, companyId: company.id };
    }

    /**
     * Get authenticated token for a company (with caching)
     */
    async getToken(companyId: string): Promise<string> {
        // Check cache first
        const cached = tokenCache.get(companyId);
        if (cached && cached.tokens.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER) {
            return cached.tokens.accessToken;
        }

        // Get credentials
        const credentials = await this.getCredentials(companyId);
        if (!credentials) {
            throw new Error(`No AIMS credentials configured for company ${companyId}`);
        }

        // Login to get new tokens
        const config: SolumConfig = {
            baseUrl: credentials.baseUrl,
            companyName: '', // Not needed for login
            cluster: credentials.cluster,
            username: credentials.username,
            password: credentials.password,
        };

        const tokens = await solumService.login(config);

        // Cache tokens
        tokenCache.set(companyId, { tokens, companyId });

        return tokens.accessToken;
    }

    /**
     * Get authenticated token for a store (uses company's token)
     */
    async getTokenForStore(storeId: string): Promise<{ token: string; config: SolumConfig }> {
        const storeConfig = await this.getStoreConfig(storeId);
        if (!storeConfig) {
            throw new Error(`No AIMS configuration for store ${storeId}`);
        }

        const token = await this.getToken(storeConfig.companyId);
        return { token, config: storeConfig.config };
    }

    /**
     * Invalidate cached token for a company
     */
    invalidateToken(companyId: string): void {
        tokenCache.delete(companyId);
    }

    /**
     * Pull articles from AIMS for a store
     */
    async pullArticles(storeId: string): Promise<any[]> {
        const { token, config } = await this.getTokenForStore(storeId);
        
        try {
            return await solumService.fetchArticles(config, token);
        } catch (error: any) {
            // If authentication error, invalidate cache and retry once
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await solumService.fetchArticles(config, newToken);
                }
            }
            throw error;
        }
    }

    /**
     * Push articles to AIMS for a store
     */
    async pushArticles(storeId: string, articles: any[]): Promise<void> {
        const { token, config } = await this.getTokenForStore(storeId);
        
        try {
            await solumService.pushArticles(config, token, articles);
        } catch (error: any) {
            // If authentication error, invalidate cache and retry once
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    await solumService.pushArticles(config, newToken, articles);
                    return;
                }
            }
            throw error;
        }
    }

    /**
     * Delete articles from AIMS for a store
     */
    async deleteArticles(storeId: string, articleIds: string[]): Promise<void> {
        const { token, config } = await this.getTokenForStore(storeId);
        
        try {
            await solumService.deleteArticles(config, token, articleIds);
        } catch (error: any) {
            // If authentication error, invalidate cache and retry once
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    await solumService.deleteArticles(config, newToken, articleIds);
                    return;
                }
            }
            throw error;
        }
    }

    /**
     * Check AIMS connectivity for a store
     */
    async checkHealth(storeId: string): Promise<boolean> {
        try {
            const storeConfig = await this.getStoreConfig(storeId);
            if (!storeConfig) return false;
            
            return await solumService.checkHealth(storeConfig.config);
        } catch {
            return false;
        }
    }

    /**
     * Check AIMS connectivity for a company
     */
    async checkCompanyHealth(companyId: string): Promise<boolean> {
        try {
            const credentials = await this.getCredentials(companyId);
            if (!credentials) return false;

            const config: SolumConfig = {
                baseUrl: credentials.baseUrl,
                companyName: '',
                cluster: credentials.cluster,
                username: credentials.username,
                password: credentials.password,
            };

            return await solumService.checkHealth(config);
        } catch {
            return false;
        }
    }

    /**
     * Fetch stores from AIMS using raw credentials (not yet saved to DB).
     * Used during company creation wizard to let the user pick stores.
     */
    async fetchStoresWithCredentials(credentials: AIMSCredentials, companyCode: string): Promise<any[]> {
        const config: SolumConfig = {
            baseUrl: credentials.baseUrl,
            companyName: companyCode,
            cluster: credentials.cluster,
            username: credentials.username,
            password: credentials.password,
        };

        // Login to get token
        const tokens = await solumService.login(config);

        // Fetch stores
        return await solumService.fetchStores(config, tokens.accessToken);
    }

    // ============== Label Operations ==============

    /**
     * Fetch all labels for a store
     */
    async fetchLabels(storeId: string): Promise<any[]> {
        const { token, config } = await this.getTokenForStore(storeId);
        
        try {
            return await solumService.fetchAllLabels(config, token);
        } catch (error: any) {
            // If authentication error, invalidate cache and retry once
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await solumService.fetchAllLabels(config, newToken);
                }
            }
            throw error;
        }
    }

    /**
     * Fetch unassigned labels for a store
     */
    async fetchUnassignedLabels(storeId: string): Promise<any[]> {
        const { token, config } = await this.getTokenForStore(storeId);
        
        try {
            return await solumService.fetchUnassignedLabels(config, token);
        } catch (error: any) {
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await solumService.fetchUnassignedLabels(config, newToken);
                }
            }
            throw error;
        }
    }

    /**
     * Fetch label images/details
     */
    async fetchLabelImages(storeId: string, labelCode: string): Promise<{ displayImageList?: any[] }> {
        const { token, config } = await this.getTokenForStore(storeId);
        
        try {
            return await solumService.fetchLabelImages(config, token, labelCode);
        } catch (error: any) {
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await solumService.fetchLabelImages(config, newToken, labelCode);
                }
            }
            throw error;
        }
    }

    /**
     * Link label to article
     */
    async linkLabel(storeId: string, labelCode: string, articleId: string, templateName?: string): Promise<any> {
        const { token, config } = await this.getTokenForStore(storeId);
        
        try {
            return await solumService.linkLabel(config, token, labelCode, articleId, templateName);
        } catch (error: any) {
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await solumService.linkLabel(config, newToken, labelCode, articleId, templateName);
                }
            }
            throw error;
        }
    }

    /**
     * Unlink label from article
     */
    async unlinkLabel(storeId: string, labelCode: string): Promise<any> {
        const { token, config } = await this.getTokenForStore(storeId);
        
        try {
            return await solumService.unlinkLabel(config, token, labelCode);
        } catch (error: any) {
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await solumService.unlinkLabel(config, newToken, labelCode);
                }
            }
            throw error;
        }
    }

    /**
     * Blink a label for identification
     */
    async blinkLabel(storeId: string, labelCode: string): Promise<any> {
        const { token, config } = await this.getTokenForStore(storeId);
        
        try {
            return await solumService.blinkLabel(config, token, labelCode);
        } catch (error: any) {
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await solumService.blinkLabel(config, newToken, labelCode);
                }
            }
            throw error;
        }
    }
}

// Singleton instance
export const aimsGateway = new AIMSGateway();
