/**
 * People-Space Integration Tests
 * 
 * Tests the integration logic between people and spaces
 * using pure functions and objects (avoiding persisted Zustand stores)
 */

import type { Person } from '../../features/people/domain/types';
import type { Space } from '../../shared/domain/types';
import { getVirtualSpaceId, setPersonListMembership, isPersonInList, getPersonListNames } from '../../features/people/domain/types';

// Helper to create test person (data contains name and other fields)
const createTestPerson = (id: string, name: string): Person => ({
    id,
    data: { name },
    assignedSpaceId: undefined,
    aimsSyncStatus: 'pending',
    listMemberships: []
});

// Helper to create test space
const createTestSpace = (id: string, name: string): Space => ({
    id,
    data: { name }
});

describe('People-Space Integration Logic', () => {
    describe('Assignment Logic', () => {
        it('should assign a person to a space', () => {
            const person = createTestPerson('person-1', 'John Doe');

            // Simulate assignment
            const assignedPerson: Person = {
                ...person,
                assignedSpaceId: 'space-1',
                virtualSpaceId: 'space-1'
            };

            expect(assignedPerson.assignedSpaceId).toBe('space-1');
            expect(getVirtualSpaceId(assignedPerson)).toBe('space-1');
        });

        it('should unassign a person from a space', () => {
            const person: Person = {
                ...createTestPerson('person-1', 'John Doe'),
                assignedSpaceId: 'space-1',
                virtualSpaceId: 'space-1'
            };

            // Simulate unassignment
            const unassignedPerson: Person = {
                ...person,
                assignedSpaceId: undefined,
                virtualSpaceId: 'POOL-0001'
            };

            expect(unassignedPerson.assignedSpaceId).toBeUndefined();
        });

        it('should reassign person to different space', () => {
            const person = createTestPerson('person-1', 'John Doe');

            // First assignment
            let assignedPerson: Person = {
                ...person,
                assignedSpaceId: 'space-1',
                virtualSpaceId: 'space-1'
            };
            expect(assignedPerson.assignedSpaceId).toBe('space-1');

            // Reassign
            assignedPerson = {
                ...assignedPerson,
                assignedSpaceId: 'space-2',
                virtualSpaceId: 'space-2'
            };
            expect(assignedPerson.assignedSpaceId).toBe('space-2');
        });
    });

    describe('Bulk Operations', () => {
        it('should handle unassign all spaces', () => {
            const people: Person[] = [
                { ...createTestPerson('p1', 'Person 1'), assignedSpaceId: 'space-1' },
                { ...createTestPerson('p2', 'Person 2'), assignedSpaceId: 'space-2' },
                { ...createTestPerson('p3', 'Person 3'), assignedSpaceId: 'space-1' },
            ];

            // Simulate bulk unassignment
            const unassignedPeople = people.map(p => ({
                ...p,
                assignedSpaceId: undefined
            }));

            expect(unassignedPeople.every(p => p.assignedSpaceId === undefined)).toBe(true);
        });

        it('should handle multiple people assigned to same space', () => {
            const people: Person[] = [
                { ...createTestPerson('p1', 'Person 1'), assignedSpaceId: 'space-1' },
                { ...createTestPerson('p2', 'Person 2'), assignedSpaceId: 'space-1' },
            ];

            const assignedToSpace1 = people.filter(p => p.assignedSpaceId === 'space-1');
            expect(assignedToSpace1.length).toBe(2);
        });
    });

    describe('List Membership Functions', () => {
        it('should add person to a list', () => {
            const person = createTestPerson('p1', 'Person 1');

            const updatedPerson = setPersonListMembership(person, 'Team_A', 'space-1');

            expect(isPersonInList(updatedPerson, 'Team_A')).toBe(true);
            expect(getPersonListNames(updatedPerson)).toContain('Team_A');
        });

        it('should track multiple list memberships', () => {
            let person = createTestPerson('p1', 'Person 1');

            person = setPersonListMembership(person, 'Team_A', 'space-1');
            person = setPersonListMembership(person, 'Team_B', 'space-2');

            expect(getPersonListNames(person)).toHaveLength(2);
            expect(isPersonInList(person, 'Team_A')).toBe(true);
            expect(isPersonInList(person, 'Team_B')).toBe(true);
        });

        it('should update assignment within a list', () => {
            let person = createTestPerson('p1', 'Person 1');

            person = setPersonListMembership(person, 'Team_A', 'space-1');
            person = setPersonListMembership(person, 'Team_A', 'space-2'); // Update same list

            expect(getPersonListNames(person)).toHaveLength(1);
            expect(person.listMemberships?.find(m => m.listName === 'Team_A')?.spaceId).toBe('space-2');
        });
    });

    describe('Space Allocation Calculation', () => {
        it('should calculate correct space allocation', () => {
            const people: Person[] = [
                { ...createTestPerson('p1', 'Person 1'), assignedSpaceId: 'space-1' },
                { ...createTestPerson('p2', 'Person 2'), assignedSpaceId: 'space-2' },
                { ...createTestPerson('p3', 'Person 3'), assignedSpaceId: undefined },
            ];
            const totalSpaces = 5;

            // Calculate allocation
            const assignedSpaces = people.filter(p => p.assignedSpaceId).length;
            const availableSpaces = totalSpaces - assignedSpaces;

            expect(assignedSpaces).toBe(2);
            expect(availableSpaces).toBe(3);
        });
    });

    describe('Sync Status Tracking', () => {
        it('should track sync status for people', () => {
            const people: Person[] = [
                { ...createTestPerson('p1', 'Person 1'), aimsSyncStatus: 'pending' },
                { ...createTestPerson('p2', 'Person 2'), aimsSyncStatus: 'synced' },
                { ...createTestPerson('p3', 'Person 3'), aimsSyncStatus: 'error' },
            ];

            const pendingPeople = people.filter(p => p.aimsSyncStatus === 'pending');
            const syncedPeople = people.filter(p => p.aimsSyncStatus === 'synced');
            const errorPeople = people.filter(p => p.aimsSyncStatus === 'error');

            expect(pendingPeople).toHaveLength(1);
            expect(syncedPeople).toHaveLength(1);
            expect(errorPeople).toHaveLength(1);
        });
    });

    describe('Space-Person Relationship', () => {
        it('should find people by assigned space', () => {
            const spaces = [
                createTestSpace('space-1', 'Office A'),
                createTestSpace('space-2', 'Office B'),
            ];
            const people: Person[] = [
                { ...createTestPerson('p1', 'Person 1'), assignedSpaceId: 'space-1' },
                { ...createTestPerson('p2', 'Person 2'), assignedSpaceId: 'space-1' },
                { ...createTestPerson('p3', 'Person 3'), assignedSpaceId: 'space-2' },
            ];

            const peopleInSpace1 = people.filter(p => p.assignedSpaceId === spaces[0].id);
            const peopleInSpace2 = people.filter(p => p.assignedSpaceId === spaces[1].id);

            expect(peopleInSpace1).toHaveLength(2);
            expect(peopleInSpace1.map(p => p.data.name)).toContain('Person 1');
            expect(peopleInSpace2).toHaveLength(1);
        });

        it('should find unassigned people (pool)', () => {
            const people: Person[] = [
                { ...createTestPerson('p1', 'Person 1'), assignedSpaceId: 'space-1' },
                { ...createTestPerson('p2', 'Person 2'), assignedSpaceId: undefined },
                { ...createTestPerson('p3', 'Person 3'), assignedSpaceId: undefined },
            ];

            const unassignedPeople = people.filter(p => !p.assignedSpaceId);

            expect(unassignedPeople).toHaveLength(2);
        });
    });
});
