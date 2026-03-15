/**
 * Auth Store - Authentication state management
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { authService, type User, type AuthCredentials } from '@shared/infrastructure/services/authService';
import { tokenManager } from '@shared/infrastructure/services/apiClient';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import { useConferenceStore } from '@features/conference/infrastructure/conferenceStore';
import { useLabelsStore } from '@features/labels/infrastructure/labelsStore';
import { useRolesStore } from '@features/roles/infrastructure/rolesStore';
import { useAimsManagementStore } from '@features/aims-management/infrastructure/aimsManagementStore';
import { useOfflineQueueStore } from '@features/sync/infrastructure/offlineQueueStore';
import { useListsStore } from '@features/lists/infrastructure/listsStore';
import { useSyncStore } from '@features/sync/infrastructure/syncStore';
import { logger } from '@shared/infrastructure/services/logger';
import { AxiosError } from 'axios';

/**
 * Clear all feature data stores to prevent cross-store/company data leaks.
 * Called on every company, store, or context switch.
 */
const clearAllFeatureStores = () => {
    try {
        useSpacesStore.getState().clearAllData();
        usePeopleStore.getState().clearAllData();
        useConferenceStore.getState().clearAllData();
        useLabelsStore.getState().clearAllData();
        useRolesStore.getState().clearAllData();
        useAimsManagementStore.getState().reset();
        useOfflineQueueStore.getState().clearItems();
        useListsStore.getState().clearAllData();
        useSyncStore.getState().setWorkingMode('SOLUM_API');
        // Reset settings (logos, appName, fieldMappings, articleFormat) to prevent cross-store leaks
        useSettingsStore.getState().resetSettings();
    } catch (e) {
        logger.warn('AuthStore', 'Failed to clear feature stores', { error: e instanceof Error ? e.message : String(e) });
    }
};

// Result type for session validation
export interface ValidationResult {
    valid: boolean;
    networkError: boolean;
}

// Helper to detect network errors (vs auth errors)
const isNetworkError = (error: unknown): boolean => {
    // Browser reports offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return true;
    }

    if (error instanceof AxiosError) {
        // Axios network error codes
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
            return true;
        }
        // No response received at all (network-level failure)
        if (!error.response && (
            error.message?.includes('Network Error') ||
            error.message?.includes('timeout') ||
            error.message?.includes('Failed to fetch')
        )) {
            return true;
        }
    }

    if (error instanceof Error) {
        const msg = error.message;
        if (
            msg.includes('Network Error') ||
            msg.includes('ERR_NETWORK') ||
            msg.includes('Failed to fetch') ||
            msg.includes('timeout')
        ) {
            return true;
        }
    }

    return false;
};

// Error code type for login errors
type AuthErrorCode = 
    | 'INVALID_CREDENTIALS'
    | 'USER_NOT_FOUND'
    | 'USER_INACTIVE'
    | 'EMAIL_SERVICE_ERROR'
    | 'INVALID_CODE'
    | 'CODE_EXPIRED'
    | 'NETWORK_ERROR'
    | 'SERVER_ERROR'
    | 'CONNECTION_REFUSED';

// Helper to extract error code and message from various error types
const getAuthError = (error: unknown): { code: AuthErrorCode; message: string } => {
    if (error instanceof AxiosError) {
        // Network error (no response from server)
        if (!error.response) {
            if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
                return { code: 'NETWORK_ERROR', message: 'network_error' };
            }
            if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
                return { code: 'CONNECTION_REFUSED', message: 'connection_refused' };
            }
            return { code: 'SERVER_ERROR', message: 'server_error' };
        }
        
        // Server returned an error response with error code
        // Response format: { error: { code: 'ERROR_CODE', message: 'message' } }
        const responseData = error.response?.data as { error?: { code?: string; message?: string } } | undefined;
        const errorData = responseData?.error;
        
        if (errorData?.code) {
            return { 
                code: errorData.code as AuthErrorCode, 
                message: errorData.code.toLowerCase() 
            };
        }
        
        // Fallback to message or status-based error
        if (error.response?.status === 401) {
            return { code: 'INVALID_CREDENTIALS', message: 'invalid_credentials' };
        }
        if (error.response?.status === 503) {
            return { code: 'EMAIL_SERVICE_ERROR', message: 'email_service_error' };
        }
        if (error.response?.status >= 500) {
            return { code: 'SERVER_ERROR', message: 'server_error' };
        }
        
        return { code: 'SERVER_ERROR', message: responseData?.error?.message || 'server_error' };
    }
    if (error instanceof Error) {
        return { code: 'SERVER_ERROR', message: error.message };
    }
    return { code: 'SERVER_ERROR', message: 'server_error' };
};

