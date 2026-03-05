import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email(),
});

export const verifySchema = z.object({
    email: z.string().email(),
    code: z.string().length(6).regex(/^\d{6}$/),
});

export interface CompassUser {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
    companyId: string;
    branchId: string;
    buildingId: string | null;
    floorId: string | null;
    preferences: unknown;
}

export interface AuthState {
    user: CompassUser | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    loginStep: 'email' | 'code' | 'done';
    loginEmail: string;
    error: string | null;
}
