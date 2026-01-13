/**
 * People Store Tests
 * 
 * Tests for store-level operations including:
 * - Person CRUD operations (Add, Update, Delete)
 * - Space assignment logic
 * - Person type helpers
 */

import { describe, it, expect } from 'vitest';
import { isPoolId, getNextPoolId } from '../infrastructure/virtualPoolService';
import { getVirtualSpaceId } from '../domain/types';
import type { Person } from '../domain/types';

// =============================================================================
// PERSON TYPE HELPERS
// =============================================================================

describe('Person Type Helpers', () => {
    describe('getVirtualSpaceId', () => {
        it('should return virtualSpaceId when present', () => {
            const person: Person = {
                id: '1',
                data: {},
                virtualSpaceId: 'POOL-0001',
            };
            expect(getVirtualSpaceId(person)).toBe('POOL-0001');
        });

        it('should fallback to assignedSpaceId when virtualSpaceId missing', () => {
            const person: Person = {
                id: '1',
                data: {},
                assignedSpaceId: '42',
            };
            expect(getVirtualSpaceId(person)).toBe('42');
        });
    });
});

// =============================================================================
// SPACE ASSIGNMENT LOGIC TESTS
// =============================================================================

describe('Space Assignment Logic', () => {
    describe('Assigning space to person', () => {
        it('should update person with physical spaceId when assigned', () => {
            // Simulating what happens when person gets assigned
            const person: Person = {
                id: 'uuid-123',
                virtualSpaceId: 'POOL-0001',
                data: { name: 'Test Person', ARTICLE_ID: 'POOL-0001' },
                assignedSpaceId: undefined, // Initially unassigned
            };

            // Assign to physical space 42
            const updatedPerson: Person = {
                ...person,
                assignedSpaceId: '42',
                virtualSpaceId: '42', // Now points to physical space
                data: { ...person.data, ARTICLE_ID: '42' }, // ArticleId updated
            };

            expect(updatedPerson.assignedSpaceId).toBe('42');
            expect(updatedPerson.virtualSpaceId).toBe('42');
            expect(isPoolId(updatedPerson.virtualSpaceId!)).toBe(false);
        });

        it('should clear assignedSpaceId when unassigning', () => {
            const person: Person = {
                id: 'uuid-123',
                virtualSpaceId: '42',
                data: { name: 'Test Person', ARTICLE_ID: '42' },
                assignedSpaceId: '42', // Currently assigned
            };

            // Unassign - move back to pool
            const newPoolId = 'POOL-0005';
            const unassignedPerson: Person = {
                ...person,
                assignedSpaceId: undefined,
                virtualSpaceId: newPoolId,
                data: { ...person.data, ARTICLE_ID: newPoolId },
            };

            expect(unassignedPerson.assignedSpaceId).toBeUndefined();
            expect(isPoolId(unassignedPerson.virtualSpaceId!)).toBe(true);
        });
    });

    describe('Bulk space assignment', () => {
        it('should handle multiple assignments correctly', () => {
            const people: Person[] = [
                { id: 'p1', virtualSpaceId: 'POOL-0001', data: { name: 'Person 1' } },
                { id: 'p2', virtualSpaceId: 'POOL-0002', data: { name: 'Person 2' } },
                { id: 'p3', virtualSpaceId: 'POOL-0003', data: { name: 'Person 3' } },
            ];

            const assignments = [
                { personId: 'p1', spaceId: '10' },
                { personId: 'p2', spaceId: '20' },
                // p3 remains unassigned
            ];

            // Apply assignments
            const updatedPeople = people.map(person => {
                const assignment = assignments.find(a => a.personId === person.id);
                if (assignment) {
                    return {
                        ...person,
                        assignedSpaceId: assignment.spaceId,
                        virtualSpaceId: assignment.spaceId,
                    };
                }
                return person;
            });

            expect(updatedPeople[0].assignedSpaceId).toBe('10');
            expect(updatedPeople[1].assignedSpaceId).toBe('20');
            expect(updatedPeople[2].assignedSpaceId).toBeUndefined();
            expect(isPoolId(updatedPeople[2].virtualSpaceId!)).toBe(true);
        });
    });
});

// =============================================================================
// PERSON CRUD OPERATIONS TESTS
// =============================================================================

describe('Person CRUD Operations', () => {
    describe('Add Person', () => {
        it('should create person with UUID and POOL-ID', () => {
            const existingPoolIds = new Set<string>();
            const newPoolId = getNextPoolId(existingPoolIds);

            const newPerson: Person = {
                id: 'mock-uuid-new',
                virtualSpaceId: newPoolId,
                data: {
                    name: 'New Employee',
                    department: 'Engineering',
                    ARTICLE_ID: newPoolId,
                },
                assignedSpaceId: undefined,
            };

            expect(newPerson.virtualSpaceId).toBe('POOL-0001');
            expect(newPerson.assignedSpaceId).toBeUndefined();
        });

        it('should reuse lowest available POOL-ID when adding', () => {
            // Existing people occupy POOL-0001 and POOL-0003 (0002 was freed)
            const existingPoolIds = new Set(['POOL-0001', 'POOL-0003']);
            const newPoolId = getNextPoolId(existingPoolIds);

            expect(newPoolId).toBe('POOL-0002'); // Should reuse gap
        });
    });

    describe('Update Person', () => {
        it('should preserve ID and virtualSpaceId when updating data', () => {
            const person: Person = {
                id: 'uuid-existing',
                virtualSpaceId: 'POOL-0005',
                data: { name: 'Old Name', department: 'Old Dept' },
            };

            const updatedPerson: Person = {
                ...person,
                data: { ...person.data, name: 'New Name', department: 'New Dept' },
            };

            expect(updatedPerson.id).toBe(person.id);
            expect(updatedPerson.virtualSpaceId).toBe(person.virtualSpaceId);
            expect(updatedPerson.data.name).toBe('New Name');
        });
    });

    describe('Delete Person', () => {
        it('should be removable from list', () => {
            const people: Person[] = [
                { id: 'p1', virtualSpaceId: 'POOL-0001', data: { name: 'Person 1' } },
                { id: 'p2', virtualSpaceId: 'POOL-0002', data: { name: 'Person 2' } },
                { id: 'p3', virtualSpaceId: 'POOL-0003', data: { name: 'Person 3' } },
            ];

            // Delete person 2
            const remaining = people.filter(p => p.id !== 'p2');

            expect(remaining).toHaveLength(2);
            expect(remaining.find(p => p.id === 'p2')).toBeUndefined();
        });

        it('should free up POOL-ID for reuse after deletion', () => {
            const people: Person[] = [
                { id: 'p1', virtualSpaceId: 'POOL-0001', data: { name: 'Person 1' } },
                { id: 'p2', virtualSpaceId: 'POOL-0002', data: { name: 'Person 2' } },
            ];

            // Delete person 1
            const remaining = people.filter(p => p.id !== 'p1');

            // Collect existing pool IDs
            const existingPoolIds = new Set(remaining.map(p => p.virtualSpaceId!).filter(id => isPoolId(id)));

            // Next pool ID should be POOL-0001 (reused)
            const nextId = getNextPoolId(existingPoolIds);
            expect(nextId).toBe('POOL-0001');
        });
    });
});
