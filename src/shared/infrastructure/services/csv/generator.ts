/**
 * CSV Generation
 * Handles generating CSV strings from structured data
 */

import Papa from 'papaparse';
import type { AppData, CSVConfig, Space, ConferenceRoom } from '@shared/domain/types';
import { logger } from '../logger';
import type { EnhancedCSVConfig } from './types';

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

    const maxColumnIndex = Math.max(...config.columns.map(c => c.csvColumn), 0);

    const rows: string[][] = [];

    if (config.hasHeader) {
        const header = new Array(maxColumnIndex + 1).fill('');
        config.columns.forEach(col => {
            header[col.csvColumn] = col.fieldName;
        });
        rows.push(header);
    }

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

    const confMap = config.conferenceMapping;
    const roomNameField = confMap?.roomName;

    for (const room of conferenceRooms) {
        const row = new Array(maxColumnIndex + 1).fill('');

        const csvRoomId = room.id.startsWith('C') || room.id.startsWith('c')
            ? room.id
            : `C${room.id}`;

        for (const col of config.columns) {
            if (col.fieldName === config.idColumn) {
                row[col.csvColumn] = csvRoomId;
            } else if (roomNameField && col.fieldName === roomNameField) {
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

    const csv = Papa.unparse(rows, { delimiter: config.delimiter });

    logger.info('CSVService', 'CSV generated successfully (enhanced)', { rowCount: rows.length });
    return csv;
}

/**
 * Generate CSV string from AppData (legacy)
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

    const maxColumnIndex = Math.max(...Object.values(config.mapping));
    const headerRow = new Array(maxColumnIndex + 1).fill('');

    for (const [fieldName, columnIndex] of Object.entries(config.mapping)) {
        headerRow[columnIndex] = fieldName;
    }

    const rows: string[][] = [headerRow];

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

    const csv = Papa.unparse(rows, {
        delimiter: config.delimiter,
    });

    logger.info('CSVService', 'CSV generated successfully', { rowCount: rows.length });
    return csv;
}
