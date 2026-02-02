import Papa from 'papaparse';
import type { AppData, CSVConfig, Space, ConferenceRoom } from '@shared/domain/types';
import { logger } from './logger';

/**
 * CSV Service
 * Handles parsing and generation of CSV files with configurable delimiters and mappings
 */

/**
 * Enhanced CSV column mapping
 */
export interface CSVColumnMapping {
    fieldName: string;       // Field name in app (e.g., 'id', 'name', 'rank')
    csvColumn: number;       // Column index in CSV (0-based)
    friendlyName: string;    // Display name for UI (English)
    friendlyNameHe?: string; // Display name for UI (Hebrew)
    required: boolean;       // Whether this column is required/visible
}

/**
 * Enhanced CSV configuration
 */
/**
 * Conference field mapping
 */
export interface ConferenceFieldMapping {
    roomName?: string;       // Field name for conference room name
    meetingName: string;     // Field name for meeting name
    meetingTime: string;     // Field name for meeting time (or startTime)
    endTime?: string;        // Field name for meeting end time
    participants?: string;   // Field name for participants (semicolon-separated)
}

export interface EnhancedCSVConfig {
    hasHeader: boolean;           // Whether CSV has a header row
    delimiter: ',' | ';' | '\t';  // Column delimiter
    columns: CSVColumnMapping[];  // Column mappings
    idColumn: string;             // Field name to use as unique ID
    conferenceEnabled: boolean;   // Whether to parse conference rooms
    conferencePrefix?: string;    // Prefix for conference room IDs (default: 'C')
    conferenceMapping?: ConferenceFieldMapping;  // Field mappings for conference rooms
    globalFieldAssignments?: { [fieldKey: string]: string };  // Global field values applied to all records
}

/**
 * Parse CSV content using enhanced configuration
 * @param content - Raw CSV string
 * @param config - Enhanced CSV configuration
 * @returns Array of parsed spaces and conference rooms
 */
