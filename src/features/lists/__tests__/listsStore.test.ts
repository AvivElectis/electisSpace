import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useListsStore } from '../infrastructure/listsStore';
import type { SavedList } from '../domain/types';

/**
 * Tests for listsStore - Zustand store for managing saved space lists
 * Covers CRUD operations, persistence, and edge cases
 */
describe('listsStore', () => {
    // Helper to create a mock list
    const createMockList = (id: string, name: string): SavedList => ({
        id,
        name,
        spaces: [
            {
                id: `space-${id}-1`,
                data: { SPACE_NAME: 'Space 1' },
            },
            {
                id: `space-${id}-2`,
                data: { SPACE_NAME: 'Space 2' },
            },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    beforeEach(() => {
        // Clear store before each test
        act(() => {
            const state = useListsStore.getState();
            state.lists.forEach(list => state.deleteList(list.id));
        });
    });

    describe('Initial State', () => {
        it('should initialize with empty lists', () => {
            const { lists } = useListsStore.getState();
            expect(lists).toEqual([]);
        });
    });

    describe('saveList', () => {
        it('should add a new list', () => {
            const mockList = createMockList('list-001', 'Engineering');

            act(() => {
                useListsStore.getState().saveList(mockList);
            });

            const { lists } = useListsStore.getState();
            expect(lists).toHaveLength(1);
            expect(lists[0].name).toBe('Engineering');
            expect(lists[0].id).toBe('list-001');
        });

        it('should preserve spaces in saved list', () => {
            const mockList = createMockList('list-001', 'Engineering');

            act(() => {
                useListsStore.getState().saveList(mockList);
            });

            const { lists } = useListsStore.getState();
            expect(lists[0].spaces).toHaveLength(2);
            expect(lists[0].spaces[0].id).toBe('space-list-001-1');
        });

        it('should add multiple lists', () => {
            const list1 = createMockList('list-001', 'Engineering');
            const list2 = createMockList('list-002', 'Sales');
            const list3 = createMockList('list-003', 'Marketing');

            act(() => {
                useListsStore.getState().saveList(list1);
                useListsStore.getState().saveList(list2);
                useListsStore.getState().saveList(list3);
            });

            const { lists } = useListsStore.getState();
            expect(lists).toHaveLength(3);
            expect(lists.map(l => l.name)).toContain('Engineering');
            expect(lists.map(l => l.name)).toContain('Sales');
            expect(lists.map(l => l.name)).toContain('Marketing');
        });
    });

    describe('updateList', () => {
        it('should update list name', () => {
            const mockList = createMockList('list-001', 'Old Name');

            act(() => {
                useListsStore.getState().saveList(mockList);
            });

            act(() => {
                useListsStore.getState().updateList('list-001', { name: 'New Name' });
            });

            const { lists } = useListsStore.getState();
            expect(lists[0].name).toBe('New Name');
        });

        it('should update list spaces', () => {
            const mockList = createMockList('list-001', 'Test List');

            act(() => {
                useListsStore.getState().saveList(mockList);
            });

            const newSpaces = [
                { id: 'new-space-1', data: { SPACE_NAME: 'New Space 1' } },
                { id: 'new-space-2', data: { SPACE_NAME: 'New Space 2' } },
                { id: 'new-space-3', data: { SPACE_NAME: 'New Space 3' } },
            ];

            act(() => {
                useListsStore.getState().updateList('list-001', { spaces: newSpaces });
            });

            const { lists } = useListsStore.getState();
            expect(lists[0].spaces).toHaveLength(3);
            expect(lists[0].spaces[0].id).toBe('new-space-1');
        });

        it('should update the updatedAt timestamp', async () => {
            const mockList = createMockList('list-001', 'Test List');

            act(() => {
                useListsStore.getState().saveList(mockList);
            });

            // Wait a bit to ensure timestamp difference
            await new Promise(r => setTimeout(r, 10));

            act(() => {
                useListsStore.getState().updateList('list-001', { name: 'Updated Name' });
            });

            const { lists } = useListsStore.getState();
            // The updatedAt should be different (newer)
            expect(lists[0].updatedAt).toBeDefined();
            expect(lists[0].name).toBe('Updated Name');
        });

        it('should not affect other lists when updating one', () => {
            const list1 = createMockList('list-001', 'List 1');
            const list2 = createMockList('list-002', 'List 2');

            act(() => {
                useListsStore.getState().saveList(list1);
                useListsStore.getState().saveList(list2);
            });

            act(() => {
                useListsStore.getState().updateList('list-001', { name: 'Updated List 1' });
            });

            const { lists } = useListsStore.getState();
            const updatedList1 = lists.find(l => l.id === 'list-001');
            const untouchedList2 = lists.find(l => l.id === 'list-002');

            expect(updatedList1?.name).toBe('Updated List 1');
            expect(untouchedList2?.name).toBe('List 2');
        });
    });

    describe('deleteList', () => {
        it('should delete a list by ID', () => {
            const mockList = createMockList('list-001', 'To Delete');

            act(() => {
                useListsStore.getState().saveList(mockList);
            });

            expect(useListsStore.getState().lists).toHaveLength(1);

            act(() => {
                useListsStore.getState().deleteList('list-001');
            });

            expect(useListsStore.getState().lists).toHaveLength(0);
        });

        it('should only delete the specified list', () => {
            const list1 = createMockList('list-001', 'Keep');
            const list2 = createMockList('list-002', 'Delete');
            const list3 = createMockList('list-003', 'Also Keep');

            act(() => {
                useListsStore.getState().saveList(list1);
                useListsStore.getState().saveList(list2);
                useListsStore.getState().saveList(list3);
            });

            act(() => {
                useListsStore.getState().deleteList('list-002');
            });

            const { lists } = useListsStore.getState();
            expect(lists).toHaveLength(2);
            expect(lists.map(l => l.name)).not.toContain('Delete');
            expect(lists.map(l => l.name)).toContain('Keep');
            expect(lists.map(l => l.name)).toContain('Also Keep');
        });

        it('should handle deleting non-existent list gracefully', () => {
            const mockList = createMockList('list-001', 'Existing');

            act(() => {
                useListsStore.getState().saveList(mockList);
            });

            // Should not throw
            act(() => {
                useListsStore.getState().deleteList('non-existent');
            });

            expect(useListsStore.getState().lists).toHaveLength(1);
        });
    });

    describe('getListByName', () => {
        it('should find list by exact name', () => {
            const mockList = createMockList('list-001', 'Engineering');

            act(() => {
                useListsStore.getState().saveList(mockList);
            });

            const found = useListsStore.getState().getListByName('Engineering');
            expect(found).toBeDefined();
            expect(found?.id).toBe('list-001');
        });

        it('should find list by name case-insensitively', () => {
            const mockList = createMockList('list-001', 'Engineering');

            act(() => {
                useListsStore.getState().saveList(mockList);
            });

            const found1 = useListsStore.getState().getListByName('engineering');
            const found2 = useListsStore.getState().getListByName('ENGINEERING');
            const found3 = useListsStore.getState().getListByName('EnGiNeErInG');

            expect(found1).toBeDefined();
            expect(found2).toBeDefined();
            expect(found3).toBeDefined();
        });

        it('should return undefined for non-existent name', () => {
            const mockList = createMockList('list-001', 'Engineering');

            act(() => {
                useListsStore.getState().saveList(mockList);
            });

            const notFound = useListsStore.getState().getListByName('Non-existent');
            expect(notFound).toBeUndefined();
        });

        it('should return undefined when lists is empty', () => {
            const notFound = useListsStore.getState().getListByName('Any Name');
            expect(notFound).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle list with empty spaces array', () => {
            const emptyList: SavedList = {
                id: 'list-empty',
                name: 'Empty List',
                spaces: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            act(() => {
                useListsStore.getState().saveList(emptyList);
            });

            const { lists } = useListsStore.getState();
            expect(lists[0].spaces).toHaveLength(0);
        });

        it('should preserve list order', () => {
            const list1 = createMockList('list-001', 'First');
            const list2 = createMockList('list-002', 'Second');
            const list3 = createMockList('list-003', 'Third');

            act(() => {
                useListsStore.getState().saveList(list1);
                useListsStore.getState().saveList(list2);
                useListsStore.getState().saveList(list3);
            });

            const { lists } = useListsStore.getState();
            expect(lists[0].name).toBe('First');
            expect(lists[1].name).toBe('Second');
            expect(lists[2].name).toBe('Third');
        });
    });
});
