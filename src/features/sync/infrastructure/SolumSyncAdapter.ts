import type { SyncAdapter, SyncState } from '../domain/types';
import type { Space, SolumConfig, SolumTokens, CSVConfig } from '../../../shared/domain/types';
import type { SolumMappingConfig } from '../../settings/domain/types';
import { logger } from '../../../shared/infrastructure/services/logger';
import * as solumService from '../../../shared/infrastructure/services/solumService';

/**
 * SoluM API Sync Adapter
 * Implements sync via SoluM ESL API with article/label management
 */
export class SolumSyncAdapter implements SyncAdapter {
    private state: SyncState = {
        status: 'idle',
        isConnected: false,
    };

    private tokens: SolumTokens | null = null;

    private config: SolumConfig;
    private mappingConfig: SolumMappingConfig | undefined;
    private csvConfig: CSVConfig;
    private onTokenUpdate: (tokens: SolumTokens) => void;

    constructor(
        config: SolumConfig,
        csvConfig: CSVConfig,
        onTokenUpdate: (tokens: SolumTokens) => void,
        initialTokens?: SolumTokens,
        mappingConfig?: SolumMappingConfig
    ) {
        this.config = config;
        this.csvConfig = csvConfig;
        this.mappingConfig = mappingConfig;
        this.onTokenUpdate = onTokenUpdate;
        this.tokens = initialTokens || null;

        // Initialize state if tokens are present
        if (this.tokens) {
            this.state = {
                status: 'connected',
                isConnected: true,
                lastSync: config.lastConnected ? new Date(config.lastConnected) : undefined
            };
        }


        logger.info('SolumSyncAdapter', 'Initialized', {
            hasConfig: !!config,
            hasCsvConfig: !!csvConfig,
            hasMappingConfig: !!mappingConfig,
            fieldCount: mappingConfig?.fields ? Object.keys(mappingConfig.fields).length : 0
        });
    }

