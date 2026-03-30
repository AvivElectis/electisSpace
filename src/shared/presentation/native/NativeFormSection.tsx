import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { NativeCard } from './NativeCard';
import { nativeColors, nativeSpacing } from '../themes/nativeTokens';

interface NativeFormSectionProps {
    title: string;
    children: ReactNode;
}

export const NativeFormSection = memo(function NativeFormSection({ title, children }: NativeFormSectionProps) {
    return (
        <Box sx={{ mb: `${nativeSpacing.sectionGap}px` }}>
            <Typography
                variant="overline"
                sx={{
                    color: nativeColors.primary.main,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    display: 'block',
                    mb: 1,
                    px: 0.5,
                }}
            >
                {title}
            </Typography>
            <NativeCard sx={{ p: `${nativeSpacing.cardPadding}px` }}>
                {children}
            </NativeCard>
        </Box>
    );
});
