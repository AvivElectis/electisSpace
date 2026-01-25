import { useCallback, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSpacesStore } from '../infrastructure/spacesStore';
import { useConferenceStore } from '@features/conference/infrastructure/conferenceStore';
import { validateSpace, isSpaceIdUnique } from '../domain/validation';
import { mergeSpaceDefaults, generateSpaceId } from '../domain/businessRules';
import type { Space, CSVConfig, SolumConfig, SFTPCredentials, WorkingMode } from '@shared/domain/types';
import type { SpacesList } from '../domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import { logger } from '@shared/infrastructure/services/logger';
import * as solumService from '@shared/infrastructure/services/solumService';
import { SolumSyncAdapter } from '../../sync/infrastructure/SolumSyncAdapter';
import { SFTPSyncAdapter } from '../../sync/infrastructure/SFTPSyncAdapter';
import type { EnhancedCSVConfig } from '@shared/infrastructure/services/csvService';

/**
 * Space Controller Hook
 * Main orchestration for space CRUD operations
 * Supports both SFTP and SoluM API modes
 */

interface UseSpaceControllerProps {
    csvConfig: CSVConfig;
    onSync?: () => Promise<void>;  // Callback to trigger sync after changes
    solumConfig?: SolumConfig;
    solumToken?: string;
    solumMappingConfig?: SolumMappingConfig;
    // SFTP mode props
    workingMode?: WorkingMode;
    sftpCredentials?: SFTPCredentials;
    sftpCsvConfig?: EnhancedCSVConfig;
}

