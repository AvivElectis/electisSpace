/**
 * Auth Store - Authentication state management
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { authService, type User, type AuthCredentials } from '@shared/infrastructure/services/authService';
import { tokenManager } from '@shared/infrastructure/services/apiClient';

interface AuthState {
    // State
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    pendingEmail: string | null; // Email pending 2FA verification

    // Actions
    login: (credentials: AuthCredentials) => Promise<boolean>;
    verify2FA: (code: string) => Promise<boolean>;
    resendCode: () => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
    setError: (error: string | null) => void;
    checkAuth: () => void;
    clearError: () => void;
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
                        const message = error instanceof Error ? error.message : 'Login failed';
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
                        set({
                            user: response.user,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                            pendingEmail: null,
                        }, false, 'verify2FA/success');
                        return true;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Verification failed';
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
                        const message = error instanceof Error ? error.message : 'Failed to resend code';
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
                        }, false, 'logout/complete');
                    }
                },

                setUser: (user) => set({ user, isAuthenticated: !!user }, false, 'setUser'),

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
            }),
            {
                name: 'auth-store',
                partialize: (state) => ({
                    user: state.user,
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
