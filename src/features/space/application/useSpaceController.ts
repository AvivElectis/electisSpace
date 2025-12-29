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

            // Post to AIMS if using SoluM mode
            if (solumConfig && solumMappingConfig && solumToken) {
                try {
                    logger.info('SpaceController', 'Pushing article to AIMS', { id: space.id });

                    // Transform space to AIMS article format using mapping config
                    const articleData: Record<string, any> = {};

                    // Map visible fields from config
                    Object.entries(solumMappingConfig.fields).forEach(([fieldKey, fieldConfig]) => {
                        if (fieldConfig.visible) {
                            let value: any = undefined;
                            const fieldKeyLower = fieldKey.toLowerCase();

                            if (fieldKeyLower === 'id' || fieldKeyLower === 'article_id') {
                                value = space.id;
                            } else if (fieldKeyLower.includes('roomname') || fieldKeyLower === 'name') {
                                value = space.roomName;
                            } else if (space.data && space.data[fieldKey] !== undefined) {
                                value = space.data[fieldKey];
                            } else if ((space as any)[fieldKey] !== undefined) {
                                value = (space as any)[fieldKey];
                            }

                            if (value !== undefined && value !== null && value !== '') {
                                articleData[fieldKey] = value;
                            }
                        }
                    });



                    if (solumMappingConfig.globalFieldAssignments) {
                        Object.assign(articleData, solumMappingConfig.globalFieldAssignments);
                    }

                    // Use mappingInfo to populate root-level fields from articleData
                    const mappingInfo = solumMappingConfig.mappingInfo;

                    // DEBUG: Log what we have
                    // console.log('[DEBUG addSpace] mappingInfo:', mappingInfo);
                    // console.log('[DEBUG addSpace] articleData:', articleData);
                    // console.log('[DEBUG addSpace] space.roomName:', space.roomName);

                    const aimsArticle: any = {
                        data: articleData
                    };

                    // Populate root-level fields using mappingInfo
                    if (mappingInfo?.articleId && articleData[mappingInfo.articleId]) {
                        aimsArticle.articleId = String(articleData[mappingInfo.articleId]);
                        // console.log('[DEBUG addSpace] Using mapped articleId:', aimsArticle.articleId);
                    } else {
                        aimsArticle.articleId = space.id;
                        // console.log('[DEBUG addSpace] Using fallback articleId:', aimsArticle.articleId);
                    }

                    if (mappingInfo?.articleName && articleData[mappingInfo.articleName]) {
                        aimsArticle.articleName = String(articleData[mappingInfo.articleName]);
                        // console.log('[DEBUG addSpace] Using mapped articleName:', aimsArticle.articleName);
                    } else {
                        aimsArticle.articleName = space.roomName || space.id;
                        // console.log('[DEBUG addSpace] Using fallback articleName:', aimsArticle.articleName);
                    }

                    if (mappingInfo?.store && articleData[mappingInfo.store]) {
                        aimsArticle.store = String(articleData[mappingInfo.store]);
                    }

                    if (mappingInfo?.nfcUrl && articleData[mappingInfo.nfcUrl]) {
                        aimsArticle.nfcUrl = String(articleData[mappingInfo.nfcUrl]);
                    }

                    // console.log('[DEBUG addSpace] Final aimsArticle:', aimsArticle);


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
            }

            // Refresh from AIMS to get the latest state
            if (solumConfig && solumMappingConfig && solumToken) {
                try {
                    await fetchFromSolum();
                    logger.info('SpaceController', 'Refreshed from AIMS after add');
                } catch (error) {
                    logger.warn('SpaceController', 'Failed to refresh from AIMS after add', { error });
                }
            } else {
                // For non-SoluM modes, add to store directly
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
        [spaces, csvConfig, addToStore, onSync, solumConfig, solumMappingConfig, solumToken]
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

            // Push to AIMS if using SoluM mode
            if (solumConfig && solumMappingConfig && solumToken) {
                try {
                    logger.info('SpaceController', 'Pushing updated article to AIMS', { id });

                    const space = updatedSpace as Space;
                    const articleData: Record<string, any> = {};

                    Object.entries(solumMappingConfig.fields).forEach(([fieldKey, fieldConfig]) => {
                        if (fieldConfig.visible) {
                            let value: any = undefined;
                            const fieldKeyLower = fieldKey.toLowerCase();

                            if (fieldKeyLower === 'id' || fieldKeyLower === 'article_id') {
                                value = space.id;
                            } else if (fieldKeyLower.includes('roomname') || fieldKeyLower === 'name') {
                                value = space.roomName;
                            } else if (space.data && space.data[fieldKey] !== undefined) {
                                value = space.data[fieldKey];
                            } else if ((space as any)[fieldKey] !== undefined) {
                                value = (space as any)[fieldKey];
                            }

                            if (value !== undefined && value !== null && value !== '') {
                                articleData[fieldKey] = value;
                            }
                        }
                    });

                    if (solumMappingConfig.globalFieldAssignments) {
                        Object.assign(articleData, solumMappingConfig.globalFieldAssignments);
                    }

                    // Use mappingInfo to populate root-level fields from articleData
                    const mappingInfo = solumMappingConfig.mappingInfo;
                    const aimsArticle: any = {
                        data: articleData
                    };

                    // Populate root-level fields using mappingInfo
                    if (mappingInfo?.articleId && articleData[mappingInfo.articleId]) {
                        aimsArticle.articleId = String(articleData[mappingInfo.articleId]);
                    } else {
                        aimsArticle.articleId = space.id;
                    }

                    if (mappingInfo?.articleName && articleData[mappingInfo.articleName]) {
                        aimsArticle.articleName = String(articleData[mappingInfo.articleName]);
                    } else {
                        aimsArticle.articleName = space.roomName || space.id;
                    }

                    if (mappingInfo?.store && articleData[mappingInfo.store]) {
                        aimsArticle.store = String(articleData[mappingInfo.store]);
                    }

                    if (mappingInfo?.nfcUrl && articleData[mappingInfo.nfcUrl]) {
                        aimsArticle.nfcUrl = String(articleData[mappingInfo.nfcUrl]);
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
            }

            // Refresh from AIMS to get the latest state
            if (solumConfig && solumMappingConfig && solumToken) {
                try {
                    await fetchFromSolum();
                    logger.info('SpaceController', 'Refreshed from AIMS after update');
                } catch (error) {
                    logger.warn('SpaceController', 'Failed to refresh from AIMS after update', { error });
                }
            } else {
                // For non-SoluM modes, update store directly
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
        [spaces, csvConfig, updateInStore, onSync, solumConfig, solumMappingConfig, solumToken]
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

            // Delete from AIMS if using SoluM mode  
            if (solumConfig && solumMappingConfig && solumToken) {
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
            }

            // Refresh from AIMS to get the latest state
            if (solumConfig && solumMappingConfig && solumToken) {
                try {
                    await fetchFromSolum();
                    logger.info('SpaceController', 'Refreshed from AIMS after delete');
                } catch (error) {
                    logger.warn('SpaceController', 'Failed to refresh from AIMS after delete', { error });
                }
            } else {
                // For non-SoluM modes, delete from store directly
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
        [spaces, deleteFromStore, onSync, solumConfig, solumMappingConfig, solumToken]
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

                // Filter OUT articles where articleId starts with 'C' (those are conference rooms)
                // IMPORTANT: Check article.articleId (root level from AIMS), not article[uniqueIdField]
                const { fields, globalFieldAssignments } = solumMappingConfig;
                const spaceArticles = articles.filter((article: any) => {
                    const articleId = article.articleId; // Use root-level articleId from AIMS
                    return articleId && !String(articleId).toUpperCase().startsWith('C');
                });

                // Map articles to Space entities
                const mappedSpaces: Space[] = spaceArticles.map((article: any) => {
                    const id = String(article.articleId || ''); // Use articleId from AIMS

                    // Apply global field assignments
                    const mergedArticle = {
                        ...article,
                        ...(globalFieldAssignments || {}),
                    };

                    // Build dynamic data object from visible fields
                    // Check both root level and article.data for field values
                    const articleData = article.data || {};
                    const data: Record<string, string> = {};
                    let roomName = article.articleName || id; // Use articleName from AIMS

                    Object.keys(fields).forEach(fieldKey => {
                        const mapping = fields[fieldKey];
                        if (mapping.visible) {
                            // Check article.data first, then root level
                            let fieldValue = articleData[fieldKey] !== undefined
                                ? articleData[fieldKey]
                                : mergedArticle[fieldKey];

                            // Fallback: Check standard mappings via mappingInfo
                            // This ensures keys like ITEM_NAME get their value from articleName
                            const mappingInfo = solumMappingConfig.mappingInfo;
                            if (fieldValue === undefined && mappingInfo) {
                                if (fieldKey === mappingInfo.articleName) {
                                    fieldValue = article.articleName;
                                } else if (fieldKey === mappingInfo.articleId) {
                                    fieldValue = article.articleId;
                                } else if (fieldKey === mappingInfo.store) {
                                    fieldValue = solumConfig.storeNumber;
                                }
                            }

                            if (fieldValue !== undefined) {
                                const valueStr = String(fieldValue);
                                data[fieldKey] = valueStr;

                                // Use first visible field as roomName if it looks like a name
                                // REMOVED heuristic logic to match SolumSyncAdapter fix
                                // if (fieldKey.toLowerCase().includes('name') && valueStr) {
                                //     roomName = valueStr;
                                // }
                            }
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
