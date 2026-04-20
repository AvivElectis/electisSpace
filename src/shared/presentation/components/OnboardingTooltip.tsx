// src/shared/presentation/components/OnboardingTooltip.tsx
import { useEffect, useState, useCallback } from 'react';
import { Popper, Paper, Typography, Button, Box, Fade, Grow, useMediaQuery, useTheme as useMuiTheme } from '@mui/material';
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
    const [cardVisible, setCardVisible] = useState(false);
    const isRtl = i18n.language === 'he';

    const onNextStable = useCallback(onNext, [onNext]);

    // Find target element when step changes.
    // Transition choreography: hide card → let spotlight slide to new rect → show card.
    useEffect(() => {
        if (!step) {
            setAnchorEl(null);
            setRect(null);
            setCardVisible(false);
            return;
        }

        setCardVisible(false);

        let attempts = 0;
        const maxAttempts = 15;
        const interval = setInterval(() => {
            const el = document.querySelector<HTMLElement>(step.targetSelector);
            if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
                setAnchorEl(el);
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    setRect(el.getBoundingClientRect());
                    setCardVisible(true);
                }, isMobile ? 350 : 600);
                clearInterval(interval);
            } else if (++attempts >= maxAttempts) {
                clearInterval(interval);
                onNextStable();
            }
        }, 300);

        return () => clearInterval(interval);
    }, [step, onNextStable, isMobile]);

    if (!step) return null;

    // Need anchor element + rect for both mobile and desktop (to draw spotlight)
    if (!anchorEl || !rect || !document.body.contains(anchorEl)) return null;

    const stepLabelShared = isRtl
        ? `${totalSteps} / ${currentStep + 1}`
        : `${currentStep + 1} / ${totalSteps}`;

    if (isMobile) {
        return <MobileTooltip
            step={step} rect={rect} stepLabel={stepLabelShared} cardVisible={cardVisible}
            currentStep={currentStep} isLastStep={isLastStep} isRtl={isRtl}
            onNext={onNext} onPrev={onPrev} onSkip={onSkip} t={t}
        />;
    }

    const placement = (() => {
        if (step.placement === 'left') return isRtl ? 'right' as const : 'left' as const;
        if (step.placement === 'right') return isRtl ? 'left' as const : 'right' as const;
        return step.placement;
    })();

    const stepLabel = stepLabelShared;

    const viewportArea = window.innerWidth * window.innerHeight;
    const targetArea = rect.width * rect.height;
    const isLargeTarget = targetArea / viewportArea > 0.5;

    return (
        <>
            {/* Click-catch layer — tapping anywhere skips the tour */}
            <Box
                onClick={(e) => { e.stopPropagation(); onSkip(); }}
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: (thm) => thm.zIndex.tooltip - 2,
                    backgroundColor: isLargeTarget ? 'rgba(0, 0, 0, 0.35)' : 'transparent',
                    transition: 'background-color 250ms ease',
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
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35), 0 0 0 3px rgba(13, 71, 161, 0.35)',
                    transition: 'top 320ms cubic-bezier(0.4, 0, 0.2, 1), left 320ms cubic-bezier(0.4, 0, 0.2, 1), width 320ms cubic-bezier(0.4, 0, 0.2, 1), height 320ms cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: 'none',
                    zIndex: (thm) => thm.zIndex.tooltip - 1,
                }} />
            )}

            {/* Tooltip card */}
            {isLargeTarget ? (
                <Grow in={cardVisible} timeout={{ enter: 260, exit: 160 }}>
                    <Box sx={{
                        position: 'fixed', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: (thm) => thm.zIndex.tooltip + 1,
                    }}>
                        <TooltipCard
                            step={step} stepLabel={stepLabel} isRtl={isRtl}
                            currentStep={currentStep} isLastStep={isLastStep}
                            onNext={onNext} onPrev={onPrev} onSkip={onSkip} t={t}
                        />
                    </Box>
                </Grow>
            ) : (
                <Popper
                    open={cardVisible}
                    anchorEl={anchorEl}
                    placement={placement}
                    transition
                    sx={{ zIndex: (thm) => thm.zIndex.tooltip + 1 }}
                    modifiers={[
                        { name: 'offset', options: { offset: [0, 16] } },
                        { name: 'preventOverflow', options: { padding: 16 } },
                    ]}
                >
                    {({ TransitionProps }) => (
                        <Grow {...TransitionProps} timeout={{ enter: 260, exit: 160 }}>
                            <Box>
                                <TooltipCard
                                    step={step} stepLabel={stepLabel} isRtl={isRtl}
                                    currentStep={currentStep} isLastStep={isLastStep}
                                    onNext={onNext} onPrev={onPrev} onSkip={onSkip} t={t}
                                />
                            </Box>
                        </Grow>
                    )}
                </Popper>
            )}
        </>
    );
}

