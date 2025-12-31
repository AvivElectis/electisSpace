import { useCallback } from 'react';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { parsePeopleCSV, postPersonAssignment, postBulkAssignments, postEmptyAssignments, clearSpaceInAims, clearSpaceIdsInAims, convertSpacesToPeopleWithVirtualPool, buildArticleDataWithMetadata } from '../infrastructure/peopleService';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';
import type { Person, PeopleList } from '../domain/types';
import { getVirtualSpaceId } from '../domain/types';
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
                peopleStore.people
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
            peopleStore.setPeople(people);
            logger.info('PeopleController', 'People loaded from CSV content', { count: people.length });

            // Sync to AIMS if connected
            if (settings.solumConfig?.tokens?.accessToken && people.length > 0) {
                const personIds = people.map(p => p.id);
                peopleStore.updateSyncStatus(personIds, 'pending');

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

                    peopleStore.updateSyncStatus(personIds, 'synced');
                    logger.info('PeopleController', 'CSV content synced to AIMS', { count: people.length });
                } catch (syncError: any) {
                    peopleStore.updateSyncStatus(personIds, 'error');
                    logger.error('PeopleController', 'Failed to sync CSV content to AIMS', { error: syncError.message });
                }
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to load CSV content', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig, settings.solumConfig, peopleStore]);

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
            const person = peopleStore.people.find(p => p.id === personId);
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
            peopleStore.assignSpace(personId, spaceId);
            // Also update virtualSpaceId to the physical space (no longer in pool)
            peopleStore.updatePerson(personId, { virtualSpaceId: spaceId });

            // Auto-post to AIMS (default behavior)
            if (postToAims && settings.solumConfig && settings.solumConfig.tokens) {
                peopleStore.updateSyncStatus([personId], 'pending');
                
                try {
                    await postPersonAssignment(
                        { ...person, assignedSpaceId: spaceId, virtualSpaceId: spaceId },
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
            const storageName = name.trim().replace(/\s+/g, '_');
            const list: PeopleList = {
                id: `list-${Date.now()}`,
                name,
                storageName,
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

            const existingList = peopleStore.peopleLists.find(l => l.id === peopleStore.activeListId);
            const updatedList: PeopleList = {
                id: peopleStore.activeListId,
                name: peopleStore.activeListName || 'Unnamed List',
                storageName: existingList?.storageName || (peopleStore.activeListName || 'Unnamed_List').replace(/\s+/g, '_'),
                createdAt: existingList?.createdAt || new Date().toISOString(),
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
     * @param listId - ID of list to load
     * @param _autoApply - Ignored (kept for API compatibility, always applies assignments)
     */
    const loadList = useCallback(async (listId: string, _autoApply?: boolean): Promise<void> => {
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

            // Convert spaces to people using virtual pool support
            // This properly handles POOL-IDs and doesn't set them as assigned
            const people = convertSpacesToPeopleWithVirtualPool(spaces, settings.solumMappingConfig);

            // Update the store with synced people
            peopleStore.setPeople(people);

            logger.info('PeopleController', 'Sync from AIMS complete', { peopleCount: people.length });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to sync from AIMS', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig, peopleStore]);

    /**
     * Add a person with immediate AIMS sync
     * Creates person with UUID and virtual pool ID, then syncs to AIMS
     * Accepts either a Person object or just the data Record
     * 
     * If connected to AIMS, fetches empty POOL articles first to reuse them
     */
    const addPersonWithSync = useCallback(async (personInput: Person | Record<string, string>): Promise<Person> => {
        try {
            // Get existing pool IDs from local store - only include people who are still in the pool 
            // (not assigned to physical spaces, so their POOL-ID is still active)
            const existingPoolIds = new Set(
                peopleStore.people
                    .filter(p => {
                        const virtualId = getVirtualSpaceId(p);
                        // Only count as "in use" if:
                        // 1. They have a virtual pool ID
                        // 2. They are NOT assigned to a physical space (so the pool ID is still active)
                        return virtualId && isPoolId(virtualId) && !p.assignedSpaceId;
                    })
                    .map(p => getVirtualSpaceId(p)!)
            );

            let poolId: string;

            // If connected to AIMS, check for empty POOL articles that can be reused
            if (settings.solumConfig?.tokens?.accessToken) {
                const emptyPoolIds = await fetchEmptyPoolArticlesFromAims(
                    settings.solumConfig,
                    settings.solumMappingConfig
                );
                
                // Find an empty POOL article that's not in use locally
                const reusablePoolId = Array.from(emptyPoolIds)
                    .filter(id => !existingPoolIds.has(id))
                    .sort()[0]; // Get the lowest available
                
                if (reusablePoolId) {
                    poolId = reusablePoolId;
                    logger.info('PeopleController', 'Reusing empty POOL article from AIMS', { poolId });
                } else {
                    // No empty POOL articles available, generate new one
                    poolId = getNextPoolId(existingPoolIds);
                    logger.info('PeopleController', 'No empty POOL articles in AIMS, generating new', { poolId });
                }
            } else {
                // Not connected to AIMS, use local pool ID generation
                poolId = getNextPoolId(existingPoolIds);
            }

            // Determine if input is a Person object or just data
            const isPerson = (input: any): input is Person => 
                input && typeof input === 'object' && 'data' in input;

            // Create person with UUID and virtual pool ID
            const person: Person = isPerson(personInput) 
                ? {
                    ...personInput,
                    id: uuidv4(),  // Always generate new UUID
                    virtualSpaceId: personInput.assignedSpaceId || poolId,  // Use assigned space or pool ID
                    aimsSyncStatus: 'pending' as const,
                }
                : {
                    id: uuidv4(),
                    virtualSpaceId: poolId,
                    data: personInput,
                    aimsSyncStatus: 'pending' as const,
                };

            // Add to local store
            peopleStore.addPerson(person);

            logger.info('PeopleController', 'Person added locally', { 
                personId: person.id, 
                virtualSpaceId: person.virtualSpaceId,
                assignedSpaceId: person.assignedSpaceId 
            });

            // Immediately sync to AIMS if connected
            if (settings.solumConfig?.tokens?.accessToken) {
                try {
                    const { pushArticles } = await import('@shared/infrastructure/services/solumService');
                    
                    const articleData = buildArticleDataWithMetadata(person, settings.solumMappingConfig);
                    // Use assigned space ID or virtual space ID as the article ID
                    articleData.articleId = person.assignedSpaceId || person.virtualSpaceId || poolId;
                    
                    await pushArticles(
                        settings.solumConfig,
                        settings.solumConfig.storeNumber,
                        settings.solumConfig.tokens.accessToken,
                        [articleData]  // Wrap in array
                    );
                    
                    peopleStore.updateSyncStatus([person.id], 'synced');
                    logger.info('PeopleController', 'Person synced to AIMS', { personId: person.id });
                } catch (syncError: any) {
                    peopleStore.updateSyncStatus([person.id], 'error');
                    logger.error('PeopleController', 'Failed to sync person to AIMS', { error: syncError.message });
                }
            }

            return person;
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to add person', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Update a person with immediate AIMS sync
     */
    const updatePersonWithSync = useCallback(async (personId: string, updates: Partial<Person>): Promise<void> => {
        try {
            // Update locally first
            peopleStore.updatePerson(personId, updates);
            
            const person = peopleStore.people.find(p => p.id === personId);
            if (!person) {
                throw new Error('Person not found after update');
            }

            logger.info('PeopleController', 'Person updated locally', { personId });

            // Immediately sync to AIMS if connected
            if (settings.solumConfig?.tokens?.accessToken) {
                peopleStore.updateSyncStatus([personId], 'pending');
                
                try {
                    const { pushArticles } = await import('@shared/infrastructure/services/solumService');
                    
                    const articleData = buildArticleDataWithMetadata(person, settings.solumMappingConfig);
                    // Use assigned space ID or virtual space ID
                    articleData.articleId = person.assignedSpaceId || getVirtualSpaceId(person) || person.id;
                    
                    await pushArticles(
                        settings.solumConfig,
                        settings.solumConfig.storeNumber,
                        settings.solumConfig.tokens.accessToken,
                        [articleData]  // Wrap in array
                    );
                    
                    peopleStore.updateSyncStatus([personId], 'synced');
                    logger.info('PeopleController', 'Person update synced to AIMS', { personId });
                } catch (syncError: any) {
                    peopleStore.updateSyncStatus([personId], 'error');
                    logger.error('PeopleController', 'Failed to sync person update to AIMS', { error: syncError.message });
                }
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to update person', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Delete a person with immediate AIMS sync
     * Clears the virtual space in AIMS before deleting locally
     */
    const deletePersonWithSync = useCallback(async (personId: string): Promise<void> => {
        try {
            const person = peopleStore.people.find(p => p.id === personId);
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
                    // Continue with local delete even if AIMS clear fails
                }
            }

            // Delete locally
            peopleStore.deletePerson(personId);
            logger.info('PeopleController', 'Person deleted locally', { personId });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to delete person', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

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
                peopleStore.people
                    .map(p => getVirtualSpaceId(p))
                    .filter((id): id is string => id !== undefined && isPoolId(id))
            );

            const people = parsePeopleCSV(csvContent, settings.solumArticleFormat, settings.solumMappingConfig, existingPoolIds);

            // Update local store
            peopleStore.setPeople(people);
            logger.info('PeopleController', 'People loaded from CSV', { count: people.length });

            // Sync to AIMS if connected
            if (settings.solumConfig?.tokens?.accessToken && people.length > 0) {
                const personIds = people.map(p => p.id);
                peopleStore.updateSyncStatus(personIds, 'pending');

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

                    peopleStore.updateSyncStatus(personIds, 'synced');
                    logger.info('PeopleController', 'CSV people synced to AIMS', { count: people.length });
                } catch (syncError: any) {
                    peopleStore.updateSyncStatus(personIds, 'error');
                    logger.error('PeopleController', 'Failed to sync CSV people to AIMS', { error: syncError.message });
                }
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to load CSV with sync', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig, settings.solumConfig, peopleStore]);

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

            // Convert articles to Space-like format for the converter
            const spaces = allArticles.map(article => ({
                id: article.articleId || article.id,
                data: article.data || article.articleData || {},
                labelCode: article.labelCode,
            }));

            // Convert spaces to people with virtual pool support
            const people = convertSpacesToPeopleWithVirtualPool(spaces, settings.solumMappingConfig);

            // Update the store with synced people
            peopleStore.setPeople(people);

            logger.info('PeopleController', 'Sync from AIMS with virtual pool complete', { peopleCount: people.length });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to sync from AIMS with virtual pool', { error: error.message });
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

        // Store actions (raw, no auto-sync)
        addPersonRaw: peopleStore.addPerson,
        updatePersonRaw: peopleStore.updatePerson,
        deletePersonRaw: peopleStore.deletePerson,
        unassignSpace: unassignSpaceWithAims,
        updateSyncStatus: peopleStore.updateSyncStatus,

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
