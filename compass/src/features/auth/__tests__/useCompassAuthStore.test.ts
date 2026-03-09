import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCompassAuthStore } from '../application/useCompassAuthStore';

const mockUser = {
    id: 'u1',
    email: 'test@example.com',
    displayName: 'Test User',
    companyId: 'c1',
    branchId: 'b1',
    role: 'EMPLOYEE' as const,
    departmentName: null,
    branchName: null,
    branchAddress: null,
};

vi.mock('../infrastructure/authApi', () => ({
    authApi: {
        login: vi.fn(),
        verify: vi.fn(),
        refresh: vi.fn(),
        logout: vi.fn().mockResolvedValue({}),
    },
}));

vi.mock('@shared/api/compassApi', () => ({
    default: { defaults: { headers: { common: {} } } },
}));

vi.mock('@shared/infrastructure/compassSocket', () => ({
    connectCompassSocket: vi.fn(),
    disconnectCompassSocket: vi.fn(),
}));

import { authApi } from '../infrastructure/authApi';

describe('useCompassAuthStore', () => {
    beforeEach(() => {
        useCompassAuthStore.setState({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            loginStep: 'email',
            loginEmail: '',
            error: null,
            codeExpiryMinutes: null,
        });
        vi.clearAllMocks();
    });

    it('has correct initial state', () => {
        const state = useCompassAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(state.loginStep).toBe('email');
    });

    it('sendLoginCode sets loginStep to code on success', async () => {
        vi.mocked(authApi.login).mockResolvedValue({
            data: { message: 'Code sent', codeExpiryMinutes: 5 },
        } as any);

        await useCompassAuthStore.getState().sendLoginCode('test@example.com');

        const state = useCompassAuthStore.getState();
        expect(state.loginStep).toBe('code');
        expect(state.loginEmail).toBe('test@example.com');
        expect(state.codeExpiryMinutes).toBe(5);
        expect(state.isLoading).toBe(false);
    });

    it('sendLoginCode sets error on failure', async () => {
        vi.mocked(authApi.login).mockRejectedValue({
            response: { data: { error: { message: 'User not found' } } },
        });

        await useCompassAuthStore.getState().sendLoginCode('bad@example.com');

        const state = useCompassAuthStore.getState();
        expect(state.error).toBe('User not found');
        expect(state.loginStep).toBe('email');
        expect(state.isLoading).toBe(false);
    });

    it('verifyCode authenticates user on success', async () => {
        useCompassAuthStore.setState({ loginEmail: 'test@example.com' });

        vi.mocked(authApi.verify).mockResolvedValue({
            data: { accessToken: 'tok123', expiresIn: 3600, user: mockUser },
        } as any);

        await useCompassAuthStore.getState().verifyCode('123456');

        const state = useCompassAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.user).toEqual(mockUser);
        expect(state.accessToken).toBe('tok123');
        expect(state.loginStep).toBe('done');
    });

    it('verifyCode sets error on invalid code', async () => {
        useCompassAuthStore.setState({ loginEmail: 'test@example.com' });

        vi.mocked(authApi.verify).mockRejectedValue({
            response: { data: { error: { message: 'Invalid code' } } },
        });

        await useCompassAuthStore.getState().verifyCode('000000');

        const state = useCompassAuthStore.getState();
        expect(state.error).toBe('Invalid code');
        expect(state.isAuthenticated).toBe(false);
    });

    it('logout resets state', () => {
        useCompassAuthStore.setState({
            user: mockUser,
            accessToken: 'tok',
            isAuthenticated: true,
            loginStep: 'done',
        });

        useCompassAuthStore.getState().logout();

        const state = useCompassAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
        expect(state.loginStep).toBe('email');
    });

    it('resetLoginFlow returns to email step', () => {
        useCompassAuthStore.setState({
            loginStep: 'code',
            loginEmail: 'test@example.com',
            error: 'some error',
            codeExpiryMinutes: 5,
        });

        useCompassAuthStore.getState().resetLoginFlow();

        const state = useCompassAuthStore.getState();
        expect(state.loginStep).toBe('email');
        expect(state.loginEmail).toBe('');
        expect(state.error).toBeNull();
    });

    it('setError updates error state', () => {
        useCompassAuthStore.getState().setError('Test error');
        expect(useCompassAuthStore.getState().error).toBe('Test error');

        useCompassAuthStore.getState().setError(null);
        expect(useCompassAuthStore.getState().error).toBeNull();
    });

    it('refresh authenticates on success and calls logout on failure', async () => {
        vi.mocked(authApi.refresh).mockResolvedValue({
            data: { accessToken: 'new-tok', expiresIn: 3600, user: mockUser },
        } as any);

        await useCompassAuthStore.getState().refresh();

        expect(useCompassAuthStore.getState().isAuthenticated).toBe(true);
        expect(useCompassAuthStore.getState().accessToken).toBe('new-tok');

        // Now test failure
        vi.mocked(authApi.refresh).mockRejectedValue(new Error('expired'));

        await useCompassAuthStore.getState().refresh();

        expect(useCompassAuthStore.getState().isAuthenticated).toBe(false);
    });
});
