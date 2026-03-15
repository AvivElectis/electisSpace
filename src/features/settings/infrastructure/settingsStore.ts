import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { SettingsData, LogoConfig, SolumMappingConfig } from '../domain/types';
import type { WorkingMode } from '@shared/domain/types';
import { createDefaultSettings } from '../domain/businessRules';
import { settingsService } from '@shared/infrastructure/services/settingsService';
import { fieldMappingService } from '@shared/infrastructure/services/fieldMappingService';
import { logger } from '@shared/infrastructure/services/logger';

let fetchSeq = 0;

interface SettingsStore {
    // State
    settings: SettingsData;
    passwordHash: string | null;
    isLocked: boolean;
    activeStoreId: string | null;
    activeCompanyId: string | null;
    syncCount: number;

    // Derived
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
    setActiveCompanyId: (companyId: string | null) => void;
    fetchSettingsFromServer: (storeId: string, companyId: string) => Promise<void>;
    saveSettingsToServer: () => Promise<void>;
    saveCompanySettingsToServer: (updates: Partial<SettingsData>) => Promise<void>;

    // Field mapping server sync (company-level)
    fetchFieldMappingsFromServer: (companyId: string) => Promise<void>;
    saveFieldMappingsToServer: (companyId?: string) => Promise<void>;
    updateFieldMappings: (updates: Partial<SolumMappingConfig>) => void;

    // Article format server sync (company-level)
    fetchArticleFormatFromServer: (companyId: string) => Promise<void>;
    saveArticleFormatToServer: (companyId?: string) => Promise<void>;
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
                activeCompanyId: null,
                syncCount: 0,

                // Derived
                get isSyncing() { return get().syncCount > 0; },

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
                        activeStoreId: null,
                        activeCompanyId: null,
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

                setActiveCompanyId: (companyId) => set({ activeCompanyId: companyId }, false, 'setActiveCompanyId'),

