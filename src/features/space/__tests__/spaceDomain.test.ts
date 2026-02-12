/**
 * Space Domain Tests
 * Phase 10.19 - Deep Testing System
 * 
 * Tests business rules and validation for space management
 */

import {
    generateSpaceId,
    mergeSpaceDefaults,
    filterSpaces,
    getUniqueFieldValues,
} from '../domain/businessRules';
import {
    validateSpace,
    validateSpaceListName,
    isSpaceIdUnique,
} from '../domain/validation';
import type { Space, CSVConfig } from '@shared/domain/types';

describe('Space Domain Business Rules', () => {
    describe('generateSpaceId', () => {
        it('should extract room number from name', () => {
            const result = generateSpaceId('Room 205', []);
            expect(result).toBe('205');
        });

        it('should return 1 when no number in name', () => {
            const result = generateSpaceId('Main Hall', []);
            expect(result).toBe('1');
        });

        it('should ensure uniqueness with suffix', () => {
            const result = generateSpaceId('Room 101', ['101']);
            expect(result).toBe('101-1');
        });

        it('should increment suffix for multiple collisions', () => {
            const result = generateSpaceId('Room 101', ['101', '101-1', '101-2']);
            expect(result).toBe('101-3');
        });

        it('should handle first number in name', () => {
            const result = generateSpaceId('Building 5 Room 301', []);
            expect(result).toBe('5');
        });
    });

    describe('mergeSpaceDefaults', () => {
        const csvConfig: CSVConfig = {
            delimiter: ';',
            columns: [
                { index: 0, name: 'Name', required: true },
                { index: 1, name: 'Department', required: false },
                { index: 2, name: 'Floor', required: false },
            ],
            mapping: {},
            conferenceEnabled: false,
        };

        it('should fill missing fields with empty strings', () => {
            const space: Partial<Space> = {
                id: '101',
                data: { Name: 'John' },
            };

            const result = mergeSpaceDefaults(space, csvConfig);

            expect(result.data.Name).toBe('John');
            expect(result.data.Department).toBe('');
            expect(result.data.Floor).toBe('');
        });

        it('should preserve existing values', () => {
            const space: Partial<Space> = {
                id: '101',
                data: { Name: 'John', Department: 'Engineering', Floor: '3' },
            };

            const result = mergeSpaceDefaults(space, csvConfig);

            expect(result.data.Department).toBe('Engineering');
            expect(result.data.Floor).toBe('3');
        });

        it('should preserve labelCode and templateName', () => {
            const space: Partial<Space> = {
                id: '101',
                data: {},
                labelCode: 'T01',
                templateName: 'template1',
            };

            const result = mergeSpaceDefaults(space, csvConfig);

            expect(result.labelCode).toBe('T01');
            expect(result.templateName).toBe('template1');
        });

        it('should handle empty space data', () => {
            const space: Partial<Space> = {
                id: '101',
            };

            const result = mergeSpaceDefaults(space, csvConfig);

            expect(result.data.Name).toBe('');
            expect(result.data.Department).toBe('');
        });
    });

    describe('filterSpaces', () => {
        const spaces: Space[] = [
            { id: '101', data: { Name: 'Alice', Department: 'Engineering', Floor: '1' } },
            { id: '102', data: { Name: 'Bob', Department: 'Marketing', Floor: '2' } },
            { id: '103', data: { Name: 'Charlie', Department: 'Engineering', Floor: '1' } },
        ];

        it('should return all spaces without filters', () => {
            const result = filterSpaces(spaces);
            expect(result.length).toBe(3);
        });

        it('should filter by ID', () => {
            const result = filterSpaces(spaces, '102');
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('102');
        });

        it('should filter by data field value', () => {
            const result = filterSpaces(spaces, 'Alice');
            expect(result.length).toBe(1);
            expect(result[0].data.Name).toBe('Alice');
        });

        it('should be case insensitive', () => {
            const result = filterSpaces(spaces, 'CHARLIE');
            expect(result.length).toBe(1);
        });

        it('should apply field filters', () => {
            const result = filterSpaces(spaces, undefined, { Department: 'Engineering' });
            expect(result.length).toBe(2);
            expect(result.every(s => s.data.Department === 'Engineering')).toBe(true);
        });

        it('should combine search and field filters', () => {
            const result = filterSpaces(spaces, 'Floor', { Floor: '1' });
            expect(result.length).toBe(0); // "Floor" doesn't appear in values, only in keys
        });

        it('should ignore empty filter values', () => {
            const result = filterSpaces(spaces, undefined, { Department: '' });
            expect(result.length).toBe(3);
        });

        it('should match partial strings', () => {
            const result = filterSpaces(spaces, 'Eng');
            expect(result.length).toBe(2);
        });
    });

    describe('getUniqueFieldValues', () => {
        const spaces: Space[] = [
            { id: '1', data: { Department: 'Engineering', Floor: '1' } },
            { id: '2', data: { Department: 'Marketing', Floor: '2' } },
            { id: '3', data: { Department: 'Engineering', Floor: '1' } },
            { id: '4', data: { Department: 'Sales', Floor: '3' } },
        ];

        it('should return unique values', () => {
            const result = getUniqueFieldValues(spaces, 'Department');
            expect(result).toEqual(['Engineering', 'Marketing', 'Sales']);
        });

        it('should return sorted values', () => {
            const result = getUniqueFieldValues(spaces, 'Floor');
            expect(result).toEqual(['1', '2', '3']);
        });

        it('should handle missing field', () => {
            const result = getUniqueFieldValues(spaces, 'NonExistent');
            expect(result).toEqual([]);
        });

        it('should skip empty values', () => {
            const spacesWithEmpty: Space[] = [
                { id: '1', data: { Dept: 'A' } },
                { id: '2', data: { Dept: '' } },
                { id: '3', data: { Dept: 'B' } },
            ];
            const result = getUniqueFieldValues(spacesWithEmpty, 'Dept');
            expect(result).toEqual(['A', 'B']);
        });

        it('should handle empty spaces list', () => {
            const result = getUniqueFieldValues([], 'Department');
            expect(result).toEqual([]);
        });
    });
});

