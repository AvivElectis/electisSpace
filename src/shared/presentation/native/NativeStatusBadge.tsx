import { memo } from 'react';
import { Chip } from '@mui/material';
import { nativeColors } from '../themes/nativeTokens';

export interface NativeStatusBadgeProps {
    label: string;
    color: 'success' | 'warning' | 'error' | 'info';
}

const COLOR_MAP = {
    success: { bg: `${nativeColors.status.success}22`, text: nativeColors.status.success },
    warning: { bg: `${nativeColors.status.warning}22`, text: nativeColors.status.warning },
    error: { bg: `${nativeColors.status.error}22`, text: nativeColors.status.error },
    info: { bg: `${nativeColors.status.info}22`, text: nativeColors.status.info },
} as const;

export const NativeStatusBadge = memo(function NativeStatusBadge({ label, color }: NativeStatusBadgeProps) {
    const { bg, text } = COLOR_MAP[color];
    return (
        <Chip
            label={label}
            size="small"
            sx={{
                bgcolor: bg,
                color: text,
                fontWeight: 600,
                height: 22,
                fontSize: '0.7rem',
                '& .MuiChip-label': { px: 1 },
            }}
        />
    );
});
