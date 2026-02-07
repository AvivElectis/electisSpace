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
                        // Fetch store settings, company settings, and company field mappings in parallel
                        const [settingsResponse, companySettingsResponse, fieldMappingsResponse] = await Promise.all([
                            settingsService.getStoreSettings(storeId),
                            settingsService.getCompanySettings(companyId).catch(() => ({ settings: {} })),
                            fieldMappingService.getFieldMappings(companyId).catch(() => ({ fieldMappings: null })),
                        ]);
                        
                        const serverSettings = settingsResponse.settings as Partial<SettingsData>;
                        const companySettings = companySettingsResponse.settings as Partial<SettingsData>;
                        
                        // Merge server settings with defaults (server takes priority)
                        const updates: Partial<SettingsData> = {};
                        
                        if (serverSettings && Object.keys(serverSettings).length > 0) {
                            Object.assign(updates, serverSettings);
                        }
                        
                        // Merge company-level settings (conferenceEnabled from csvConfig)
                        if (companySettings && Object.keys(companySettings).length > 0) {
                            if (companySettings.csvConfig) {
                                updates.csvConfig = {
                                    ...(updates.csvConfig || {}),
                                    ...companySettings.csvConfig,
                                } as SettingsData['csvConfig'];
                            }
                        }
                        
                        // Add field mappings from company-level endpoint if available
                        if (fieldMappingsResponse.fieldMappings && Object.keys(fieldMappingsResponse.fieldMappings).length > 0) {
                            updates.solumMappingConfig = fieldMappingsResponse.fieldMappings as SolumMappingConfig;
                            logger.info('SettingsStore', 'Field mappings loaded from server (company-level)', { companyId });
                        }
                        
                        if (Object.keys(updates).length > 0) {
                            set((state) => {
                                // Deep-merge solumConfig to preserve runtime connection state
                                // (tokens, isConnected, lastConnected, storeSummary) that are
                                // set by autoConnectToSolum and NOT saved to the server
                                const mergedSettings = {
                                    ...state.settings,
                                    ...updates,
                                };
                                if (updates.solumConfig && state.settings.solumConfig) {
                                    mergedSettings.solumConfig = {
                                        ...state.settings.solumConfig,
                                        ...updates.solumConfig,
                                        // Always preserve runtime connection state from memory
                                        tokens: state.settings.solumConfig.tokens || updates.solumConfig.tokens,
                                        isConnected: state.settings.solumConfig.isConnected ?? updates.solumConfig.isConnected,
                                        lastConnected: state.settings.solumConfig.lastConnected || updates.solumConfig.lastConnected,
                                        storeSummary: state.settings.solumConfig.storeSummary || updates.solumConfig.storeSummary,
                                    } as SettingsData['solumConfig'];
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

                    // Prepare settings for server - exclude sensitive data and field mappings (handled separately)
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { solumConfig, solumMappingConfig, ...otherSettings } = settings;
                    
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
                        // Don't include solumMappingConfig - it's handled by dedicated endpoint
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
                partialize: (state) => ({
                    settings: state.settings,
                    passwordHash: state.passwordHash,
                    activeStoreId: state.activeStoreId,
                    activeCompanyId: state.activeCompanyId,
                    // Don't persist isLocked or isSyncing
                }),
            }
        ),
        { name: 'SettingsStore' }
    )
);
