/**
 * UI/UX Refinement - Design Tokens
 * 
 * Centralized design tokens for consistent styling across the application.
 * Phase 6.5 - UI/UX Refinement
 */

import { alpha } from '@mui/material';

/**
 * Animation Tokens
 * Consistent durations and easings for smooth UI transitions
 */
export const animations = {
    // Durations
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    verySlow: '500ms',
    
    // Easings (Apple-inspired)
    easeOut: 'cubic-bezier(0.33, 1, 0.68, 1)',        // Responsive, deceleration
    easeIn: 'cubic-bezier(0.32, 0, 0.67, 0)',         // Deliberate, acceleration
    easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',     // Natural motion
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',     // Bouncy, playful
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',          // Material Design default
    
    // Presets
    transition: (property: string, duration = 'normal', easing = 'easeOut') => {
        const durationValue = animations[duration as keyof typeof animations] || duration;
        const easingValue = animations[easing as keyof typeof animations] || easing;
        return `${property} ${durationValue} ${easingValue}`;
    },
    
    // Common transitions
    fadeIn: 'opacity 250ms cubic-bezier(0.33, 1, 0.68, 1)',
    slideUp: 'transform 350ms cubic-bezier(0.33, 1, 0.68, 1), opacity 250ms cubic-bezier(0.33, 1, 0.68, 1)',
    scale: 'transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    background: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * Spacing Tokens
 * Consistent spacing scale (8px base unit)
 */
export const spacing = {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    section: 64,
} as const;

/**
 * Border Radius Tokens
 * Consistent corner rounding
 */
export const radius = {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
} as const;

/**
 * Shadow Tokens
 * Consistent elevation levels
 */
export const shadows = {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 2px 4px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.05)',
    xl: '0 16px 32px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08)',
    
    // Focus rings
    focusRing: (color: string) => `0 0 0 3px ${alpha(color, 0.25)}`,
    focusRingInset: (color: string) => `inset 0 0 0 2px ${alpha(color, 0.5)}`,
} as const;

/**
 * Z-Index Tokens
 * Consistent stacking context
 */
export const zIndex = {
    base: 0,
    dropdown: 100,
    sticky: 200,
    modal: 300,
    popover: 400,
    tooltip: 500,
    toast: 600,
    overlay: 700,
    max: 9999,
} as const;

/**
 * Breakpoints (MUI compatible)
 */
export const breakpoints = {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
} as const;

/**
 * Common component styles for reuse
 */
export const componentStyles = {
    // Card styles
    card: {
        base: {
            borderRadius: radius.md,
            boxShadow: shadows.sm,
            transition: animations.transition('box-shadow'),
        },
        hover: {
            boxShadow: shadows.md,
        },
        interactive: {
            cursor: 'pointer',
            '&:hover': {
                boxShadow: shadows.md,
            },
            '&:active': {
                transform: 'scale(0.99)',
            },
        },
    },
    
    // Button styles
    button: {
        base: {
            borderRadius: radius.sm,
            fontWeight: 600,
            textTransform: 'none' as const,
            transition: `${animations.transition('background')}, ${animations.transition('transform')}`,
        },
        hover: {
            transform: 'translateY(-1px)',
        },
        active: {
            transform: 'translateY(0)',
        },
    },
    
    // Input styles
    input: {
        base: {
            borderRadius: radius.sm,
            transition: animations.transition('border-color'),
        },
        focus: (color: string) => ({
            borderColor: color,
            boxShadow: shadows.focusRing(color),
        }),
    },
    
    // List item styles
    listItem: {
        base: {
            borderRadius: radius.sm,
            transition: animations.background,
        },
        selected: (color: string) => ({
            backgroundColor: alpha(color, 0.08),
        }),
        hover: (color: string) => ({
            backgroundColor: alpha(color, 0.04),
        }),
    },
    
    // Badge styles
    badge: {
        base: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xxs,
            padding: `${spacing.xxs}px ${spacing.xs}px`,
            borderRadius: radius.full,
            fontSize: '0.75rem',
            fontWeight: 600,
        },
        status: (color: string) => ({
            backgroundColor: alpha(color, 0.1),
            color: color,
            border: `1px solid ${alpha(color, 0.3)}`,
        }),
    },
    
    // Skeleton animation
    skeleton: {
        base: {
            background: `linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
        },
    },
    
    // Scrollbar styles
    scrollbar: {
        thin: {
            '&::-webkit-scrollbar': {
                width: 6,
                height: 6,
            },
            '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0, 0, 0, 0.15)',
                borderRadius: radius.full,
                '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                },
            },
        },
        hidden: {
            '&::-webkit-scrollbar': {
                display: 'none',
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
        },
    },
} as const;

/**
 * Accessibility helpers
 */
export const a11y = {
    // Visually hidden but accessible
    visuallyHidden: {
        position: 'absolute' as const,
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap' as const,
        border: 0,
    },
    
    // Focus visible styles
    focusVisible: (color: string) => ({
        outline: 'none',
        '&:focus-visible': {
            boxShadow: shadows.focusRing(color),
        },
    }),
    
    // Skip link styles
    skipLink: {
        position: 'absolute' as const,
        top: -40,
        left: 0,
        padding: spacing.sm,
        zIndex: zIndex.max,
        '&:focus': {
            top: 0,
        },
    },
    
    // High contrast mode support
    highContrast: {
        '@media (forced-colors: active)': {
            borderColor: 'CanvasText',
        },
    },
    
    // Reduced motion support
    reducedMotion: {
        '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            transition: 'none',
        },
    },
} as const;

/**
 * Keyframe animations (for use with @keyframes)
 */
export const keyframes = {
    shimmer: {
        '0%': { backgroundPosition: '200% 0' },
        '100%': { backgroundPosition: '-200% 0' },
    },
    fadeIn: {
        '0%': { opacity: 0 },
        '100%': { opacity: 1 },
    },
    slideUp: {
        '0%': { transform: 'translateY(10px)', opacity: 0 },
        '100%': { transform: 'translateY(0)', opacity: 1 },
    },
    slideDown: {
        '0%': { transform: 'translateY(-10px)', opacity: 0 },
        '100%': { transform: 'translateY(0)', opacity: 1 },
    },
    scaleIn: {
        '0%': { transform: 'scale(0.95)', opacity: 0 },
        '100%': { transform: 'scale(1)', opacity: 1 },
    },
    pulse: {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 },
    },
    spin: {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
    },
} as const;

export default {
    animations,
    spacing,
    radius,
    shadows,
    zIndex,
    breakpoints,
    componentStyles,
    a11y,
    keyframes,
};
