import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Person, PeopleList, SpaceAllocation } from '../domain/types';

export interface PeopleStore {
    // State
    people: Person[];
    peopleLists: PeopleList[];
    activeListName?: string;
    activeListId?: string;
    spaceAllocation: SpaceAllocation;

    // Actions
    setPeople: (people: Person[]) => void;
    addPerson: (person: Person) => void;
    updatePerson: (id: string, updates: Partial<Person>) => void;
    deletePerson: (id: string) => void;
    assignSpace: (personId: string, spaceId: string) => void;
    unassignSpace: (personId: string) => void;

    // People List Management
    addPeopleList: (list: PeopleList) => void;
    updatePeopleList: (id: string, list: PeopleList) => void;
    deletePeopleList: (id: string) => void;
    loadPeopleList: (id: string) => void;

    // Helpers
    setActiveListName: (name: string | undefined) => void;
    setActiveListId: (id: string | undefined) => void;
    setSpaceAllocation: (allocation: SpaceAllocation) => void;
    updateSpaceAllocation: () => void;  // Recalculate based on assignments
}

export const usePeopleStore = create<PeopleStore>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                people: [],
                peopleLists: [],
                activeListName: undefined,
                activeListId: undefined,
                spaceAllocation: {
                    totalSpaces: 0,
                    assignedSpaces: 0,
                    availableSpaces: 0,
                },

                // Actions
                setPeople: (people) => {
                    set({ people }, false, 'setPeople');
                    get().updateSpaceAllocation();
                },

                addPerson: (person) =>
                    set((state) => {
                        const newState = {
                            people: [...state.people, person],
                        };
                        return newState;
                    }, false, 'addPerson'),

                updatePerson: (id, updates) =>
                    set((state) => ({
                        people: state.people.map((p) =>
                            p.id === id ? {
                                ...p,
                                ...updates,
                                data: updates.data ? { ...p.data, ...updates.data } : p.data
                            } : p
                        ),
                    }), false, 'updatePerson'),

                deletePerson: (id) => {
                    set((state) => ({
                        people: state.people.filter((p) => p.id !== id),
                    }), false, 'deletePerson');
                    get().updateSpaceAllocation();
                },

                assignSpace: (personId, spaceId) => {
                    set((state) => ({
                        people: state.people.map((p) =>
                            p.id === personId ? { ...p, assignedSpaceId: spaceId } : p
                        ),
                    }), false, 'assignSpace');
                    get().updateSpaceAllocation();
                },

                unassignSpace: (personId) => {
                    set((state) => ({
                        people: state.people.map((p) =>
                            p.id === personId ? { ...p, assignedSpaceId: undefined } : p
                        ),
                    }), false, 'unassignSpace');
                    get().updateSpaceAllocation();
                },

                // People List Management
                addPeopleList: (list) =>
                    set((state) => ({
                        peopleLists: [...state.peopleLists, list],
                    }), false, 'addPeopleList'),

                updatePeopleList: (id, list) =>
                    set((state) => ({
                        peopleLists: state.peopleLists.map((l) =>
                            l.id === id ? list : l
                        ),
                    }), false, 'updatePeopleList'),

                deletePeopleList: (id) =>
                    set((state) => ({
                        peopleLists: state.peopleLists.filter((l) => l.id !== id),
                        activeListName: state.activeListName === state.peopleLists.find(l => l.id === id)?.name
                            ? undefined
                            : state.activeListName,
                        activeListId: state.activeListId === id ? undefined : state.activeListId,
                    }), false, 'deletePeopleList'),

                loadPeopleList: (id) => {
                    const state = get();
                    const list = state.peopleLists.find((l) => l.id === id);
                    if (list) {
                        set({
                            people: list.people,
                            activeListName: list.name,
                            activeListId: list.id
                        }, false, 'loadPeopleList');
                        get().updateSpaceAllocation();
                    }
                },

                // Helpers
                setActiveListName: (name) => set({ activeListName: name }, false, 'setActiveListName'),
                setActiveListId: (id) => set({ activeListId: id }, false, 'setActiveListId'),

                setSpaceAllocation: (allocation) => set({ spaceAllocation: allocation }, false, 'setSpaceAllocation'),

                updateSpaceAllocation: () => {
                    const state = get();
                    const assignedSpaces = state.people.filter(p => p.assignedSpaceId).length;
                    set({
                        spaceAllocation: {
                            ...state.spaceAllocation,
                            assignedSpaces,
                            availableSpaces: state.spaceAllocation.totalSpaces - assignedSpaces,
                        }
                    }, false, 'updateSpaceAllocation');
                },
            }),
            {
                name: 'people-store',
                partialize: (state) => ({
                    people: state.people,
                    peopleLists: state.peopleLists,
                    activeListName: state.activeListName,
                    activeListId: state.activeListId,
                    spaceAllocation: state.spaceAllocation,
                }),
            }
        ),
        { name: 'PeopleStore' }
    )
);
