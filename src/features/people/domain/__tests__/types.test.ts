/**
 * People Domain Types Tests
 * Phase 10.24 - Deep Testing System
 * 
 * Tests the people domain helper functions and validation
 */

import {
    getPersonListNames,
    getPersonListSpaceId,
    isPersonInList,
    setPersonListMembership,
    removePersonFromList,
    getVirtualSpaceId,
    toStorageName,
    toDisplayName,
    validateListName,
    LIST_NAME_MAX_LENGTH,
    type Person,
} from '../types';

describe('People Domain Types', () => {
    describe('getPersonListNames', () => {
        it('should return list names from listMemberships', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [
                    { listName: 'Team_A' },
                    { listName: 'Team_B' },
                ],
            };

            const names = getPersonListNames(person);

            expect(names).toEqual(['Team_A', 'Team_B']);
        });

        it('should return legacy listName if no listMemberships', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listName: 'Legacy_List',
            };

            const names = getPersonListNames(person);

            expect(names).toEqual(['Legacy_List']);
        });

        it('should return empty array if no lists', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
            };

            const names = getPersonListNames(person);

            expect(names).toEqual([]);
        });

        it('should prefer listMemberships over legacy listName', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [{ listName: 'New_List' }],
                listName: 'Old_List',
            };

            const names = getPersonListNames(person);

            expect(names).toEqual(['New_List']);
        });
    });

    describe('getPersonListSpaceId', () => {
        it('should return spaceId from listMemberships', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [
                    { listName: 'Team_A', spaceId: 'S01' },
                    { listName: 'Team_B', spaceId: 'S02' },
                ],
            };

            const spaceId = getPersonListSpaceId(person, 'Team_A');

            expect(spaceId).toBe('S01');
        });

        it('should return undefined for non-existent list', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [{ listName: 'Team_A', spaceId: 'S01' }],
            };

            const spaceId = getPersonListSpaceId(person, 'Non_Existent');

            expect(spaceId).toBeUndefined();
        });

        it('should return undefined when membership has no spaceId', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [{ listName: 'Team_A' }],
            };

            const spaceId = getPersonListSpaceId(person, 'Team_A');

            expect(spaceId).toBeUndefined();
        });

        it('should fallback to legacy listSpaceId', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listName: 'Legacy_List',
                listSpaceId: 'S99',
            };

            const spaceId = getPersonListSpaceId(person, 'Legacy_List');

            expect(spaceId).toBe('S99');
        });
    });

    describe('isPersonInList', () => {
        it('should return true when person is in list via listMemberships', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [{ listName: 'Team_A' }],
            };

            expect(isPersonInList(person, 'Team_A')).toBe(true);
        });

        it('should return false when person is not in list', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [{ listName: 'Team_A' }],
            };

            expect(isPersonInList(person, 'Team_B')).toBe(false);
        });

        it('should check legacy listName as fallback', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listName: 'Legacy_List',
            };

            expect(isPersonInList(person, 'Legacy_List')).toBe(true);
            expect(isPersonInList(person, 'Other_List')).toBe(false);
        });

        it('should return false for person with no lists', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
            };

            expect(isPersonInList(person, 'Any_List')).toBe(false);
        });
    });

    describe('setPersonListMembership', () => {
        it('should add new list membership', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
            };

            const updated = setPersonListMembership(person, 'Team_A', 'S01');

            expect(updated.listMemberships).toHaveLength(1);
            expect(updated.listMemberships?.[0]).toEqual({ listName: 'Team_A', spaceId: 'S01' });
        });

        it('should update existing list membership', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [{ listName: 'Team_A', spaceId: 'S01' }],
            };

            const updated = setPersonListMembership(person, 'Team_A', 'S02');

            expect(updated.listMemberships).toHaveLength(1);
            expect(updated.listMemberships?.[0].spaceId).toBe('S02');
        });

        it('should add to existing memberships without affecting others', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [{ listName: 'Team_A', spaceId: 'S01' }],
            };

            const updated = setPersonListMembership(person, 'Team_B', 'S02');

            expect(updated.listMemberships).toHaveLength(2);
            expect(updated.listMemberships).toContainEqual({ listName: 'Team_A', spaceId: 'S01' });
            expect(updated.listMemberships).toContainEqual({ listName: 'Team_B', spaceId: 'S02' });
        });

        it('should clear legacy fields', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listName: 'Legacy',
                listSpaceId: 'S99',
            };

            const updated = setPersonListMembership(person, 'New_List', 'S01');

            expect(updated.listName).toBeUndefined();
            expect(updated.listSpaceId).toBeUndefined();
        });

        it('should allow undefined spaceId', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
            };

            const updated = setPersonListMembership(person, 'Unassigned_Team');

            expect(updated.listMemberships?.[0].spaceId).toBeUndefined();
        });
    });

    describe('removePersonFromList', () => {
        it('should remove list membership', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [
                    { listName: 'Team_A' },
                    { listName: 'Team_B' },
                ],
            };

            const updated = removePersonFromList(person, 'Team_A');

            expect(updated.listMemberships).toHaveLength(1);
            expect(updated.listMemberships?.[0].listName).toBe('Team_B');
        });

        it('should set listMemberships to undefined when last membership removed', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [{ listName: 'Team_A' }],
            };

            const updated = removePersonFromList(person, 'Team_A');

            expect(updated.listMemberships).toBeUndefined();
        });

        it('should handle removing non-existent list', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listMemberships: [{ listName: 'Team_A' }],
            };

            const updated = removePersonFromList(person, 'Non_Existent');

            expect(updated.listMemberships).toHaveLength(1);
        });

        it('should clear legacy fields if they match', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listName: 'Legacy',
                listSpaceId: 'S99',
            };

            const updated = removePersonFromList(person, 'Legacy');

            expect(updated.listName).toBeUndefined();
            expect(updated.listSpaceId).toBeUndefined();
        });

        it('should not clear legacy fields if they do not match', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                listName: 'Other_Legacy',
                listSpaceId: 'S88',
                listMemberships: [{ listName: 'Team_A' }],
            };

            const updated = removePersonFromList(person, 'Team_A');

            expect(updated.listName).toBe('Other_Legacy');
            expect(updated.listSpaceId).toBe('S88');
        });
    });

    describe('getVirtualSpaceId', () => {
        it('should return virtualSpaceId if set', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                virtualSpaceId: 'POOL-0001',
            };

            expect(getVirtualSpaceId(person)).toBe('POOL-0001');
        });

        it('should fallback to assignedSpaceId if no virtualSpaceId', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                assignedSpaceId: 'S01',
            };

            expect(getVirtualSpaceId(person)).toBe('S01');
        });

        it('should fallback to person id if no other IDs', () => {
            const person: Person = {
                id: 'person-uuid-123',
                data: { name: 'John' },
            };

            expect(getVirtualSpaceId(person)).toBe('person-uuid-123');
        });

        it('should prefer virtualSpaceId over assignedSpaceId', () => {
            const person: Person = {
                id: 'person-1',
                data: { name: 'John' },
                virtualSpaceId: 'POOL-0001',
                assignedSpaceId: 'S01',
            };

            expect(getVirtualSpaceId(person)).toBe('POOL-0001');
        });
    });

    describe('toStorageName', () => {
        it('should convert spaces to underscores', () => {
            expect(toStorageName('Team Alpha')).toBe('Team_Alpha');
        });

        it('should handle multiple spaces', () => {
            expect(toStorageName('My  Cool   Team')).toBe('My_Cool_Team');
        });

        it('should trim whitespace', () => {
            expect(toStorageName('  Team Beta  ')).toBe('Team_Beta');
        });

        it('should handle single word', () => {
            expect(toStorageName('Team')).toBe('Team');
        });

        it('should handle Hebrew text', () => {
            expect(toStorageName('צוות אלפא')).toBe('צוות_אלפא');
        });
    });

    describe('toDisplayName', () => {
        it('should convert underscores to spaces', () => {
            expect(toDisplayName('Team_Alpha')).toBe('Team Alpha');
        });

        it('should handle multiple underscores', () => {
            expect(toDisplayName('My_Cool_Team')).toBe('My Cool Team');
        });

        it('should handle single word', () => {
            expect(toDisplayName('Team')).toBe('Team');
        });

        it('should handle Hebrew text', () => {
            expect(toDisplayName('צוות_אלפא')).toBe('צוות אלפא');
        });
    });

    describe('validateListName', () => {
        it('should accept valid name', () => {
            const result = validateListName('Team Alpha');
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should accept Hebrew names', () => {
            const result = validateListName('צוות אלפא');
            expect(result.valid).toBe(true);
        });

        it('should accept mixed English and Hebrew', () => {
            const result = validateListName('Team צוות 1');
            expect(result.valid).toBe(true);
        });

        it('should accept numbers', () => {
            const result = validateListName('Team 123');
            expect(result.valid).toBe(true);
        });

        it('should reject empty name', () => {
            const result = validateListName('');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('List name is required');
        });

        it('should reject whitespace-only name', () => {
            const result = validateListName('   ');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('List name is required');
        });

        it('should reject name exceeding max length', () => {
            const longName = 'A'.repeat(LIST_NAME_MAX_LENGTH + 1);
            const result = validateListName(longName);
            expect(result.valid).toBe(false);
            expect(result.error).toContain(`Max ${LIST_NAME_MAX_LENGTH} characters`);
        });

        it('should accept name at max length', () => {
            const maxName = 'A'.repeat(LIST_NAME_MAX_LENGTH);
            const result = validateListName(maxName);
            expect(result.valid).toBe(true);
        });

        it('should reject special characters', () => {
            const result = validateListName('Team@#$');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Only letters, numbers, and spaces allowed');
        });

        it('should reject underscores in input', () => {
            const result = validateListName('Team_Alpha');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Only letters, numbers, and spaces allowed');
        });

        it('should reject hyphen', () => {
            const result = validateListName('Team-Alpha');
            expect(result.valid).toBe(false);
        });
    });
});
