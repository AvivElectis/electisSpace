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

/**
 * Build an AIMS article for a Space entity.
 * articleId = space.externalId
 * articleName = looked up from space.data using mappingInfo.articleName key
 */
export function buildSpaceArticle(
    space: { externalId: string; data: any },
    format: ArticleFormat | null,
): any {
    const data = (space.data ?? {}) as Record<string, any>;
    const mapping = format?.mappingInfo;

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
): any | null {
    if (!person.assignedSpaceId) return null;

    const data = (person.data ?? {}) as Record<string, any>;
    const mapping = format?.mappingInfo;

    const nameKey = mapping?.articleName;
    const articleName = (nameKey && data[nameKey]) ? String(data[nameKey]) : (data.name || data.NAME || 'Person');

    const nfcKey = mapping?.nfcUrl;
    const nfcUrl = (nfcKey && data[nfcKey]) ? String(data[nfcKey]) : '';

    return buildArticle(person.assignedSpaceId, articleName, nfcUrl, data, format);
}

/**
 * Build an AIMS article for a ConferenceRoom entity.
 * articleId = "C" + room.externalId
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
): any {
    const articleId = `C${room.externalId}`;
    const articleName = room.roomName || `Conference ${room.externalId}`;

    // Conference rooms store their state in specific data fields
    const conferenceData: Record<string, any> = {
        data1: room.hasMeeting ? 'MEETING' : 'AVAILABLE',
        data2: room.meetingName || '',
        data3: room.startTime || '',
        data4: room.endTime || '',
        data5: room.participants?.join(', ') || '',
    };

    return buildArticle(articleId, articleName, '', conferenceData, format);
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
): any {
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
 */
export function articleNeedsUpdate(expected: any, aims: any): boolean {
    // Compare article name
    if ((expected.articleName || '') !== (aims.articleName || aims.article_name || '')) return true;

    // Compare data objects: check every key in expected.data
    const eData = expected.data ?? {};
    const aData = aims.data ?? {};
    for (const [key, val] of Object.entries(eData)) {
        if ((val ?? '') !== (aData[key] ?? '')) return true;
    }

    return false;
}
