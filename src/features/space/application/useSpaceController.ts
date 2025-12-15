import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSpaceStore } from '../infrastructure/spaceStore';
import { validateSpace, isSpaceIdUnique } from '../domain/validation';
import { mergeSpaceDefaults, generateSpaceId } from '../domain/businessRules';
import type { Space, CSVConfig } from '@shared/domain/types';
import type { SpaceList } from '../domain/types';
import { logger } from '@shared/infrastructure/services/logger';

/**
 * Space Controller Hook
 * Main orchestration for space CRUD operations
 */

interface UseSpaceControllerProps {
    csvConfig: CSVConfig;
    onSync?: () => Promise<void>;  // Callback to trigger sync after changes
}

export function useSpaceController({
    csvConfig,
    onSync,
}: UseSpaceControllerProps) {
    const {
        spaces,
        spaceLists,
        setSpaces,
        addSpace: addToStore,
        updateSpace: updateInStore,
        deleteSpace: deleteFromStore,
        addSpaceList,
        updateSpaceList,
        deleteSpaceList,
        loadSpaceList,
    } = useSpaceStore();

    /**
     * Add new space
     */
    const addSpace = useCallback(
        async (spaceData: Partial<Space>): Promise<void> => {
            logger.info('SpaceController', 'Adding space', { id: spaceData.id });

            // Generate ID if not provided
            if (!spaceData.id) {
                const existingIds = spaces.map(s => s.id);
                spaceData.id = generateSpaceId(spaceData.roomName || '', existingIds);
            }

            // Validate
            const validation = validateSpace(spaceData, csvConfig);
            if (!validation.valid) {
                const errorMsg = validation.errors.map(e => e.message).join(', ');
                logger.error('SpaceController', 'Validation failed', { errors: validation.errors });
                throw new Error(`Validation failed: ${errorMsg}`);
            }

            // Check ID uniqueness
            if (!isSpaceIdUnique(spaceData.id!, spaces)) {
                throw new Error('Space ID already exists');
            }

            // Merge with defaults
            const space = mergeSpaceDefaults(spaceData, csvConfig);

            // Add to store
            addToStore(space);

            // Trigger sync if configured
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('SpaceController', 'Sync after add failed', { error });
                }
            }

            logger.info('SpaceController', 'Space added successfully', { id: space.id });
        },
        [spaces, csvConfig, addToStore, onSync]
    );

    /**
     * Update existing space
     */
    const updateSpace = useCallback(
        async (id: string, updates: Partial<Space>): Promise<void> => {
            logger.info('SpaceController', 'Updating space', { id });

            const existingSpace = spaces.find(s => s.id === id);
            if (!existingSpace) {
                throw new Error('Space not found');
            }

            // Merge updates with existing space
            const updatedSpace: Partial<Space> = {
                ...existingSpace,
                ...updates,
                data: { ...existingSpace.data, ...updates.data },
            };

            // Validate
            const validation = validateSpace(updatedSpace, csvConfig);
            if (!validation.valid) {
                const errorMsg = validation.errors.map(e => e.message).join(', ');
                logger.error('SpaceController', 'Validation failed', { errors: validation.errors });
                throw new Error(`Validation failed: ${errorMsg}`);
            }

            // Check ID uniqueness if ID changed
            if (updates.id && updates.id !== id) {
                if (!isSpaceIdUnique(updates.id, spaces, id)) {
                    throw new Error('Space ID already exists');
                }
            }

            // Update in store
            updateInStore(id, updatedSpace);

            // Trigger sync
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('SpaceController', 'Sync after update failed', { error });
                }
            }

            logger.info('SpaceController', 'Space updated successfully', { id });
        },
        [spaces, csvConfig, updateInStore, onSync]
    );

    /**
     * Delete space
     */
    const deleteSpace = useCallback(
        async (id: string): Promise<void> => {
            logger.info('SpaceController', 'Deleting space', { id });

            const existingSpace = spaces.find(s => s.id === id);
            if (!existingSpace) {
                throw new Error('Space not found');
            }

            // Delete from store
            deleteFromStore(id);

            // Trigger sync
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('SpaceController', 'Sync after delete failed', { error });
                }
            }

            logger.info('SpaceController', 'Space deleted successfully', { id });
        },
        [spaces, deleteFromStore, onSync]
    );

    /**
     * Find space by ID
     */
    const findSpaceById = useCallback(
        (id: string): Space | undefined => {
            return spaces.find(s => s.id === id);
        },
        [spaces]
    );

    /**
     * Import spaces from sync (replaces all)
     */
    const importFromSync = useCallback(
        (importedSpaces: Space[]): void => {
            logger.info('SpaceController', 'Importing from sync', {
                count: importedSpaces.length
            });
            setSpaces(importedSpaces);
        },
        [setSpaces]
    );

    /**
     * Get all spaces
     */
    const getAllSpaces = useCallback((): Space[] => {
        return spaces;
    }, [spaces]);

    /**
     * Save current spaces as space list
     */
    const saveSpaceList = useCallback(
        (name: string, id?: string): void => {
            logger.info('SpaceController', 'Saving space list', { name, id });

            const spaceList: SpaceList = {
                id: id || uuidv4(),
                name,
                createdAt: new Date().toISOString(),
                spaces: [...spaces],
            };

            if (id) {
                // Update existing
                updateSpaceList(id, spaceList);
            } else {
                // Create new
                addSpaceList(spaceList);
            }

            logger.info('SpaceController', 'Space list saved', { id: spaceList.id });
        },
        [spaces, addSpaceList, updateSpaceList]
    );

    /**
     * Load space list (replaces current spaces)
     */
    const loadSavedSpaceList = useCallback(
        (id: string): void => {
            logger.info('SpaceController', 'Loading space list', { id });
            loadSpaceList(id);
        },
        [loadSpaceList]
    );

    /**
     * Delete space list
     */
    const deleteSavedSpaceList = useCallback(
        (id: string): void => {
            logger.info('SpaceController', 'Deleting space list', { id });
            deleteSpaceList(id);
        },
        [deleteSpaceList]
    );

    return {
        // Space operations
        addSpace,
        updateSpace,
        deleteSpace,
        findSpaceById,
        importFromSync,
        getAllSpaces,
        spaces,

        // Space list operations
        saveSpaceList,
        loadSpaceList: loadSavedSpaceList,
        deleteSpaceList: deleteSavedSpaceList,
        spaceLists,
    };
}
