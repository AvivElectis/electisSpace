// src/shared/presentation/components/OnboardingTooltip.tsx
import { useEffect, useState, useCallback } from 'react';
import { Paper, Typography, Button, Box, useMediaQuery, useTheme as useMuiTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TourStep } from '@shared/domain/onboardingTypes';

interface OnboardingTooltipProps {
    step: TourStep | null;
    currentStep: number;
    totalSteps: number;
    isLastStep: boolean;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}

// Card dimensions — kept in sync with TooltipCard's Paper width + estimated height
const CARD_W = 320;
const CARD_H = 200;
const OFFSET = 16;
const MARGIN = 16;
const SLIDE = 'cubic-bezier(0.2, 0.9, 0.3, 1)';
const SLIDE_MS = 240;

export function OnboardingTooltip({
    step,
    currentStep,
    totalSteps,
    isLastStep,
    onNext,
    onPrev,
    onSkip,
}: OnboardingTooltipProps) {
    const { t, i18n } = useTranslation();
    const muiTheme = useMuiTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const isRtl = i18n.language === 'he';

    const onNextStable = useCallback(onNext, [onNext]);

    // Lock user scroll (wheel/touch/keyboard) while the tour is active.
    // Programmatic scrollIntoView below still works — it doesn't dispatch user events.
    useEffect(() => {
        if (!step) return;

        const block = (e: Event) => {
            const target = e.target as HTMLElement | null;
            // Let the tooltip card itself receive scroll events (buttons, etc.)
            if (target && target.closest('[data-onboarding-card]')) return;
            e.preventDefault();
        };
        const blockKeys = (e: KeyboardEvent) => {
            const scrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '];
            if (!scrollKeys.includes(e.key)) return;
            const target = e.target as HTMLElement | null;
            if (target && target.closest('[data-onboarding-card]')) return;
            e.preventDefault();
        };

        window.addEventListener('wheel', block, { passive: false });
        window.addEventListener('touchmove', block, { passive: false });
        window.addEventListener('keydown', blockKeys);
        return () => {
            window.removeEventListener('wheel', block);
            window.removeEventListener('touchmove', block);
            window.removeEventListener('keydown', blockKeys);
        };
    }, [step]);

    // Find target element when step changes; update anchor + rect ASAP.
    // Card + spotlight stay mounted — CSS transitions glide them between steps.
    useEffect(() => {
        if (!step) {
            setAnchorEl(null);
            setRect(null);
            return;
        }

        // Find the first *visible* match. A data-tour attribute often has both
        // a desktop and a mobile variant in the DOM, one hidden via display rules.
        const findVisible = (): HTMLElement | null => {
            const matches = document.querySelectorAll<HTMLElement>(step.targetSelector);
            for (const el of matches) {
                if (el.offsetWidth > 0 && el.offsetHeight > 0) return el;
            }
            return null;
        };

        const applyElement = (el: HTMLElement) => {
            setAnchorEl(el);
            const elRect = el.getBoundingClientRect();
            const vh = window.innerHeight;
            // Keep a wider bottom safe-zone on mobile: the FAB covers ~90px at the bottom,
            // so anything within that band is visually obscured and needs to be scrolled up.
            const bottomSafe = isMobile ? 110 : 60;
            const topSafe = isMobile ? 80 : 60;
            const needsScroll = elRect.top < topSafe || elRect.bottom > vh - bottomSafe;
            if (!needsScroll) {
                // Already comfortably in view — commit rect now, no wait
                setRect(elRect);
                return;
            }
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Short settle for the smooth scroll; measure the final rect
            setTimeout(() => {
                if (document.body.contains(el)) {
                    setRect(el.getBoundingClientRect());
                }
            }, 260);
        };

        // Try immediately — target is usually already mounted
        const immediate = findVisible();
        if (immediate) {
            applyElement(immediate);
            return;
        }

        // Fallback: fast poll for async-rendered targets
        let attempts = 0;
        const maxAttempts = 40;
        const interval = setInterval(() => {
            const el = findVisible();
            if (el) {
                applyElement(el);
                clearInterval(interval);
            } else if (++attempts >= maxAttempts) {
                clearInterval(interval);
                onNextStable();
            }
        }, 60);

        return () => clearInterval(interval);
    }, [step, onNextStable]);

    if (!step) return null;
    if (!anchorEl || !rect || !document.body.contains(anchorEl)) return null;

    const stepLabel = isRtl
        ? `${totalSteps} / ${currentStep + 1}`
        : `${currentStep + 1} / ${totalSteps}`;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const viewportArea = vw * vh;
    const targetArea = rect.width * rect.height;
    const isLargeTarget = targetArea / viewportArea > (isMobile ? 0.7 : 0.5);

    const placement = (() => {
        if (step.placement === 'left') return isRtl ? 'right' as const : 'left' as const;
        if (step.placement === 'right') return isRtl ? 'left' as const : 'right' as const;
        return step.placement;
    })();

    const cardPos = computeCardPosition(rect, placement, vw, vh, isMobile, isLargeTarget);

    return (
        <>
            {/* Click-catch layer — blocks interaction with the app; does NOT dismiss the tour.
                Only the Skip Tour link or the Done button end the tour. */}
            <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: (thm) => thm.zIndex.tooltip - 2,
                    backgroundColor: isLargeTarget ? 'rgba(0, 0, 0, 0.45)' : 'transparent',
                    transition: `background-color ${SLIDE_MS}ms ${SLIDE}`,
                }}
            />

            {/* Animated spotlight — slides between targets */}
            {!isLargeTarget && (
                <Box sx={{
                    position: 'fixed',
                    top: rect.top - 6,
                    left: rect.left - 6,
                    width: rect.width + 12,
                    height: rect.height + 12,
                    borderRadius: '12px',
                    boxShadow: isMobile
                        ? '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 0 3px rgba(13, 71, 161, 0.5)'
                        : '0 0 0 9999px rgba(0, 0, 0, 0.35), 0 0 0 3px rgba(13, 71, 161, 0.35)',
                    transition: `top ${SLIDE_MS}ms ${SLIDE}, left ${SLIDE_MS}ms ${SLIDE}, width ${SLIDE_MS}ms ${SLIDE}, height ${SLIDE_MS}ms ${SLIDE}, box-shadow ${SLIDE_MS}ms ${SLIDE}`,
                    pointerEvents: 'none',
                    zIndex: (thm) => thm.zIndex.tooltip - 1,
                }} />
            )}

            {/* Card — slides from previous position to new position */}
            <Box sx={{
                position: 'fixed',
                top: `${cardPos.top}px`,
                left: `${cardPos.left}px`,
                width: `${CARD_W}px`,
                transition: `top ${SLIDE_MS}ms ${SLIDE}, left ${SLIDE_MS}ms ${SLIDE}`,
                zIndex: (thm) => thm.zIndex.tooltip + 1,
                willChange: 'top, left',
            }}>
                <TooltipCard
                    step={step} stepLabel={stepLabel} isRtl={isRtl}
                    currentStep={currentStep} isLastStep={isLastStep}
                    onNext={onNext} onPrev={onPrev} onSkip={onSkip} t={t}
                />
            </Box>
        </>
    );
}

