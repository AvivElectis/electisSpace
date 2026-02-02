/**
 * Settings Feature Domain Types
 */

import type { ArticleFormat, MappingInfo } from '@features/configuration/domain/types';
import type { EnhancedCSVConfig } from '@shared/infrastructure/services/csvService';

export type { EnhancedCSVConfig };

export interface LogoConfig {
    logo1?: string;  // Base64 encoded image
    logo2?: string;  // Base64 encoded image
}

/**
 * SoluM Field Mapping Configuration
 * Defines how SoluM article fields map to app display
 */
export interface SolumFieldMapping {
    friendlyNameEn: string;
    friendlyNameHe: string;
    visible: boolean;
}

export interface SolumMappingConfig {
    uniqueIdField: string; // The field from SoluM article to use as unique ID
    fields: { [fieldKey: string]: SolumFieldMapping; }; // Map of all fields to their friendly names and visibility
    conferenceMapping: { // Specific fields for conference rooms
        meetingName: string;
        meetingTime: string; // Expected "START-END" format
        participants: string; // Expected comma-separated
    };
    globalFieldAssignments?: { [fieldKey: string]: string; }; // Global values to assign to all articles (e.g., NFC_URL: "https://...")
    mappingInfo?: MappingInfo; // Field name mappings from article format (e.g., articleId -> ARTICLE_ID)
}

export interface SettingsData {
    // App configuration
    appName: string;
    appSubtitle: string;
    spaceType: 'office' | 'room' | 'chair' | 'person-tag';

    // Working mode (SoluM API only)
    workingMode: import('@shared/domain/types').WorkingMode;

    // SoluM Mode: Article format schema
    solumArticleFormat?: ArticleFormat;

    // Legacy CSV Config (deprecated, keeping for migration)
    csvConfig: import('@shared/domain/types').CSVConfig;

    // SoluM Configuration (encrypted)
    solumConfig?: import('@shared/domain/types').SolumConfig;

    // SoluM Field Mapping (SoluM mode only)
    solumMappingConfig?: SolumMappingConfig;

    // Logo configuration
    logos: LogoConfig;

    // Auto-sync settings
    autoSyncEnabled: boolean;
    autoSyncInterval: number;  // in seconds

    // Auto-update settings
    autoUpdateEnabled?: boolean;
    updateCheckInterval?: number;  // in hours

    // Auto-lock settings
    autoLockEnabled?: boolean;
    lastSettingsAccess?: number;  // Timestamp of last settings dialog close

    // People Manager Mode (SoluM API only)
    peopleManagerEnabled?: boolean;  // Toggle to switch to people management mode
    peopleManagerConfig?: {
        totalSpaces: number;  // Total available spaces for assignment
    };
}

export interface ExportedSettings {
    version: string;
    timestamp: string;
    data: string;  // Encrypted or plain JSON of SettingsData
    encrypted?: boolean;  // Whether the data is encrypted
}

export const MAX_LOGO_SIZE = 2 * 1024 * 1024;  // 2MB
export const ALLOWED_LOGO_FORMATS = ['image/png', 'image/jpeg'];
