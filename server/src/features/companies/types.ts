/**
 * Companies Feature - Types & DTOs
 *
 * @description Type definitions, interfaces, and validation schemas for the companies feature.
 */
import { z } from 'zod';
import type { CompanyFeatures, SpaceType } from '../../shared/utils/featureResolution.js';

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

/** Company features schema with mutual exclusivity validation */
export const companyFeaturesSchema = z.object({
    spacesEnabled: z.boolean(),
    peopleEnabled: z.boolean(),
    conferenceEnabled: z.boolean(),
    simpleConferenceMode: z.boolean(),
    labelsEnabled: z.boolean(),
    aimsManagementEnabled: z.boolean(),
    compassEnabled: z.boolean().default(false),
}).refine(
    (data) => !(data.spacesEnabled && data.peopleEnabled),
    { message: 'Spaces and People cannot both be enabled' }
);

/** Space type enum */
export const spaceTypeSchema = z.enum(['office', 'room', 'chair', 'person-tag']);

/** Store to create alongside company */
export const createStoreSchema = z.object({
    code: z.string().min(1, 'Store code is required'),
    name: z.string().max(100).optional(),
    timezone: z.string().default('UTC'),
});

/** Create company schema (base — legacy single-store) */
export const createCompanySchema = z.object({
    code: companyCodeSchema,
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    location: z.string().max(255).optional(),
    description: z.string().optional(),
    aimsConfig: aimsConfigSchema.optional(),
    companyFeatures: companyFeaturesSchema.optional(),
    spaceType: spaceTypeSchema.optional(),
});

/** Compass default booking rules config */
export const compassConfigSchema = z.object({
    maxDurationMinutes: z.number().int().min(30).max(43200), // up to 30 days
    maxAdvanceBookingDays: z.number().int().min(1).max(90),
    checkInWindowMinutes: z.number().int().min(5).max(60),
    autoReleaseMinutes: z.number().int().min(5).max(120),
    maxConcurrentBookings: z.number().int().min(1).max(5),
});

/** Building hierarchy for compass company setup */
const buildingSchema = z.object({
    name: z.string().min(1),
    floors: z.array(z.object({ name: z.string().min(1) })).default([]),
});

/** Extended create company schema with multi-store + config (backward-compatible) */
export const createCompanyFullSchema = createCompanySchema.extend({
    stores: z.array(createStoreSchema).default([]),
    articleFormat: z.record(z.unknown()).optional(),
    fieldMapping: z.record(z.unknown()).optional(),
    compassConfig: compassConfigSchema.optional(),
    buildings: z.array(buildingSchema).optional(),
});

/** Update company schema */
export const updateCompanySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    location: z.string().max(255).nullable().optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    companyFeatures: companyFeaturesSchema.optional(),
    spaceType: spaceTypeSchema.optional(),
});

/** Update AIMS config schema - password is optional (only updates if provided) */
export const updateAimsConfigSchema = z.object({
    baseUrl: z.string().url('Invalid AIMS base URL'),
    cluster: z.string().optional(),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required').optional(),
});

/** Fetch AIMS stores - raw credentials for pre-save connection */
export const fetchAimsStoresSchema = z.object({
    baseUrl: z.string().url('Invalid AIMS base URL'),
    cluster: z.string().optional(),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    companyCode: z.string().min(1, 'Company code is required'),
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
    companyFeatures?: CompanyFeatures;
    spaceType?: SpaceType;
}

export interface CreateCompanyFullDto extends CreateCompanyDto {
    stores: Array<{ code: string; name?: string; timezone?: string }>;
    articleFormat?: Record<string, unknown>;
    fieldMapping?: Record<string, unknown>;
    compassConfig?: {
        maxDurationMinutes: number;
        maxAdvanceBookingDays: number;
        checkInWindowMinutes: number;
        autoReleaseMinutes: number;
        maxConcurrentBookings: number;
    };
    buildings?: Array<{
        name: string;
        floors: Array<{ name: string }>;
    }>;
}

export interface UpdateCompanyDto {
    name?: string;
    location?: string | null;
    description?: string | null;
    isActive?: boolean;
    companyFeatures?: CompanyFeatures;
    spaceType?: SpaceType;
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
    userRoleId: string | null;
    allStoresAccess?: boolean;
    aimsConfigured: boolean;
    companyFeatures: CompanyFeatures;
    spaceType: SpaceType;
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
    // Company-level features and space type
    companyFeatures: CompanyFeatures;
    spaceType: SpaceType;
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
    companyRoleId: string;
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
    companies?: Array<{ id: string; roleId: string }>;
}
