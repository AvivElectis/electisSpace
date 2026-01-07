import Papa from 'papaparse';
import type { AppData, CSVConfig, Space, ConferenceRoom } from '@shared/domain/types';
import { logger } from './logger';

/**
 * CSV Service
 * Handles parsing and generation of CSV files with configurable delimiters and mappings
 */

/**
 * Enhanced CSV column mapping for SFTP mode
 */
export interface CSVColumnMapping {
    fieldName: string;     // Field name in app (e.g., 'id', 'name', 'rank')
    csvColumn: number;     // Column index in CSV (0-based)
    friendlyName: string;  // Display name for UI
    required: boolean;     // Whether this column is required
}

/**
 * Enhanced CSV configuration for SFTP mode
 */
export interface EnhancedCSVConfig {
    hasHeader: boolean;           // Whether CSV has a header row
    delimiter: ',' | ';' | '\t';  // Column delimiter
    columns: CSVColumnMapping[];  // Column mappings
    idColumn: string;             // Field name to use as unique ID
    conferenceEnabled: boolean;   // Whether to parse conference rooms
    conferencePrefix?: string;    // Prefix for conference room IDs (default: 'C')
}

/**
 * Parse CSV content using enhanced configuration (for SFTP mode)
 * @param content - Raw CSV string
 * @param config - Enhanced CSV configuration
 * @returns Array of parsed spaces
 */
export function parseCSVEnhanced(content: string, config: EnhancedCSVConfig): { spaces: Space[]; conferenceRooms: ConferenceRoom[] } {
    logger.info('CSVService', 'Parsing CSV (enhanced)', { 
        length: content.length, 
        hasHeader: config.hasHeader,
        delimiter: config.delimiter 
    });

    const parsed = Papa.parse<string[]>(content, {
        delimiter: config.delimiter,
        header: false,  // We handle header manually for more control
        skipEmptyLines: true
    });

    if (parsed.errors.length > 0) {
        logger.error('CSVService', 'CSV parsing errors', { errors: parsed.errors });
        throw new Error(`CSV parsing failed: ${parsed.errors[0].message}`);
    }

    const rows = parsed.data;
    if (rows.length === 0) {
        logger.warn('CSVService', 'Empty CSV file');
        return { spaces: [], conferenceRooms: [] };
    }

    // Skip header row if present
    const dataRows = config.hasHeader ? rows.slice(1) : rows;
    const headerRow = config.hasHeader ? rows[0] : null;

    if (headerRow) {
        logger.debug('CSVService', 'Header row', { header: headerRow });
    }

    const spaces: Space[] = [];
    const conferenceRooms: ConferenceRoom[] = [];
    const conferencePrefix = config.conferencePrefix || 'C';

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];

        // Build data object from row using column mappings
        const data: Record<string, string> = {};
        
        for (const col of config.columns) {
            const value = row[col.csvColumn];
            
            // Check required columns
            if (col.required && (value === undefined || value === '')) {
                logger.warn('CSVService', `Row ${i + 1}: missing required field "${col.fieldName}"`, { row });
            }
            
            data[col.fieldName] = value || '';
        }

        // Get ID from configured ID column
        const id = data[config.idColumn] || `row-${i + 1}`;

        // Check if this is a conference room (ID starts with conference prefix)
        const isConferenceRoom = config.conferenceEnabled && id.startsWith(conferencePrefix);

        if (isConferenceRoom) {
            // Parse conference room
            const room: ConferenceRoom = {
                id,
                hasMeeting: data['hasMeeting'] === 'true' || data['hasMeeting'] === '1',
                meetingName: data['meetingName'] || '',
                startTime: data['startTime'] || '',
                endTime: data['endTime'] || '',
                participants: data['participants']?.split(';').filter(Boolean) || [],
                labelCode: data['labelCode'],
                data,
            };
            conferenceRooms.push(room);
        } else {
            // Parse space
            const space: Space = {
                id,
                data,
                labelCode: data['labelCode'],
                templateName: data['templateName'],
            };
            spaces.push(space);
        }
    }

    logger.info('CSVService', 'CSV parsed successfully (enhanced)', {
        spacesCount: spaces.length,
        conferenceCount: conferenceRooms.length,
    });

    return { spaces, conferenceRooms };
}

