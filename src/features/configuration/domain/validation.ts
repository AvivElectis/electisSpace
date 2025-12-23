/**
 * Configuration Validation Rules
 * 
 * Business rules for validating:
 * - SoluM Article Format schemas
 * - SFTP CSV Structure configurations
 */

import type { ArticleFormat, CSVColumn, ValidationResult } from './types';

/**
 * Validate SoluM Article Format Schema
 * 
 * Ensures required mappings are present and schema is well-formed
 */
export function validateArticleFormat(schema: ArticleFormat): ValidationResult {
    const errors: string[] = [];

    // Validate required mappings
    if (!schema.mappingInfo.store) {
        errors.push('Store mapping is required');
    }

    if (!schema.mappingInfo.articleId) {
        errors.push('Article ID mapping is required');
    }

    if (!schema.mappingInfo.articleName) {
        errors.push('Article Name mapping is required');
    }

    // Validate basic info includes all mapped fields
    const requiredBasicFields = [
        schema.mappingInfo.store,
        schema.mappingInfo.articleId,
        schema.mappingInfo.articleName,
    ].filter(Boolean);

    for (const field of requiredBasicFields) {
        if (!schema.articleBasicInfo.includes(field)) {
            errors.push(`Basic info missing required field: ${field}`);
        }
    }

    // Validate delimiter
    if (!schema.delimeter || schema.delimeter.length === 0) {
        errors.push('Delimiter is required');
    }

    // Validate file extension
    if (!schema.fileExtension) {
        errors.push('File extension is required');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate CSV Structure Configuration
 * 
 * Ensures all mandatory fields are present and no duplicate indices
 */
export function validateCSVStructure(columns: CSVColumn[]): ValidationResult {
    const errors: string[] = [];

    // Check for empty configuration
    if (columns.length === 0) {
        errors.push('At least one column must be configured');
        return { valid: false, errors };
    }

    // Check for duplicate indices
    const indices = columns.map(c => c.index);
    const uniqueIndices = new Set(indices);

    if (uniqueIndices.size !== indices.length) {
        errors.push('Duplicate column indices found');
    }

    // Check for duplicate aimsValues
    const aimsValues = columns.map(c => c.aimsValue).filter(Boolean);
    const uniqueAimsValues = new Set(aimsValues);

    if (uniqueAimsValues.size !== aimsValues.length) {
        errors.push('Duplicate field names (aimsValue) found');
    }

    // Check mandatory SFTP fields are present
    const mandatoryFields = ['store', 'id', 'roomName'];
    const configuredFields = columns.map(c => c.aimsValue);

    for (const field of mandatoryFields) {
        if (!configuredFields.includes(field)) {
            errors.push(`Mandatory field missing: ${field}`);
        }
    }

    // Validate individual columns
    columns.forEach((col, index) => {
        if (!col.aimsValue || col.aimsValue.trim() === '') {
            errors.push(`Column ${index + 1}: Field name (aimsValue) is required`);
        }

        if (!col.headerEn || col.headerEn.trim() === '') {
            errors.push(`Column ${index + 1}: English header is required`);
        }

        if (!col.headerHe || col.headerHe.trim() === '') {
            errors.push(`Column ${index + 1}: Hebrew header is required`);
        }

        if (col.index < 0) {
            errors.push(`Column ${index + 1}: Index must be non-negative`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate individual CSV column
 */
export function validateCSVColumn(column: CSVColumn): ValidationResult {
    const errors: string[] = [];

    if (!column.aimsValue || column.aimsValue.trim() === '') {
        errors.push('Field name (aimsValue) is required');
    }

    if (!column.headerEn || column.headerEn.trim() === '') {
        errors.push('English header is required');
    }

    if (!column.headerHe || column.headerHe.trim() === '') {
        errors.push('Hebrew header is required');
    }

    if (column.index < 0) {
        errors.push('Column index must be non-negative');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
