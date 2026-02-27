/**
 * Image Labels Domain Types
 */

/** Label type/hardware info from AIMS */
export interface LabelTypeInfo {
    labelCode: string;
    name: string;
    displayWidth: number;
    displayHeight: number;
    totalPage: number;
    colorType: string;      // Descriptive: "TERNARY_RED", "TERNARY_YELLOW", etc.
    resolution: number;
    nfc: boolean;
    color: string;          // Short code for dithering: "bw", "bwr", "bwry", "4c", "6c"
}

/** Fit mode for resizing images to label dimensions */
export type FitMode = 'cover' | 'contain' | 'fill';
