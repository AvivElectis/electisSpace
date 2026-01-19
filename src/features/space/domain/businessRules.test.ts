import { describe, it, expect } from 'vitest';
import {
    generateSpaceId,
    mergeSpaceDefaults,
    filterSpaces,
    getUniqueFieldValues,
} from './businessRules';
import type { Space, CSVConfig } from '@shared/domain/types';

describe('Space Business Rules', () => {
    const testCsvConfig: CSVConfig = {
        delimiter: ',',
        columns: [
            { index: 0, name: 'Name', required: true },
            { index: 1, name: 'Floor', required: false },
            { index: 2, name: 'Capacity', required: false },
        ],
        mapping: { Name: 0, Floor: 1, Capacity: 2 },
        conferenceEnabled: false,
    };

    describe('generateSpaceId', () => {
        it('should extract room number from name', () => {
            const result = generateSpaceId('Room 101', []);
            expect(result).toBe('101');
        });

        it('should use "1" for names without numbers', () => {
            const result = generateSpaceId('Main Hall', []);
            expect(result).toBe('1');
        });

        it('should ensure uniqueness with counter', () => {
            const result = generateSpaceId('Room 101', ['101']);
            expect(result).toBe('101-1');
        });

        it('should increment counter for multiple collisions', () => {
            const result = generateSpaceId('Room 101', ['101', '101-1', '101-2']);
            expect(result).toBe('101-3');
        });

        it('should handle empty existing IDs', () => {
            const result = generateSpaceId('Room 42', []);
            expect(result).toBe('42');
        });

        it('should extract first number from complex names', () => {
            const result = generateSpaceId('Floor 3 Room 201', []);
            expect(result).toBe('3');
        });
    });

    describe('mergeSpaceDefaults', () => {
        it('should add missing columns as empty strings', () => {
            const partial: Partial<Space> = {
                id: 'test-1',
                data: { Name: 'Test Room' },
            };
            
            const result = mergeSpaceDefaults(partial, testCsvConfig);
            
            expect(result.data.Name).toBe('Test Room');
            expect(result.data.Floor).toBe('');
            expect(result.data.Capacity).toBe('');
        });

        it('should preserve existing data values', () => {
            const partial: Partial<Space> = {
                id: 'test-1',
                data: {
                    Name: 'Room A',
                    Floor: '2nd',
                    Capacity: '10',
                },
            };
            
            const result = mergeSpaceDefaults(partial, testCsvConfig);
            
            expect(result.data.Name).toBe('Room A');
            expect(result.data.Floor).toBe('2nd');
            expect(result.data.Capacity).toBe('10');
        });

        it('should use empty ID if not provided', () => {
            const partial: Partial<Space> = {
                data: { Name: 'Test' },
            };
            
            const result = mergeSpaceDefaults(partial, testCsvConfig);
            
            expect(result.id).toBe('');
        });

        it('should preserve optional fields', () => {
            const partial: Partial<Space> = {
                id: 'test-1',
                data: { Name: 'Test' },
                labelCode: 'LC001',
                templateName: 'template-1',
            };
            
            const result = mergeSpaceDefaults(partial, testCsvConfig);
            
            expect(result.labelCode).toBe('LC001');
            expect(result.templateName).toBe('template-1');
        });
    });

    describe('filterSpaces', () => {
        const testSpaces: Space[] = [
            { id: '101', data: { Name: 'Conference Room A', Floor: '1st', Capacity: '20' } },
            { id: '102', data: { Name: 'Meeting Room B', Floor: '1st', Capacity: '10' } },
            { id: '201', data: { Name: 'Conference Room C', Floor: '2nd', Capacity: '15' } },
            { id: '301', data: { Name: 'Office Suite', Floor: '3rd', Capacity: '5' } },
        ];

        it('should return all spaces when no search or filters', () => {
            const result = filterSpaces(testSpaces);
            expect(result.length).toBe(4);
        });

        it('should filter by search query in ID', () => {
            const result = filterSpaces(testSpaces, '101');
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('101');
        });

        it('should filter by search query in Name', () => {
            const result = filterSpaces(testSpaces, 'Conference');
            expect(result.length).toBe(2);
        });

        it('should be case-insensitive', () => {
            const result = filterSpaces(testSpaces, 'CONFERENCE');
            expect(result.length).toBe(2);
        });

        it('should filter by field filters', () => {
            const result = filterSpaces(testSpaces, undefined, { Floor: '1st' });
            expect(result.length).toBe(2);
        });

        it('should combine search query and filters', () => {
            const result = filterSpaces(testSpaces, 'Conference', { Floor: '2nd' });
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('201');
        });

        it('should ignore empty search query', () => {
            const result = filterSpaces(testSpaces, '  ');
            expect(result.length).toBe(4);
        });

        it('should ignore empty filter values', () => {
            const result = filterSpaces(testSpaces, undefined, { Floor: '' });
            expect(result.length).toBe(4);
        });

        it('should return empty array when no matches', () => {
            const result = filterSpaces(testSpaces, 'NonExistent');
            expect(result.length).toBe(0);
        });
    });

    describe('getUniqueFieldValues', () => {
        const testSpaces: Space[] = [
            { id: '101', data: { Name: 'Room A', Floor: '1st', Status: 'Active' } },
            { id: '102', data: { Name: 'Room B', Floor: '1st', Status: 'Inactive' } },
            { id: '201', data: { Name: 'Room C', Floor: '2nd', Status: 'Active' } },
            { id: '301', data: { Name: 'Room D', Floor: '3rd', Status: '' } },
        ];

        it('should return unique values for a field', () => {
            const result = getUniqueFieldValues(testSpaces, 'Floor');
            expect(result).toEqual(['1st', '2nd', '3rd']);
        });

        it('should exclude empty values', () => {
            const result = getUniqueFieldValues(testSpaces, 'Status');
            expect(result).toEqual(['Active', 'Inactive']);
        });

        it('should sort values alphabetically', () => {
            const result = getUniqueFieldValues(testSpaces, 'Name');
            expect(result).toEqual(['Room A', 'Room B', 'Room C', 'Room D']);
        });

        it('should return empty array for non-existent field', () => {
            const result = getUniqueFieldValues(testSpaces, 'NonExistent');
            expect(result).toEqual([]);
        });

        it('should return empty array for empty spaces list', () => {
            const result = getUniqueFieldValues([], 'Floor');
            expect(result).toEqual([]);
        });

        it('should handle spaces without the field', () => {
            const spacesWithMissing: Space[] = [
                { id: '1', data: { Name: 'A' } },
                { id: '2', data: { Name: 'B', Floor: '1st' } },
            ];
            const result = getUniqueFieldValues(spacesWithMissing, 'Floor');
            expect(result).toEqual(['1st']);
        });
    });
});
