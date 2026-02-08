import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { spacesListsApi, type SpacesListResponse } from '@shared/infrastructure/services/spacesListsApi';
import { logger } from '@shared/infrastructure/services/logger';
import { useState, useCallback } from 'react';


export function useListsController() {
    // Stores
    const spacesStore = useSpacesStore();
    const activeStoreId = useAuthStore(state => state.activeStoreId);

    const [lists, setLists] = useState<SpacesListResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Fetch all spaces lists from DB for the current store
     */
    const fetchLists = useCallback(async () => {
        if (!activeStoreId) return;
        setIsLoading(true);
        try {
            const result = await spacesListsApi.list(activeStoreId);
            setLists(result.data);
        } catch (error: any) {
            logger.error('ListsController', 'Failed to fetch spaces lists', { error: error?.message || error });
        } finally {
            setIsLoading(false);
        }
    }, [activeStoreId]);

    /**
     * Save current spaces as a new named list in the DB.
     * Validates unique name per store.
     * NO AIMS sync - server sync intervals handle that.
     */
    const saveCurrentSpacesAsList = async (name: string) => {
        if (!activeStoreId) {
            throw new Error('No store selected');
        }

        const currentSpaces = spacesStore.spaces;

        // Build content snapshot
        const content = currentSpaces.map(s => ({
            id: s.id,
            externalId: s.externalId,
            data: s.data,
            labelCode: s.labelCode,
            templateName: s.templateName,
            assignedLabels: s.assignedLabels,
            syncStatus: s.syncStatus,
        }));

        const result = await spacesListsApi.create({
            storeId: activeStoreId,
            name: name.trim(),
            content: content as any,
        });

        const savedList = result.data;
        spacesStore.setActiveListName(savedList.name);
        spacesStore.setActiveListId(savedList.id);
        spacesStore.clearPendingChanges();

        // Refresh list
        await fetchLists();

        logger.info('ListsController', 'Spaces list saved to DB', {
            listId: savedList.id,
            name: savedList.name,
            spacesCount: content.length,
        });
    };

    /**
     * Load a list from DB - overwrites current spaces table.
     * NO AIMS sync on load - server sync intervals handle that.
     */
    const loadList = async (id: string) => {
        const result = await spacesListsApi.getById(id);
        const listData = result.data;

        if (!listData.content || !Array.isArray(listData.content)) {
            throw new Error('List content is empty or invalid');
        }

        // Overwrite the spaces table with the list's snapshot
        spacesStore.setSpaces(listData.content);
        spacesStore.setActiveListName(listData.name);
        spacesStore.setActiveListId(listData.id);
        spacesStore.clearPendingChanges();

        logger.info('ListsController', 'Spaces list loaded from DB', {
            listId: listData.id,
            name: listData.name,
            spacesCount: listData.content.length,
        });

        return { spacesCount: listData.content.length };
    };

    /**
     * Delete a list from DB
     */
    const deleteList = async (id: string) => {
        await spacesListsApi.delete(id);

        // Clear active list if it was the deleted one
        if (spacesStore.activeListId === id) {
            spacesStore.setActiveListName(undefined);
            spacesStore.setActiveListId(undefined);
            spacesStore.clearPendingChanges();
        }

        // Refresh list
        setLists(prev => prev.filter(l => l.id !== id));

        logger.info('ListsController', 'Spaces list deleted', { listId: id });
    };

    /**
     * Save changes to the currently active list in DB
     */
    const saveListChanges = async (id: string) => {
        const currentSpaces = spacesStore.spaces;

        const content = currentSpaces.map(s => ({
            id: s.id,
            externalId: s.externalId,
            data: s.data,
            labelCode: s.labelCode,
            templateName: s.templateName,
            assignedLabels: s.assignedLabels,
            syncStatus: s.syncStatus,
        }));

        await spacesListsApi.update(id, { content: content as any });
        spacesStore.clearPendingChanges();

        logger.info('ListsController', 'Spaces list changes saved to DB', {
            listId: id,
            spacesCount: content.length,
        });

        // Refresh list
        await fetchLists();
    };

    return {
        lists,
        isLoading,
        activeListId: spacesStore.activeListId,
        activeListName: spacesStore.activeListName,
        fetchLists,
        saveCurrentSpacesAsList,
        loadList,
        deleteList,
        saveListChanges,
    };
}
