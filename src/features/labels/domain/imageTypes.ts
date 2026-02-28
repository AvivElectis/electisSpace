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

/** Dithering engine for color conversion */
export type DitherEngine = 'floyd-steinberg' | 'atkinson' | 'ordered' | 'threshold' | 'aims';

export interface DitherEngineInfo {
    engine: DitherEngine;
    labelKey: string;       // i18n suffix under imageLabels.dialog.dithering.*
    isServerSide: boolean;
}

export const DITHER_ENGINES: DitherEngineInfo[] = [
    { engine: 'floyd-steinberg', labelKey: 'floydSteinberg', isServerSide: false },
    { engine: 'atkinson',        labelKey: 'atkinson',       isServerSide: false },
    { engine: 'ordered',         labelKey: 'ordered',        isServerSide: false },
    { engine: 'threshold',       labelKey: 'threshold',      isServerSide: false },
    { engine: 'aims',            labelKey: 'aims',           isServerSide: true  },
];

export const DEFAULT_DITHER_ENGINE: DitherEngine = 'floyd-steinberg';
