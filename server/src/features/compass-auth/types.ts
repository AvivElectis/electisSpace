import { z } from 'zod';
import type { CompanyUserRole } from '@prisma/client';

// ─── Request Schemas ─────────────────────────────────

export const compassLoginSchema = z.object({
    email: z.string().email().max(255),
});

export const compassVerifySchema = z.object({
    email: z.string().email().max(255),
    code: z.string().length(6).regex(/^\d{6}$/),
    deviceId: z.string().max(255).optional(),
    deviceName: z.string().max(255).optional(),
    platform: z.enum(['ANDROID', 'IOS', 'WEB']).optional(),
});

export const compassRefreshSchema = z.object({
    refreshToken: z.string().optional(),
});

export const compassDeviceAuthSchema = z.object({
    email: z.string().email().max(255),
    deviceToken: z.string(),
});

export const compassDeviceRegisterSchema = z.object({
    deviceName: z.string().max(255).optional(),
    platform: z.enum(['ANDROID', 'IOS', 'WEB']).optional(),
});

// ─── Response Types ──────────────────────────────────

export interface CompassUserInfo {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    role: CompanyUserRole;
    companyId: string;
    branchId: string;
    buildingId: string | null;
    floorId: string | null;
    preferences: unknown;
}

export interface CompassTokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: CompassUserInfo;
}

export interface CompassRefreshResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

// ─── JWT Payload ─────────────────────────────────────

export interface CompassJwtPayload {
    sub: string; // companyUserId
    companyId: string;
    branchId: string;
    role: CompanyUserRole;
    tokenType: 'COMPASS';
}
