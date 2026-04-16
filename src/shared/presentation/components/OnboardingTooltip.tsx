// src/shared/presentation/components/OnboardingTooltip.tsx
import { useEffect, useState, useCallback } from 'react';
import { Popper, Paper, Typography, Button, Box, useMediaQuery, useTheme as useMuiTheme } from '@mui/material';
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
    const isRtl = i18n.language === 'he';

    const onNextStable = useCallback(onNext, [onNext]);

    // Find target element when step changes
    useEffect(() => {
        if (!step) {
            setAnchorEl(null);
            setRect(null);
            return;
        }

        let attempts = 0;
        const maxAttempts = 15;
        const interval = setInterval(() => {
            const el = document.querySelector<HTMLElement>(step.targetSelector);
            if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
                setAnchorEl(el);
                if (!isMobile) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                setTimeout(() => setRect(el.getBoundingClientRect()), isMobile ? 100 : 600);
                clearInterval(interval);
            } else if (++attempts >= maxAttempts) {
                clearInterval(interval);
                onNextStable();
            }
        }, 300);

        return () => clearInterval(interval);
    }, [step, onNextStable, isMobile]);

    if (!step) return null;

    // On mobile: always show centered tooltip with plain overlay (no spotlight, no Popper)
    // On desktop: wait for anchor + rect, show spotlight if target is small enough
    if (isMobile) {
        return <MobileTooltip
            step={step} currentStep={currentStep} totalSteps={totalSteps}
            isLastStep={isLastStep} isRtl={isRtl}
            onNext={onNext} onPrev={onPrev} onSkip={onSkip} t={t}
        />;
    }

    // Desktop: need anchor element found
    if (!anchorEl || !rect || !document.body.contains(anchorEl)) return null;

    const placement = (() => {
        if (step.placement === 'left') return isRtl ? 'right' as const : 'left' as const;
        if (step.placement === 'right') return isRtl ? 'left' as const : 'right' as const;
        return step.placement;
    })();

    const stepLabel = isRtl
        ? `${totalSteps} / ${currentStep + 1}`
        : `${currentStep + 1} / ${totalSteps}`;

    const viewportArea = window.innerWidth * window.innerHeight;
    const targetArea = rect.width * rect.height;
    const isLargeTarget = targetArea / viewportArea > 0.5;

    return (
        <>
            {/* Overlay */}
            <Box
                onClick={(e) => { e.stopPropagation(); onSkip(); }}
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: (thm) => thm.zIndex.tooltip - 1,
                    ...(isLargeTarget
                        ? { backgroundColor: 'rgba(0, 0, 0, 0.35)' }
                        : {
                            '&::before': {
                                content: '""',
                                position: 'fixed',
                                top: rect.top - 6,
                                left: rect.left - 6,
                                width: rect.width + 12,
                                height: rect.height + 12,
                                borderRadius: '12px',
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35), 0 0 0 3px rgba(13, 71, 161, 0.25)',
                            },
                        }),
                }}
            />

            {/* Tooltip */}
            {isLargeTarget ? (
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
            ) : (
                <Popper
                    open
                    anchorEl={anchorEl}
                    placement={placement}
                    sx={{ zIndex: (thm) => thm.zIndex.tooltip + 1 }}
                    modifiers={[
                        { name: 'offset', options: { offset: [0, 16] } },
                        { name: 'preventOverflow', options: { padding: 16 } },
                    ]}
                >
                    <TooltipCard
                        step={step} stepLabel={stepLabel} isRtl={isRtl}
                        currentStep={currentStep} isLastStep={isLastStep}
                        onNext={onNext} onPrev={onPrev} onSkip={onSkip} t={t}
                    />
                </Popper>
            )}
        </>
    );
}

/** Mobile: centered tooltip with plain dark overlay, no spotlight */
function MobileTooltip({
    step, currentStep, totalSteps, isLastStep, isRtl,
    onNext, onPrev, onSkip, t,
}: {
    step: TourStep; currentStep: number; totalSteps: number;
    isLastStep: boolean; isRtl: boolean;
    onNext: () => void; onPrev: () => void; onSkip: () => void;
    t: (key: string) => string;
}) {
    const stepLabel = isRtl
        ? `${totalSteps} / ${currentStep + 1}`
        : `${currentStep + 1} / ${totalSteps}`;

    return (
        <>
            <Box
                onClick={(e) => { e.stopPropagation(); onSkip(); }}
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: (thm) => thm.zIndex.tooltip - 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                }}
            />
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
