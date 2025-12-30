import { useCallback } from 'react';
import { usePeopleStore } from '../../infrastructure/peopleStore';
import { postBulkAssignments, clearSpaceIdsInAims } from '../../infrastructure/peopleService';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';
import type { PeopleList } from '../../domain/types';

/**
 * Hook for People List management operations
 */
export function usePeopleLists() {
    const peopleStore = usePeopleStore();
    const settings = useSettingsStore(state => state.settings);

    /**
     * Save current people as a list
     */
    const savePeopleList = useCallback((name: string): void => {
        try {
            const list: PeopleList = {
                id: `list-${Date.now()}`,
                name,
                createdAt: new Date().toISOString(),
                people: [...peopleStore.people],
            };

            peopleStore.addPeopleList(list);
            peopleStore.setActiveListId(list.id);
            peopleStore.setActiveListName(name);

            logger.info('PeopleLists', 'People list saved', { listId: list.id, name, count: list.people.length });
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to save people list', { error: error.message });
            throw error;
        }
    }, [peopleStore]);

    /**
     * Update the current active list
     */
    const updateCurrentList = useCallback((): void => {
        try {
            if (!peopleStore.activeListId) {
                throw new Error('No active list to update');
            }

            const updatedList: PeopleList = {
                id: peopleStore.activeListId,
                name: peopleStore.activeListName || 'Unnamed List',
                createdAt: peopleStore.peopleLists.find(l => l.id === peopleStore.activeListId)?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                people: [...peopleStore.people],
            };

            peopleStore.updatePeopleList(peopleStore.activeListId, updatedList);

            logger.info('PeopleLists', 'People list updated', { listId: updatedList.id, count: updatedList.people.length });
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to update people list', { error: error.message });
            throw error;
        }
    }, [peopleStore]);

    /**
     * Load a saved list with AIMS synchronization
     * Clears old assigned spaces in AIMS and posts new assignments
     */
    const loadList = useCallback(async (listId: string): Promise<void> => {
        try {
            // Get current assigned space IDs before loading new list
            const currentAssignedSpaceIds = new Set(
                peopleStore.people
                    .filter(p => p.assignedSpaceId)
                    .map(p => p.assignedSpaceId!)
            );

            // Get the list to load
            const listToLoad = peopleStore.peopleLists.find(l => l.id === listId);
            if (!listToLoad) {
                throw new Error('List not found');
            }

            // Get new list's assigned space IDs
            const newAssignedSpaceIds = new Set(
                listToLoad.people
                    .filter(p => p.assignedSpaceId)
                    .map(p => p.assignedSpaceId!)
            );

            // Find spaces that need to be cleared (in current but not in new)
            const spacesToClear = [...currentAssignedSpaceIds].filter(
                spaceId => !newAssignedSpaceIds.has(spaceId)
            );

            logger.info('PeopleLists', 'Loading list with AIMS sync', {
                listId,
                currentSpaces: currentAssignedSpaceIds.size,
                newSpaces: newAssignedSpaceIds.size,
                spacesToClear: spacesToClear.length
            });

            // Clear old spaces in AIMS that are no longer assigned
            if (spacesToClear.length > 0 && settings.solumConfig && settings.solumConfig.tokens) {
                try {
                    await clearSpaceIdsInAims(
                        spacesToClear,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    logger.info('PeopleLists', 'Old spaces cleared in AIMS', { count: spacesToClear.length });
                } catch (clearError: any) {
                    logger.error('PeopleLists', 'Failed to clear old spaces in AIMS', { error: clearError.message });
                    // Continue with loading even if clearing fails
                }
            }

            // Load the new list locally
            peopleStore.loadPeopleList(listId);

            // Post new assignments to AIMS
            const newAssignedPeople = listToLoad.people.filter(p => p.assignedSpaceId);
            if (newAssignedPeople.length > 0 && settings.solumConfig && settings.solumConfig.tokens) {
                try {
                    const personIds = newAssignedPeople.map(p => p.id);
                    peopleStore.updateSyncStatus(personIds, 'pending');

                    await postBulkAssignments(
                        newAssignedPeople,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );

                    peopleStore.updateSyncStatus(personIds, 'synced');
                    logger.info('PeopleLists', 'New list assignments posted to AIMS', { count: newAssignedPeople.length });
                } catch (postError: any) {
                    logger.error('PeopleLists', 'Failed to post new assignments to AIMS', { error: postError.message });
                    // Local state is already updated, just log the error
                }
            }

            logger.info('PeopleLists', 'People list loaded with AIMS sync', { listId });
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to load people list', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Delete a list
     */
    const deleteList = useCallback((listId: string): void => {
        try {
            peopleStore.deletePeopleList(listId);
            logger.info('PeopleLists', 'People list deleted', { listId });
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to delete people list', { error: error.message });
            throw error;
        }
    }, [peopleStore]);

    return {
        // State (from store)
        peopleLists: peopleStore.peopleLists,
        activeListName: peopleStore.activeListName,
        activeListId: peopleStore.activeListId,
        
        // Actions
        savePeopleList,
        updateCurrentList,
        loadList,
        deleteList,
    };
}
