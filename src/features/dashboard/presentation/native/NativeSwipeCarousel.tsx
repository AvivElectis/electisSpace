import { memo, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { nativeSpacing } from '@shared/presentation/themes/nativeTokens';

export interface NativeSwipeCarouselProps {
    children: ReactNode[];
}

/**
 * NativeSwipeCarousel — horizontal swipeable card carousel with dot indicators.
 * Supports RTL (Hebrew), 50px swipe threshold, smooth 0.3s transitions.
 * Tap dots to navigate; shows "N/total" counter.
 */
export const NativeSwipeCarousel = memo(function NativeSwipeCarousel({ children }: NativeSwipeCarouselProps) {
    const theme = useTheme();
    const isRtl = theme.direction === 'rtl';
    const [activeIndex, setActiveIndex] = useState(0);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);

    // Filter out falsy children (null/undefined/false)
    const slides = children.filter(Boolean);
    const count = slides.length;

    if (count === 0) return null;
    if (count === 1) return <Box sx={{ px: `${nativeSpacing.pagePadding}px` }}>{slides[0]}</Box>;

    const goTo = useCallback((index: number) => {
        setActiveIndex(Math.max(0, Math.min(index, count - 1)));
    }, [count]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;

        // Ignore if vertical scroll dominates
        if (Math.abs(deltaY) > Math.abs(deltaX)) return;
        if (Math.abs(deltaX) < 50) return;

        // In RTL, swipe left (negative deltaX) moves to previous; swipe right moves to next
        const swipedLeft = isRtl ? deltaX > 0 : deltaX < 0;
        if (swipedLeft) {
            goTo(activeIndex + 1);
        } else {
            goTo(activeIndex - 1);
        }
    }, [isRtl, activeIndex, goTo]);

    // Translation: in LTR, negative translate moves right, in RTL positive translate moves right
    const translatePercent = activeIndex * (100 / count);
    const transform = isRtl
        ? `translateX(${translatePercent}%)`
        : `translateX(-${translatePercent}%)`;

    return (
        <Box>
            {/* Dot indicators + counter */}
            <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                gap={1}
                sx={{ mb: 1.5 }}
            >
                <Typography
                    variant="caption"
                    color="text.secondary"
                    dir="ltr"
                    sx={{ minWidth: 28, textAlign: 'end' }}
                >
                    {activeIndex + 1}/{count}
                </Typography>

                {slides.map((_, i) => (
                    <Box
                        key={i}
                        onClick={() => goTo(i)}
                        sx={{
                            width: activeIndex === i ? 20 : 8,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: activeIndex === i
                                ? 'primary.main'
                                : (t) => alpha(t.palette.text.primary, 0.2),
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                        }}
                    />
                ))}
            </Stack>

            {/* Slide track */}
            <Box
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                sx={{ overflow: 'hidden' }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        width: `${count * 100}%`,
                        transition: 'transform 0.3s ease',
                        transform,
                    }}
                >
                    {slides.map((slide, i) => (
                        <Box
                            key={i}
                            sx={{
                                width: `${100 / count}%`,
                                flexShrink: 0,
                                boxSizing: 'border-box',
                                px: `${nativeSpacing.pagePadding}px`,
                            }}
                        >
                            {slide}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
});