export function useSpaceController({
    csvConfig,
    onSync,
    solumConfig,
    solumToken,
    solumMappingConfig,
    workingMode = 'SOLUM_API',
    sftpCredentials,
    sftpCsvConfig,
}: UseSpaceControllerProps) {
    const {
        spaces,
        spacesLists,
        setSpaces,
        addSpaceLocal: addToStore,
        updateSpaceLocal: updateInStore,
        deleteSpaceLocal: deleteFromStore,
        addSpacesList,
        updateSpacesList,
        deleteSpacesList,
        loadSpacesList,
    } = useSpacesStore();

    // Loading state for fetch operations
    const [isFetching, setIsFetching] = useState(false);

    // SFTP adapter ref for reuse
    const sftpAdapterRef = useRef<SFTPSyncAdapter | null>(null);

    /**
     * Get or create SFTP adapter
     */
    const getSFTPAdapter = useCallback((): SFTPSyncAdapter | null => {
        if (!sftpCredentials) return null;

        if (!sftpAdapterRef.current) {
            sftpAdapterRef.current = new SFTPSyncAdapter(sftpCredentials, sftpCsvConfig);
        }
        return sftpAdapterRef.current;
    }, [sftpCredentials, sftpCsvConfig]);

    /**
     * Upload spaces to SFTP (used after add/edit/delete in SFTP mode)
     * Also includes conference rooms to preserve them in the CSV
     */
    const uploadToSFTP = useCallback(async (): Promise<void> => {
        const adapter = getSFTPAdapter();
        if (!adapter) {
            throw new Error('SFTP credentials not configured');
        }

        // Get current spaces from store (not from closure which may be stale)
        const currentSpaces = useSpacesStore.getState().spaces;
        // Get conference rooms from store to include in upload
        const conferenceRooms = useConferenceStore.getState().conferenceRooms;

        logger.info('SpaceController', 'Uploading spaces to SFTP', {
            spacesCount: currentSpaces.length,
            conferenceCount: conferenceRooms.length,
        });

        try {
            await adapter.connect();
            await adapter.upload(currentSpaces, conferenceRooms);
            logger.info('SpaceController', 'Spaces uploaded to SFTP successfully');
        } catch (error) {
            logger.error('SpaceController', 'Failed to upload to SFTP', { error });
            throw error;
        }
    }, [getSFTPAdapter]);

    /**
     * Add new space
     */
    const addSpace = useCallback(
        async (spaceData: Partial<Space>): Promise<void> => {
            logger.info('SpaceController', 'Adding space', { id: spaceData.id });

            // Generate ID if not provided
            if (!spaceData.id) {
                const existingIds = spaces.map(s => s.id);
                // Try to get name for ID generation from data mapping or standard field
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

            // Check ID uniqueness
            if (!isSpaceIdUnique(spaceData.id!, spaces)) {
                throw new Error('Space ID already exists');
            }

            // Merge with defaults
            const space = mergeSpaceDefaults(spaceData, csvConfig);

            // Handle based on working mode
            if (workingMode === 'SFTP') {
                // SFTP mode: Add to local store then upload CSV
                logger.info('SpaceController', 'Adding space in SFTP mode', { id: space.id });
                addToStore(space);

                try {
                    await uploadToSFTP();
                    logger.info('SpaceController', 'Space added and uploaded to SFTP', { id: space.id });
                } catch (error) {
                    // Rollback on failure
                    deleteFromStore(space.id);
                    logger.error('SpaceController', 'Failed to upload after add, rolling back', { error });
                    throw error;
                }
            } else if (solumConfig && solumMappingConfig && solumToken) {
                // SoluM API mode: Post to AIMS
                try {
                    logger.info('SpaceController', 'Pushing article to AIMS', { id: space.id });


                    // Transform space to AIMS article format using mapping config
                    const data: Record<string, any> = {};
                    const mappingInfo = solumMappingConfig.mappingInfo;

                    // Map visible fields from config to data object
                    Object.entries(solumMappingConfig.fields).forEach(([fieldKey, fieldConfig]) => {
                        if (fieldConfig.visible) {
                            let value: any = undefined;

                            // Resolve value from space
                            if (mappingInfo?.articleId === fieldKey) {
                                value = space.id;
                            } else if (space.data && space.data[fieldKey] !== undefined) {
                                value = space.data[fieldKey];
                            } else if ((space as any)[fieldKey] !== undefined) {
                                value = (space as any)[fieldKey];
                            }

                            if (value !== undefined && value !== null && value !== '') {
                                data[fieldKey] = value;
                            }
                        }
                    });

                    if (solumMappingConfig.globalFieldAssignments) {
                        Object.assign(data, solumMappingConfig.globalFieldAssignments);
                    }

                    // Construct Root Object matching articleImportByJSON schema
                    // Root must contain articleId, articleName, data, etc.
                    const aimsArticle: any = {
                        data: data
                    };

                    // explicit root mapping
                    if (mappingInfo?.articleId && data[mappingInfo.articleId]) {
                        aimsArticle.articleId = String(data[mappingInfo.articleId]);
                    } else {
                        aimsArticle.articleId = space.id;
                    }

                    if (mappingInfo?.articleName && data[mappingInfo.articleName]) {
                        aimsArticle.articleName = String(data[mappingInfo.articleName]);
                    } else {
                        aimsArticle.articleName = space.id;
                    }

                    if (mappingInfo?.store && data[mappingInfo.store]) {
                        aimsArticle.store = String(data[mappingInfo.store]);
                    }

                    if (mappingInfo?.nfcUrl && data[mappingInfo.nfcUrl]) {
                        aimsArticle.nfcUrl = String(data[mappingInfo.nfcUrl]);
                    }


                    await solumService.pushArticles(
                        solumConfig,
                        solumConfig.storeNumber,
                        solumToken,
                        [aimsArticle]
                    );
                    logger.info('SpaceController', 'Article pushed to AIMS successfully', { id: space.id });
                } catch (error) {
                    logger.error('SpaceController', 'Failed to push article to AIMS', { error });
                    throw new Error(`Failed to push to AIMS: ${error}`);
                }

                // Refresh from AIMS to get the latest state
                try {
                    await fetchFromSolum();
                    logger.info('SpaceController', 'Refreshed from AIMS after add');
                } catch (error) {
                    logger.warn('SpaceController', 'Failed to refresh from AIMS after add', { error });
                }
            } else {
                // Fallback: add to store directly (no external sync)
                addToStore(space);
            }

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
        [spaces, csvConfig, addToStore, deleteFromStore, onSync, solumConfig, solumMappingConfig, solumToken, workingMode, uploadToSFTP]
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

            // Handle based on working mode
            if (workingMode === 'SFTP') {
                // SFTP mode: Update local store then upload CSV
                logger.info('SpaceController', 'Updating space in SFTP mode', { id });
                const originalSpace = { ...existingSpace };
                updateInStore(id, updatedSpace);

                try {
                    await uploadToSFTP();
                    logger.info('SpaceController', 'Space updated and uploaded to SFTP', { id });
                } catch (error) {
                    // Rollback on failure
                    updateInStore(id, originalSpace);
                    logger.error('SpaceController', 'Failed to upload after update, rolling back', { error });
                    throw error;
                }
            } else if (solumConfig && solumMappingConfig && solumToken) {
                // SoluM API mode: Push to AIMS
                try {
                    logger.info('SpaceController', 'Pushing updated article to AIMS', { id });


                    const space = updatedSpace as Space;
                    const data: Record<string, any> = {};
                    const mappingInfo = solumMappingConfig.mappingInfo;

                    Object.entries(solumMappingConfig.fields).forEach(([fieldKey, fieldConfig]) => {
                        if (fieldConfig.visible) {
                            let value: any = undefined;

                            // Resolve value from space
                            if (mappingInfo?.articleId === fieldKey) {
                                value = space.id;
                            } else if (space.data && space.data[fieldKey] !== undefined) {
                                value = space.data[fieldKey];
                            } else if ((space as any)[fieldKey] !== undefined) {
                                value = (space as any)[fieldKey];
                            }

                            if (value !== undefined && value !== null && value !== '') {
                                data[fieldKey] = value;
                            }
                        }
                    });

                    if (solumMappingConfig.globalFieldAssignments) {
                        Object.assign(data, solumMappingConfig.globalFieldAssignments);
                    }

                    // Construct Root Object
                    const aimsArticle: any = {
                        data: data
                    };

                    // explicit root mapping
                    if (mappingInfo?.articleId && data[mappingInfo.articleId]) {
                        aimsArticle.articleId = String(data[mappingInfo.articleId]);
                    } else {
                        aimsArticle.articleId = space.id;
                    }

                    if (mappingInfo?.articleName && data[mappingInfo.articleName]) {
                        aimsArticle.articleName = String(data[mappingInfo.articleName]);
                    } else {
                        aimsArticle.articleName = space.id;
                    }

                    if (mappingInfo?.store && data[mappingInfo.store]) {
                        aimsArticle.store = String(data[mappingInfo.store]);
                    }

                    if (mappingInfo?.nfcUrl && data[mappingInfo.nfcUrl]) {
                        aimsArticle.nfcUrl = String(data[mappingInfo.nfcUrl]);
                    }

                    await solumService.pushArticles(
                        solumConfig,
                        solumConfig.storeNumber,
                        solumToken,
                        [aimsArticle]
                    );
                    logger.info('SpaceController', 'Article updated in AIMS successfully', { id });
                } catch (error) {
                    logger.error('SpaceController', 'Failed to update article in AIMS', { error });
                    throw new Error(`Failed to update in AIMS: ${error}`);
                }

                // Refresh from AIMS to get the latest state
                try {
                    await fetchFromSolum();
                    logger.info('SpaceController', 'Refreshed from AIMS after update');
                } catch (error) {
                    logger.warn('SpaceController', 'Failed to refresh from AIMS after update', { error });
                }
            } else {
                // Fallback: update store directly (no external sync)
                updateInStore(id, updatedSpace);
            }

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
        [spaces, csvConfig, updateInStore, onSync, solumConfig, solumMappingConfig, solumToken, workingMode, uploadToSFTP]
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

            // Handle based on working mode
            if (workingMode === 'SFTP') {
                // SFTP mode: Delete from local store then upload CSV
                logger.info('SpaceController', 'Deleting space in SFTP mode', { id });
                const originalSpace = { ...existingSpace };
                deleteFromStore(id);

                try {
                    await uploadToSFTP();
                    logger.info('SpaceController', 'Space deleted and uploaded to SFTP', { id });
                } catch (error) {
                    // Rollback on failure
                    addToStore(originalSpace);
                    logger.error('SpaceController', 'Failed to upload after delete, rolling back', { error });
                    throw error;
                }
            } else if (solumConfig && solumMappingConfig && solumToken) {
                // SoluM API mode: Delete from AIMS
                try {
                    logger.info('SpaceController', 'Deleting article from AIMS', { id });
                    await solumService.deleteArticles(
                        solumConfig,
                        solumConfig.storeNumber,
                        solumToken,
                        [id]  // Delete this space article
                    );
                    logger.info('SpaceController', 'Article deleted from AIMS successfully', { id });
                } catch (error) {
                    logger.error('SpaceController', 'Failed to delete article from AIMS', { error });
                    throw new Error(`Failed to delete from AIMS: ${error}`);
                }

                // Refresh from AIMS to get the latest state
                try {
                    await fetchFromSolum();
                    logger.info('SpaceController', 'Refreshed from AIMS after delete');
                } catch (error) {
                    logger.warn('SpaceController', 'Failed to refresh from AIMS after delete', { error });
                }
            } else {
                // Fallback: delete from store directly (no external sync)
                deleteFromStore(id);
            }

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
        [spaces, addToStore, deleteFromStore, onSync, solumConfig, solumMappingConfig, solumToken, workingMode, uploadToSFTP]
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

            logger.info('SpaceController', 'Fetching spaces from SoluM using Adapter');
            setIsFetching(true);

            try {
                // Instantiate adapter solely for the purpose of downloading
                // We provide a no-op for token updates as this hook doesn't manage token persistence
                // (Token persistence is handled by the main SyncController or Settings)
                const adapter = new SolumSyncAdapter(
                    solumConfig,
                    csvConfig,
                    (newTokens) => logger.debug('SpaceController', 'Token refreshed during fetch (not persisted)', { newTokens }),
                    { ...solumConfig.tokens!, accessToken: solumToken } as any, // Construct tokens object if needed
                    solumMappingConfig
                );

                // Use the adapter's download logic which handles pagination properly
                const spaces = await adapter.download();

                // Import mapped spaces
                importFromSync(spaces);

                logger.info('SpaceController', 'Spaces fetched from SoluM', {
                    count: spaces.length
                });
            } catch (error) {
                logger.error('SpaceController', 'Failed to fetch from SoluM', { error });
                throw error;
            } finally {
                setIsFetching(false);
            }
        },
        [solumConfig, solumToken, solumMappingConfig, csvConfig, importFromSync]
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
        isFetching,

        // Space list operations
        saveSpacesList,
        loadSpacesList: loadSavedSpacesList,
        deleteSpacesList: deleteSavedSpacesList,
        spacesLists,
    };
}
