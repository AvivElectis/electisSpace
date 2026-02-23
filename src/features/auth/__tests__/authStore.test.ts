/**
 * Auth Store - Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@shared/infrastructure/services/authService', () => ({
    authService: {
        login: vi.fn(), verify2FA: vi.fn(), resendCode: vi.fn(),
        logout: vi.fn(), refreshToken: vi.fn(), getMe: vi.fn(),
        forgotPassword: vi.fn(), resetPassword: vi.fn(),
        changePassword: vi.fn(), solumConnect: vi.fn(),
    },
}));

vi.mock('@shared/infrastructure/services/apiClient', () => ({
    tokenManager: { setTokens: vi.fn(), clearTokens: vi.fn(), getAccessToken: vi.fn() },
}));

vi.mock('@shared/infrastructure/services/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@features/settings/infrastructure/settingsStore', () => ({
    useSettingsStore: { getState: vi.fn(() => ({ settings: { workingMode: 'SOLUM_API' }, resetSettings: vi.fn(), updateSettings: vi.fn() })) },
}));
vi.mock('@features/space/infrastructure/spacesStore', () => ({
    useSpacesStore: { getState: vi.fn(() => ({ clearSpaces: vi.fn() })) },
}));
vi.mock('@features/people/infrastructure/peopleStore', () => ({
    usePeopleStore: { getState: vi.fn(() => ({ clearPeople: vi.fn() })) },
}));
vi.mock('@features/conference/infrastructure/conferenceStore', () => ({
    useConferenceStore: { getState: vi.fn(() => ({ clearConference: vi.fn() })) },
}));
vi.mock('@features/labels/infrastructure/labelsStore', () => ({
    useLabelsStore: { getState: vi.fn(() => ({ clearError: vi.fn() })) },
}));

import { authService } from '@shared/infrastructure/services/authService';
import { useAuthStore } from '../infrastructure/authStore';

describe('AuthStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const s = useAuthStore.getState();
        if (s.clearError) s.clearError();
    });

    describe('Initial State', () => {
        it('should not be authenticated', () => {
            const { isAuthenticated, user } = useAuthStore.getState();
            expect(isAuthenticated === false || user === null).toBe(true);
        });
        it('should not be loading', () => {
            expect(useAuthStore.getState().isLoading).toBe(false);
        });
        it('should have no error', () => {
            expect(useAuthStore.getState().error).toBeNull();
        });
    });

    describe('login', () => {
        it('should call authService.login', async () => {
            (authService.login as any).mockResolvedValue({ message: 'Code sent', email: 'a@b.com', requiresVerification: true });
            await useAuthStore.getState().login({ email: 'a@b.com', password: 'pass' } as any);
            expect(authService.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' });
        });

        it('should set loading during call', async () => {
            let loading = false;
            (authService.login as any).mockImplementation(async () => { loading = useAuthStore.getState().isLoading; return { message: 'ok', email: 'a@b.com', requiresVerification: true }; });
            await useAuthStore.getState().login({ email: 'a@b.com', password: 'pass' } as any).catch(() => {});
            expect(loading).toBe(true);
            expect(useAuthStore.getState().isLoading).toBe(false);
        });
    });

    describe('verify2FA', () => {
        it('should return false if no pending email', async () => {
            const result = await useAuthStore.getState().verify2FA('123456');
            expect(result).toBe(false);
        });

        it('should call authService.verify2FA with pending email and code', async () => {
            // First trigger login to set pendingEmail
            (authService.login as any).mockResolvedValue({ message: 'ok', email: 'a@b.com', requiresVerification: true });
            await useAuthStore.getState().login({ email: 'a@b.com', password: 'pass' } as any);

            (authService.verify2FA as any).mockResolvedValue({
                accessToken: 'a', refreshToken: 'r', expiresIn: 900,
                user: { id: 'u1', email: 'a@b.com', firstName: 'T', lastName: 'U', globalRole: null, stores: [], companies: [] },
            });
            await useAuthStore.getState().verify2FA('123456');
            expect(authService.verify2FA).toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('should clear state', async () => {
            (authService.logout as any).mockResolvedValue(undefined);
            await useAuthStore.getState().logout();
            expect(useAuthStore.getState().isAuthenticated).toBe(false);
            expect(useAuthStore.getState().user).toBeNull();
        });
    });
});
