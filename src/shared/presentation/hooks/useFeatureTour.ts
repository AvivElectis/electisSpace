// src/shared/presentation/hooks/useFeatureTour.ts
import { useEffect, useMemo } from 'react';
import { useOnboardingStore } from '@shared/application/onboardingStore';
import { getTourSteps, type FeatureTour, type TourStep } from '@shared/domain/onboardingTypes';
import { useAuthContext } from '@features/auth/application/useAuthContext';

interface UseFeatureTourOptions {
    tour: FeatureTour;
    /** For conference mode detection */
    isSimpleMode?: boolean;
    /** Delay before starting (ms) — gives the page time to render targets */
    delay?: number;
}

export function useFeatureTour({ tour, isSimpleMode = false, delay = 800 }: UseFeatureTourOptions) {
    const { startTour, isTourCompleted, activeTour, currentStep, nextStep, prevStep, skipTour, completeTour } =
        useOnboardingStore();
    const { canAccessFeature } = useAuthContext();

    // Filter steps by feature access
    const steps = useMemo(() => {
        const allSteps = getTourSteps(tour, isSimpleMode);
        return allSteps.filter((s) => !s.feature || canAccessFeature(s.feature));
    }, [tour, isSimpleMode, canAccessFeature]);

    // Auto-start tour on first visit
    useEffect(() => {
        if (isTourCompleted(tour)) return;
        const timer = setTimeout(() => startTour(tour), delay);
        return () => clearTimeout(timer);
    }, [tour, isTourCompleted, startTour, delay]);

    const isActive = activeTour === tour;
    const currentTourStep: TourStep | null = isActive ? steps[currentStep] ?? null : null;
    const isLastStep = isActive && currentStep >= steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            completeTour();
        } else {
            nextStep();
        }
    };

    return {
        isActive,
        currentStep,
        totalSteps: steps.length,
        currentTourStep,
        isLastStep,
        handleNext,
        handlePrev: prevStep,
        handleSkip: skipTour,
    };
}
