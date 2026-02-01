/**
 * Labels Management Domain Types
 */

/**
 * Label information from AIMS
 */
export interface Label {
    labelCode: string;
    labelMac?: string;
    gatewayMac?: string;
    firmwareVersion?: string;
    signal?: 'EXCELLENT' | 'GOOD' | 'NORMAL' | 'BAD';
    battery?: 'GOOD' | 'LOW' | 'CRITICAL';
    networkStatus?: string;
    status?: string;
    labelType?: string;
    articleList?: LinkedArticle[];
}

/**
 * Article linked to a label
 */
export interface LinkedArticle {
    articleId: string;
    articleName?: string;
    templateName?: string;
}

/**
 * Label-Article link for display
 */
export interface LabelArticleLink {
    labelCode: string;
    articleId: string;
    articleName?: string;
    signal?: string;
    battery?: string;
    status?: string;
    templateName?: string;
}

/**
 * Request to link a label to an article
 */
export interface LinkLabelRequest {
    labelCode: string;
    articleId: string;
    templateName?: string;
}

/**
 * Scan input types
 */
export type ScanInputType = 'manual' | 'camera' | 'scanner';

/**
 * Scanner state
 */
export interface ScannerState {
    isScanning: boolean;
    inputType: ScanInputType;
    lastScannedValue?: string;
    error?: string;
}
