/**
 * Article Builder Service
 *
 * Builds AIMS-compatible article payloads using the company's article format.
 * The article format (fetched from AIMS) defines:
 *  - mappingInfo: which keys map to articleId, articleName, nfcUrl, store
 *  - articleData: the full list of data field keys the company has configured
 *
 * An AIMS article has the structure:
 *   {
 *     articleId: <value>,
 *     articleName: <value>,
 *     nfcUrl: <value>,
 *     data: {
 *       ARTICLE_ID: <same value as articleId>,
 *       ITEM_NAME: <same value as articleName>,
 *       NFC_URL: <same value as nfcUrl>,
 *       ...other fields from entity data, only non-null/non-empty values
 *     }
 *   }
 *
 * The top-level keys (articleId, articleName, nfcUrl) use the generic AIMS keys.
 * The `data` object uses the company's actual column names from mappingInfo.
 */

import type { ArticleFormat, MappingInfo } from './solumService.js';
import type { AimsArticle } from './aims.types.js';

/** Optional compass data to merge into a space article */
export interface CompassArticleData {
    buildingName?: string;
    floorName?: string;
    areaName?: string;
    spaceMode?: string;
    spaceCapacity?: number;
    spaceAmenities?: string;
    spaceType?: string;
    bookingStatus?: string;
    // Current meeting/booking
    currentMeetingName?: string;
    currentMeetingOrganizer?: string;
    currentMeetingStart?: string;
    currentMeetingEnd?: string;
    currentMeetingParticipants?: string;
    // Next 2 meetings (conference rooms)
    next1MeetingName?: string;
    next1MeetingOrganizer?: string;
    next1MeetingStart?: string;
    next1MeetingEnd?: string;
    next1MeetingParticipants?: string;
    next2MeetingName?: string;
    next2MeetingOrganizer?: string;
    next2MeetingStart?: string;
    next2MeetingEnd?: string;
    next2MeetingParticipants?: string;
}

/** Data for next meetings on conference room articles */
export interface NextMeetingData {
    meetingName: string;
    organizer?: string;
    startTime: string;
    endTime: string;
    participants: string[];
}

/**
 * Build an AIMS article for a Space entity.
 * articleId = space.externalId
 * articleName = looked up from space.data using mappingInfo.articleName key
 */
export function buildSpaceArticle(
    space: { externalId: string; data: any },
    format: ArticleFormat | null,
    compassData?: CompassArticleData,
): AimsArticle {
    const data = { ...(space.data ?? {}) } as Record<string, any>;
    const mapping = format?.mappingInfo;

    // Merge compass fields into data if provided
    if (compassData) {
        if (compassData.buildingName) data['BUILDING_NAME'] = compassData.buildingName;
        if (compassData.floorName) data['FLOOR_NAME'] = compassData.floorName;
        if (compassData.areaName) data['AREA_NAME'] = compassData.areaName;
        if (compassData.spaceMode) data['SPACE_MODE'] = compassData.spaceMode;
        if (compassData.spaceCapacity !== undefined) data['SPACE_CAPACITY'] = String(compassData.spaceCapacity);
        if (compassData.spaceAmenities) data['SPACE_AMENITIES'] = compassData.spaceAmenities;
        if (compassData.spaceType) data['SPACE_TYPE'] = compassData.spaceType;
        if (compassData.bookingStatus) data['BOOKING_STATUS'] = compassData.bookingStatus;
        // Current meeting
        if (compassData.currentMeetingName) data['CURRENT_MEETING_NAME'] = compassData.currentMeetingName;
        if (compassData.currentMeetingOrganizer) data['CURRENT_MEETING_ORGANIZER'] = compassData.currentMeetingOrganizer;
        if (compassData.currentMeetingStart) data['CURRENT_MEETING_START'] = compassData.currentMeetingStart;
        if (compassData.currentMeetingEnd) data['CURRENT_MEETING_END'] = compassData.currentMeetingEnd;
        if (compassData.currentMeetingParticipants) data['CURRENT_MEETING_PARTICIPANTS'] = compassData.currentMeetingParticipants;
        // Next meetings
        if (compassData.next1MeetingName) data['NEXT1_MEETING_NAME'] = compassData.next1MeetingName;
        if (compassData.next1MeetingOrganizer) data['NEXT1_MEETING_ORGANIZER'] = compassData.next1MeetingOrganizer;
        if (compassData.next1MeetingStart) data['NEXT1_MEETING_START'] = compassData.next1MeetingStart;
        if (compassData.next1MeetingEnd) data['NEXT1_MEETING_END'] = compassData.next1MeetingEnd;
        if (compassData.next1MeetingParticipants) data['NEXT1_MEETING_PARTICIPANTS'] = compassData.next1MeetingParticipants;
        if (compassData.next2MeetingName) data['NEXT2_MEETING_NAME'] = compassData.next2MeetingName;
        if (compassData.next2MeetingOrganizer) data['NEXT2_MEETING_ORGANIZER'] = compassData.next2MeetingOrganizer;
        if (compassData.next2MeetingStart) data['NEXT2_MEETING_START'] = compassData.next2MeetingStart;
        if (compassData.next2MeetingEnd) data['NEXT2_MEETING_END'] = compassData.next2MeetingEnd;
        if (compassData.next2MeetingParticipants) data['NEXT2_MEETING_PARTICIPANTS'] = compassData.next2MeetingParticipants;
    }

    // Determine articleName: use the key from mappingInfo (e.g., ITEM_NAME)
    const nameKey = mapping?.articleName; // e.g., "ITEM_NAME"
    const articleName = (nameKey && data[nameKey]) ? String(data[nameKey]) : space.externalId;

    // Determine nfcUrl key
    const nfcKey = mapping?.nfcUrl; // e.g., "NFC_URL"
    const nfcUrl = (nfcKey && data[nfcKey]) ? String(data[nfcKey]) : '';

    return buildArticle(space.externalId, articleName, nfcUrl, data, format);
}

