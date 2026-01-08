import type { SyncAdapter, SyncState } from '../domain/types';
import type { Space, ConferenceRoom, SFTPCredentials } from '@shared/domain/types';
import { logger } from '@shared/infrastructure/services/logger';
import * as sftpApiClient from '@shared/infrastructure/services/sftpApiClient';
import { 
    parseCSVEnhanced, 
    generateCSVEnhanced, 
    type EnhancedCSVConfig,
    createDefaultEnhancedCSVConfig 
} from '@shared/infrastructure/services/csvService';

/**
 * Retry configuration for SFTP operations
 */
interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
};

/**
 * SFTP Sync Adapter
 * Implements sync via SFTP server with CSV file exchange
 * Uses encrypted credentials and exponential backoff retry
 */
export class SFTPSyncAdapter implements SyncAdapter {
    private state: SyncState = {
        status: 'idle',
        isConnected: false,
    };

    private credentials: SFTPCredentials;
    private csvConfig: EnhancedCSVConfig;
    private retryConfig: RetryConfig;
    private progressCallback?: (progress: number) => void;

    constructor(
        credentials: SFTPCredentials, 
        csvConfig?: EnhancedCSVConfig,
        retryConfig?: Partial<RetryConfig>
    ) {
        this.credentials = credentials;
        this.csvConfig = csvConfig || createDefaultEnhancedCSVConfig();
        this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    }

    /**
     * Set progress callback for real-time progress updates
     */
    setProgressCallback(callback: (progress: number) => void): void {
        this.progressCallback = callback;
    }

    /**
     * Update progress and notify callback
     */
    private updateProgress(progress: number): void {
        this.state.progress = progress;
        if (this.progressCallback) {
            this.progressCallback(progress);
        }
    }

    /**
     * Execute operation with exponential backoff retry
     */
    private async withRetry<T>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                logger.debug('SFTPSyncAdapter', `${operationName}: attempt ${attempt}/${this.retryConfig.maxRetries}`);
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                if (attempt < this.retryConfig.maxRetries) {
                    // Calculate delay with exponential backoff and jitter
                    const delay = Math.min(
                        this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500,
                        this.retryConfig.maxDelayMs
                    );
                    
                    logger.warn('SFTPSyncAdapter', `${operationName} failed, retrying in ${delay}ms`, {
                        attempt,
                        error: lastError.message,
                    });

                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        logger.error('SFTPSyncAdapter', `${operationName} failed after ${this.retryConfig.maxRetries} attempts`, {
            error: lastError?.message,
        });
        
        throw lastError;
    }

