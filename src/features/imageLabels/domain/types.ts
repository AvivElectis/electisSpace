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
    colorType: string;
    resolution: number;
    nfc: boolean;
}

/** Fit mode for resizing images to label dimensions */
export type FitMode = 'cover' | 'contain' | 'fill';