/**
 * Build an AIMS article for a Person entity.
 * articleId = person.assignedSpaceId (the physical space slot)
 * articleName = looked up from person.data using mappingInfo.articleName key
 */
export function buildPersonArticle(
    person: { assignedSpaceId: string | null; data: any },
    format: ArticleFormat | null,
    globalFieldAssignments?: Record<string, string>,
): AimsArticle | null {
    if (!person.assignedSpaceId) return null;

    // Merge global field assignments as DEFAULTS, then overlay person data.
    // Person-specific values (e.g., ITEM_NAME) must never be overwritten by globals.
    const data = { ...(globalFieldAssignments ?? {}), ...(person.data ?? {}) } as Record<string, any>;
    const mapping = format?.mappingInfo;

    const nameKey = mapping?.articleName;
    const articleName = (nameKey && data[nameKey]) ? String(data[nameKey]) : (data.name || data.NAME || '');

    const nfcKey = mapping?.nfcUrl;
    const nfcUrl = (nfcKey && data[nfcKey]) ? String(data[nfcKey]) : '';

    return buildArticle(person.assignedSpaceId, articleName, nfcUrl, data, format);
}

/**
 * Build an empty AIMS article for an unoccupied space slot in people mode.
 * articleId = slotId (e.g. "1", "2", ...)
 * All data fields are empty — only the article ID is populated.
 * Used to keep slots visible in AIMS even when no person is assigned.
 */
export function buildEmptySlotArticle(
    slotId: string,
    format: ArticleFormat | null,
): AimsArticle {
    return buildArticle(slotId, '', '', {}, format);
}

/**
 * Conference mapping configuration from company settings.
 * When provided, uses the company's configured AIMS field names.
 */
export interface ConferenceMappingConfig {
    meetingName: string;   // AIMS field key for meeting name
    meetingTime: string;   // AIMS field key for meeting time ("START - END" format)
    participants: string;  // AIMS field key for participants (comma-separated)
}

/**
 * Build an AIMS article for a ConferenceRoom entity.
 * articleId = "C" + room.externalId
 * 
 * Uses the company's conferenceMapping (from settings.solumMappingConfig.conferenceMapping)
 * to map meeting fields to the correct AIMS field names.
 * Falls back to hardcoded data1-data5 if no mapping is provided.
 */
export function buildConferenceArticle(
    room: {
        externalId: string;
        roomName: string | null;
        hasMeeting: boolean;
        meetingName: string | null;
        startTime: string | null;
        endTime: string | null;
        participants: string[];
    },
    format: ArticleFormat | null,
    conferenceMapping?: ConferenceMappingConfig | null,
    nextMeetings?: NextMeetingData[],
): AimsArticle {
    const articleId = `C${room.externalId}`;
    const articleName = room.roomName || `Conference ${room.externalId}`;

    const conferenceData: Record<string, any> = {};

    // Compass format: use standardized CURRENT_MEETING_* and NEXT*_MEETING_* fields
    if (isCompassFormat(format)) {
        conferenceData['BOOKING_STATUS'] = room.hasMeeting ? 'BOOKED' : 'AVAILABLE';
        if (room.meetingName) conferenceData['CURRENT_MEETING_NAME'] = room.meetingName;
        if (room.startTime) conferenceData['CURRENT_MEETING_START'] = room.startTime;
        if (room.endTime) conferenceData['CURRENT_MEETING_END'] = room.endTime;
        if (room.participants?.length > 0) conferenceData['CURRENT_MEETING_PARTICIPANTS'] = room.participants.join(', ');
        // Next meetings
        if (nextMeetings?.[0]) {
            conferenceData['NEXT1_MEETING_NAME'] = nextMeetings[0].meetingName;
            if (nextMeetings[0].organizer) conferenceData['NEXT1_MEETING_ORGANIZER'] = nextMeetings[0].organizer;
            conferenceData['NEXT1_MEETING_START'] = nextMeetings[0].startTime;
            conferenceData['NEXT1_MEETING_END'] = nextMeetings[0].endTime;
            if (nextMeetings[0].participants?.length > 0) conferenceData['NEXT1_MEETING_PARTICIPANTS'] = nextMeetings[0].participants.join(', ');
        }
        if (nextMeetings?.[1]) {
            conferenceData['NEXT2_MEETING_NAME'] = nextMeetings[1].meetingName;
            if (nextMeetings[1].organizer) conferenceData['NEXT2_MEETING_ORGANIZER'] = nextMeetings[1].organizer;
            conferenceData['NEXT2_MEETING_START'] = nextMeetings[1].startTime;
            conferenceData['NEXT2_MEETING_END'] = nextMeetings[1].endTime;
            if (nextMeetings[1].participants?.length > 0) conferenceData['NEXT2_MEETING_PARTICIPANTS'] = nextMeetings[1].participants.join(', ');
        }
    } else if (conferenceMapping && conferenceMapping.meetingName && conferenceMapping.meetingTime && conferenceMapping.participants) {
        // Use configured field names from company settings
        if (room.meetingName) {
            conferenceData[conferenceMapping.meetingName] = room.meetingName;
        }
        // Combine start and end time into "START - END" format
        if (room.startTime && room.endTime) {
            conferenceData[conferenceMapping.meetingTime] = `${room.startTime} - ${room.endTime}`;
        } else if (room.startTime) {
            conferenceData[conferenceMapping.meetingTime] = room.startTime;
        }
        if (room.participants?.length > 0) {
            conferenceData[conferenceMapping.participants] = room.participants.join(', ');
        }
    } else {
        // Fallback: hardcoded field names (legacy/unconfigured)
        conferenceData['data1'] = room.hasMeeting ? 'MEETING' : 'AVAILABLE';
        conferenceData['data2'] = room.meetingName || '';
        conferenceData['data3'] = room.startTime || '';
        conferenceData['data4'] = room.endTime || '';
        conferenceData['data5'] = room.participants?.join(', ') || '';
    }

    return buildArticle(articleId, articleName, '', conferenceData, format);
}

