import { useCallback } from 'react';
import { useConferenceStore } from '../infrastructure/conferenceStore';
import { validateConferenceRoom, isConferenceRoomIdUnique } from '../domain/validation';
import { generateConferenceRoomId, createEmptyConferenceRoom, toggleMeetingStatus } from '../domain/businessRules';
import type { ConferenceRoom, SolumConfig } from '@shared/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import { logger } from '@shared/infrastructure/services/logger';
import * as solumService from '@shared/infrastructure/services/solumService';

/**
 * Conference Controller Hook
 * Main orchestration for conference room CRUD operations
 */

interface UseConferenceControllerProps {
    onSync?: () => Promise<void>;  // Callback to trigger sync after changes
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
        addConferenceRoom: addToStore,
        updateConferenceRoom: updateInStore,
        deleteConferenceRoom: deleteFromStore,
    } = useConferenceStore();

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
                roomData.roomName || ''
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

            // Add to store
            addToStore(finalRoom);

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
        [conferenceRooms, addToStore, onSync]
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

            // Update in store
            updateInStore(id, updatedRoom);

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
        [conferenceRooms, updateInStore, onSync]
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

            // Delete from store
            deleteFromStore(id);

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
        [conferenceRooms, deleteFromStore, onSync]
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
            updateInStore(id, updatedRoom);

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
        [conferenceRooms, updateInStore, onSync]
    );

    /**
     * Flip label page (for SoluM simple conference mode)
     * @param labelCode - Label code
     * @param currentPage - Current page (0 or 1)
     */
    const flipLabelPage = useCallback(
        async (labelCode: string, currentPage: number): Promise<void> => {
            if (!solumConfig || !solumToken) {
                throw new Error('SoluM configuration or token not available');
            }

            logger.info('ConferenceController', 'Flipping label page', { labelCode, currentPage });

            const newPage = currentPage === 0 ? 1 : 0;

            try {
                await solumService.updateLabelPage(
                    solumConfig,
                    solumConfig.storeNumber,
                    solumToken,
                    labelCode,
                    newPage
                );

                logger.info('ConferenceController', 'Label page flipped', { labelCode, newPage });
            } catch (error) {
                logger.error('ConferenceController', 'Flip page failed', { error });
                throw error;
            }
        },
        [solumConfig, solumToken]
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
            if (!solumConfig || !solumToken || !solumMappingConfig) {
                throw new Error('SoluM configuration, token, or mapping config not available');
            }

            logger.info('ConferenceController', 'Fetching conference rooms from SoluM');

            try {
                // Fetch all articles from SoluM
                const articles = await solumService.fetchArticles(
                    solumConfig,
                    solumConfig.storeNumber,
                    solumToken
                );

                // Filter IN articles where uniqueIdField starts with 'C' (conference rooms)
                const { uniqueIdField, fields, conferenceMapping } = solumMappingConfig;
                const conferenceArticles = articles.filter((article: any) => {
                    const uniqueId = article[uniqueIdField];
                    return uniqueId && String(uniqueId).toUpperCase().startsWith('C');
                });

                // Map articles to ConferenceRoom entities
                const mappedRooms: ConferenceRoom[] = conferenceArticles.map((article: any) => {
                    const id = String(article[uniqueIdField] || '');
                    const roomName = article[fields['roomName']?.friendlyNameEn || 'roomName'] || id;

                    // Parse meeting time (expected format: "START-END", e.g., "09:00-10:30")
                    const meetingTimeRaw = article[conferenceMapping.meetingTime] || '';
                    const [startTime, endTime] = String(meetingTimeRaw)
                        .split('-')
                        .map(t => t.trim());

                    // Parse participants (expected format: comma-separated, e.g., "John,Jane,Bob")
                    const participantsRaw = article[conferenceMapping.participants] || '';
                    const participants = String(participantsRaw)
                        .split(',')
                        .map(p => p.trim())
                        .filter(p => p.length > 0);

                    // Meeting name
                    const meetingName = article[conferenceMapping.meetingName] || '';

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
                        hasMeeting: !!meetingName,
                        meetingName,
                        startTime: startTime || '',
                        endTime: endTime || '',
                        participants,
                        labelCode: article.labelCode,
                        data,
                    };
                });

                // Import mapped conference rooms
                importFromSync(mappedRooms);

                logger.info('ConferenceController', 'Conference rooms fetched from SoluM', {
                    total: articles.length,
                    conferenceRooms: mappedRooms.length,
                    spaces: articles.length - mappedRooms.length
                });
            } catch (error) {
                logger.error('ConferenceController', 'Failed to fetch from SoluM', { error });
                throw error;
            }
        },
        [solumConfig, solumToken, solumMappingConfig, importFromSync]
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
    };
}