// Legacy helper for backward compatibility
const getErrorMessage = (error: unknown, fallback: string): string => {
    const { message } = getAuthError(error);
    return message || fallback;
};

/**
 * Auto-connect to SOLUM using server-side company credentials
 * This function connects to SOLUM via the server (which has the company AIMS credentials)
 * and updates the settings store with the SOLUM connection state
 */
const autoConnectToSolum = async (storeId: string): Promise<void> => {
    try {
        logger.info('AuthStore', 'Auto-connecting to SOLUM via server', { storeId });
        
        const response = await authService.solumConnect(storeId);
        
        if (response.connected) {
            // Validate token is not empty
            if (!response.tokens?.accessToken) {
                throw new Error('AIMS connection returned empty accessToken');
            }

            // Get current settings and update with SOLUM connection
            const settingsStore = useSettingsStore.getState();
            const currentSettings = settingsStore.settings;

            // Update settings with SOLUM config from server (without sensitive creds)
            settingsStore.updateSettings({
                solumConfig: {
                    // Preserve existing solum config if present
                    ...currentSettings.solumConfig,
                    // Override with server-provided values
                    companyName: response.config.companyCode,
                    storeNumber: response.config.storeCode,
                    baseUrl: response.config.baseUrl,
                    cluster: response.config.cluster,
                    syncInterval: currentSettings.solumConfig?.syncInterval || 300,
                    // Mark as connected with server-provided token
                    isConnected: true,
                    lastConnected: Date.now(),
                    tokens: {
                        accessToken: response.tokens.accessToken,
                        refreshToken: '', // Server handles refresh
                        expiresAt: Date.now() + 3600000, // 1 hour (server handles expiry)
                    },
                    // Credentials are on server - use empty placeholders
                    username: '***server-managed***',
                    password: '***server-managed***',
                },
            });
            
            logger.info('AuthStore', 'Auto SOLUM connect successful', {
                storeCode: response.config.storeCode,
                companyCode: response.config.companyCode,
            });
        } else {
            // Server returned connected: false - treat as error
            throw new Error('AIMS connection failed');
        }
    } catch (error: unknown) {
        // Log but don't throw - this is a background operation
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('AuthStore', 'Auto SOLUM connect failed', { error: message });
    }
};

interface AuthState {
    // State
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    pendingEmail: string | null; // Email pending 2FA verification
    lastValidation: number | null; // Timestamp of last session validation
    isInitialized: boolean; // Whether session restore has been attempted
    isAppReady: boolean; // Whether app is fully initialized (auth + settings loaded)
    isSwitchingStore: boolean; // True while store/company switch is in progress
    tokenVersion: number; // Incremented on each token refresh, used for SSE reconnect

    // Derived context (from user)
    activeCompanyId: string | null;
    activeStoreId: string | null;

    // Actions
    login: (credentials: AuthCredentials) => Promise<boolean>;
    verify2FA: (code: string, trustDevice?: boolean) => Promise<boolean>;
    resendCode: () => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
    setError: (error: string | null) => void;
    checkAuth: () => void;
    clearError: () => void;
    validateSession: () => Promise<ValidationResult>;
    setInitialized: (initialized: boolean) => void;
    setAppReady: (ready: boolean) => void;

    // Context switching
    setActiveCompany: (companyId: string | null) => Promise<void>;
    setActiveStore: (storeId: string | null) => Promise<void>;
    setActiveContext: (companyId: string | null, storeId: string | null) => Promise<void>;
    
    // SOLUM connection
    reconnectToSolum: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
                pendingEmail: null,
                lastValidation: null,
                activeCompanyId: null,
                activeStoreId: null,
                isInitialized: false,
                isAppReady: false,
                isSwitchingStore: false,
                tokenVersion: 0,

                // Actions
                login: async (credentials: AuthCredentials): Promise<boolean> => {
                    set({ isLoading: true, error: null }, false, 'login/start');
                    try {
                        const response = await authService.login(credentials);
                        // Step 1 complete - code sent to email
                        set({
                            pendingEmail: response.email,
                            isLoading: false,
                            error: null,
                        }, false, 'login/codeSent');
                        return true; // Indicate to show 2FA screen
                    } catch (error) {
                        //console.log('Login error:', error);
                        //console.log('Error response data:', (error as any)?.response?.data);
                        const { code } = getAuthError(error);
                        //console.log('Extracted error code:', code);
                        // Store the error code as the error - the UI will translate it
                        set({
                            pendingEmail: null,
                            isLoading: false,
                            error: `error.${code.toLowerCase()}`,
                        }, false, 'login/error');
                        return false;
                    }
                },

