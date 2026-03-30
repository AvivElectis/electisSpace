/**
 * PullToRefresh
 *
 * Wrapper component that adds pull-to-refresh gesture on native platforms.
 * On web, renders children directly as a complete no-op.
 *
 * Usage:
 *   <PullToRefresh onRefresh={handleRefresh}>
 *     {children}
 *   </PullToRefresh>
 */

import { useRef, useState, useCallback } from 'react';
import type { ReactNode, TouchEvent } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNativePlatform } from '../hooks/useNativePlatform';

const PULL_THRESHOLD = 80;   // px — triggers refresh
const MAX_PULL = 120;         // px — max visual pull (1.5x threshold)

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const { isNative } = useNativePlatform();

    // On web, render children directly — complete no-op
    if (!isNative) {
        return <>{children}</>;
    }

    return <NativePullToRefresh onRefresh={onRefresh}>{children}</NativePullToRefresh>;
}

function NativePullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const startYRef = useRef<number | null>(null);
    const hapticFiredRef = useRef(false);

    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
        const container = containerRef.current;
        if (!container) return;

        // Only track pull when scrolled to top
        if (container.scrollTop > 0) return;

        startYRef.current = e.touches[0].clientY;
        hapticFiredRef.current = false;
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
        if (startYRef.current === null || isRefreshing) return;

        const container = containerRef.current;
        if (!container || container.scrollTop > 0) {
            // User scrolled down after starting — cancel pull gesture
            startYRef.current = null;
            setPullDistance(0);
            return;
        }

        const delta = e.touches[0].clientY - startYRef.current;

        if (delta <= 0) {
            setPullDistance(0);
            return;
        }

        // Clamp to max pull
        const clamped = Math.min(delta, MAX_PULL);
        setPullDistance(clamped);

        // Fire haptic once when crossing threshold (non-blocking)
        if (clamped >= PULL_THRESHOLD && !hapticFiredRef.current) {
            hapticFiredRef.current = true;
            Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
        }
    }, [isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (startYRef.current === null) return;
        startYRef.current = null;

        if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
            setPullDistance(0);
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        } else {
            setPullDistance(0);
        }
    }, [pullDistance, isRefreshing, onRefresh]);

    // Determinate progress while pulling, indeterminate while refreshing
    const showIndicator = isRefreshing || pullDistance > 0;
    const progress = isRefreshing ? undefined : Math.round((pullDistance / PULL_THRESHOLD) * 100);
    const indicatorSize = 32;
    const indicatorY = isRefreshing
        ? 12
        : Math.max(0, (pullDistance / MAX_PULL) * 40 - indicatorSize / 2);

    return (
        <Box
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{
                flex: 1,
                overflow: 'auto',
                position: 'relative',
                WebkitOverflowScrolling: 'touch',
            }}
        >
            {/* Pull indicator */}
            {showIndicator && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: indicatorY,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: isRefreshing ? 'none' : 'top 0.05s linear',
                    }}
                >
                    <CircularProgress
                        variant={isRefreshing ? 'indeterminate' : 'determinate'}
                        value={progress}
                        size={indicatorSize}
                        thickness={4}
                    />
                </Box>
            )}

            {children}
        </Box>
    );
}
