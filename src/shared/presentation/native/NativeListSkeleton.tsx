/**
 * NativeListSkeleton
 *
 * Shimmer skeleton for native list pages.
 * Renders while the first data load is in progress (isLoading && items.length === 0).
 *
 * Usage:
 *   if (isLoading && items.length === 0) {
 *     return <NativePage><NativeListSkeleton showStatBar showChipBar /></NativePage>;
 *   }
 */

import { memo } from 'react';
import { Box, Skeleton } from '@mui/material';
import { nativeSpacing, nativeRadii } from '../themes/nativeTokens';

export interface NativeListSkeletonProps {
    /** Number of card-shaped skeleton rows to render. Default: 5 */
    rows?: number;
    /** Show a stat bar skeleton (3 blocks in a row) */
    showStatBar?: boolean;
    /** Show a chip bar skeleton (4 small rounded chips) */
    showChipBar?: boolean;
}

export const NativeListSkeleton = memo(function NativeListSkeleton({
    rows = 5,
    showStatBar = false,
    showChipBar = false,
}: NativeListSkeletonProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                width: '100%',
            }}
        >
            {/* Stat bar skeleton — 3 blocks in a row */}
            {showStatBar && (
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1.5,
                        px: `${nativeSpacing.pagePadding}px`,
                        py: 1.5,
                    }}
                >
                    {[0, 1, 2].map((i) => (
                        <Skeleton
                            key={i}
                            variant="rounded"
                            animation="wave"
                            sx={{
                                flex: 1,
                                height: 52,
                                borderRadius: `${nativeRadii.card}px`,
                            }}
                        />
                    ))}
                </Box>
            )}

            {/* Search bar skeleton */}
            <Box sx={{ px: `${nativeSpacing.pagePadding}px`, py: 0.5 }}>
                <Skeleton
                    variant="rounded"
                    animation="wave"
                    sx={{
                        width: '100%',
                        height: 40,
                        borderRadius: `${nativeRadii.input}px`,
                    }}
                />
            </Box>

            {/* Chip bar skeleton — 4 small rounded chips */}
            {showChipBar && (
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1,
                        px: `${nativeSpacing.pagePadding}px`,
                        py: 1,
                        overflowX: 'hidden',
                    }}
                >
                    {[0, 1, 2, 3].map((i) => (
                        <Skeleton
                            key={i}
                            variant="rounded"
                            animation="wave"
                            sx={{
                                width: 70,
                                height: 28,
                                borderRadius: `${nativeRadii.chip}px`,
                                flexShrink: 0,
                            }}
                        />
                    ))}
                </Box>
            )}

            {/* Card-shaped row skeletons */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    px: `${nativeSpacing.pagePadding}px`,
                    pt: 1,
                }}
            >
                {Array.from({ length: rows }).map((_, i) => (
                    <Skeleton
                        key={i}
                        variant="rounded"
                        animation="wave"
                        sx={{
                            width: '100%',
                            height: 72,
                            borderRadius: `${nativeRadii.card}px`,
                        }}
                    />
                ))}
            </Box>
        </Box>
    );
});
