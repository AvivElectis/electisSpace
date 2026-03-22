import type { ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { nativeSpacing } from '../themes/nativeTokens';

export interface NativeEmptyStateProps {
    icon: ReactNode;
    title: string;
    subtitle?: string;
    action?: { label: string; onClick: () => void };
}

export function NativeEmptyState({ icon, title, subtitle, action }: NativeEmptyStateProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                px: `${nativeSpacing.pagePadding}px`,
                py: 4,
                textAlign: 'center',
            }}
        >
            <Box
                sx={{
                    fontSize: 64,
                    color: 'text.disabled',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& .MuiSvgIcon-root': { fontSize: 'inherit' },
                }}
            >
                {icon}
            </Box>
            <Typography variant="h6" fontWeight={700} color="text.primary">
                {title}
            </Typography>
            {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
                    {subtitle}
                </Typography>
            )}
            {action && (
                <Button variant="contained" onClick={action.onClick} sx={{ mt: 1 }}>
                    {action.label}
                </Button>
            )}
        </Box>
    );
}
