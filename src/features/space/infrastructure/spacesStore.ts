import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Space } from '@shared/domain/types';
import type { SpacesList } from '../domain/types';

interface SpacesStore {
    // State
    spaces: Space[];
    spacesLists: SpacesList[];

    // Actions
    setSpaces: (spaces: Space[]) => void;
    addSpace: (space: Space) => void;
    updateSpace: (id: string, updates: Partial<Space>) => void;
    deleteSpace: (id: string) => void;

    // Spaces lists
    addSpacesList: (spacesList: SpacesList) => void;
    updateSpacesList: (id: string, updates: Partial<SpacesList>) => void;
    deleteSpacesList: (id: string) => void;
    loadSpacesList: (id: string) => void;
}

export const useSpacesStore = create<SpacesStore>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                spaces: [],
                spacesLists: [],

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

                // Spaces lists
                addSpacesList: (spacesList) =>
                    set((state) => ({
                        spacesLists: [...state.spacesLists, spacesList],
                    }), false, 'addSpacesList'),

                updateSpacesList: (id, updates) =>
                    set((state) => ({
                        spacesLists: state.spacesLists.map((list) =>
                            list.id === id ? { ...list, ...updates, updatedAt: new Date().toISOString() } : list
                        ),
                    }), false, 'updateSpacesList'),

                deleteSpacesList: (id) =>
                    set((state) => ({
                        spacesLists: state.spacesLists.filter((list) => list.id !== id),
                    }), false, 'deleteSpacesList'),

                loadSpacesList: (id) => {
                    const spacesList = get().spacesLists.find((list) => list.id === id);
                    if (spacesList) {
                        set({ spaces: spacesList.spaces }, false, 'loadSpacesList');
                    }
                },
            }),
            {
                name: 'spaces-store',
                partialize: (state) => ({
                    spaces: state.spaces,
                    spacesLists: state.spacesLists,
                }),
            }
        ),
        { name: 'SpacesStore' }
    )
);
