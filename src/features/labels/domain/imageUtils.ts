/**
 * Image resize utilities for ESL label image push.
 * Canvas-based resize only — dithering is handled server-side by AIMS.
 */

import type { FitMode } from './imageTypes';

/**
 * Load an image file into an HTMLImageElement
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
}

/**
 * Resize an image to target dimensions using the specified fit mode.
 * Returns a canvas with the resized image.
 *
 * - cover: fills the entire target, cropping as needed
 * - contain: fits within target, adding white bars as needed
 * - fill: stretches to exact target dimensions
 */
export function resizeImage(
    img: HTMLImageElement,
    targetW: number,
    targetH: number,
    fitMode: FitMode,
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;

    // White background (important for ESL displays)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);

    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;

    let dx = 0, dy = 0, dw = targetW, dh = targetH;
    let sx = 0, sy = 0, sw = srcW, sh = srcH;

    if (fitMode === 'fill') {
        // Stretch to fill — no cropping, no bars
        ctx.drawImage(img, 0, 0, targetW, targetH);
        return canvas;
    }

    const srcRatio = srcW / srcH;
    const dstRatio = targetW / targetH;

    if (fitMode === 'cover') {
        // Crop to fill
        if (srcRatio > dstRatio) {
            // Source is wider — crop left/right
            sw = srcH * dstRatio;
            sx = (srcW - sw) / 2;
        } else {
            // Source is taller — crop top/bottom
            sh = srcW / dstRatio;
            sy = (srcH - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
    } else {
        // contain — fit within, letterbox
        if (srcRatio > dstRatio) {
            // Source is wider — bars top/bottom
            dh = targetW / srcRatio;
            dy = (targetH - dh) / 2;
        } else {
            // Source is taller — bars left/right
            dw = targetH * srcRatio;
            dx = (targetW - dw) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
    }

    return canvas;
}

/**
 * Convert a canvas to base64 PNG string (without data URI prefix)
 */
export function canvasToBase64(canvas: HTMLCanvasElement): string {
    const dataUrl = canvas.toDataURL('image/png');
    // Remove "data:image/png;base64," prefix
    return dataUrl.replace(/^data:image\/png;base64,/, '');
}
