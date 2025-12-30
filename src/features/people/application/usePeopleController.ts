import { useCallback } from 'react';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { parsePeopleCSV, postPersonAssignment, postBulkAssignments, postEmptyAssignments, clearSpaceInAims, clearSpaceIdsInAims, convertSpacesToPeople } from '../infrastructure/peopleService';
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
     * If person already has a space, clears the old space first
     */
    const assignSpaceToPerson = useCallback(async (
        personId: string,
        spaceId: string,
        postToAims: boolean = true  // Default to true for auto-post
    ): Promise<boolean> => {
        try {
            const person = peopleStore.people.find(p => p.id === personId);
            if (!person) {
                throw new Error('Person not found');
            }

            const oldSpaceId = person.assignedSpaceId;
            logger.info('PeopleController', 'Assigning space to person', { personId, spaceId, oldSpaceId, postToAims });

            // If person already has a different space, clear the old space in AIMS first
            if (postToAims && oldSpaceId && oldSpaceId !== spaceId && settings.solumConfig && settings.solumConfig.tokens) {
                try {
                    logger.info('PeopleController', 'Clearing old space before reassignment', { oldSpaceId, newSpaceId: spaceId });
                    await clearSpaceInAims(
                        oldSpaceId,
                        person,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    logger.info('PeopleController', 'Old space cleared in AIMS', { oldSpaceId });
                } catch (clearError: any) {
                    logger.error('PeopleController', 'Failed to clear old space in AIMS', { error: clearError.message });
                    // Continue with assignment even if clearing old space fails
                }
            }

            // Update local state
            peopleStore.assignSpace(personId, spaceId);

            // Auto-post to AIMS (default behavior)
            if (postToAims && settings.solumConfig && settings.solumConfig.tokens) {
                peopleStore.updateSyncStatus([personId], 'pending');
                
                try {
                    await postPersonAssignment(
                        { ...person, assignedSpaceId: spaceId },
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    peopleStore.updateSyncStatus([personId], 'synced');
                    logger.info('PeopleController', 'Assignment posted to AIMS', { personId });
                    return true;
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
                    }).filter((p): p is Person & { assignedSpaceId: string } => p !== null && !!p.assignedSpaceId);

                    if (assignedPeople.length > 0) {
                        await postBulkAssignments(
                            assignedPeople as Person[],
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

            logger.info('PeopleController', 'Loading list with AIMS sync', {
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
                    logger.info('PeopleController', 'Old spaces cleared in AIMS', { count: spacesToClear.length });
                } catch (clearError: any) {
                    logger.error('PeopleController', 'Failed to clear old spaces in AIMS', { error: clearError.message });
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
                    logger.info('PeopleController', 'New list assignments posted to AIMS', { count: newAssignedPeople.length });
                } catch (postError: any) {
                    logger.error('PeopleController', 'Failed to post new assignments to AIMS', { error: postError.message });
                    // Local state is already updated, just log the error
                }
            }

            logger.info('PeopleController', 'People list loaded with AIMS sync', { listId });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to load people list', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

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

    /**
     * Unassign space from person with AIMS clearing
     * Posts empty data to AIMS (except ID and global fields), then clears local state
     */
    const unassignSpaceWithAims = useCallback(async (personId: string): Promise<boolean> => {
        try {
            const person = peopleStore.people.find(p => p.id === personId);
            if (!person) {
                throw new Error('Person not found');
            }

            const spaceId = person.assignedSpaceId;
            if (!spaceId) {
                logger.warn('PeopleController', 'Person has no space assigned', { personId });
                return true; // Nothing to unassign
            }

            logger.info('PeopleController', 'Unassigning space from person with AIMS clearing', { personId, spaceId });

            // Clear the space in AIMS first (if configured)
            if (settings.solumConfig && settings.solumConfig.tokens) {
                try {
                    await clearSpaceInAims(
                        spaceId,
                        person,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    logger.info('PeopleController', 'Space cleared in AIMS', { spaceId });
                } catch (aimsError: any) {
                    logger.error('PeopleController', 'Failed to clear space in AIMS', { error: aimsError.message });
                    // Continue with local clearing even if AIMS fails
                }
            }

            // Clear local assignment
            peopleStore.unassignSpace(personId);
            logger.info('PeopleController', 'Space unassigned locally', { personId });

            return true;
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to unassign space', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Sync people data FROM AIMS
     * Downloads current articles from AIMS and converts them to People format
     * This allows the People table to reflect the current state in AIMS
     */
    const syncFromAims = useCallback(async (): Promise<void> => {
        try {
            logger.info('PeopleController', 'Starting sync from AIMS');

            // Get the sync context - note: this requires being inside SyncProvider
            // We'll use a different approach - directly use the sync adapter
            if (!settings.solumConfig || !settings.solumConfig.tokens) {
                throw new Error('SoluM API not connected. Please connect in Settings first.');
            }

            // Import and use fetchArticles directly
            const { fetchArticles } = await import('@shared/infrastructure/services/solumService');
            
            const token = settings.solumConfig.tokens.accessToken;
            const storeNumber = settings.solumConfig.storeNumber;

            // Fetch all articles with pagination
            let allArticles: any[] = [];
            let page = 0;
            const pageSize = 100;
            let hasMore = true;

            logger.info('PeopleController', 'Fetching articles from AIMS', { storeNumber });

            while (hasMore) {
                const articlesChunk = await fetchArticles(
                    settings.solumConfig,
                    storeNumber,
                    token,
                    page,
                    pageSize
                );

                if (articlesChunk.length > 0) {
                    allArticles = [...allArticles, ...articlesChunk];
                    if (articlesChunk.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }

            logger.info('PeopleController', 'Articles fetched from AIMS', { count: allArticles.length });

            // Convert articles to Space-like format for the converter
            const spaces = allArticles.map(article => ({
                id: article.articleId || article.id,
                data: article.data || article.articleData || {},
                labelCode: article.labelCode,
            }));

            // Convert spaces to people
            const people = convertSpacesToPeople(spaces, settings.solumMappingConfig);

            // Update the store with synced people
            peopleStore.setPeople(people);

            logger.info('PeopleController', 'Sync from AIMS complete', { peopleCount: people.length });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to sync from AIMS', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig, peopleStore]);

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
        unassignSpace: unassignSpaceWithAims,
        updateSyncStatus: peopleStore.updateSyncStatus,

        // Sync actions
        syncFromAims,
    };
}
