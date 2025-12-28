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
                    console.log('[DEBUG] Conference Mapping:', solumMappingConfig.conferenceMapping);

                    // First: Map conference-specific fields using conferenceMapping (regardless of visibility)
                    const { conferenceMapping } = solumMappingConfig;

                    // Map meeting name
                    if (conferenceMapping.meetingName && finalRoom.meetingName) {
                        articleData[conferenceMapping.meetingName] = finalRoom.meetingName;
                        console.log(`[DEBUG] Mapped meetingName -> ${conferenceMapping.meetingName}:`, finalRoom.meetingName);
                    }

                    // Map meeting time (combine start and end)
                    if (conferenceMapping.meetingTime) {
                        if (finalRoom.startTime && finalRoom.endTime) {
                            articleData[conferenceMapping.meetingTime] = `${finalRoom.startTime} - ${finalRoom.endTime}`;
                            console.log(`[DEBUG] Mapped meetingTime -> ${conferenceMapping.meetingTime}:`, articleData[conferenceMapping.meetingTime]);
                        } else if (finalRoom.startTime) {
                            articleData[conferenceMapping.meetingTime] = finalRoom.startTime;
                            console.log(`[DEBUG] Mapped meetingTime -> ${conferenceMapping.meetingTime}:`, finalRoom.startTime);
                        }
                    }

                    // Map participants
                    if (conferenceMapping.participants && finalRoom.participants?.length > 0) {
                        articleData[conferenceMapping.participants] = finalRoom.participants.join(', ');
                        console.log(`[DEBUG] Mapped participants -> ${conferenceMapping.participants}:`, articleData[conferenceMapping.participants]);
                    }

                    // Second: Map other visible fields from config
                    Object.entries(solumMappingConfig.fields).forEach(([fieldKey, fieldConfig]) => {
                        if (fieldConfig.visible) {
                            // Skip if already mapped by conferenceMapping
                            if (articleData[fieldKey] !== undefined) {
                                return;
                            }

                            let value: any = undefined;
                            const fieldKeyLower = fieldKey.toLowerCase();

                            if (fieldKeyLower === 'id' || fieldKeyLower === 'article_id') {
                                value = finalRoom.id;
                            } else if (fieldKeyLower.includes('roomname') || fieldKeyLower === 'name') {
                                value = finalRoom.roomName;
                            } else if (finalRoom.data && finalRoom.data[fieldKey] !== undefined) {
                                value = finalRoom.data[fieldKey];
                            } else if ((finalRoom as any)[fieldKey] !== undefined) {
                                value = (finalRoom as any)[fieldKey];
                            }

                            console.log(`[DEBUG] Field '${fieldKey}' -> value:`, value);

                            if (value !== undefined && value !== null && value !== '') {
                                articleData[fieldKey] = value;
                            }
                        }
                    });

                    // Apply global field assignments from mapping config
                    if (solumMappingConfig.globalFieldAssignments) {
                        Object.assign(articleData, solumMappingConfig.globalFieldAssignments);
                    }

                    // AIMS API structure: root-level articleId/articleName always use these names
                    // Mapped field names only apply to the data object
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
                    console.log('[DEBUG UPDATE] Conference Mapping:', solumMappingConfig.conferenceMapping);

                    // First: Map conference-specific fields using conferenceMapping (regardless of visibility)
                    const { conferenceMapping } = solumMappingConfig;

                    // Map meeting name
                    if (conferenceMapping.meetingName && room.meetingName) {
                        articleData[conferenceMapping.meetingName] = room.meetingName;
                        console.log(`[DEBUG UPDATE] Mapped meetingName -> ${conferenceMapping.meetingName}:`, room.meetingName);
                    }

                    // Map meeting time (combine start and end)
                    if (conferenceMapping.meetingTime) {
                        if (room.startTime && room.endTime) {
                            articleData[conferenceMapping.meetingTime] = `${room.startTime} - ${room.endTime}`;
                            console.log(`[DEBUG UPDATE] Mapped meetingTime -> ${conferenceMapping.meetingTime}:`, articleData[conferenceMapping.meetingTime]);
                        } else if (room.startTime) {
                            articleData[conferenceMapping.meetingTime] = room.startTime;
                            console.log(`[DEBUG UPDATE] Mapped meetingTime -> ${conferenceMapping.meetingTime}:`, room.startTime);
                        }
                    }

                    // Map participants
                    if (conferenceMapping.participants && room.participants?.length > 0) {
                        articleData[conferenceMapping.participants] = room.participants.join(', ');
                        console.log(`[DEBUG UPDATE] Mapped participants -> ${conferenceMapping.participants}:`, articleData[conferenceMapping.participants]);
                    }

                    // Second: Map other visible fields from config
                    Object.entries(solumMappingConfig.fields).forEach(([fieldKey, fieldConfig]) => {
                        if (fieldConfig.visible) {
                            // Skip if already mapped by conferenceMapping
                            if (articleData[fieldKey] !== undefined) {
                                return;
                            }

                            let value: any = undefined;
                            const fieldKeyLower = fieldKey.toLowerCase();

                            if (fieldKeyLower === 'id' || fieldKeyLower === 'article_id') {
                                value = room.id;
                            } else if (fieldKeyLower.includes('roomname') || fieldKeyLower === 'name') {
                                value = room.roomName;
                            } else if (room.data && room.data[fieldKey] !== undefined) {
                                value = room.data[fieldKey];
                            } else if ((room as any)[fieldKey] !== undefined) {
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

                    // AIMS API structure: root-level articleId/articleName always use these names
                    // Mapped field names only apply to the data object
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

                    // Parse meeting fields from conferenceMapping
                    // Note: The detailed API returns fields inside article.data object
                    const articleData = mergedArticle.data || {};
                    const meetingNameField = conferenceMapping.meetingName;
                    const meetingTimeField = conferenceMapping.meetingTime;
                    const participantsField = conferenceMapping.participants;

                    // Get meeting name from data object
                    const meetingName = articleData[meetingNameField] || '';

                    // Parse meeting time (expected format: "START - END", e.g., "09:00 - 15:00")
                    const meetingTimeRaw = articleData[meetingTimeField] || '';
                    const [startTime, endTime] = String(meetingTimeRaw)
                        .split('-')
                        .map(t => t.trim());

                    // Parse participants (expected format: comma-separated, e.g., "John, Jane, Bob")
                    const participantsRaw = articleData[participantsField] || '';
                    const participants = String(participantsRaw)
                        .split(',')
                        .map(p => p.trim())
                        .filter(p => p.length > 0);

                    console.log('[DEBUG FETCH] Parsed meeting data:', {
                        meetingName,
                        startTime,
                        endTime,
                        participants,
                        rawMeetingTime: meetingTimeRaw,
                        rawParticipants: participantsRaw
                    });

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
