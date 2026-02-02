/**
 * Enhanced Tooltip Component
 * 
 * Accessible tooltip with consistent styling and animations.
 * Phase 6.5 - UI/UX Refinement
 */

import { Tooltip as MuiTooltip, type TooltipProps as MuiTooltipProps, styled } from '@mui/material';
import { animations, radius, shadows } from '../styles/designTokens';

export interface EnhancedTooltipProps extends Omit<MuiTooltipProps, 'arrow'> {
    /** Show arrow pointer */
    arrow?: boolean;
    /** Tooltip variant */
    variant?: 'default' | 'light' | 'dark';
    /** Max width of tooltip */
    maxWidth?: number | string;
}

const StyledTooltip = styled(({ className, ...props }: MuiTooltipProps) => (
    <MuiTooltip {...props} classes={{ popper: className }} />
))<{ maxWidth?: number | string; variant?: 'default' | 'light' | 'dark' }>(
    ({ theme, maxWidth = 220, variant = 'default' }) => {
        const variants = {
            default: {
                backgroundColor: theme.palette.grey[800],
                color: theme.palette.common.white,
            },
            light: {
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                border: `1px solid ${theme.palette.divider}`,
            },
            dark: {
                backgroundColor: theme.palette.grey[900],
                color: theme.palette.common.white,
            },
        };

        const variantStyles = variants[variant];

        return {
            '& .MuiTooltip-tooltip': {
                ...variantStyles,
                maxWidth: typeof maxWidth === 'number' ? maxWidth : maxWidth,
                fontSize: '0.8125rem',
                fontWeight: 500,
                lineHeight: 1.5,
                borderRadius: radius.sm,
                padding: '8px 12px',
                boxShadow: shadows.md,
                transition: animations.fadeIn,
            },
            '& .MuiTooltip-arrow': {
                color: variantStyles.backgroundColor,
                ...(variant === 'light' && {
                    '&::before': {
                        border: `1px solid ${theme.palette.divider}`,
                    },
                }),
            },
        };
    }
);

/**
 * Enhanced Tooltip with improved styling and accessibility
 * 
 * @example
 * <EnhancedTooltip title="More information">
 *   <IconButton>
 *     <InfoIcon />
 *   </IconButton>
 * </EnhancedTooltip>
 */
export function EnhancedTooltip({
    children,
    arrow = true,
    variant = 'default',
    maxWidth = 220,
    enterDelay = 300,
    leaveDelay = 0,
    placement = 'top',
    ...props
}: EnhancedTooltipProps) {
    return (
        <StyledTooltip
            arrow={arrow}
            variant={variant}
            maxWidth={maxWidth}
            enterDelay={enterDelay}
            leaveDelay={leaveDelay}
            placement={placement}
            {...props}
        >
            {children}
        </StyledTooltip>
    );
}

export default EnhancedTooltip;
