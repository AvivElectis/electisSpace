import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SettingsData, LogoConfig } from '../domain/types';
import { createDefaultSettings } from '../domain/businessRules';

interface SettingsStore {
    // State
    settings: SettingsData;
    passwordHash: string | null;
    isLocked: boolean;

    // Actions
    setSettings: (settings: SettingsData) => void;
    updateSettings: (updates: Partial<SettingsData>) => void;
    setPasswordHash: (hash: string | null) => void;
    setLocked: (locked: boolean) => void;
    setLogos: (logos: LogoConfig) => void;
    updateLogo: (logoIndex: 1 | 2, base64: string) => void;
    deleteLogo: (logoIndex: 1 | 2) => void;
    resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            // Initial state
            settings: createDefaultSettings(),
            passwordHash: null,
            isLocked: false,

            // Actions
            setSettings: (settings) => set({ settings }),

            updateSettings: (updates) =>
                set((state) => ({
                    settings: { ...state.settings, ...updates },
                })),

            setPasswordHash: (hash) => set({ passwordHash: hash }),

            setLocked: (locked) => set({ isLocked: locked }),

            setLogos: (logos) =>
                set((state) => ({
                    settings: { ...state.settings, logos },
                })),

            updateLogo: (logoIndex, base64) =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        logos: {
                            ...state.settings.logos,
                            [`logo${logoIndex}`]: base64,
                        },
                    },
                })),

            deleteLogo: (logoIndex) =>
                set((state) => {
                    const newLogos = { ...state.settings.logos };
                    delete newLogos[`logo${logoIndex}` as keyof LogoConfig];
                    return {
                        settings: {
                            ...state.settings,
                            logos: newLogos,
                        },
                    };
                }),

            resetSettings: () =>
                set({
                    settings: createDefaultSettings(),
                    passwordHash: null,
                    isLocked: false,
                }),
        }),
        {
            name: 'settings-store',
            partialize: (state) => ({
                settings: state.settings,
                passwordHash: state.passwordHash,
                // Don't persist isLocked - always start unlocked
            }),
        }
    )
);
