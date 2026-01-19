import { describe, it, expect } from 'vitest';
import {
    validateSpace,
    validateSpaceListName,
    isSpaceIdUnique,
} from './validation';
import type { Space, CSVConfig } from '@shared/domain/types';

describe('Space Validation', () => {
    const testCsvConfig: CSVConfig = {
        delimiter: ',',
        columns: [
            { index: 0, name: 'Name', required: true },
            { index: 1, name: 'Floor', required: false },
            { index: 2, name: 'Description', required: true },
        ],
        mapping: { Name: 0, Floor: 1, Description: 2 },
        conferenceEnabled: false,
    };

    describe('validateSpace', () => {
        it('should return valid for complete space', () => {
            const space: Partial<Space> = {
                id: 'room-1',
                data: {
                    Name: 'Conference Room',
                    Floor: '2nd',
                    Description: 'Large meeting room',
                },
            };
            
            const result = validateSpace(space, testCsvConfig);
            
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should fail when ID is missing', () => {
            const space: Partial<Space> = {
                data: { Name: 'Test' },
            };
            
            const result = validateSpace(space, testCsvConfig);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'id')).toBe(true);
        });

        it('should fail when ID is empty string', () => {
            const space: Partial<Space> = {
                id: '  ',
                data: { Name: 'Test' },
            };
            
            const result = validateSpace(space, testCsvConfig);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'id')).toBe(true);
        });

        it('should fail when required field is missing', () => {
            const space: Partial<Space> = {
                id: 'room-1',
                data: {
                    Floor: '2nd',
                    // Missing required Name and Description
                },
            };
            
            const result = validateSpace(space, testCsvConfig);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'Name')).toBe(true);
            expect(result.errors.some(e => e.field === 'Description')).toBe(true);
        });

        it('should fail when required field is empty', () => {
            const space: Partial<Space> = {
                id: 'room-1',
                data: {
                    Name: '',
                    Description: 'Valid',
                },
            };
            
            const result = validateSpace(space, testCsvConfig);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'Name')).toBe(true);
        });

        it('should allow empty optional fields', () => {
            const space: Partial<Space> = {
                id: 'room-1',
                data: {
                    Name: 'Test Room',
                    Floor: '', // Optional, can be empty
                    Description: 'A room',
                },
            };
            
            const result = validateSpace(space, testCsvConfig);
            
            expect(result.valid).toBe(true);
        });

        it('should handle missing data object', () => {
            const space: Partial<Space> = {
                id: 'room-1',
            };
            
            const result = validateSpace(space, testCsvConfig);
            
            // Only ID validation should run
            expect(result.valid).toBe(true);
        });

        it('should collect multiple errors', () => {
            const space: Partial<Space> = {
                id: '',
                data: {
                    Name: '',
                    Description: '',
                },
            };
            
            const result = validateSpace(space, testCsvConfig);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('validateSpaceListName', () => {
        it('should return valid for normal name', () => {
            const result = validateSpaceListName('My Space List');
            
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should fail for empty name', () => {
            const result = validateSpaceListName('');
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'name')).toBe(true);
        });

        it('should fail for whitespace-only name', () => {
            const result = validateSpaceListName('   ');
            
            expect(result.valid).toBe(false);
        });

        it('should fail for name exceeding 50 characters', () => {
            const longName = 'A'.repeat(51);
            const result = validateSpaceListName(longName);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('50 characters'))).toBe(true);
        });

        it('should allow name with exactly 50 characters', () => {
            const maxName = 'A'.repeat(50);
            const result = validateSpaceListName(maxName);
            
            expect(result.valid).toBe(true);
        });

        it('should allow Hebrew characters', () => {
            const result = validateSpaceListName('רשימת חדרים');
            
            expect(result.valid).toBe(true);
        });

        it('should allow numbers in name', () => {
            const result = validateSpaceListName('Floor 1 Rooms');
            
            expect(result.valid).toBe(true);
        });
    });

    describe('isSpaceIdUnique', () => {
        const testSpaces: Space[] = [
            { id: 'room-1', data: {} },
            { id: 'room-2', data: {} },
            { id: 'room-3', data: {} },
        ];

        it('should return true for unique ID', () => {
            const result = isSpaceIdUnique('room-4', testSpaces);
            expect(result).toBe(true);
        });

        it('should return false for duplicate ID', () => {
            const result = isSpaceIdUnique('room-1', testSpaces);
            expect(result).toBe(false);
        });

        it('should exclude ID when updating', () => {
            const result = isSpaceIdUnique('room-1', testSpaces, 'room-1');
            expect(result).toBe(true);
        });

        it('should still check other IDs when excludeId provided', () => {
            const result = isSpaceIdUnique('room-2', testSpaces, 'room-1');
            expect(result).toBe(false);
        });

        it('should return true for empty spaces list', () => {
            const result = isSpaceIdUnique('any-id', []);
            expect(result).toBe(true);
        });

        it('should handle undefined excludeId', () => {
            const result = isSpaceIdUnique('room-1', testSpaces, undefined);
            expect(result).toBe(false);
        });
    });
});
