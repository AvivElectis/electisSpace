/**
 * Client-side Floyd-Steinberg dithering for ESL label preview.
 *
 * Converts a full-color resized image into the label's native color palette
 * using error-diffusion dithering. Supports BINARY, TERNARY_RED, TERNARY_YELLOW,
 * and FOUR_COLOR label types. This gives users an instant preview without an
 * AIMS round-trip.
 *
 * Note: the actual label still receives server-side AIMS dithering on push —
 * this is a client-only approximation for preview purposes.
 */

type RGB = [number, number, number];

/** Color palettes for known AIMS label color types */
const PALETTE_BINARY: RGB[] = [
    [0, 0, 0],       // black
    [255, 255, 255],  // white
];

const PALETTE_TERNARY_RED: RGB[] = [
    [0, 0, 0],       // black
    [255, 255, 255],  // white
    [255, 0, 0],     // red
];

const PALETTE_TERNARY_YELLOW: RGB[] = [
    [0, 0, 0],       // black
    [255, 255, 255],  // white
    [255, 255, 0],   // yellow
];

const PALETTE_FOUR_COLOR: RGB[] = [
    [0, 0, 0],       // black
    [255, 255, 255],  // white
    [255, 0, 0],     // red
    [255, 255, 0],   // yellow
];

/**
 * Resolve AIMS colorType string to the matching palette.
 * Matching is case-insensitive and tolerant of separators (_, -, space).
 */
function getPalette(colorType: string): RGB[] {
    const key = colorType.toUpperCase().replace(/[\s-]/g, '_');

    if (key.includes('FOUR') || key.includes('4_COLOR')) return PALETTE_FOUR_COLOR;
    if (key.includes('RED')) return PALETTE_TERNARY_RED;
    if (key.includes('YELLOW')) return PALETTE_TERNARY_YELLOW;
    if (key.includes('TERNARY')) return PALETTE_TERNARY_RED; // default ternary
    return PALETTE_BINARY;
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

/**
 * Apply Floyd-Steinberg error-diffusion dithering to a canvas.
 *
 * Reads pixel data from the source canvas and returns a **new** canvas
 * with the dithered result — the source is never mutated.
 *
 * @param sourceCanvas - Canvas with the resized full-color image
 * @param colorType    - AIMS colorType string ("BINARY", "TERNARY_RED", …)
 * @returns A new canvas containing the dithered image
 */
export function ditherImage(
    sourceCanvas: HTMLCanvasElement,
    colorType: string,
): HTMLCanvasElement {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const ctx = sourceCanvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, width, height);
    const src = imageData.data; // Uint8ClampedArray [R,G,B,A, …]

    // Use float array so error accumulation doesn't clamp prematurely
    const pixels = new Float32Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        pixels[i * 3] = src[i * 4];
        pixels[i * 3 + 1] = src[i * 4 + 1];
        pixels[i * 3 + 2] = src[i * 4 + 2];
    }

    const palette = getPalette(colorType);

    // Floyd-Steinberg error diffusion
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 3;

            const oldR = Math.max(0, Math.min(255, pixels[idx]));
            const oldG = Math.max(0, Math.min(255, pixels[idx + 1]));
            const oldB = Math.max(0, Math.min(255, pixels[idx + 2]));

            const newPixel = findNearest([oldR, oldG, oldB], palette);

            pixels[idx] = newPixel[0];
            pixels[idx + 1] = newPixel[1];
            pixels[idx + 2] = newPixel[2];

            const errR = oldR - newPixel[0];
            const errG = oldG - newPixel[1];
            const errB = oldB - newPixel[2];

            // Distribute error to neighbors: right, bottom-left, bottom, bottom-right
            if (x + 1 < width) {
                const i = idx + 3;
                pixels[i] += errR * 7 / 16;
                pixels[i + 1] += errG * 7 / 16;
                pixels[i + 2] += errB * 7 / 16;
            }
            if (y + 1 < height) {
                if (x - 1 >= 0) {
                    const i = ((y + 1) * width + (x - 1)) * 3;
                    pixels[i] += errR * 3 / 16;
                    pixels[i + 1] += errG * 3 / 16;
                    pixels[i + 2] += errB * 3 / 16;
                }
                {
                    const i = ((y + 1) * width + x) * 3;
                    pixels[i] += errR * 5 / 16;
                    pixels[i + 1] += errG * 5 / 16;
                    pixels[i + 2] += errB * 5 / 16;
                }
                if (x + 1 < width) {
                    const i = ((y + 1) * width + (x + 1)) * 3;
                    pixels[i] += errR * 1 / 16;
                    pixels[i + 1] += errG * 1 / 16;
                    pixels[i + 2] += errB * 1 / 16;
                }
            }
        }
    }

    // Write result to a new canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d')!;
    const outData = outCtx.createImageData(width, height);

    for (let i = 0; i < width * height; i++) {
        outData.data[i * 4] = pixels[i * 3];
        outData.data[i * 4 + 1] = pixels[i * 3 + 1];
        outData.data[i * 4 + 2] = pixels[i * 3 + 2];
        outData.data[i * 4 + 3] = 255; // fully opaque
    }

    outCtx.putImageData(outData, 0, 0);
    return outCanvas;
}
