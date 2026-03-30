import { memo } from 'react';
import type { ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { nativeSpacing, nativeColors, nativeRadii } from '../themes/nativeTokens';

export interface NativeEmptyStateProps {
    icon: ReactNode;
    title: string;
    subtitle?: string;
    action?: { label: string; onClick: () => void };
}

export const NativeEmptyState = memo(function NativeEmptyState({ icon, title, subtitle, action }: NativeEmptyStateProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                px: `${nativeSpacing.pagePadding}px`,
                py: 6,
                minHeight: 220,
                textAlign: 'center',
            }}
        >
            {/* Icon bubble */}
            <Box
                sx={{
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    bgcolor: nativeColors.surface.low,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 44,
                    color: nativeColors.surface.high,
                    '& .MuiSvgIcon-root': { fontSize: 'inherit', color: nativeColors.primary.main, opacity: 0.25 },
                }}
            >
                {icon}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260, lineHeight: 1.5 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>

            {action && (
                <Button
                    variant="contained"
                    onClick={action.onClick}
                    sx={{
                        mt: 0.5,
                        borderRadius: `${nativeRadii.button}px`,
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                    }}
                >
                    {action.label}
                </Button>
            )}
        </Box>
    );
});
