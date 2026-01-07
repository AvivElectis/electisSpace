import { useCallback, useState, useRef } from 'react';
import { useConferenceStore } from '../infrastructure/conferenceStore';
import { validateConferenceRoom, isConferenceRoomIdUnique } from '../domain/validation';
import { generateConferenceRoomId, createEmptyConferenceRoom, toggleMeetingStatus } from '../domain/businessRules';
import type { ConferenceRoom, SolumConfig, SFTPCredentials, WorkingMode } from '@shared/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import type { EnhancedCSVConfig } from '@shared/infrastructure/services/csvService';
import { logger } from '@shared/infrastructure/services/logger';
import { useConferenceAIMS } from './hooks/useConferenceAIMS';
import { SFTPSyncAdapter } from '@features/sync/infrastructure/SFTPSyncAdapter';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';

/**
 * Conference Controller Hook
 * Main orchestration for conference room CRUD operations
 */

interface UseConferenceControllerProps {
    onSync?: () => Promise<void>;  // Callback to trigger sync after changes
    solumConfig?: SolumConfig;     // For SoluM label page flipping
    solumToken?: string;            // Current SoluM access token
    solumMappingConfig?: SolumMappingConfig; // SoluM field mappings
    // SFTP mode props
    workingMode?: WorkingMode;
    sftpCredentials?: SFTPCredentials;
    sftpCsvConfig?: EnhancedCSVConfig;
}

