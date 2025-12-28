import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Space } from '@shared/domain/types';

export interface SpacesStore {
    // State
    spaces: Space[];
    activeListName?: string;

    // Actions
    setSpaces: (spaces: Space[]) => void;
    addSpace: (space: Space) => void;
    updateSpace: (id: string, updates: Partial<Space>) => void;
    deleteSpace: (id: string) => void;

    // List Management Helpers
    setActiveListName: (name: string | undefined) => void;
    mergeSpacesList: (spaces: Space[]) => void;
}

export const useSpacesStore = create<SpacesStore>()(
    devtools(
        persist(
            (set, _get) => ({
                // Initial state
                spaces: [],
                activeListName: undefined,

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
                    activeListName: state.activeListName,
                }),
            }
        ),
        { name: 'SpacesStore' }
    )
);
