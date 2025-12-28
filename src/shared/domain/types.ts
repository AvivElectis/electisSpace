/**
 * Shared domain types used across multiple features
 */

export type WorkingMode = 'SFTP' | 'SOLUM_API';

export type Platform = 'electron' | 'android' | 'web';

export interface ConnectionStatus {
    isConnected: boolean;
    lastSync?: Date;
    error?: string;
}

/**
 * Application data structure for CSV import/export
 */
export interface AppData {
    spaces: Space[];
    conferenceRooms?: ConferenceRoom[];
    store: string;
}

/**
 * Space entity (chairs/rooms)
 */
export interface Space {
    id: string;
    roomName: string;
    data: Record<string, string>;  // Dynamic fields from CSV or SoluM
    labelCode?: string;  // Optional - for display only, assigned separately
    templateName?: string;  // Optional - for display only
}

/**
 * Conference room entity
 */
export interface ConferenceRoom {
    id: string;              // Format: C01, C02, etc.
    roomName: string;
    hasMeeting: boolean;
    meetingName: string;
    startTime: string;       // HH:mm format
    endTime: string;         // HH:mm format
    participants: string[];
    labelCode?: string;
    data: Record<string, string>;  // Additional dynamic fields
}

/**
 * CSV column configuration
 */
export interface CSVColumn {
    index: number;
    name: string;
    required: boolean;
}

export interface FieldMapping {
    [fieldName: string]: number;  // Map field name to column index
}

export interface CSVConfig {
    delimiter: string;
    columns: CSVColumn[];
    mapping: FieldMapping;
    conferenceEnabled: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

export interface ValidationError {
    field: string;
    message: string;
}

/**
 * SoluM API types
 */
export interface SolumConfig {
    companyName: string;
    username: string;
    password: string;
    storeNumber: string;
    cluster: 'common' | 'c1';  // API cluster selection
    baseUrl: string;
    customBaseUrl?: string;  // Custom URL when baseUrl is 'custom'
    syncInterval: number;  // in seconds

    // Token management
    tokens?: SolumTokens;      // Active access and refresh tokens
    isConnected?: boolean;      // Connection state
    lastConnected?: number;     // Timestamp of last successful connection
    lastRefreshed?: number;     // Timestamp of last token refresh
    storeSummary?: any;         // Store configuration and statistics from API
}

export interface SolumTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;  // Unix timestamp
}

/**
 * SFTP configuration
 */
export interface SFTPCredentials {
    username: string;
    password: string;
    host: string;
    remoteFilename: string;
}

/**
 * App settings
 */
export interface AppSettings {
    name: string;
    subtitle: string;
    spaceType: 'office' | 'room' | 'chair' | 'person-tag';
}
