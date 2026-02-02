/**
 * Labels Management Domain Types
 */

/**
 * Label image information from AIMS
 */
export interface LabelImage {
    index: number;
    state: 'SUCCESS' | 'PROCESSING' | 'TIMEOUT';
    content: string; // URL to the image
    processUpdateTime: string;
    statusUpdateTime: string;
    batchId: string;
    txSequence: string;
}

/**
 * Label images detail response from AIMS
 */
export interface LabelImagesDetail {
    labelCode: string;
    isDualSidedLabel?: boolean;
    width: number;
    height: number;
    activePage: number;
    previousImage: LabelImage[];
    currentImage: LabelImage[];
    responseCode: string;
    responseMessage: string;
    latestBatchInfo?: {
        txSequence: string;
        type: string;
        batchEventTime: string;
    };
}

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