    async connect(): Promise<void> {
        logger.info('SFTPSyncAdapter', 'Connecting to SFTP server');
        this.state.status = 'connecting';
        this.updateProgress(0);

        try {
            const success = await this.withRetry(
                () => sftpApiClient.testConnection(this.credentials),
                'connect'
            );

            if (!success) {
                throw new Error('SFTP connection failed');
            }

            this.state.isConnected = true;
            this.state.status = 'connected';
            this.updateProgress(100);
            logger.info('SFTPSyncAdapter', 'Connected successfully');
        } catch (error) {
            this.state.status = 'error';
            this.state.isConnected = false;
            this.state.lastError = error instanceof Error ? error.message : 'Connection failed';
            this.updateProgress(0);
            logger.error('SFTPSyncAdapter', 'Connection failed', { error: this.state.lastError });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        logger.info('SFTPSyncAdapter', 'Disconnecting from SFTP server');
        this.state.isConnected = false;
        this.state.status = 'disconnected';
        this.updateProgress(0);
    }

    async download(): Promise<Space[]> {
        logger.info('SFTPSyncAdapter', 'Downloading from SFTP');
        this.state.status = 'syncing';
        this.updateProgress(10);

        try {
            // Download CSV file with retry
            const content = await this.withRetry(
                () => sftpApiClient.downloadFile(this.credentials),
                'download'
            );

            if (!content) {
                throw new Error('Download returned no content');
            }

            this.updateProgress(50);

            // Parse CSV using enhanced parser
            const parsed = parseCSVEnhanced(content, this.csvConfig);
            this.updateProgress(90);

            logger.info('SFTPSyncAdapter', 'Download complete', {
                spacesCount: parsed.spaces.length,
                conferenceCount: parsed.conferenceRooms.length,
            });

            this.state.status = 'success';
            this.state.lastSync = new Date();
            this.updateProgress(100);

            return parsed.spaces;
        } catch (error) {
            this.state.status = 'error';
            this.state.lastError = error instanceof Error ? error.message : 'Download failed';
            this.updateProgress(0);
            logger.error('SFTPSyncAdapter', 'Download failed', { error: this.state.lastError });
            throw error;
        }
    }

    /**
     * Download including conference rooms
     */
    async downloadWithConference(): Promise<{ spaces: Space[]; conferenceRooms: ConferenceRoom[] }> {
        logger.info('SFTPSyncAdapter', 'Downloading from SFTP (with conference)');
        this.state.status = 'syncing';
        this.updateProgress(10);

        try {
            const content = await this.withRetry(
                () => sftpApiClient.downloadFile(this.credentials),
                'downloadWithConference'
            );

            if (!content) {
                throw new Error('Download returned no content');
            }

            this.updateProgress(50);

            const parsed = parseCSVEnhanced(content, this.csvConfig);
            this.updateProgress(90);

            logger.info('SFTPSyncAdapter', 'Download complete (with conference)', {
                spacesCount: parsed.spaces.length,
                conferenceCount: parsed.conferenceRooms.length,
            });

            this.state.status = 'success';
            this.state.lastSync = new Date();
            this.updateProgress(100);

            return parsed;
        } catch (error) {
            this.state.status = 'error';
            this.state.lastError = error instanceof Error ? error.message : 'Download failed';
            this.updateProgress(0);
            logger.error('SFTPSyncAdapter', 'Download failed', { error: this.state.lastError });
            throw error;
        }
    }

    async upload(spaces: Space[], conferenceRooms: ConferenceRoom[] = []): Promise<void> {
        logger.info('SFTPSyncAdapter', 'Uploading to SFTP', { 
            spacesCount: spaces.length,
            conferenceCount: conferenceRooms.length,
        });
        this.state.status = 'syncing';
        this.updateProgress(10);

        try {
            // Generate CSV using enhanced generator
            const csvContent = generateCSVEnhanced(
                spaces,
                conferenceRooms,
                this.csvConfig
            );
            this.updateProgress(30);

            // Upload to SFTP with retry
            await this.withRetry(
                () => sftpApiClient.uploadFile(this.credentials, csvContent),
                'upload'
            );

            this.updateProgress(90);

            logger.info('SFTPSyncAdapter', 'Upload complete');

            this.state.status = 'success';
            this.state.lastSync = new Date();
            this.updateProgress(100);
        } catch (error) {
            this.state.status = 'error';
            this.state.lastError = error instanceof Error ? error.message : 'Upload failed';
            this.updateProgress(0);
            logger.error('SFTPSyncAdapter', 'Upload failed', { error: this.state.lastError });
            throw error;
        }
    }

    async safeUpload(spaces: Space[]): Promise<void> {
        // For CSV/SFTP, "Safe Upload" is effectively the same as upload (overwrite)
        return this.upload(spaces);
    }

    async sync(): Promise<void> {
        logger.info('SFTPSyncAdapter', 'Starting sync');

        // SFTP uses full replace strategy - just download
        await this.download();
    }

    getStatus(): SyncState {
        return { ...this.state };
    }

    /**
     * Update CSV configuration
     */
    updateCSVConfig(config: EnhancedCSVConfig): void {
        this.csvConfig = config;
        logger.debug('SFTPSyncAdapter', 'CSV config updated');
    }

    /**
     * Update credentials
     */
    updateCredentials(credentials: SFTPCredentials): void {
        this.credentials = credentials;
        logger.debug('SFTPSyncAdapter', 'Credentials updated');
    }

    /**
     * Check if adapter is connected
     */
    isConnected(): boolean {
        return this.state.isConnected;
    }
}
