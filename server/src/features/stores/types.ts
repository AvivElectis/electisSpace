/**
 * Stores Feature - Types
 * 
 * @description Validation schemas, DTOs and types for store management.
 */
import { z } from 'zod';
import { companyFeaturesSchema, spaceTypeSchema } from '../companies/types.js';

// ======================
// Validation Schemas
// ======================

/** Store code: numeric string like "01", "002", "200" */
export const storeCodeSchema = z.string()
    .min(1, 'Store code is required')
    .max(10, 'Store code must be at most 10 characters')
    .regex(/^\d+$/, 'Store code must contain only digits');

/** Schema for creating a new store */
export const createStoreSchema = z.object({
    code: storeCodeSchema,
    name: z.string().min(1).max(100),
    timezone: z.string().max(50).default('UTC'),
    syncEnabled: z.boolean().default(true),
});

/** Schema for updating a store */
export const updateStoreSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    timezone: z.string().max(50).optional(),
    syncEnabled: z.boolean().optional(),
    isActive: z.boolean().optional(),
    storeFeatures: companyFeaturesSchema.nullable().optional(),
    storeSpaceType: spaceTypeSchema.nullable().optional(),
});

// ======================
// DTOs
// ======================

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

// ======================
// Response Types
// ======================

export interface StoreResponse {
    id: string;
    code: string;
    name: string;
    timezone: string | null;
    syncEnabled: boolean;
    lastAimsSyncAt: Date | null;
    isActive: boolean;
    spaceCount: number;
    peopleCount: number;
    conferenceRoomCount?: number;
    userCount?: number;
    userRole?: string | null;
    userFeatures?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface StoreListResponse {
    company: {
        id: string;
        code: string;
        name: string;
    };
    stores: StoreResponse[];
    allStoresAccess: boolean;
}

export interface CodeValidationResponse {
    available: boolean;
    reason: string | null;
}

// ======================
// User Context for Authorization
// ======================

export interface CompanyAccess {
    id: string;
    role: string;
    allStoresAccess?: boolean;
}

export interface StoreUserContext {
    id: string;
    globalRole: string | null;
    stores?: Array<{ id: string; role: string }>;
    companies?: Array<CompanyAccess>;
}
