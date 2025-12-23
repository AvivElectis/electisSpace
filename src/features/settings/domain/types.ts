/**
 * Settings Feature Domain Types
 */

import type { ArticleFormat, CSVColumn, FieldMapping } from '@features/configuration/domain/types';

export interface LogoConfig {
    logo1?: string;  // Base64 encoded image
    logo2?: string;  // Base64 encoded image
}

export interface SettingsData {
    // App configuration
    appName: string;
    appSubtitle: string;
    spaceType: 'office' | 'room' | 'chair' | 'person-tag';

    // Working mode
    workingMode: import('@shared/domain/types').WorkingMode;

    // MODE SEPARATION: Each mode has its own configuration
    // SFTP Mode: CSV structure configuration
    sftpCsvConfig?: {
        delimiter: string;
        columns: CSVColumn[];
        mapping: FieldMapping;
        conferenceEnabled: boolean;
    };

    // SoluM Mode: Article format schema
    solumArticleFormat?: ArticleFormat;

    // Legacy CSV Config (deprecated, keeping for migration)
    csvConfig: import('@shared/domain/types').CSVConfig;

    // SFTP Configuration (encrypted)
    sftpCredentials?: import('@shared/domain/types').SFTPCredentials;

    // SoluM Configuration (encrypted)
    solumConfig?: import('@shared/domain/types').SolumConfig;

    // Logo configuration
    logos: LogoConfig;

    // Auto-sync settings
    autoSyncEnabled: boolean;
    autoSyncInterval: number;  // in seconds

    // Auto-update settings
    autoUpdateEnabled?: boolean;
    updateCheckInterval?: number;  // in hours
}

export interface ExportedSettings {
    version: string;
    timestamp: string;
    data: string;  // Encrypted or plain JSON of SettingsData
    encrypted?: boolean;  // Whether the data is encrypted
}

export const MAX_LOGO_SIZE = 2 * 1024 * 1024;  // 2MB
export const ALLOWED_LOGO_FORMATS = ['image/png', 'image/jpeg'];
