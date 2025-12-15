import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Space } from '@shared/domain/types';
import type { SpaceList } from '../domain/types';

interface SpaceStore {
    // State
    spaces: Space[];
    spaceLists: SpaceList[];

    // Actions
    setSpaces: (spaces: Space[]) => void;
    addSpace: (space: Space) => void;
    updateSpace: (id: string, updates: Partial<Space>) => void;
    deleteSpace: (id: string) => void;

    // Space lists
    addSpaceList: (spaceList: SpaceList) => void;
    updateSpaceList: (id: string, updates: Partial<SpaceList>) => void;
    deleteSpaceList: (id: string) => void;
    loadSpaceList: (id: string) => void;
}

export const useSpaceStore = create<SpaceStore>()(
    persist(
        (set, get) => ({
            // Initial state
            spaces: [],
            spaceLists: [],

            // Actions
            setSpaces: (spaces) => set({ spaces }),

            addSpace: (space) =>
                set((state) => ({
                    spaces: [...state.spaces, space],
                })),

            updateSpace: (id, updates) =>
                set((state) => ({
                    spaces: state.spaces.map((s) =>
                        s.id === id ? { ...s, ...updates } : s
                    ),
                })),

            deleteSpace: (id) =>
                set((state) => ({
                    spaces: state.spaces.filter((s) => s.id !== id),
                })),

            // Space lists
            addSpaceList: (spaceList) =>
                set((state) => ({
                    spaceLists: [...state.spaceLists, spaceList],
                })),

            updateSpaceList: (id, updates) =>
                set((state) => ({
                    spaceLists: state.spaceLists.map((list) =>
                        list.id === id ? { ...list, ...updates, updatedAt: new Date().toISOString() } : list
                    ),
                })),

            deleteSpaceList: (id) =>
                set((state) => ({
                    spaceLists: state.spaceLists.filter((list) => list.id !== id),
                })),

            loadSpaceList: (id) => {
                const spaceList = get().spaceLists.find((list) => list.id === id);
                if (spaceList) {
                    set({ spaces: spaceList.spaces });
                }
            },
        }),
        {
            name: 'space-store',
            partialize: (state) => ({
                spaces: state.spaces,
                spaceLists: state.spaceLists,
            }),
        }
    )
);