                verify2FA: async (code: string, trustDevice?: boolean): Promise<boolean> => {
                    const email = get().pendingEmail;
                    if (!email) {
                        set({ error: 'No pending verification' });
                        return false;
                    }

                    set({ isLoading: true, error: null }, false, 'verify2FA/start');
                    try {
                        // Get device info for persistent auth (only if user opted in)
                        let deviceId: string | undefined;
                        let deviceName: string | undefined;
                        let platform: string | undefined;
                        if (trustDevice) {
                            try {
                                const { deviceTokenStorage } = await import('@shared/infrastructure/services/deviceTokenStorage');
                                deviceId = await deviceTokenStorage.getDeviceId();
                                platform = deviceTokenStorage.getPlatform();

                                // Try Electron hostname first, fall back to UA-based name
                                const hostname = await deviceTokenStorage.getHostname();
                                if (hostname) {
                                    const ua = navigator.userAgent;
                                    const browser = /Edg\//.test(ua) ? 'Edge'
                                        : /Chrome\//.test(ua) ? 'Chrome'
                                        : /Firefox\//.test(ua) ? 'Firefox'
                                        : /Safari\//.test(ua) ? 'Safari'
                                        : '';
                                    deviceName = browser ? `${hostname} — ${browser}` : hostname;
                                } else {
                                    deviceName = deviceTokenStorage.getDeviceName();
                                }
                            } catch { /* not available */ }
                        }

                        const response = await authService.verify2FA({
                            email,
                            code,
                            ...(deviceId ? { deviceId, deviceName, platform } : {}),
                        });
                        const { user } = response;
                        
                        // Set active context from user or default to first company/store
                        const activeCompanyId = user.activeCompanyId || user.companies?.[0]?.id || null;
                        const activeStoreId = user.activeStoreId || user.stores?.[0]?.id || null;
                        
                        set({
                            user,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                            pendingEmail: null,
                            activeCompanyId,
                            activeStoreId,
                        }, false, 'verify2FA/success');

                        // Set settings store context immediately so StoreRequiredGuard works
                        const settingsStore = useSettingsStore.getState();
                        if (activeStoreId) settingsStore.setActiveStoreId(activeStoreId);
                        if (activeCompanyId) settingsStore.setActiveCompanyId(activeCompanyId);

                        // Fetch settings from server (blocking), then auto-connect to SOLUM
                        if (activeStoreId && activeCompanyId) {
                            try {
                                await settingsStore.fetchSettingsFromServer(activeStoreId, activeCompanyId);
                            } catch (error) {
                                logger.warn('AuthStore', 'Settings fetch after login failed', { error: error instanceof Error ? error.message : String(error) });
                            }
                            // Auto-connect to SOLUM (blocking to avoid race with dashboard sync check)
                            try {
                                await autoConnectToSolum(activeStoreId);
                            } catch (error) {
                                logger.warn('AuthStore', 'Auto SOLUM connect failed (will use manual connect)', { error: error instanceof Error ? error.message : String(error) });
                            }
                        }

                        return true;
                    } catch (error) {
                        const { code } = getAuthError(error);
                        set({
                            isLoading: false,
                            error: `error.${code.toLowerCase()}`,
                        }, false, 'verify2FA/error');
                        return false;
                    }
                },

                resendCode: async (): Promise<void> => {
                    const email = get().pendingEmail;
                    if (!email) return;

                    set({ isLoading: true, error: null }, false, 'resendCode/start');
                    try {
                        await authService.resendCode(email);
                        set({ isLoading: false }, false, 'resendCode/success');
                    } catch (error) {
                        const { code } = getAuthError(error);
                        set({
                            isLoading: false,
                            error: `error.${code.toLowerCase()}`,
                        }, false, 'resendCode/error');
                    }
                },

                logout: async (): Promise<void> => {
                    set({ isLoading: true }, false, 'logout/start');
                    try {
                        await authService.logout();
                        // Clear device token on explicit logout
                        try {
                            const { deviceTokenStorage } = await import('@shared/infrastructure/services/deviceTokenStorage');
                            await deviceTokenStorage.removeDeviceToken();
                        } catch { /* ignore */ }
                    } finally {
                        set({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                            isInitialized: false,
                            error: null,
                            pendingEmail: null,
                            activeCompanyId: null,
                            activeStoreId: null,
                            isAppReady: false,
                        }, false, 'logout/complete');
                    }
                },

