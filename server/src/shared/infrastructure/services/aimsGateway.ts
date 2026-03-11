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
import type { AimsArticle, AimsArticleInfo, AimsLabel, AimsLabelDetail, AimsStore, AimsApiResponse, AimsLabelTypeInfo, AimsImagePushRequest, AimsDitherPreviewRequest } from './aims.types.js';
import { decrypt } from '../../utils/encryption.js';
import { appLogger } from './appLogger.js';

export class AimsOperationError extends Error {
    public responseCode: string;
    public responseMessage: string;
    public statusCode: number;

    constructor(message: string, responseCode: string, responseMessage: string, statusCode: number = 502) {
        super(message);
        this.name = 'AimsOperationError';
        this.responseCode = responseCode;
        this.responseMessage = responseMessage;
        this.statusCode = statusCode;
    }
}

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
                appLogger.warn('AimsGateway', `login failed (attempt ${attempt + 1}/${LOGIN_MAX_RETRIES + 1}), retrying in ${Math.round(delay)}ms: ${msg}`);
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
            appLogger.error('AimsGateway', `Failed to decrypt password for company ${companyId}`, { error });
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
            appLogger.error('AimsGateway', `Failed to decrypt password for store ${storeId}`, { error });
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
        const PAGE_SIZE = 100;
        const MAX_PAGES = 50; // Safety limit to prevent infinite loops

        const fetchAllPages = async (config: SolumConfig, token: string): Promise<AimsArticle[]> => {
            const allArticles: AimsArticle[] = [];
            let page = 0;

            while (page < MAX_PAGES) {
                const articles = await solumService.fetchArticles(config, token, page, PAGE_SIZE);
                if (!articles || articles.length === 0) break;
                allArticles.push(...articles);
                if (articles.length < PAGE_SIZE) break; // Last page
                page++;
            }

            appLogger.info('AimsGateway', `Pulled ${allArticles.length} articles from AIMS for store ${storeId} (${page + 1} pages)`);
            return allArticles;
        };

        const { token, config } = await this.getTokenForStore(storeId);

        try {
            return await fetchAllPages(config, token);
        } catch (error: any) {
            // If authentication error, invalidate cache and retry full pagination
            const msg = error.message || '';
            const status = error.response?.status;
            if (status === 401 || status === 403 || msg.includes('401') || msg.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await fetchAllPages(config, newToken);
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
            appLogger.info('AimsGateway', `Pushing ${articles.length} articles in ${batches.length} batches of up to ${AIMS_BATCH_SIZE}`);
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
     * Pull article info from AIMS for a store (includes assignedLabel data)
     * Uses the /config/article/info endpoint which returns assignedLabel arrays
     */
    async pullArticleInfo(storeId: string): Promise<AimsArticleInfo[]> {
        const { token, config } = await this.getTokenForStore(storeId);

        try {
            return await solumService.fetchAllArticleInfo(config, token);
        } catch (error: any) {
            // If authentication error, invalidate cache and retry once
            const msg = error.message || '';
            const status = error.response?.status;
            if (status === 401 || status === 403 || msg.includes('401') || msg.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await solumService.fetchAllArticleInfo(config, newToken);
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
            appLogger.error('AimsGateway', `Failed to read article format from DB for company ${companyId}`, { error });
        }

        // 3. Fetch from AIMS live
        const token = await this.getToken(companyId);
        try {
            const format = await solumService.fetchArticleFormat(storeConfig.config, token);
            formatCache.set(companyId, { format, fetchedAt: Date.now() });
            appLogger.info('AimsGateway', `Cached article format for company ${companyId}: ${format.articleData?.length || 0} data fields`);

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
                appLogger.info('AimsGateway', `Saved article format to DB for company ${companyId}`);
            } catch (dbError) {
                appLogger.error('AimsGateway', 'Failed to save article format to DB', { error: dbError });
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

    /**
     * Fetch article format from AIMS using raw credentials (not yet saved to DB).
     * Used during company creation wizard to show article fields.
     */
    async fetchArticleFormatWithCredentials(credentials: AIMSCredentials, companyCode: string): Promise<ArticleFormat> {
        const config: SolumConfig = {
            baseUrl: credentials.baseUrl,
            companyName: companyCode,
            cluster: credentials.cluster,
            username: credentials.username,
            password: credentials.password,
        };

        // Login to get token
        const tokens = await solumService.login(config);

        // Fetch article format
        return await solumService.fetchArticleFormat(config, tokens.accessToken);
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
     * Handles AIMS response body errors, auto-whitelist on whitelist-related errors,
     * and token refresh on 401/403.
     */
    async linkLabel(storeId: string, labelCode: string, articleId: string, templateName?: string): Promise<AimsApiResponse> {
        const { token, config } = await this.getTokenForStore(storeId);

        const attemptLink = async (currentToken: string): Promise<AimsApiResponse> => {
            try {
                const result = await solumService.linkLabel(config, currentToken, labelCode, articleId, templateName);

                // Check AIMS response body for non-success responseCode
                const responseCode = result?.responseCode || '';
                const responseMessage = typeof result?.responseMessage === 'string' ? result.responseMessage : '';

                if (responseCode && responseCode !== '0000' && responseCode.toUpperCase() !== 'SUCCESS') {
                    const combinedMsg = `${responseCode}: ${responseMessage}`;

                    // Auto-whitelist on whitelist-related errors
                    if (responseMessage.toLowerCase().includes('whitelist') || responseCode.toLowerCase().includes('whitelist')) {
                        appLogger.warn('AimsGateway', `Link label failed due to whitelist issue, attempting auto-whitelist for ${labelCode}`, { responseCode, responseMessage });
                        try {
                            await solumService.whitelistLabel(config, currentToken, labelCode);
                            appLogger.info('AimsGateway', `Auto-whitelist succeeded for ${labelCode}, retrying link`);
                            // Retry link after whitelist
                            const retryResult = await solumService.linkLabel(config, currentToken, labelCode, articleId, templateName);
                            const retryCode = retryResult?.responseCode || '';
                            const retryMsg = typeof retryResult?.responseMessage === 'string' ? retryResult.responseMessage : '';
                            if (retryCode && retryCode !== '0000' && retryCode.toUpperCase() !== 'SUCCESS') {
                                throw new AimsOperationError(
                                    `Link label failed after whitelist: ${retryCode}: ${retryMsg}`,
                                    retryCode,
                                    retryMsg,
                                    502
                                );
                            }
                            return retryResult;
                        } catch (whitelistError: any) {
                            if (whitelistError instanceof AimsOperationError) throw whitelistError;
                            appLogger.error('AimsGateway', `Auto-whitelist failed for ${labelCode}`, { error: whitelistError.message });
                            throw new AimsOperationError(
                                `Label not whitelisted. Auto-whitelist failed: ${whitelistError.message}`,
                                responseCode,
                                responseMessage,
                                502
                            );
                        }
                    }

                    // Map other common AIMS errors
                    appLogger.error('AimsGateway', `Link label AIMS error: ${combinedMsg}`, { labelCode, articleId, responseCode, responseMessage });
                    throw new AimsOperationError(
                        `AIMS link label failed: ${combinedMsg}`,
                        responseCode,
                        responseMessage,
                        502
                    );
                }

                return result;
            } catch (error: any) {
                // Re-throw AimsOperationError as-is
                if (error instanceof AimsOperationError) throw error;

                const msg = error.message || '';
                const status = error.response?.status;

                // Check if the error message or HTTP status indicates whitelist issue
                if (msg.toLowerCase().includes('whitelist')) {
                    appLogger.warn('AimsGateway', `Link label error contains whitelist reference, attempting auto-whitelist for ${labelCode}`, { error: msg });
                    try {
                        await solumService.whitelistLabel(config, currentToken, labelCode);
                        appLogger.info('AimsGateway', `Auto-whitelist succeeded for ${labelCode}, retrying link`);
                        return await solumService.linkLabel(config, currentToken, labelCode, articleId, templateName);
                    } catch (whitelistError: any) {
                        if (whitelistError instanceof AimsOperationError) throw whitelistError;
                        throw new AimsOperationError(
                            `Label not whitelisted. Auto-whitelist failed: ${whitelistError.message}`,
                            'WHITELIST_ERROR',
                            whitelistError.message,
                            502
                        );
                    }
                }

                // Token refresh on 401/403
                if (status === 401 || status === 403 || msg.includes('401') || msg.includes('403')) {
                    const storeConfig = await this.getStoreConfig(storeId);
                    if (storeConfig) {
                        this.invalidateToken(storeConfig.companyId);
                        const newToken = await this.getToken(storeConfig.companyId);
                        return await solumService.linkLabel(config, newToken, labelCode, articleId, templateName);
                    }
                }

                // Wrap unexpected errors with context
                appLogger.error('AimsGateway', `Link label unexpected error for ${labelCode} -> ${articleId}`, { error: msg, status });
                throw new AimsOperationError(
                    msg || 'AIMS service error',
                    'UNKNOWN',
                    msg,
                    status && status >= 400 && status < 600 ? status : 502
                );
            }
        };

        return attemptLink(token);
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
    async fetchDitherPreview(storeId: string, labelCode: string, request: AimsDitherPreviewRequest): Promise<any> {
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
    // ─── Gateway Management ────────────────────────────────────────────────

    private async withTokenRetry<T>(storeId: string, fn: (token: string, config: SolumConfig) => Promise<T>): Promise<T> {
        const { token, config } = await this.getTokenForStore(storeId);
        try {
            return await fn(token, config);
        } catch (error: any) {
            if (error.message?.includes('401') || error.message?.includes('403')) {
                const storeConfig = await this.getStoreConfig(storeId);
                if (storeConfig) {
                    this.invalidateToken(storeConfig.companyId);
                    const newToken = await this.getToken(storeConfig.companyId);
                    return await fn(newToken, config);
                }
            }
            throw error;
        }
    }

    async fetchGateways(storeId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchGateways(config, token));
    }

    async fetchGatewayDetail(storeId: string, gatewayMac: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchGatewayDetail(config, token, gatewayMac));
    }

    async fetchFloatingGateways(storeId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchFloatingGateways(config, token));
    }

    async registerGateway(storeId: string, gatewayMac: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.registerGateway(config, token, gatewayMac));
    }

    async deregisterGateways(storeId: string, gatewayMacs: string[]) {
        return this.withTokenRetry(storeId, (token, config) => solumService.deregisterGateways(config, token, gatewayMacs));
    }

    async rebootGateway(storeId: string, gatewayMac: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.rebootGateway(config, token, gatewayMac));
    }

    async updateGatewayConfig(storeId: string, gatewayMac: string, configData: Record<string, any>) {
        return this.withTokenRetry(storeId, (token, config) => solumService.updateGatewayConfig(config, token, gatewayMac, configData));
    }

    async fetchGatewayOpcodes(storeId: string, gatewayMac: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchGatewayOpcodes(config, token, gatewayMac));
    }

    async fetchGatewayStatus(storeId: string, gatewayMac: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchGatewayStatus(config, token, gatewayMac));
    }

    async fetchGatewayDebugReport(storeId: string, gatewayMac: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchGatewayDebugReport(config, token, gatewayMac));
    }

    async fetchLabelStatusHistory(storeId: string, labelCode: string, page = 0, size = 50) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchLabelStatusHistory(config, token, labelCode, page, size));
    }

    // ─── Label Action Operations ────────────────────────────────────────────

    async setLabelLed(storeId: string, labelCode: string, led: { color?: string; mode?: string }) {
        return this.withTokenRetry(storeId, (token, config) => solumService.setLabelLed(config, token, labelCode, led));
    }

    async setLabelNfc(storeId: string, labelCode: string, nfcUrl: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.setLabelNfc(config, token, labelCode, nfcUrl));
    }

    async forceLabelAlive(storeId: string, labelCode: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.forceLabelAlive(config, token, labelCode));
    }

    async fetchLabelArticle(storeId: string, labelCode: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchLabelArticle(config, token, labelCode));
    }

    async fetchLabelAliveHistory(storeId: string, labelCode: string, page = 0, size = 50) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchLabelAliveHistory(config, token, labelCode, page, size));
    }

    async fetchLabelHistory(storeId: string, labelCode: string, page = 0, size = 50) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchLabelHistory(config, token, labelCode, page, size));
    }

    async fetchBatchHistory(storeId: string, params?: { page?: number; size?: number; fromDate?: string; toDate?: string }) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchBatchHistory(config, token, params));
    }

    async fetchBatchDetail(storeId: string, batchName: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchBatchDetail(config, token, batchName));
    }

    async fetchBatchErrors(storeId: string, batchId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchBatchErrors(config, token, batchId));
    }

    async fetchArticleUpdateHistory(storeId: string, articleId: string, page = 0, size = 50) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchArticleUpdateHistory(config, token, articleId, page, size));
    }

    // ─── Article Browsing ──────────────────────────────────────────────────

    async fetchArticleList(storeId: string, params?: { page?: number; size?: number; sort?: string }) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchArticleList(config, token, params));
    }

    async fetchArticleById(storeId: string, articleId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchArticleById(config, token, articleId));
    }

    async fetchLinkedArticles(storeId: string, params?: { page?: number; size?: number }) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchLinkedArticles(config, token, params));
    }

    async fetchArticleUpdateHistoryAll(storeId: string, params?: { page?: number; size?: number }) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchArticleUpdateHistoryAll(config, token, params));
    }

    async fetchArticleUpdateHistoryDetail(storeId: string, articleId: string, params?: { page?: number; size?: number }) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchArticleUpdateHistoryDetail(config, token, articleId, params));
    }

    // ─── Templates ──────────────────────────────────────────────────────

    async fetchTemplates(storeId: string, params?: { page?: number; size?: number }) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchTemplates(config, token, params));
    }

    async fetchTemplateByName(storeId: string, templateName: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchTemplateByName(config, token, templateName));
    }

    async fetchTemplateTypes(storeId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchTemplateTypes(config, token));
    }

    async fetchTemplateMappingConditions(storeId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchTemplateMappingConditions(config, token));
    }

    async fetchTemplateGroups(storeId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchTemplateGroups(config, token));
    }

    async downloadTemplate(storeId: string, templateName: string, version: number, fileType: 'XSL' | 'JSON') {
        return this.withTokenRetry(storeId, (token, config) => solumService.downloadTemplate(config, token, templateName, version, fileType));
    }

    async uploadTemplate(storeId: string, templateData: Record<string, any>) {
        return this.withTokenRetry(storeId, (token, config) => solumService.uploadTemplate(config, token, templateData));
    }

    // ─── Summary / Overview ────────────────────────────────────────────────

    async fetchStoreSummary(storeId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchStoreSummary(config, token));
    }

    async fetchLabelStatusSummary(storeId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchLabelStatusSummary(config, token));
    }

    async fetchGatewayStatusSummary(storeId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchGatewayStatusSummary(config, token));
    }

    async fetchLabelModels(storeId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchLabelModels(config, token));
    }

    // ─── Whitelist ──────────────────────────────────────────────────────

    async fetchWhitelist(storeId: string, params?: { page?: number; size?: number; labelCode?: string; labelModel?: string; sort?: string }) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchWhitelist(config, token, params));
    }

    async addToWhitelist(storeId: string, labelCodes: string[]) {
        return this.withTokenRetry(storeId, (token, config) => solumService.addToWhitelist(config, token, labelCodes));
    }

    async removeFromWhitelist(storeId: string, labelCodes: string[]) {
        return this.withTokenRetry(storeId, (token, config) => solumService.removeFromWhitelist(config, token, labelCodes));
    }

    async whitelistBox(storeId: string, boxId: string) {
        return this.withTokenRetry(storeId, (token, config) => solumService.whitelistBox(config, token, boxId));
    }

    async syncWhitelistToStorage(storeId: string, fullUpdate?: boolean) {
        return this.withTokenRetry(storeId, (token, config) => solumService.syncWhitelistToStorage(config, token, fullUpdate));
    }

    async syncWhitelistToGateways(storeId: string, params?: { store?: string; partialDelete?: boolean }) {
        return this.withTokenRetry(storeId, (token, config) => solumService.syncWhitelistToGateways(config, token, params));
    }

    async fetchUnassignedWhitelist(storeId: string, params?: { page?: number; size?: number; labelCode?: string; labelModel?: string; sort?: string }) {
        return this.withTokenRetry(storeId, (token, config) => solumService.fetchUnassignedWhitelist(config, token, params));
    }

    // ─── Conference Page Flip ──────────────────────────────────────────────

    async changeLabelPage(storeId: string, labelCodes: string[], page: number) {
        return this.withTokenRetry(storeId, (token, config) => solumService.changeLabelPage(config, token, labelCodes, page));
    }
}

// Singleton instance
export const aimsGateway = new AIMSGateway();
