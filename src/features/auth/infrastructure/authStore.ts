/**
 * Auth Store - Authentication state management
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { authService, type User, type AuthCredentials } from '@shared/infrastructure/services/authService';
import { tokenManager } from '@shared/infrastructure/services/apiClient';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { AxiosError } from 'axios';

// Helper to extract error message from various error types
const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof AxiosError) {
        // Server returned an error response
        return error.response?.data?.message || error.message || fallback;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return fallback;
};

interface AuthState {
    // State
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    pendingEmail: string | null; // Email pending 2FA verification
    lastValidation: number | null; // Timestamp of last session validation

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
    
    // Context switching
    setActiveCompany: (companyId: string | null) => Promise<void>;
    setActiveStore: (storeId: string | null) => Promise<void>;
    setActiveContext: (companyId: string | null, storeId: string | null) => Promise<void>;
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
                        const message = getErrorMessage(error, 'Login failed');
                        set({
                            pendingEmail: null,
                            isLoading: false,
                            error: message,
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

                        // Fetch settings from server for the active store
                        if (activeStoreId) {
                            useSettingsStore.getState().fetchSettingsFromServer(activeStoreId);
                        }

                        return true;
                    } catch (error) {
                        const message = getErrorMessage(error, 'Verification failed');
                        set({
                            isLoading: false,
                            error: message,
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
                        const message = getErrorMessage(error, 'Failed to resend code');
                        set({
                            isLoading: false,
                            error: message,
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
                            error: null,
                            pendingEmail: null,
                            activeCompanyId: null,
                            activeStoreId: null,
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

                // Context switching actions
                setActiveCompany: async (companyId: string | null): Promise<void> => {
                    try {
                        const response = await authService.updateContext(companyId, null);
                        const { user } = response;
                        set({
                            user,
                            activeCompanyId: companyId,
                            activeStoreId: null, // Reset store when company changes
                        }, false, 'setActiveCompany');
                    } catch (error) {
                        const message = getErrorMessage(error, 'Failed to switch company');
                        set({ error: message }, false, 'setActiveCompany/error');
                    }
                },

                setActiveStore: async (storeId: string | null): Promise<void> => {
                    try {
                        const response = await authService.updateContext(undefined, storeId);
                        const { user } = response;
                        set({
                            user,
                            activeStoreId: storeId,
                        }, false, 'setActiveStore');

                        // Fetch settings for the new store
                        if (storeId) {
                            useSettingsStore.getState().fetchSettingsFromServer(storeId);
                        }
                    } catch (error) {
                        const message = getErrorMessage(error, 'Failed to switch store');
                        set({ error: message }, false, 'setActiveStore/error');
                    }
                },

                setActiveContext: async (companyId: string | null, storeId: string | null): Promise<void> => {
                    try {
                        const response = await authService.updateContext(companyId, storeId);
                        const { user } = response;
                        set({
                            user,
                            activeCompanyId: companyId,
                            activeStoreId: storeId,
                        }, false, 'setActiveContext');

                        // Fetch settings for the new store
                        if (storeId) {
                            useSettingsStore.getState().fetchSettingsFromServer(storeId);
                        }
                    } catch (error) {
                        const message = getErrorMessage(error, 'Failed to switch context');
                        set({ error: message }, false, 'setActiveContext/error');
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
