/**
 * Status Badge Component
 * 
 * Consistent status indicator badges for various states.
 * Phase 6.5 - UI/UX Refinement
 */

import { Box, Typography, useTheme, alpha } from '@mui/material';
import type { ReactNode } from 'react';
import { radius, spacing, animations } from '../styles/designTokens';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface StatusBadgeProps {
    /** Status type determines color */
    status: StatusType;
    /** Label text */
    label: string;
    /** Optional icon before label */
    icon?: ReactNode;
    /** Size variant */
    size?: 'small' | 'medium' | 'large';
    /** Animate on mount */
    animate?: boolean;
    /** Pulsing animation for active states */
    pulse?: boolean;
    /** Full width */
    fullWidth?: boolean;
}

/**
 * StatusBadge - Consistent status indicator component
 * 
 * @example
 * <StatusBadge status="success" label="Active" icon={<CheckIcon />} />
 * <StatusBadge status="error" label="Error" pulse />
 */
export function StatusBadge({
    status,
    label,
    icon,
    size = 'medium',
    animate = false,
    pulse = false,
    fullWidth = false,
}: StatusBadgeProps) {
    const theme = useTheme();

    const colorMap: Record<StatusType, string> = {
        success: theme.palette.success.main,
        warning: theme.palette.warning.main,
        error: theme.palette.error.main,
        info: theme.palette.info.main,
        neutral: theme.palette.text.secondary,
        primary: theme.palette.primary.main,
    };

    const color = colorMap[status];

    const sizeStyles = {
        small: {
            padding: `${spacing.xxs - 1}px ${spacing.xs - 2}px`,
            fontSize: '0.6875rem',
            iconSize: 12,
        },
        medium: {
            padding: `${spacing.xxs}px ${spacing.xs}px`,
            fontSize: '0.75rem',
            iconSize: 14,
        },
        large: {
            padding: `${spacing.xxs + 2}px ${spacing.sm - 2}px`,
            fontSize: '0.8125rem',
            iconSize: 16,
        },
    };

    const styles = sizeStyles[size];

    return (
        <Box
            component="span"
            role="status"
            aria-label={`${status}: ${label}`}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                padding: styles.padding,
                borderRadius: radius.full,
                backgroundColor: alpha(color, 0.1),
                color: color,
                border: `1px solid ${alpha(color, 0.3)}`,
                fontWeight: 600,
                fontSize: styles.fontSize,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                width: fullWidth ? '100%' : 'auto',
                justifyContent: fullWidth ? 'center' : 'flex-start',
                transition: animations.transition('all'),
                ...(animate && {
                    animation: 'statusBadgeIn 250ms cubic-bezier(0.33, 1, 0.68, 1) forwards',
                    '@keyframes statusBadgeIn': {
                        '0%': { opacity: 0, transform: 'scale(0.9)' },
                        '100%': { opacity: 1, transform: 'scale(1)' },
                    },
                }),
                ...(pulse && {
                    animation: 'statusPulse 2s ease-in-out infinite',
                    '@keyframes statusPulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.7 },
                    },
                }),
                '@media (prefers-reduced-motion: reduce)': {
                    animation: 'none',
                },
            }}
        >
            {icon && (
                <Box
                    component="span"
                    sx={{
                        display: 'flex',
                        '& > svg': { fontSize: styles.iconSize },
                    }}
                >
                    {icon}
                </Box>
            )}
            <Typography
                component="span"
                sx={{
                    fontSize: 'inherit',
                    fontWeight: 'inherit',
                    lineHeight: 'inherit',
                }}
            >
                {label}
            </Typography>
        </Box>
    );
}

interface StatusDotProps {
    /** Status type determines color */
    status: StatusType;
    /** Dot size */
    size?: 'small' | 'medium' | 'large';
    /** Pulsing animation */
    pulse?: boolean;
    /** Accessible label */
    label?: string;
}

/**
 * StatusDot - Simple colored dot status indicator
 * 
 * @example
 * <StatusDot status="success" />
 * <StatusDot status="error" pulse label="Alert" />
 */
export function StatusDot({
    status,
    size = 'medium',
    pulse = false,
    label,
}: StatusDotProps) {
    const theme = useTheme();

    const colorMap: Record<StatusType, string> = {
        success: theme.palette.success.main,
        warning: theme.palette.warning.main,
        error: theme.palette.error.main,
        info: theme.palette.info.main,
        neutral: theme.palette.text.disabled,
        primary: theme.palette.primary.main,
    };

    const sizeMap = {
        small: 6,
        medium: 8,
        large: 10,
    };

    const color = colorMap[status];
    const dotSize = sizeMap[size];

    return (
        <Box
            component="span"
            role="status"
            aria-label={label || status}
            sx={{
                display: 'inline-block',
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                backgroundColor: color,
                flexShrink: 0,
                ...(pulse && {
                    animation: 'dotPulse 2s ease-in-out infinite',
                    boxShadow: `0 0 0 0 ${alpha(color, 0.5)}`,
                    '@keyframes dotPulse': {
                        '0%, 100%': {
                            boxShadow: `0 0 0 0 ${alpha(color, 0.5)}`,
                        },
                        '50%': {
                            boxShadow: `0 0 0 ${dotSize / 2}px ${alpha(color, 0)}`,
                        },
                    },
                }),
                '@media (prefers-reduced-motion: reduce)': {
                    animation: 'none',
                },
            }}
        />
    );
}

export default StatusBadge;
