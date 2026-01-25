import { useCallback } from 'react';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { parsePeopleCSV, postPersonAssignment, postBulkAssignments, postEmptyAssignments, clearSpaceInAims, convertSpacesToPeopleWithVirtualPool, buildArticleDataWithMetadata } from '../infrastructure/peopleService';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';
import type { Person, PeopleList } from '../domain/types';
import { getVirtualSpaceId, isPersonInList, removePersonFromList } from '../domain/types';
import { getNextPoolId, isPoolId } from '../infrastructure/virtualPoolService';
import { v4 as uuidv4 } from 'uuid';
import type { SolumConfig } from '@shared/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';

/**
 * Fetch empty POOL articles from AIMS
 * These are POOL-ID articles that have no meaningful data (only the article ID)
 * Returns a Set of POOL-IDs that can be reused
 */
async function fetchEmptyPoolArticlesFromAims(
    solumConfig: SolumConfig,
    mappingConfig?: SolumMappingConfig
): Promise<Set<string>> {
    const emptyPoolIds = new Set<string>();

    try {
        const { fetchArticles } = await import('@shared/infrastructure/services/solumService');

        if (!solumConfig.tokens?.accessToken) {
            return emptyPoolIds;
        }

        const articles = await fetchArticles(
            solumConfig,
            solumConfig.storeNumber,
            solumConfig.tokens.accessToken
        );

        const articleIdField = mappingConfig?.mappingInfo?.articleId || 'ARTICLE_ID';

        articles.forEach((article: any) => {
            const articleId = article.id || article.data?.[articleIdField] || article.data?.ARTICLE_ID;

            // Only consider POOL-ID articles
            if (!articleId || !isPoolId(articleId)) {
                return;
            }

            // Check if this article is empty (no meaningful data beyond the ID)
            const data = article.data || {};
            const hasData = Object.entries(data).some(([key, value]) => {
                // Skip ID fields and metadata fields
                if (key === articleIdField || key === 'ARTICLE_ID' || key.startsWith('__')) {
                    return false;
                }
                return value && String(value).trim().length > 0;
            });

            if (!hasData) {
                emptyPoolIds.add(articleId);
                logger.debug('PeopleController', 'Found empty POOL article in AIMS', { poolId: articleId });
            }
        });

        logger.info('PeopleController', 'Fetched empty POOL articles from AIMS', { count: emptyPoolIds.size });
    } catch (error: any) {
        logger.warn('PeopleController', 'Failed to fetch empty POOL articles from AIMS', { error: error.message });
    }

    return emptyPoolIds;
}

/**
 * People Controller Hook
 * Manages people data, CSV upload, space assignments, and AIMS integration
 * 
 * PERFORMANCE: Uses getState() pattern to avoid re-renders when store changes.
 * The controller provides action functions that read state at call-time, not subscription-time.
 */
