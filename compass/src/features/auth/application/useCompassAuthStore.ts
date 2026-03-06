import { create } from 'zustand';
import type { AuthState } from '../domain/types';
import { authApi } from '../infrastructure/authApi';
import compassApi from '@shared/api/compassApi';
import { connectCompassSocket, disconnectCompassSocket } from '@shared/infrastructure/compassSocket';

interface AuthActions {
    sendLoginCode: (email: string) => Promise<void>;
    verifyCode: (code: string) => Promise<void>;
    refresh: () => Promise<void>;
    logout: () => void;
    setError: (error: string | null) => void;
    resetLoginFlow: () => void;
}

export const useCompassAuthStore = create<AuthState & AuthActions>((set, get) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    loginStep: 'email',
    loginEmail: '',
    error: null,
    codeExpiryMinutes: null,

    sendLoginCode: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await authApi.login(email);
            set({
                loginStep: 'code',
                loginEmail: email,
                isLoading: false,
                codeExpiryMinutes: data.codeExpiryMinutes,
            });
        } catch (error: any) {
            set({
                error: error?.response?.data?.error?.message || 'Failed to send code',
                isLoading: false,
            });
        }
    },

    verifyCode: async (code: string) => {
        const { loginEmail } = get();
        set({ isLoading: true, error: null });
        try {
            const { data } = await authApi.verify(loginEmail, code);
            // Set token for future API calls
            compassApi.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;

            set({
                user: data.user,
                accessToken: data.accessToken,
                isAuthenticated: true,
                isLoading: false,
                loginStep: 'done',
            });

            // Schedule auto-refresh + connect socket
            scheduleRefresh(data.expiresIn);
            connectCompassSocket();
        } catch (error: any) {
            set({
                error: error?.response?.data?.error?.message || 'Invalid code',
                isLoading: false,
            });
        }
    },

    refresh: async () => {
        try {
            const { data } = await authApi.refresh();
            compassApi.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;

            set({
                user: data.user,
                accessToken: data.accessToken,
                isAuthenticated: true,
            });

            scheduleRefresh(data.expiresIn);
            connectCompassSocket();
        } catch {
            // Refresh failed — user must re-login
            get().logout();
        }
    },

    logout: () => {
        authApi.logout().catch(() => {});
        delete compassApi.defaults.headers.common['Authorization'];
        clearRefreshTimer();
        disconnectCompassSocket();
        set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            loginStep: 'email',
            loginEmail: '',
            error: null,
            codeExpiryMinutes: null,
        });
    },

    setError: (error) => set({ error }),

    resetLoginFlow: () => set({
        loginStep: 'email',
        loginEmail: '',
        error: null,
        codeExpiryMinutes: null,
    }),
}));

// ─── Auto-Refresh Timer ──────────────────────────────

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRefresh(expiresInSeconds: number) {
    clearRefreshTimer();
    // Refresh 60 seconds before expiry
    const refreshInMs = Math.max((expiresInSeconds - 60) * 1000, 10_000);
    refreshTimer = setTimeout(() => {
        useCompassAuthStore.getState().refresh();
    }, refreshInMs);
}

function clearRefreshTimer() {
    if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }
}
