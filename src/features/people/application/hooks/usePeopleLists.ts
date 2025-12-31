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
    LIST_NAME_MAX_LENGTH 
} from '../../domain/types';

/**
 * Hook for People List management operations
 * Lists are derived from AIMS data (people's _LIST_NAME_ field)
 * Local storage lists are no longer used
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
     * Derive lists from people's listName property (set from AIMS _LIST_NAME_ field)
     * This replaces localStorage-based peopleLists
     */
    const derivedLists = useMemo((): PeopleList[] => {
        const listMap = new Map<string, Person[]>();
        
        // Group people by their listName
        peopleStore.people.forEach(person => {
            if (person.listName) {
                const existing = listMap.get(person.listName) || [];
                existing.push(person);
                listMap.set(person.listName, existing);
            }
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
        };
    }, [peopleStore.activeListId, derivedLists]);

    /**
     * Save current people as a new list
     * - Validates name (letters, numbers, spaces, max 20 chars)
     * - Converts spaces to underscores for AIMS storage
     * - Preserves current space assignments
     * - Sets listName on all people (list will appear in derivedLists)
     * Note: Must sync to AIMS to persist across devices
     */
    const savePeopleList = useCallback((name: string): { success: boolean; error?: string } => {
        try {
            // Validate list name
            const validation = validateListName(name);
            if (!validation.valid) {
                logger.warn('PeopleLists', 'Invalid list name', { name, error: validation.error });
                return { success: false, error: validation.error };
            }

            const storageName = toStorageName(name);
            const displayName = name.trim();

            // Update people with list metadata (for AIMS persistence)
            // This will make the list appear in derivedLists
            const peopleWithListMetadata = peopleStore.people.map(p => ({
                ...p,
                listName: storageName,
                listSpaceId: p.assignedSpaceId || p.listSpaceId,  // Store current assignment as list assignment
            }));

            // Update the store with list metadata
            peopleStore.setPeople(peopleWithListMetadata);

            // Set active list (derived list ID format)
            const listId = `aims-list-${storageName}`;
            peopleStore.setActiveListId(listId);
            peopleStore.setActiveListName(displayName);
            setPendingChanges(false);

            logger.info('PeopleLists', 'People list created', { 
                listId,
                name: displayName, 
                storageName,
                count: peopleWithListMetadata.length 
            });

            return { success: true };
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to save people list', { error: error.message });
            return { success: false, error: error.message };
        }
    }, [peopleStore]);

    /**
     * Save list data to AIMS for cross-device persistence
     * Posts all people with list metadata (_LIST_NAME_, _LIST_SPACE_) to AIMS
     * Requires _LIST_NAME_ and _LIST_SPACE_ fields in article format
     */
    const saveListToAims = useCallback(async (): Promise<{ success: boolean; syncedCount: number; error?: string }> => {
        try {
            if (!settings.solumConfig?.tokens) {
                return { success: false, syncedCount: 0, error: 'Not connected to SoluM' };
            }

            const assignedPeople = peopleStore.people.filter(p => p.assignedSpaceId);
            if (assignedPeople.length === 0) {
                logger.warn('PeopleLists', 'No assigned people to sync to AIMS');
                return { success: true, syncedCount: 0 };
            }

            logger.info('PeopleLists', 'Saving list data to AIMS', { 
                count: assignedPeople.length,
                listName: assignedPeople[0]?.listName 
            });

            // Post with metadata (includes _LIST_NAME_, _LIST_SPACE_ fields)
            await postBulkAssignmentsWithMetadata(
                assignedPeople,
                settings.solumConfig,
                settings.solumConfig.tokens.accessToken,
                settings.solumMappingConfig
            );

            logger.info('PeopleLists', 'List data saved to AIMS', { count: assignedPeople.length });
            return { success: true, syncedCount: assignedPeople.length };
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to save list to AIMS', { error: error.message });
            return { success: false, syncedCount: 0, error: error.message };
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Update the current active list with current people's assignment state
     * With derived lists, this updates listSpaceId from assignedSpaceId
     */
    const updateCurrentList = useCallback((): { success: boolean; error?: string } => {
        try {
            if (!peopleStore.activeListId) {
                return { success: false, error: 'No active list to update' };
            }

            // Extract storage name from the active list ID (format: aims-list-STORAGENAME)
            const storageName = peopleStore.activeListId.replace('aims-list-', '');
            if (!storageName) {
                return { success: false, error: 'Invalid active list ID' };
            }

            // Update people with current assignments as list assignments
            const updatedPeople = peopleStore.people.map(p => {
                if (p.listName === storageName) {
                    return {
                        ...p,
                        listSpaceId: p.assignedSpaceId || p.listSpaceId,
                    };
                }
                return p;
            });

            peopleStore.setPeople(updatedPeople);
            setPendingChanges(false);

            const updatedCount = updatedPeople.filter(p => p.listName === storageName).length;
            logger.info('PeopleLists', 'List updated', { 
                listId: peopleStore.activeListId, 
                storageName,
                count: updatedCount 
            });

            return { success: true };
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to update list', { error: error.message });
            return { success: false, error: error.message };
        }
    }, [peopleStore]);

    /**
     * Load a list derived from AIMS data
     * With derived lists, this just sets the active list filter
     * The people already have their listName/listSpaceId from AIMS sync
     * 
     * @param listId - ID of list to load (from derivedLists)
     * @param autoApply - If true, copy listSpaceId to assignedSpaceId for people in this list
     */
    const loadList = useCallback(async (listId: string, autoApply: boolean = false): Promise<void> => {
        try {
            // Find the list from derived lists (not stored lists)
            // Since derivedLists is from useMemo, we need to compute it here
            const listMap = new Map<string, Person[]>();
            peopleStore.people.forEach(person => {
                if (person.listName) {
                    const existing = listMap.get(person.listName) || [];
                    existing.push(person);
                    listMap.set(person.listName, existing);
                }
            });

            let listToLoad: PeopleList | undefined;
            listMap.forEach((people, storageName) => {
                const derivedId = `aims-list-${storageName}`;
                if (derivedId === listId) {
                    listToLoad = {
                        id: derivedId,
                        name: toDisplayName(storageName),
                        storageName,
                        createdAt: new Date().toISOString(),
                        people,
                        isFromAIMS: true,
                    };
                }
            });

            if (!listToLoad) {
                throw new Error('List not found');
            }

            logger.info('PeopleLists', 'Loading derived list', {
                listId,
                name: listToLoad.name,
                autoApply,
                peopleCount: listToLoad.people.length
            });

            // Set active list metadata
            peopleStore.setActiveListId(listId);
            peopleStore.setActiveListName(listToLoad.name);

            if (autoApply) {
                // Apply list assignments: copy listSpaceId to assignedSpaceId
                const updatedPeople: Person[] = peopleStore.people.map(p => {
                    if (p.listName === listToLoad!.storageName && p.listSpaceId) {
                        return {
                            ...p,
                            assignedSpaceId: p.listSpaceId,
                            aimsSyncStatus: 'pending' as const,
                        };
                    }
                    return p;
                });

                peopleStore.setPeople(updatedPeople);

                // Post assignments to AIMS
                const peopleToSync = updatedPeople.filter(
                    p => p.listName === listToLoad!.storageName && p.assignedSpaceId
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
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Apply list assignments
     * Copies listSpaceId to assignedSpaceId for all people who have a list space
     * Then syncs assignments to AIMS
     */
    const applyListAssignments = useCallback(async (): Promise<{ success: boolean; applied: number; error?: string }> => {
        try {
            const peopleWithListSpaces = peopleStore.people.filter(p => p.listSpaceId);
            
            if (peopleWithListSpaces.length === 0) {
                logger.info('PeopleLists', 'No list assignments to apply');
                return { success: true, applied: 0 };
            }

            logger.info('PeopleLists', 'Applying list assignments', { count: peopleWithListSpaces.length });

            // Update local state: copy listSpaceId to assignedSpaceId
            const updatedPeople: Person[] = peopleStore.people.map(p => ({
                ...p,
                assignedSpaceId: p.listSpaceId || p.assignedSpaceId,
                aimsSyncStatus: p.listSpaceId ? 'pending' as const : p.aimsSyncStatus,
            }));

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
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Mark that there are pending (unsaved) changes
     */
    const markPendingChanges = useCallback(() => {
        if (peopleStore.activeListId) {
            setPendingChanges(true);
        }
    }, [peopleStore.activeListId]);

    /**
     * Delete a list (derived from AIMS data)
     * This clears listName from all people in that list
     * Note: To persist, must sync to AIMS after deletion
     */
    const deleteList = useCallback((listId: string): void => {
        try {
            // Extract storage name from the list ID (format: aims-list-STORAGENAME)
            const storageName = listId.replace('aims-list-', '');
            if (!storageName) {
                throw new Error('Invalid list ID');
            }

            // Clear listName from all people in this list
            const updatedPeople = peopleStore.people.map(p => {
                if (p.listName === storageName) {
                    return {
                        ...p,
                        listName: undefined,
                        listSpaceId: undefined,
                    };
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
     * Count of people with pending list assignments (listSpaceId set but not assignedSpaceId)
     */
    const pendingAssignmentsCount = useMemo(() => {
        return peopleStore.people.filter(p => p.listSpaceId && !p.assignedSpaceId).length;
    }, [peopleStore.people]);

    return {
        // State - derived from AIMS data (people's listName)
        peopleLists: derivedLists,
        activeListName: peopleStore.activeListName,
        activeListId: peopleStore.activeListId,
        loadedListMetadata,
        pendingChanges,
        pendingAssignmentsCount,
        
        // Validation helpers
        validateListName,
        LIST_NAME_MAX_LENGTH,
        
        // Actions
        savePeopleList,
        saveListToAims,
        updateCurrentList,
        loadList,
        deleteList,
        applyListAssignments,
        markPendingChanges,
    };
}
