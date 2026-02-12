/**
 * CSV Parsing
 * Handles parsing CSV content into structured Space and ConferenceRoom data
 */

import Papa from 'papaparse';
import type { AppData, CSVConfig, Space, ConferenceRoom } from '@shared/domain/types';
import { logger } from '../logger';
import type { CSVColumnMapping, EnhancedCSVConfig } from './types';

/**
 * Parse CSV content using enhanced configuration
 * @param content - Raw CSV string
 * @param config - Enhanced CSV configuration
 * @returns Array of parsed spaces and conference rooms
 */
export function parseCSVEnhanced(content: string, config: EnhancedCSVConfig): { spaces: Space[]; conferenceRooms: ConferenceRoom[] } {
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
        header: false,
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

        const data: Record<string, string> = {};

        for (const col of config.columns) {
            const value = row[col.csvColumn];

            if (col.required && value === undefined) {
                logger.warn('CSVService', `Row ${i + 1}: missing required field "${col.fieldName}"`, { row });
            }

            data[col.fieldName] = value || '';
        }

        if (config.globalFieldAssignments) {
            Object.assign(data, config.globalFieldAssignments);
        }

        const id = data[config.idColumn] || `row-${i + 1}`;

        const isConferenceRoom = isConferenceDetectionEnabled &&
            (id.startsWith(conferencePrefix) || id.startsWith(conferencePrefix.toLowerCase()));

        if (isConferenceRoom) {
            const confMap = config.conferenceMapping;
            const meetingNameField = confMap?.meetingName || 'meetingName';
            const meetingTimeField = confMap?.meetingTime || 'startTime';
            const endTimeField = confMap?.endTime || 'endTime';
            const participantsField = confMap?.participants || 'participants';

            const roomNameField = confMap?.roomName;
            const roomName = roomNameField ? (data[roomNameField] || '') : '';

            logger.info('CSVService', 'Conference room name extraction', {
                roomNameField,
                roomName,
                dataKeys: Object.keys(data),
            });

            const meetingName = data[meetingNameField] || '';
            const displayId = id.startsWith('C') || id.startsWith('c') ? id.substring(1) : id;

            const enhancedData = {
                ...data,
                roomName,
                [config.idColumn]: displayId,
            };

            const room: ConferenceRoom = {
                id: displayId,
                hasMeeting: !!meetingName,
                meetingName,
                startTime: data[meetingTimeField] || '',
                endTime: data[endTimeField] || '',
                participants: data[participantsField]?.split(';').filter(Boolean) || [],
                labelCode: data['labelCode'],
                data: enhancedData,
            };
            conferenceRooms.push(room);
        } else {
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
 * Parse CSV content into AppData (legacy)
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

    const headerRow = rows.shift();
    logger.debug('CSVService', 'Header row', { header: headerRow });

    const spaces: Space[] = [];
    const conferenceRooms: ConferenceRoom[] = [];
    let storeNumber = '';

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        if (row.length < Math.max(...Object.values(config.mapping)) + 1) {
            logger.warn('CSVService', `Skipping row ${i + 1}: insufficient columns`, { row });
            continue;
        }

        const data: Record<string, string> = {};
        for (const [fieldName, columnIndex] of Object.entries(config.mapping)) {
            data[fieldName] = row[columnIndex] || '';
        }

        const id = data['id'] || '';

        if (i === 0 && data['storeNumber']) {
            storeNumber = data['storeNumber'];
        }

        const isConferenceRoom = (config.conferenceEnabled !== false) && (
            id.startsWith('C') || id.startsWith('c') || data['type'] === 'conference'
        );

        if (isConferenceRoom) {
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
 * Extract headers from CSV content and create column mappings
 * @param content - Raw CSV string
 * @param delimiter - Column delimiter (default ';')
 * @returns Array of column mappings derived from headers
 */
export function extractHeadersFromCSV(content: string, delimiter: string = ';'): CSVColumnMapping[] {
    logger.info('CSVService', 'Extracting headers from CSV', { delimiter, contentLength: content.length });

    let cleanContent = content;
    if (cleanContent.charCodeAt(0) === 0xFEFF) {
        cleanContent = cleanContent.slice(1);
        logger.debug('CSVService', 'Removed BOM from CSV content');
    }

    const parsed = Papa.parse<string[]>(cleanContent, {
        delimiter,
        header: false,
        skipEmptyLines: true,
        preview: 1
    });

    if (parsed.errors.length > 0 || parsed.data.length === 0) {
        logger.warn('CSVService', 'Could not extract headers', { errors: parsed.errors });
        return [];
    }

    const headerRow = parsed.data[0];

    const columns: CSVColumnMapping[] = headerRow.map((header, index) => {
        const cleanHeader = header.trim();
        const fieldName = cleanHeader
            .replace(/[^a-zA-Z0-9_\u0590-\u05FF]+/g, '_')
            .replace(/^_+|_+$/g, '')
            || `column_${index}`;

        return {
            fieldName,
            csvColumn: index,
            friendlyName: cleanHeader || `Column ${index + 1}`,
            required: index === 0
        };
    });

    logger.info('CSVService', 'Headers extracted', {
        count: columns.length,
        headers: columns.map(c => c.friendlyName)
    });

    return columns;
}