                setUser: (user) => {
                    const activeCompanyId = user?.activeCompanyId || user?.companies?.[0]?.id || null;
                    const activeStoreId = user?.activeStoreId || user?.stores?.[0]?.id || null;
                    set({ 
                        user, 
                        isAuthenticated: !!user,
                        activeCompanyId,
                        activeStoreId,
                    }, false, 'setUser');
                },

                setError: (error) => set({ error }, false, 'setError'),

                clearError: () => set({ error: null }, false, 'clearError'),

                checkAuth: () => {
                    // Check if we have tokens stored
                    const hasToken = !!tokenManager.getAccessToken();
                    const currentUser = get().user;

                    if (hasToken && currentUser) {
                        set({ isAuthenticated: true }, false, 'checkAuth/authenticated');
                    } else if (!hasToken) {
                        set({
                            isAuthenticated: false,
                            user: null
                        }, false, 'checkAuth/unauthenticated');
                    }
                },

                validateSession: async (): Promise<ValidationResult> => {
                    const hasToken = !!tokenManager.getAccessToken();
                    if (!hasToken) {
                        set({
                            isAuthenticated: false,
                            user: null,
                            lastValidation: Date.now(),
                            activeCompanyId: null,
                            activeStoreId: null,
                        }, false, 'validateSession/noToken');
                        return { valid: false, networkError: false };
                    }

                    try {
                        // Call the /me endpoint to validate the session
                        const response = await authService.me();
                        const { user } = response;
                        const activeCompanyId = user.activeCompanyId || user.companies?.[0]?.id || null;
                        const activeStoreId = user.activeStoreId || user.stores?.[0]?.id || null;

                        set({
                            user,
                            isAuthenticated: true,
                            lastValidation: Date.now(),
                            activeCompanyId,
                            activeStoreId,
                            tokenVersion: get().tokenVersion + 1,
                        }, false, 'validateSession/success');
                        return { valid: true, networkError: false };
                    } catch (error) {
                        // Distinguish network errors from actual auth failures
                        if (isNetworkError(error)) {
                            logger.warn('AuthStore', 'Network error during session validation, preserving auth state');
                            return { valid: false, networkError: true };
                        }

                        // Auth truly failed — clear auth state
                        set({
                            isAuthenticated: false,
                            user: null,
                            lastValidation: Date.now(),
                            activeCompanyId: null,
                            activeStoreId: null,
                        }, false, 'validateSession/failed');
                        return { valid: false, networkError: false };
                    }
                },

                setInitialized: (initialized: boolean) => {
                    set({ isInitialized: initialized }, false, 'setInitialized');
                },

                setAppReady: (ready: boolean) => {
                    set({ isAppReady: ready }, false, 'setAppReady');
                },

                // Context switching actions
                setActiveCompany: async (companyId: string | null): Promise<void> => {
                    set({ isSwitchingStore: true }, false, 'setActiveCompany/start');
                    try {
                        const response = await authService.updateContext(companyId, null);
                        const { user } = response;
                        set({
                            user,
                            activeCompanyId: companyId,
                            activeStoreId: null, // Reset store when company changes
                        }, false, 'setActiveCompany');

                        // Sync settingsStore context
                        const settingsStore = useSettingsStore.getState();
                        if (companyId) settingsStore.setActiveCompanyId(companyId);
                        settingsStore.setActiveStoreId(null);

                        // Clear all data stores — company changed, old store data is stale
                        // resetSettings() inside clearAllFeatureStores handles fieldMappings + articleFormat
                        clearAllFeatureStores();

                        // Fetch company-level settings (logos, features, branding)
                        // so UI updates immediately without waiting for a store selection
                        if (companyId) {
                            try {
                                const { settingsService } = await import('@shared/infrastructure/services/settingsService');
                                const res = await settingsService.getCompanySettings(companyId);
                                if (res.settings && Object.keys(res.settings).length > 0) {
                                    settingsStore.updateSettings(res.settings as Record<string, unknown>);
                                }
                            } catch (e) {
                                logger.warn('AuthStore', 'Company settings fetch on switch failed', { error: e instanceof Error ? e.message : String(e) });
                            }
                        }
                    } catch (error) {
                        const message = getErrorMessage(error, 'Failed to switch company');
                        set({ error: message }, false, 'setActiveCompany/error');
                    } finally {
                        set({ isSwitchingStore: false }, false, 'setActiveCompany/done');
                    }
                },

