/**
 * useListsController Hook Tests
 * Phase 10.13 - Deep Testing System
 * 
 * Tests the lists controller hook for list management operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useListsController } from '../application/useListsController';
import { useListsStore } from '../infrastructure/listsStore';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';

// Mock the sync context
vi.mock('@features/sync/application/SyncContext', () => ({
    useSyncContext: () => ({
        workingMode: 'SOLUM_API',
        safeUpload: vi.fn().mockResolvedValue(undefined),
        sync: vi.fn().mockResolvedValue(undefined),
    }),
}));

// Mock logger
vi.mock('@shared/infrastructure/services/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock uuid
vi.mock('uuid', () => ({
    v4: () => 'test-uuid-123',
}));

describe('useListsController', () => {
    beforeEach(() => {
        // Reset stores before each test
        useListsStore.setState({ lists: [] });
        useSpacesStore.setState({
            spaces: [],
            activeListId: undefined,
            activeListName: undefined,
        });
    });

    describe('initialization', () => {
        it('should return lists from store', () => {
            const { result } = renderHook(() => useListsController());

            expect(result.current.lists).toBeDefined();
            expect(Array.isArray(result.current.lists)).toBe(true);
        });

        it('should return activeListId from spaces store', () => {
            useSpacesStore.setState({ activeListId: 'list-123' });

            const { result } = renderHook(() => useListsController());

            expect(result.current.activeListId).toBe('list-123');
        });

        it('should expose all required functions', () => {
            const { result } = renderHook(() => useListsController());

            expect(typeof result.current.saveCurrentSpacesAsList).toBe('function');
            expect(typeof result.current.loadList).toBe('function');
            expect(typeof result.current.deleteList).toBe('function');
            expect(typeof result.current.saveListChanges).toBe('function');
        });
    });

    describe('saveCurrentSpacesAsList', () => {
        it('should save current spaces as a new list', () => {
            const mockSpaces = [
                { id: '1', data: { name: 'Space 1' } },
                { id: '2', data: { name: 'Space 2' } },
            ];
            useSpacesStore.setState({ spaces: mockSpaces });

            const { result } = renderHook(() => useListsController());

            act(() => {
                result.current.saveCurrentSpacesAsList('Test List');
            });

            expect(result.current.lists.length).toBe(1);
            expect(result.current.lists[0].name).toBe('Test List');
            expect(result.current.lists[0].spaces).toEqual(mockSpaces);
        });

        it('should throw error if list name already exists', () => {
            useListsStore.setState({
                lists: [{
                    id: 'existing-id',
                    name: 'Existing List',
                    spaces: [],
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                }],
            });

            const { result } = renderHook(() => useListsController());

            expect(() => {
                result.current.saveCurrentSpacesAsList('Existing List');
            }).toThrow('List name already exists');
        });

        it('should set active list name and id after saving', () => {
            const mockSpaces = [{ id: '1', data: { name: 'Space 1' } }];
            useSpacesStore.setState({ spaces: mockSpaces });

            const { result } = renderHook(() => useListsController());

            act(() => {
                result.current.saveCurrentSpacesAsList('New List');
            });

            const spacesState = useSpacesStore.getState();
            expect(spacesState.activeListName).toBe('New List');
            expect(spacesState.activeListId).toBe('test-uuid-123');
        });

        it('should allow saving empty spaces list', () => {
            useSpacesStore.setState({ spaces: [] });

            const { result } = renderHook(() => useListsController());

            act(() => {
                result.current.saveCurrentSpacesAsList('Empty List');
            });

            expect(result.current.lists.length).toBe(1);
            expect(result.current.lists[0].spaces).toEqual([]);
        });
    });

    describe('loadList', () => {
        it('should throw error if list not found', async () => {
            const { result } = renderHook(() => useListsController());

            await expect(result.current.loadList('non-existent-id'))
                .rejects.toThrow('List not found');
        });

        it('should load list and set active list info', async () => {
            const mockSpaces = [{ id: '1', data: { name: 'Space 1' } }];
            useListsStore.setState({
                lists: [{
                    id: 'list-123',
                    name: 'Saved List',
                    spaces: mockSpaces,
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                }],
            });

            const { result } = renderHook(() => useListsController());

            await act(async () => {
                await result.current.loadList('list-123');
            });

            const spacesState = useSpacesStore.getState();
            expect(spacesState.activeListName).toBe('Saved List');
            expect(spacesState.activeListId).toBe('list-123');
        });
    });

    describe('deleteList', () => {
        it('should delete list from store', () => {
            useListsStore.setState({
                lists: [{
                    id: 'list-to-delete',
                    name: 'Delete Me',
                    spaces: [],
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                }],
            });

            const { result } = renderHook(() => useListsController());

            expect(result.current.lists.length).toBe(1);

            act(() => {
                result.current.deleteList('list-to-delete');
            });

            expect(result.current.lists.length).toBe(0);
        });

        it('should clear active list if deleted list was active', () => {
            useListsStore.setState({
                lists: [{
                    id: 'active-list',
                    name: 'Active List',
                    spaces: [],
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                }],
            });
            useSpacesStore.setState({
                activeListName: 'Active List',
                activeListId: 'active-list',
            });

            const { result } = renderHook(() => useListsController());

            act(() => {
                result.current.deleteList('active-list');
            });

            const spacesState = useSpacesStore.getState();
            expect(spacesState.activeListName).toBeUndefined();
            expect(spacesState.activeListId).toBeUndefined();
        });

        it('should not affect active list if different list deleted', () => {
            useListsStore.setState({
                lists: [
                    {
                        id: 'active-list',
                        name: 'Active List',
                        spaces: [],
                        createdAt: '2025-01-01T00:00:00.000Z',
                        updatedAt: '2025-01-01T00:00:00.000Z',
                    },
                    {
                        id: 'other-list',
                        name: 'Other List',
                        spaces: [],
                        createdAt: '2025-01-01T00:00:00.000Z',
                        updatedAt: '2025-01-01T00:00:00.000Z',
                    },
                ],
            });
            useSpacesStore.setState({
                activeListName: 'Active List',
                activeListId: 'active-list',
            });

            const { result } = renderHook(() => useListsController());

            act(() => {
                result.current.deleteList('other-list');
            });

            const spacesState = useSpacesStore.getState();
            expect(spacesState.activeListName).toBe('Active List');
            expect(spacesState.activeListId).toBe('active-list');
        });
    });

    describe('saveListChanges', () => {
        it('should throw error if list not found', () => {
            const { result } = renderHook(() => useListsController());

            expect(() => {
                result.current.saveListChanges('non-existent-id');
            }).toThrow('List not found');
        });

        it('should update list with current spaces', () => {
            const originalSpaces = [{ id: '1', data: { name: 'Original' } }];
            const updatedSpaces = [
                { id: '1', data: { name: 'Updated' } },
                { id: '2', data: { name: 'New Space' } },
            ];

            useListsStore.setState({
                lists: [{
                    id: 'list-123',
                    name: 'My List',
                    spaces: originalSpaces,
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                }],
            });
            useSpacesStore.setState({ spaces: updatedSpaces });

            const { result } = renderHook(() => useListsController());

            act(() => {
                result.current.saveListChanges('list-123');
            });

            expect(result.current.lists[0].spaces).toEqual(updatedSpaces);
        });

        it('should update updatedAt timestamp', () => {
            const originalDate = '2025-01-01T00:00:00.000Z';
            useListsStore.setState({
                lists: [{
                    id: 'list-123',
                    name: 'My List',
                    spaces: [],
                    createdAt: originalDate,
                    updatedAt: originalDate,
                }],
            });
            useSpacesStore.setState({ spaces: [] });

            const { result } = renderHook(() => useListsController());

            act(() => {
                result.current.saveListChanges('list-123');
            });

            // The updatedAt should be different from original
            // (We can't check exact value due to timing, but listsStore.updateList updates it)
            expect(result.current.lists[0].updatedAt).not.toBe(originalDate);
        });

        it('should set active list name and id after saving changes', () => {
            useListsStore.setState({
                lists: [{
                    id: 'list-123',
                    name: 'My List',
                    spaces: [],
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                }],
            });
            useSpacesStore.setState({ spaces: [] });

            const { result } = renderHook(() => useListsController());

            act(() => {
                result.current.saveListChanges('list-123');
            });

            const spacesState = useSpacesStore.getState();
            expect(spacesState.activeListName).toBe('My List');
            expect(spacesState.activeListId).toBe('list-123');
        });
    });

    describe('hook stability', () => {
        it('should provide functions that remain callable after rerender', () => {
            const { result, rerender } = renderHook(() => useListsController());

            // Functions should be defined after first render
            expect(typeof result.current.saveCurrentSpacesAsList).toBe('function');
            expect(typeof result.current.loadList).toBe('function');
            expect(typeof result.current.deleteList).toBe('function');
            expect(typeof result.current.saveListChanges).toBe('function');

            rerender();

            // Functions should still be defined and callable after rerender
            expect(typeof result.current.saveCurrentSpacesAsList).toBe('function');
            expect(typeof result.current.loadList).toBe('function');
            expect(typeof result.current.deleteList).toBe('function');
            expect(typeof result.current.saveListChanges).toBe('function');
        });

        it('should update lists when store changes', () => {
            const { result } = renderHook(() => useListsController());

            expect(result.current.lists.length).toBe(0);

            act(() => {
                useListsStore.getState().saveList({
                    id: 'new-list',
                    name: 'New List',
                    spaces: [],
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                });
            });

            expect(result.current.lists.length).toBe(1);
        });
    });
});