/**
 * Generate CSV string using enhanced configuration (for SFTP mode)
 * @param spaces - Array of spaces
 * @param conferenceRooms - Optional array of conference rooms
 * @param config - Enhanced CSV configuration
 * @returns CSV string
 */
export function generateCSVEnhanced(
    spaces: Space[], 
    conferenceRooms: ConferenceRoom[] = [], 
    config: EnhancedCSVConfig
): string {
    logger.info('CSVService', 'Generating CSV (enhanced)', {
        spacesCount: spaces.length,
        conferenceCount: conferenceRooms.length,
    });

    // Find max column index for proper array sizing
    const maxColumnIndex = Math.max(...config.columns.map(c => c.csvColumn), 0);
    
    const rows: string[][] = [];

    // Add header row if configured
    if (config.hasHeader) {
        const header = new Array(maxColumnIndex + 1).fill('');
        config.columns.forEach(col => {
            header[col.csvColumn] = col.fieldName;
        });
        rows.push(header);
    }

    // Add space rows
    for (const space of spaces) {
        const row = new Array(maxColumnIndex + 1).fill('');
        
        for (const col of config.columns) {
            if (col.fieldName === config.idColumn) {
                row[col.csvColumn] = space.id;
            } else {
                row[col.csvColumn] = space.data[col.fieldName] || '';
            }
        }
        
        rows.push(row);
    }

    // Add conference room rows if enabled
    if (config.conferenceEnabled) {
        for (const room of conferenceRooms) {
            const row = new Array(maxColumnIndex + 1).fill('');
            
            for (const col of config.columns) {
                if (col.fieldName === config.idColumn) {
                    row[col.csvColumn] = room.id;
                } else if (col.fieldName === 'hasMeeting') {
                    row[col.csvColumn] = room.hasMeeting ? 'true' : 'false';
                } else if (col.fieldName === 'meetingName') {
                    row[col.csvColumn] = room.meetingName;
                } else if (col.fieldName === 'startTime') {
                    row[col.csvColumn] = room.startTime;
                } else if (col.fieldName === 'endTime') {
                    row[col.csvColumn] = room.endTime;
                } else if (col.fieldName === 'participants') {
                    row[col.csvColumn] = room.participants.join(';');
                } else if (room.data) {
                    row[col.csvColumn] = room.data[col.fieldName] || '';
                }
            }
            
            rows.push(row);
        }
    }

    // Generate CSV
    const csv = Papa.unparse(rows, { delimiter: config.delimiter });

    logger.info('CSVService', 'CSV generated successfully (enhanced)', { rowCount: rows.length });
    return csv;
}

/**
 * Validate enhanced CSV configuration
 * @param config - Enhanced CSV configuration to validate
 * @returns Validation result with error messages
 */
