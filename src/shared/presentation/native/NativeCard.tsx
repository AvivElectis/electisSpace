import { memo, useMemo } from 'react';
import { Paper } from '@mui/material';
import type { PaperProps } from '@mui/material';
import { nativeColors, nativeRadii, nativeShadows } from '../themes/nativeTokens';

const cardBaseSx = {
    bgcolor: nativeColors.surface.lowest,
    borderRadius: `${nativeRadii.card}px`,
    boxShadow: nativeShadows.card,
    border: 'none',
    overflow: 'hidden',
} as const;

export interface NativeCardProps extends Omit<PaperProps, 'elevation'> {
    accentColor?: string;
}

export const NativeCard = memo(function NativeCard({ accentColor, sx, children, ...rest }: NativeCardProps) {
    const cardSx = useMemo(() => ({
        ...cardBaseSx,
        ...(accentColor && { borderInlineStart: `4px solid ${accentColor}` }),
        ...sx,
    }), [accentColor, sx]);

    return (
        <Paper
            elevation={0}
            sx={cardSx}
            {...rest}
        >
            {children}
        </Paper>
    );
});
