/**
 * Client-side dithering for ESL label preview.
 *
 * Multiple algorithms convert a full-color resized image into the label's
 * native color palette. This gives users an instant preview without an
 * AIMS round-trip.
 *
 * AIMS colorType values: bw, bwr, 4c, bwry, 6c
 *
 * Engines:
 *   - Floyd-Steinberg: classic error diffusion (natural, organic look)
 *   - Atkinson:        sharper error diffusion, diffuses 75% of error
 *   - Ordered:         Bayer 4x4 threshold matrix, deterministic pattern
 *   - Threshold:       simple nearest-color, no dithering pattern
 */

import type { DitherEngine } from './imageTypes';

type RGB = [number, number, number];

/**
 * Color palettes for AIMS label colorType values.
 *
 * AIMS reports: bw (black/white), bwr (black/white/red),
 * 4c / bwry (black/white/red/yellow), 6c (6-color e-ink).
 */
const PALETTE_BW: RGB[] = [
    [0, 0, 0],       // black
    [255, 255, 255],  // white
];

const PALETTE_BWR: RGB[] = [
    [0, 0, 0],       // black
    [255, 255, 255],  // white
    [255, 0, 0],     // red
];

const PALETTE_BWRY: RGB[] = [
    [0, 0, 0],       // black
    [255, 255, 255],  // white
    [255, 0, 0],     // red
    [255, 255, 0],   // yellow
];

const PALETTE_6C: RGB[] = [
    [0, 0, 0],       // black
    [255, 255, 255],  // white
    [255, 0, 0],     // red
    [255, 255, 0],   // yellow
    [0, 128, 0],     // green
    [0, 0, 255],     // blue
];

/**
 * Resolve AIMS color/colorType string to the matching palette.
 *
 * AIMS responses have two fields:
 *   - color:     "BW", "BWR", "BWYR"  (palette description)
 *   - colorType: "BIT1", "BIT2_BWR", "BIT2_4C", etc.  (technical ID)
 *
 * We normalise by sorting the letters so both "BWRY" and "BWYR" match.
 */
function getPalette(colorType: string): RGB[] {
    const key = colorType.toLowerCase().trim();

    // Exact matches (covers color field values + shorthand)
    if (key === 'bw') return PALETTE_BW;
    if (key === 'bwr') return PALETTE_BWR;
    if (key === '4c') return PALETTE_BWRY;
    if (key === '6c') return PALETTE_6C;

    // Sort letters so "bwyr" and "bwry" both become "brwy"
    const sorted = key.split('').sort().join('');
    if (sorted === 'brwy') return PALETTE_BWRY;
    if (sorted === 'brw')  return PALETTE_BWR;

    // Fallback: keyword matching for colorType values (BIT2_4C, etc.)
    if (key.includes('6c') || key.includes('6_c')) return PALETTE_6C;
    if (key.includes('4c') || key.includes('4_c')) return PALETTE_BWRY;
    if (key.includes('bwr') || key.includes('red')) return PALETTE_BWR;
    if (key.includes('yellow')) return PALETTE_BWRY;

    return PALETTE_BW;
}

/** Squared Euclidean distance between two RGB colors */
function colorDistanceSq(a: RGB, b: RGB): number {
    const dr = a[0] - b[0];
    const dg = a[1] - b[1];
    const db = a[2] - b[2];
    return dr * dr + dg * dg + db * db;
}

/** Find the nearest palette color to a given pixel */
function findNearest(pixel: RGB, palette: RGB[]): RGB {
    let minDist = Infinity;
    let nearest = palette[0];
    for (const color of palette) {
        const dist = colorDistanceSq(pixel, color);
        if (dist < minDist) {
            minDist = dist;
            nearest = color;
        }
    }
    return nearest;
}

// ── Shared helpers ──────────────────────────────────────────────────────

/** Read canvas pixels into a Float32Array (RGB, no alpha) and resolve the palette. */
function initPixelBuffer(sourceCanvas: HTMLCanvasElement, colorType: string) {
    const { width, height } = sourceCanvas;
    if (!width || !height) {
        throw new Error(`Cannot dither canvas with dimensions ${width}×${height}`);
    }

    const ctx = sourceCanvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, width, height);
    const src = imageData.data;

    const pixels = new Float32Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        pixels[i * 3]     = src[i * 4];
        pixels[i * 3 + 1] = src[i * 4 + 1];
        pixels[i * 3 + 2] = src[i * 4 + 2];
    }

    return { width, height, pixels, palette: getPalette(colorType) };
}

