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

/** Article info from the config/article/info endpoint (includes assignedLabel) */
export interface AimsArticleInfo {
    store: string;
    articleId: string;
    articleName: string;
    nfcUrl?: string;
    data?: Record<string, string>;
    generateDate?: string;
    lastModified?: string;
    assignedLabel: string[];
    [key: string]: unknown;
}

// ─── Label Types ────────────────────────────────────────────────────────────

/** Label info returned from AIMS list endpoints */
export interface AimsLabel {
    labelCode: string;
    articleId?: string;
    article_id?: string;
    articleList?: Array<{ articleId: string; articleName?: string }>;
    articleName?: string;
    status?: string;
    type?: string;
    templateName?: string;
    signal?: number;
    signalQuality?: string;
    battery?: number | string;
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

// ─── Label Type Info ────────────────────────────────────────────────────────

/** Label type/hardware info from AIMS type info endpoint */
export interface AimsLabelTypeInfo {
    labelCode: string;
    name: string;
    displayWidth: number;
    displayHeight: number;
    totalPage: number;
    colorType: string;      // Descriptive: "TERNARY_RED", "TERNARY_YELLOW", "BINARY", etc.
    resolution: number;     // DPI
    nfc: boolean;
    color: string;          // Short code: "bw", "bwr", "bwry", "4c", "6c"
}

// ─── Image Push Types ──────────────────────────────────────────────────────

/** Request to push an image to a label via AIMS */
export interface AimsImagePushRequest {
    labelCode: string;
    page: number;           // integer (1-based)
    frontPage: number;      // integer (1-based)
    image: string;          // base64 PNG
    dithering?: boolean;    // AIMS server-side dithering
    optAlgType?: number;    // dithering algorithm (default 1)
}

/** Request for AIMS dither preview */
export interface AimsDitherPreviewRequest {
    image: string;          // base64 PNG
    optAlgType?: number;
}

// ─── Label Action Types ────────────────────────────────────────────────────

/** LED control request for a label */
export interface AimsLedControl {
    labelCode: string;
    color?: string;
    mode?: string;
}

/** NFC configuration request for a label */
export interface AimsNfcConfig {
    labelCode: string;
    nfcUrl: string;
}

// ─── Response Types ────────────────────────────────────────────────────────

/** Generic AIMS API response envelope */
export interface AimsApiResponse {
    responseCode?: string;
    responseMessage?: unknown;
    [key: string]: unknown;
}

// ─── Gateway Types ──────────────────────────────────────────────────────────

/** Gateway info from AIMS list endpoint */
export interface AimsGateway {
    gatewayId?: string;
    mac?: string;
    macAddress?: string;
    ip?: string;
    ipAddress?: string;
    model?: string;
    status?: string;
    firmwareVersion?: string;
    connectedLabelCount?: number;
    lastConnectedAt?: string;
    [key: string]: unknown;
}

/** Gateway detail from AIMS detail endpoint */
export interface AimsGatewayDetail extends AimsGateway {
    serialNumber?: string;
    networkType?: string;
    apName?: string;
    channel?: number;
    txPower?: number;
    temperature?: number;
    uptime?: number;
    [key: string]: unknown;
}

/** Gateway debug report */
export interface AimsGatewayDebugReport {
    gateway?: string;
    status?: string;
    debugInfo?: Record<string, unknown>;
    [key: string]: unknown;
}

// ─── Label History Types ────────────────────────────────────────────────────

/** Label status history entry */
export interface AimsLabelStatusHistoryEntry {
    labelCode?: string;
    status?: string;
    timestamp?: string;
    gateway?: string;
    signal?: number;
    battery?: number | string;
    [key: string]: unknown;
}

/** Label status history response */
export interface AimsLabelStatusHistory {
    content?: AimsLabelStatusHistoryEntry[];
    totalElements?: number;
    totalPages?: number;
    [key: string]: unknown;
}

// ─── Batch / Article History Types ──────────────────────────────────────────

/** Batch history entry */
export interface AimsBatchHistoryEntry {
    batchName?: string;
    timestamp?: string;
    totalArticles?: number;
    successCount?: number;
    failCount?: number;
    status?: string;
    [key: string]: unknown;
}

/** Batch history response */
export interface AimsBatchHistory {
    content?: AimsBatchHistoryEntry[];
    totalElements?: number;
    totalPages?: number;
    [key: string]: unknown;
}

/** Batch detail with per-label status */
export interface AimsBatchDetail {
    batchName?: string;
    labels?: Array<{
        labelCode?: string;
        articleId?: string;
        status?: string;
        timestamp?: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}

/** Batch validation errors */
export interface AimsBatchErrors {
    errors?: Array<{
        articleId?: string;
        errorMessage?: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}

/** Article update history */
export interface AimsArticleUpdateHistory {
    content?: Array<{
        articleId?: string;
        updateTime?: string;
        status?: string;
        labelCode?: string;
        [key: string]: unknown;
    }>;
    totalElements?: number;
    totalPages?: number;
    [key: string]: unknown;
}

// ─── Summary / Overview Types ──────────────────────────────────────────────

/** Store summary from AIMS /common/api/v2/common/store/summary endpoint */
export interface AimsStoreSummary {
    company?: string;
    store?: string;
    storeName?: string;
    // Label counts
    totalLabelCount: number;
    onlineLabelCount: number;
    offlineLabelCount: number;
    // Label update status
    updatedLabelCount: number;
    inProgressLabelCount: number;
    notUpdatedLabelCount: number;
    totalUpdatedLabelCount: number;
    // Battery health
    goodBatteryCount: number;
    lowBatteryCount: number;
    // Signal distribution
    excellentSignalLabelCount: number;
    goodSignalLabelCount: number;
    badSignalLabelCount: number;
    // Gateway counts
    onlineGwCount: number;
    offlineGwCount: number;
    // Product counts
    totalAssignedProductCount?: number;
    totalProductCount?: number;
    [key: string]: unknown;
}

/** Label status summary (success/processing/timeout/online/offline counts) */
export interface AimsLabelStatusSummary {
    totalLabels: number;
    successCount: number;
    processingCount: number;
    timeoutCount: number;
    onlineCount: number;
    offlineCount: number;
    [key: string]: unknown;
}

/** Gateway status summary — per-gateway endpoint (requires gateway MAC + date range) */
export interface AimsGatewayStatusSummary {
    totalGateways: number;
    connectedCount: number;
    disconnectedCount: number;
    [key: string]: unknown;
}

/** Label model/type count from AIMS */
export interface AimsLabelModel {
    labelType: string;
    count: number;
    [key: string]: unknown;
}
