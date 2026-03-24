import { memo, useState, useRef, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { nativeSpacing } from '@shared/presentation/themes/nativeTokens';

export interface NativeSwipeCarouselProps {
    children: ReactNode[];
}

/**
 * NativeSwipeCarousel — horizontal swipeable card carousel with live drag.
 * Follows the finger during drag, snaps on release. RTL-aware.
 */
export const NativeSwipeCarousel = memo(function NativeSwipeCarousel({ children }: NativeSwipeCarouselProps) {
    const theme = useTheme();
    const isRtl = theme.direction === 'rtl';
    const [activeIndex, setActiveIndex] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const isScrolling = useRef<boolean | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const slides = children.filter(Boolean);
    const count = slides.length;

    if (count === 0) return null;
    if (count === 1) return <Box sx={{ px: `${nativeSpacing.pagePadding}px` }}>{slides[0]}</Box>;

    const goTo = useCallback((index: number) => {
        setActiveIndex(Math.max(0, Math.min(index, count - 1)));
        setDragOffset(0);
    }, [count]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        isScrolling.current = null;
        setIsDragging(true);
    }, []);

    // Register touchmove with { passive: false } so e.preventDefault() works on Android.
    // React JSX event props don't support passive option, so we use a ref + addEventListener.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleTouchMove = (e: TouchEvent) => {
            const deltaX = e.touches[0].clientX - touchStartX.current;
            const deltaY = e.touches[0].clientY - touchStartY.current;

            // Determine if horizontal or vertical scroll on first move
            if (isScrolling.current === null) {
                isScrolling.current = Math.abs(deltaY) > Math.abs(deltaX);
            }
            if (isScrolling.current) return; // Vertical scroll — don't intercept

            e.preventDefault(); // Prevent vertical scroll while swiping horizontally
            const containerWidth = el.clientWidth || 1;
            // Convert pixel offset to percentage of slide width, with resistance at edges
            let offset = (deltaX / containerWidth) * 100;
            if (isRtl) offset = -offset;

            // Rubber-band effect at edges
            if ((activeIndex === 0 && offset > 0) || (activeIndex === count - 1 && offset < 0)) {
                offset *= 0.3;
            }

            setDragOffset(offset);
        };

        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        return () => el.removeEventListener('touchmove', handleTouchMove);
    }, [activeIndex, count, isRtl]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);

        const threshold = 20; // percentage threshold to snap
        if (Math.abs(dragOffset) > threshold) {
            if (dragOffset < 0) {
                goTo(activeIndex + 1);
            } else {
                goTo(activeIndex - 1);
            }
        } else {
            setDragOffset(0);
        }
    }, [dragOffset, activeIndex, goTo]);

    // Calculate transform: base position + drag offset
    const basePercent = activeIndex * (100 / count);
    const dragPercent = (dragOffset / 100) * (100 / count);
    const translatePercent = basePercent - dragPercent;
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
                ref={containerRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                sx={{ overflow: 'hidden', touchAction: 'pan-y' }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        width: `${count * 100}%`,
                        // Smooth spring animation on release, instant follow during drag
                        transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        transform,
                        willChange: 'transform',
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
