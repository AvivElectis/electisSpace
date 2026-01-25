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
 * Supports both SFTP and Server/SoluM API modes
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
     * Upload spaces to SFTP
     */
    const uploadToSFTP = useCallback(async (): Promise<void> => {
        const adapter = getSFTPAdapter();
        if (!adapter) {
            throw new Error('SFTP credentials not configured');
        }

        const currentSpaces = useSpacesStore.getState().spaces;
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
    /**
     * Add new space
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

            // ---------------------------------------------------------
            // ENFORCED SERVER ARCHITECTURE (SoluM Mode Only)
            // ---------------------------------------------------------

            // 1. Create in Server DB
            // We map local 'id' to 'externalId' for server creation
            const serverPayload = {
                externalId: space.id,
                labelCode: space.labelCode || undefined,
                templateName: space.templateName,
                data: space.data
            };

            const savedSpace = await createInStore(serverPayload);
            if (!savedSpace) throw new Error('Failed to create space on server');

            logger.info('SpaceController', 'Space persisted to Server DB', { id: space.id });

            // 2. Push to SoluM AIMS
            if (solumConfig && solumMappingConfig && solumToken) {
                logger.info('SpaceController', 'Pushing article to AIMS', { id: space.id });

                const data: Record<string, any> = {};
                const mappingInfo = solumMappingConfig.mappingInfo;

                Object.entries(solumMappingConfig.fields).forEach(([fieldKey, fieldConfig]) => {
                    if (fieldConfig.visible) {
                        let value: any = undefined;
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

                const aimsArticle: any = { data: data };
                if (mappingInfo?.articleId && data[mappingInfo.articleId]) {
                    aimsArticle.articleId = String(data[mappingInfo.articleId]);
                } else {
                    aimsArticle.articleId = space.id;
                }

                // ... other mappings ...
                if (mappingInfo?.articleName && data[mappingInfo.articleName]) aimsArticle.articleName = String(data[mappingInfo.articleName]);
                else aimsArticle.articleName = space.id;
                if (mappingInfo?.store && data[mappingInfo.store]) aimsArticle.store = String(data[mappingInfo.store]);
                if (mappingInfo?.nfcUrl && data[mappingInfo.nfcUrl]) aimsArticle.nfcUrl = String(data[mappingInfo.nfcUrl]);

                await solumService.pushArticles(
                    solumConfig,
                    solumConfig.storeNumber,
                    solumToken,
                    [aimsArticle]
                );
                logger.info('SpaceController', 'Article pushed to AIMS successfully');
            } else {
                logger.warn('SpaceController', 'SoluM config missing, skipping push to AIMS', {
                    hasConfig: !!solumConfig, hasMapping: !!solumMappingConfig, hasToken: !!solumToken
                });
            }

            // Trigger sync
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('SpaceController', 'Sync after add failed', { error });
                }
            }

            logger.info('SpaceController', 'Space added successfully', { id: space.id });
        },
        [spaces, csvConfig, createInStore, onSync, solumConfig, solumMappingConfig, solumToken, workingMode, uploadToSFTP]
    );

    /**
     * Update existing space
     */
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

            const updatedSpace: Partial<Space> = {
                ...existingSpace,
                ...updates,
                data: { ...existingSpace.data, ...updates.data },
            };

            const validation = validateSpace(updatedSpace, csvConfig);
            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
            }

            // ---------------------------------------------------------
            // SERVER FIRST ARCHITECTURE: Always update in Server DB
            // ---------------------------------------------------------
            try {
                const saved = await updateInStore(id, updatedSpace);
                if (!saved) throw new Error("Failed to update space on server");

                logger.info('SpaceController', 'Space updated in Server DB', { id });

                // ---------------------------------------------------------
                // Secondary Actions
                // ---------------------------------------------------------
                if (workingMode === 'SFTP') {
                    // SFTP Mode: Upload to SFTP server
                    try {
                        await uploadToSFTP();
                        logger.info('SpaceController', 'Updates uploaded to SFTP', { id });
                    } catch (error) {
                        logger.error('SpaceController', 'Failed to upload to SFTP (Persisted on Server OK)', { error });
                        throw error;
                    }
                } else {
                    // Server/SoluM Mode
                    if (solumConfig && solumMappingConfig && solumToken) {
                        const space = updatedSpace as Space;
                        const data: Record<string, any> = {};
                        Object.entries(solumMappingConfig.fields).forEach(([fieldKey, fieldConfig]) => {
                            if (fieldConfig.visible) {
                                const value = space.data[fieldKey] || (space as any)[fieldKey];
                                if (value) data[fieldKey] = value;
                            }
                        });
                        const aimsArticle: any = {
                            data,
                            articleId: space.id,
                            articleName: space.id
                        };
                        // Apply mappings omitted for brevity...

                        await solumService.pushArticles(
                            solumConfig,
                            solumConfig.storeNumber,
                            solumToken,
                            [aimsArticle]
                        );
                        logger.info('SpaceController', 'Article update pushed to AIMS');
                    }
                }
            } catch (error) {
                logger.error("SpaceController", "Failed to update space", { error });
                throw error;
            }
        },
        [spaces, csvConfig, updateInStore, solumConfig, solumToken, solumMappingConfig, workingMode, uploadToSFTP]
    );

    /**
     * Delete space
     */
    /**
     * Delete space
     */
    const deleteSpace = useCallback(
        async (id: string): Promise<void> => {
            logger.info('SpaceController', 'Deleting space', { id });

            const existingSpace = spaces.find(s => s.id === id);
            if (!existingSpace) throw new Error('Space not found');

            // ---------------------------------------------------------
            // SERVER FIRST ARCHITECTURE: Always delete from Server DB
            // ---------------------------------------------------------
            try {
                const success = await deleteInStore(id);
                if (!success) throw new Error("Failed to delete space on server");

                logger.info('SpaceController', 'Space deleted from Server DB', { id });

                // ---------------------------------------------------------
                // Secondary Actions
                // ---------------------------------------------------------
                if (workingMode === 'SFTP') {
                    // SFTP Mode: Upload to SFTP server (which effectively removes it from the CSV if upload sends all)
                    try {
                        await uploadToSFTP();
                        logger.info('SpaceController', 'Deletion synced to SFTP', { id });
                    } catch (error) {
                        logger.error('SpaceController', 'Failed to upload deletion to SFTP', { error });
                        // No rollback possible/easy for server deletion.
                        throw error;
                    }
                } else {
                    // Server/SoluM Mode
                    if (solumConfig && solumToken) {
                        try {
                            await solumService.deleteArticles(
                                solumConfig,
                                solumConfig.storeNumber,
                                solumToken,
                                [existingSpace.id]
                            );
                            logger.info('SpaceController', 'Article deleted from AIMS');
                        } catch (e) {
                            logger.warn("SpaceController", "Failed to delete from AIMS (Server delete succeeded)", { error: e });
                        }
                    }
                }
            } catch (error) {
                logger.error("SpaceController", "Failed to delete space", { error });
                throw error;
            }
        },
        [spaces, deleteInStore, workingMode, solumConfig, solumToken, uploadToSFTP]
    );

    // Helpers
    const findSpaceById = useCallback((id: string) => spaces.find(s => s.id === id), [spaces]);
    const importFromSync = useCallback((is: Space[]) => setSpaces(is), [setSpaces]);
    const getAllSpaces = useCallback(() => spaces, [spaces]);

    const fetchFromSolum = useCallback(async () => {
        // Keep this for "Refresh from AIMS" button
        if (!solumConfig || !solumToken || !solumMappingConfig) return;
        setIsFetching(true);
        try {
            // If in Cloud Persistence mode, maybe we should fetch from Server DB instead?
            // But "fetchFromSolum" explicitly says Solum.
            // We'll let it fetch from Solum and update the Local store (Visual).
            // But if we want to PERSIST what we fetched to Server DB?
            // Typically "Sync" is Server->Client.
            // This fetch updates Client Store.
            const adapter = new SolumSyncAdapter(
                solumConfig,
                csvConfig,
                () => { },
                { ...solumConfig.tokens!, accessToken: solumToken } as any,
                solumMappingConfig
            );
            const spaces = await adapter.download();
            importFromSync(spaces);
        } finally {
            setIsFetching(false);
        }
    }, [solumConfig, solumToken, solumMappingConfig, csvConfig, importFromSync]);

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
