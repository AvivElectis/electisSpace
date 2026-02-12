/**
 * CSV Validation
 * Handles validation of CSV configurations and creating defaults
 */

import type { CSVConfig } from '@shared/domain/types';
import { logger } from '../logger';
import type { EnhancedCSVConfig } from './types';

/**
 * Validate enhanced CSV configuration
 * @param config - Enhanced CSV configuration to validate
 * @returns Validation result with error messages
 */
export function validateCSVConfigEnhanced(config: EnhancedCSVConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const hasIdColumn = config.columns.some(c => c.fieldName === config.idColumn);
    if (!hasIdColumn) {
        errors.push(`ID column "${config.idColumn}" is not defined in column mappings`);
    }

    for (const col of config.columns) {
        if (col.csvColumn < 0) {
            errors.push(`Column "${col.fieldName}" has invalid index: ${col.csvColumn}`);
        }
    }

    const indices = config.columns.map(c => c.csvColumn);
    const duplicates = indices.filter((v, i) => indices.indexOf(v) !== i);
    if (duplicates.length > 0) {
        errors.push(`Duplicate column indices: ${[...new Set(duplicates)].join(', ')}`);
    }

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
        conferenceEnabled: true,
        conferenceMapping: {
            meetingName: 'meetingName',
            meetingTime: 'startTime',
            endTime: 'endTime',
            participants: 'participants',
        },
    };
}

/**
 * Validate CSV configuration (legacy)
 * @param config - CSV configuration to validate
 * @returns true if valid
 */
export function validateCSV(config: CSVConfig): boolean {
    const requiredFields = ['id'];

    for (const field of requiredFields) {
        if (!(field in config.mapping)) {
            logger.error('CSVService', 'Missing required field in mapping', { field });
            return false;
        }
    }

    for (const [field, index] of Object.entries(config.mapping)) {
        if (index < 0) {
            logger.error('CSVService', 'Invalid column index', { field, index });
            return false;
        }
    }

    return true;
}
