import { create } from 'zustand';
import type { FeatureTour } from '@shared/domain/onboardingTypes';
import { ONBOARDING_STORAGE_KEY } from '@shared/domain/onboardingTypes';

interface OnboardingState {
    completedTours: Partial<Record<FeatureTour, boolean>>;
    activeTour: FeatureTour | null;
    currentStep: number;

    startTour: (tour: FeatureTour) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTour: () => void;
    completeTour: () => void;
    resetAllTours: () => void;
    loadCompletedTours: () => void;
    isTourCompleted: (tour: FeatureTour) => boolean;
}

function persistCompleted(completedTours: Partial<Record<FeatureTour, boolean>>) {
    if (Object.keys(completedTours).length === 0) {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } else {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(completedTours));
    }
}

function readCompleted(): Partial<Record<FeatureTour, boolean>> {
    try {
        const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
    completedTours: readCompleted(),
    activeTour: null,
    currentStep: 0,

    startTour: (tour) => {
        if (get().completedTours[tour]) return;
        set({ activeTour: tour, currentStep: 0 });
    },

    nextStep: () => {
        set((state) => ({ currentStep: state.currentStep + 1 }));
    },

    prevStep: () => {
        set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) }));
    },

    skipTour: () => {
        const { activeTour, completedTours } = get();
        if (!activeTour) return;
        const updated = { ...completedTours, [activeTour]: true };
        persistCompleted(updated);
        set({ activeTour: null, currentStep: 0, completedTours: updated });
    },

    completeTour: () => {
        const { activeTour, completedTours } = get();
        if (!activeTour) return;
        const updated = { ...completedTours, [activeTour]: true };
        persistCompleted(updated);
        set({ activeTour: null, currentStep: 0, completedTours: updated });
    },

    resetAllTours: () => {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        set({ completedTours: {}, activeTour: null, currentStep: 0 });
    },

    loadCompletedTours: () => {
        set({ completedTours: readCompleted() });
    },

    isTourCompleted: (tour) => {
        return get().completedTours[tour] === true;
    },
}));
