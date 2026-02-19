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
import { logger } from '@shared/infrastructure/services/logger';
import { AxiosError } from 'axios';

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
        // User can still manually connect via Settings if server-side credentials aren't configured
        throw error;
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

    // Derived context (from user)
    activeCompanyId: string | null;
    activeStoreId: string | null;

    // Actions
    login: (credentials: AuthCredentials) => Promise<boolean>;
    verify2FA: (code: string) => Promise<boolean>;
    resendCode: () => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
    setError: (error: string | null) => void;
    checkAuth: () => void;
    clearError: () => void;
    validateSession: () => Promise<boolean>;
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

                verify2FA: async (code: string): Promise<boolean> => {
                    const email = get().pendingEmail;
                    if (!email) {
                        set({ error: 'No pending verification' });
                        return false;
                    }

                    set({ isLoading: true, error: null }, false, 'verify2FA/start');
                    try {
                        const response = await authService.verify2FA({ email, code });
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
                            // Auto-connect to SOLUM (non-blocking)
                            autoConnectToSolum(activeStoreId).catch((error) => {
                                logger.warn('AuthStore', 'Auto SOLUM connect failed (will use manual connect)', { error: error instanceof Error ? error.message : String(error) });
                            });
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

                validateSession: async (): Promise<boolean> => {
                    const hasToken = !!tokenManager.getAccessToken();
                    if (!hasToken) {
                        set({
                            isAuthenticated: false,
                            user: null,
                            lastValidation: Date.now(),
                            activeCompanyId: null,
                            activeStoreId: null,
                        }, false, 'validateSession/noToken');
                        return false;
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
                        }, false, 'validateSession/success');
                        return true;
                    } catch {
                        // Session is invalid, clear auth state
                        set({
                            isAuthenticated: false,
                            user: null,
                            lastValidation: Date.now(),
                            activeCompanyId: null,
                            activeStoreId: null,
                        }, false, 'validateSession/failed');
                        return false;
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
                        await authService.updateContext(companyId, null);
                        const currentUser = get().user;
                        set({
                            user: currentUser ? { ...currentUser, activeCompanyId: companyId, activeStoreId: null } : null,
                            activeCompanyId: companyId,
                            activeStoreId: null, // Reset store when company changes
                        }, false, 'setActiveCompany');

                        // Sync settingsStore context
                        const settingsStore = useSettingsStore.getState();
                        if (companyId) settingsStore.setActiveCompanyId(companyId);
                        settingsStore.setActiveStoreId(null);

                        // Clear all data stores — company changed, old store data is stale
                        try {
                            useSpacesStore.getState().clearAllData();
                            usePeopleStore.getState().clearAllData();
                            useConferenceStore.getState().clearAllData();
                            useLabelsStore.setState({ labels: [], error: null, searchQuery: '', filterLinkedOnly: false, selectedLabelImages: null });
                        } catch (e) {
                            logger.warn('AuthStore', 'Failed to clear data stores on company switch', { error: e instanceof Error ? e.message : String(e) });
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
                        await authService.updateContext(undefined, storeId);
                        const currentUser = get().user;
                        set({
                            user: currentUser ? { ...currentUser, activeStoreId: storeId } : null,
                            activeStoreId: storeId,
                        }, false, 'setActiveStore');

                        // Immediately sync settingsStore context so StoreRequiredGuard works
                        const settingsStore = useSettingsStore.getState();
                        if (storeId) settingsStore.setActiveStoreId(storeId);
                        const currentCompanyId = get().activeCompanyId;
                        if (currentCompanyId) settingsStore.setActiveCompanyId(currentCompanyId);

                        // Clear all data stores to prevent cross-store data leaks
                        try {
                            useSpacesStore.getState().clearAllData();
                            usePeopleStore.getState().clearAllData();
                            useConferenceStore.getState().clearAllData();
                            useLabelsStore.setState({ labels: [], error: null, searchQuery: '', filterLinkedOnly: false, selectedLabelImages: null });
                        } catch (e) {
                            logger.warn('AuthStore', 'Failed to clear data stores on store switch', { error: e instanceof Error ? e.message : String(e) });
                        }

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
                        await authService.updateContext(companyId, storeId);
                        const currentUser = get().user;
                        set({
                            user: currentUser ? { ...currentUser, activeCompanyId: companyId, activeStoreId: storeId } : null,
                            activeCompanyId: companyId,
                            activeStoreId: storeId,
                        }, false, 'setActiveContext');

                        // Immediately sync settingsStore context
                        const settingsStore = useSettingsStore.getState();
                        if (storeId) settingsStore.setActiveStoreId(storeId);
                        if (companyId) settingsStore.setActiveCompanyId(companyId);

                        // Clear all data stores
                        try {
                            useSpacesStore.getState().clearAllData();
                            usePeopleStore.getState().clearAllData();
                            useConferenceStore.getState().clearAllData();
                            useLabelsStore.setState({ labels: [], error: null, searchQuery: '', filterLinkedOnly: false, selectedLabelImages: null });
                        } catch (e) {
                            logger.warn('AuthStore', 'Failed to clear data stores on context switch', { error: e instanceof Error ? e.message : String(e) });
                        }

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

// Listen for auth:logout events from the API client
if (typeof window !== 'undefined') {
    window.addEventListener('auth:logout', () => {
        useAuthStore.getState().logout();
    });
}

export default useAuthStore;
