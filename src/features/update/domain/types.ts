/**
 * Update Feature - Domain Types
 * 
 * Defines the core types and interfaces for the auto-update feature.
 */

export type Platform = 'windows' | 'android' | 'web';

export type UpdatePolicy = 'auto' | 'notify' | 'manual';

export interface UpdateInfo {
    version: string;
    releaseDate: string;
    releaseNotes: string;
    downloadUrl?: string;
    platform: Platform;
    isMandatory?: boolean;
    fileSize?: number;
}

export interface UpdateState {
    available: boolean;
    checking: boolean;
    downloading: boolean;
    installing: boolean;
    progress: number;
    error: string | null;
    updateInfo: UpdateInfo | null;
    skippedVersion: string | null;
}

export interface UpdateCheckResult {
    updateAvailable: boolean;
    currentVersion: string;
    latestVersion: string;
    updateInfo?: UpdateInfo;
}

export interface DownloadProgress {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
}

export interface UpdateSettings {
    enabled: boolean;
    policy: UpdatePolicy;
    checkInterval: number; // in hours
    lastCheckTime: number; // timestamp
}
