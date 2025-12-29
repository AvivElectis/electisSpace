import { useCallback } from 'react';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { parsePeopleCSV, postPersonAssignment, postBulkAssignments, postEmptyAssignments } from '../infrastructure/peopleService';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';
import type { Person, PeopleList } from '../domain/types';

/**
 * People Controller Hook
 * Manages people data, CSV upload, space assignments, and AIMS integration
 */
export function usePeopleController() {
    const peopleStore = usePeopleStore();
    const settings = useSettingsStore(state => state.settings);
    const updateSettings = useSettingsStore(state => state.updateSettings);

    /**
     * Load people from CSV file
     */
    const loadPeopleFromCSV = useCallback(async (file: File): Promise<void> => {
        try {
            logger.info('PeopleController', 'Loading CSV file', { filename: file.name, size: file.size });

            if (!settings.solumArticleFormat) {
                throw new Error('SoluM article format not configured');
            }

            const csvContent = await file.text();
            const people = parsePeopleCSV(csvContent, settings.solumArticleFormat, settings.solumMappingConfig);

            peopleStore.setPeople(people);
            logger.info('PeopleController', 'People loaded from CSV', { count: people.length });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to load CSV', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig, peopleStore]);

    /**
     * Load people from CSV content string (already read from file)
     */
    const loadPeopleFromContent = useCallback(async (csvContent: string): Promise<void> => {
        try {
            logger.info('PeopleController', 'Loading CSV content', { length: csvContent.length });

            if (!settings.solumArticleFormat) {
                throw new Error('SoluM article format not configured');
            }

            const people = parsePeopleCSV(csvContent, settings.solumArticleFormat, settings.solumMappingConfig);

            peopleStore.setPeople(people);
            logger.info('PeopleController', 'People loaded from CSV content', { count: people.length });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to load CSV content', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig, peopleStore]);

    /**
     * Assign space to person (auto-posts to AIMS)
     */
    const assignSpaceToPerson = useCallback(async (
        personId: string,
        spaceId: string,
        postToAims: boolean = true  // Default to true for auto-post
    ): Promise<boolean> => {
        try {
            logger.info('PeopleController', 'Assigning space to person', { personId, spaceId, postToAims });

            // Update local state
            peopleStore.assignSpace(personId, spaceId);

            // Auto-post to AIMS (default behavior)
            if (postToAims && settings.solumConfig && settings.solumConfig.tokens) {
                peopleStore.updateSyncStatus([personId], 'pending');
                
                try {
                    const person = peopleStore.people.find(p => p.id === personId);
                    if (person) {
                        await postPersonAssignment(
                            { ...person, assignedSpaceId: spaceId },
                            settings.solumConfig,
                            settings.solumConfig.tokens.accessToken,
                            settings.solumMappingConfig
                        );
                        peopleStore.updateSyncStatus([personId], 'synced');
                        logger.info('PeopleController', 'Assignment posted to AIMS', { personId });
                        return true;
                    }
                } catch (aimsError: any) {
                    peopleStore.updateSyncStatus([personId], 'error');
                    logger.error('PeopleController', 'Failed to post to AIMS', { error: aimsError.message });
                    return false;
                }
            }
            return true;
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to assign space', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Bulk assign spaces (auto-posts to AIMS)
     */
    const bulkAssignSpaces = useCallback(async (
        assignments: Array<{ personId: string; spaceId: string }>,
        postToAims: boolean = true  // Default to true for auto-post
    ): Promise<{ success: boolean; syncedCount: number }> => {
        try {
            logger.info('PeopleController', 'Bulk assigning spaces', { count: assignments.length, postToAims });

            const personIds = assignments.map(a => a.personId);

            // Update local state
            assignments.forEach(({ personId, spaceId }) => {
                peopleStore.assignSpace(personId, spaceId);
            });

            // Auto-post to AIMS (default behavior)
            if (postToAims && settings.solumConfig && settings.solumConfig.tokens) {
                peopleStore.updateSyncStatus(personIds, 'pending');
                
                try {
                    // Get updated people with assigned spaces
                    const assignedPeople = assignments.map(({ personId, spaceId }) => {
                        const person = peopleStore.people.find(p => p.id === personId);
                        return person ? { ...person, assignedSpaceId: spaceId } : null;
                    }).filter((p): p is Person => p !== null);

                    if (assignedPeople.length > 0) {
                        await postBulkAssignments(
                            assignedPeople,
                            settings.solumConfig,
                            settings.solumConfig.tokens.accessToken,
                            settings.solumMappingConfig
                        );
                        peopleStore.updateSyncStatus(personIds, 'synced');
                        logger.info('PeopleController', 'Bulk assignments posted to AIMS', { count: assignedPeople.length });
                        return { success: true, syncedCount: assignedPeople.length };
                    }
                } catch (aimsError: any) {
                    peopleStore.updateSyncStatus(personIds, 'error');
                    logger.error('PeopleController', 'Failed to post bulk to AIMS', { error: aimsError.message });
                    return { success: false, syncedCount: 0 };
                }
            }
            return { success: true, syncedCount: 0 };
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to bulk assign spaces', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

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

            logger.info('PeopleController', 'People list saved', { listId: list.id, name, count: list.people.length });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to save people list', { error: error.message });
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

            logger.info('PeopleController', 'People list updated', { listId: updatedList.id, count: updatedList.people.length });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to update people list', { error: error.message });
            throw error;
        }
    }, [peopleStore]);

    /**
     * Load a saved list
     */
    const loadList = useCallback((listId: string): void => {
        try {
            peopleStore.loadPeopleList(listId);
            logger.info('PeopleController', 'People list loaded', { listId });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to load people list', { error: error.message });
            throw error;
        }
    }, [peopleStore]);

    /**
     * Delete a list
     */
    const deleteList = useCallback((listId: string): void => {
        try {
            peopleStore.deletePeopleList(listId);
            logger.info('PeopleController', 'People list deleted', { listId });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to delete people list', { error: error.message });
            throw error;
        }
    }, [peopleStore]);

    /**
     * Set total spaces available
     */
    const setTotalSpaces = useCallback((count: number): void => {
        try {
            updateSettings({
                peopleManagerConfig: {
                    totalSpaces: count
                }
            });

            peopleStore.setSpaceAllocation({
                ...peopleStore.spaceAllocation,
                totalSpaces: count,
                availableSpaces: count - peopleStore.spaceAllocation.assignedSpaces,
            });

            logger.info('PeopleController', 'Total spaces set', { count });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to set total spaces', { error: error.message });
            throw error;
        }
    }, [updateSettings, peopleStore]);

    /**
     * Post selected people to AIMS
     * @param personIds - Array of person IDs to post
     */
    const postSelectedToAims = useCallback(async (personIds: string[]): Promise<{ success: boolean; syncedCount: number }> => {
        try {
            logger.info('PeopleController', 'Posting selected people to AIMS', { count: personIds.length });

            if (!settings.solumConfig || !settings.solumConfig.tokens) {
                throw new Error('SoluM configuration not complete');
            }

            const selectedPeople = peopleStore.people.filter(p => personIds.includes(p.id));

            if (selectedPeople.length === 0) {
                throw new Error('No people found with the provided IDs');
            }

            peopleStore.updateSyncStatus(personIds, 'pending');

            try {
                await postBulkAssignments(
                    selectedPeople,
                    settings.solumConfig,
                    settings.solumConfig.tokens.accessToken,
                    settings.solumMappingConfig
                );

                peopleStore.updateSyncStatus(personIds, 'synced');
                logger.info('PeopleController', 'Selected people posted to AIMS', { count: selectedPeople.length });
                return { success: true, syncedCount: selectedPeople.length };
            } catch (aimsError: any) {
                peopleStore.updateSyncStatus(personIds, 'error');
                throw aimsError;
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to post selected people to AIMS', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Post ALL assigned people to AIMS
     */
    const postAllAssignmentsToAims = useCallback(async (): Promise<{ success: boolean; syncedCount: number }> => {
        try {
            const assignedPeople = peopleStore.people.filter(p => p.assignedSpaceId);
            
            if (assignedPeople.length === 0) {
                logger.warn('PeopleController', 'No assigned people to post');
                return { success: true, syncedCount: 0 };
            }

            logger.info('PeopleController', 'Posting all assignments to AIMS', { count: assignedPeople.length });

            if (!settings.solumConfig || !settings.solumConfig.tokens) {
                throw new Error('SoluM configuration not complete');
            }

            const personIds = assignedPeople.map(p => p.id);
            peopleStore.updateSyncStatus(personIds, 'pending');

            try {
                await postBulkAssignments(
                    assignedPeople,
                    settings.solumConfig,
                    settings.solumConfig.tokens.accessToken,
                    settings.solumMappingConfig
                );

                peopleStore.updateSyncStatus(personIds, 'synced');
                logger.info('PeopleController', 'All assignments posted to AIMS', { count: assignedPeople.length });
                return { success: true, syncedCount: assignedPeople.length };
            } catch (aimsError: any) {
                peopleStore.updateSyncStatus(personIds, 'error');
                throw aimsError;
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to post all assignments to AIMS', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Cancel all assignments - clear locally and send empty data to AIMS
     */
    const cancelAllAssignments = useCallback(async (): Promise<{ success: boolean; clearedCount: number }> => {
        try {
            const assignedPeople = peopleStore.people.filter(p => p.assignedSpaceId);
            
            if (assignedPeople.length === 0) {
                logger.warn('PeopleController', 'No assignments to cancel');
                return { success: true, clearedCount: 0 };
            }

            logger.info('PeopleController', 'Canceling all assignments', { count: assignedPeople.length });

            // Post empty data to AIMS first (if configured)
            if (settings.solumConfig && settings.solumConfig.tokens) {
                try {
                    await postEmptyAssignments(
                        assignedPeople,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    logger.info('PeopleController', 'Empty assignments posted to AIMS', { count: assignedPeople.length });
                } catch (aimsError: any) {
                    logger.error('PeopleController', 'Failed to post empty to AIMS', { error: aimsError.message });
                    // Continue with local clearing even if AIMS fails
                }
            }

            // Clear all local assignments
            peopleStore.unassignAllSpaces();

            logger.info('PeopleController', 'All assignments canceled', { count: assignedPeople.length });
            return { success: true, clearedCount: assignedPeople.length };
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to cancel all assignments', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    return {
        // State
        people: peopleStore.people,
        peopleLists: peopleStore.peopleLists,
        activeListName: peopleStore.activeListName,
        activeListId: peopleStore.activeListId,
        spaceAllocation: peopleStore.spaceAllocation,

        // Actions
        loadPeopleFromCSV,
        loadPeopleFromContent,
        assignSpaceToPerson,
        bulkAssignSpaces,
        savePeopleList,
        updateCurrentList,
        loadList,
        deleteList,
        setTotalSpaces,
        postSelectedToAims,
        postAllAssignmentsToAims,
        cancelAllAssignments,

        // Store actions
        addPerson: peopleStore.addPerson,
        updatePerson: peopleStore.updatePerson,
        deletePerson: peopleStore.deletePerson,
        unassignSpace: peopleStore.unassignSpace,
        updateSyncStatus: peopleStore.updateSyncStatus,
    };
}