function computeCardPosition(
    rect: DOMRect,
    placement: 'top' | 'bottom' | 'left' | 'right',
    vw: number,
    vh: number,
    isMobile: boolean,
    isLargeTarget: boolean,
): { top: number; left: number } {
    // Centered when target is too big to point at meaningfully
    if (isLargeTarget) {
        return {
            top: Math.max(MARGIN, vh / 2 - CARD_H / 2),
            left: Math.max(MARGIN, vw / 2 - CARD_W / 2),
        };
    }

    // On mobile, always pin horizontally centered and choose top/bottom based on rect position
    if (isMobile) {
        const rectCenterY = rect.top + rect.height / 2;
        const showAtBottom = rectCenterY < vh / 2;
        return {
            top: showAtBottom ? vh - CARD_H - MARGIN : MARGIN,
            left: Math.max(MARGIN, vw / 2 - CARD_W / 2),
        };
    }

    // Desktop: position relative to target per placement
    let top: number;
    let left: number;
    switch (placement) {
        case 'top':
            top = rect.top - CARD_H - OFFSET;
            left = rect.left + rect.width / 2 - CARD_W / 2;
            break;
        case 'bottom':
            top = rect.bottom + OFFSET;
            left = rect.left + rect.width / 2 - CARD_W / 2;
            break;
        case 'left':
            top = rect.top + rect.height / 2 - CARD_H / 2;
            left = rect.left - CARD_W - OFFSET;
            break;
        case 'right':
        default:
            top = rect.top + rect.height / 2 - CARD_H / 2;
            left = rect.right + OFFSET;
            break;
    }

    // If the requested placement is off-screen, flip to the opposite side
    if (top < MARGIN) top = rect.bottom + OFFSET;
    if (top + CARD_H + MARGIN > vh) top = rect.top - CARD_H - OFFSET;
    if (left < MARGIN) left = rect.right + OFFSET;
    if (left + CARD_W + MARGIN > vw) left = rect.left - CARD_W - OFFSET;

    // Final clamp to viewport
    top = Math.max(MARGIN, Math.min(vh - CARD_H - MARGIN, top));
    left = Math.max(MARGIN, Math.min(vw - CARD_W - MARGIN, left));
    return { top, left };
}

/** Shared tooltip card content */
function TooltipCard({
    step, stepLabel, isRtl, currentStep, isLastStep,
    onNext, onPrev, onSkip, t,
}: {
    step: TourStep; stepLabel: string; isRtl: boolean;
    currentStep: number; isLastStep: boolean;
    onNext: () => void; onPrev: () => void; onSkip: () => void;
    t: (key: string) => string;
}) {
    return (
        <Paper
            data-onboarding-card
            elevation={8}
            onClick={(e) => e.stopPropagation()}
            sx={{
                p: 2.5,
                width: CARD_W,
                maxWidth: 'calc(100vw - 32px)',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '16px' }}>
                    {t(step.titleKey)}
                </Typography>
                <Box
                    sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        px: 1,
                        py: 0.25,
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        ml: 1,
                    }}
                >
                    <span dir="ltr">{stepLabel}</span>
                </Box>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, mb: 2.25, fontSize: '13.5px' }}>
                {t(step.bodyKey)}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                    component="span"
                    onClick={(e) => { e.stopPropagation(); onSkip(); }}
                    sx={{
                        fontSize: '12px',
                        color: 'primary.main',
                        fontWeight: 500,
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                    }}
                >
                    {t('onboarding.skipTour')}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    {currentStep > 0 && (
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => { e.stopPropagation(); onPrev(); }}
                            sx={{ borderRadius: '24px', textTransform: 'none', fontSize: '13px', px: 2 }}
                        >
                            {t('onboarding.back')}
                        </Button>
                    )}
                    <Button
                        size="small"
                        variant="contained"
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                        sx={{ borderRadius: '24px', textTransform: 'none', fontSize: '13px', fontWeight: 600, px: 2.5 }}
                    >
                        {isLastStep ? t('onboarding.done') : t('onboarding.next')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}
