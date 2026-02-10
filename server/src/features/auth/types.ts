/**
 * Auth Feature - Types & DTOs
 * 
 * @description Type definitions, validation schemas, and DTOs for authentication.
 */
import { z } from 'zod';
import { GlobalRole, StoreRole, CompanyRole } from '@prisma/client';

// ======================
// Validation Schemas
// ======================

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const verify2FASchema = z.object({
    email: z.string().email('Invalid email address'),
    code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must contain only digits'),
});

export const resendCodeSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
    code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must contain only digits'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const adminResetPasswordSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    resetType: z.enum(['temporary', 'fixed']),
    newPassword: z.string().min(8).optional(),
});

export const refreshSchema = z.object({
    refreshToken: z.string().optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const solumConnectSchema = z.object({
    storeId: z.string().uuid('Invalid store ID'),
});

// ======================
// DTOs - Inputs
// ======================

export type LoginDto = z.infer<typeof loginSchema>;
export type Verify2FADto = z.infer<typeof verify2FASchema>;
export type ResendCodeDto = z.infer<typeof resendCodeSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type AdminResetPasswordDto = z.infer<typeof adminResetPasswordSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type SolumConnectDto = z.infer<typeof solumConnectSchema>;

// ======================
// Response Types
// ======================

export interface StoreInfo {
    id: string;
    name: string;
    code: string;
    role: StoreRole;
    features: string[];
    companyId: string;
    companyName: string;
}

export interface CompanyInfo {
    id: string;
    name: string;
    code: string;
    role: CompanyRole;
}

export interface UserInfo {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    globalRole: GlobalRole | null;
    stores: StoreInfo[];
    companies: CompanyInfo[];
}

export interface LoginResponse {
    message: string;
    email: string;
    requiresVerification: boolean;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: UserInfo;
}

export interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface MeResponse {
    user: UserInfo;
}

export interface MessageResponse {
    message: string;
}

export interface AdminResetResponse {
    message: string;
    temporaryPassword?: string;
}

export interface SolumConnectResponse {
    connected: boolean;
    config: {
        baseUrl: string | null;
        cluster: string;
        companyCode: string;
        storeCode: string;
    };
    tokens: {
        accessToken: string;
    };
}

// ======================
// Internal Types
// ======================

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface UserWithRelations {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    globalRole: GlobalRole | null;
    passwordHash: string;
    isActive: boolean;
    userStores: Array<{
        storeId: string;
        role: StoreRole;
        features: unknown;
        store: {
            name: string;
            code: string;
            companyId: string;
            company: {
                name: string;
            };
        };
    }>;
    userCompanies: Array<{
        companyId: string;
        role: CompanyRole;
        company: {
            name: string;
            code: string;
        };
    }>;
}
