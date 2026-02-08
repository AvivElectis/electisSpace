import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Space } from '@shared/domain/types';
import type { SpacesList } from '../domain/types';
import { spacesApi } from './spacesApi';

export interface SpacesStore {
    // State
    spaces: Space[];
    spacesLists: SpacesList[];
    activeListName?: string;
    activeListId?: string; // Track ID of active list for updates

    // Loading/Error states
    isLoading: boolean;
    error: string | null;

    // Actions - Local (for offline/CSV mode)
    setSpaces: (spaces: Space[]) => void;
    addSpaceLocal: (space: Space) => void;
    updateSpaceLocal: (id: string, updates: Partial<Space>) => void;
    deleteSpaceLocal: (id: string) => void;

    // Actions - Server (for API mode)
    fetchSpaces: () => Promise<void>;
    createSpace: (data: { externalId: string; labelCode?: string; data?: Record<string, unknown> }) => Promise<Space | null>;
    updateSpace: (id: string, updates: Partial<Space>) => Promise<Space | null>;
    deleteSpace: (id: string) => Promise<boolean>;

    // Spaces List Management
    addSpacesList: (list: SpacesList) => void;
    updateSpacesList: (id: string, list: SpacesList) => void;
    deleteSpacesList: (id: string) => void;
    loadSpacesList: (id: string) => void;

    // Pending changes tracking (for list safety)
    pendingChanges: boolean;
    clearPendingChanges: () => void;

    // List Management Helpers
    setActiveListName: (name: string | undefined) => void;
    setActiveListId: (id: string | undefined) => void;
    mergeSpacesList: (spaces: Space[]) => void;

    // Error handling
    clearError: () => void;

    // Cleanup
    clearAllData: () => void;
}

export const useSpacesStore = create<SpacesStore>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                spaces: [],
                spacesLists: [],
                activeListName: undefined,
                activeListId: undefined,
                isLoading: false,
                error: null,
                pendingChanges: false,

                // Local actions (for offline/CSV mode)
                setSpaces: (spaces) => set({ spaces }, false, 'setSpaces'),

                addSpaceLocal: (space) =>
                    set((state) => ({
                        spaces: [...state.spaces, space],
                        pendingChanges: state.activeListId ? true : state.pendingChanges,
                    }), false, 'addSpaceLocal'),

                updateSpaceLocal: (id, updates) =>
                    set((state) => ({
                        spaces: state.spaces.map((s) =>
                            s.id === id ? {
                                ...s,
                                ...updates,
                                data: updates.data ? { ...s.data, ...updates.data } : s.data
                            } : s
                        ),
                        pendingChanges: state.activeListId ? true : state.pendingChanges,
                    }), false, 'updateSpaceLocal'),

                deleteSpaceLocal: (id) =>
                    set((state) => ({
                        spaces: state.spaces.filter((s) => s.id !== id),
                        pendingChanges: state.activeListId ? true : state.pendingChanges,
                    }), false, 'deleteSpaceLocal'),

                // Server actions (for API mode)
                fetchSpaces: async () => {
                    set({ isLoading: true, error: null }, false, 'fetchSpaces/start');
                    try {
                        const { spaces } = await spacesApi.getAll();
                        set({ spaces, isLoading: false }, false, 'fetchSpaces/success');
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to fetch spaces';
                        set({ error: message, isLoading: false }, false, 'fetchSpaces/error');
                    }
                },

                createSpace: async (data) => {
                    set({ isLoading: true, error: null }, false, 'createSpace/start');
                    try {
                        const space = await spacesApi.create(data);
                        set((state) => ({
                            spaces: [...state.spaces, space],
                            isLoading: false,
                        }), false, 'createSpace/success');
                        return space;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to create space';
                        set({ error: message, isLoading: false }, false, 'createSpace/error');
                        return null;
                    }
                },

                updateSpace: async (id, updates) => {
                    set({ isLoading: true, error: null }, false, 'updateSpace/start');
                    try {
                        const space = await spacesApi.update(id, updates);
                        set((state) => ({
                            spaces: state.spaces.map((s) => s.id === id ? space : s),
                            isLoading: false,
                        }), false, 'updateSpace/success');
                        return space;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to update space';
                        set({ error: message, isLoading: false }, false, 'updateSpace/error');
                        return null;
                    }
                },

                deleteSpace: async (id) => {
                    set({ isLoading: true, error: null }, false, 'deleteSpace/start');
                    try {
                        await spacesApi.delete(id);
                        set((state) => ({
                            spaces: state.spaces.filter((s) => s.id !== id),
                            isLoading: false,
                        }), false, 'deleteSpace/success');
                        return true;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to delete space';
                        set({ error: message, isLoading: false }, false, 'deleteSpace/error');
                        return false;
                    }
                },

                // Spaces List Management
                addSpacesList: (list) =>
                    set((state) => ({
                        spacesLists: [...state.spacesLists, list],
                    }), false, 'addSpacesList'),

                updateSpacesList: (id, list) =>
                    set((state) => ({
                        spacesLists: state.spacesLists.map((l) =>
                            l.id === id ? list : l
                        ),
                    }), false, 'updateSpacesList'),

                deleteSpacesList: (id) =>
                    set((state) => ({
                        spacesLists: state.spacesLists.filter((l) => l.id !== id),
                        activeListName: state.activeListName === state.spacesLists.find(l => l.id === id)?.name
                            ? undefined
                            : state.activeListName,
                        activeListId: state.activeListId === id ? undefined : state.activeListId,
                    }), false, 'deleteSpacesList'),

                loadSpacesList: (id) => {
                    const state = get();
                    const list = state.spacesLists.find((l) => l.id === id);
                    if (list) {
                        set({
                            spaces: list.spaces,
                            activeListName: list.name,
                            activeListId: list.id
                        }, false, 'loadSpacesList');
                    }
                },

                // Pending changes
                clearPendingChanges: () => set({ pendingChanges: false }, false, 'clearPendingChanges'),

                // List Management Helpers
                setActiveListName: (name) => set({ activeListName: name }, false, 'setActiveListName'),
                setActiveListId: (id) => set({ activeListId: id }, false, 'setActiveListId'),

                mergeSpacesList: (newSpaces) =>
                    set((state) => {
                        const existingSpacesMap = new Map(state.spaces.map(s => [s.id, s]));

                        newSpaces.forEach(newSpace => {
                            // Always set (replace or add) - no merge
                            existingSpacesMap.set(newSpace.id, newSpace);
                        });

                        return {
                            spaces: Array.from(existingSpacesMap.values()),
                        };
                    }, false, 'mergeSpacesList'),

                // Error handling
                clearError: () => set({ error: null }, false, 'clearError'),

                // Cleanup
                clearAllData: () => set({
                    spaces: [],
                    spacesLists: [],
                    activeListName: undefined,
                    activeListId: undefined,
                    pendingChanges: false,
                    error: null,
                }, false, 'clearAllData'),
            }),
            {
                name: 'spaces-store',
                partialize: (state) => ({
                    spaces: state.spaces,
                    spacesLists: state.spacesLists,
                    activeListName: state.activeListName,
                    activeListId: state.activeListId,
                    // Don't persist loading/error states
                }),
            }
        ),
        { name: 'SpacesStore' }
    )
);
