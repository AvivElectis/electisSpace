import compassApi from '@shared/api/compassApi';
import type { CompassUser } from '../domain/types';

interface LoginResponse {
    message: string;
    codeExpiryMinutes: number;
}

interface VerifyResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: CompassUser;
}

interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: CompassUser;
}

export const authApi = {
    login: (email: string) =>
        compassApi.post<LoginResponse>('/auth/login', { email }),

    verify: (email: string, code: string) =>
        compassApi.post<VerifyResponse>('/auth/verify', { email, code }),

    refresh: () =>
        compassApi.post<RefreshResponse>('/auth/refresh'),

    logout: () =>
        compassApi.post('/auth/logout'),

    deviceLogin: (deviceToken: string) =>
        compassApi.post<VerifyResponse>('/auth/device-login', { deviceToken }),

    registerDevice: (deviceName: string, platform: string) =>
        compassApi.post<{ deviceToken: string }>('/auth/device-register', { deviceName, platform }),
};