export function usePeopleController() {
    // Use getState() for reading store data inside callbacks - avoids unnecessary re-renders
    const getStoreState = usePeopleStore.getState;
    const settings = useSettingsStore(state => state.settings);
    const updateSettings = useSettingsStore(state => state.updateSettings);

    /**
     * Load people from CSV file
     */
    const loadPeopleFromCSV = useCallback(async (file: File): Promise<void> => {
        try {
            logger.info('CSV', 'Loading CSV file', { filename: file.name, size: file.size });
            logger.startTimer('csv-file-load');

            if (!settings.solumArticleFormat) {
                throw new Error('SoluM article format not configured');
            }

            const csvContent = await file.text();
            const people = parsePeopleCSV(csvContent, settings.solumArticleFormat, settings.solumMappingConfig);

            getStoreState().setPeople(people);
            logger.endTimer('csv-file-load', 'CSV', 'CSV file loaded and parsed', {
                filename: file.name,
                peopleCount: people.length
            });
        } catch (error: any) {
            logger.endTimer('csv-file-load', 'CSV', 'CSV file load failed', { error: error.message });
            logger.error('CSV', 'Failed to load CSV', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig]);

    /**
     * Load people from CSV content string with sync to AIMS
     * Generates UUIDs and virtual pool IDs for all people
     * If connected to AIMS, reuses empty POOL articles first
     */
    const loadPeopleFromContent = useCallback(async (csvContent: string): Promise<void> => {
        try {
            logger.info('PeopleController', 'Loading CSV content with sync', { length: csvContent.length });

            if (!settings.solumArticleFormat) {
                throw new Error('SoluM article format not configured');
            }

            // Get existing pool IDs from local store to avoid collisions
            const existingPoolIds = new Set(
                getStoreState().people
                    .map(p => getVirtualSpaceId(p))
                    .filter((id): id is string => id !== undefined && isPoolId(id))
            );

            // If connected to AIMS, fetch empty POOL articles that can be reused
            let preferredPoolIds: Set<string> | undefined;
            if (settings.solumConfig?.tokens?.accessToken) {
                preferredPoolIds = await fetchEmptyPoolArticlesFromAims(
                    settings.solumConfig,
                    settings.solumMappingConfig
                );
                logger.info('PeopleController', 'Fetched empty POOL articles for CSV import', {
                    count: preferredPoolIds.size
                });
            }

            const people = parsePeopleCSV(
                csvContent,
                settings.solumArticleFormat,
                settings.solumMappingConfig,
                existingPoolIds,
                preferredPoolIds
            );

            // Update local store
            getStoreState().setPeople(people);
            logger.info('PeopleController', 'People loaded from CSV content', { count: people.length });

            // Sync to AIMS if connected
            if (settings.solumConfig?.tokens?.accessToken && people.length > 0) {
                const personIds = people.map(p => p.id);
                getStoreState().updateSyncStatusLocal(personIds, 'pending');

                try {
                    const { pushArticles } = await import('@shared/infrastructure/services/solumService');

                    // Batch sync in chunks of 10
                    const batchSize = 10;
                    for (let i = 0; i < people.length; i += batchSize) {
                        const batch = people.slice(i, i + batchSize);

                        const articles = batch.map(person => {
                            const articleData = buildArticleDataWithMetadata(person, settings.solumMappingConfig);
                            articleData.articleId = getVirtualSpaceId(person) || person.id;
                            return articleData;
                        });

                        await pushArticles(
                            settings.solumConfig!,
                            settings.solumConfig!.storeNumber,
                            settings.solumConfig!.tokens!.accessToken,
                            articles
                        );
                    }

                    getStoreState().updateSyncStatusLocal(personIds, 'synced');
                    logger.info('PeopleController', 'CSV content synced to AIMS', { count: people.length });
                } catch (syncError: any) {
                    getStoreState().updateSyncStatusLocal(personIds, 'error');
                    logger.error('PeopleController', 'Failed to sync CSV content to AIMS', { error: syncError.message });
                }
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to load CSV content', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig, settings.solumConfig]);

    /**
     * Assign space to person (auto-posts to AIMS)
     * If person already has a space, clears the old space first
     * If person has a POOL-ID, clears the POOL-ID article in AIMS
     */
    const assignSpaceToPerson = useCallback(async (
        personId: string,
        spaceId: string,
        postToAims: boolean = true  // Default to true for auto-post
    ): Promise<boolean> => {
        try {
            const person = getStoreState().people.find(p => p.id === personId);
            if (!person) {
                throw new Error('Person not found');
            }

            const oldSpaceId = person.assignedSpaceId;
            const oldVirtualSpaceId = person.virtualSpaceId;
            logger.info('PeopleController', 'Assigning space to person', {
                personId, spaceId, oldSpaceId, oldVirtualSpaceId, postToAims
            });

            // If person has a POOL-ID, clear it in AIMS first (we're moving to a physical space)
            if (postToAims && oldVirtualSpaceId && isPoolId(oldVirtualSpaceId) && settings.solumConfig?.tokens) {
                try {
                    logger.info('PeopleController', 'Clearing POOL-ID article before physical assignment', {
                        poolId: oldVirtualSpaceId, newSpaceId: spaceId
                    });
                    await clearSpaceInAims(
                        oldVirtualSpaceId,
                        person,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    logger.info('PeopleController', 'POOL-ID article cleared in AIMS', { poolId: oldVirtualSpaceId });
                } catch (clearError: any) {
                    logger.error('PeopleController', 'Failed to clear POOL-ID article in AIMS', { error: clearError.message });
                    // Continue with assignment even if clearing fails
                }
            }

            // If person already has a different physical space, clear that too
            if (postToAims && oldSpaceId && oldSpaceId !== spaceId && settings.solumConfig?.tokens) {
                try {
                    logger.info('PeopleController', 'Clearing old physical space before reassignment', { oldSpaceId, newSpaceId: spaceId });
                    await clearSpaceInAims(
                        oldSpaceId,
                        person,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    logger.info('PeopleController', 'Old physical space cleared in AIMS', { oldSpaceId });
                } catch (clearError: any) {
                    logger.error('PeopleController', 'Failed to clear old physical space in AIMS', { error: clearError.message });
                    // Continue with assignment even if clearing old space fails
                }
            }

            // Update local state - set both assignedSpaceId and virtualSpaceId to the physical space
            getStoreState().assignSpaceLocal(personId, spaceId);
            // Also update virtualSpaceId to the physical space (no longer in pool)
            getStoreState().updatePersonLocal(personId, { virtualSpaceId: spaceId });

            // Auto-post to AIMS (default behavior)
            if (postToAims && settings.solumConfig && settings.solumConfig.tokens) {
                getStoreState().updateSyncStatusLocal([personId], 'pending');

                try {
                    await postPersonAssignment(
                        { ...person, assignedSpaceId: spaceId, virtualSpaceId: spaceId },
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    getStoreState().updateSyncStatusLocal([personId], 'synced');
                    logger.info('PeopleController', 'Assignment posted to AIMS', { personId });
                    return true;
                } catch (aimsError: any) {
                    getStoreState().updateSyncStatusLocal([personId], 'error');
                    logger.error('PeopleController', 'Failed to post to AIMS', { error: aimsError.message });
                    return false;
                }
            }
            return true;
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to assign space', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

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
                getStoreState().assignSpaceLocal(personId, spaceId);
            });

            // Auto-post to AIMS (default behavior)
            if (postToAims && settings.solumConfig && settings.solumConfig.tokens) {
                getStoreState().updateSyncStatusLocal(personIds, 'pending');

                try {
                    // Get updated people with assigned spaces
                    const assignedPeople = assignments.map(({ personId, spaceId }) => {
                        const person = getStoreState().people.find(p => p.id === personId);
                        return person ? { ...person, assignedSpaceId: spaceId } : null;
                    }).filter((p): p is Person & { assignedSpaceId: string } => p !== null && !!p.assignedSpaceId);

                    if (assignedPeople.length > 0) {
                        await postBulkAssignments(
                            assignedPeople as Person[],
                            settings.solumConfig,
                            settings.solumConfig.tokens.accessToken,
                            settings.solumMappingConfig
                        );
                        getStoreState().updateSyncStatusLocal(personIds, 'synced');
                        logger.info('PeopleController', 'Bulk assignments posted to AIMS', { count: assignedPeople.length });
                        return { success: true, syncedCount: assignedPeople.length };
                    }
                } catch (aimsError: any) {
                    getStoreState().updateSyncStatusLocal(personIds, 'error');
                    logger.error('PeopleController', 'Failed to post bulk to AIMS', { error: aimsError.message });
                    return { success: false, syncedCount: 0 };
                }
            }
            return { success: true, syncedCount: 0 };
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to bulk assign spaces', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Save current people as a list
     */
    const savePeopleList = useCallback((name: string): void => {
        try {
            const storageName = name.trim().replace(/\s+/g, '_');
            const list: PeopleList = {
                id: `list-${Date.now()}`,
                name,
                storageName,
                createdAt: new Date().toISOString(),
                people: [...getStoreState().people],
            };

            getStoreState().addPeopleList(list);
            getStoreState().setActiveListId(list.id);
            getStoreState().setActiveListName(name);

            logger.info('PeopleController', 'People list saved', { listId: list.id, name, count: list.people?.length ?? 0 });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to save people list', { error: error.message });
            throw error;
        }
    }, []);

    /**
     * Update the current active list
     */
    const updateCurrentList = useCallback((): void => {
        try {
            const activeListId = getStoreState().activeListId;
            if (!activeListId) {
                throw new Error('No active list to update');
            }

            const existingList = getStoreState().peopleLists.find(l => l.id === activeListId);
            const updatedList: PeopleList = {
                id: activeListId,
                name: getStoreState().activeListName || 'Unnamed List',
                storageName: existingList?.storageName || (getStoreState().activeListName || 'Unnamed_List').replace(/\s+/g, '_'),
                createdAt: existingList?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                people: [...getStoreState().people],
            };

            getStoreState().updatePeopleList(activeListId, updatedList);

            logger.info('PeopleController', 'People list updated', { listId: updatedList.id, count: updatedList.people?.length ?? 0 });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to update people list', { error: error.message });
            throw error;
        }
    }, []);

    /**
     * Load a saved list with AIMS synchronization
     * Loads a list by setting it as active and restoring assignments from _LIST_MEMBERSHIPS_
     * @param listId - ID of list to load
     * @param _autoApply - Ignored (kept for API compatibility, always applies assignments)
     */
    const loadList = useCallback(async (listId: string, _autoApply?: boolean): Promise<void> => {
        try {
            // Get the list to load
            const listToLoad = getStoreState().peopleLists.find(l => l.id === listId);
            if (!listToLoad) {
                throw new Error('List not found');
            }

            const storageName = listToLoad.storageName || listToLoad.id.replace('aims-list-', '');

            logger.info('PeopleController', 'Loading list', {
                listId,
                name: listToLoad.name,
                storageName
            });

            // Set active list metadata
            getStoreState().setActiveListId(listId);
            getStoreState().setActiveListName(listToLoad.name);

            // Restore people's assignments from their _LIST_MEMBERSHIPS_
            const updatedPeople = getStoreState().people.map(person => {
                // Check if person is a member of this list
                const memberships = (person as any)._LIST_MEMBERSHIPS_ as Array<{ listName: string; spaceId?: string }> | undefined;
                const membership = memberships?.find(m => m.listName === storageName);

                if (membership) {
                    // Person is in this list - restore their saved assignment
                    return {
                        ...person,
                        assignedSpaceId: membership.spaceId || undefined
                    };
                }

                // Person not in this list - clear their assignment
                return {
                    ...person,
                    assignedSpaceId: undefined
                };
            });

            getStoreState().setPeople(updatedPeople);
            getStoreState().updateSpaceAllocation();
            getStoreState().clearPendingChanges();

            logger.info('PeopleController', 'List loaded successfully', {
                listId,
                name: listToLoad.name
            });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to load people list', { error: error.message });
            throw error;
        }
    }, []);

    /**
     * Delete a list - removes list from store, clears _LIST_MEMBERSHIPS_ from people, and syncs to AIMS
     */
    const deleteList = useCallback(async (listId: string): Promise<void> => {
        try {
            const listToDelete = getStoreState().peopleLists.find(l => l.id === listId);
            if (!listToDelete) {
                throw new Error('List not found');
            }

            const storageName = listToDelete.storageName || listId.replace('aims-list-', '');

            // Find people who are members of this list (before removing membership)
            const affectedPeople = getStoreState().people.filter(p => isPersonInList(p, storageName));

            // Remove list membership from all people in this list
            const updatedPeople = getStoreState().people.map(p => {
                if (isPersonInList(p, storageName)) {
                    return removePersonFromList(p, storageName);
                }
                return p;
            });

            getStoreState().setPeople(updatedPeople);
            getStoreState().deletePeopleList(listId);

            // Sync affected people to AIMS to update their _LIST_MEMBERSHIPS_
            if (affectedPeople.length > 0 && settings.solumConfig?.tokens?.accessToken) {
                try {
                    const updatedAffectedPeople = updatedPeople.filter(p =>
                        affectedPeople.some(ap => ap.id === p.id)
                    );

                    await postBulkAssignments(
                        updatedAffectedPeople,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );

                    logger.info('PeopleController', 'Synced list deletion to AIMS', {
                        listId,
                        storageName,
                        affectedCount: affectedPeople.length
                    });
                } catch (syncError: any) {
                    logger.error('PeopleController', 'Failed to sync list deletion to AIMS', {
                        error: syncError.message
                    });
                    // Local deletion succeeded, just log the AIMS sync failure
                }
            }

            logger.info('PeopleController', 'People list deleted', { listId, storageName });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to delete people list', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

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

            getStoreState().setSpaceAllocation({
                ...getStoreState().spaceAllocation,
                totalSpaces: count,
                availableSpaces: count - getStoreState().spaceAllocation.assignedSpaces,
            });

            logger.info('PeopleController', 'Total spaces set', { count });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to set total spaces', { error: error.message });
            throw error;
        }
    }, [updateSettings]);

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

            const selectedPeople = getStoreState().people.filter(p => personIds.includes(p.id));

            if (selectedPeople.length === 0) {
                throw new Error('No people found with the provided IDs');
            }

            getStoreState().updateSyncStatusLocal(personIds, 'pending');

            try {
                await postBulkAssignments(
                    selectedPeople,
                    settings.solumConfig,
                    settings.solumConfig.tokens.accessToken,
                    settings.solumMappingConfig
                );

                getStoreState().updateSyncStatusLocal(personIds, 'synced');
                logger.info('PeopleController', 'Selected people posted to AIMS', { count: selectedPeople.length });
                return { success: true, syncedCount: selectedPeople.length };
            } catch (aimsError: any) {
                getStoreState().updateSyncStatusLocal(personIds, 'error');
                throw aimsError;
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to post selected people to AIMS', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Post ALL assigned people to AIMS
     */
    const postAllAssignmentsToAims = useCallback(async (): Promise<{ success: boolean; syncedCount: number }> => {
        try {
            const assignedPeople = getStoreState().people.filter(p => p.assignedSpaceId);

            if (assignedPeople.length === 0) {
                logger.warn('PeopleController', 'No assigned people to post');
                return { success: true, syncedCount: 0 };
            }

            logger.info('PeopleController', 'Posting all assignments to AIMS', { count: assignedPeople.length });

            if (!settings.solumConfig || !settings.solumConfig.tokens) {
                throw new Error('SoluM configuration not complete');
            }

            const personIds = assignedPeople.map(p => p.id);
            getStoreState().updateSyncStatusLocal(personIds, 'pending');

            try {
                await postBulkAssignments(
                    assignedPeople,
                    settings.solumConfig,
                    settings.solumConfig.tokens.accessToken,
                    settings.solumMappingConfig
                );

                getStoreState().updateSyncStatusLocal(personIds, 'synced');
                logger.info('PeopleController', 'All assignments posted to AIMS', { count: assignedPeople.length });
                return { success: true, syncedCount: assignedPeople.length };
            } catch (aimsError: any) {
                getStoreState().updateSyncStatusLocal(personIds, 'error');
                throw aimsError;
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to post all assignments to AIMS', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Cancel all assignments - clear locally and send empty data to AIMS
     */
    const cancelAllAssignments = useCallback(async (): Promise<{ success: boolean; clearedCount: number }> => {
        try {
            const assignedPeople = getStoreState().people.filter(p => p.assignedSpaceId);

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
            getStoreState().unassignAllSpacesLocal();

            logger.info('PeopleController', 'All assignments canceled', { count: assignedPeople.length });
            return { success: true, clearedCount: assignedPeople.length };
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to cancel all assignments', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Unassign space from person with AIMS clearing
     * Posts empty data to AIMS (except ID and global fields), then clears local state
     */
    const unassignSpaceWithAims = useCallback(async (personId: string): Promise<boolean> => {
        try {
            const person = getStoreState().people.find(p => p.id === personId);
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
            getStoreState().unassignSpaceLocal(personId);
            logger.info('PeopleController', 'Space unassigned locally', { personId });

            return true;
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to unassign space', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

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

            // Convert spaces to people using virtual pool support
            // This properly handles POOL-IDs and doesn't set them as assigned
            const people = convertSpacesToPeopleWithVirtualPool(spaces, settings.solumMappingConfig);

            // Update the store with synced people
            getStoreState().setPeople(people);

            logger.info('PeopleController', 'Sync from AIMS complete', { peopleCount: people.length });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to sync from AIMS', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Add a person with immediate AIMS sync
     * Creates person with UUID and virtual pool ID, then syncs to AIMS
     * Accepts either a Person object or just the data Record
     * 
     * If connected to AIMS, fetches empty POOL articles first to reuse them
     */
    const addPersonWithSync = useCallback(async (personInput: Person | Record<string, string>): Promise<Person> => {
        try {
            // Get existing pool IDs from local store
            const existingPoolIds = new Set(
                getStoreState().people
                    .filter(p => {
                        const virtualId = getVirtualSpaceId(p);
                        return virtualId && isPoolId(virtualId) && !p.assignedSpaceId;
                    })
                    .map(p => getVirtualSpaceId(p)!)
            );

            let poolId: string;

            if (settings.solumConfig?.tokens?.accessToken) {
                const emptyPoolIds = await fetchEmptyPoolArticlesFromAims(
                    settings.solumConfig,
                    settings.solumMappingConfig
                );
                const reusablePoolId = Array.from(emptyPoolIds)
                    .filter(id => !existingPoolIds.has(id))
                    .sort()[0];

                if (reusablePoolId) {
                    poolId = reusablePoolId;
                    logger.info('PeopleController', 'Reusing empty POOL article from AIMS', { poolId });
                } else {
                    poolId = getNextPoolId(existingPoolIds);
                    logger.info('PeopleController', 'No empty POOL articles in AIMS, generating new', { poolId });
                }
            } else {
                poolId = getNextPoolId(existingPoolIds);
            }

            const isPerson = (input: any): input is Person =>
                input && typeof input === 'object' && 'data' in input;

            const personData: Person = isPerson(personInput)
                ? {
                    ...personInput,
                    id: uuidv4(),
                    virtualSpaceId: personInput.assignedSpaceId || poolId,
                    aimsSyncStatus: 'pending' as const,
                }
                : {
                    id: uuidv4(),
                    virtualSpaceId: poolId,
                    data: personInput,
                    aimsSyncStatus: 'pending' as const,
                };

            // Cloud Persistence: Create on Server
            const serverPerson = await getStoreState().createPerson({
                externalId: personData.id,
                data: {
                    ...personData.data,
                    virtualSpaceId: personData.virtualSpaceId,
                    assignedSpaceId: personData.assignedSpaceId,
                    aimsSyncStatus: 'pending'
                }
            });

            if (!serverPerson) throw new Error("Failed to create person on server");

            // Use serverPerson for sync logic, but we need to ensure local references match.
            // serverPerson might have a new UUID if server generated it, or kept externalId if we mapped it.
            // For now, allow serverPerson to be the source of truth.

            logger.info('PeopleController', 'Person added to Server', {
                personId: serverPerson.id
            });

            // Immediately sync to AIMS if connected
            if (settings.solumConfig?.tokens?.accessToken) {
                try {
                    const { pushArticles } = await import('@shared/infrastructure/services/solumService');

                    const articleData = buildArticleDataWithMetadata(personData, settings.solumMappingConfig);
                    articleData.articleId = personData.assignedSpaceId || personData.virtualSpaceId || poolId;

                    await pushArticles(
                        settings.solumConfig,
                        settings.solumConfig.storeNumber,
                        settings.solumConfig.tokens.accessToken,
                        [articleData]
                    );

                    getStoreState().updateSyncStatusLocal([serverPerson.id], 'synced');
                    logger.info('PeopleController', 'Person synced to AIMS', { personId: serverPerson.id });
                } catch (syncError: any) {
                    getStoreState().updateSyncStatusLocal([serverPerson.id], 'error');
                    logger.error('PeopleController', 'Failed to sync person to AIMS', { error: syncError.message });
                }
            }

            return serverPerson;
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to add person', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Update a person with immediate AIMS sync
     */
    const updatePersonWithSync = useCallback(async (personId: string, updates: Partial<Person>): Promise<void> => {
        try {
            // Cloud Persistence: Update on Server
            // Extract 'data' from updates if flat structure or nested
            const data = updates.data ? updates.data : undefined;

            const updatedPerson = await getStoreState().updatePerson(personId, { data });

            if (!updatedPerson) throw new Error("Failed to update person on server");

            logger.info('PeopleController', 'Person updated on Server', { personId });

            const person = updatedPerson; // Use returned person (which should be full object)

            // Immediately sync to AIMS if connected
            if (settings.solumConfig?.tokens?.accessToken) {
                getStoreState().updateSyncStatusLocal([personId], 'pending');

                try {
                    const { pushArticles } = await import('@shared/infrastructure/services/solumService');

                    const articleData = buildArticleDataWithMetadata(person, settings.solumMappingConfig);
                    articleData.articleId = person.assignedSpaceId || getVirtualSpaceId(person) || person.id;

                    await pushArticles(
                        settings.solumConfig,
                        settings.solumConfig.storeNumber,
                        settings.solumConfig.tokens.accessToken,
                        [articleData]
                    );

                    getStoreState().updateSyncStatusLocal([personId], 'synced');
                    logger.info('PeopleController', 'Person update synced to AIMS', { personId });
                } catch (syncError: any) {
                    getStoreState().updateSyncStatusLocal([personId], 'error');
                    logger.error('PeopleController', 'Failed to sync person update to AIMS', { error: syncError.message });
                }
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to update person', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Delete a person with immediate AIMS sync
     * Clears the virtual space in AIMS before deleting locally
     */
    const deletePersonWithSync = useCallback(async (personId: string): Promise<void> => {
        try {
            const person = getStoreState().people.find(p => p.id === personId);
            if (!person) {
                throw new Error('Person not found');
            }

            const spaceToClean = person.assignedSpaceId || getVirtualSpaceId(person);

            logger.info('PeopleController', 'Deleting person', { personId, spaceToClean });

            // Clear the space in AIMS if connected
            if (settings.solumConfig?.tokens?.accessToken && spaceToClean) {
                try {
                    await clearSpaceInAims(
                        spaceToClean,
                        person,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    logger.info('PeopleController', 'Space cleared in AIMS', { spaceToClean });
                } catch (clearError: any) {
                    logger.error('PeopleController', 'Failed to clear space in AIMS', { error: clearError.message });
                }
            }

            // Cloud Persistence: Delete on Server
            const success = await getStoreState().deletePerson(personId);
            if (!success) logger.error("PeopleController", "Failed to delete person on server (might have been deleted locally via store optimistically)");

            logger.info('PeopleController', 'Person deleted from Server', { personId });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to delete person', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Load people from CSV with sync to AIMS
     * Generates UUIDs and virtual pool IDs for all people
     */
    const loadPeopleFromCSVWithSync = useCallback(async (file: File): Promise<void> => {
        try {
            logger.info('PeopleController', 'Loading CSV file with sync', { filename: file.name, size: file.size });

            if (!settings.solumArticleFormat) {
                throw new Error('SoluM article format not configured');
            }

            const csvContent = await file.text();

            // Get existing pool IDs to avoid collisions
            const existingPoolIds = new Set(
                getStoreState().people
                    .map(p => getVirtualSpaceId(p))
                    .filter((id): id is string => id !== undefined && isPoolId(id))
            );

            const people = parsePeopleCSV(csvContent, settings.solumArticleFormat, settings.solumMappingConfig, existingPoolIds);

            // Update local store
            getStoreState().setPeople(people);
            logger.info('PeopleController', 'People loaded from CSV', { count: people.length });

            // Sync to AIMS if connected
            if (settings.solumConfig?.tokens?.accessToken && people.length > 0) {
                const personIds = people.map(p => p.id);
                getStoreState().updateSyncStatusLocal(personIds, 'pending');

                try {
                    const { pushArticles } = await import('@shared/infrastructure/services/solumService');

                    // Batch sync in chunks of 10
                    const batchSize = 10;
                    for (let i = 0; i < people.length; i += batchSize) {
                        const batch = people.slice(i, i + batchSize);

                        const articles = batch.map(person => {
                            const articleData = buildArticleDataWithMetadata(person, settings.solumMappingConfig);
                            articleData.articleId = getVirtualSpaceId(person) || person.id;
                            return articleData;
                        });

                        await pushArticles(
                            settings.solumConfig!,
                            settings.solumConfig!.storeNumber,
                            settings.solumConfig!.tokens!.accessToken,
                            articles
                        );
                    }

                    getStoreState().updateSyncStatusLocal(personIds, 'synced');
                    logger.info('PeopleController', 'CSV people synced to AIMS', { count: people.length });
                } catch (syncError: any) {
                    getStoreState().updateSyncStatusLocal(personIds, 'error');
                    logger.error('PeopleController', 'Failed to sync CSV people to AIMS', { error: syncError.message });
                }
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to load CSV with sync', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig, settings.solumConfig]);

    /**
     * Sync from AIMS with Virtual Pool support
     * Downloads articles and extracts cross-device metadata
     */
    const syncFromAimsWithVirtualPool = useCallback(async (): Promise<void> => {
        try {
            logger.info('PeopleController', 'Starting sync from AIMS with virtual pool support');

            if (!settings.solumConfig || !settings.solumConfig.tokens) {
                throw new Error('SoluM API not connected. Please connect in Settings first.');
            }

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

            // DEBUG: Log first article structure to understand AIMS response format
            if (allArticles.length > 0) {
                const sampleArticle = allArticles[0];
                console.log('[DEBUG syncFromAimsWithVirtualPool] Sample article structure:', {
                    articleId: sampleArticle.articleId,
                    hasDataProperty: 'data' in sampleArticle,
                    hasArticleDataProperty: 'articleData' in sampleArticle,
                    dataKeys: sampleArticle.data ? Object.keys(sampleArticle.data) : 'NO DATA PROPERTY',
                    articleDataKeys: sampleArticle.articleData ? Object.keys(sampleArticle.articleData) : 'NO ARTICLEDATA PROPERTY',
                    rootKeys: Object.keys(sampleArticle),
                    hasListMemberships: sampleArticle.data?.['_LIST_MEMBERSHIPS_'] || sampleArticle.articleData?.['_LIST_MEMBERSHIPS_'] || sampleArticle['_LIST_MEMBERSHIPS_'] || 'NOT FOUND',
                });
            }

            // Convert articles to Space-like format for the converter
            const spaces = allArticles.map(article => ({
                id: article.articleId || article.id,
                data: article.data || article.articleData || {},
                labelCode: article.labelCode,
            }));

            // DEBUG: Log first space to see if _LIST_MEMBERSHIPS_ is included
            if (spaces.length > 0) {
                console.log('[DEBUG syncFromAimsWithVirtualPool] First space data:', {
                    id: spaces[0].id,
                    dataKeys: Object.keys(spaces[0].data),
                    listMemberships: spaces[0].data['_LIST_MEMBERSHIPS_'] || 'NOT FOUND',
                });
            }

            // Convert spaces to people with virtual pool support
            const people = convertSpacesToPeopleWithVirtualPool(spaces, settings.solumMappingConfig);

            // Update the store with synced people
            getStoreState().setPeople(people);

            // Extract unique list names from people's listMemberships and populate peopleLists
            getStoreState().extractListsFromPeople();

            logger.info('PeopleController', 'Sync from AIMS with virtual pool complete', { peopleCount: people.length });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to sync from AIMS with virtual pool', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig]);

    return {
        // State
        people: getStoreState().people,
        peopleLists: getStoreState().peopleLists,
        activeListName: getStoreState().activeListName,
        activeListId: getStoreState().activeListId,
        spaceAllocation: getStoreState().spaceAllocation,

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

        // Store actions (raw, no auto-sync)
        addPersonRaw: getStoreState().addPersonLocal,
        updatePersonRaw: getStoreState().updatePersonLocal,
        deletePersonRaw: getStoreState().deletePersonLocal,
        unassignSpace: unassignSpaceWithAims,
        updateSyncStatus: getStoreState().updateSyncStatusLocal,

        // Sync-enabled actions (auto-sync to AIMS)
        addPerson: addPersonWithSync,
        updatePerson: updatePersonWithSync,
        deletePerson: deletePersonWithSync,
        loadPeopleFromCSVWithSync,

        // Sync actions
        syncFromAims,
        syncFromAimsWithVirtualPool,
    };
}
