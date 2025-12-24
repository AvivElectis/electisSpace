import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSpacesStore } from '../infrastructure/spacesStore';
import { validateSpace, isSpaceIdUnique } from '../domain/validation';
import { mergeSpaceDefaults, generateSpaceId } from '../domain/businessRules';
import type { Space, CSVConfig, SolumConfig } from '@shared/domain/types';
import type { SpacesList } from '../domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import { logger } from '@shared/infrastructure/services/logger';
import * as solumService from '@shared/infrastructure/services/solumService';

/**
 * Space Controller Hook
 * Main orchestration for space CRUD operations
 */

interface UseSpaceControllerProps {
    csvConfig: CSVConfig;
    onSync?: () => Promise<void>;  // Callback to trigger sync after changes
    solumConfig?: SolumConfig;
    solumToken?: string;
    solumMappingConfig?: SolumMappingConfig;
}

export function useSpaceController({
    csvConfig,
    onSync,
    solumConfig,
    solumToken,
    solumMappingConfig,
}: UseSpaceControllerProps) {
    const {
        spaces,
        spacesLists,
        setSpaces,
        addSpace: addToStore,
        updateSpace: updateInStore,
        deleteSpace: deleteFromStore,
        addSpacesList,
        updateSpacesList,
        deleteSpacesList,
        loadSpacesList,
    } = useSpacesStore();

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
     * Fetch spaces from SoluM API
     * Fetches all articles, filters OUT those with 'C' prefix (conference rooms),
     * and maps them to Space entities using solumMappingConfig
     */
    const fetchFromSolum = useCallback(
        async (): Promise<void> => {
            if (!solumConfig || !solumToken || !solumMappingConfig) {
                throw new Error('SoluM configuration, token, or mapping config not available');
            }

            logger.info('SpaceController', 'Fetching spaces from SoluM');

            try {
                // Fetch all articles from SoluM
                const articles = await solumService.fetchArticles(
                    solumConfig,
                    solumConfig.storeNumber,
                    solumToken
                );

                // Filter OUT articles where uniqueIdField starts with 'C' (those are conference rooms)
                const { uniqueIdField, fields } = solumMappingConfig;
                const spaceArticles = articles.filter((article: any) => {
                    const uniqueId = article[uniqueIdField];
                    return uniqueId && !String(uniqueId).toUpperCase().startsWith('C');
                });

                // Map articles to Space entities
                const mappedSpaces: Space[] = spaceArticles.map((article: any) => {
                    const id = String(article[uniqueIdField] || '');
                    const roomName = article[fields['roomName']?.friendlyNameEn || 'roomName'] || id;

                    // Build dynamic data object from visible fields
                    const data: Record<string, string> = {};
                    Object.keys(fields).forEach(fieldKey => {
                        const mapping = fields[fieldKey];
                        if (mapping.visible && article[fieldKey] !== undefined) {
                            data[fieldKey] = String(article[fieldKey]);
                        }
                    });

                    return {
                        id,
                        roomName,
                        data,
                        labelCode: article.labelCode,
                        templateName: article.templateName,
                    };
                });

                // Import mapped spaces
                importFromSync(mappedSpaces);

                logger.info('SpaceController', 'Spaces fetched from SoluM', {
                    total: articles.length,
                    spaces: mappedSpaces.length,
                    conferenceRooms: articles.length - mappedSpaces.length
                });
            } catch (error) {
                logger.error('SpaceController', 'Failed to fetch from SoluM', { error });
                throw error;
            }
        },
        [solumConfig, solumToken, solumMappingConfig, importFromSync]
    );


    /**
     * Save current spaces as spaces list
     */
    const saveSpacesList = useCallback(
        (name: string, id?: string): void => {
            logger.info('SpaceController', 'Saving spaces list', { name, id });

            const spacesList: SpacesList = {
                id: id || uuidv4(),
                name,
                createdAt: new Date().toISOString(),
                spaces: [...spaces],
            };

            if (id) {
                // Update existing
                updateSpacesList(id, spacesList);
            } else {
                // Create new
                addSpacesList(spacesList);
            }

            logger.info('SpaceController', 'Spaces list saved', { id: spacesList.id });
        },
        [spaces, addSpacesList, updateSpacesList]
    );

    /**
     * Load space list (replaces current spaces)
     */
    const loadSavedSpacesList = useCallback(
        (id: string): void => {
            logger.info('SpaceController', 'Loading space list', { id });
            loadSpacesList(id);
        },
        [loadSpacesList]
    );

    /**
     * Delete space list
     */
    const deleteSavedSpacesList = useCallback(
        (id: string): void => {
            logger.info('SpaceController', 'Deleting space list', { id });
            deleteSpacesList(id);
        },
        [deleteSpacesList]
    );

    return {
        // Space operations
        addSpace,
        updateSpace,
        deleteSpace,
        findSpaceById,
        importFromSync,
        fetchFromSolum,
        getAllSpaces,
        spaces,

        // Space list operations
        saveSpacesList,
        loadSpacesList: loadSavedSpacesList,
        deleteSpacesList: deleteSavedSpacesList,
        spacesLists,
    };
}