/** Write a Float32Array (RGB) back to a new canvas. */
function pixelBufferToCanvas(width: number, height: number, pixels: Float32Array): HTMLCanvasElement {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d')!;
    const outData = outCtx.createImageData(width, height);

    for (let i = 0; i < width * height; i++) {
        outData.data[i * 4]     = pixels[i * 3];
        outData.data[i * 4 + 1] = pixels[i * 3 + 1];
        outData.data[i * 4 + 2] = pixels[i * 3 + 2];
        outData.data[i * 4 + 3] = 255; // fully opaque
    }

    outCtx.putImageData(outData, 0, 0);
    return outCanvas;
}

/** Clamp a value to [0, 255] */
function clamp(v: number): number {
    return v < 0 ? 0 : v > 255 ? 255 : v;
}

// ── Algorithms ──────────────────────────────────────────────────────────

/**
 * Floyd-Steinberg error-diffusion dithering.
 * Distributes 100% of quantisation error to 4 neighbors (7/16, 3/16, 5/16, 1/16).
 */
function ditherFloydSteinberg(sourceCanvas: HTMLCanvasElement, colorType: string): HTMLCanvasElement {
    const { width, height, pixels, palette } = initPixelBuffer(sourceCanvas, colorType);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 3;

            const oldR = clamp(pixels[idx]);
            const oldG = clamp(pixels[idx + 1]);
            const oldB = clamp(pixels[idx + 2]);

            const newPixel = findNearest([oldR, oldG, oldB], palette);

            pixels[idx]     = newPixel[0];
            pixels[idx + 1] = newPixel[1];
            pixels[idx + 2] = newPixel[2];

            const errR = oldR - newPixel[0];
            const errG = oldG - newPixel[1];
            const errB = oldB - newPixel[2];

            if (x + 1 < width) {
                const i = idx + 3;
                pixels[i]     += errR * 7 / 16;
                pixels[i + 1] += errG * 7 / 16;
                pixels[i + 2] += errB * 7 / 16;
            }
            if (y + 1 < height) {
                if (x - 1 >= 0) {
                    const i = ((y + 1) * width + (x - 1)) * 3;
                    pixels[i]     += errR * 3 / 16;
                    pixels[i + 1] += errG * 3 / 16;
                    pixels[i + 2] += errB * 3 / 16;
                }
                {
                    const i = ((y + 1) * width + x) * 3;
                    pixels[i]     += errR * 5 / 16;
                    pixels[i + 1] += errG * 5 / 16;
                    pixels[i + 2] += errB * 5 / 16;
                }
                if (x + 1 < width) {
                    const i = ((y + 1) * width + (x + 1)) * 3;
                    pixels[i]     += errR * 1 / 16;
                    pixels[i + 1] += errG * 1 / 16;
                    pixels[i + 2] += errB * 1 / 16;
                }
            }
        }
    }

    return pixelBufferToCanvas(width, height, pixels);
}

/**
 * Atkinson dithering (Bill Atkinson, original Macintosh).
 * Diffuses only 6/8 (75%) of the error to 6 neighbors (1/8 each).
 * Produces sharper, higher-contrast results than Floyd-Steinberg.
 */
