import { Box } from '@mui/material';
import { nativeSizing, nativeSpacing, nativeColors } from '../themes/nativeTokens';
import { PullToRefresh } from '../components/PullToRefresh';
import type { ReactNode } from 'react';

interface NativePageProps {
    children: ReactNode;
    noPadding?: boolean;
    onRefresh?: () => Promise<void>;
}

export function NativePage({ children, noPadding = false, onRefresh }: NativePageProps) {
    const content = (
        <Box
            sx={{
                flex: 1,
                overflow: 'auto',
                bgcolor: nativeColors.surface.base,
                px: noPadding ? 0 : `${nativeSpacing.pagePadding}px`,
                pt: noPadding ? 0 : 1,
                pb: `calc(${nativeSizing.bottomNavHeight + 32}px + env(safe-area-inset-bottom))`,
            }}
        >
            {children}
        </Box>
    );

    if (onRefresh) {
        return <PullToRefresh onRefresh={onRefresh}>{content}</PullToRefresh>;
    }

    return content;
}