                setActiveStore: async (storeId: string | null): Promise<void> => {
                    set({ isSwitchingStore: true }, false, 'setActiveStore/start');
                    try {
                        const response = await authService.updateContext(undefined, storeId);
                        const { user } = response;
                        set({
                            user,
                            activeStoreId: storeId,
                        }, false, 'setActiveStore');

                        // Immediately sync settingsStore context so StoreRequiredGuard works
                        const settingsStore = useSettingsStore.getState();
                        if (storeId) settingsStore.setActiveStoreId(storeId);
                        const currentCompanyId = get().activeCompanyId;
                        if (currentCompanyId) settingsStore.setActiveCompanyId(currentCompanyId);

                        // Clear all data stores to prevent cross-store data leaks
                        clearAllFeatureStores();

                        // AWAIT settings + SOLUM connect (was fire-and-forget before)
                        if (storeId && currentCompanyId) {
                            try {
                                await settingsStore.fetchSettingsFromServer(storeId, currentCompanyId);
                                await autoConnectToSolum(storeId);
                            } catch (error) {
                                logger.warn('AuthStore', 'Settings/SOLUM load on store switch failed', { error: error instanceof Error ? error.message : String(error) });
                            }
                        } else if (storeId) {
                            try {
                                await autoConnectToSolum(storeId);
                            } catch (error) {
                                logger.warn('AuthStore', 'Auto SOLUM connect on store switch failed', { error: error instanceof Error ? error.message : String(error) });
                            }
                        }
                    } catch (error) {
                        const message = getErrorMessage(error, 'Failed to switch store');
                        set({ error: message }, false, 'setActiveStore/error');
                    } finally {
                        set({ isSwitchingStore: false }, false, 'setActiveStore/done');
                    }
                },

                setActiveContext: async (companyId: string | null, storeId: string | null): Promise<void> => {
                    set({ isSwitchingStore: true }, false, 'setActiveContext/start');
                    try {
                        const response = await authService.updateContext(companyId, storeId);
                        const { user } = response;
                        set({
                            user,
                            activeCompanyId: companyId,
                            activeStoreId: storeId,
                        }, false, 'setActiveContext');

                        // Immediately sync settingsStore context
                        const settingsStore = useSettingsStore.getState();
                        if (storeId) settingsStore.setActiveStoreId(storeId);
                        if (companyId) settingsStore.setActiveCompanyId(companyId);

                        // Clear all data stores
                        clearAllFeatureStores();

                        // AWAIT settings + SOLUM connect
                        if (storeId && companyId) {
                            try {
                                await settingsStore.fetchSettingsFromServer(storeId, companyId);
                                await autoConnectToSolum(storeId);
                            } catch (error) {
                                logger.warn('AuthStore', 'Settings/SOLUM load on context switch failed', { error: error instanceof Error ? error.message : String(error) });
                            }
                        }
                    } catch (error) {
                        const message = getErrorMessage(error, 'Failed to switch context');
                        set({ error: message }, false, 'setActiveContext/error');
                    } finally {
                        set({ isSwitchingStore: false }, false, 'setActiveContext/done');
                    }
                },

                reconnectToSolum: async (): Promise<boolean> => {
                    const storeId = get().activeStoreId;
                    if (!storeId) {
                        logger.warn('AuthStore', 'Cannot reconnect to SOLUM - no active store');
                        return false;
                    }
                    
                    try {
                        await autoConnectToSolum(storeId);
                        return true;
                    } catch (error) {
                        logger.warn('AuthStore', 'Reconnect to SOLUM failed', { error: error instanceof Error ? error.message : 'Unknown' });
                        return false;
                    }
                },
            }),
            {
                name: 'auth-store',
                partialize: (state) => ({
                    user: state.user,
                    activeCompanyId: state.activeCompanyId,
                    activeStoreId: state.activeStoreId,
                    // Don't persist isAuthenticated - derive from token presence
                }),
            }
        ),
        { name: 'AuthStore' }
    )
);

// Listen for auth:logout events from the API client (guarded against HMR re-registration)
if (typeof window !== 'undefined' && !(window as any).__authLogoutListenerRegistered) {
    (window as any).__authLogoutListenerRegistered = true;
    window.addEventListener('auth:logout', () => {
        useAuthStore.getState().logout();
    });
    // Bump tokenVersion on proactive token refresh so SSE reconnects with fresh token
    window.addEventListener('auth:token-refreshed', () => {
        const state = useAuthStore.getState();
        if (state.tokenVersion !== undefined) {
            useAuthStore.setState({ tokenVersion: state.tokenVersion + 1 });
        }
    });
}

export default useAuthStore;
