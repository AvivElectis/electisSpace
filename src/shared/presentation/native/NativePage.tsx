import { useMemo } from 'react';
import { Box } from '@mui/material';
import { nativeSizing, nativeSpacing, nativeColors } from '../themes/nativeTokens';
import { PullToRefresh } from '../components/PullToRefresh';
import type { ReactNode } from 'react';

const pageBaseSx = {
    flex: 1,
    overflow: 'auto',
    bgcolor: nativeColors.surface.base,
    pb: `calc(${nativeSizing.bottomNavHeight + 32}px + env(safe-area-inset-bottom))`,
    willChange: 'transform',
    WebkitOverflowScrolling: 'touch',
} as const;

interface NativePageProps {
    children: ReactNode;
    noPadding?: boolean;
    onRefresh?: () => Promise<void>;
}

export function NativePage({ children, noPadding = false, onRefresh }: NativePageProps) {
    const pageSx = useMemo(() => ({
        ...pageBaseSx,
        px: noPadding ? 0 : `${nativeSpacing.pagePadding}px`,
        pt: noPadding ? 0 : 1,
    }), [noPadding]);

    const content = (
        <Box sx={pageSx}>
            {children}
        </Box>
    );

    if (onRefresh) {
        return <PullToRefresh onRefresh={onRefresh}>{content}</PullToRefresh>;
    }

    return content;
}
