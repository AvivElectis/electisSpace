import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { Person, PeopleList, SpaceAllocation } from '../domain/types';

// IndexedDB storage adapter for Zustand persist
const indexedDBStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        const value = await idbGet(name);
        return value ?? null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
        await idbSet(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        await idbDel(name);
    },
};

export interface PeopleStore {
    // State
    people: Person[];
    peopleLists: PeopleList[];  // Legacy - now derived from people's listName
    activeListName?: string;
    activeListId?: string;
    spaceAllocation: SpaceAllocation;
    pendingChanges: boolean;  // Track unsaved list changes

    // Actions
    setPeople: (people: Person[]) => void;
    addPerson: (person: Person) => void;
    updatePerson: (id: string, updates: Partial<Person>) => void;
    deletePerson: (id: string) => void;
    assignSpace: (personId: string, spaceId: string) => void;
    unassignSpace: (personId: string) => void;
    unassignAllSpaces: () => void;  // Clear all assignments
    updateSyncStatus: (personIds: string[], status: 'pending' | 'synced' | 'error') => void;
    
    // Pending changes management
    markPendingChanges: () => void;
    clearPendingChanges: () => void;

    // People List Management (legacy - now lists are derived from people's listName)
    addPeopleList: (list: PeopleList) => void;
    updatePeopleList: (id: string, list: PeopleList) => void;
    deletePeopleList: (id: string) => void;
    loadPeopleList: (id: string) => void;
    clearPeopleLists: () => void;  // Clear legacy localStorage lists
    extractListsFromPeople: () => void;  // Extract unique lists from people's listMemberships after sync

    // Helpers
    setActiveListName: (name: string | undefined) => void;
    setActiveListId: (id: string | undefined) => void;
    setSpaceAllocation: (allocation: SpaceAllocation) => void;
    updateSpaceAllocation: () => void;  // Recalculate based on assignments

    // Cleanup
    clearAllData: () => void;
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
                pendingChanges: false,

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
                        // Mark pending changes if there's an active list
                        pendingChanges: state.activeListId ? true : state.pendingChanges,
                    }), false, 'assignSpace');
                    get().updateSpaceAllocation();
                },

                unassignSpace: (personId) => {
                    set((state) => ({
                        people: state.people.map((p) =>
                            p.id === personId ? { ...p, assignedSpaceId: undefined, aimsSyncStatus: undefined } : p
                        ),
                        // Mark pending changes if there's an active list
                        pendingChanges: state.activeListId ? true : state.pendingChanges,
                    }), false, 'unassignSpace');
                    get().updateSpaceAllocation();
                },

                unassignAllSpaces: () => {
                    set((state) => ({
                        people: state.people.map((p) => ({
                            ...p,
                            assignedSpaceId: undefined,
                            aimsSyncStatus: undefined,
                            lastSyncedAt: undefined,
                        })),
                    }), false, 'unassignAllSpaces');
                    get().updateSpaceAllocation();
                },

                updateSyncStatus: (personIds, status) => {
                    const now = status === 'synced' ? new Date().toISOString() : undefined;
                    set((state) => ({
                        people: state.people.map((p) =>
                            personIds.includes(p.id)
                                ? { ...p, aimsSyncStatus: status, lastSyncedAt: now || p.lastSyncedAt }
                                : p
                        ),
                    }), false, 'updateSyncStatus');
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
                            activeListName: list.name,
                            activeListId: list.id
                        }, false, 'loadPeopleList');
                        get().updateSpaceAllocation();
                    }
                },

                clearPeopleLists: () => 
                    set({ 
                        peopleLists: [],
                        activeListId: undefined,
                        activeListName: undefined,
                    }, false, 'clearPeopleLists'),

                extractListsFromPeople: () => {
                    const state = get();
                    
                    const existingListNames = new Set(state.peopleLists.map(l => l.storageName));
                    
                    // Extract unique list names from all people's listMemberships
                    const listNamesFromPeople = new Set<string>();
                    for (const person of state.people) {
                        if (person.listMemberships) {
                            for (const membership of person.listMemberships) {
                                if (membership.listName && !existingListNames.has(membership.listName)) {
                                    listNamesFromPeople.add(membership.listName);
                                }
                            }
                        }
                    }
                    
                    // Create PeopleList objects for newly discovered lists
                    const newLists: PeopleList[] = [];
                    for (const storageName of listNamesFromPeople) {
                        const displayName = storageName.replace(/_/g, ' ');
                        newLists.push({
                            id: `list_${storageName}_${Date.now()}`,
                            name: displayName,
                            storageName: storageName,
                            createdAt: new Date().toISOString(),
                            // Don't store people array - it can be derived from main people array
                            isFromAIMS: true,
                        });
                    }
                    
                    if (newLists.length > 0) {
                        set((state) => ({
                            peopleLists: [...state.peopleLists, ...newLists],
                        }), false, 'extractListsFromPeople');
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

                // Pending changes management
                markPendingChanges: () => {
                    const state = get();
                    if (state.activeListId) {
                        set({ pendingChanges: true }, false, 'markPendingChanges');
                    }
                },
                clearPendingChanges: () => set({ pendingChanges: false }, false, 'clearPendingChanges'),

                // Cleanup
                clearAllData: () => set({
                    people: [],
                    peopleLists: [],
                    activeListName: undefined,
                    activeListId: undefined,
                    pendingChanges: false,
                    spaceAllocation: {
                        totalSpaces: 0,
                        assignedSpaces: 0,
                        availableSpaces: 0,
                    }
                }, false, 'clearAllData'),
            }),
            {
                name: 'people-store',
                storage: createJSONStorage(() => indexedDBStorage),
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
