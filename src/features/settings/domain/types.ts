/**
 * Settings Feature Domain Types
 */

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

    // CSV Configuration
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
}

export interface ExportedSettings {
    version: string;
    timestamp: string;
    data: string;  // Encrypted or plain JSON of SettingsData
    encrypted?: boolean;  // Whether the data is encrypted
}

export const MAX_LOGO_SIZE = 2 * 1024 * 1024;  // 2MB
export const ALLOWED_LOGO_FORMATS = ['image/png', 'image/jpeg'];
