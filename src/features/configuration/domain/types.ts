/**
 * Configuration Domain Types
 * 
 * This module defines types for configuration management:
 * - ArticleFormat: SoluM API mode only
 * - CSVColumn: SFTP mode only
 * 
 * IMPORTANT: These types enforce mode separation - no shared structural data.
 */

/**
 * SoluM Article Format Schema (SoluM API Mode Only)
 * Fetched from: /common/api/v2/common/articles/upload/format
 */
export interface ArticleFormat {
    /** File extension for article uploads (e.g., "csv") */
    fileExtension: string;

    /** Delimiter character (e.g., ";" or ",") */
    delimeter: string;  // Note: SoluM API uses this spelling

    /** Mapping of internal fields to SoluM API fields */
    mappingInfo: MappingInfo;

    /** Basic article fields required by SoluM */
    articleBasicInfo: string[];

    /** Additional data fields for article customization */
    articleData: string[];
}

/**
 * SoluM Field Mapping Configuration
 */
export interface MappingInfo {
    /** Store identifier field */
    store: string;

    /** Article ID field */
    articleId: string;

    /** Article name/title field */
    articleName: string;

    /** NFC URL field (optional) */
    nfcUrl?: string;

    /** Additional custom mappings */
    [key: string]: string | undefined;
}

/**
 * CSV Column Configuration (SFTP Mode Only)
 * Defines structure for CSV file columns
 */
export interface CSVColumn {
    /** Column position in CSV (0-based index) */
    index: number;

    /** Internal field identifier (e.g., "roomName", "id") */
    aimsValue: string;

    /** English column header */
    headerEn: string;

    /** Hebrew column header */
    headerHe: string;

    /** Data type for validation */
    type?: FieldType;

    /** Whether this field is visible in the spaces table */
    visible?: boolean;

    /** Whether this field is locked (used as global field) */
    lockedForGlobal?: boolean;
}

/**
 * Supported field data types
 */
export type FieldType = 'text' | 'number' | 'email' | 'phone' | 'url' | 'date';

/**
 * Field Mapping
 * Maps internal field names (aimsValue) to column indices or field names
 */
export interface FieldMapping {
    [aimsValue: string]: number | string;
}

/**
 * Validation Result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
