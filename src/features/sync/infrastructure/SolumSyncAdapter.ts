import type { SyncAdapter, SyncState } from '../domain/types';
import type { Space, SolumConfig, SolumTokens, CSVConfig } from '@shared/domain/types';
import { logger } from '@shared/infrastructure/services/logger';
import * as solumService from '@shared/infrastructure/services/solumService';

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
    private csvConfig: CSVConfig;
    private onTokenUpdate: (tokens: SolumTokens) => void;

    constructor(
        config: SolumConfig,
        csvConfig: CSVConfig,
        onTokenUpdate: (tokens: SolumTokens) => void,
        initialTokens?: SolumTokens
    ) {
        this.config = config;
        this.csvConfig = csvConfig;
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

        for (const article of articles) {
            // Skip conference rooms (articles with ID starting with 'C')
            if (article.articleId?.startsWith('C')) {
                continue;
            }

            // Find assigned label
            const label = labels.find(l => l.articleId === article.articleId);

            // Build dynamic data from article fields based on CSV mapping
            const data: Record<string, string> = {};
            const mapping = this.csvConfig?.mapping || {};
            for (const [fieldName] of Object.entries(mapping)) {
                data[fieldName] = article[fieldName] || article.articleData?.[fieldName] || '';
            }

            const space: Space = {
                id: article.articleId,
                roomName: article.articleName || data['roomName'] || '',
                data,
                labelCode: label?.labelCode,
                templateName: article.templateName,
            };

            spaces.push(space);
        }

        return spaces;
    }

    /**
     * Map Space entities to SoluM articles
     */
    private mapSpacesToArticles(spaces: Space[]): any[] {
        return spaces.map(space => ({
            articleId: space.id,
            articleName: space.roomName,
            templateName: space.templateName,
            articleData: space.data,
        }));
    }

    async download(): Promise<Space[]> {
        logger.info('SolumSyncAdapter', 'Downloading from SoluM API');
        this.state.status = 'syncing';
        this.state.progress = 10;

        try {
            const token = await this.getValidToken();
            this.state.progress = 20;

            // Fetch articles
            const articles = await solumService.fetchArticles(
                this.config,
                this.config.storeNumber,
                token
            );
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
            await solumService.pushArticles(
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

    async sync(): Promise<void> {
        logger.info('SolumSyncAdapter', 'Starting sync');

        // SoluM: Download latest data
        await this.download();
    }

    getStatus(): SyncState {
        return { ...this.state };
    }
}
