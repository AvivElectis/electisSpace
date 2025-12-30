import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { SavedList } from '../domain/types';

interface ListsStore {
    // State
    lists: SavedList[];

    // Actions
    saveList: (list: SavedList) => void;
    updateList: (id: string, updates: Partial<SavedList>) => void;
    deleteList: (id: string) => void;

    // Helpers
    getListByName: (name: string) => SavedList | undefined;
}

export const useListsStore = create<ListsStore>()(
    devtools(
        persist(
            (set, get) => ({
                lists: [],

                saveList: (list) =>
                    set((state) => ({
                        lists: [...state.lists, list],
                    }), false, 'saveList'),

                updateList: (id, updates) =>
                    set((state) => ({
                        lists: state.lists.map((list) =>
                            list.id === id ? { ...list, ...updates, updatedAt: new Date().toISOString() } : list
                        ),
                    }), false, 'updateList'),

                deleteList: (id) =>
                    set((state) => ({
                        lists: state.lists.filter((list) => list.id !== id),
                    }), false, 'deleteList'),

                getListByName: (name) =>
                    get().lists.find(l => l.name.toLowerCase() === name.toLowerCase()),
            }),
            {
                name: 'lists-store',
                partialize: (state) => ({
                    lists: state.lists,
                }),
            }
        ),
        { name: 'ListsStore' }
    )
);
