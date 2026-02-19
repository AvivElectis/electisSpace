import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { SettingsData, LogoConfig, SolumMappingConfig } from '../domain/types';
import type { WorkingMode } from '@shared/domain/types';
import { createDefaultSettings } from '../domain/businessRules';
import { settingsService } from '@shared/infrastructure/services/settingsService';
import { fieldMappingService } from '@shared/infrastructure/services/fieldMappingService';
import { logger } from '@shared/infrastructure/services/logger';

interface SettingsStore {
    // State
    settings: SettingsData;
    passwordHash: string | null;
    isLocked: boolean;
    activeStoreId: string | null;
    activeCompanyId: string | null;
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
                
                setActiveCompanyId: (companyId) => set({ activeCompanyId: companyId }, false, 'setActiveCompanyId'),

                fetchSettingsFromServer: async (storeId: string, companyId: string) => {
                    set({ isSyncing: true }, false, 'fetchSettings/start');
                    try {
                        // Fetch store settings, company settings, field mappings, and article format in parallel
                        const [settingsResponse, companySettingsResponse, fieldMappingsResponse, articleFormatResponse] = await Promise.all([
                            settingsService.getStoreSettings(storeId).catch(() => ({ settings: {} })),
                            settingsService.getCompanySettings(companyId).catch(() => ({ settings: {} })),
                            fieldMappingService.getFieldMappings(companyId).catch(() => ({ fieldMappings: null })),
                            fieldMappingService.getArticleFormat(companyId).catch(() => ({ articleFormat: null })),
                        ]);
                        
                        const serverSettings = settingsResponse.settings as Partial<SettingsData>;
                        const companySettings = companySettingsResponse.settings as Partial<SettingsData>;
                        
                        // Merge server settings with defaults (server takes priority)
                        // Company settings are the primary source for company-wide settings
                        // Store settings provide store-specific overrides  
                        const updates: Partial<SettingsData> = {};
                        
                        // Start with store-level settings as base
                        if (serverSettings && Object.keys(serverSettings).length > 0) {
                            Object.assign(updates, serverSettings);
                        }
                        
                        // Overlay company-level settings (company settings take priority for shared settings)
                        // Company-wide settings: logos, csvConfig, peopleManager, autoSync, etc.
                        if (companySettings && Object.keys(companySettings).length > 0) {
                            // Company-wide settings override store-level
                            if (companySettings.logos) {
                                updates.logos = companySettings.logos;
                            }
                            // Store-level logo override takes priority over company logos
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
                            if (companySettings.peopleManagerConfig) {
                                updates.peopleManagerConfig = companySettings.peopleManagerConfig;
                            }
                            if (companySettings.autoSyncEnabled !== undefined) {
                                updates.autoSyncEnabled = companySettings.autoSyncEnabled;
                            }
                            if (companySettings.autoSyncInterval !== undefined) {
                                updates.autoSyncInterval = companySettings.autoSyncInterval;
                            }
                            if (companySettings.appName) {
                                updates.appName = companySettings.appName;
                            }
                            if (companySettings.appSubtitle !== undefined) {
                                updates.appSubtitle = companySettings.appSubtitle;
                            }
                            if (companySettings.spaceType) {
                                updates.spaceType = companySettings.spaceType;
                            }
                        }
                        
                        // Add article format from company-level endpoint if available
                        // (must be before field mappings so we can use mappingInfo as fallback)
                        if (articleFormatResponse.articleFormat) {
                            updates.solumArticleFormat = articleFormatResponse.articleFormat as SettingsData['solumArticleFormat'];
                            logger.info('SettingsStore', 'Article format loaded from server (company-level)', { companyId });
                        }

                        // Add field mappings from company-level endpoint if available
                        if (fieldMappingsResponse.fieldMappings && Object.keys(fieldMappingsResponse.fieldMappings).length > 0) {
                            const serverMappings = fieldMappingsResponse.fieldMappings as SolumMappingConfig;
                            // If server field mappings are missing mappingInfo, extract it from the article format
                            // This ensures auto-mapped fields (articleName, nfcUrl, etc.) survive refresh
                            if (!serverMappings.mappingInfo && (articleFormatResponse.articleFormat as any)?.mappingInfo) {
                                serverMappings.mappingInfo = (articleFormatResponse.articleFormat as any).mappingInfo;
                            }
                            updates.solumMappingConfig = serverMappings;
                            logger.info('SettingsStore', 'Field mappings loaded from server (company-level)', { companyId });
                        }
                        
                        if (Object.keys(updates).length > 0) {
                            set((state) => {
                                // Deep-merge solumConfig to preserve runtime connection state
                                // (tokens, isConnected, lastConnected, storeSummary) that are
                                // set by autoConnectToSolum and NEVER saved to the server
                                const mergedSettings = {
                                    ...state.settings,
                                    ...updates,
                                };
                                // Always preserve runtime SOLUM connection state from memory
                                // These fields are set by autoConnectToSolum on each session
                                // and must never be overwritten by server data
                                const localSolumConfig = state.settings.solumConfig;
                                if (localSolumConfig || updates.solumConfig) {
                                    mergedSettings.solumConfig = {
                                        ...(localSolumConfig || {}),
                                        ...(updates.solumConfig || {}),
                                        // ALWAYS keep runtime state from local memory
                                        tokens: localSolumConfig?.tokens,
                                        isConnected: localSolumConfig?.isConnected || false,
                                        lastConnected: localSolumConfig?.lastConnected,
                                        lastRefreshed: localSolumConfig?.lastRefreshed,
                                        storeSummary: localSolumConfig?.storeSummary,
                                    } as SettingsData['solumConfig'];
                                }

                                // Deep-merge solumMappingConfig to preserve local mappingInfo
                                // when server version doesn't have it (mappingInfo comes from
                                // fetchArticleFormat and may not have been saved to server yet)
                                const localMappingConfig = state.settings.solumMappingConfig;
                                if (updates.solumMappingConfig && localMappingConfig) {
                                    mergedSettings.solumMappingConfig = {
                                        ...localMappingConfig,
                                        ...updates.solumMappingConfig,
                                        // Preserve local mappingInfo if server doesn't have it
                                        mappingInfo: updates.solumMappingConfig.mappingInfo || localMappingConfig.mappingInfo,
                                    } as SolumMappingConfig;
                                }
                                return {
                                    settings: mergedSettings,
                                    activeStoreId: storeId,
                                    activeCompanyId: companyId,
                                    isSyncing: false,
                                };
                            }, false, 'fetchSettings/success');
                            logger.info('SettingsStore', 'Settings loaded from server', { storeId, companyId });
                        } else {
                            set({ activeStoreId: storeId, activeCompanyId: companyId, isSyncing: false }, false, 'fetchSettings/empty');
                            logger.info('SettingsStore', 'No server settings found, using local', { storeId, companyId });
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

                    // Prepare settings for server - exclude sensitive data, field mappings, and article format (handled separately at company level)
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { solumConfig, solumMappingConfig, solumArticleFormat, ...otherSettings } = settings;
                    
                    // Build sanitized solumConfig without sensitive or runtime-only fields
                    let sanitizedSolumConfig: Record<string, unknown> | undefined = undefined;
                    if (solumConfig) {
                        // Strip credentials, tokens, and runtime connection state
                        // These are set fresh by autoConnectToSolum on each session
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { username, password, tokens, isConnected, lastConnected, storeSummary, lastRefreshed, ...safeConfig } = solumConfig;
                        sanitizedSolumConfig = safeConfig;
                    }

                    // Cast to unknown first to bypass strict type checking for server payload
                    const settingsForServer = {
                        ...otherSettings,
                        solumConfig: sanitizedSolumConfig,
                        // Don't include solumMappingConfig - it's handled by dedicated endpoint
                    } as unknown as Partial<SettingsData>;

                    set({ isSyncing: true }, false, 'saveSettings/start');
                    try {
                        // Company-wide settings to save at company level
                        const { activeCompanyId } = get();
                        const companyWideSettings: Partial<SettingsData> = {};
                        if (otherSettings.logos) companyWideSettings.logos = otherSettings.logos;
                        if (otherSettings.csvConfig) companyWideSettings.csvConfig = otherSettings.csvConfig;
                        if (otherSettings.peopleManagerEnabled !== undefined) companyWideSettings.peopleManagerEnabled = otherSettings.peopleManagerEnabled;
                        if (otherSettings.peopleManagerConfig) companyWideSettings.peopleManagerConfig = otherSettings.peopleManagerConfig;
                        if (otherSettings.autoSyncEnabled !== undefined) companyWideSettings.autoSyncEnabled = otherSettings.autoSyncEnabled;
                        if (otherSettings.autoSyncInterval !== undefined) companyWideSettings.autoSyncInterval = otherSettings.autoSyncInterval;
                        if (otherSettings.appName) companyWideSettings.appName = otherSettings.appName;
                        if (otherSettings.appSubtitle !== undefined) companyWideSettings.appSubtitle = otherSettings.appSubtitle;
                        if (otherSettings.spaceType) companyWideSettings.spaceType = otherSettings.spaceType;

                        // Save to both store (for backward compat) and company (for company-wide) in parallel
                        const savePromises: Promise<unknown>[] = [
                            settingsService.updateStoreSettings(activeStoreId, settingsForServer),
                        ];
                        if (activeCompanyId && Object.keys(companyWideSettings).length > 0) {
                            savePromises.push(
                                settingsService.updateCompanySettings(activeCompanyId, companyWideSettings)
                            );
                        }
                        await Promise.all(savePromises);
                        set({ isSyncing: false }, false, 'saveSettings/success');
                        logger.info('SettingsStore', 'Settings saved to server (store + company)', { storeId: activeStoreId, companyId: activeCompanyId });
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to save settings to server', { error });
                        set({ isSyncing: false }, false, 'saveSettings/error');
                        // Settings remain in local state even if server save fails
                    }
                },

                saveCompanySettingsToServer: async (updates: Partial<SettingsData>) => {
                    const { activeCompanyId } = get();
                    if (!activeCompanyId) {
                        logger.warn('SettingsStore', 'No active company ID, skipping company settings save');
                        return;
                    }

                    set({ isSyncing: true }, false, 'saveCompanySettings/start');
                    try {
                        await settingsService.updateCompanySettings(activeCompanyId, updates);
                        set({ isSyncing: false }, false, 'saveCompanySettings/success');
                        logger.info('SettingsStore', 'Company settings saved to server', { companyId: activeCompanyId });
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to save company settings to server', { error });
                        set({ isSyncing: false }, false, 'saveCompanySettings/error');
                    }
                },

                // Field mapping server sync (company-level)
                fetchFieldMappingsFromServer: async (companyId: string) => {
                    set({ isSyncing: true }, false, 'fetchFieldMappings/start');
                    try {
                        const response = await fieldMappingService.getFieldMappings(companyId);
                        if (response.fieldMappings && Object.keys(response.fieldMappings).length > 0) {
                            set((state) => ({
                                settings: {
                                    ...state.settings,
                                    solumMappingConfig: response.fieldMappings as SolumMappingConfig,
                                },
                                isSyncing: false,
                            }), false, 'fetchFieldMappings/success');
                            logger.info('SettingsStore', 'Field mappings loaded from server (company-level)', { companyId });
                        } else {
                            set({ isSyncing: false }, false, 'fetchFieldMappings/empty');
                            logger.info('SettingsStore', 'No field mappings on server, using local', { companyId });
                        }
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to fetch field mappings from server', { error });
                        set({ isSyncing: false }, false, 'fetchFieldMappings/error');
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

                    set({ isSyncing: true }, false, 'saveFieldMappings/start');
                    try {
                        await fieldMappingService.updateFieldMappings(targetCompanyId, solumMappingConfig);
                        set({ isSyncing: false }, false, 'saveFieldMappings/success');
                        logger.info('SettingsStore', 'Field mappings saved to server (company-level)', { companyId: targetCompanyId });
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to save field mappings to server', { error });
                        set({ isSyncing: false }, false, 'saveFieldMappings/error');
                    }
                },

                // Article format server sync (company-level)
                fetchArticleFormatFromServer: async (companyId: string) => {
                    set({ isSyncing: true }, false, 'fetchArticleFormat/start');
                    try {
                        const response = await fieldMappingService.getArticleFormat(companyId);
                        if (response.articleFormat) {
                            set((state) => ({
                                settings: {
                                    ...state.settings,
                                    solumArticleFormat: response.articleFormat as SettingsData['solumArticleFormat'],
                                },
                                isSyncing: false,
                            }), false, 'fetchArticleFormat/success');
                            logger.info('SettingsStore', 'Article format loaded from server (company-level)', { companyId });
                        } else {
                            set({ isSyncing: false }, false, 'fetchArticleFormat/empty');
                        }
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to fetch article format from server', { error });
                        set({ isSyncing: false }, false, 'fetchArticleFormat/error');
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

                    set({ isSyncing: true }, false, 'saveArticleFormat/start');
                    try {
                        await fieldMappingService.updateArticleFormat(targetCompanyId, solumArticleFormat);
                        set({ isSyncing: false }, false, 'saveArticleFormat/success');
                        logger.info('SettingsStore', 'Article format saved to server (company-level)', { companyId: targetCompanyId });
                    } catch (error) {
                        logger.error('SettingsStore', 'Failed to save article format to server', { error });
                        set({ isSyncing: false }, false, 'saveArticleFormat/error');
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
                    // Strip runtime SOLUM connection state from localStorage
                    // These are re-established fresh by autoConnectToSolum on each session
                    const { solumConfig, ...otherSettings } = state.settings;
                    let cleanSolumConfig = solumConfig;
                    if (solumConfig) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { tokens, isConnected, lastConnected, lastRefreshed, storeSummary, ...persistableConfig } = solumConfig;
                        cleanSolumConfig = persistableConfig as typeof solumConfig;
                    }
                    return {
                        settings: { ...otherSettings, solumConfig: cleanSolumConfig },
                        passwordHash: state.passwordHash,
                        activeStoreId: state.activeStoreId,
                        activeCompanyId: state.activeCompanyId,
                        // Don't persist isLocked or isSyncing
                    };
                },
            }
        ),
        { name: 'SettingsStore' }
    )
);
