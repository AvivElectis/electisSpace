import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePeopleStore } from '../../infrastructure/peopleStore';
import { postBulkAssignments, postBulkAssignmentsWithMetadata } from '../../infrastructure/peopleService';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
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

/**
 * Hook for People List management operations
 * Lists are derived from AIMS data (people's listMemberships field)
 * A person can be in multiple lists with different assignments per list
 */
export function usePeopleLists() {
    const peopleStore = usePeopleStore();
    const settings = useSettingsStore(state => state.settings);
    
    // Track pending changes (unsaved modifications to loaded list)
    const [pendingChanges, setPendingChanges] = useState(false);

    // Clear legacy localStorage lists on mount (migration to AIMS-derived lists)
    useEffect(() => {
        if (peopleStore.peopleLists.length > 0) {
            logger.info('PeopleLists', 'Clearing legacy localStorage lists', { 
                count: peopleStore.peopleLists.length 
            });
            peopleStore.clearPeopleLists();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            peopleCount: activeList.people.length,
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
            peopleStore.setActiveListId(listId);
            peopleStore.setActiveListName(displayName);
            setPendingChanges(false);

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

    /**
     * Save list data to AIMS for cross-device persistence
     * Posts all people with list memberships (_LIST_MEMBERSHIPS_ JSON) to AIMS
     * Syncs people who have a POOL slot (virtualSpaceId) - these are their permanent AIMS articles
     * @param peopleToSync - Optional: specific people to sync (use after savePeopleList to avoid stale closure)
     */
    const saveListToAims = useCallback(async (peopleToSync?: Person[]): Promise<{ success: boolean; syncedCount: number; error?: string }> => {
        try {
            console.log('[saveListToAims] Starting...');
            console.log('[saveListToAims] solumConfig:', settings.solumConfig ? 'present' : 'missing');
            console.log('[saveListToAims] tokens:', settings.solumConfig?.tokens ? 'present' : 'missing');
            console.log('[saveListToAims] peopleToSync provided:', peopleToSync ? peopleToSync.length : 'no (using store)');
            
            if (!settings.solumConfig?.tokens) {
                console.log('[saveListToAims] ERROR: Not connected to SoluM');
                return { success: false, syncedCount: 0, error: 'Not connected to SoluM' };
            }

            // Use provided people or fall back to store (provided avoids stale closure issue)
            const sourcePeople = peopleToSync || peopleStore.people;
            
            // Sync people who have a POOL slot (virtualSpaceId) - this is their permanent AIMS article
            // People without virtualSpaceId don't exist in AIMS yet
            const peopleWithPoolSlot = sourcePeople.filter(p => p.virtualSpaceId);
            console.log('[saveListToAims] People with POOL slot:', peopleWithPoolSlot.length);
            console.log('[saveListToAims] Sample person:', peopleWithPoolSlot[0] ? {
                id: peopleWithPoolSlot[0].id,
                virtualSpaceId: peopleWithPoolSlot[0].virtualSpaceId,
                listMemberships: peopleWithPoolSlot[0].listMemberships,
            } : 'none');
            
            if (peopleWithPoolSlot.length === 0) {
                logger.warn('PeopleLists', 'No people with POOL slots to sync to AIMS');
                return { success: true, syncedCount: 0 };
            }

            const withListMemberships = peopleWithPoolSlot.filter(p => p.listMemberships?.length);
            console.log('[saveListToAims] People with list memberships:', withListMemberships.length);
            
            logger.info('PeopleLists', 'Saving list data to AIMS', { 
                count: peopleWithPoolSlot.length,
                withListMemberships: withListMemberships.length
            });

            // Post with metadata (includes _LIST_MEMBERSHIPS_ JSON)
            console.log('[saveListToAims] Calling postBulkAssignmentsWithMetadata...');
            await postBulkAssignmentsWithMetadata(
                peopleWithPoolSlot,
                settings.solumConfig,
                settings.solumConfig.tokens.accessToken,
                settings.solumMappingConfig
            );
            console.log('[saveListToAims] postBulkAssignmentsWithMetadata completed successfully');

            logger.info('PeopleLists', 'List data saved to AIMS', { count: peopleWithPoolSlot.length });
            return { success: true, syncedCount: peopleWithPoolSlot.length };
        } catch (error: any) {
            console.error('[saveListToAims] ERROR:', error);
            logger.error('PeopleLists', 'Failed to save list to AIMS', { error: error.message });
            return { success: false, syncedCount: 0, error: error.message };
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

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
     * Load a list - sets the active list filter and optionally applies assignments
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

            // Find the list from derived lists
            const listToLoad = derivedLists.find(l => l.id === listId);
            if (!listToLoad) {
                throw new Error('List not found');
            }

            logger.info('PeopleLists', 'Loading list', {
                listId,
                name: listToLoad.name,
                autoApply,
                peopleCount: listToLoad.people.length
            });

            // Set active list metadata
            peopleStore.setActiveListId(listId);
            peopleStore.setActiveListName(listToLoad.name);

            if (autoApply) {
                // Apply list assignments: copy list's spaceId to assignedSpaceId
                const updatedPeople: Person[] = peopleStore.people.map(p => {
                    const listSpaceId = getPersonListSpaceId(p, storageName);
                    if (listSpaceId) {
                        return {
                            ...p,
                            assignedSpaceId: listSpaceId,
                            aimsSyncStatus: 'pending' as const,
                        };
                    }
                    return p;
                });

                peopleStore.setPeople(updatedPeople);

                // Post assignments to AIMS
                const peopleToSync = updatedPeople.filter(
                    p => isPersonInList(p, storageName) && p.assignedSpaceId
                );
                if (peopleToSync.length > 0 && settings.solumConfig?.tokens) {
                    try {
                        const personIds = peopleToSync.map(p => p.id);

                        await postBulkAssignments(
                            peopleToSync,
                            settings.solumConfig,
                            settings.solumConfig.tokens.accessToken,
                            settings.solumMappingConfig
                        );

                        peopleStore.updateSyncStatus(personIds, 'synced');
                        logger.info('PeopleLists', 'List assignments synced to AIMS', { count: peopleToSync.length });
                    } catch (postError: any) {
                        logger.error('PeopleLists', 'Failed to sync list assignments to AIMS', { error: postError.message });
                    }
                }
            }

            setPendingChanges(false);
            logger.info('PeopleLists', 'List loaded', { listId, autoApply });
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to load list', { error: error.message });
            throw error;
        }
    }, [derivedLists, peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Apply active list's assignments
     * Copies list's spaceId to assignedSpaceId for all people in active list
     * Then syncs assignments to AIMS
     */
    const applyListAssignments = useCallback(async (): Promise<{ success: boolean; applied: number; error?: string }> => {
        try {
            if (!activeListStorageName) {
                return { success: false, applied: 0, error: 'No active list' };
            }

            const peopleWithListSpaces = peopleStore.people.filter(p => {
                const listSpaceId = getPersonListSpaceId(p, activeListStorageName);
                return listSpaceId !== undefined;
            });
            
            if (peopleWithListSpaces.length === 0) {
                logger.info('PeopleLists', 'No list assignments to apply');
                return { success: true, applied: 0 };
            }

            logger.info('PeopleLists', 'Applying list assignments', { count: peopleWithListSpaces.length });

            // Update local state: copy list's spaceId to assignedSpaceId
            const updatedPeople: Person[] = peopleStore.people.map(p => {
                const listSpaceId = getPersonListSpaceId(p, activeListStorageName);
                if (listSpaceId) {
                    return {
                        ...p,
                        assignedSpaceId: listSpaceId,
                        aimsSyncStatus: 'pending' as const,
                    };
                }
                return p;
            });

            peopleStore.setPeople(updatedPeople);

            // Sync to AIMS
            if (settings.solumConfig?.tokens) {
                const personIds = peopleWithListSpaces.map(p => p.id);

                try {
                    await postBulkAssignments(
                        updatedPeople.filter(p => personIds.includes(p.id)),
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );

                    peopleStore.updateSyncStatus(personIds, 'synced');
                    logger.info('PeopleLists', 'List assignments synced to AIMS', { count: personIds.length });
                } catch (syncError: any) {
                    peopleStore.updateSyncStatus(personIds, 'error');
                    logger.error('PeopleLists', 'Failed to sync list assignments to AIMS', { error: syncError.message });
                    return { success: false, applied: 0, error: syncError.message };
                }
            }

            return { success: true, applied: peopleWithListSpaces.length };
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to apply list assignments', { error: error.message });
            return { success: false, applied: 0, error: error.message };
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig, activeListStorageName]);

    /**
     * Mark that there are pending (unsaved) changes
     */
    const markPendingChanges = useCallback(() => {
        if (peopleStore.activeListId) {
            setPendingChanges(true);
        }
    }, [peopleStore.activeListId]);

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
