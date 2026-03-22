/**
 * Design tokens extracted from Stitch-generated designs.
 * Used by nativeTheme.ts and directly in native components.
 */

// --- Colors ---
export const nativeColors = {
    primary: {
        main: '#005dac',
        dark: '#004080',
        light: '#1976d2',
        contrastText: '#ffffff',
    },
    surface: {
        base: '#f9f9fe',
        low: '#f2f3fa',
        high: '#dfe2ec',
        lowest: '#ffffff',
    },
    status: {
        success: '#4caf50',
        warning: '#ff9800',
        error: '#d32f2f',
        info: '#2196f3',
    },
} as const;

// --- Typography ---
export const nativeFonts = {
    heading: '"Manrope", sans-serif',
    body: '"Inter", sans-serif',
} as const;

// --- Spacing & Sizing ---
export const nativeSpacing = {
    pagePadding: 16,
    sectionGap: 16,
    cardPadding: 16,
} as const;

// --- Radii ---
export const nativeRadii = {
    card: 16,
    button: 12,
    chip: 8,
    input: 12,
} as const;

// --- Sizing ---
export const nativeSizing = {
    touchMinHeight: 48,
    bottomNavHeight: 64,
    appBarHeight: 56,
} as const;

// --- Shadows ---
export const nativeShadows = {
    card: '0 2px 8px rgba(0, 0, 0, 0.06)',
    elevated: '0 4px 16px rgba(0, 0, 0, 0.1)',
} as const;

// --- Glass Effect ---
export const glass = {
    background: 'rgba(249, 249, 254, 0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
} as const;

// --- Gradients ---
export const nativeGradients = {
    appBar: 'linear-gradient(135deg, #005dac, #004080)',
} as const;
