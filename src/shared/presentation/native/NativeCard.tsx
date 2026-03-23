import { memo } from 'react';
import { Paper } from '@mui/material';
import type { PaperProps } from '@mui/material';
import { nativeColors, nativeRadii, nativeShadows } from '../themes/nativeTokens';

export interface NativeCardProps extends Omit<PaperProps, 'elevation'> {
    accentColor?: string;
}

export const NativeCard = memo(function NativeCard({ accentColor, sx, children, ...rest }: NativeCardProps) {
    return (
        <Paper
            elevation={0}
            sx={{
                bgcolor: nativeColors.surface.lowest,
                borderRadius: `${nativeRadii.card}px`,
                boxShadow: nativeShadows.card,
                border: 'none',
                overflow: 'hidden',
                ...(accentColor && {
                    borderInlineStart: `4px solid ${accentColor}`,
                }),
                ...sx,
            }}
            {...rest}
        >
            {children}
        </Paper>
    );
});
