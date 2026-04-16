// src/shared/presentation/components/OnboardingTooltip.tsx
import { useEffect, useState, useCallback } from 'react';
import { Popper, Paper, Typography, Button, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TourStep } from '@shared/domain/onboardingTypes';

interface OnboardingTooltipProps {
    /** The current step config, or null if tour is inactive */
    step: TourStep | null;
    /** Current step number (0-indexed) */
    currentStep: number;
    /** Total steps in this tour */
    totalSteps: number;
    /** Whether this is the last step */
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
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
    // Popper renders in a portal outside ThemeProvider, so useTheme() returns default LTR.
    // Use document.dir which is set by App.tsx based on i18n.language.
    const isRtl = document.dir === 'rtl';

    // Stable reference for onNext to avoid re-triggering effect
    const onNextRef = useCallback(onNext, [onNext]);

    // Find the target element when step changes
    useEffect(() => {
        if (!step) {
            setAnchorEl(null);
            setAnchorRect(null);
            return;
        }

        // Retry finding element (it may render after a delay)
        let attempts = 0;
        const maxAttempts = 15;
        const interval = setInterval(() => {
            const el = document.querySelector<HTMLElement>(step.targetSelector);
            if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
                setAnchorEl(el);
                setAnchorRect(el.getBoundingClientRect());
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Update rect after scroll settles
                setTimeout(() => setAnchorRect(el.getBoundingClientRect()), 400);
                clearInterval(interval);
            } else if (++attempts >= maxAttempts) {
                clearInterval(interval);
                // Target not found or has no size — skip this step silently
                onNextRef();
            }
        }, 300);

        return () => clearInterval(interval);
    }, [step, onNextRef]);

    // Validate anchor is still in the document layout
    if (!step || !anchorEl || !anchorRect || !document.body.contains(anchorEl)) return null;

    // Flip placement for RTL
    const placement = (() => {
        if (step.placement === 'left') return isRtl ? 'right' : 'left';
        if (step.placement === 'right') return isRtl ? 'left' : 'right';
        return step.placement;
    })();

    const stepLabel = isRtl
        ? `${totalSteps} / ${currentStep + 1}`
        : `${currentStep + 1} / ${totalSteps}`;

    // Skip spotlight for targets that cover most of the viewport (> 60% area)
    const viewportArea = window.innerWidth * window.innerHeight;
    const targetArea = anchorRect.width * anchorRect.height;
    const showSpotlight = targetArea / viewportArea < 0.6;

    return (
        <>
            {/* Spotlight: dark overlay with cutout around the target element */}
            <Box
                onClick={onSkip}
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: (thm) => thm.zIndex.tooltip - 1,
                    ...(showSpotlight ? {
                        '&::before': {
                            content: '""',
                            position: 'fixed',
                            top: anchorRect.top - 6,
                            left: anchorRect.left - 6,
                            width: anchorRect.width + 12,
                            height: anchorRect.height + 12,
                            borderRadius: '12px',
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35), 0 0 0 3px rgba(13, 71, 161, 0.25)',
                        },
                    } : {
                        backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    }),
                }}
            />

            {/* Tooltip */}
            <Popper
                open
                anchorEl={anchorEl}
                placement={placement}
                sx={{ zIndex: (theme) => theme.zIndex.tooltip + 1 }}
                modifiers={[
                    { name: 'offset', options: { offset: [0, 16] } },
                    { name: 'preventOverflow', options: { padding: 16 } },
                ]}
            >
                <Paper
                    elevation={8}
                    sx={{
                        p: 2.5,
                        width: 320,
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    {/* Header */}
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

                    {/* Body */}
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, mb: 2.25, fontSize: '13.5px' }}>
                        {t(step.bodyKey)}
                    </Typography>

                    {/* Footer */}
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
            </Popper>
        </>
    );
}
