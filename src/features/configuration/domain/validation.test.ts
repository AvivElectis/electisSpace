/**
 * Configuration Domain Validation Tests
 * Phase 10.34 - Deep Testing System
 * 
 * Tests configuration validation for article formats and CSV structure
 */

import { describe, it, expect } from 'vitest';
import {
    validateArticleFormat,
    validateCSVStructure,
    validateCSVColumn,
} from './validation';
import type { ArticleFormat, CSVColumn } from './types';

describe('Configuration Validation', () => {
    describe('validateArticleFormat', () => {
        const validFormat: ArticleFormat = {
            articleBasicInfo: ['store', 'articleId', 'articleName', 'data1'],
            mappingInfo: {
                store: 'STORE_ID',
                articleId: 'ARTICLE_ID',
                articleName: 'ITEM_NAME',
            },
            articleData: ['data1', 'data2'],
            delimeter: ';',
            fileExtension: 'csv',
        };

        it('should pass for valid format', () => {
            const result = validateArticleFormat(validFormat);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail when store mapping is missing', () => {
            const format = {
                ...validFormat,
                mappingInfo: {
                    ...validFormat.mappingInfo,
                    store: '',
                },
            };
            const result = validateArticleFormat(format);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Store mapping'))).toBe(true);
        });

        it('should fail when articleId mapping is missing', () => {
            const format = {
                ...validFormat,
                mappingInfo: {
                    ...validFormat.mappingInfo,
                    articleId: '',
                },
            };
            const result = validateArticleFormat(format);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Article ID'))).toBe(true);
        });

        it('should fail when articleName mapping is missing', () => {
            const format = {
                ...validFormat,
                mappingInfo: {
                    ...validFormat.mappingInfo,
                    articleName: '',
                },
            };
            const result = validateArticleFormat(format);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Article Name'))).toBe(true);
        });

        it('should fail when required field missing from basicInfo', () => {
            const format = {
                ...validFormat,
                articleBasicInfo: ['articleId', 'articleName'], // missing 'store'
            };
            const result = validateArticleFormat(format);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('store'))).toBe(true);
        });

        it('should fail when delimiter is missing', () => {
            const format = {
                ...validFormat,
                delimeter: '',
            };
            const result = validateArticleFormat(format);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Delimiter'))).toBe(true);
        });

        it('should fail when file extension is missing', () => {
            const format = {
                ...validFormat,
                fileExtension: '',
            };
            const result = validateArticleFormat(format);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('File extension'))).toBe(true);
        });
    });

    describe('validateCSVStructure', () => {
        const validColumns: CSVColumn[] = [
            { index: 0, aimsValue: 'id', headerEn: 'ID', headerHe: 'מזהה' },
            { index: 1, aimsValue: 'name', headerEn: 'Name', headerHe: 'שם' },
            { index: 2, aimsValue: 'dept', headerEn: 'Department', headerHe: 'מחלקה' },
        ];

        it('should pass for valid columns', () => {
            const result = validateCSVStructure(validColumns);
            expect(result.valid).toBe(true);
        });

        it('should fail for empty columns array', () => {
            const result = validateCSVStructure([]);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('At least one'))).toBe(true);
        });

        it('should fail for duplicate indices', () => {
            const columns: CSVColumn[] = [
                { index: 0, aimsValue: 'id', headerEn: 'ID', headerHe: 'מזהה' },
                { index: 0, aimsValue: 'name', headerEn: 'Name', headerHe: 'שם' }, // duplicate index
            ];
            const result = validateCSVStructure(columns);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Duplicate column indices'))).toBe(true);
        });

        it('should fail for duplicate aimsValues', () => {
            const columns: CSVColumn[] = [
                { index: 0, aimsValue: 'name', headerEn: 'ID', headerHe: 'מזהה' },
                { index: 1, aimsValue: 'name', headerEn: 'Name', headerHe: 'שם' }, // duplicate aimsValue
            ];
            const result = validateCSVStructure(columns);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Duplicate field names'))).toBe(true);
        });

        it('should fail when ID column not in configured columns', () => {
            const result = validateCSVStructure(validColumns, 'nonexistent');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('ID column'))).toBe(true);
        });

        it('should pass when ID column is in configured columns', () => {
            const result = validateCSVStructure(validColumns, 'id');
            expect(result.valid).toBe(true);
        });

        it('should fail when aimsValue is empty', () => {
            const columns: CSVColumn[] = [
                { index: 0, aimsValue: '', headerEn: 'ID', headerHe: 'מזהה' },
            ];
            const result = validateCSVStructure(columns);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Field name'))).toBe(true);
        });

        it('should fail when English header is empty', () => {
            const columns: CSVColumn[] = [
                { index: 0, aimsValue: 'id', headerEn: '', headerHe: 'מזהה' },
            ];
            const result = validateCSVStructure(columns);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('English header'))).toBe(true);
        });

        it('should fail when Hebrew header is empty', () => {
            const columns: CSVColumn[] = [
                { index: 0, aimsValue: 'id', headerEn: 'ID', headerHe: '' },
            ];
            const result = validateCSVStructure(columns);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Hebrew header'))).toBe(true);
        });

        it('should fail when index is negative', () => {
            const columns: CSVColumn[] = [
                { index: -1, aimsValue: 'id', headerEn: 'ID', headerHe: 'מזהה' },
            ];
            const result = validateCSVStructure(columns);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('non-negative'))).toBe(true);
        });
    });

    describe('validateCSVColumn', () => {
        it('should pass for valid column', () => {
            const column: CSVColumn = {
                index: 0,
                aimsValue: 'name',
                headerEn: 'Name',
                headerHe: 'שם',
            };
            const result = validateCSVColumn(column);
            expect(result.valid).toBe(true);
        });

        it('should fail when aimsValue is empty', () => {
            const column: CSVColumn = {
                index: 0,
                aimsValue: '',
                headerEn: 'Name',
                headerHe: 'שם',
            };
            const result = validateCSVColumn(column);
            expect(result.valid).toBe(false);
        });

        it('should fail when aimsValue is whitespace', () => {
            const column: CSVColumn = {
                index: 0,
                aimsValue: '   ',
                headerEn: 'Name',
                headerHe: 'שם',
            };
            const result = validateCSVColumn(column);
            expect(result.valid).toBe(false);
        });

        it('should fail when headerEn is empty', () => {
            const column: CSVColumn = {
                index: 0,
                aimsValue: 'name',
                headerEn: '',
                headerHe: 'שם',
            };
            const result = validateCSVColumn(column);
            expect(result.valid).toBe(false);
        });

        it('should fail when headerHe is empty', () => {
            const column: CSVColumn = {
                index: 0,
                aimsValue: 'name',
                headerEn: 'Name',
                headerHe: '',
            };
            const result = validateCSVColumn(column);
            expect(result.valid).toBe(false);
        });

        it('should fail when index is negative', () => {
            const column: CSVColumn = {
                index: -5,
                aimsValue: 'name',
                headerEn: 'Name',
                headerHe: 'שם',
            };
            const result = validateCSVColumn(column);
            expect(result.valid).toBe(false);
        });

        it('should collect multiple errors', () => {
            const column: CSVColumn = {
                index: -1,
                aimsValue: '',
                headerEn: '',
                headerHe: '',
            };
            const result = validateCSVColumn(column);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(3);
        });
    });
});
