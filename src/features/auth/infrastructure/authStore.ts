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

    // Actions
    login: (credentials: AuthCredentials) => Promise<boolean>;
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

                // Actions
                login: async (credentials: AuthCredentials): Promise<boolean> => {
                    set({ isLoading: true, error: null }, false, 'login/start');
                    try {
                        const response = await authService.login(credentials);
                        set({
                            user: response.user,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                        }, false, 'login/success');
                        return true;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Login failed';
                        set({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                            error: message,
                        }, false, 'login/error');
                        return false;
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
