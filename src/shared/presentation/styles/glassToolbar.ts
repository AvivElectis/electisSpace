import { alpha } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

/**
 * Glass-like toolbar styling for feature page action button containers.
 * Matches the QuickActionsPanel styling in the Dashboard.
 * Use on desktop/tablet only (hide on mobile where FABs are used instead).
 */
export const glassToolbarSx: SxProps<Theme> = {
    p: 1.5,
    borderRadius: 3,
    display: 'inline-flex',
    gap: 1.5,
    alignItems: 'center',
    background: (theme) =>
        `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.75)} 100%)`,
    backdropFilter: 'blur(40px) saturate(2)',
    WebkitBackdropFilter: 'blur(40px) saturate(2)',
    border: (theme) =>
        `1.5px solid ${alpha(theme.palette.primary.main, 0.15)}`,
    boxShadow: (theme) =>
        `0 8px 24px ${alpha(theme.palette.primary.main, 0.1)}, 0 2px 8px ${alpha(theme.palette.common.black, 0.04)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.9)}`,
};
