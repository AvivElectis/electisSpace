import { memo, useMemo, useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { nativeSizing, nativeSpacing, nativeColors } from '../themes/nativeTokens';
import { PullToRefresh } from '../components/PullToRefresh';
import type { ReactNode } from 'react';

interface NativePageProps {
    children: ReactNode;
    noPadding?: boolean;
    onRefresh?: () => Promise<void>;
}

export const NativePage = memo(function NativePage({ children, noPadding = false, onRefresh }: NativePageProps) {
    const location = useLocation();
    const scrollRef = useRef<HTMLDivElement>(null);

    // When wrapped in PullToRefresh, PullToRefresh owns the scroll container.
    // NativePage should NOT have its own overflow — that creates nested scrollers
    // which trap scrolling and break pull-to-refresh detection.
    const pageSx = useMemo(() => ({
        flex: 1,
        ...(onRefresh ? {} : { overflowY: 'auto' as const }),
        overflowX: 'hidden' as const,
        bgcolor: nativeColors.surface.base,
        pb: `calc(${nativeSizing.bottomNavHeight + 32}px + env(safe-area-inset-bottom))`,
        WebkitOverflowScrolling: 'touch',
        px: noPadding ? 0 : `${nativeSpacing.pagePadding}px`,
        pt: noPadding ? 0 : 1,
    }), [noPadding, onRefresh]);

    useEffect(() => {
        scrollRef.current?.scrollTo(0, 0);
    }, [location.pathname]);

    const content = (
        <Box ref={scrollRef} sx={pageSx}>
            {children}
        </Box>
    );

    if (onRefresh) {
        return <PullToRefresh onRefresh={onRefresh}>{content}</PullToRefresh>;
    }

    return content;
});
