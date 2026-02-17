/**
 * Users Feature - Types & DTOs
 * 
 * @description Type definitions, validation schemas, and DTOs for user management.
 */
import { z } from 'zod';
import { GlobalRole, StoreRole, CompanyRole } from '@prisma/client';

// ======================
// Constants
// ======================

export const AVAILABLE_FEATURES = ['dashboard', 'spaces', 'conference', 'people', 'sync', 'settings', 'labels', 'imageLabels'] as const;
export type Feature = typeof AVAILABLE_FEATURES[number];

const COMPANY_CODE_REGEX = /^[A-Z]{3,}$/;
const STORE_CODE_REGEX = /^\d+$/;

// ======================
// Validation Schemas
// ======================

// Company reference - existing or new
export const companyRefSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('existing'),
        id: z.string().uuid(),
    }),
    z.object({
        type: z.literal('new'),
        code: z.string().regex(COMPANY_CODE_REGEX, 'Company code must be 3+ uppercase letters'),
        name: z.string().min(1).max(200),
        location: z.string().max(200).optional(),
        description: z.string().max(500).optional(),
    }),
]);

// Store reference - existing or new
export const storeRefSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('existing'),
        id: z.string().uuid(),
        role: z.enum(['STORE_ADMIN', 'STORE_MANAGER', 'STORE_EMPLOYEE', 'STORE_VIEWER']).default('STORE_VIEWER'),
        features: z.array(z.enum(AVAILABLE_FEATURES)).default(['dashboard']),
    }),
    z.object({
        type: z.literal('new'),
        code: z.string().regex(STORE_CODE_REGEX, 'Store code must be numeric'),
        name: z.string().min(1).max(200),
        role: z.enum(['STORE_ADMIN', 'STORE_MANAGER', 'STORE_EMPLOYEE', 'STORE_VIEWER']).default('STORE_VIEWER'),
        features: z.array(z.enum(AVAILABLE_FEATURES)).default(['dashboard']),
    }),
]);

// Create user with company/store
export const createUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    phone: z.string().max(50).optional().nullable(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    company: companyRefSchema,
    allStoresAccess: z.boolean().default(false),
    stores: z.array(storeRefSchema).optional(),
}).refine(
    (data) => data.allStoresAccess || (data.stores && data.stores.length > 0),
    { message: 'Either allStoresAccess must be true or at least one store must be specified', path: ['stores'] }
);

export const updateUserSchema = z.object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
});

export const updateUserStoreSchema = z.object({
    role: z.enum(['STORE_ADMIN', 'STORE_MANAGER', 'STORE_EMPLOYEE', 'STORE_VIEWER']).optional(),
    features: z.array(z.enum(AVAILABLE_FEATURES)).optional(),
});

export const assignUserToStoreSchema = z.object({
    userId: z.string().uuid(),
    storeId: z.string().uuid(),
    role: z.enum(['STORE_ADMIN', 'STORE_MANAGER', 'STORE_EMPLOYEE', 'STORE_VIEWER']).default('STORE_VIEWER'),
    features: z.array(z.enum(AVAILABLE_FEATURES)).default(['dashboard']),
});

export const elevateUserSchema = z.object({
    globalRole: z.enum(['USER', 'COMPANY_ADMIN', 'PLATFORM_ADMIN']),
    companyId: z.string().uuid().optional(),
}).refine(
    (data) => data.globalRole !== 'COMPANY_ADMIN' || data.companyId,
    { message: 'companyId is required when elevating to COMPANY_ADMIN', path: ['companyId'] }
);

export const assignUserToCompanySchema = z.object({
    company: companyRefSchema,
    allStoresAccess: z.boolean().default(false),
    isCompanyAdmin: z.boolean().default(false),
});

export const updateUserCompanySchema = z.object({
    allStoresAccess: z.boolean().optional(),
    isCompanyAdmin: z.boolean().optional(),
});

export const updateContextSchema = z.object({
    activeCompanyId: z.string().uuid().nullable().optional(),
    activeStoreId: z.string().uuid().nullable().optional(),
});

// ======================
// DTOs - Inputs
// ======================

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UpdateUserStoreDto = z.infer<typeof updateUserStoreSchema>;
export type AssignUserToStoreDto = z.infer<typeof assignUserToStoreSchema>;
export type ElevateUserDto = z.infer<typeof elevateUserSchema>;
export type AssignUserToCompanyDto = z.infer<typeof assignUserToCompanySchema>;
export type UpdateUserCompanyDto = z.infer<typeof updateUserCompanySchema>;
export type UpdateContextDto = z.infer<typeof updateContextSchema>;
export type CompanyRef = z.infer<typeof companyRefSchema>;
export type StoreRef = z.infer<typeof storeRefSchema>;

// ======================
// Query Parameters
// ======================

export interface UserListParams {
    page: number;
    limit: number;
    search?: string;
    storeId?: string;
    companyId?: string;
}

// ======================
// Response Types
// ======================

export interface UserStoreInfo {
    id: string;
    name: string;
    code: string;
    role: StoreRole;
    features: string[];
    companyId?: string;
    companyName?: string;
}

export interface UserCompanyInfo {
    id: string;
    code: string;
    name: string;
    location?: string | null;
    allStoresAccess: boolean;
    isCompanyAdmin: boolean;
}

export interface UserListItem {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    globalRole: GlobalRole | null;
    isActive: boolean;
    lastLogin: Date | null;
    createdAt: Date;
    stores: UserStoreInfo[];
}

export interface UserDetails extends UserListItem {
    updatedAt: Date;
}

export interface UserListResponse {
    data: UserListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface UserContextResponse {
    activeCompany: UserCompanyInfo | null;
    activeStore: UserStoreInfo | null;
    availableCompanies: UserCompanyInfo[];
    availableStores: Array<UserStoreInfo & { companyId: string }>;
}

export interface FeaturesResponse {
    features: Array<{ id: string; name: string }>;
}

// ======================
// User Context
// ======================

export interface UserContext {
    id: string;
    globalRole: string | null;
    stores?: Array<{ id: string; role: string }>;
    companies?: Array<{ id: string; role: string }>;
}
