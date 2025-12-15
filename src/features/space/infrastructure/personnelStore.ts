import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Person } from '@shared/domain/types';
import type { ChairList } from '../domain/types';

interface PersonnelStore {
    // State
    personnel: Person[];
    chairLists: ChairList[];

    // Actions
    setPersonnel: (personnel: Person[]) => void;
    addPerson: (person: Person) => void;
    updatePerson: (id: string, updates: Partial<Person>) => void;
    deletePerson: (id: string) => void;

    // Chair lists
    addChairList: (chairList: ChairList) => void;
    updateChairList: (id: string, updates: Partial<ChairList>) => void;
    deleteChairList: (id: string) => void;
    loadChairList: (id: string) => void;
}

export const usePersonnelStore = create<PersonnelStore>()(
    persist(
        (set, get) => ({
            // Initial state
            personnel: [],
            chairLists: [],

            // Actions
            setPersonnel: (personnel) => set({ personnel }),

            addPerson: (person) =>
                set((state) => ({
                    personnel: [...state.personnel, person],
                })),

            updatePerson: (id, updates) =>
                set((state) => ({
                    personnel: state.personnel.map((p) =>
                        p.id === id ? { ...p, ...updates } : p
                    ),
                })),

            deletePerson: (id) =>
                set((state) => ({
                    personnel: state.personnel.filter((p) => p.id !== id),
                })),

            // Chair lists
            addChairList: (chairList) =>
                set((state) => ({
                    chairLists: [...state.chairLists, chairList],
                })),

            updateChairList: (id, updates) =>
                set((state) => ({
                    chairLists: state.chairLists.map((list) =>
                        list.id === id ? { ...list, ...updates, updatedAt: new Date().toISOString() } : list
                    ),
                })),

            deleteChairList: (id) =>
                set((state) => ({
                    chairLists: state.chairLists.filter((list) => list.id !== id),
                })),

            loadChairList: (id) => {
                const chairList = get().chairLists.find((list) => list.id === id);
                if (chairList) {
                    set({ personnel: chairList.personnel });
                }
            },
        }),
        {
            name: 'personnel-store',
            partialize: (state) => ({
                personnel: state.personnel,
                chairLists: state.chairLists,
            }),
        }
    )
);
