import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
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
    devtools(
        persist(
            (set) => ({
                // Initial state
                settings: createDefaultSettings(),
                passwordHash: null,
                isLocked: false,

                // Actions
                setSettings: (settings) => set({ settings }, false, 'setSettings'),

                updateSettings: (updates) =>
                    set((state) => ({
                        settings: { ...state.settings, ...updates },
                    }), false, 'updateSettings'),

                setPasswordHash: (hash) => set({ passwordHash: hash }, false, 'setPasswordHash'),

                setLocked: (locked) => set({ isLocked: locked }, false, 'setLocked'),

                setLogos: (logos) =>
                    set((state) => ({
                        settings: { ...state.settings, logos },
                    }), false, 'setLogos'),

                updateLogo: (logoIndex, base64) =>
                    set((state) => ({
                        settings: {
                            ...state.settings,
                            logos: {
                                ...state.settings.logos,
                                [`logo${logoIndex}`]: base64,
                            },
                        },
                    }), false, 'updateLogo'),

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
                    }, false, 'deleteLogo'),

                resetSettings: () =>
                    set({
                        settings: createDefaultSettings(),
                        passwordHash: null,
                        isLocked: false,
                    }, false, 'resetSettings'),
            }),
            {
                name: 'settings-store',
                partialize: (state) => ({
                    settings: state.settings,
                    passwordHash: state.passwordHash,
                    // Don't persist isLocked - always start unlocked
                }),
            }
        ),
        { name: 'SettingsStore' }
    )
);