    async connect(): Promise<void> {
        logger.info('SolumSyncAdapter', 'Connecting to SoluM API');
        this.state.status = 'connecting';

        try {
            // Login to get tokens
            this.tokens = await solumService.login(this.config);
            this.onTokenUpdate(this.tokens);

            this.state.isConnected = true;
            this.state.status = 'connected';
            logger.info('SolumSyncAdapter', 'Connected successfully');
        } catch (error) {
            this.state.status = 'error';
            this.state.isConnected = false;
            this.state.lastError = error instanceof Error ? error.message : 'Connection failed';
            logger.error('SolumSyncAdapter', 'Connection failed', { error });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        logger.info('SolumSyncAdapter', 'Disconnecting from SoluM API');
        this.tokens = null;
        this.state.isConnected = false;
        this.state.status = 'disconnected';
    }

    /**
     * Get valid access token, refreshing if necessary
     */
    private async getValidToken(): Promise<string> {
        if (!this.tokens) {
            throw new Error('Not connected - no tokens available');
        }

        // Check if token will expire in less than 5 minutes
        const expiresIn = this.tokens.expiresAt - Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (expiresIn < fiveMinutes) {
            logger.info('SolumSyncAdapter', 'Token expiring soon, refreshing');

            try {
                this.tokens = await solumService.refreshToken(this.config, this.tokens.refreshToken);
                this.onTokenUpdate(this.tokens);
                logger.info('SolumSyncAdapter', 'Token refreshed');
            } catch (error) {
                logger.warn('SolumSyncAdapter', 'Token refresh failed, re-logging in');
                // If refresh fails, try fresh login
                this.tokens = await solumService.login(this.config);
                this.onTokenUpdate(this.tokens);
            }
        }

        return this.tokens.accessToken;
    }

    /**
     * Map SoluM articles to Space entities
     */
    private mapArticlesToSpaces(articles: any[], labels: any[]): Space[] {
        const spaces: Space[] = [];
        // Use mapping config if available, fallback to CSV config (legacy behavior support if needed, or just empty)
        const fields = this.mappingConfig?.fields || {};
        const globalFieldAssignments = this.mappingConfig?.globalFieldAssignments || {};

        // Defensive check: ensure labels is an array
        const labelsArray = Array.isArray(labels) ? labels : [];

        if (!Array.isArray(labels)) {
            logger.warn('SolumSyncAdapter', 'Labels is not an array, using empty array', {
                labelsType: typeof labels,
                labelsValue: labels
            });
        }

        for (const article of articles) {
            // Skip conference rooms (articles with ID starting with 'C')
            if (article.articleId?.startsWith('C')) {
                continue;
            }

            // Find assigned label
            const label = labelsArray.find(l => l.articleId === article.articleId);

            // Apply global field assignments
            const mergedArticle = {
                ...article,
                ...globalFieldAssignments,
            };

            const articleData = article.data || article.articleData || {};
            const data: Record<string, string> = {};

            // Map fields based on configuration
            if (this.mappingConfig) {
                Object.keys(fields).forEach(fieldKey => {
                    const mapping = fields[fieldKey];
                    if (mapping.visible) {
                        // Check article.data first, then root level/merged
                        let fieldValue = articleData[fieldKey] !== undefined
                            ? articleData[fieldKey]
                            : mergedArticle[fieldKey];

                        // Fallback: Check standard mappings if value is still undefined
                        // This handles cases where the config key (e.g. 'N_ARTICLE_NAME') 
                        // maps to a root API property (e.g. 'articleName')
                        const mappingInfo = this.mappingConfig!.mappingInfo;

                        // 1. Precise check via mappingInfo
                        if (fieldValue === undefined && mappingInfo) {
                            if (fieldKey === mappingInfo.articleName) {
                                fieldValue = article.articleName;
                            } else if (fieldKey === mappingInfo.articleId) {
                                fieldValue = article.articleId;
                            } else if (fieldKey === mappingInfo.store) {
                                fieldValue = this.config.storeNumber;
                            }
                        }

                        // 2. Heuristic check REMOVED as per user request
                        // We strictly rely on explicit mapping or defaults.
                        // if (fieldValue === undefined) { ... }

                        if (fieldValue !== undefined) {
                            const valueStr = String(fieldValue);
                            data[fieldKey] = valueStr;
                        }
                    }
                });
            } else {
                logger.warn('SolumSyncAdapter', 'No mapping config, falling back to CSV config');
                // Fallback to CSV config mapping if no SolumMappingConfig provided (Legacy)
                const mapping = this.csvConfig?.mapping || {};
                for (const [fieldName] of Object.entries(mapping)) {
                    data[fieldName] = article[fieldName] || article.articleData?.[fieldName] || '';
                }
            }

            const space: Space = {
                id: article.articleId,
                data,
                labelCode: label?.labelCode,
                assignedLabels: Array.isArray(article.assignedLabel) ? article.assignedLabel : undefined,
            };

            spaces.push(space);
        }

        return spaces;
    }

    /**
     * Map Space entities to SoluM articles
     */
    private mapSpacesToArticles(spaces: Space[]): any[] {
        const mappingInfo = this.mappingConfig?.mappingInfo || {};

        return spaces.map(space => {
            // 1. Start with system fields and flattened data
            const article: any = {
                ...space.data, // Flatten ALL fields to root for maximum compatibility
                articleId: space.id,
                data: space.data,
            };

            // 2. Apply dynamic mapping from mappingInfo
            // This maps server-side keys (like 'store', 'nfcUrl', 'articleName') 
            // to values from local data keys (like 'STORE_ID', 'NFC_URL', 'ITEM_NAME')
            Object.entries(mappingInfo).forEach(([serverKey, localKey]) => {
                if (localKey && space.data[localKey as string] !== undefined) {
                    article[serverKey] = space.data[localKey as string];
                }
            });

            // 3. Ensure articleId is set (either from space.id or mapping)
            if (!article.articleId) {
                article.articleId = space.id;
            }

            // 4. Set articleData for backward compatibility with common spec
            article.articleData = space.data;

            return article;
        });
    }

    async download(): Promise<Space[]> {
        logger.info('SolumSyncAdapter', 'Downloading from SoluM API');
        this.state.status = 'syncing';
        this.state.progress = 10;

        try {
            const token = await this.getValidToken();
            this.state.progress = 20;

            // Fetch articles
            // Fetch articles with pagination
            let allArticles: any[] = [];
            let page = 0;
            const pageSize = 100;
            let hasMore = true;

            logger.info('SolumSyncAdapter', 'Starting pagination fetch', { pageSize });

            while (hasMore) {
                const articlesChunk = await solumService.fetchArticles(
                    this.config,
                    this.config.storeNumber,
                    token,
                    page,
                    pageSize
                );

                if (articlesChunk.length > 0) {
                    allArticles = [...allArticles, ...articlesChunk];

                    // If we got fewer items than page size, we've reached the end
                    if (articlesChunk.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }

            const articles = allArticles;

            // --- DEBUG LOGGING START ---
            // console.log('SolumSyncAdapter: Raw Articles Fetched', {
            //     count: articles.length,
            //     sample: articles.length > 0 ? articles[0] : 'No Articles'
            // });
            // --- DEBUG LOGGING END ---
            this.state.progress = 50;

            // Fetch labels
            const labels = await solumService.getLabels(
                this.config,
                this.config.storeNumber,
                token
            );
            this.state.progress = 70;

            // Map to spaces
            const spaces = this.mapArticlesToSpaces(articles, labels);
            this.state.progress = 90;

            logger.info('SolumSyncAdapter', 'Download complete', { count: spaces.length });

            this.state.status = 'success';
            this.state.lastSync = new Date();
            this.state.progress = 100;

            return spaces;
        } catch (error) {
            this.state.status = 'error';
            this.state.lastError = error instanceof Error ? error.message : 'Download failed';
            this.state.progress = 0;
            logger.error('SolumSyncAdapter', 'Download failed', { error });
            throw error;
        }
    }

    async upload(spaces: Space[]): Promise<void> {
        logger.info('SolumSyncAdapter', 'Uploading to SoluM API', { count: spaces.length });
        this.state.status = 'syncing';
        this.state.progress = 10;

        try {
            const token = await this.getValidToken();
            this.state.progress = 20;

            // Map to articles
            const articles = this.mapSpacesToArticles(spaces);
            this.state.progress = 40;

            // Push articles
            await solumService.putArticles(
                this.config,
                this.config.storeNumber,
                token,
                articles
            );
            this.state.progress = 70;

            // Update label assignments for changed spaces
            for (const space of spaces) {
                if (space.labelCode) {
                    await solumService.assignLabel(
                        this.config,
                        this.config.storeNumber,
                        token,
                        space.labelCode,
                        space.id,
                        space.templateName
                    );
                }
            }
            this.state.progress = 90;

            logger.info('SolumSyncAdapter', 'Upload complete');

            this.state.status = 'success';
            this.state.lastSync = new Date();
            this.state.progress = 100;
        } catch (error) {
            this.state.status = 'error';
            this.state.lastError = error instanceof Error ? error.message : 'Upload failed';
            this.state.progress = 0;
            logger.error('SolumSyncAdapter', 'Upload failed', { error });
            throw error;
        }
    }

    /**
     * Safe Upload implementation: Fetch -> Merge -> Push
     * Prevents data corruption by fetching current state, merging updates, and pushing full object.
     */
    async safeUpload(spaces: Space[]): Promise<void> {
        logger.info('SolumSyncAdapter', 'Safe Uploading to SoluM API', { count: spaces.length });
        this.state.status = 'syncing';
        this.state.progress = 10;

        try {
            const token = await this.getValidToken();
            this.state.progress = 15;

            // 1. Fetch ALL current articles (SoluM doesn't support batch fetch by ID)
            // This is heavy but necessary for safety.
            // 1. Fetch ALL current articles (SoluM doesn't support batch fetch by ID)
            // This is heavy but necessary for safety.
            let remoteArticles: any[] = [];
            let page = 0;
            const pageSize = 100;
            let hasMore = true;

            logger.info('SolumSyncAdapter', 'Starting pagination fetch for safe upload', { pageSize });

            while (hasMore) {
                const articlesChunk = await solumService.fetchArticles(
                    this.config,
                    this.config.storeNumber,
                    token,
                    page,
                    pageSize
                );

                if (articlesChunk.length > 0) {
                    remoteArticles = [...remoteArticles, ...articlesChunk];

                    if (articlesChunk.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }
            this.state.progress = 40;

            // 2. Map local spaces to partial articles (contains only mapped fields)
            const partialArticles = this.mapSpacesToArticles(spaces);

            // 3. Merge Strategy
            const mergedArticles = partialArticles.map(partial => {
                const remote = remoteArticles.find((a: any) => a.articleId === partial.articleId);

                if (remote) {
                    // Update: Merge partial update ON TOP OF remote existing data
                    // We must be careful to merge nested objects like 'articleData' if they exist in both.
                    // Also, we update any root fields that exist in space.data for safety.
                    const remoteData = remote.articleData || remote.data || {};
                    const localData = partial.data || partial.articleData || {};

                    const updatedData = {
                        ...remoteData,
                        ...localData
                    };

                    return {
                        ...remote,        // Start with existing remote fields
                        ...updatedData,   // Set all merged data at root level
                        ...partial,       // Ensure local system fields (articleId, name) override
                        data: updatedData,        // Send as 'data' (AIMS SaaS spec)
                        articleData: updatedData  // Send as 'articleData' (Common SoluM spec)
                    };
                } else {
                    // Create: No remote exists, use partial (already flattened by mapSpacesToArticles)
                    const localData = partial.data || partial.articleData || {};
                    return {
                        ...partial,
                        data: localData,
                        articleData: localData
                    };
                }
            });

            this.state.progress = 50;

            // 4. Push Updated Articles
            await solumService.putArticles(
                this.config,
                this.config.storeNumber,
                token,
                mergedArticles
            );
            this.state.progress = 80;

            // 5. Update label assignments
            for (const space of spaces) {
                if (space.labelCode) {
                    await solumService.assignLabel(
                        this.config,
                        this.config.storeNumber,
                        token,
                        space.labelCode,
                        space.id,
                        space.templateName
                    );
                }
            }

            logger.info('SolumSyncAdapter', 'Safe Upload complete', { mergedCount: mergedArticles.length });

            this.state.status = 'success';
            this.state.lastSync = new Date();
            this.state.progress = 100;

        } catch (error) {
            this.state.status = 'error';
            this.state.lastError = error instanceof Error ? error.message : 'Safe Upload failed';
            this.state.progress = 0;
            logger.error('SolumSyncAdapter', 'Safe Upload failed', { error });
            throw error;
        }
    }

    async sync(): Promise<void> {
        logger.info('SolumSyncAdapter', 'Starting sync');

        // SoluM: Download latest data
        await this.download();
    }

    getStatus(): SyncState {
        return { ...this.state };
    }
}