export function parseCSVEnhanced(content: string, config: EnhancedCSVConfig): { spaces: Space[]; conferenceRooms: ConferenceRoom[] } {
    // Conference detection is enabled - detect by ID prefix 'C'
    const isConferenceDetectionEnabled = true;

    logger.info('CSVService', 'Parsing CSV (enhanced)', { 
        length: content.length,
        hasHeader: config.hasHeader,
        delimiter: config.delimiter,
        idColumn: config.idColumn,
        columnsCount: config.columns.length,
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
            
            // Check required columns - only warn if column is truly missing (out of range)
            // Empty string values are valid and should not trigger a warning
            if (col.required && value === undefined) {
                logger.warn('CSVService', `Row ${i + 1}: missing required field "${col.fieldName}"`, { row });
            }
            
            data[col.fieldName] = value || '';
        }

        // Apply global field assignments (override any existing values)
        if (config.globalFieldAssignments) {
            Object.assign(data, config.globalFieldAssignments);
        }

        // Get ID from configured ID column
        const id = data[config.idColumn] || `row-${i + 1}`;

        // Check if this is a conference room (ID starts with conference prefix 'C' or 'c')
        // Conference rooms are detected by ID prefix
        const isConferenceRoom = isConferenceDetectionEnabled && 
            (id.startsWith(conferencePrefix) || id.startsWith(conferencePrefix.toLowerCase()));

        if (isConferenceRoom) {
            // Parse conference room using configured field mappings
            const confMap = config.conferenceMapping;
            const meetingNameField = confMap?.meetingName || 'meetingName';
            const meetingTimeField = confMap?.meetingTime || 'startTime';
            const endTimeField = confMap?.endTime || 'endTime';
            const participantsField = confMap?.participants || 'participants';
            
            // Get room name from configured field in settings
            const roomNameField = confMap?.roomName;
            const roomName = roomNameField ? (data[roomNameField] || '') : '';
            
            // Debug logging for room name extraction
            logger.info('CSVService', 'Conference room name extraction', {
                roomNameField,
                roomName,
                dataKeys: Object.keys(data),
            });
            
            // hasMeeting is ONLY true if meeting name is present
            const meetingName = data[meetingNameField] || '';
            
            // Strip the 'C' or 'c' prefix from conference room ID
            const displayId = id.startsWith('C') || id.startsWith('c') ? id.substring(1) : id;
            
            // Ensure roomName is set in data for UI display
            // Also update the ID column in data to not have the 'C' prefix
            const enhancedData = { 
                ...data, 
                roomName,
                [config.idColumn]: displayId,  // Update ID column to not have 'C' prefix
            };
            
            const room: ConferenceRoom = {
                id: displayId, // Use ID without the 'C' prefix
                hasMeeting: !!meetingName, // Only meeting name triggers hasMeeting, not time alone
                meetingName,
                startTime: data[meetingTimeField] || '',
                endTime: data[endTimeField] || '',
                participants: data[participantsField]?.split(';').filter(Boolean) || [],
                labelCode: data['labelCode'],
                data: enhancedData,
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
 * Generate CSV string using enhanced configuration
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

    // Add conference room rows - always add them (we detect by ID prefix)
    // Re-add the 'C' prefix that was stripped during parsing
    const confMap = config.conferenceMapping;
    const roomNameField = confMap?.roomName;  // e.g., "ITEM_NAME"
    
    for (const room of conferenceRooms) {
        const row = new Array(maxColumnIndex + 1).fill('');
        
        // Add 'C' prefix back to conference room ID for CSV output
        const csvRoomId = room.id.startsWith('C') || room.id.startsWith('c') 
            ? room.id 
            : `C${room.id}`;
        
        for (const col of config.columns) {
            if (col.fieldName === config.idColumn) {
                row[col.csvColumn] = csvRoomId;
            } else if (roomNameField && col.fieldName === roomNameField) {
                // Write room name to the configured roomName column (e.g., ITEM_NAME)
                row[col.csvColumn] = room.data?.roomName || '';
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
 * Create default enhanced CSV config
 */
export function createDefaultEnhancedCSVConfig(): EnhancedCSVConfig {
    return {
        hasHeader: true,
        delimiter: ';',
        columns: [
            { fieldName: 'id', csvColumn: 0, friendlyName: 'ID', required: true },
            { fieldName: 'name', csvColumn: 1, friendlyName: 'Name', required: true },
            { fieldName: 'rank', csvColumn: 2, friendlyName: 'Rank', required: false },
            { fieldName: 'title', csvColumn: 3, friendlyName: 'Title', required: false },
        ],
        idColumn: 'id',
        conferenceEnabled: true,  // Always enabled - conference rooms detected by ID prefix 'C'
        conferenceMapping: {
            meetingName: 'meetingName',
            meetingTime: 'startTime',
            endTime: 'endTime',
            participants: 'participants',
        },
    };
}

/**
 * Extract headers from CSV content and create column mappings
 * @param content - Raw CSV string
 * @param delimiter - Column delimiter (default ';')
 * @returns Array of column mappings derived from headers
 */
export function extractHeadersFromCSV(content: string, delimiter: string = ';'): CSVColumnMapping[] {
    logger.info('CSVService', 'Extracting headers from CSV', { delimiter, contentLength: content.length });

    // Remove BOM if present
    let cleanContent = content;
    if (cleanContent.charCodeAt(0) === 0xFEFF) {
        cleanContent = cleanContent.slice(1);
        logger.debug('CSVService', 'Removed BOM from CSV content');
    }

    const parsed = Papa.parse<string[]>(cleanContent, {
        delimiter,
        header: false,
        skipEmptyLines: true,
        preview: 1  // Only read first row
    });

    if (parsed.errors.length > 0 || parsed.data.length === 0) {
        logger.warn('CSVService', 'Could not extract headers', { errors: parsed.errors });
        return [];
    }

    const headerRow = parsed.data[0];
    
    const columns: CSVColumnMapping[] = headerRow.map((header, index) => {
        // Clean up header name - keep original case
        const cleanHeader = header.trim();
        // Use original header as fieldName (for data mapping), just clean special characters
        const fieldName = cleanHeader
            .replace(/[^a-zA-Z0-9_\u0590-\u05FF]+/g, '_')  // Replace non-alphanumeric with underscore (keep Hebrew and case)
            .replace(/^_+|_+$/g, '')  // Remove leading/trailing underscores
            || `column_${index}`;
        
        return {
            fieldName,  // Original case preserved (e.g., 'STORE_ID', 'ITEM_NAME')
            csvColumn: index,
            friendlyName: cleanHeader || `Column ${index + 1}`,
            required: index === 0  // First column is typically ID/required
        };
    });

    logger.info('CSVService', 'Headers extracted', { 
        count: columns.length,
        headers: columns.map(c => c.friendlyName)
    });

    return columns;
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

        // Check if this is a conference room (ID starts with 'C' or 'c', or room type field indicates conference)
        // Conference detection is always active unless explicitly disabled
        const isConferenceRoom = (config.conferenceEnabled !== false) && (
            id.startsWith('C') || id.startsWith('c') || data['type'] === 'conference'
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
