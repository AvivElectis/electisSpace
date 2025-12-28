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

            // Post to AIMS if using SoluM mode
            if (solumConfig && solumMappingConfig && solumToken) {
                try {
                    logger.info('ConferenceController', 'Pushing article to AIMS', { id: finalRoom.id });

                    // Transform conference room to AIMS article format using mapping config
                    const articleData: Record<string, any> = {};

                    // Debug: Log the conference room object and mapping config
                    console.log('[DEBUG] Conference Room Object:', finalRoom);
                    console.log('[DEBUG] Mapping Config Fields:', solumMappingConfig.fields);

                    // Map each field according to solumMappingConfig
                    Object.entries(solumMappingConfig.fields).forEach(([fieldKey, fieldConfig]) => {
                        if (fieldConfig.visible) {
                            // Try to get value from conference room object
                            let value: any = undefined;

                            // Create a case-insensitive property mapper
                            const fieldKeyLower = fieldKey.toLowerCase();

                            // Map based on lowercase field key to conference room properties
                            if (fieldKeyLower === 'id' || fieldKeyLower === 'article_id') {
                                value = finalRoom.id;
                            } else if (fieldKeyLower.includes('roomname') || fieldKeyLower === 'name') {
                                value = finalRoom.roomName;
                            } else if (fieldKeyLower.includes('meeting') && fieldKeyLower.includes('name')) {
                                value = finalRoom.meetingName;
                            } else if (fieldKeyLower.includes('meeting') && fieldKeyLower.includes('time')) {
                                // Combine start and end time for MEETING_TIME field
                                if (finalRoom.startTime && finalRoom.endTime) {
                                    value = `${finalRoom.startTime} - ${finalRoom.endTime}`;
                                } else if (finalRoom.startTime) {
                                    value = finalRoom.startTime;
                                }
                            } else if (fieldKeyLower.includes('start') && fieldKeyLower.includes('time')) {
                                value = finalRoom.startTime;
                            } else if (fieldKeyLower.includes('end') && fieldKeyLower.includes('time')) {
                                value = finalRoom.endTime;
                            } else if (fieldKeyLower.includes('participant')) {
                                value = finalRoom.participants?.join(', ');
                            } else if (fieldKeyLower.includes('hasmeeting') || fieldKeyLower.includes('has_meeting')) {
                                value = finalRoom.hasMeeting ? 'true' : 'false';
                            } else if (finalRoom.data && finalRoom.data[fieldKey] !== undefined) {
                                // Use value from data object
                                value = finalRoom.data[fieldKey];
                            } else if ((finalRoom as any)[fieldKey] !== undefined) {
                                // Fallback: try exact property name match
                                value = (finalRoom as any)[fieldKey];
                            }

                            console.log(`[DEBUG] Field '${fieldKey}' -> value:`, value);

                            // Only add if value exists
                            if (value !== undefined && value !== null && value !== '') {
                                articleData[fieldKey] = value;
                            }
                        }
                    });

                    // Apply global field assignments from mapping config
                    if (solumMappingConfig.globalFieldAssignments) {
                        Object.assign(articleData, solumMappingConfig.globalFieldAssignments);
                    }

                    const aimsArticle = {
                        articleId: finalRoom.id,
                        articleName: finalRoom.roomName || finalRoom.id,
                        data: articleData
                    };

                    // Log the complete AIMS POST request
                    console.log('[AIMS POST REQUEST]', {
                        url: `${solumConfig.baseUrl}/common/api/v2/common/articles?company=${solumConfig.companyName}&store=${solumConfig.storeNumber}`,
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${solumToken.substring(0, 20)}...`,
                            'Content-Type': 'application/json'
                        },
                        body: [aimsArticle]
                    });

                    await solumService.pushArticles(
                        solumConfig,
                        solumConfig.storeNumber,
                        solumToken,
                        [aimsArticle]
                    );
                    logger.info('ConferenceController', 'Article pushed to AIMS successfully', { id: finalRoom.id });
                } catch (error) {
                    logger.error('ConferenceController', 'Failed to push article to AIMS', { error });
                    throw new Error(`Failed to push to AIMS: ${error}`);
                }
            }

            // Add to store
            addToStore(finalRoom);

            // Refresh from AIMS to get the latest state
            if (solumConfig && solumMappingConfig && solumToken) {
                try {
                    await fetchFromSolum();
                    logger.info('ConferenceController', 'Refreshed from AIMS after add');
                } catch (error) {
                    logger.warn('ConferenceController', 'Failed to refresh from AIMS after add', { error });
                }
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
        [conferenceRooms, addToStore, onSync, solumConfig, solumMappingConfig, solumToken]
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

            // Push to AIMS if using SoluM mode
            if (solumConfig && solumMappingConfig && solumToken) {
                try {
                    logger.info('ConferenceController', 'Pushing updated article to AIMS', { id });

                    // Transform conference room to AIMS article format using mapping config
                    const articleData: Record<string, any> = {};
                    const room = updatedRoom as ConferenceRoom;

                    // Debug: Log the conference room object and mapping config
                    console.log('[DEBUG UPDATE] Conference Room Object:', room);
                    console.log('[DEBUG UPDATE] Mapping Config Fields:', solumMappingConfig.fields);

                    // Map each field according to solumMappingConfig
                    Object.entries(solumMappingConfig.fields).forEach(([fieldKey, fieldConfig]) => {
                        if (fieldConfig.visible) {
                            // Try to get value from conference room object
                            let value: any = undefined;

                            // Create a case-insensitive property mapper
                            const fieldKeyLower = fieldKey.toLowerCase();

                            // Map based on lowercase field key to conference room properties
                            if (fieldKeyLower === 'id' || fieldKeyLower === 'article_id') {
                                value = room.id;
                            } else if (fieldKeyLower.includes('roomname') || fieldKeyLower === 'name') {
                                value = room.roomName;
                            } else if (fieldKeyLower.includes('meeting') && fieldKeyLower.includes('name')) {
                                value = room.meetingName;
                            } else if (fieldKeyLower.includes('meeting') && fieldKeyLower.includes('time')) {
                                // Combine start and end time for MEETING_TIME field
                                if (room.startTime && room.endTime) {
                                    value = `${room.startTime} - ${room.endTime}`;
                                } else if (room.startTime) {
                                    value = room.startTime;
                                }
                            } else if (fieldKeyLower.includes('start') && fieldKeyLower.includes('time')) {
                                value = room.startTime;
                            } else if (fieldKeyLower.includes('end') && fieldKeyLower.includes('time')) {
                                value = room.endTime;
                            } else if (fieldKeyLower.includes('participant')) {
                                value = room.participants?.join(', ');
                            } else if (fieldKeyLower.includes('hasmeeting') || fieldKeyLower.includes('has_meeting')) {
                                value = room.hasMeeting ? 'true' : 'false';
                            } else if (room.data && room.data[fieldKey] !== undefined) {
                                // Use value from data object
                                value = room.data[fieldKey];
                            } else if ((room as any)[fieldKey] !== undefined) {
                                // Fallback: try exact property name match
                                value = (room as any)[fieldKey];
                            }

                            console.log(`[DEBUG UPDATE] Field '${fieldKey}' -> value:`, value);

                            // Only add if value exists
                            if (value !== undefined && value !== null && value !== '') {
                                articleData[fieldKey] = value;
                            }
                        }
                    });

                    // Apply global field assignments
                    if (solumMappingConfig.globalFieldAssignments) {
                        Object.assign(articleData, solumMappingConfig.globalFieldAssignments);
                    }

                    const aimsArticle = {
                        articleId: room.id,
                        articleName: room.roomName || room.id,
                        data: articleData
                    };

                    // Log the complete AIMS POST request
                    console.log('[AIMS POST REQUEST - UPDATE]', {
                        url: `${solumConfig.baseUrl}/common/api/v2/common/articles?company=${solumConfig.companyName}&store=${solumConfig.storeNumber}`,
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${solumToken.substring(0, 20)}...`,
                            'Content-Type': 'application/json'
                        },
                        body: [aimsArticle]
                    });

                    await solumService.pushArticles(
                        solumConfig,
                        solumConfig.storeNumber,
                        solumToken,
                        [aimsArticle]
                    );
                    logger.info('ConferenceController', 'Article updated in AIMS successfully', { id });
                } catch (error) {
                    logger.error('ConferenceController', 'Failed to update article in AIMS', { error });
                    throw new Error(`Failed to update in AIMS: ${error}`);
                }
            }

            // Update in store
            updateInStore(id, updatedRoom);

            // Refresh from AIMS to get the latest state
            if (solumConfig && solumMappingConfig && solumToken) {
                try {
                    await fetchFromSolum();
                    logger.info('ConferenceController', 'Refreshed from AIMS after update');
                } catch (error) {
                    logger.warn('ConferenceController', 'Failed to refresh from AIMS after update', { error });
                }
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

            // Delete from AIMS if using SoluM mode
            if (solumConfig && solumMappingConfig && solumToken) {
                try {
                    logger.info('ConferenceController', 'Deleting article from AIMS', { id });
                    await solumService.deleteArticles(
                        solumConfig,
                        solumConfig.storeNumber,
                        solumToken,
                        [id]  // Delete this conference room article
                    );
                    logger.info('ConferenceController', 'Article deleted from AIMS successfully', { id });
                } catch (error) {
                    logger.error('ConferenceController', 'Failed to delete article from AIMS', { error });
                    throw new Error(`Failed to delete from AIMS: ${error}`);
                }
            }

            // Delete from store
            deleteFromStore(id);

            // Refresh from AIMS to get the latest state
            if (solumConfig && solumMappingConfig && solumToken) {
                try {
                    await fetchFromSolum();
                    logger.info('ConferenceController', 'Refreshed from AIMS after delete');
                } catch (error) {
                    logger.warn('ConferenceController', 'Failed to refresh from AIMS after delete', { error });
                }
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

                // Filter IN articles where articleId starts with 'C' (conference rooms)
                // AIMS returns articleId in camelCase, not the configured field name
                const { uniqueIdField, fields, conferenceMapping, globalFieldAssignments } = solumMappingConfig;
                const conferenceArticles = articles.filter((article: any) => {
                    // Check both the configured uniqueIdField and the standard articleId property
                    const uniqueId = article.articleId || article[uniqueIdField];
                    const idStr = String(uniqueId || '').toUpperCase();
                    console.log('[DEBUG] Checking article:', article.articleId, 'starts with C?', idStr.startsWith('C'));
                    return uniqueId && idStr.startsWith('C');
                });

                // Map articles to ConferenceRoom entities
                const mappedRooms: ConferenceRoom[] = conferenceArticles.map((article: any) => {
                    // AIMS returns articleId and articleName in camelCase
                    const rawId = String(article.articleId || article[uniqueIdField] || '');
                    const id = rawId.toUpperCase().startsWith('C') ? rawId.substring(1) : rawId;

                    console.log('[DEBUG] Mapping article to conference room:', {
                        rawId,
                        mappedId: id,
                        articleName: article.articleName,
                        article
                    });

                    // Apply global field assignments
                    const mergedArticle = {
                        ...article,
                        ...(globalFieldAssignments || {}),
                    };

                    // Parse meeting time (expected format: "START-END", e.g., "09:00-10:30")
                    const meetingTimeRaw = mergedArticle[conferenceMapping.meetingTime] || '';
                    const [startTime, endTime] = String(meetingTimeRaw)
                        .split('-')
                        .map(t => t.trim());

                    // Parse participants (expected format: comma-separated, e.g., "John,Jane,Bob")
                    const participantsRaw = mergedArticle[conferenceMapping.participants] || '';
                    const participants = String(participantsRaw)
                        .split(',')
                        .map(p => p.trim())
                        .filter(p => p.length > 0);

                    // Meeting name
                    const meetingName = mergedArticle[conferenceMapping.meetingName] || '';

                    // Build dynamic data object from visible fields with actual article values
                    const data: Record<string, string> = {};
                    let roomName = article.articleName || id; // Use articleName from AIMS

                    Object.keys(fields).forEach(fieldKey => {
                        const mapping = fields[fieldKey];
                        if (mapping.visible && mergedArticle[fieldKey] !== undefined) {
                            const fieldValue = String(mergedArticle[fieldKey]);
                            data[fieldKey] = fieldValue;

                            // Extract room name from configured field
                            if (fieldKey.toLowerCase().includes('name') || fieldKey.toLowerCase().includes('roomname')) {
                                roomName = fieldValue || roomName;
                            }
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
