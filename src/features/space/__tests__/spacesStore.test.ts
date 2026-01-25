/**
 * Spaces Store Tests
 * 
 * Tests for the spaces state management store including:
 * - Space CRUD operations
 * - Spaces list management
 * - Merge operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSpacesStore } from '../infrastructure/spacesStore';
import type { Space } from '@shared/domain/types';
import type { SpacesList } from '../domain/types';

describe('SpacesStore', () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        const { clearAllData } = useSpacesStore.getState();
        clearAllData();
    });

    describe('Initial State', () => {
        it('should have empty spaces array initially', () => {
            const { spaces } = useSpacesStore.getState();
            expect(spaces).toEqual([]);
        });

        it('should have empty spacesLists array initially', () => {
            const { spacesLists } = useSpacesStore.getState();
            expect(spacesLists).toEqual([]);
        });

        it('should have no active list initially', () => {
            const { activeListName, activeListId } = useSpacesStore.getState();
            expect(activeListName).toBeUndefined();
            expect(activeListId).toBeUndefined();
        });
    });

    describe('Space CRUD Operations', () => {
        const mockSpace: Space = {
            id: '101',
            data: { ITEM_NAME: 'Room 101', RANK: 'Captain' },
        };

        it('should set spaces array', () => {
            const { setSpaces } = useSpacesStore.getState();

            setSpaces([mockSpace]);

            const { spaces } = useSpacesStore.getState();
            expect(spaces).toHaveLength(1);
            expect(spaces[0].id).toBe('101');
        });

        it('should add a space', () => {
            const { addSpaceLocal } = useSpacesStore.getState();

            addSpaceLocal(mockSpace);

            const { spaces } = useSpacesStore.getState();
            expect(spaces).toHaveLength(1);
            expect(spaces[0]).toEqual(mockSpace);
        });

        it('should add multiple spaces', () => {
            const { addSpaceLocal } = useSpacesStore.getState();

            addSpaceLocal({ id: '1', data: { name: 'Space 1' } });
            addSpaceLocal({ id: '2', data: { name: 'Space 2' } });
            addSpaceLocal({ id: '3', data: { name: 'Space 3' } });

            const { spaces } = useSpacesStore.getState();
            expect(spaces).toHaveLength(3);
        });

        it('should update space by ID', () => {
            const { setSpaces, updateSpaceLocal } = useSpacesStore.getState();

            setSpaces([mockSpace]);
            updateSpaceLocal('101', { data: { ITEM_NAME: 'Updated Room', RANK: 'Captain' } });

            const { spaces } = useSpacesStore.getState();
            expect(spaces[0].data.ITEM_NAME).toBe('Updated Room');
        });

        it('should merge data when updating space', () => {
            const { setSpaces, updateSpaceLocal } = useSpacesStore.getState();

            setSpaces([mockSpace]);
            updateSpaceLocal('101', { data: { TITLE: 'Manager' } });

            const { spaces } = useSpacesStore.getState();
            expect(spaces[0].data.ITEM_NAME).toBe('Room 101');
            expect(spaces[0].data.RANK).toBe('Captain');
            expect(spaces[0].data.TITLE).toBe('Manager');
        });

        it('should delete space by ID', () => {
            const { setSpaces, deleteSpaceLocal } = useSpacesStore.getState();

            setSpaces([
                { id: '1', data: {} },
                { id: '2', data: {} },
                { id: '3', data: {} },
            ]);

            deleteSpaceLocal('2');

            const { spaces } = useSpacesStore.getState();
            expect(spaces).toHaveLength(2);
            expect(spaces.find(s => s.id === '2')).toBeUndefined();
        });
    });

    describe('Spaces List Management', () => {
        const mockList: SpacesList = {
            id: 'list-1',
            name: 'Test List',
            spaces: [
                { id: '1', data: { name: 'Space 1' } },
                { id: '2', data: { name: 'Space 2' } },
            ],
            createdAt: new Date().toISOString(),
        };

        it('should add a spaces list', () => {
            const { addSpacesList } = useSpacesStore.getState();

            addSpacesList(mockList);

            const { spacesLists } = useSpacesStore.getState();
            expect(spacesLists).toHaveLength(1);
            expect(spacesLists[0].name).toBe('Test List');
        });

        it('should update a spaces list', () => {
            const { addSpacesList, updateSpacesList } = useSpacesStore.getState();

            addSpacesList(mockList);
            updateSpacesList('list-1', { ...mockList, name: 'Updated List' });

            const { spacesLists } = useSpacesStore.getState();
            expect(spacesLists[0].name).toBe('Updated List');
        });

        it('should delete a spaces list', () => {
            const { addSpacesList, deleteSpacesList } = useSpacesStore.getState();

            addSpacesList(mockList);
            addSpacesList({ ...mockList, id: 'list-2', name: 'List 2' });

            deleteSpacesList('list-1');

            const { spacesLists } = useSpacesStore.getState();
            expect(spacesLists).toHaveLength(1);
            expect(spacesLists[0].id).toBe('list-2');
        });

        it('should load a spaces list and set spaces', () => {
            const { addSpacesList, loadSpacesList } = useSpacesStore.getState();

            addSpacesList(mockList);
            loadSpacesList('list-1');

            const { spaces, activeListName, activeListId } = useSpacesStore.getState();
            expect(spaces).toHaveLength(2);
            expect(activeListName).toBe('Test List');
            expect(activeListId).toBe('list-1');
        });

        it('should clear active list when deleting active list', () => {
            const { addSpacesList, loadSpacesList, deleteSpacesList } = useSpacesStore.getState();

            addSpacesList(mockList);
            loadSpacesList('list-1');
            deleteSpacesList('list-1');

            const { activeListName, activeListId } = useSpacesStore.getState();
            expect(activeListName).toBeUndefined();
            expect(activeListId).toBeUndefined();
        });
    });

    describe('List Management Helpers', () => {
        it('should set active list name', () => {
            const { setActiveListName } = useSpacesStore.getState();

            setActiveListName('My List');

            const { activeListName } = useSpacesStore.getState();
            expect(activeListName).toBe('My List');
        });

        it('should set active list ID', () => {
            const { setActiveListId } = useSpacesStore.getState();

            setActiveListId('list-123');

            const { activeListId } = useSpacesStore.getState();
            expect(activeListId).toBe('list-123');
        });

        it('should clear active list name', () => {
            const { setActiveListName } = useSpacesStore.getState();

            setActiveListName('My List');
            setActiveListName(undefined);

            const { activeListName } = useSpacesStore.getState();
            expect(activeListName).toBeUndefined();
        });
    });

    describe('Merge Operations', () => {
        it('should merge new spaces into existing', () => {
            const { setSpaces, mergeSpacesList } = useSpacesStore.getState();

            setSpaces([
                { id: '1', data: { name: 'Original 1' } },
                { id: '2', data: { name: 'Original 2' } },
            ]);

            mergeSpacesList([
                { id: '3', data: { name: 'New 3' } },
            ]);

            const { spaces } = useSpacesStore.getState();
            expect(spaces).toHaveLength(3);
        });

        it('should replace existing spaces with same ID', () => {
            const { setSpaces, mergeSpacesList } = useSpacesStore.getState();

            setSpaces([
                { id: '1', data: { name: 'Original' } },
            ]);

            mergeSpacesList([
                { id: '1', data: { name: 'Updated' } },
            ]);

            const { spaces } = useSpacesStore.getState();
            expect(spaces).toHaveLength(1);
            expect(spaces[0].data.name).toBe('Updated');
        });
    });

    describe('Clear All Data', () => {
        it('should clear all state', () => {
            const { setSpaces, addSpacesList, setActiveListName, clearAllData } = useSpacesStore.getState();

            setSpaces([{ id: '1', data: {} }]);
            addSpacesList({ id: 'list-1', name: 'List', spaces: [], createdAt: new Date().toISOString() });
            setActiveListName('List');

            clearAllData();

            const { spaces, spacesLists, activeListName, activeListId } = useSpacesStore.getState();
            expect(spaces).toEqual([]);
            expect(spacesLists).toEqual([]);
            expect(activeListName).toBeUndefined();
            expect(activeListId).toBeUndefined();
        });
    });
});
