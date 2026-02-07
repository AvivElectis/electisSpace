import { useCallback } from 'react';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { parsePeopleCSV, convertSpacesToPeopleWithVirtualPool } from '../infrastructure/peopleService';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { logger } from '@shared/infrastructure/services/logger';
import { getValidAimsToken } from '@shared/infrastructure/services/aimsTokenManager';
import { syncApi } from '@shared/infrastructure/services/syncApi';
import type { Person, PeopleList } from '../domain/types';
import { getVirtualSpaceId, isPersonInList, removePersonFromList } from '../domain/types';
import { getNextPoolId, isPoolId } from '../infrastructure/virtualPoolService';
import { v4 as uuidv4 } from 'uuid';

/**
 * People Controller Hook
 * Manages people data, CSV upload, space assignments, and AIMS integration
 * 
 * ARCHITECTURE: All AIMS sync goes through the server.
 * - Server API calls (create, assign, update, delete) queue sync items
 * - After mutations, triggerPush() processes the queue → pushes to AIMS
 * - Direct AIMS access is only used for data pulling (syncFromAims)
 * 
 * KEY RULES:
 * - Unassigned people (no assignedSpaceId) are stored in server DB ONLY
 * - Only people WITH an assignedSpaceId are pushed/synced to AIMS
 * - POOL-IDs are internal tracking IDs, NOT synced to AIMS
 * 
 * PERFORMANCE: Uses getState() pattern to avoid re-renders when store changes.
 */