describe('Space Domain Validation', () => {
    const csvConfig: CSVConfig = {
        delimiter: ';',
        columns: [
            { index: 0, name: 'Name', required: true },
            { index: 1, name: 'Department', required: false },
        ],
        mapping: {},
        conferenceEnabled: false,
    };

    describe('validateSpace', () => {
        it('should reject missing ID', () => {
            const result = validateSpace({ data: { Name: 'Test' } }, csvConfig);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'id' })
            );
        });

        it('should reject empty ID', () => {
            const result = validateSpace({ id: '  ', data: { Name: 'Test' } }, csvConfig);
            expect(result.valid).toBe(false);
        });

        it('should reject missing required field', () => {
            const result = validateSpace({ id: '101', data: { Name: '' } }, csvConfig);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'Name' })
            );
        });

        it('should allow missing optional field', () => {
            const result = validateSpace({ id: '101', data: { Name: 'Test' } }, csvConfig);
            expect(result.valid).toBe(true);
        });

        it('should accept valid space', () => {
            const result = validateSpace({
                id: '101',
                data: { Name: 'Test', Department: 'Engineering' },
            }, csvConfig);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('validateSpaceListName', () => {
        it('should reject empty name', () => {
            const result = validateSpaceListName('');
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('required') })
            );
        });

        it('should reject whitespace-only name', () => {
            const result = validateSpaceListName('   ');
            expect(result.valid).toBe(false);
        });

        it('should reject name longer than 50 characters', () => {
            const longName = 'a'.repeat(51);
            const result = validateSpaceListName(longName);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('50 characters') })
            );
        });

        it('should accept valid name', () => {
            const result = validateSpaceListName('My Space List');
            expect(result.valid).toBe(true);
        });

        it('should accept name with exactly 50 characters', () => {
            const result = validateSpaceListName('a'.repeat(50));
            expect(result.valid).toBe(true);
        });
    });

    describe('isSpaceIdUnique', () => {
        const spaces: Space[] = [
            { id: '101', data: {} },
            { id: '102', data: {} },
        ];

        it('should return true for unique ID', () => {
            const result = isSpaceIdUnique('103', spaces);
            expect(result).toBe(true);
        });

        it('should return false for existing ID', () => {
            const result = isSpaceIdUnique('101', spaces);
            expect(result).toBe(false);
        });

        it('should exclude specified ID from check', () => {
            const result = isSpaceIdUnique('101', spaces, '101');
            expect(result).toBe(true);
        });

        it('should handle empty spaces list', () => {
            const result = isSpaceIdUnique('101', []);
            expect(result).toBe(true);
        });
    });
});
