// src/shared/presentation/components/OnboardingTooltip.tsx
import { useEffect, useState, useCallback } from 'react';
import { Popper, Paper, Typography, Button, Box } from '@mui/material';
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
    const { t } = useTranslation();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const isRtl = document.dir === 'rtl';

    const onNextStable = useCallback(onNext, [onNext]);

    // --- Find target element when step changes ---
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
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Set rect after scroll settles
                setTimeout(() => {
                    setRect(el.getBoundingClientRect());
                }, 600);
                clearInterval(interval);
            } else if (++attempts >= maxAttempts) {
                clearInterval(interval);
                onNextStable();
            }
        }, 300);

        return () => clearInterval(interval);
    }, [step, onNextStable]);

    if (!step || !anchorEl || !rect || !document.body.contains(anchorEl)) return null;

    // Flip placement for RTL
    const placement = (() => {
        if (step.placement === 'left') return isRtl ? 'right' : 'left';
        if (step.placement === 'right') return isRtl ? 'left' : 'right';
        return step.placement;
    })();

    const stepLabel = isRtl
        ? `${totalSteps} / ${currentStep + 1}`
        : `${currentStep + 1} / ${totalSteps}`;

    // For targets covering >50% of viewport, skip spotlight and center the tooltip
    const viewportArea = window.innerWidth * window.innerHeight;
    const targetArea = rect.width * rect.height;
    const isLargeTarget = targetArea / viewportArea > 0.5;

    return (
        <>
            {/* Overlay */}
            <Box
                onClick={onSkip}
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
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
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
                    {stepLabel}
                </Box>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, mb: 2.25, fontSize: '13.5px' }}>
                {t(step.bodyKey)}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                    component="span"
                    onClick={onSkip}
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
                            onClick={onPrev}
                            sx={{ borderRadius: '24px', textTransform: 'none', fontSize: '13px', px: 2 }}
                        >
                            {t('onboarding.back')}
                        </Button>
                    )}
                    <Button
                        size="small"
                        variant="contained"
                        onClick={onNext}
                        sx={{ borderRadius: '24px', textTransform: 'none', fontSize: '13px', fontWeight: 600, px: 2.5 }}
                    >
                        {isLastStep ? t('onboarding.done') : t('onboarding.next')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}
