import { useCallback, useState } from 'react';
import { useConferenceStore } from '../infrastructure/conferenceStore';
import { validateConferenceRoom, isConferenceRoomIdUnique } from '../domain/validation';
import { generateConferenceRoomId, createEmptyConferenceRoom } from '../domain/businessRules';
import type { ConferenceRoom, SolumConfig } from '@shared/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import { logger } from '@shared/infrastructure/services/logger';
import { useConferenceAIMS } from './hooks/useConferenceAIMS';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

/**
 * Conference Controller Hook
 * Main orchestration for conference room CRUD operations.
 * 
 * ARCHITECTURE: All AIMS sync goes through the server.
 * - CRUD operations call server API (which queues sync items)
 * - After each operation, onSync() triggers push to process the queue
 * - Direct AIMS access is only used for label page flipping and data fetching
 */

interface UseConferenceControllerProps {
    onSync?: () => Promise<void>;  // Callback to trigger push after changes
    solumConfig?: SolumConfig;     // For SoluM label page flipping
    solumToken?: string;            // Current SoluM access token
    solumMappingConfig?: SolumMappingConfig; // SoluM field mappings
}

export function useConferenceController({
    onSync,
    solumConfig,
    solumToken,
    solumMappingConfig,
}: UseConferenceControllerProps) {
    const {
        conferenceRooms,
        setConferenceRooms,
        addConferenceRoomLocal: addToStore,
        createRoom: createRoomOnServer,
        updateRoom: updateRoomOnServer,
        deleteRoom: deleteRoomOnServer,
        toggleMeeting: toggleMeetingOnServer,
    } = useConferenceStore();

    // Use AIMS hook only for fetch and label page flip (direct AIMS access)
    const {
        fetchFromAIMS,
        flipLabelPage: flipLabelPageInternal,
    } = useConferenceAIMS({
        solumConfig,
        solumToken,
        solumMappingConfig,
    });

    // Loading state for fetch operations
    const [isFetching, setIsFetching] = useState(false);

    /**
     * Trigger push to process pending sync queue items
     */
    const triggerPush = useCallback(async () => {
        if (onSync) {
            try {
                await onSync();
            } catch (error) {
                logger.warn('ConferenceController', 'Push after operation failed', { error });
            }
        }
    }, [onSync]);

    /**
     * Add new conference room via server API
     * Server creates room in DB and queues sync item for AIMS push
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

            // Get active store ID
            const activeStoreId = useAuthStore.getState().activeStoreId;
            if (!activeStoreId) throw new Error('No active store selected');

            // Create on server (which queues sync item for AIMS push)
            const serverRoom = await createRoomOnServer({
                storeId: activeStoreId,
                externalId: finalRoom.id,
                roomName: finalRoom.data?.roomName || finalRoom.id,
                labelCode: finalRoom.labelCode,
            });

            if (!serverRoom) {
                throw new Error('Failed to create conference room on server');
            }

            logger.info('ConferenceController', 'Conference room created on server', { id: serverRoom.id });

            // Trigger push to process sync queue → AIMS
            await triggerPush();

            logger.info('ConferenceController', 'Conference room added', { id: finalRoom.id });
        },
        [conferenceRooms, createRoomOnServer, triggerPush]
    );

    /**
     * Update existing conference room via server API
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

            // Update on server (which queues sync item)
            const serverRoom = await updateRoomOnServer(id, {
                roomName: updatedRoom.data?.roomName,
                labelCode: updatedRoom.labelCode || null,
            });

            if (!serverRoom) {
                throw new Error('Failed to update conference room on server');
            }

            logger.info('ConferenceController', 'Conference room updated on server', { id });

            // Trigger push to process sync queue → AIMS
            await triggerPush();

            logger.info('ConferenceController', 'Conference room updated', { id });
        },
        [conferenceRooms, updateRoomOnServer, triggerPush]
    );

    /**
     * Delete conference room via server API
     */
    const deleteConferenceRoom = useCallback(
        async (id: string): Promise<void> => {
            logger.info('ConferenceController', 'Deleting conference room', { id });

            const existingRoom = conferenceRooms.find(r => r.id === id);
            if (!existingRoom) {
                throw new Error('Conference room not found');
            }

            // Delete on server (which queues sync item for AIMS delete)
            const success = await deleteRoomOnServer(id);
            if (!success) {
                throw new Error('Failed to delete conference room on server');
            }

            logger.info('ConferenceController', 'Conference room deleted on server', { id });

            // Trigger push to process sync queue → AIMS
            await triggerPush();

            logger.info('ConferenceController', 'Conference room deleted', { id });
        },
        [conferenceRooms, deleteRoomOnServer, triggerPush]
    );

    /**
     * Toggle meeting status via server API
     */
    const toggleMeeting = useCallback(
        async (id: string, meetingData?: {
            meetingName?: string;
            startTime?: string;
            endTime?: string;
            participants?: string[];
        }): Promise<void> => {
            logger.info('ConferenceController', 'Toggling meeting status', { id });

            const room = conferenceRooms.find(r => r.id === id);
            if (!room) {
                throw new Error('Conference room not found');
            }

            // Toggle on server (which queues sync item)
            const updatedRoom = await toggleMeetingOnServer(id, meetingData);
            if (!updatedRoom) {
                throw new Error('Failed to toggle meeting on server');
            }

            // Trigger push to process sync queue → AIMS
            await triggerPush();

            logger.info('ConferenceController', 'Meeting status toggled', { id, hasMeeting: updatedRoom.hasMeeting });
        },
        [conferenceRooms, toggleMeetingOnServer, triggerPush]
    );

    /**
     * Flip label page (direct AIMS operation for ESL labels)
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
