import type { ConferenceRoom } from '@shared/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';

/**
 * Conference Transformers
 * Utility functions for transforming conference room data to/from AIMS article format
 */

/**
 * Transform a conference room to AIMS article format for push/update
 */
export function transformConferenceRoomToArticle(
    room: ConferenceRoom,
    solumMappingConfig: SolumMappingConfig
): { aimsArticle: any; articleData: Record<string, any> } {
    const articleData: Record<string, any> = {};
    const { conferenceMapping, fields, globalFieldAssignments, mappingInfo } = solumMappingConfig;

    // First: Map conference-specific fields using conferenceMapping (regardless of visibility)
    // Map meeting name
    if (conferenceMapping.meetingName && room.meetingName) {
        articleData[conferenceMapping.meetingName] = room.meetingName;
    }

    // Map meeting time (combine start and end)
    if (conferenceMapping.meetingTime) {
        if (room.startTime && room.endTime) {
            articleData[conferenceMapping.meetingTime] = `${room.startTime} - ${room.endTime}`;
        } else if (room.startTime) {
            articleData[conferenceMapping.meetingTime] = room.startTime;
        }
    }

    // Map participants
    if (conferenceMapping.participants && room.participants?.length > 0) {
        articleData[conferenceMapping.participants] = room.participants.join(', ');
    }

    // Second: Map other visible fields from config
    Object.entries(fields).forEach(([fieldKey, fieldConfig]) => {
        if (fieldConfig.visible) {
            // Skip if already mapped by conferenceMapping
            if (articleData[fieldKey] !== undefined) {
                return;
            }

            let value: any = undefined;
            const fieldKeyLower = fieldKey.toLowerCase();

            if (fieldKeyLower === 'id' || fieldKeyLower === 'article_id') {
                value = room.id;
            } else if (room.data && room.data[fieldKey] !== undefined) {
                value = room.data[fieldKey];
            } else if ((room as any)[fieldKey] !== undefined) {
                value = (room as any)[fieldKey];
            }

            if (value !== undefined && value !== null && value !== '') {
                articleData[fieldKey] = value;
            }
        }
    });

    // Apply global field assignments from mapping config
    if (globalFieldAssignments) {
        Object.assign(articleData, globalFieldAssignments);
    }

    // Add articleId and articleName to articleData using their mapped field keys
    if (mappingInfo) {
        // Add articleId to data
        if (mappingInfo.articleId && !articleData[mappingInfo.articleId]) {
            articleData[mappingInfo.articleId] = room.id;
        }
        // Add articleName to data
        if (mappingInfo.articleName) {
            const roomName = room.data?.roomName || room.id;
            if (!articleData[mappingInfo.articleName]) {
                articleData[mappingInfo.articleName] = roomName;
            }
        }
    }

    // Build AIMS article dynamically from mappingInfo
    const aimsArticle: any = {
        data: articleData
    };

    // Dynamically map all root-level fields from mappingInfo (articleId, articleName, nfcUrl, etc.)
    if (mappingInfo) {
        Object.entries(mappingInfo).forEach(([rootField, dataField]) => {
            if (!dataField) return;
            
            // Check articleData first
            if (articleData[dataField]) {
                aimsArticle[rootField] = String(articleData[dataField]);
            } 
            // Then check globalFieldAssignments
            else if (globalFieldAssignments?.[dataField]) {
                aimsArticle[rootField] = String(globalFieldAssignments[dataField]);
            }
            // Check room.data
            else if (room.data?.[dataField]) {
                aimsArticle[rootField] = String(room.data[dataField]);
            }
            // Check room properties directly
            else if ((room as any)[dataField] !== undefined) {
                aimsArticle[rootField] = String((room as any)[dataField]);
            }
        });
    }

    // Ensure required fields have defaults
    if (!aimsArticle.articleId) {
        aimsArticle.articleId = room.id;
    }
    if (!aimsArticle.articleName) {
        aimsArticle.articleName = room.data?.roomName || room.id;
    }

    return { aimsArticle, articleData };
}

/**
 * Transform an AIMS article to a ConferenceRoom entity
 */
export function transformArticleToConferenceRoom(
    article: any,
    solumMappingConfig: SolumMappingConfig
): ConferenceRoom {
    const { uniqueIdField, fields, conferenceMapping, globalFieldAssignments } = solumMappingConfig;

    // AIMS returns articleId and articleName in camelCase
    const rawId = String(article.articleId || article[uniqueIdField] || '');
    const id = rawId.toUpperCase().startsWith('C') ? rawId.substring(1) : rawId;

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

    // Build dynamic data object from visible fields with actual article values
    const data: Record<string, string> = {};

    Object.keys(fields).forEach(fieldKey => {
        const mapping = fields[fieldKey];
        if (mapping.visible && mergedArticle[fieldKey] !== undefined) {
            const fieldValue = String(mergedArticle[fieldKey]);
            data[fieldKey] = fieldValue;
        }
    });

    // Set roomName in data if not already present from fields
    if (!data.roomName) {
        data.roomName = article.articleName || id;
    }

    return {
        id,
        hasMeeting: !!meetingName,
        meetingName,
        startTime: startTime || '',
        endTime: endTime || '',
        participants,
        labelCode: article.labelCode,
        data,
        assignedLabels: Array.isArray(article.assignedLabel) ? article.assignedLabel : undefined,
    };
}

/**
 * Filter articles that are conference rooms (ID starts with 'C')
 */
export function filterConferenceArticles(
    articles: any[],
    uniqueIdField: string
): any[] {
    return articles.filter((article: any) => {
        // Check both the configured uniqueIdField and the standard articleId property
        const uniqueId = article.articleId || article[uniqueIdField];
        const idStr = String(uniqueId || '').toUpperCase();
        return uniqueId && idStr.startsWith('C');
    });
}