/** Detect compass format by checking for compass-specific fields */
export function isCompassFormat(format: ArticleFormat | null): boolean {
    return !!format?.articleData?.includes('BOOKING_STATUS');
}

// ─── internal ───────────────────────────────────────────────────────────────

/**
 * Core builder: creates the full AIMS article structure.
 *
 * Top-level: { articleId, articleName, nfcUrl }
 * data object: mappingInfo mapped keys + all non-empty entity data fields
 */
function buildArticle(
    articleId: string,
    articleName: string,
    nfcUrl: string,
    entityData: Record<string, any>,
    format: ArticleFormat | null,
): AimsArticle {
    const mapping = format?.mappingInfo;

    // Build the data object
    const dataObj: Record<string, string> = {};

    // 1. Always set the mapped core keys inside data
    if (mapping?.articleId) {
        dataObj[mapping.articleId] = articleId;       // e.g., ARTICLE_ID: "101"
    }
    if (mapping?.articleName) {
        dataObj[mapping.articleName] = articleName;   // e.g., ITEM_NAME: "John Doe"
    }
    if (mapping?.nfcUrl && nfcUrl) {
        dataObj[mapping.nfcUrl] = nfcUrl;            // e.g., NFC_URL: "..."
    }

    // 2. Copy all non-empty values from entity data into the data object.
    //    Skip keys that are internal/private (starting with _) and skip
    //    values that belong to the mappingInfo top-level (store) since
    //    the AIMS API fills that automatically.
    const storeKey = mapping?.store; // e.g., "STORE_ID" — AIMS fills this
    for (const [key, value] of Object.entries(entityData)) {
        if (key.startsWith('_')) continue;
        if (key === storeKey) continue; // AIMS populates Store automatically
        if (value === null || value === undefined || value === '') continue;
        // Don't overwrite mapped core keys already set above
        if (dataObj[key] !== undefined) continue;
        dataObj[key] = String(value);
    }

    return {
        articleId,
        articleName,
        nfcUrl: nfcUrl || '',
        data: dataObj,
    };
}

/**
 * Compare an expected article against what AIMS currently has.
 * Returns true if it needs to be re-pushed.
 *
 * AIMS may return data fields either inside a `data` sub-object
 * (from /config/article/info) or as top-level properties on the
 * article (flat format).  We check both to avoid false positives
 * that would cause unnecessary re-pushes every reconciliation cycle.
 */
export function articleNeedsUpdate(expected: AimsArticle, aims: AimsArticle): boolean {
    // Compare article name
    if ((expected.articleName || '') !== (aims.articleName || aims.article_name || '')) return true;

    // Compare nfcUrl (AIMS returns empty string or undefined for empty)
    if ((expected.nfcUrl || '') !== (aims.nfcUrl ?? '')) return true;

    // Compare data fields
    const eData = expected.data ?? {};
    const aData = aims.data ?? {};
    // AIMS sometimes returns fields flat (top-level) instead of nested in `data`
    const aimsFlat = aims as Record<string, unknown>;
    for (const [key, val] of Object.entries(eData)) {
        const expectedVal = String(val ?? '');
        // Check nested data first, then fall back to top-level flat field
        const aimsVal = String(aData[key] ?? aimsFlat[key] ?? '');
        if (expectedVal !== aimsVal) return true;
    }

    return false;
}