function ditherAtkinson(sourceCanvas: HTMLCanvasElement, colorType: string): HTMLCanvasElement {
    const { width, height, pixels, palette } = initPixelBuffer(sourceCanvas, colorType);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 3;

            const oldR = clamp(pixels[idx]);
            const oldG = clamp(pixels[idx + 1]);
            const oldB = clamp(pixels[idx + 2]);

            const newPixel = findNearest([oldR, oldG, oldB], palette);

            pixels[idx]     = newPixel[0];
            pixels[idx + 1] = newPixel[1];
            pixels[idx + 2] = newPixel[2];

            // Atkinson distributes 1/8 of error to each of 6 neighbors (total: 6/8 = 75%)
            const fracR = (oldR - newPixel[0]) / 8;
            const fracG = (oldG - newPixel[1]) / 8;
            const fracB = (oldB - newPixel[2]) / 8;

            // Right (+1,0)
            if (x + 1 < width) {
                const i = idx + 3;
                pixels[i] += fracR; pixels[i + 1] += fracG; pixels[i + 2] += fracB;
            }
            // Right+2 (+2,0)
            if (x + 2 < width) {
                const i = idx + 6;
                pixels[i] += fracR; pixels[i + 1] += fracG; pixels[i + 2] += fracB;
            }
            if (y + 1 < height) {
                // Below-left (-1,+1)
                if (x - 1 >= 0) {
                    const i = ((y + 1) * width + (x - 1)) * 3;
                    pixels[i] += fracR; pixels[i + 1] += fracG; pixels[i + 2] += fracB;
                }
                // Below (0,+1)
                {
                    const i = ((y + 1) * width + x) * 3;
                    pixels[i] += fracR; pixels[i + 1] += fracG; pixels[i + 2] += fracB;
                }
                // Below-right (+1,+1)
                if (x + 1 < width) {
                    const i = ((y + 1) * width + (x + 1)) * 3;
                    pixels[i] += fracR; pixels[i + 1] += fracG; pixels[i + 2] += fracB;
                }
            }
            // Two rows below (0,+2)
            if (y + 2 < height) {
                const i = ((y + 2) * width + x) * 3;
                pixels[i] += fracR; pixels[i + 1] += fracG; pixels[i + 2] += fracB;
            }
        }
    }

    return pixelBufferToCanvas(width, height, pixels);
}

/**
 * Ordered dithering using a Bayer 4x4 threshold matrix.
 * No error propagation — deterministic crosshatch pattern.
 * Cleaner for text and graphics.
 */
// prettier-ignore
const BAYER_4X4 = [
     0,  8,  2, 10,
    12,  4, 14,  6,
     3, 11,  1,  9,
    15,  7, 13,  5,
];

function ditherOrdered(sourceCanvas: HTMLCanvasElement, colorType: string): HTMLCanvasElement {
    const { width, height, pixels, palette } = initPixelBuffer(sourceCanvas, colorType);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 3;
            const threshold = (BAYER_4X4[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 64;

            const r = clamp(pixels[idx]     + threshold);
            const g = clamp(pixels[idx + 1] + threshold);
            const b = clamp(pixels[idx + 2] + threshold);

            const newPixel = findNearest([r, g, b], palette);
            pixels[idx]     = newPixel[0];
            pixels[idx + 1] = newPixel[1];
            pixels[idx + 2] = newPixel[2];
        }
    }

    return pixelBufferToCanvas(width, height, pixels);
}

/**
 * Simple threshold (nearest-color) quantisation.
 * No dithering pattern — sharpest but loses all gradients.
 */
function ditherThreshold(sourceCanvas: HTMLCanvasElement, colorType: string): HTMLCanvasElement {
    const { width, height, pixels, palette } = initPixelBuffer(sourceCanvas, colorType);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 3;
            const newPixel = findNearest(
                [pixels[idx], pixels[idx + 1], pixels[idx + 2]],
                palette,
            );
            pixels[idx]     = newPixel[0];
            pixels[idx + 1] = newPixel[1];
            pixels[idx + 2] = newPixel[2];
        }
    }

    return pixelBufferToCanvas(width, height, pixels);
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Apply Floyd-Steinberg error-diffusion dithering to a canvas.
 * Kept for backward compatibility — delegates to ditherFloydSteinberg.
 */
export function ditherImage(
    sourceCanvas: HTMLCanvasElement,
    colorType: string,
): HTMLCanvasElement {
    return ditherFloydSteinberg(sourceCanvas, colorType);
}

/**
 * Apply client-side dithering using the specified engine.
 * Dispatches to the appropriate algorithm based on the engine parameter.
 */
export function applyClientDither(
    sourceCanvas: HTMLCanvasElement,
    colorType: string,
    engine: Exclude<DitherEngine, 'aims'>,
): HTMLCanvasElement {
    switch (engine) {
        case 'floyd-steinberg': return ditherFloydSteinberg(sourceCanvas, colorType);
        case 'atkinson':        return ditherAtkinson(sourceCanvas, colorType);
        case 'ordered':         return ditherOrdered(sourceCanvas, colorType);
        case 'threshold':       return ditherThreshold(sourceCanvas, colorType);
    }
}
