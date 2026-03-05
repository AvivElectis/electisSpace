import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '../theme/theme';

export interface AccessibilitySettings {
    fontSize: number;       // percentage: 100 = default, 125 = large, 150 = extra large
    highContrast: boolean;
    reducedMotion: boolean;
}

interface PreferencesState {
    themeMode: ThemeMode;
    accessibility: AccessibilitySettings;
    setThemeMode: (mode: ThemeMode) => void;
    setFontSize: (size: number) => void;
    setHighContrast: (on: boolean) => void;
    setReducedMotion: (on: boolean) => void;
    resetAccessibility: () => void;
}

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
    fontSize: 100,
    highContrast: false,
    reducedMotion: false,
};

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set) => ({
            themeMode: 'system' as ThemeMode,
            accessibility: { ...DEFAULT_ACCESSIBILITY },

            setThemeMode: (mode) => set({ themeMode: mode }),

            setFontSize: (size) =>
                set((state) => ({
                    accessibility: { ...state.accessibility, fontSize: size },
                })),

            setHighContrast: (on) =>
                set((state) => ({
                    accessibility: { ...state.accessibility, highContrast: on },
                })),

            setReducedMotion: (on) =>
                set((state) => ({
                    accessibility: { ...state.accessibility, reducedMotion: on },
                })),

            resetAccessibility: () =>
                set({ accessibility: { ...DEFAULT_ACCESSIBILITY } }),
        }),
        {
            name: 'compass-preferences',
        },
    ),
);
