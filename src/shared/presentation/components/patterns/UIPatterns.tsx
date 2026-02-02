/**
 * UI/UX Refinement - Common Patterns
 * 
 * Reusable UI patterns and compound components.
 * Phase 6.5 - UI/UX Refinement
 */

import { Box, Stack, Typography, IconButton, Skeleton, useTheme, alpha, type BoxProps } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { ReactNode } from 'react';
import { spacing, radius, animations, componentStyles } from '../../styles/designTokens';

/**
 * Section Header with optional action
 */
interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    onRefresh?: () => void;
    refreshing?: boolean;
}

export function SectionHeader({
    title,
    subtitle,
    action,
    onRefresh,
    refreshing = false,
}: SectionHeaderProps) {
    return (
        <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 3 }}
        >
            <Box>
                <Typography variant="h5" fontWeight={600} color="text.primary">
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
                {onRefresh && (
                    <IconButton
                        onClick={onRefresh}
                        disabled={refreshing}
                        size="small"
                        aria-label="Refresh"
                        sx={{
                            transition: animations.transition('transform'),
                            ...(refreshing && {
                                animation: 'spin 1s linear infinite',
                                '@keyframes spin': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(360deg)' },
                                },
                            }),
                        }}
                    >
                        <RefreshIcon />
                    </IconButton>
                )}
                {action}
            </Stack>
        </Stack>
    );
}

/**
 * Stat Card for displaying metrics
 */
interface StatCardProps extends BoxProps {
    label: string;
    value: string | number;
    change?: {
        value: number;
        type: 'increase' | 'decrease' | 'neutral';
    };
    icon?: ReactNode;
    loading?: boolean;
}

export function StatCard({
    label,
    value,
    change,
    icon,
    loading = false,
    sx,
    ...props
}: StatCardProps) {
    const theme = useTheme();

    const changeColors = {
        increase: theme.palette.success.main,
        decrease: theme.palette.error.main,
        neutral: theme.palette.text.secondary,
    };

    return (
        <Box
            {...props}
            sx={{
                ...componentStyles.card.base,
                p: spacing.md / 8,
                backgroundColor: 'background.paper',
                ...sx,
            }}
        >
            {loading ? (
                <>
                    <Skeleton width={80} height={20} sx={{ mb: 1 }} />
                    <Skeleton width={60} height={32} />
                </>
            ) : (
                <>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            {label}
                        </Typography>
                        {icon && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    color: 'text.secondary',
                                    '& > svg': { fontSize: 18 },
                                }}
                            >
                                {icon}
                            </Box>
                        )}
                    </Stack>
                    <Typography variant="h4" fontWeight={700}>
                        {value}
                    </Typography>
                    {change && (
                        <Typography
                            variant="caption"
                            sx={{ color: changeColors[change.type], fontWeight: 500 }}
                        >
                            {change.type === 'increase' ? '+' : change.type === 'decrease' ? '-' : ''}
                            {Math.abs(change.value)}%
                        </Typography>
                    )}
                </>
            )}
        </Box>
    );
}

/**
 * Info Row for key-value displays
 */
interface InfoRowProps {
    label: string;
    value: ReactNode;
    copyable?: boolean;
    onCopy?: () => void;
}

export function InfoRow({ label, value, copyable, onCopy }: InfoRowProps) {
    const theme = useTheme();

    return (
        <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            py={1.5}
            sx={{
                borderBottom: `1px solid ${theme.palette.divider}`,
                '&:last-child': { borderBottom: 'none' },
            }}
        >
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" fontWeight={500}>
                    {value}
                </Typography>
                {copyable && onCopy && (
                    <IconButton size="small" onClick={onCopy} aria-label="Copy">
                        <Box component="span" sx={{ fontSize: 14 }}>📋</Box>
                    </IconButton>
                )}
            </Stack>
        </Stack>
    );
}

/**
 * Action Card with icon and description
 */
interface ActionCardProps extends BoxProps {
    icon: ReactNode;
    title: string;
    description?: string;
    onClick?: () => void;
    disabled?: boolean;
}

export function ActionCard({
    icon,
    title,
    description,
    onClick,
    disabled = false,
    sx,
    ...props
}: ActionCardProps) {
    const theme = useTheme();

    return (
        <Box
            component={onClick ? 'button' : 'div'}
            onClick={disabled ? undefined : onClick}
            {...props}
            sx={{
                ...componentStyles.card.base,
                ...componentStyles.card.interactive,
                p: spacing.md / 8,
                backgroundColor: 'background.paper',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                opacity: disabled ? 0.6 : 1,
                cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
                '&:hover': disabled ? {} : {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    ...componentStyles.card.hover,
                },
                ...sx,
            }}
        >
            <Stack direction="row" spacing={2} alignItems="center">
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: radius.md,
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        '& > svg': { fontSize: 24 },
                    }}
                >
                    {icon}
                </Box>
                <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight={600}>
                        {title}
                    </Typography>
                    {description && (
                        <Typography variant="body2" color="text.secondary">
                            {description}
                        </Typography>
                    )}
                </Box>
            </Stack>
        </Box>
    );
}

/**
 * Divider with label
 */
interface LabeledDividerProps {
    label: string;
}

export function LabeledDivider({ label }: LabeledDividerProps) {
    const theme = useTheme();

    return (
        <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ my: 3 }}
        >
            <Box sx={{ flex: 1, height: 1, backgroundColor: theme.palette.divider }} />
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {label}
            </Typography>
            <Box sx={{ flex: 1, height: 1, backgroundColor: theme.palette.divider }} />
        </Stack>
    );
}

/**
 * Floating Action Container
 */
interface FloatingActionsProps {
    children: ReactNode;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export function FloatingActions({ children, position = 'bottom-right' }: FloatingActionsProps) {
    const positionStyles = {
        'bottom-right': { right: spacing.lg, left: 'auto' },
        'bottom-left': { left: spacing.lg, right: 'auto' },
        'bottom-center': { left: '50%', transform: 'translateX(-50%)' },
    };

    return (
        <Stack
            direction="row"
            spacing={1}
            sx={{
                position: 'fixed',
                bottom: spacing.lg,
                ...positionStyles[position],
                zIndex: 1000,
            }}
        >
            {children}
        </Stack>
    );
}

/**
 * Content Container with consistent padding
 */
interface ContentContainerProps extends BoxProps {
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function ContentContainer({
    children,
    maxWidth = 'lg',
    sx,
    ...props
}: ContentContainerProps) {
    const maxWidthValues = {
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
        full: '100%',
    };

    return (
        <Box
            {...props}
            sx={{
                width: '100%',
                maxWidth: maxWidthValues[maxWidth],
                mx: 'auto',
                px: { xs: 2, sm: 3, md: 4 },
                py: { xs: 2, sm: 3 },
                ...sx,
            }}
        >
            {children}
        </Box>
    );
}