export function validateCSVConfigEnhanced(config: EnhancedCSVConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check ID column exists in mappings
    const hasIdColumn = config.columns.some(c => c.fieldName === config.idColumn);
    if (!hasIdColumn) {
        errors.push(`ID column "${config.idColumn}" is not defined in column mappings`);
    }

    // Check required columns have valid indices
    for (const col of config.columns) {
        if (col.csvColumn < 0) {
            errors.push(`Column "${col.fieldName}" has invalid index: ${col.csvColumn}`);
        }
    }

    // Check for duplicate column indices
    const indices = config.columns.map(c => c.csvColumn);
    const duplicates = indices.filter((v, i) => indices.indexOf(v) !== i);
    if (duplicates.length > 0) {
        errors.push(`Duplicate column indices: ${[...new Set(duplicates)].join(', ')}`);
    }

    // Check for duplicate field names
    const fieldNames = config.columns.map(c => c.fieldName);
    const dupFields = fieldNames.filter((v, i) => fieldNames.indexOf(v) !== i);
    if (dupFields.length > 0) {
        errors.push(`Duplicate field names: ${[...new Set(dupFields)].join(', ')}`);
    }

    if (errors.length > 0) {
        logger.error('CSVService', 'CSV config validation failed', { errors });
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Create default enhanced CSV config for SFTP mode
 */
export function createDefaultEnhancedCSVConfig(): EnhancedCSVConfig {
    return {
        hasHeader: true,
        delimiter: ',',
        columns: [
            { fieldName: 'id', csvColumn: 0, friendlyName: 'ID', required: true },
            { fieldName: 'name', csvColumn: 1, friendlyName: 'Name', required: true },
            { fieldName: 'rank', csvColumn: 2, friendlyName: 'Rank', required: false },
            { fieldName: 'title', csvColumn: 3, friendlyName: 'Title', required: false },
        ],
        idColumn: 'id',
        conferenceEnabled: false,
    };
}

// ========================================
// Legacy CSV functions (for backwards compatibility)
// ========================================

/**
 * Parse CSV content into AppData
 * @param csvContent - Raw CSV string
 * @param config - CSV configuration (delimiter, mappings)
 * @returns Parsed application data
 */
export function parseCSV(csvContent: string, config: CSVConfig): AppData {
    logger.info('CSVService', 'Parsing CSV', { length: csvContent.length });

    const result = Papa.parse<string[]>(csvContent, {
        delimiter: config.delimiter,
        skipEmptyLines: true,
    });

    if (result.errors.length > 0) {
        logger.error('CSVService', 'CSV parsing errors', { errors: result.errors });
        throw new Error(`CSV parsing failed: ${result.errors[0].message}`);
    }

    const rows = result.data;
    if (rows.length === 0) {
        logger.warn('CSVService', 'Empty CSV file');
        return { spaces: [], conferenceRooms: [], store: '' };
    }

    // Remove header row
    const headerRow = rows.shift();
    logger.debug('CSVService', 'Header row', { header: headerRow });

    const spaces: Space[] = [];
    const conferenceRooms: ConferenceRoom[] = [];
    let storeNumber = '';

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Skip rows that don't have enough columns
        if (row.length < Math.max(...Object.values(config.mapping)) + 1) {
            logger.warn('CSVService', `Skipping row ${i + 1}: insufficient columns`, { row });
            continue;
        }

        // Build dynamic data object from row
        const data: Record<string, string> = {};
        for (const [fieldName, columnIndex] of Object.entries(config.mapping)) {
            data[fieldName] = row[columnIndex] || '';
        }

        const id = data['id'] || '';

        // Extract store number from first row
        if (i === 0 && data['storeNumber']) {
            storeNumber = data['storeNumber'];
        }

        // Check if this is a conference room (ID starts with 'C' or room type field indicates conference)
        const isConferenceRoom = config.conferenceEnabled && (
            id.startsWith('C') || data['type'] === 'conference'
        );

        if (isConferenceRoom) {
            // Parse conference room
            const room: ConferenceRoom = {
                id,
                hasMeeting: data['hasMeeting'] === 'true' || data['hasMeeting'] === '1',
                meetingName: data['meetingName'] || '',
                startTime: data['startTime'] || '',
                endTime: data['endTime'] || '',
                participants: data['participants']?.split(';').filter(Boolean) || [],
                labelCode: data['labelCode'],
                data,
            };
            conferenceRooms.push(room);
        } else {
            // Parse space
            const space: Space = {
                id,
                data,
                labelCode: data['labelCode'],
                templateName: data['templateName'],
            };
            spaces.push(space);
        }
    }

    logger.info('CSVService', 'CSV parsed successfully', {
        spacesCount: spaces.length,
        conferenceCount: conferenceRooms.length,
    });

    return {
        spaces,
        conferenceRooms,
        store: storeNumber,
    };
}

/**
 * Generate CSV string from AppData
 * @param data - Application data
 * @param config - CSV configuration
 * @param globalNfcUrl - Optional global NFC URL to inject
 * @returns CSV string
 */
export function generateCSV(data: AppData, config: CSVConfig, globalNfcUrl?: string): string {
    logger.info('CSVService', 'Generating CSV', {
        spacesCount: data.spaces.length,
        conferenceCount: data.conferenceRooms?.length || 0,
    });

    // Build header row from mappings
    const maxColumnIndex = Math.max(...Object.values(config.mapping));
    const headerRow = new Array(maxColumnIndex + 1).fill('');

    for (const [fieldName, columnIndex] of Object.entries(config.mapping)) {
        headerRow[columnIndex] = fieldName;
    }

    // Build data rows
    const rows: string[][] = [headerRow];

    // Add space rows
    for (const space of data.spaces) {
        const row = new Array(maxColumnIndex + 1).fill('');

        for (const [fieldName, columnIndex] of Object.entries(config.mapping)) {
            if (fieldName === 'id') {
                row[columnIndex] = space.id;
            } else if (fieldName === 'roomName') {
                row[columnIndex] = space.data?.[fieldName] || '';
            } else if (fieldName === 'labelCode') {
                row[columnIndex] = space.labelCode || '';
            } else if (fieldName === 'templateName') {
                row[columnIndex] = space.templateName || '';
            } else if (fieldName === 'storeNumber') {
                row[columnIndex] = data.store || '';
            } else if (fieldName === 'nfcUrl' && globalNfcUrl) {
                row[columnIndex] = globalNfcUrl;
            } else {
                row[columnIndex] = space.data[fieldName] || '';
            }
        }

        rows.push(row);
    }

    // Add conference room rows if enabled
    if (config.conferenceEnabled && data.conferenceRooms) {
        for (const room of data.conferenceRooms) {
            const row = new Array(maxColumnIndex + 1).fill('');

            for (const [fieldName, columnIndex] of Object.entries(config.mapping)) {
                if (fieldName === 'id') {
                    row[columnIndex] = room.id;
                } else if (fieldName === 'roomName') {
                    row[columnIndex] = room.data?.[fieldName] || '';
                } else if (fieldName === 'hasMeeting') {
                    row[columnIndex] = room.hasMeeting ? 'true' : 'false';
                } else if (fieldName === 'meetingName') {
                    row[columnIndex] = room.meetingName;
                } else if (fieldName === 'startTime') {
                    row[columnIndex] = room.startTime;
                } else if (fieldName === 'endTime') {
                    row[columnIndex] = room.endTime;
                } else if (fieldName === 'participants') {
                    row[columnIndex] = room.participants.join(';');
                } else if (fieldName === 'labelCode') {
                    row[columnIndex] = room.labelCode || '';
                } else if (fieldName === 'type') {
                    row[columnIndex] = 'conference';
                } else if (room.data) {
                    row[columnIndex] = room.data[fieldName] || '';
                }
            }

            rows.push(row);
        }
    }

    // Generate CSV
    const csv = Papa.unparse(rows, {
        delimiter: config.delimiter,
    });

    logger.info('CSVService', 'CSV generated successfully', { rowCount: rows.length });
    return csv;
}

/**
 * Validate CSV configuration
 * @param config - CSV configuration to validate
 * @returns true if valid
 */
export function validateCSV(config: CSVConfig): boolean {
    // Check required fields exist in mapping
    const requiredFields = ['id']; // roomName is now dynamic in data

    for (const field of requiredFields) {
        if (!(field in config.mapping)) {
            logger.error('CSVService', 'Missing required field in mapping', { field });
            return false;
        }
    }

    // Check column indices are valid
    for (const [field, index] of Object.entries(config.mapping)) {
        if (index < 0) {
            logger.error('CSVService', 'Invalid column index', { field, index });
            return false;
        }
    }

    return true;
}
