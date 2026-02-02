import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { SettingsData, LogoConfig } from '../domain/types';
import type { WorkingMode } from '@shared/domain/types';
import { createDefaultSettings } from '../domain/businessRules';
import { settingsService } from '@shared/infrastructure/services/settingsService';
import { logger } from '@shared/infrastructure/services/logger';

interface SettingsStore {
    // State
    settings: SettingsData;
    passwordHash: string | null;
    isLocked: boolean;
    activeStoreId: string | null;
    isSyncing: boolean;

    // Actions
    setSettings: (settings: SettingsData) => void;
    updateSettings: (updates: Partial<SettingsData>) => void;
    setPasswordHash: (hash: string | null) => void;
    setLocked: (locked: boolean) => void;
    setLogos: (logos: LogoConfig) => void;
    updateLogo: (logoIndex: 1 | 2, base64: string) => void;
    deleteLogo: (logoIndex: 1 | 2) => void;
    resetSettings: () => void;

    // Cleanup actions
    clearModeCredentials: (mode: WorkingMode) => void;
    clearFieldMappings: () => void;

    // Server sync actions
    setActiveStoreId: (storeId: string | null) => void;
    fetchSettingsFromServer: (storeId: string) => Promise<void>;
    saveSettingsToServer: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                settings: createDefaultSettings(),
                passwordHash: null,
                isLocked: false,
                activeStoreId: null,
                isSyncing: false,

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

                // Cleanup actions
                clearModeCredentials: (mode) =>
                    set((state) => ({
                        settings: {
                            ...state.settings,
                            ...(mode === 'SOLUM_API' ? {
                                solumConfig: undefined,
                                solumMappingConfig: undefined,
                                solumArticleFormat: undefined
                            } : {})
                        }
                    }), false, 'clearModeCredentials'),

                clearFieldMappings: () =>
                    set((state) => ({
                        settings: {
                            ...state.settings,
                            solumMappingConfig: undefined,
                        }
                    }), false, 'clearFieldMappings'),

                // Server sync actions
                setActiveStoreId: (storeId) => set({ activeStoreId: storeId }, false, 'setActiveStoreId'),

                fetchSettingsFromServer: async (storeId: string) => {
                    set({ isSyncing: true }, false, 'fetchSettings/start');
                    try {
                        const response = await settingsService.getStoreSettings(storeId);
                        const serverSettings = response.settings as Partial<SettingsData>;
                        
                        // Merge server settings with defaults (server takes priority)
                        if (serverSettings && Object.keys(serverSettings).length > 0) {
                            set((state) => ({
                                settings: {
                                    ...state.settings,
                                    ...serverSettings,
                                },
                                activeStoreId: storeId,
                                isSyncing: false,
                            }), false, 'fetchSettings/success');
                            logger.info('SettingsStore', 'Settings loaded from server', { storeId });
                        } else {
                            set({ activeStoreId: storeId, isSyncing: false }, false, 'fetchSettings/empty');
                            logger.info('SettingsStore', 'No server settings found, using local', { storeId });
                        }
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to fetch settings from server', { error });
                        set({ isSyncing: false }, false, 'fetchSettings/error');
                    }
                },

                saveSettingsToServer: async () => {
                    const { activeStoreId, settings } = get();
                    if (!activeStoreId) {
                        logger.warn('SettingsStore', 'No active store ID, skipping server save');
                        return;
                    }

                    // Prepare settings for server - exclude sensitive data
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { solumConfig, ...otherSettings } = settings;
                    
                    // Build sanitized solumConfig without sensitive fields
                    let sanitizedSolumConfig: Record<string, unknown> | undefined = undefined;
                    if (solumConfig) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { username, password, tokens, ...safeConfig } = solumConfig;
                        sanitizedSolumConfig = safeConfig;
                    }

                    // Cast to unknown first to bypass strict type checking for server payload
                    const settingsForServer = {
                        ...otherSettings,
                        solumConfig: sanitizedSolumConfig,
                    } as unknown as Partial<SettingsData>;

                    set({ isSyncing: true }, false, 'saveSettings/start');
                    try {
                        await settingsService.updateStoreSettings(activeStoreId, settingsForServer);
                        set({ isSyncing: false }, false, 'saveSettings/success');
                        logger.info('SettingsStore', 'Settings saved to server', { storeId: activeStoreId });
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to save settings to server', { error });
                        set({ isSyncing: false }, false, 'saveSettings/error');
                        // Settings remain in local state even if server save fails
                    }
                },
            }),
            {
                name: 'settings-store',
                partialize: (state) => ({
                    settings: state.settings,
                    passwordHash: state.passwordHash,
                    activeStoreId: state.activeStoreId,
                    // Don't persist isLocked or isSyncing
                }),
            }
        ),
        { name: 'SettingsStore' }
    )
);
