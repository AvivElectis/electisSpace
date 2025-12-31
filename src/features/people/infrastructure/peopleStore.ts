import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Person, PeopleList, SpaceAllocation } from '../domain/types';

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
                            people: list.people,
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
                    console.log('[DEBUG extractListsFromPeople] Called with:', {
                        peopleCount: state.people.length,
                        existingListsCount: state.peopleLists.length,
                        peopleWithListMemberships: state.people.filter(p => p.listMemberships && p.listMemberships.length > 0).length,
                    });
                    
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
                        // Find all people who are members of this list
                        const listPeople = state.people.filter(p => 
                            p.listMemberships?.some(m => m.listName === storageName)
                        );
                        
                        const displayName = storageName.replace(/_/g, ' ');
                        newLists.push({
                            id: `list_${storageName}_${Date.now()}`,
                            name: displayName,
                            storageName: storageName,
                            createdAt: new Date().toISOString(),
                            people: listPeople,
                            isFromAIMS: true,
                        });
                    }
                    
                    if (newLists.length > 0) {
                        console.log('[DEBUG extractListsFromPeople] Found lists from AIMS:', newLists.map(l => l.name));
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
