import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Space } from '@shared/domain/types';
import type { SpacesList } from '../domain/types';

export interface SpacesStore {
    // State
    spaces: Space[];
    spacesLists: SpacesList[];
    activeListName?: string;
    activeListId?: string; // Track ID of active list for updates

    // Actions
    setSpaces: (spaces: Space[]) => void;
    addSpace: (space: Space) => void;
    updateSpace: (id: string, updates: Partial<Space>) => void;
    deleteSpace: (id: string) => void;

    // Spaces List Management
    addSpacesList: (list: SpacesList) => void;
    updateSpacesList: (id: string, list: SpacesList) => void;
    deleteSpacesList: (id: string) => void;
    loadSpacesList: (id: string) => void;

    // List Management Helpers
    setActiveListName: (name: string | undefined) => void;
    mergeSpacesList: (spaces: Space[]) => void;
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

                // Actions
                setSpaces: (spaces) => set({ spaces }, false, 'setSpaces'),

                addSpace: (space) =>
                    set((state) => ({
                        spaces: [...state.spaces, space],
                    }), false, 'addSpace'),

                updateSpace: (id, updates) =>
                    set((state) => ({
                        spaces: state.spaces.map((s) =>
                            s.id === id ? { ...s, ...updates } : s
                        ),
                    }), false, 'updateSpace'),

                deleteSpace: (id) =>
                    set((state) => ({
                        spaces: state.spaces.filter((s) => s.id !== id),
                    }), false, 'deleteSpace'),

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

                // List Management Helpers
                setActiveListName: (name) => set({ activeListName: name }, false, 'setActiveListName'),

                mergeSpacesList: (newSpaces) =>
                    set((state) => {
                        const existingSpacesMap = new Map(state.spaces.map(s => [s.id, s]));

                        newSpaces.forEach(newSpace => {
                            if (existingSpacesMap.has(newSpace.id)) {
                                // Update existing space with list details
                                const existing = existingSpacesMap.get(newSpace.id)!;
                                existingSpacesMap.set(newSpace.id, { ...existing, ...newSpace });
                            } else {
                                // Add new space
                                existingSpacesMap.set(newSpace.id, newSpace);
                            }
                        });

                        return {
                            spaces: Array.from(existingSpacesMap.values()),
                        };
                    }, false, 'mergeSpacesList'),
            }),
            {
                name: 'spaces-store',
                partialize: (state) => ({
                    spaces: state.spaces,
                    spacesLists: state.spacesLists,
                    activeListName: state.activeListName,
                    activeListId: state.activeListId, // Persist activeListId
                }),
            }
        ),
        { name: 'SpacesStore' }
    )
);
