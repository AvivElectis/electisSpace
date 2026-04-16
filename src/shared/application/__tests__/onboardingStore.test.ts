import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOnboardingStore } from '../onboardingStore';
import { ONBOARDING_STORAGE_KEY } from '@shared/domain/onboardingTypes';

// Replace the vi.fn() localStorage mock from setup.ts with a functional implementation
const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    };
};

describe('onboardingStore', () => {
    beforeEach(() => {
        Object.defineProperty(global, 'localStorage', {
            value: createLocalStorageMock(),
            writable: true,
        });
        useOnboardingStore.setState({
            completedTours: {},
            activeTour: null,
            currentStep: 0,
        });
    });

    it('starts a tour and sets active state', () => {
        const { startTour } = useOnboardingStore.getState();
        startTour('dashboard');

        const state = useOnboardingStore.getState();
        expect(state.activeTour).toBe('dashboard');
        expect(state.currentStep).toBe(0);
    });

    it('does not start a completed tour', () => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ dashboard: true }));
        useOnboardingStore.getState().loadCompletedTours();
        useOnboardingStore.getState().startTour('dashboard');

        expect(useOnboardingStore.getState().activeTour).toBeNull();
    });

    it('advances to next step', () => {
        useOnboardingStore.getState().startTour('spaces');
        useOnboardingStore.getState().nextStep();

        expect(useOnboardingStore.getState().currentStep).toBe(1);
    });

    it('goes back to previous step', () => {
        useOnboardingStore.getState().startTour('spaces');
        useOnboardingStore.getState().nextStep();
        useOnboardingStore.getState().nextStep();
        useOnboardingStore.getState().prevStep();

        expect(useOnboardingStore.getState().currentStep).toBe(1);
    });

    it('does not go below step 0', () => {
        useOnboardingStore.getState().startTour('spaces');
        useOnboardingStore.getState().prevStep();

        expect(useOnboardingStore.getState().currentStep).toBe(0);
    });

    it('completes a tour and persists to localStorage', () => {
        useOnboardingStore.getState().startTour('dashboard');
        useOnboardingStore.getState().completeTour();

        const state = useOnboardingStore.getState();
        expect(state.activeTour).toBeNull();
        expect(state.completedTours.dashboard).toBe(true);

        const stored = JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) || '{}');
        expect(stored.dashboard).toBe(true);
    });

    it('skips a tour (same as complete)', () => {
        useOnboardingStore.getState().startTour('spaces');
        useOnboardingStore.getState().skipTour();

        expect(useOnboardingStore.getState().activeTour).toBeNull();
        expect(useOnboardingStore.getState().completedTours.spaces).toBe(true);
    });

    it('resets all tours and clears localStorage', () => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ dashboard: true, spaces: true }));
        useOnboardingStore.getState().loadCompletedTours();
        useOnboardingStore.getState().resetAllTours();

        expect(useOnboardingStore.getState().completedTours).toEqual({});
        expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
    });

    it('loads completed tours from localStorage', () => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ people: true, labels: true }));
        useOnboardingStore.getState().loadCompletedTours();

        const { completedTours } = useOnboardingStore.getState();
        expect(completedTours.people).toBe(true);
        expect(completedTours.labels).toBe(true);
        expect(completedTours.dashboard).toBeUndefined();
    });

    it('isTourCompleted returns correct value', () => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ dashboard: true }));
        useOnboardingStore.getState().loadCompletedTours();

        expect(useOnboardingStore.getState().isTourCompleted('dashboard')).toBe(true);
        expect(useOnboardingStore.getState().isTourCompleted('spaces')).toBe(false);
    });
});