export function useConferenceController({
    onSync,
    solumConfig,
    solumToken,
    solumMappingConfig,
    workingMode = 'SOLUM_API',
    sftpCredentials,
    sftpCsvConfig,
}: UseConferenceControllerProps) {
    const {
        conferenceRooms,
        setConferenceRooms,
        addConferenceRoom: addToStore,
        updateConferenceRoom: updateInStore,
        deleteConferenceRoom: deleteFromStore,
    } = useConferenceStore();

    // Get spaces for combined CSV upload in SFTP mode
    const spaces = useSpacesStore((state) => state.spaces);

    // SFTP Adapter ref for reuse
    const sftpAdapterRef = useRef<SFTPSyncAdapter | null>(null);

    // Use the extracted AIMS hook for all AIMS operations
    const { 
        pushToAIMS, 
        deleteFromAIMS, 
        fetchFromAIMS, 
        flipLabelPage: flipLabelPageInternal,
        isAIMSConfigured 
    } = useConferenceAIMS({
        solumConfig,
        solumToken,
        solumMappingConfig,
    });

    // Loading state for fetch operations
    const [isFetching, setIsFetching] = useState(false);

    /**
     * Get or create SFTP adapter for uploads
     */
    const getSFTPAdapter = useCallback((): SFTPSyncAdapter | null => {
        if (!sftpCredentials || !sftpCsvConfig) return null;
        
        if (!sftpAdapterRef.current) {
            sftpAdapterRef.current = new SFTPSyncAdapter(sftpCredentials, sftpCsvConfig);
        } else {
            // Update with latest config
            sftpAdapterRef.current.updateCredentials(sftpCredentials);
            sftpAdapterRef.current.updateCSVConfig(sftpCsvConfig);
        }
        return sftpAdapterRef.current;
    }, [sftpCredentials, sftpCsvConfig]);

    /**
     * Upload current data to SFTP after changes
     */
    const uploadToSFTP = useCallback(async (): Promise<void> => {
        const adapter = getSFTPAdapter();
        if (!adapter) {
            throw new Error('SFTP not configured');
        }
        // Upload combined spaces and conference rooms
        await adapter.upload(spaces, conferenceRooms);
    }, [getSFTPAdapter, spaces, conferenceRooms]);

    /**
     * Add new conference room
     */
    const addConferenceRoom = useCallback(
        async (roomData: Partial<ConferenceRoom>): Promise<void> => {
            logger.info('ConferenceController', 'Adding conference room', { id: roomData.id });

            // Generate ID if not provided
            if (!roomData.id) {
                const existingIds = conferenceRooms.map(r => r.id);
                roomData.id = generateConferenceRoomId(existingIds);
            }

            // Create with defaults
            const room = createEmptyConferenceRoom(
                roomData.id,
                roomData.data?.roomName || ''
            );

            // Merge with provided data
            const finalRoom: ConferenceRoom = {
                ...room,
                ...roomData,
            };

            // Validate
            const validation = validateConferenceRoom(finalRoom);
            if (!validation.valid) {
                const errorMsg = validation.errors.map(e => e.message).join(', ');
                logger.error('ConferenceController', 'Validation failed', { errors: validation.errors });
                throw new Error(`Validation failed: ${errorMsg}`);
            }

            // Check ID uniqueness
            if (!isConferenceRoomIdUnique(finalRoom.id, conferenceRooms)) {
                throw new Error('Conference room ID already exists');
            }

            // Handle based on working mode
            if (workingMode === 'SFTP') {
                // SFTP mode: Add to local store then upload CSV
                logger.info('ConferenceController', 'Adding conference room in SFTP mode', { id: finalRoom.id });
                addToStore(finalRoom);
                
                try {
                    await uploadToSFTP();
                    logger.info('ConferenceController', 'Conference room added and uploaded to SFTP', { id: finalRoom.id });
                } catch (error) {
                    // Rollback on failure
                    deleteFromStore(finalRoom.id);
                    logger.error('ConferenceController', 'Failed to upload after add, rolling back', { error });
                    throw error;
                }
            } else if (isAIMSConfigured) {
                // SoluM API mode: Post to AIMS
                try {
                    await pushToAIMS(finalRoom);
                } catch (error) {
                    logger.error('ConferenceController', 'Failed to push article to AIMS', { error });
                    throw new Error(`Failed to push to AIMS: ${error}`);
                }

                // Add to store
                addToStore(finalRoom);

                // Refresh from AIMS to get the latest state
                try {
                    await fetchFromSolum();
                    logger.info('ConferenceController', 'Refreshed from AIMS after add');
                } catch (error) {
                    logger.warn('ConferenceController', 'Failed to refresh from AIMS after add', { error });
                }
            } else {
                // Fallback: add to store directly (no external sync)
                addToStore(finalRoom);
            }

            // Trigger sync
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('ConferenceController', 'Sync after add failed', { error });
                }
            }

            logger.info('ConferenceController', 'Conference room added', { id: finalRoom.id });
        },
        [conferenceRooms, addToStore, deleteFromStore, onSync, isAIMSConfigured, pushToAIMS, workingMode, uploadToSFTP]
    );

    /**
     * Update existing conference room
     */
    const updateConferenceRoom = useCallback(
        async (id: string, updates: Partial<ConferenceRoom>): Promise<void> => {
            logger.info('ConferenceController', 'Updating conference room', { id });

            const existingRoom = conferenceRooms.find(r => r.id === id);
            if (!existingRoom) {
                throw new Error('Conference room not found');
            }

            // Merge updates
            const updatedRoom: ConferenceRoom = {
                ...existingRoom,
                ...updates,
            };

            // Validate
            const validation = validateConferenceRoom(updatedRoom);
            if (!validation.valid) {
                const errorMsg = validation.errors.map(e => e.message).join(', ');
                logger.error('ConferenceController', 'Validation failed', { errors: validation.errors });
                throw new Error(`Validation failed: ${errorMsg}`);
            }

            // Handle based on working mode
            if (workingMode === 'SFTP') {
                // SFTP mode: Update in local store then upload CSV
                logger.info('ConferenceController', 'Updating conference room in SFTP mode', { id });
                const originalRoom = { ...existingRoom };
                updateInStore(id, updatedRoom);
                
                try {
                    await uploadToSFTP();
                    logger.info('ConferenceController', 'Conference room updated and uploaded to SFTP', { id });
                } catch (error) {
                    // Rollback on failure
                    updateInStore(id, originalRoom);
                    logger.error('ConferenceController', 'Failed to upload after update, rolling back', { error });
                    throw error;
                }
            } else if (isAIMSConfigured) {
                // SoluM API mode: Push to AIMS
                try {
                    await pushToAIMS(updatedRoom);
                    logger.info('ConferenceController', 'Article updated in AIMS successfully', { id });
                } catch (error) {
                    logger.error('ConferenceController', 'Failed to update article in AIMS', { error });
                    throw new Error(`Failed to update in AIMS: ${error}`);
                }

                // Update in store
                updateInStore(id, updatedRoom);

                // Refresh from AIMS to get the latest state
                try {
                    await fetchFromSolum();
                    logger.info('ConferenceController', 'Refreshed from AIMS after update');
                } catch (error) {
                    logger.warn('ConferenceController', 'Failed to refresh from AIMS after update', { error });
                }
            } else {
                // Fallback: update in store directly (no external sync)
                updateInStore(id, updatedRoom);
            }

            // Trigger sync
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('ConferenceController', 'Sync after update failed', { error });
                }
            }

            logger.info('ConferenceController', 'Conference room updated', { id });
        },
        [conferenceRooms, updateInStore, onSync, isAIMSConfigured, pushToAIMS, workingMode, uploadToSFTP]
    );

    /**
     * Delete conference room
     */
    const deleteConferenceRoom = useCallback(
        async (id: string): Promise<void> => {
            logger.info('ConferenceController', 'Deleting conference room', { id });

            const existingRoom = conferenceRooms.find(r => r.id === id);
            if (!existingRoom) {
                throw new Error('Conference room not found');
            }

            // Handle based on working mode
            if (workingMode === 'SFTP') {
                // SFTP mode: Delete from local store then upload CSV
                logger.info('ConferenceController', 'Deleting conference room in SFTP mode', { id });
                const originalRoom = { ...existingRoom };
                deleteFromStore(id);
                
                try {
                    await uploadToSFTP();
                    logger.info('ConferenceController', 'Conference room deleted and uploaded to SFTP', { id });
                } catch (error) {
                    // Rollback on failure
                    addToStore(originalRoom);
                    logger.error('ConferenceController', 'Failed to upload after delete, rolling back', { error });
                    throw error;
                }
            } else if (isAIMSConfigured) {
                // SoluM API mode: Delete from AIMS
                try {
                    await deleteFromAIMS(id);
                } catch (error) {
                    logger.error('ConferenceController', 'Failed to delete article from AIMS', { error });
                    throw new Error(`Failed to delete from AIMS: ${error}`);
                }

                // Delete from store
                deleteFromStore(id);

                // Refresh from AIMS to get the latest state
                try {
                    await fetchFromSolum();
                    logger.info('ConferenceController', 'Refreshed from AIMS after delete');
                } catch (error) {
                    logger.warn('ConferenceController', 'Failed to refresh from AIMS after delete', { error });
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
                    logger.warn('ConferenceController', 'Sync after delete failed', { error });
                }
            }

            logger.info('ConferenceController', 'Conference room deleted', { id });
        },
        [conferenceRooms, addToStore, deleteFromStore, onSync, isAIMSConfigured, deleteFromAIMS, workingMode, uploadToSFTP]
    );

    /**
     * Toggle meeting status (occupied/available)
     */
    const toggleMeeting = useCallback(
        async (id: string): Promise<void> => {
            logger.info('ConferenceController', 'Toggling meeting status', { id });

            const room = conferenceRooms.find(r => r.id === id);
            if (!room) {
                throw new Error('Conference room not found');
            }

            const updatedRoom = toggleMeetingStatus(room);
            
            // Handle based on working mode
            if (workingMode === 'SFTP') {
                // SFTP mode: Update in local store then upload CSV
                const originalRoom = { ...room };
                updateInStore(id, updatedRoom);
                
                try {
                    await uploadToSFTP();
                    logger.info('ConferenceController', 'Meeting status toggled and uploaded to SFTP', { id });
                } catch (error) {
                    // Rollback on failure
                    updateInStore(id, originalRoom);
                    logger.error('ConferenceController', 'Failed to upload after toggle, rolling back', { error });
                    throw error;
                }
            } else {
                updateInStore(id, updatedRoom);
            }

            // Trigger sync
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('ConferenceController', 'Sync after toggle failed', { error });
                }
            }

            logger.info('ConferenceController', 'Meeting status toggled', { id, hasMeeting: updatedRoom.hasMeeting });
        },
        [conferenceRooms, updateInStore, onSync, workingMode, uploadToSFTP]
    );

    /**
     * Flip label page (for SoluM simple conference mode)
     * @param labelCode - Label code
     * @param currentPage - Current page (0 or 1)
     */
    const flipLabelPage = useCallback(
        async (labelCode: string, currentPage: number): Promise<void> => {
            await flipLabelPageInternal(labelCode, currentPage);
        },
        [flipLabelPageInternal]
    );

    /**
     * Import conference rooms from sync
     */
    const importFromSync = useCallback(
        (importedRooms: ConferenceRoom[]): void => {
            logger.info('ConferenceController', 'Importing conference rooms', {
                count: importedRooms.length
            });
            setConferenceRooms(importedRooms);
        },
        [setConferenceRooms]
    );

    /**
     * Get all conference rooms
     */
    const getAllConferenceRooms = useCallback((): ConferenceRoom[] => {
        return conferenceRooms;
    }, [conferenceRooms]);

    /**
     * Fetch conference rooms from SoluM API
     * Fetches all articles, filters IN those with 'C' prefix,
     * and maps them to ConferenceRoom entities using solumMappingConfig
     */
    const fetchFromSolum = useCallback(
        async (): Promise<void> => {
            logger.info('ConferenceController', 'Fetching conference rooms from SoluM');
            setIsFetching(true);

            try {
                const mappedRooms = await fetchFromAIMS();
                importFromSync(mappedRooms);
            } catch (error) {
                logger.error('ConferenceController', 'Failed to fetch from SoluM', { error });
                throw error;
            } finally {
                setIsFetching(false);
            }
        },
        [fetchFromAIMS, importFromSync]
    );


    return {
        // Conference operations
        addConferenceRoom,
        updateConferenceRoom,
        deleteConferenceRoom,
        toggleMeeting,
        flipLabelPage,
        importFromSync,
        fetchFromSolum,
        getAllConferenceRooms,
        conferenceRooms,
        isFetching,
    };
}
