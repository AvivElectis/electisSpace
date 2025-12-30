/**
 * Import/Export Feature Domain Types
 */

import type { SettingsData } from '@features/settings/domain/types';

export interface ExportOptions {
    includeCredentials: boolean;
    password?: string;
}

export interface ExportedData {
    version: string;
    timestamp: string;
    data: string;  // JSON or encrypted string
    encrypted: boolean;
}

export interface ImportResult {
    success: boolean;
    settings?: SettingsData;
    error?: string;
}

export interface ImportPreview {
    appName: string;
    workingMode: string;
    hasCredentials: boolean;
    hasLogos: boolean;
    timestamp: string;
}