export function usePeopleController() {
    // Use getState() for reading store data inside callbacks - avoids unnecessary re-renders
    const getStoreState = usePeopleStore.getState;
    const settings = useSettingsStore(state => state.settings);
    const updateSettings = useSettingsStore(state => state.updateSettings);

    /**
     * Trigger server push to process pending sync queue items → AIMS
     */
    const triggerPush = useCallback(async () => {
        try {
            const activeStoreId = useAuthStore.getState().activeStoreId;
            if (!activeStoreId) return;
            await syncApi.push(activeStoreId);
        } catch (error: any) {
            logger.warn('PeopleController', 'Push after operation failed', { error: error.message });
        }
    }, []);

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
     * Add a person with server persistence and server-side AIMS sync
     * Creates person with UUID and virtual pool ID, saves to server DB.
     * Server queues sync item. If person has assignedSpaceId, push processes it to AIMS.
     */
    const addPersonWithSync = useCallback(async (personInput: Person | Record<string, string>): Promise<Person> => {
        try {
            // Get existing pool IDs from local store to avoid collisions
            const existingPoolIds = new Set(
                getStoreState().people
                    .filter(p => {
                        const virtualId = getVirtualSpaceId(p);
                        return virtualId && isPoolId(virtualId) && !p.assignedSpaceId;
                    })
                    .map(p => getVirtualSpaceId(p)!)
            );

            const poolId = getNextPoolId(existingPoolIds);

            const isPerson = (input: any): input is Person =>
                input && typeof input === 'object' && 'data' in input;

            const personData: Person = isPerson(personInput)
                ? {
                    ...personInput,
                    id: uuidv4(),
                    virtualSpaceId: personInput.assignedSpaceId || poolId,
                    aimsSyncStatus: personInput.assignedSpaceId ? 'pending' as const : undefined,
                }
                : {
                    id: uuidv4(),
                    virtualSpaceId: poolId,
                    data: personInput,
                };

            // Cloud Persistence: Create on Server (which auto-queues sync item)
            const activeStoreId = useAuthStore.getState().activeStoreId;
            if (!activeStoreId) throw new Error("No active store selected");
            
            const serverPerson = await getStoreState().createPerson({
                storeId: activeStoreId,
                externalId: personData.id,
                data: {
                    ...personData.data,
                    virtualSpaceId: personData.virtualSpaceId,
                    assignedSpaceId: personData.assignedSpaceId,
                    aimsSyncStatus: personData.assignedSpaceId ? 'pending' : undefined
                }
            });

            if (!serverPerson) throw new Error("Failed to create person on server");

            logger.info('PeopleController', 'Person created on server', {
                personId: serverPerson.id,
                hasSpace: !!personData.assignedSpaceId
            });

            // Trigger push to process sync queue → AIMS
            if (personData.assignedSpaceId) {
                await triggerPush();
                getStoreState().updateSyncStatusLocal([serverPerson.id], 'synced');
            }

            return serverPerson;
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to add person', { error: error.message });
            throw error;
        }
    }, [triggerPush]);

    /**
     * Load people from CSV content string with server persistence
     * Generates UUIDs and virtual pool IDs for all people
     * People are saved to server DB. Only people with assignedSpaceId are synced to AIMS.
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

            const people = parsePeopleCSV(
                csvContent,
                settings.solumArticleFormat,
                settings.solumMappingConfig,
                existingPoolIds
            );

            logger.info('PeopleController', 'Parsed CSV, now saving to server', { count: people.length });

            // Get activeStoreId for server persistence
            const activeStoreId = useAuthStore.getState().activeStoreId;
            if (!activeStoreId) throw new Error("No active store selected");

            // Save each person to server and sync to AIMS
            const savedPeople: Person[] = [];
            const errors: string[] = [];

            for (const person of people) {
                try {
                    // Use addPersonWithSync which handles server persistence and AIMS sync with rollback
                    const savedPerson = await addPersonWithSync(person);
                    savedPeople.push(savedPerson);
                } catch (error: any) {
                    const personName = person.data?.NAME || person.data?.name || person.id || 'Unknown';
                    errors.push(`${personName}: ${error.message}`);
                    logger.error('PeopleController', 'Failed to save person from CSV', { 
                        personName, 
                        error: error.message 
                    });
                }
            }

            logger.info('PeopleController', 'CSV import complete', { 
                total: people.length, 
                saved: savedPeople.length, 
                failed: errors.length 
            });

            if (errors.length > 0) {
                throw new Error(`${savedPeople.length} people saved, ${errors.length} failed:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`);
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to load CSV content', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig, settings.solumConfig, addPersonWithSync]);

    /**
     * Assign space to person via server API
     * Server handles queuing the AIMS sync (push assignment article).
     */
    const assignSpaceToPerson = useCallback(async (
        personId: string,
        spaceId: string
    ): Promise<boolean> => {
        try {
            const person = getStoreState().people.find(p => p.id === personId);
            if (!person) {
                throw new Error('Person not found');
            }

            logger.info('PeopleController', 'Assigning space to person', {
                personId, spaceId, oldSpaceId: person.assignedSpaceId
            });

            // Call server assign API (which queues sync update)
            const updated = await getStoreState().assignSpace(personId, spaceId);
            if (!updated) {
                throw new Error('Failed to assign space on server');
            }

            // Update local virtual space ID
            getStoreState().updatePersonLocal(personId, { virtualSpaceId: spaceId });
            getStoreState().updateSyncStatusLocal([personId], 'pending');

            // Trigger push to process sync queue → AIMS
            await triggerPush();

            getStoreState().updateSyncStatusLocal([personId], 'synced');
            logger.info('PeopleController', 'Assignment synced via server', { personId, spaceId });
            return true;
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to assign space', { error: error.message });
            throw error;
        }
    }, [triggerPush]);

    /**
     * Bulk assign spaces via server API
     */
    const bulkAssignSpaces = useCallback(async (
        assignments: Array<{ personId: string; spaceId: string }>
    ): Promise<{ success: boolean; syncedCount: number }> => {
        try {
            logger.info('PeopleController', 'Bulk assigning spaces', { count: assignments.length });

            const personIds = assignments.map(a => a.personId);
            getStoreState().updateSyncStatusLocal(personIds, 'pending');

            let successCount = 0;
            for (const { personId, spaceId } of assignments) {
                try {
                    const result = await getStoreState().assignSpace(personId, spaceId);
                    if (result) successCount++;
                } catch (err: any) {
                    logger.warn('PeopleController', 'Failed to assign space in bulk', { personId, spaceId, error: err.message });
                }
            }

            // Trigger push to process all queued sync items
            await triggerPush();

            getStoreState().updateSyncStatusLocal(personIds, 'synced');
            logger.info('PeopleController', 'Bulk assignments synced via server', { count: successCount });
            return { success: true, syncedCount: successCount };
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to bulk assign spaces', { error: error.message });
            throw error;
        }
    }, [triggerPush]);

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

            // Trigger push to sync updated membership data via server
            const assignedAffected = updatedPeople.filter(p =>
                affectedPeople.some(ap => ap.id === p.id) && p.assignedSpaceId
            );
            if (assignedAffected.length > 0) {
                await triggerPush();
            }

            logger.info('PeopleController', 'People list deleted', { listId, storageName });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to delete people list', { error: error.message });
            throw error;
        }
    }, [triggerPush]);

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
     * Post selected people to AIMS via server push
     * Triggers server to process pending sync queue items
     */
    const postSelectedToAims = useCallback(async (personIds: string[]): Promise<{ success: boolean; syncedCount: number }> => {
        try {
            logger.info('PeopleController', 'Pushing selected people via server', { count: personIds.length });
            getStoreState().updateSyncStatusLocal(personIds, 'pending');

            await triggerPush();

            getStoreState().updateSyncStatusLocal(personIds, 'synced');
            logger.info('PeopleController', 'Selected people pushed via server', { count: personIds.length });
            return { success: true, syncedCount: personIds.length };
        } catch (error: any) {
            getStoreState().updateSyncStatusLocal(personIds, 'error');
            logger.error('PeopleController', 'Failed to push selected people', { error: error.message });
            throw error;
        }
    }, [triggerPush]);

    /**
     * Post ALL assigned people to AIMS via server push
     */
    const postAllAssignmentsToAims = useCallback(async (): Promise<{ success: boolean; syncedCount: number }> => {
        try {
            const assignedPeople = getStoreState().people.filter(p => p.assignedSpaceId);

            if (assignedPeople.length === 0) {
                logger.warn('PeopleController', 'No assigned people to push');
                return { success: true, syncedCount: 0 };
            }

            logger.info('PeopleController', 'Pushing all assignments via server', { count: assignedPeople.length });

            const personIds = assignedPeople.map(p => p.id);
            getStoreState().updateSyncStatusLocal(personIds, 'pending');

            await triggerPush();

            getStoreState().updateSyncStatusLocal(personIds, 'synced');
            logger.info('PeopleController', 'All assignments pushed via server', { count: assignedPeople.length });
            return { success: true, syncedCount: assignedPeople.length };
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to push all assignments', { error: error.message });
            throw error;
        }
    }, [triggerPush]);

    /**
     * Cancel all assignments via server unassign
     */
    const cancelAllAssignments = useCallback(async (): Promise<{ success: boolean; clearedCount: number }> => {
        try {
            const assignedPeople = getStoreState().people.filter(p => p.assignedSpaceId);

            if (assignedPeople.length === 0) {
                logger.warn('PeopleController', 'No assignments to cancel');
                return { success: true, clearedCount: 0 };
            }

            logger.info('PeopleController', 'Canceling all assignments', { count: assignedPeople.length });

            // Unassign each person via server API (which queues sync)
            for (const person of assignedPeople) {
                try {
                    await getStoreState().unassignSpace(person.id);
                } catch (err: any) {
                    logger.warn('PeopleController', 'Failed to unassign person', { personId: person.id, error: err.message });
                }
            }

            // Trigger push to process queue
            await triggerPush();

            logger.info('PeopleController', 'All assignments canceled', { count: assignedPeople.length });
            return { success: true, clearedCount: assignedPeople.length };
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to cancel all assignments', { error: error.message });
            throw error;
        }
    }, [triggerPush]);

    /**
     * Unassign space from person via server API
     * Server handles queuing AIMS sync for clearing the space article.
     * Person remains in server DB without assignedSpaceId.
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
                return true;
            }

            logger.info('PeopleController', 'Unassigning space from person', { personId, spaceId });

            // Call server unassign API (which queues sync)
            await getStoreState().unassignSpace(personId);

            // Trigger push to process queue
            await triggerPush();

            logger.info('PeopleController', 'Space unassigned via server', { personId, spaceId });
            return true;
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to unassign space', { error: error.message });
            throw error;
        }
    }, [triggerPush]);

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

            const token = await getValidAimsToken();
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
     * Update a person with server-side AIMS sync
     * Server queues sync item on update; push processes it if person is assigned.
     */
    const updatePersonWithSync = useCallback(async (personId: string, updates: Partial<Person>): Promise<void> => {
        try {
            const data = updates.data ? updates.data : undefined;
            const updatedPerson = await getStoreState().updatePerson(personId, { data });

            if (!updatedPerson) throw new Error("Failed to update person on server");

            logger.info('PeopleController', 'Person updated on server', { personId });

            // Trigger push if person is assigned (server queued the update)
            if (updatedPerson.assignedSpaceId) {
                getStoreState().updateSyncStatusLocal([personId], 'pending');
                await triggerPush();
                getStoreState().updateSyncStatusLocal([personId], 'synced');
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to update person', { error: error.message });
            throw error;
        }
    }, [triggerPush]);

    /**
     * Delete a person with server-side AIMS sync
     * Server queues sync item to clear AIMS article if person was assigned.
     */
    const deletePersonWithSync = useCallback(async (personId: string): Promise<void> => {
        try {
            const person = getStoreState().people.find(p => p.id === personId);
            if (!person) {
                throw new Error('Person not found');
            }

            const spaceToClean = person.assignedSpaceId;
            logger.info('PeopleController', 'Deleting person', { personId, spaceToClean: spaceToClean || 'none (server-only)' });

            // Delete on server (which queues sync item for AIMS cleanup)
            const success = await getStoreState().deletePerson(personId);
            if (!success) logger.error("PeopleController", "Failed to delete person on server");

            // Trigger push if person was assigned (to clear AIMS article)
            if (spaceToClean) {
                await triggerPush();
            }

            logger.info('PeopleController', 'Person deleted', { personId });
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to delete person', { error: error.message });
            throw error;
        }
    }, [triggerPush]);

    /**
     * Load people from CSV with server persistence
     * Server queues sync items for people with assignedSpaceId.
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

            // Trigger push to process any queued sync items
            const assignedPeople = people.filter(p => p.assignedSpaceId);
            if (assignedPeople.length > 0) {
                await triggerPush();
                logger.info('PeopleController', 'CSV people sync triggered', { assigned: assignedPeople.length });
            }
        } catch (error: any) {
            logger.error('PeopleController', 'Failed to load CSV with sync', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig, triggerPush]);

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

            const token = await getValidAimsToken();
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
