import type { SyncAdapter, SyncState } from '../domain/types';
import type { Space, SFTPCredentials, CSVConfig } from '@shared/domain/types';
import { logger } from '@shared/infrastructure/services/logger';
import * as sftpService from '@shared/infrastructure/services/sftpService';
import * as csvService from '@shared/infrastructure/services/csvService';

/**
 * SFTP Sync Adapter
 * Implements sync via SFTP server with CSV file exchange
 */
export class SFTPSyncAdapter implements SyncAdapter {
    private state: SyncState = {
        status: 'idle',
        isConnected: false,
    };

    private credentials: SFTPCredentials;
    private csvConfig: CSVConfig;

    constructor(credentials: SFTPCredentials, csvConfig: CSVConfig) {
        this.credentials = credentials;
        this.csvConfig = csvConfig;
    }

    async connect(): Promise<void> {
        logger.info('SFTPSyncAdapter', 'Connecting to SFTP server');
        this.state.status = 'connecting';

        try {
            const isConnected = await sftpService.testConnection(this.credentials);

            if (!isConnected) {
                throw new Error('SFTP connection failed');
            }

            this.state.isConnected = true;
            this.state.status = 'connected';
            logger.info('SFTPSyncAdapter', 'Connected successfully');
        } catch (error) {
            this.state.status = 'error';
            this.state.isConnected = false;
            this.state.lastError = error instanceof Error ? error.message : 'Connection failed';
            logger.error('SFTPSyncAdapter', 'Connection failed', { error });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        logger.info('SFTPSyncAdapter', 'Disconnecting from SFTP server');
        this.state.isConnected = false;
        this.state.status = 'disconnected';
    }

    async download(): Promise<Space[]> {
        logger.info('SFTPSyncAdapter', 'Downloading from SFTP');
        this.state.status = 'syncing';
        this.state.progress = 10;

        try {
            // Download CSV file
            const csvContent = await sftpService.downloadFile(
                this.credentials,
                this.credentials.remoteFilename
            );
            this.state.progress = 50;

            // Parse CSV
            const appData = csvService.parseCSV(csvContent, this.csvConfig);
            this.state.progress = 90;

            logger.info('SFTPSyncAdapter', 'Download complete', {
                count: appData.spaces.length
            });

            this.state.status = 'success';
            this.state.lastSync = new Date();
            this.state.progress = 100;

            return appData.spaces;
        } catch (error) {
            this.state.status = 'error';
            this.state.lastError = error instanceof Error ? error.message : 'Download failed';
            this.state.progress = 0;
            logger.error('SFTPSyncAdapter', 'Download failed', { error });
            throw error;
        }
    }

    async upload(spaces: Space[]): Promise<void> {
        logger.info('SFTPSyncAdapter', 'Uploading to SFTP', { count: spaces.length });
        this.state.status = 'syncing';
        this.state.progress = 10;

        try {
            // Generate CSV
            const csvContent = csvService.generateCSV(
                { spaces, conferenceRooms: [], store: '' },
                this.csvConfig
            );
            this.state.progress = 50;

            // Upload to SFTP
            await sftpService.uploadFile(
                this.credentials,
                this.credentials.remoteFilename,
                csvContent
            );
            this.state.progress = 90;

            logger.info('SFTPSyncAdapter', 'Upload complete');

            this.state.status = 'success';
            this.state.lastSync = new Date();
            this.state.progress = 100;
        } catch (error) {
            this.state.status = 'error';
            this.state.lastError = error instanceof Error ? error.message : 'Upload failed';
            this.state.progress = 0;
            logger.error('SFTPSyncAdapter', 'Upload failed', { error });
            throw error;
        }
    }

    async sync(): Promise<void> {
        logger.info('SFTPSyncAdapter', 'Starting sync');

        // SFTP uses full replace strategy - just download
        await this.download();
    }

    getStatus(): SyncState {
        return { ...this.state };
    }
}
