/**
 * Auth Feature - Types & DTOs
 * 
 * @description Type definitions, validation schemas, and DTOs for authentication.
 */
import { z } from 'zod';
import { GlobalRole } from '@prisma/client';
import type { CompanyFeatures, SpaceType, PeopleType } from '../../shared/utils/featureResolution.js';

// ======================
// Validation Schemas
// ======================

export const loginSchema = z.object({
    email: z.string().email('Invalid email address').transform(v => v.toLowerCase()),
    password: z.string().min(1, 'Password is required'),
});

export const verify2FASchema = z.object({
    email: z.string().email('Invalid email address').transform(v => v.toLowerCase()),
    code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must contain only digits'),
});

export const resendCodeSchema = z.object({
    email: z.string().email('Invalid email address').transform(v => v.toLowerCase()),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address').transform(v => v.toLowerCase()),
});

export const resetPasswordSchema = z.object({
    email: z.string().email('Invalid email address').transform(v => v.toLowerCase()),
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

export const deviceAuthSchema = z.object({
    deviceToken: z.string().min(1, 'Device token is required'),
    deviceId: z.string().min(1, 'Device ID is required'),
});

export const verify2FAWithDeviceSchema = z.object({
    email: z.string().email('Invalid email address').transform(v => v.toLowerCase()),
    code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must contain only digits'),
    deviceId: z.string().optional(),
    deviceName: z.string().optional(),
    platform: z.string().optional(),
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
    roleId: string;
    features: string[];
    companyId: string;
    companyName: string;
    effectiveFeatures: CompanyFeatures;
    effectiveSpaceType: SpaceType;
    effectivePeopleType: PeopleType;
}

export interface CompanyInfo {
    id: string;
    name: string;
    code: string;
    roleId: string;
    allStoresAccess: boolean;
    companyFeatures: CompanyFeatures;
    spaceType: SpaceType;
    peopleType: PeopleType;
}

export interface UserInfo {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    globalRole: GlobalRole | null;
    isAppViewer: boolean;
    activeCompanyId: string | null;
    activeStoreId: string | null;
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

export interface DeviceTokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: UserInfo;
}

export interface DeviceInfo {
    id: string;
    deviceId: string;
    deviceName: string | null;
    platform: string | null;
    lastUsedAt: Date;
    lastIp: string | null;
    createdAt: Date;
    expiresAt: Date;
    current?: boolean;
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
        roleId: string;
        features: unknown;
        store: {
            name: string;
            code: string;
            companyId: string;
            settings: unknown;
            company: {
                name: string;
                settings: unknown;
            };
        };
    }>;
    activeCompanyId: string | null;
    activeStoreId: string | null;
    userCompanies: Array<{
        companyId: string;
        roleId: string;
        allStoresAccess: boolean;
        company: {
            name: string;
            code: string;
            settings: unknown;
        };
    }>;
}
