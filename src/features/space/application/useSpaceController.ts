import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSpacesStore } from '../infrastructure/spacesStore';
import { validateSpace, isSpaceIdUnique } from '../domain/validation';
import { mergeSpaceDefaults, generateSpaceId } from '../domain/businessRules';
import type { Space, CSVConfig } from '@shared/domain/types';
import type { SpacesList } from '../domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import { logger } from '@shared/infrastructure/services/logger';

/**
 * Space Controller Hook
 * Main orchestration for space CRUD operations.
 * 
 * Architecture: Server-first.
 * - All CRUD ops go to the server DB first.
 * - Server queues AIMS sync items automatically (syncQueueService).
 * - After each CRUD op, we trigger onSync() which pushes the queue to AIMS via the server.
 * - NO direct AIMS calls from the client (except label assignment which is separate).
 */

interface UseSpaceControllerProps {
    csvConfig: CSVConfig;
    onSync?: () => Promise<void>;  // Callback to trigger sync after changes
    solumMappingConfig?: SolumMappingConfig;
}

export function useSpaceController({
    csvConfig,
    onSync,
    solumMappingConfig,
}: UseSpaceControllerProps) {
    const {
        spaces,
        spacesLists,
        setSpaces,
        // Server Actions
        createSpace: createInStore,
        updateSpace: updateInStore,
        deleteSpace: deleteInStore,
        fetchSpaces: fetchFromStore,
        // List Management
        addSpacesList,
        updateSpacesList,
        deleteSpacesList,
        loadSpacesList,
    } = useSpacesStore();

    // Loading state for fetch operations
    const [isFetching, setIsFetching] = useState(false);

    /**
     * Add new space
     * Creates in server DB (which queues AIMS sync), then triggers push.
     */
    const addSpace = useCallback(
        async (spaceData: Partial<Space>): Promise<void> => {
            logger.info('SpaceController', 'Adding space', { id: spaceData.id });

            // Generate ID if not provided (for validation and externalId)
            if (!spaceData.id) {
                const existingIds = spaces.map(s => s.id);
                const mappingInfo = solumMappingConfig?.mappingInfo;
                const nameKey = mappingInfo?.articleName || 'roomName';
                const nameForId = (spaceData.data?.[nameKey]) || '';

                spaceData.id = generateSpaceId(nameForId, existingIds);
            }

            // Validate
            const validation = validateSpace(spaceData, csvConfig);
            if (!validation.valid) {
                const errorMsg = validation.errors.map(e => e.message).join(', ');
                logger.error('SpaceController', 'Validation failed', { errors: validation.errors });
                throw new Error(`Validation failed: ${errorMsg}`);
            }

            // Check ID uniqueness (Client side check)
            if (!isSpaceIdUnique(spaceData.id!, spaces)) {
                throw new Error('Space ID already exists');
            }

            // Merge with defaults
            const space = mergeSpaceDefaults(spaceData, csvConfig);

            // Create in Server DB — server queues AIMS sync automatically
            const serverPayload = {
                externalId: space.id,
                labelCode: space.labelCode || undefined,
                templateName: space.templateName,
                data: space.data
            };

            const savedSpace = await createInStore(serverPayload);
            if (!savedSpace) throw new Error('Failed to create space on server');

            logger.info('SpaceController', 'Space persisted to Server DB', { id: space.id });

            // Trigger server-side push to AIMS
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('SpaceController', 'Sync after add failed', { error });
                }
            }

            logger.info('SpaceController', 'Space added successfully', { id: space.id });
        },
        [spaces, csvConfig, createInStore, onSync, solumMappingConfig]
    );

    /**
     * Update existing space
     * Updates in server DB (which queues AIMS sync), then triggers push.
     */
    const updateSpace = useCallback(
        async (id: string, updates: Partial<Space>): Promise<void> => {
            logger.info('SpaceController', 'Updating space', { id });

            const existingSpace = spaces.find(s => s.id === id);
            if (!existingSpace) {
                throw new Error('Space not found');
            }

            const updatedSpace: Partial<Space> = {
                ...existingSpace,
                ...updates,
                data: { ...existingSpace.data, ...updates.data },
            };

            const validation = validateSpace(updatedSpace, csvConfig);
            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
            }

            // Update in Server DB — server queues AIMS sync automatically
            const saved = await updateInStore(id, updatedSpace);
            if (!saved) throw new Error("Failed to update space on server");

            logger.info('SpaceController', 'Space updated in Server DB', { id });

            // Trigger server-side push to AIMS
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('SpaceController', 'Sync after update failed', { error });
                }
            }
        },
        [spaces, csvConfig, updateInStore, onSync]
    );

    /**
     * Delete space
     * Deletes from server DB (which queues AIMS sync), then triggers push.
     */
    const deleteSpace = useCallback(
        async (id: string): Promise<void> => {
            logger.info('SpaceController', 'Deleting space', { id });

            const existingSpace = spaces.find(s => s.id === id);
            if (!existingSpace) throw new Error('Space not found');

            // Delete from Server DB — server queues AIMS delete automatically
            const success = await deleteInStore(id);
            if (!success) throw new Error("Failed to delete space on server");

            logger.info('SpaceController', 'Space deleted from Server DB', { id });

            // Trigger server-side push to AIMS (processes the DELETE queue item)
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('SpaceController', 'Sync after delete failed', { error });
                }
            }
        },
        [spaces, deleteInStore, onSync]
    );

    // Helpers
    const findSpaceById = useCallback((id: string) => spaces.find(s => s.id === id), [spaces]);
    const importFromSync = useCallback((is: Space[]) => setSpaces(is), [setSpaces]);
    const getAllSpaces = useCallback(() => spaces, [spaces]);

    const fetchFromSolum = useCallback(async () => {
        // "Refresh from AIMS" — triggers a server-side pull then refreshes local store
        setIsFetching(true);
        try {
            if (onSync) {
                await onSync();
            }
            // Re-fetch from server DB (which now has AIMS data from pull)
            await fetchFromStore();
            logger.info('SpaceController', 'Refreshed from AIMS via server');
        } finally {
            setIsFetching(false);
        }
    }, [onSync, fetchFromStore]);

    // List operations
    const saveSpacesList = useCallback((name: string, id?: string) => {
        const list: SpacesList = { id: id || uuidv4(), name, createdAt: new Date().toISOString(), spaces: [...spaces] };
        if (id) updateSpacesList(id, list); else addSpacesList(list);
    }, [spaces, addSpacesList, updateSpacesList]);

    const loadSavedSpacesList = useCallback((id: string) => loadSpacesList(id), [loadSpacesList]);
    const deleteSavedSpacesList = useCallback((id: string) => deleteSpacesList(id), [deleteSpacesList]);

    return {
        addSpace,
        updateSpace,
        deleteSpace,
        findSpaceById,
        importFromSync,
        fetchFromSolum,
        getAllSpaces,

        // Expose fetchSpaces for Page to call on mount
        fetchSpaces: fetchFromStore,

        spaces,
        isFetching,
        saveSpacesList,
        loadSpacesList: loadSavedSpacesList,
        deleteSpacesList: deleteSavedSpacesList,
        spacesLists,
    };
}
