import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { Person, PeopleList, SpaceAllocation } from '../domain/types';
import { peopleApi } from './peopleApi';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

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
    peopleLists: PeopleList[];
    activeListName?: string;
    activeListId?: string;
    spaceAllocation: SpaceAllocation;
    pendingChanges: boolean;

    // Loading/Error states
    isLoading: boolean;
    error: string | null;

    // Actions - Local (for offline/CSV mode)
    setPeople: (people: Person[]) => void;
    addPersonLocal: (person: Person) => void;
    updatePersonLocal: (id: string, updates: Partial<Person>) => void;
    deletePersonLocal: (id: string) => void;
    assignSpaceLocal: (personId: string, spaceId: string) => void;
    unassignSpaceLocal: (personId: string) => void;
    unassignAllSpacesLocal: () => void;
    updateSyncStatusLocal: (personIds: string[], status: 'pending' | 'synced' | 'error') => void;

    // Actions - Server (for API mode)
    fetchPeople: () => Promise<void>;
    createPerson: (data: { storeId: string; externalId?: string; data?: Record<string, unknown> }) => Promise<Person | null>;
    updatePerson: (id: string, updates: { data?: Record<string, unknown> }) => Promise<Person | null>;
    deletePerson: (id: string) => Promise<boolean>;
    assignSpace: (personId: string, spaceId: string) => Promise<Person | null>;
    unassignSpace: (personId: string) => Promise<Person | null>;

    // People List Management
    addPeopleList: (list: PeopleList) => void;
    updatePeopleList: (id: string, list: PeopleList) => void;
    deletePeopleList: (id: string) => void;
    loadPeopleList: (id: string) => void;
    clearPeopleLists: () => void;
    extractListsFromPeople: () => void;

    // Helpers
    setActiveListName: (name: string | undefined) => void;
    setActiveListId: (id: string | undefined) => void;
    setSpaceAllocation: (allocation: SpaceAllocation) => void;
    updateSpaceAllocation: () => void;

    // Pending changes management
    markPendingChanges: () => void;
    clearPendingChanges: () => void;

    // Error handling
    clearError: () => void;

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
                isLoading: false,
                error: null,

                // Local actions
                setPeople: (people) => {
                    set({ people }, false, 'setPeople');
                    get().updateSpaceAllocation();
                },

                addPersonLocal: (person) =>
                    set((state) => ({
                        people: [...state.people, person],
                        pendingChanges: state.activeListId ? true : state.pendingChanges,
                    }), false, 'addPersonLocal'),

                updatePersonLocal: (id, updates) =>
                    set((state) => ({
                        people: state.people.map((p) =>
                            p.id === id ? {
                                ...p,
                                ...updates,
                                data: updates.data ? { ...p.data, ...updates.data } : p.data
                            } : p
                        ),
                        pendingChanges: state.activeListId ? true : state.pendingChanges,
                    }), false, 'updatePersonLocal'),

                deletePersonLocal: (id) => {
                    set((state) => ({
                        people: state.people.filter((p) => p.id !== id),
                        pendingChanges: state.activeListId ? true : state.pendingChanges,
                    }), false, 'deletePersonLocal');
                    get().updateSpaceAllocation();
                },

                assignSpaceLocal: (personId, spaceId) => {
                    set((state) => ({
                        people: state.people.map((p) =>
                            p.id === personId ? { ...p, assignedSpaceId: spaceId } : p
                        ),
                        pendingChanges: state.activeListId ? true : state.pendingChanges,
                    }), false, 'assignSpaceLocal');
                    get().updateSpaceAllocation();
                },

                unassignSpaceLocal: (personId) => {
                    set((state) => ({
                        people: state.people.map((p) =>
                            p.id === personId ? { ...p, assignedSpaceId: undefined, aimsSyncStatus: undefined } : p
                        ),
                        pendingChanges: state.activeListId ? true : state.pendingChanges,
                    }), false, 'unassignSpaceLocal');
                    get().updateSpaceAllocation();
                },

                unassignAllSpacesLocal: () => {
                    set((state) => ({
                        people: state.people.map((p) => ({
                            ...p,
                            assignedSpaceId: undefined,
                            aimsSyncStatus: undefined,
                            lastSyncedAt: undefined,
                        })),
                        pendingChanges: state.activeListId ? true : state.pendingChanges,
                    }), false, 'unassignAllSpacesLocal');
                    get().updateSpaceAllocation();
                },

                updateSyncStatusLocal: (personIds, status) => {
                    const now = status === 'synced' ? new Date().toISOString() : undefined;
                    set((state) => ({
                        people: state.people.map((p) =>
                            personIds.includes(p.id)
                                ? { ...p, aimsSyncStatus: status, lastSyncedAt: now || p.lastSyncedAt }
                                : p
                        ),
                    }), false, 'updateSyncStatusLocal');
                },

                // Server actions
                fetchPeople: async () => {
                    set({ isLoading: true, error: null }, false, 'fetchPeople/start');
                    try {
                        const storeId = useAuthStore.getState().activeStoreId;
                        const { people } = await peopleApi.getAll(storeId ? { storeId } : undefined);
                        // Deduplicate by id as a safety net
                        const seen = new Set<string>();
                        const uniquePeople = people.filter(p => {
                            if (seen.has(p.id)) return false;
                            seen.add(p.id);
                            return true;
                        });
                        set({ people: uniquePeople, isLoading: false }, false, 'fetchPeople/success');
                        get().updateSpaceAllocation();
                        get().extractListsFromPeople();
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to fetch people';
                        set({ error: message, isLoading: false }, false, 'fetchPeople/error');
                    }
                },

                createPerson: async (data) => {
                    set({ isLoading: true, error: null }, false, 'createPerson/start');
                    try {
                        const person = await peopleApi.create(data);
                        set((state) => ({
                            people: [...state.people, person],
                            isLoading: false,
                            pendingChanges: state.activeListId ? true : state.pendingChanges,
                        }), false, 'createPerson/success');
                        return person;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to create person';
                        set({ error: message, isLoading: false }, false, 'createPerson/error');
                        return null;
                    }
                },

                updatePerson: async (id, updates) => {
                    set({ isLoading: true, error: null }, false, 'updatePerson/start');
                    try {
                        const person = await peopleApi.update(id, updates);
                        set((state) => ({
                            people: state.people.map((p) => p.id === id ? person : p),
                            isLoading: false,
                            pendingChanges: state.activeListId ? true : state.pendingChanges,
                        }), false, 'updatePerson/success');
                        return person;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to update person';
                        set({ error: message, isLoading: false }, false, 'updatePerson/error');
                        return null;
                    }
                },

                deletePerson: async (id) => {
                    set({ isLoading: true, error: null }, false, 'deletePerson/start');
                    try {
                        await peopleApi.delete(id);
                        set((state) => ({
                            people: state.people.filter((p) => p.id !== id),
                            isLoading: false,
                            pendingChanges: state.activeListId ? true : state.pendingChanges,
                        }), false, 'deletePerson/success');
                        get().updateSpaceAllocation();
                        return true;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to delete person';
                        set({ error: message, isLoading: false }, false, 'deletePerson/error');
                        return false;
                    }
                },

                assignSpace: async (personId, spaceId) => {
                    set({ isLoading: true, error: null }, false, 'assignSpace/start');
                    try {
                        const person = await peopleApi.assignToSpace(personId, spaceId);
                        set((state) => ({
                            people: state.people.map((p) => p.id === personId ? person : p),
                            isLoading: false,
                            pendingChanges: state.activeListId ? true : state.pendingChanges,
                        }), false, 'assignSpace/success');
                        get().updateSpaceAllocation();
                        return person;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to assign space';
                        set({ error: message, isLoading: false }, false, 'assignSpace/error');
                        return null;
                    }
                },

                unassignSpace: async (personId) => {
                    set({ isLoading: true, error: null }, false, 'unassignSpace/start');
                    try {
                        const person = await peopleApi.unassignFromSpace(personId);
                        set((state) => ({
                            people: state.people.map((p) => p.id === personId ? person : p),
                            isLoading: false,
                            pendingChanges: state.activeListId ? true : state.pendingChanges,
                        }), false, 'unassignSpace/success');
                        get().updateSpaceAllocation();
                        return person;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to unassign space';
                        set({ error: message, isLoading: false }, false, 'unassignSpace/error');
                        return null;
                    }
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

                    const newLists: PeopleList[] = [];
                    for (const storageName of listNamesFromPeople) {
                        const displayName = storageName.replace(/_/g, ' ');
                        newLists.push({
                            id: `list_${storageName}_${Date.now()}`,
                            name: displayName,
                            storageName: storageName,
                            createdAt: new Date().toISOString(),
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

                // Pending changes (relevant for local changes)
                markPendingChanges: () => {
                    const state = get();
                    if (state.activeListId) {
                        set({ pendingChanges: true }, false, 'markPendingChanges');
                    }
                },
                clearPendingChanges: () => set({ pendingChanges: false }, false, 'clearPendingChanges'),

                // Error handling
                clearError: () => set({ error: null }, false, 'clearError'),

                // Cleanup
                clearAllData: () => set({
                    people: [],
                    peopleLists: [],
                    activeListName: undefined,
                    activeListId: undefined,
                    pendingChanges: false,
                    error: null,
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