                fetchSettingsFromServer: async (storeId: string, companyId: string) => {
                    const prevCompanyId = get().activeCompanyId;
                    const prevStoreId = get().activeStoreId;

                    // Clear store-level data on any store switch
                    if (prevStoreId && prevStoreId !== storeId) {
                        set((state) => ({
                            settings: {
                                ...state.settings,
                                solumConfig: undefined,
                            }
                        }), false, 'fetchSettings/clearStaleStoreData');
                    }

                    // Clear company-level data on company switch
                    if (prevCompanyId && prevCompanyId !== companyId) {
                        set((state) => ({
                            settings: {
                                ...state.settings,
                                solumMappingConfig: undefined,
                                solumArticleFormat: undefined,
                            }
                        }), false, 'fetchSettings/clearStaleCompanyData');
                    }

                    const mySeq = ++fetchSeq;
                    set(s => ({ syncCount: s.syncCount + 1 }), false, 'fetchSettings/start');
                    try {
                        const [settingsResponse, companySettingsResponse, fieldMappingsResponse, articleFormatResponse] = await Promise.all([
                            settingsService.getStoreSettings(storeId).catch(() => ({ settings: {} })),
                            settingsService.getCompanySettings(companyId).catch(() => ({ settings: {} })),
                            fieldMappingService.getFieldMappings(companyId).catch(() => ({ fieldMappings: null })),
                            fieldMappingService.getArticleFormat(companyId).catch(() => ({ articleFormat: null })),
                        ]);

                        if (fetchSeq !== mySeq) return;

                        const serverSettings = settingsResponse.settings as Partial<SettingsData>;
                        const companySettings = companySettingsResponse.settings as Partial<SettingsData>;

                        const updates: Partial<SettingsData> = {};

                        if (serverSettings && Object.keys(serverSettings).length > 0) {
                            Object.assign(updates, serverSettings);
                            // Remove logos from store-level settings — logos come from company settings only
                            // (store can override via storeLogoOverride, handled below)
                            delete updates.logos;
                        }

                        if (companySettings && Object.keys(companySettings).length > 0) {
                            if (companySettings.logos) {
                                updates.logos = companySettings.logos;
                            }
                            if (serverSettings.storeLogoOverride) {
                                const override = serverSettings.storeLogoOverride as LogoConfig;
                                updates.logos = {
                                    ...(updates.logos || {}),
                                    ...(override.logo1 ? { logo1: override.logo1 } : {}),
                                    ...(override.logo2 ? { logo2: override.logo2 } : {}),
                                };
                            }
                            if (companySettings.csvConfig) {
                                updates.csvConfig = {
                                    ...(updates.csvConfig || {}),
                                    ...companySettings.csvConfig,
                                } as SettingsData['csvConfig'];
                            }
                            if (companySettings.peopleManagerEnabled !== undefined) {
                                updates.peopleManagerEnabled = companySettings.peopleManagerEnabled;
                            }
                            if (companySettings.autoSyncEnabled !== undefined) {
                                updates.autoSyncEnabled = companySettings.autoSyncEnabled;
                            }
                            if (companySettings.autoSyncInterval !== undefined) {
                                updates.autoSyncInterval = companySettings.autoSyncInterval;
                            }
                            if (companySettings.appName !== undefined) {
                                updates.appName = companySettings.appName;
                            }
                            if (companySettings.appSubtitle !== undefined) {
                                updates.appSubtitle = companySettings.appSubtitle;
                            }
                            if (companySettings.spaceType) {
                                updates.spaceType = companySettings.spaceType;
                            }
                        }

                        if (articleFormatResponse.articleFormat) {
                            updates.solumArticleFormat = articleFormatResponse.articleFormat as SettingsData['solumArticleFormat'];
                            logger.info('SettingsStore', 'Article format loaded from server (company-level)', { companyId });
                        }

                        if (fieldMappingsResponse.fieldMappings && Object.keys(fieldMappingsResponse.fieldMappings).length > 0) {
                            const serverMappings = { ...fieldMappingsResponse.fieldMappings } as SolumMappingConfig;
                            if (!serverMappings.mappingInfo && (articleFormatResponse.articleFormat as any)?.mappingInfo) {
                                serverMappings.mappingInfo = (articleFormatResponse.articleFormat as any).mappingInfo;
                            }
                            updates.solumMappingConfig = serverMappings;
                            logger.info('SettingsStore', 'Field mappings loaded from server (company-level)', { companyId });
                        }

                        if (Object.keys(updates).length > 0) {
                            set((state) => {
                                const mergedSettings = {
                                    ...state.settings,
                                    ...updates,
                                };
                                const localSolumConfig = state.settings.solumConfig;
                                if (localSolumConfig || updates.solumConfig) {
                                    mergedSettings.solumConfig = {
                                        ...(localSolumConfig || {}),
                                        ...(updates.solumConfig || {}),
                                        tokens: localSolumConfig?.tokens,
                                        isConnected: localSolumConfig?.isConnected || false,
                                        lastConnected: localSolumConfig?.lastConnected,
                                        lastRefreshed: localSolumConfig?.lastRefreshed,
                                        storeSummary: localSolumConfig?.storeSummary,
                                    } as SettingsData['solumConfig'];
                                }

                                if (updates.solumMappingConfig) {
                                    mergedSettings.solumMappingConfig = updates.solumMappingConfig as SolumMappingConfig;
                                }
                                return {
                                    settings: mergedSettings,
                                    activeStoreId: storeId,
                                    activeCompanyId: companyId,
                                };
                            }, false, 'fetchSettings/success');
                            logger.info('SettingsStore', 'Settings loaded from server', { storeId, companyId });
                        } else {
                            set({ activeStoreId: storeId, activeCompanyId: companyId }, false, 'fetchSettings/empty');
                            logger.info('SettingsStore', 'No server settings found, using local', { storeId, companyId });
                        }
                    } finally {
                        set(s => ({ syncCount: Math.max(0, s.syncCount - 1) }), false, 'fetchSettings/end');
                    }
                },

