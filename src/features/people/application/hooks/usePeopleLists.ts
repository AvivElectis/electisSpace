import { useCallback, useMemo } from 'react';
import { usePeopleStore } from '../../infrastructure/peopleStore';
import { useShallow } from 'zustand/react/shallow';
import { logger } from '@shared/infrastructure/services/logger';
import type { PeopleList, Person } from '../../domain/types';
import {
    validateListName,
    toStorageName,
    toDisplayName,
    LIST_NAME_MAX_LENGTH,
    getPersonListNames,
    getPersonListSpaceId,
    isPersonInList,
    setPersonListMembership,
    removePersonFromList,
} from '../../domain/types';
import { usePeopleListsSync } from './usePeopleListsSync';

/**
 * Hook for People List management operations
 * Lists are derived from AIMS data (people's listMemberships field)
 * A person can be in multiple lists with different assignments per list
 */
export function usePeopleLists() {
    const peopleStore = usePeopleStore(useShallow(state => ({
        people: state.people,
        pendingChanges: state.pendingChanges,
        activeListId: state.activeListId,
        activeListName: state.activeListName,
        peopleLists: state.peopleLists,
        setPeople: state.setPeople,
        setActiveListId: state.setActiveListId,
        setActiveListName: state.setActiveListName,
        addPeopleList: state.addPeopleList,
        updatePeopleList: state.updatePeopleList,
        markPendingChanges: state.markPendingChanges,
        clearPendingChanges: state.clearPendingChanges,
    })));

    // Use the sync hook for AIMS operations
    const { saveListToAims, applyListAssignmentsToAims, syncListLoadToAims } = usePeopleListsSync();

    // Use store's pendingChanges (shared with assignSpace/unassignSpace actions)
    const pendingChanges = peopleStore.pendingChanges;
    const setPendingChanges = (value: boolean) => {
        if (value) {
            peopleStore.markPendingChanges();
        } else {
            peopleStore.clearPendingChanges();
        }
    };

    // NOTE: Removed legacy localStorage clearing useEffect - lists are now properly 
    // stored in peopleLists array and should NOT be cleared on mount

    /**
     * Derive lists from people's listMemberships
     * A person can appear in multiple lists
     */
    const derivedLists = useMemo((): PeopleList[] => {
        const listMap = new Map<string, Person[]>();

        // Group people by all lists they belong to
        peopleStore.people.forEach(person => {
            const listNames = getPersonListNames(person);
            listNames.forEach(listName => {
                const existing = listMap.get(listName) || [];
                existing.push(person);
                listMap.set(listName, existing);
            });
        });

        // Convert to PeopleList array
        const lists: PeopleList[] = [];
        listMap.forEach((people, storageName) => {
            lists.push({
                id: `aims-list-${storageName}`,
                name: toDisplayName(storageName),
                storageName,
                createdAt: new Date().toISOString(),
                people,
                isFromAIMS: true,
            });
        });

        // Sort by name
        lists.sort((a, b) => a.name.localeCompare(b.name));

        return lists;
    }, [peopleStore.people]);

    /**
     * Get loaded list metadata for UI display
     */
    const loadedListMetadata = useMemo(() => {
        if (!peopleStore.activeListId) return undefined;
        const activeList = derivedLists.find(l => l.id === peopleStore.activeListId);
        if (!activeList) return undefined;
        return {
            name: activeList.name,
            storageName: activeList.storageName,
            loadedAt: activeList.updatedAt || activeList.createdAt,
            isFromAIMS: activeList.isFromAIMS,
            peopleCount: activeList.people?.length ?? 0,
        };
    }, [peopleStore.activeListId, derivedLists]);

    /**
     * Get the active list's storage name
     */
    const activeListStorageName = useMemo(() => {
        if (!peopleStore.activeListId) return undefined;
        return peopleStore.activeListId.replace('aims-list-', '');
    }, [peopleStore.activeListId]);

    /**
     * Get people filtered by the active list (if any)
     * Returns all people if no active list
     */
    const peopleInActiveList = useMemo(() => {
        if (!activeListStorageName) return peopleStore.people;
        return peopleStore.people.filter(p => isPersonInList(p, activeListStorageName));
    }, [peopleStore.people, activeListStorageName]);

    /**
     * Get assignment for a person in the active list
     */
    const getActiveListAssignment = useCallback((person: Person): string | undefined => {
        if (!activeListStorageName) return undefined;
        return getPersonListSpaceId(person, activeListStorageName);
    }, [activeListStorageName]);

    /**
     * Save current people to a list (new or add to existing)
     * - Validates name (letters, numbers, spaces, max 20 chars)
     * - Converts spaces to underscores for AIMS storage
     * - Adds list membership to all people (preserving other memberships)
     * Note: Must sync to AIMS to persist across devices
     * Returns updated people array so caller can pass to saveListToAims
     */
    const savePeopleList = useCallback((name: string): { success: boolean; error?: string; updatedPeople?: Person[] } => {
        try {
            // Validate list name
            const validation = validateListName(name);
            if (!validation.valid) {
                logger.warn('PeopleLists', 'Invalid list name', { name, error: validation.error });
                return { success: false, error: validation.error };
            }

            const storageName = toStorageName(name);
            const displayName = name.trim();

            // Add list membership to all people (preserving other memberships)
            const peopleWithListMembership = peopleStore.people.map(p => {
                return setPersonListMembership(p, storageName, p.assignedSpaceId);
            });

            // Update the store with list membership
            peopleStore.setPeople(peopleWithListMembership);

            // Set active list (derived list ID format)
            const listId = `aims-list-${storageName}`;

            // Check if list already exists in peopleLists, if not add it
            const existingList = peopleStore.peopleLists.find(l => l.storageName === storageName);
            if (!existingList) {
                // Don't store the full people array - it can be derived from main people array's listMemberships
                const newList: PeopleList = {
                    id: listId,
                    name: displayName,
                    storageName: storageName,
                    createdAt: new Date().toISOString(),
                    // people array is omitted - derived from main people array via listMemberships
                };
                peopleStore.addPeopleList(newList);
                logger.info('PeopleLists', 'Added list to peopleLists', { listId, name: displayName });
            } else {
                // Update existing list - don't store people array, it's derived
                peopleStore.updatePeopleList(existingList.id, {
                    ...existingList,
                    updatedAt: new Date().toISOString(),
                    people: undefined, // Don't store people array
                });
                logger.info('PeopleLists', 'Updated existing list in peopleLists', { listId: existingList.id, name: displayName });
            }

            peopleStore.setActiveListId(listId);
            peopleStore.setActiveListName(displayName);
            peopleStore.clearPendingChanges();

            logger.info('PeopleLists', 'People list created/updated', {
                listId,
                name: displayName,
                storageName,
                count: peopleWithListMembership.length
            });

            // Return updated people so caller can pass to saveListToAims (avoids stale closure)
            return { success: true, updatedPeople: peopleWithListMembership };
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to save people list', { error: error.message });
            return { success: false, error: error.message };
        }
    }, [peopleStore]);

    /**
     * Add selected people to an existing list
     * @param peopleIds - IDs of people to add
     * @param listName - Storage name of list to add to
     * @param withCurrentAssignment - If true, copy current assignedSpaceId to list assignment
     */
    const addPeopleToList = useCallback((
        peopleIds: string[],
        listName: string,
        withCurrentAssignment: boolean = true
    ): { success: boolean; added: number; error?: string } => {
        try {
            const storageName = toStorageName(listName);
            let addedCount = 0;

            const updatedPeople = peopleStore.people.map(p => {
                if (peopleIds.includes(p.id)) {
                    // Skip if already in list
                    if (isPersonInList(p, storageName)) {
                        return p;
                    }
                    addedCount++;
                    return setPersonListMembership(
                        p,
                        storageName,
                        withCurrentAssignment ? p.assignedSpaceId : undefined
                    );
                }
                return p;
            });

            peopleStore.setPeople(updatedPeople);

            logger.info('PeopleLists', 'Added people to list', {
                listName: storageName,
                added: addedCount
            });

            return { success: true, added: addedCount };
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to add people to list', { error: error.message });
            return { success: false, added: 0, error: error.message };
        }
    }, [peopleStore]);

    /**
     * Remove selected people from a list
     * @param peopleIds - IDs of people to remove
     * @param listName - Storage name of list to remove from
     */
    const removePeopleFromList = useCallback((
        peopleIds: string[],
        listName: string
    ): { success: boolean; removed: number; error?: string } => {
        try {
            const storageName = toStorageName(listName);
            let removedCount = 0;

            const updatedPeople = peopleStore.people.map(p => {
                if (peopleIds.includes(p.id) && isPersonInList(p, storageName)) {
                    removedCount++;
                    return removePersonFromList(p, storageName);
                }
                return p;
            });

            peopleStore.setPeople(updatedPeople);

            logger.info('PeopleLists', 'Removed people from list', {
                listName: storageName,
                removed: removedCount
            });

            return { success: true, removed: removedCount };
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to remove people from list', { error: error.message });
            return { success: false, removed: 0, error: error.message };
        }
    }, [peopleStore]);

    /**
     * Update a person's assignment in a specific list
     * @param personId - Person to update
     * @param listName - List to update assignment in
     * @param spaceId - New space ID (undefined to clear)
     */
    const updateListAssignment = useCallback((
        personId: string,
        listName: string,
        spaceId: string | undefined
    ): { success: boolean; error?: string } => {
        try {
            const storageName = toStorageName(listName);

            const updatedPeople = peopleStore.people.map(p => {
                if (p.id === personId) {
                    return setPersonListMembership(p, storageName, spaceId);
                }
                return p;
            });

            peopleStore.setPeople(updatedPeople);
            setPendingChanges(true);

            logger.info('PeopleLists', 'Updated list assignment', {
                personId,
                listName: storageName,
                spaceId
            });

            return { success: true };
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to update list assignment', { error: error.message });
            return { success: false, error: error.message };
        }
    }, [peopleStore]);

    // saveListToAims is now provided by usePeopleListsSync hook

    /**
     * Update the current active list with current people's assignment state
     * Updates the list-specific assignments from current assignedSpaceId
     */
    const updateCurrentList = useCallback((): { success: boolean; error?: string } => {
        try {
            if (!activeListStorageName) {
                return { success: false, error: 'No active list to update' };
            }

            // Update list membership assignments from current assignedSpaceId
            const updatedPeople = peopleStore.people.map(p => {
                if (isPersonInList(p, activeListStorageName)) {
                    return setPersonListMembership(p, activeListStorageName, p.assignedSpaceId);
                }
                return p;
            });

            peopleStore.setPeople(updatedPeople);
            setPendingChanges(false);

            const updatedCount = updatedPeople.filter(p => isPersonInList(p, activeListStorageName)).length;
            logger.info('PeopleLists', 'List updated', {
                listId: peopleStore.activeListId,
                storageName: activeListStorageName,
                count: updatedCount
            });

            return { success: true };
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to update list', { error: error.message });
            return { success: false, error: error.message };
        }
    }, [peopleStore, activeListStorageName]);

    /**
     * Load a list - sets the active list filter and restores people to their saved state
     * 
     * @param listId - ID of list to load (from derivedLists)
     * @param autoApply - If true, copy list's spaceId to assignedSpaceId for people in this list
     */
    const loadList = useCallback(async (listId: string, autoApply: boolean = false): Promise<void> => {
        try {
            const storageName = listId.replace('aims-list-', '');
            if (!storageName) {
                throw new Error('Invalid list ID');
            }

            // Find the list from peopleLists (which has the saved state) or derived lists
            const savedList = peopleStore.peopleLists.find(l => l.id === listId || l.storageName === storageName);
            const listToLoad = derivedLists.find(l => l.id === listId);

            if (!listToLoad && !savedList) {
                throw new Error('List not found');
            }

            const listName = savedList?.name || listToLoad?.name || storageName;

            logger.info('PeopleLists', 'Loading list', {
                listId,
                name: listName,
                autoApply,
                hasSavedList: !!savedList,
                savedPeopleCount: savedList?.people?.length || 0
            });

            // Set active list metadata
            peopleStore.setActiveListId(listId);
            peopleStore.setActiveListName(listName);

            // Restore people's assignments to the saved state in the list
            // For each person in the list, restore their assignedSpaceId to the list's saved spaceId
            const updatedPeople: Person[] = peopleStore.people.map(p => {
                if (!isPersonInList(p, storageName)) {
                    return p; // Person not in this list, keep as-is
                }

                // Get the saved space assignment from the list membership
                const listSpaceId = getPersonListSpaceId(p, storageName);

                if (autoApply) {
                    // Auto-apply: set assignedSpaceId to the list's saved spaceId
                    return {
                        ...p,
                        assignedSpaceId: listSpaceId, // Restore to saved state
                        aimsSyncStatus: listSpaceId ? 'pending' as const : p.aimsSyncStatus,
                    };
                } else {
                    // No auto-apply: still restore assignedSpaceId to the saved state
                    // This ensures unsaved changes are discarded when reloading the list
                    return {
                        ...p,
                        assignedSpaceId: listSpaceId, // Restore to saved state (undefined if not set in list)
                    };
                }
            });

            peopleStore.setPeople(updatedPeople);

            if (autoApply) {
                // Post assignments to AIMS using the sync hook
                await syncListLoadToAims(updatedPeople, storageName);
            }

            peopleStore.clearPendingChanges();
            logger.info('PeopleLists', 'List loaded', { listId, autoApply });
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to load list', { error: error.message });
            throw error;
        }
    }, [derivedLists, peopleStore, syncListLoadToAims]);

    /**
     * Apply active list's assignments
     * Copies list's spaceId to assignedSpaceId for all people in active list
     * Then syncs assignments to AIMS
     */
    const applyListAssignments = useCallback(async (): Promise<{ success: boolean; applied: number; error?: string }> => {
        return applyListAssignmentsToAims(activeListStorageName);
    }, [applyListAssignmentsToAims, activeListStorageName]);

    /**
     * Mark that there are pending (unsaved) changes
     * Now delegates to the store for shared state with assignSpace/unassignSpace
     */
    const markPendingChanges = useCallback(() => {
        peopleStore.markPendingChanges();
    }, [peopleStore]);

    /**
     * Delete a list
     * Removes list membership from all people in that list
     * Note: To persist, must sync to AIMS after deletion
     */
    const deleteList = useCallback((listId: string): void => {
        try {
            const storageName = listId.replace('aims-list-', '');
            if (!storageName) {
                throw new Error('Invalid list ID');
            }

            // Remove list membership from all people in this list
            const updatedPeople = peopleStore.people.map(p => {
                if (isPersonInList(p, storageName)) {
                    return removePersonFromList(p, storageName);
                }
                return p;
            });

            peopleStore.setPeople(updatedPeople);

            // Clear active list if it was the deleted one
            if (peopleStore.activeListId === listId) {
                peopleStore.setActiveListId(undefined);
                peopleStore.setActiveListName(undefined);
                setPendingChanges(false);
            }

            logger.info('PeopleLists', 'List deleted', { listId, storageName });
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to delete list', { error: error.message });
            throw error;
        }
    }, [peopleStore]);

    /**
     * Clear the active list filter (show all people)
     */
    const clearActiveList = useCallback(() => {
        peopleStore.setActiveListId(undefined);
        peopleStore.setActiveListName(undefined);
        setPendingChanges(false);
    }, [peopleStore]);

    /**
     * Count of people with pending list assignments in active list
     */
    const pendingAssignmentsCount = useMemo(() => {
        if (!activeListStorageName) return 0;
        return peopleStore.people.filter(p => {
            const listSpaceId = getPersonListSpaceId(p, activeListStorageName);
            return listSpaceId && listSpaceId !== p.assignedSpaceId;
        }).length;
    }, [peopleStore.people, activeListStorageName]);

    /**
     * Get count of lists a person belongs to
     */
    const getPersonListCount = useCallback((person: Person): number => {
        return getPersonListNames(person).length;
    }, []);

    /**
     * Get all list names a person belongs to (for display)
     */
    const getPersonListNamesForDisplay = useCallback((person: Person): string[] => {
        return getPersonListNames(person).map(toDisplayName);
    }, []);

    return {
        // State - derived from AIMS data (people's listMemberships)
        peopleLists: derivedLists,
        activeListName: peopleStore.activeListName,
        activeListId: peopleStore.activeListId,
        activeListStorageName,
        loadedListMetadata,
        pendingChanges,
        pendingAssignmentsCount,
        peopleInActiveList,

        // Validation helpers
        validateListName,
        LIST_NAME_MAX_LENGTH,

        // Multi-list helpers
        getPersonListCount,
        getPersonListNamesForDisplay,
        getActiveListAssignment,
        isPersonInList: (person: Person, listName: string) => isPersonInList(person, toStorageName(listName)),

        // Actions
        savePeopleList,
        saveListToAims,
        updateCurrentList,
        loadList,
        deleteList,
        clearActiveList,
        applyListAssignments,
        markPendingChanges,

        // Multi-list actions
        addPeopleToList,
        removePeopleFromList,
        updateListAssignment,
    };
}
