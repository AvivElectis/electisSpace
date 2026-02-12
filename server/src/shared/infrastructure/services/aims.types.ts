/**
 * AIMS (SoluM) Type Definitions
 *
 * Shared types for all AIMS API interactions across the server.
 * Replaces loose `any` types with structured interfaces.
 */

// ─── Article Types ──────────────────────────────────────────────────────────

/** Article payload as sent to / received from AIMS */
export interface AimsArticle {
    articleId: string;
    articleName: string;
    nfcUrl: string;
    data: Record<string, string>;
    // AIMS sometimes returns snake_case variants
    article_id?: string;
    article_name?: string;
    // Common extra fields from AIMS responses
    labelCode?: string;
    label_code?: string;
    nfc?: string;
    // AIMS articles may carry arbitrary additional fields (data1..dataN, etc.)
    [key: string]: unknown;
}

// ─── Label Types ────────────────────────────────────────────────────────────

/** Label info returned from AIMS list endpoints */
export interface AimsLabel {
    labelCode: string;
    articleId?: string;
    article_id?: string;
    status?: string;
    type?: string;
    templateName?: string;
    signal?: number;
    battery?: number;
    [key: string]: unknown;
}

/** Label detail with display images */
export interface AimsLabelDetail {
    labelCode?: string;
    displayImageList?: AimsDisplayImage[];
    [key: string]: unknown;
}

/** Display image entry for a label page */
export interface AimsDisplayImage {
    page?: number;
    image?: string;
    [key: string]: unknown;
}

// ─── Store Types ────────────────────────────────────────────────────────────

/** Store info returned from AIMS */
export interface AimsStore {
    code: string;
    name?: string;
    city?: string;
    country?: string;
    labelCount?: number;
    gatewayCount?: number;
    [key: string]: unknown;
}

// ─── Request/Response Types ─────────────────────────────────────────────────

/** Label link/assign request entry */
export interface AimsLinkEntry {
    labelCode: string;
    articleIdList: string[];
    templateName?: string;
}

/** Generic AIMS API response envelope */
export interface AimsApiResponse {
    responseCode?: string;
    responseMessage?: unknown;
    [key: string]: unknown;
}