                saveSettingsToServer: async () => {
                    const { activeStoreId, settings } = get();
                    if (!activeStoreId) {
                        logger.warn('SettingsStore', 'No active store ID, skipping server save');
                        return;
                    }

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { solumConfig, solumMappingConfig, solumArticleFormat, ...otherSettings } = settings;

                    let sanitizedSolumConfig: Record<string, unknown> | undefined = undefined;
                    if (solumConfig) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { username, password, tokens, isConnected, lastConnected, storeSummary, lastRefreshed, ...safeConfig } = solumConfig;
                        sanitizedSolumConfig = safeConfig;
                    }

                    const settingsForServer = {
                        ...otherSettings,
                        solumConfig: sanitizedSolumConfig,
                    } as unknown as Partial<SettingsData>;

                    set(s => ({ syncCount: s.syncCount + 1 }), false, 'saveSettings/start');
                    try {
                        const { activeCompanyId } = get();
                        const companyWideSettings: Partial<SettingsData> = {};
                        if (otherSettings.logos) companyWideSettings.logos = otherSettings.logos;
                        if (otherSettings.csvConfig) companyWideSettings.csvConfig = otherSettings.csvConfig;
                        if (otherSettings.peopleManagerEnabled !== undefined) companyWideSettings.peopleManagerEnabled = otherSettings.peopleManagerEnabled;
                        if (otherSettings.autoSyncEnabled !== undefined) companyWideSettings.autoSyncEnabled = otherSettings.autoSyncEnabled;
                        if (otherSettings.autoSyncInterval !== undefined) companyWideSettings.autoSyncInterval = otherSettings.autoSyncInterval;
                        if (otherSettings.appName !== undefined) companyWideSettings.appName = otherSettings.appName;
                        if (otherSettings.appSubtitle !== undefined) companyWideSettings.appSubtitle = otherSettings.appSubtitle;
                        if (otherSettings.spaceType) companyWideSettings.spaceType = otherSettings.spaceType;

                        const savePromises: Promise<unknown>[] = [
                            settingsService.updateStoreSettings(activeStoreId, settingsForServer),
                        ];
                        if (activeCompanyId && Object.keys(companyWideSettings).length > 0) {
                            savePromises.push(
                                settingsService.updateCompanySettings(activeCompanyId, companyWideSettings)
                            );
                        }
                        await Promise.all(savePromises);
                        logger.info('SettingsStore', 'Settings saved to server (store + company)', { storeId: activeStoreId, companyId: activeCompanyId });
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to save settings to server', { error });
                    } finally {
                        set(s => ({ syncCount: Math.max(0, s.syncCount - 1) }), false, 'saveSettings/end');
                    }
                },

                saveCompanySettingsToServer: async (updates: Partial<SettingsData>) => {
                    const { activeCompanyId } = get();
                    if (!activeCompanyId) {
                        logger.warn('SettingsStore', 'No active company ID, skipping company settings save');
                        return;
                    }

                    set(s => ({ syncCount: s.syncCount + 1 }), false, 'saveCompanySettings/start');
                    try {
                        await settingsService.updateCompanySettings(activeCompanyId, updates);
                        logger.info('SettingsStore', 'Company settings saved to server', { companyId: activeCompanyId });
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to save company settings to server', { error });
                    } finally {
                        set(s => ({ syncCount: Math.max(0, s.syncCount - 1) }), false, 'saveCompanySettings/end');
                    }
                },

                // Field mapping server sync (company-level)
                fetchFieldMappingsFromServer: async (companyId: string) => {
                    set(s => ({ syncCount: s.syncCount + 1 }), false, 'fetchFieldMappings/start');
                    try {
                        const response = await fieldMappingService.getFieldMappings(companyId);
                        if (response.fieldMappings && Object.keys(response.fieldMappings).length > 0) {
                            set((state) => ({
                                settings: {
                                    ...state.settings,
                                    solumMappingConfig: response.fieldMappings as SolumMappingConfig,
                                },
                            }), false, 'fetchFieldMappings/success');
                            logger.info('SettingsStore', 'Field mappings loaded from server (company-level)', { companyId });
                        } else {
                            logger.info('SettingsStore', 'No field mappings on server, using local', { companyId });
                        }
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to fetch field mappings from server', { error });
                    } finally {
                        set(s => ({ syncCount: Math.max(0, s.syncCount - 1) }), false, 'fetchFieldMappings/end');
                    }
                },

                saveFieldMappingsToServer: async (companyId?: string) => {
                    const { activeCompanyId, settings } = get();
                    const targetCompanyId = companyId || activeCompanyId;

                    if (!targetCompanyId) {
                        logger.warn('SettingsStore', 'No company ID, skipping field mappings save');
                        return;
                    }

                    const { solumMappingConfig } = settings;
                    if (!solumMappingConfig) {
                        logger.warn('SettingsStore', 'No field mappings to save');
                        return;
                    }

                    set(s => ({ syncCount: s.syncCount + 1 }), false, 'saveFieldMappings/start');
                    try {
                        await fieldMappingService.updateFieldMappings(targetCompanyId, solumMappingConfig);
                        logger.info('SettingsStore', 'Field mappings saved to server (company-level)', { companyId: targetCompanyId });
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to save field mappings to server', { error });
                    } finally {
                        set(s => ({ syncCount: Math.max(0, s.syncCount - 1) }), false, 'saveFieldMappings/end');
                    }
                },

                // Article format server sync (company-level)
                fetchArticleFormatFromServer: async (companyId: string) => {
                    set(s => ({ syncCount: s.syncCount + 1 }), false, 'fetchArticleFormat/start');
                    try {
                        const response = await fieldMappingService.getArticleFormat(companyId);
                        if (response.articleFormat) {
                            set((state) => ({
                                settings: {
                                    ...state.settings,
                                    solumArticleFormat: response.articleFormat as SettingsData['solumArticleFormat'],
                                },
                            }), false, 'fetchArticleFormat/success');
                            logger.info('SettingsStore', 'Article format loaded from server (company-level)', { companyId });
                        }
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to fetch article format from server', { error });
                    } finally {
                        set(s => ({ syncCount: Math.max(0, s.syncCount - 1) }), false, 'fetchArticleFormat/end');
                    }
                },

                saveArticleFormatToServer: async (companyId?: string) => {
                    const { activeCompanyId, settings } = get();
                    const targetCompanyId = companyId || activeCompanyId;

                    if (!targetCompanyId) {
                        logger.warn('SettingsStore', 'No company ID, skipping article format save');
                        return;
                    }

                    const { solumArticleFormat } = settings;
                    if (!solumArticleFormat) {
                        logger.warn('SettingsStore', 'No article format to save');
                        return;
                    }

                    set(s => ({ syncCount: s.syncCount + 1 }), false, 'saveArticleFormat/start');
                    try {
                        await fieldMappingService.updateArticleFormat(targetCompanyId, solumArticleFormat);
                        logger.info('SettingsStore', 'Article format saved to server (company-level)', { companyId: targetCompanyId });
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to save article format to server', { error });
                    } finally {
                        set(s => ({ syncCount: Math.max(0, s.syncCount - 1) }), false, 'saveArticleFormat/end');
                    }
                },

                updateFieldMappings: (updates: Partial<SolumMappingConfig>) =>
                    set((state) => ({
                        settings: {
                            ...state.settings,
                            solumMappingConfig: {
                                ...state.settings.solumMappingConfig,
                                ...updates,
                            } as SolumMappingConfig,
                        }
                    }), false, 'updateFieldMappings'),
            }),
            {
                name: 'settings-store',
                partialize: (state) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { solumConfig, logos, storeLogoOverride, ...otherSettings } = state.settings;
                    let cleanSolumConfig = solumConfig;
                    if (solumConfig) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { tokens, isConnected, lastConnected, lastRefreshed, storeSummary, ...persistableConfig } = solumConfig;
                        cleanSolumConfig = persistableConfig as typeof solumConfig;
                    }
                    return {
                        // Don't persist logos — always fetch fresh from server to prevent cross-company leaks
                        settings: { ...otherSettings, solumConfig: cleanSolumConfig, logos: {} },
                        passwordHash: state.passwordHash,
                        activeStoreId: state.activeStoreId,
                        activeCompanyId: state.activeCompanyId,
                        // Don't persist isLocked or syncCount
                    };
                },
            }
        ),
        { name: 'SettingsStore' }
    )
);
