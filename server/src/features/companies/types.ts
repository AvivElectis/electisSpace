/**
 * Companies Feature - Types & DTOs
 * 
 * @description Type definitions, interfaces, and validation schemas for the companies feature.
 */
import { z } from 'zod';
import { CompanyRole } from '@prisma/client';

// ======================
// Validation Schemas
// ======================

/** Company code validation: 3-20 uppercase letters */
export const companyCodeSchema = z.string()
    .min(3, 'Company code must be at least 3 characters')
    .max(20, 'Company code must be at most 20 characters')
    .regex(/^[A-Z]+$/, 'Company code must contain only uppercase letters');

/** AIMS configuration schema */
export const aimsConfigSchema = z.object({
    baseUrl: z.string().url('Invalid AIMS base URL'),
    cluster: z.string().optional(),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

/** Create company schema */
export const createCompanySchema = z.object({
    code: companyCodeSchema,
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    location: z.string().max(255).optional(),
    description: z.string().optional(),
    aimsConfig: aimsConfigSchema.optional(),
});

/** Update company schema */
export const updateCompanySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    location: z.string().max(255).nullable().optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
});

/** Update AIMS config schema - password is optional (only updates if provided) */
export const updateAimsConfigSchema = z.object({
    baseUrl: z.string().url('Invalid AIMS base URL'),
    cluster: z.string().optional(),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required').optional(),
});

// ======================
// Query Parameters
// ======================

export interface CompanyListParams {
    search?: string;
    page: number;
    limit: number;
    isActive?: boolean;
}

// ======================
// DTOs (Data Transfer Objects)
// ======================

export interface CreateCompanyDto {
    code: string;
    name: string;
    location?: string;
    description?: string;
    aimsConfig?: {
        baseUrl: string;
        cluster?: string;
        username: string;
        password: string;
    };
}

export interface UpdateCompanyDto {
    name?: string;
    location?: string | null;
    description?: string | null;
    isActive?: boolean;
}

export interface UpdateAimsConfigDto {
    baseUrl: string;
    cluster?: string;
    username: string;
    password?: string; // Optional - only updates if provided
}

// ======================
// Response Types
// ======================

export interface CompanyListItem {
    id: string;
    code: string;
    name: string;
    location: string | null;
    description: string | null;
    isActive: boolean;
    storeCount: number;
    userCount: number;
    userRole: CompanyRole | null;
    allStoresAccess?: boolean;
    aimsConfigured: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CompanyListResponse {
    data: CompanyListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CompanyDetails {
    id: string;
    code: string;
    name: string;
    location: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // AIMS fields at top level for frontend compatibility
    aimsBaseUrl: string | null;
    aimsCluster: string | null;
    aimsUsername: string | null;
    aimsConfigured: boolean;
    // Nested config for backwards compatibility
    aimsConfig?: {
        baseUrl: string | null;
        cluster: string | null;
        username: string | null;
        hasPassword: boolean;
    };
}

export interface StoreListItem {
    id: string;
    code: string;
    name: string;
    timezone: string;
    syncEnabled: boolean;
    lastAimsSyncAt: Date | null;
    isActive: boolean;
    spaceCount: number;
    peopleCount: number;
    conferenceRoomCount: number;
}

export interface CompanyUserItem {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    globalRole: string | null;
    companyRole: CompanyRole;
    allStoresAccess: boolean;
    isActive: boolean;
}

export interface CompanyDetailResponse {
    company: CompanyDetails;
    stores: StoreListItem[];
    users?: CompanyUserItem[];
}

export interface CodeValidationResponse {
    available: boolean;
    reason: string | null;
}

// ======================
// User Context
// ======================

/**
 * User context extracted from authenticated request.
 * Matches Express.Request.user from auth middleware.
 */
export interface UserContext {
    id: string;
    globalRole: string | null;
    companies?: Array<{ id: string; role: string }>;
}
