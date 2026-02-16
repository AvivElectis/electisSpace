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
import { solumService, type SolumConfig, type SolumTokens, type ArticleFormat } from './solumService.js';
import type { AimsArticle, AimsLabel, AimsLabelDetail, AimsStore, AimsApiResponse, AimsLabelTypeInfo, AimsImagePushRequest, AimsDitherPreviewRequest } from './aims.types.js';
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

interface FormatCacheEntry {
    format: ArticleFormat;
    fetchedAt: number;
}

// In-memory token cache (per company)
const tokenCache = new Map<string, TokenCacheEntry>();

// In-flight login promises (singleflight pattern to prevent concurrent duplicate logins)
const inflightLogins = new Map<string, Promise<SolumTokens>>();

// In-memory article format cache (per company) — refreshed every 30 minutes
const formatCache = new Map<string, FormatCacheEntry>();
const FORMAT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// AIMS enforces a maximum of 500 articles per POST request
const AIMS_BATCH_SIZE = 500;

// Token expiry buffer (5 minutes before actual expiry)
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

// Retry config for login
const LOGIN_MAX_RETRIES = 3;
const LOGIN_BASE_DELAY = 1000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Login with retry for transient failures (429, 5xx)
 */
async function loginWithRetry(config: SolumConfig): Promise<SolumTokens> {
    let lastError: any;
    for (let attempt = 0; attempt <= LOGIN_MAX_RETRIES; attempt++) {
        try {
            return await solumService.login(config);
        } catch (error: any) {
            lastError = error;
            const msg = error.message || '';
            const status = error.response?.status ?? error.status;
            // Retryable: 429 or 5xx (check both numeric status and message text)
            const is429 = status === 429 || msg.includes('429');
            const is5xx = (status >= 500 && status < 600) || /\b5\d{2}\b/.test(msg);
            if (attempt < LOGIN_MAX_RETRIES && (is429 || is5xx)) {
                const delay = LOGIN_BASE_DELAY * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4);
                console.warn(`[AIMS Gateway] login failed (attempt ${attempt + 1}/${LOGIN_MAX_RETRIES + 1}), retrying in ${Math.round(delay)}ms: ${msg}`);
                await sleep(delay);
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

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

        // Singleflight: if a login is already in-flight for this company, await it
        const inflight = inflightLogins.get(companyId);
        if (inflight) {
            const tokens = await inflight;
            return tokens.accessToken;
        }

        // Get credentials
        const credentials = await this.getCredentials(companyId);
        if (!credentials) {
            throw new Error(`No AIMS credentials configured for company ${companyId}`);
        }

        // Login to get new tokens (with singleflight dedup)
        const config: SolumConfig = {
            baseUrl: credentials.baseUrl,
            companyName: '', // Not needed for login
            cluster: credentials.cluster,
            username: credentials.username,
            password: credentials.password,
        };

        const loginPromise = loginWithRetry(config);
        inflightLogins.set(companyId, loginPromise);

        try {
            const tokens = await loginPromise;

            // Cache tokens
            tokenCache.set(companyId, { tokens, companyId });

            return tokens.accessToken;
        } finally {
            inflightLogins.delete(companyId);
        }
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
    async pullArticles(storeId: string): Promise<AimsArticle[]> {
        const { token, config } = await this.getTokenForStore(storeId);
        const PAGE_SIZE = 100;
        const MAX_PAGES = 50; // Safety limit to prevent infinite loops

        try {
            const allArticles: AimsArticle[] = [];
            let page = 0;

            while (page < MAX_PAGES) {
                const articles = await solumService.fetchArticles(config, token, page, PAGE_SIZE);
                if (!articles || articles.length === 0) break;
                allArticles.push(...articles);
                if (articles.length < PAGE_SIZE) break; // Last page
                page++;
            }

            return allArticles;
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
     * Push articles to AIMS for a store (handles batching in groups of 500)
     */
    async pushArticles(storeId: string, articles: AimsArticle[]): Promise<void> {
        if (articles.length === 0) return;

        const { token, config } = await this.getTokenForStore(storeId);

        // Split into batches of AIMS_BATCH_SIZE
        const batches: AimsArticle[][] = [];
        for (let i = 0; i < articles.length; i += AIMS_BATCH_SIZE) {
            batches.push(articles.slice(i, i + AIMS_BATCH_SIZE));
        }

        if (batches.length > 1) {
            console.log(`[AIMS Gateway] Pushing ${articles.length} articles in ${batches.length} batches of up to ${AIMS_BATCH_SIZE}`);
        }

        for (let idx = 0; idx < batches.length; idx++) {
            const batch = batches[idx];
            try {
                await solumService.pushArticles(config, token, batch);
            } catch (error: any) {
                // If authentication error on first batch, retry with refreshed token
                if (idx === 0 && (error.message?.includes('401') || error.message?.includes('403'))) {
                    const storeConfig = await this.getStoreConfig(storeId);
                    if (storeConfig) {
                        this.invalidateToken(storeConfig.companyId);
                        const newToken = await this.getToken(storeConfig.companyId);
                        // Retry current batch
                        await solumService.pushArticles(config, newToken, batch);
                        // Continue remaining batches with new token
                        for (let j = idx + 1; j < batches.length; j++) {
                            await solumService.pushArticles(config, newToken, batches[j]);
                        }
                        return;
                    }
                }
                throw error;
            }
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
     * Fetch the article format for a store's company.
     * Priority: in-memory cache → DB (Company.settings.solumArticleFormat) → AIMS live fetch.
     * On AIMS live fetch, saves to DB for future use.
     */
    async fetchArticleFormat(storeId: string): Promise<ArticleFormat> {
        const storeConfig = await this.getStoreConfig(storeId);
        if (!storeConfig) {
            throw new Error(`No AIMS configuration for store ${storeId}`);
        }

        const { companyId } = storeConfig;

        // 1. Check in-memory cache
        const cached = formatCache.get(companyId);
        if (cached && (Date.now() - cached.fetchedAt) < FORMAT_CACHE_TTL) {
            return cached.format;
        }

        // 2. Check DB (Company.settings.solumArticleFormat)
        try {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { settings: true },
            });
            const settings = (company?.settings as Record<string, any>) || {};
            if (settings.solumArticleFormat) {
                const format = settings.solumArticleFormat as ArticleFormat;
                formatCache.set(companyId, { format, fetchedAt: Date.now() });
                return format;
            }
        } catch (error) {
            console.error(`[AIMS Gateway] Failed to read article format from DB for company ${companyId}:`, error);
        }

        // 3. Fetch from AIMS live
        const token = await this.getToken(companyId);
        try {
            const format = await solumService.fetchArticleFormat(storeConfig.config, token);
            formatCache.set(companyId, { format, fetchedAt: Date.now() });
            console.log(`[AIMS Gateway] Cached article format for company ${companyId}: ${format.articleData?.length || 0} data fields`);

            // Save to DB for future use (best-effort)
            try {
                const company = await prisma.company.findUnique({
                    where: { id: companyId },
                    select: { settings: true },
                });
                const existingSettings = (company?.settings as Record<string, any>) || {};
                await prisma.company.update({
                    where: { id: companyId },
                    data: { settings: { ...existingSettings, solumArticleFormat: format } as any },
                });
                console.log(`[AIMS Gateway] Saved article format to DB for company ${companyId}`);
            } catch (dbError) {
                console.error(`[AIMS Gateway] Failed to save article format to DB:`, dbError);
            }

            return format;
        } catch (error: any) {
            // On auth error, retry once
            if (error.message?.includes('401') || error.message?.includes('403')) {
                this.invalidateToken(companyId);
                const newToken = await this.getToken(companyId);
                const format = await solumService.fetchArticleFormat(storeConfig.config, newToken);
                formatCache.set(companyId, { format, fetchedAt: Date.now() });
                return format;
            }
            throw error;
        }
    }

    /**
     * Invalidate the cached article format for a company
     */
    invalidateFormatCache(companyId: string): void {
        formatCache.delete(companyId);
    }

    /**
     * Check AIMS connectivity for a store
     * Uses getToken (with singleflight + cache) to avoid duplicate logins
     */
    async checkHealth(storeId: string): Promise<boolean> {
        try {
            const storeConfig = await this.getStoreConfig(storeId);
            if (!storeConfig) return false;
            
            // Use getToken which has singleflight dedup + token caching
            // If we can get a valid token, AIMS is reachable
            await this.getToken(storeConfig.companyId);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check AIMS connectivity for a company
     * Uses getToken (with singleflight + cache) to avoid duplicate logins
     */
    async checkCompanyHealth(companyId: string): Promise<boolean> {
        try {
            await this.getToken(companyId);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Fetch stores from AIMS using raw credentials (not yet saved to DB).
     * Used during company creation wizard to let the user pick stores.
     */
    async fetchStoresWithCredentials(credentials: AIMSCredentials, companyCode: string): Promise<AimsStore[]> {
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
    async fetchLabels(storeId: string): Promise<AimsLabel[]> {
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
    async fetchUnassignedLabels(storeId: string): Promise<AimsLabel[]> {
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
    async fetchLabelImages(storeId: string, labelCode: string): Promise<AimsLabelDetail> {
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
    async linkLabel(storeId: string, labelCode: string, articleId: string, templateName?: string): Promise<AimsApiResponse> {
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
    async unlinkLabel(storeId: string, labelCode: string): Promise<AimsApiResponse> {
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
     * Fetch label type/hardware info (dimensions, color type, etc.)
     */
    async fetchLabelTypeInfo(storeId: string, labelCode: string): Promise<AimsLabelTypeInfo> {
        const { token, config } = await this.getTokenForStore(storeId);

        try {
            return await solumService.fetchLabelTypeInfo(config, token, labelCode);
        } catch (error: any) {
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await solumService.fetchLabelTypeInfo(config, newToken, labelCode);
                }
            }
            throw error;
        }
    }

    /**
     * Push an image to a label
     */
    async pushLabelImage(storeId: string, request: AimsImagePushRequest): Promise<AimsApiResponse> {
        const { token, config } = await this.getTokenForStore(storeId);

        try {
            return await solumService.pushLabelImage(config, token, request);
        } catch (error: any) {
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await solumService.pushLabelImage(config, newToken, request);
                }
            }
            throw error;
        }
    }

    /**
     * Get dithered preview of an image
     */
    async fetchDitherPreview(storeId: string, labelCode: string, request: AimsDitherPreviewRequest): Promise<AimsApiResponse> {
        const { token, config } = await this.getTokenForStore(storeId);

        try {
            return await solumService.fetchDitherPreview(config, token, labelCode, request);
        } catch (error: any) {
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await solumService.fetchDitherPreview(config, newToken, labelCode, request);
                }
            }
            throw error;
        }
    }

    /**
     * Blink a label for identification
     */
    async blinkLabel(storeId: string, labelCode: string): Promise<AimsApiResponse> {
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
