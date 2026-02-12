/**
 * useListsController Hook Tests
 * Tests the lists controller hook for list management operations
 * (API-based implementation using spacesListsApi)
 */

import { renderHook, act } from '@testing-library/react';
import { useListsController } from '../application/useListsController';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { spacesListsApi } from '@shared/infrastructure/services/spacesListsApi';

// Mock spacesListsApi
vi.mock('@shared/infrastructure/services/spacesListsApi', () => ({
    spacesListsApi: {
        list: vi.fn(),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

// Mock auth store
vi.mock('@features/auth/infrastructure/authStore', () => ({
    useAuthStore: vi.fn((selector: any) => {
        const state = { activeStoreId: 'test-store-id' };
        return selector ? selector(state) : state;
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

describe('useListsController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useSpacesStore.setState({
            spaces: [],
            activeListId: undefined,
            activeListName: undefined,
        });

        // Default: list returns empty
        vi.mocked(spacesListsApi.list).mockResolvedValue({ data: [] });
    });

    describe('initialization', () => {
        it('should return lists array', () => {
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
            expect(typeof result.current.fetchLists).toBe('function');
        });
    });

    describe('saveCurrentSpacesAsList', () => {
        it('should call API to save current spaces as a new list', async () => {
            const mockSpaces = [
                { id: '1', data: { name: 'Space 1' } },
                { id: '2', data: { name: 'Space 2' } },
            ];
            useSpacesStore.setState({ spaces: mockSpaces });

            vi.mocked(spacesListsApi.create).mockResolvedValue({
                data: {
                    id: 'new-list-id',
                    storeId: 'test-store-id',
                    name: 'Test List',
                    itemCount: 2,
                    content: mockSpaces as any,
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                },
            });

            const { result } = renderHook(() => useListsController());

            await act(async () => {
                await result.current.saveCurrentSpacesAsList('Test List');
            });

            expect(spacesListsApi.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    storeId: 'test-store-id',
                    name: 'Test List',
                })
            );
        });

        it('should throw error if no store selected', async () => {
            // Override auth store mock to have no activeStoreId
            const { useAuthStore } = await import('@features/auth/infrastructure/authStore');
            vi.mocked(useAuthStore).mockImplementation((selector: any) => {
                const state = { activeStoreId: undefined };
                return selector ? selector(state) : state;
            });

            const { result } = renderHook(() => useListsController());

            await expect(
                result.current.saveCurrentSpacesAsList('Test List')
            ).rejects.toThrow('No store selected');

            // Restore
            vi.mocked(useAuthStore).mockImplementation((selector: any) => {
                const state = { activeStoreId: 'test-store-id' };
                return selector ? selector(state) : state;
            });
        });

        it('should set active list name and id after saving', async () => {
            const mockSpaces = [{ id: '1', data: { name: 'Space 1' } }];
            useSpacesStore.setState({ spaces: mockSpaces });

            vi.mocked(spacesListsApi.create).mockResolvedValue({
                data: {
                    id: 'saved-list-id',
                    storeId: 'test-store-id',
                    name: 'New List',
                    itemCount: 1,
                    content: mockSpaces as any,
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                },
            });

            const { result } = renderHook(() => useListsController());

            await act(async () => {
                await result.current.saveCurrentSpacesAsList('New List');
            });

            const spacesState = useSpacesStore.getState();
            expect(spacesState.activeListName).toBe('New List');
            expect(spacesState.activeListId).toBe('saved-list-id');
        });

        it('should allow saving empty spaces list', async () => {
            useSpacesStore.setState({ spaces: [] });

            vi.mocked(spacesListsApi.create).mockResolvedValue({
                data: {
                    id: 'empty-list-id',
                    storeId: 'test-store-id',
                    name: 'Empty List',
                    itemCount: 0,
                    content: [],
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                },
            });

            const { result } = renderHook(() => useListsController());

            await act(async () => {
                await result.current.saveCurrentSpacesAsList('Empty List');
            });

            expect(spacesListsApi.create).toHaveBeenCalled();
        });
    });

    describe('loadList', () => {
        it('should throw error if API call fails', async () => {
            vi.mocked(spacesListsApi.getById).mockRejectedValue(new Error('Not found'));

            const { result } = renderHook(() => useListsController());

            await expect(result.current.loadList('non-existent-id'))
                .rejects.toThrow('Not found');
        });

        it('should load list and set active list info', async () => {
            const mockSpaces = [{ id: '1', data: { name: 'Space 1' } }];
            vi.mocked(spacesListsApi.getById).mockResolvedValue({
                data: {
                    id: 'list-123',
                    storeId: 'test-store-id',
                    name: 'Saved List',
                    itemCount: 1,
                    content: mockSpaces as any,
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                },
            });

            const { result } = renderHook(() => useListsController());

            await act(async () => {
                await result.current.loadList('list-123');
            });

            const spacesState = useSpacesStore.getState();
            expect(spacesState.activeListName).toBe('Saved List');
            expect(spacesState.activeListId).toBe('list-123');
        });

        it('should throw error if list content is invalid', async () => {
            vi.mocked(spacesListsApi.getById).mockResolvedValue({
                data: {
                    id: 'list-123',
                    storeId: 'test-store-id',
                    name: 'Bad List',
                    itemCount: 0,
                    content: undefined as any,
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                },
            });

            const { result } = renderHook(() => useListsController());

            await expect(result.current.loadList('list-123'))
                .rejects.toThrow('List content is empty or invalid');
        });
    });

    describe('deleteList', () => {
        it('should call API to delete list', async () => {
            vi.mocked(spacesListsApi.delete).mockResolvedValue(undefined);

            const { result } = renderHook(() => useListsController());

            await act(async () => {
                await result.current.deleteList('list-to-delete');
            });

            expect(spacesListsApi.delete).toHaveBeenCalledWith('list-to-delete');
        });

        it('should clear active list if deleted list was active', async () => {
            useSpacesStore.setState({
                activeListName: 'Active List',
                activeListId: 'active-list',
            });

            vi.mocked(spacesListsApi.delete).mockResolvedValue(undefined);

            const { result } = renderHook(() => useListsController());

            await act(async () => {
                await result.current.deleteList('active-list');
            });

            const spacesState = useSpacesStore.getState();
            expect(spacesState.activeListName).toBeUndefined();
            expect(spacesState.activeListId).toBeUndefined();
        });

        it('should not affect active list if different list deleted', async () => {
            useSpacesStore.setState({
                activeListName: 'Active List',
                activeListId: 'active-list',
            });

            vi.mocked(spacesListsApi.delete).mockResolvedValue(undefined);

            const { result } = renderHook(() => useListsController());

            await act(async () => {
                await result.current.deleteList('other-list');
            });

            const spacesState = useSpacesStore.getState();
            expect(spacesState.activeListName).toBe('Active List');
            expect(spacesState.activeListId).toBe('active-list');
        });
    });

    describe('saveListChanges', () => {
        it('should call API to update list', async () => {
            const updatedSpaces = [
                { id: '1', data: { name: 'Updated' } },
                { id: '2', data: { name: 'New Space' } },
            ];
            useSpacesStore.setState({ spaces: updatedSpaces });

            vi.mocked(spacesListsApi.update).mockResolvedValue({
                data: {
                    id: 'list-123',
                    storeId: 'test-store-id',
                    name: 'My List',
                    itemCount: 2,
                    content: updatedSpaces as any,
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-02-01T00:00:00.000Z',
                },
            });

            const { result } = renderHook(() => useListsController());

            await act(async () => {
                await result.current.saveListChanges('list-123');
            });

            expect(spacesListsApi.update).toHaveBeenCalledWith(
                'list-123',
                expect.objectContaining({ content: expect.any(Array) })
            );
        });

        it('should throw error if API call fails', async () => {
            vi.mocked(spacesListsApi.update).mockRejectedValue(new Error('Not found'));

            const { result } = renderHook(() => useListsController());

            await expect(
                result.current.saveListChanges('non-existent-id')
            ).rejects.toThrow('Not found');
        });
    });

    describe('fetchLists', () => {
        it('should fetch lists from API', async () => {
            const mockLists = [
                {
                    id: 'list-1',
                    storeId: 'test-store-id',
                    name: 'List 1',
                    itemCount: 3,
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                },
            ];
            vi.mocked(spacesListsApi.list).mockResolvedValue({ data: mockLists });

            const { result } = renderHook(() => useListsController());

            await act(async () => {
                await result.current.fetchLists();
            });

            expect(result.current.lists).toEqual(mockLists);
        });

        it('should handle API errors gracefully', async () => {
            vi.mocked(spacesListsApi.list).mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useListsController());

            // Should not throw - errors are caught internally
            await act(async () => {
                await result.current.fetchLists();
            });

            expect(result.current.lists).toEqual([]);
        });
    });

    describe('hook stability', () => {
        it('should provide functions that remain callable after rerender', () => {
            const { result, rerender } = renderHook(() => useListsController());

            expect(typeof result.current.saveCurrentSpacesAsList).toBe('function');
            expect(typeof result.current.loadList).toBe('function');
            expect(typeof result.current.deleteList).toBe('function');
            expect(typeof result.current.saveListChanges).toBe('function');

            rerender();

            expect(typeof result.current.saveCurrentSpacesAsList).toBe('function');
            expect(typeof result.current.loadList).toBe('function');
            expect(typeof result.current.deleteList).toBe('function');
            expect(typeof result.current.saveListChanges).toBe('function');
        });
    });
});
