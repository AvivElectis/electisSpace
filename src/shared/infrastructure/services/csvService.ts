import Papa from 'papaparse';
import type { AppData, CSVConfig, Space, ConferenceRoom } from '@shared/domain/types';
import { logger } from './logger';

/**
 * CSV Service
 * Handles parsing and generation of CSV files with configurable delimiters and mappings
 */

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