/** Mobile: animated spotlight around target + card pinned to opposite half of screen */
function MobileTooltip({
    step, rect, stepLabel, cardVisible, currentStep, isLastStep, isRtl,
    onNext, onPrev, onSkip, t,
}: {
    step: TourStep; rect: DOMRect; stepLabel: string; cardVisible: boolean;
    currentStep: number; isLastStep: boolean; isRtl: boolean;
    onNext: () => void; onPrev: () => void; onSkip: () => void;
    t: (key: string) => string;
}) {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const targetFillsViewport = (rect.width * rect.height) / (vw * vh) > 0.7;
    const rectCenterY = rect.top + rect.height / 2;
    const cardAtBottom = rectCenterY < vh / 2;

    return (
        <>
            {/* Click-catch layer */}
            <Box
                onClick={(e) => { e.stopPropagation(); onSkip(); }}
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: (thm) => thm.zIndex.tooltip - 2,
                    backgroundColor: targetFillsViewport ? 'rgba(0, 0, 0, 0.45)' : 'transparent',
                    transition: 'background-color 250ms ease',
                }}
            />

            {/* Animated spotlight — slides between targets */}
            {!targetFillsViewport && (
                <Box sx={{
                    position: 'fixed',
                    top: rect.top - 6,
                    left: rect.left - 6,
                    width: rect.width + 12,
                    height: rect.height + 12,
                    borderRadius: '12px',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 0 3px rgba(13, 71, 161, 0.5)',
                    transition: 'top 320ms cubic-bezier(0.4, 0, 0.2, 1), left 320ms cubic-bezier(0.4, 0, 0.2, 1), width 320ms cubic-bezier(0.4, 0, 0.2, 1), height 320ms cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: 'none',
                    zIndex: (thm) => thm.zIndex.tooltip - 1,
                }} />
            )}

            {/* Card pinned to opposite half, fades + grows on each step */}
            <Fade in={cardVisible} timeout={{ enter: 240, exit: 160 }}>
                <Box sx={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    ...(targetFillsViewport
                        ? { top: '50%', transform: 'translateY(-50%)' }
                        : cardAtBottom
                            ? { bottom: 16 }
                            : { top: 16 }),
                    zIndex: (thm) => thm.zIndex.tooltip + 1,
                    display: 'flex',
                    justifyContent: 'center',
                    px: 2,
                    pointerEvents: 'none',
                    transition: 'top 260ms ease, bottom 260ms ease',
                }}>
                    <Box sx={{ pointerEvents: 'auto' }}>
                        <TooltipCard
                            step={step} stepLabel={stepLabel} isRtl={isRtl}
                            currentStep={currentStep} isLastStep={isLastStep}
                            onNext={onNext} onPrev={onPrev} onSkip={onSkip} t={t}
                        />
                    </Box>
                </Box>
            </Fade>
        </>
    );
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
            elevation={8}
            onClick={(e) => e.stopPropagation()}
            sx={{
                p: 2.5,
                width: 320,
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
