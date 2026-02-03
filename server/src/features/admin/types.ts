/**
 * Admin Feature - Types
 * 
 * @description Validation schemas, DTOs and types for admin panel operations.
 */
import { z } from 'zod';

// ======================
// Validation Schemas
// ======================

/** Pagination schema for list endpoints */
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
});

/** Schema for impersonate context */
export const impersonateContextSchema = z.object({
    companyId: z.string().uuid(),
    storeId: z.string().uuid().optional(),
});

// ======================
// DTOs
// ======================

export type PaginationInput = z.infer<typeof paginationSchema>;
export type ImpersonateContextInput = z.infer<typeof impersonateContextSchema>;

// ======================
// Response Types
// ======================

export interface OverviewResponse {
    companies: { total: number };
    stores: { total: number };
    users: { total: number; active: number };
    entities: { spaces: number; people: number; conferenceRooms: number };
    sync: { pending: number; failed: number };
}

export interface CompanyListItem {
    id: string;
    code: string;
    name: string;
    location: string | null;
    isActive: boolean;
    hasAimsConfig: boolean;
    storesCount: number;
    usersCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface StoreListItem {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    syncEnabled: boolean;
    lastSyncAt: Date | null;
    company: { id: string; code: string; name: string };
    spacesCount: number;
    peopleCount: number;
    conferenceRoomsCount: number;
    pendingSyncCount: number;
    createdAt: Date;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ImpersonateContextResponse {
    context: {
        company: { id: string; code: string; name: string };
        store: { id: string; code: string; name: string; settings: any; syncEnabled: boolean } | null;
        aimsConfig: { baseUrl: string | null; cluster: string | null; username: string | null; hasPassword: boolean } | null;
    };
    message: string;
}

// ======================
// Filter Types
// ======================

export interface StoreListFilters extends PaginationInput {
    companyId?: string;
}

export interface EntityListFilters extends PaginationInput {
    storeId: string;
}

export interface SyncQueueFilters extends PaginationInput {
    storeId: string;
    status?: string;
}

export interface AuditLogFilters extends PaginationInput {
    userId?: string;
    companyId?: string;
    storeId?: string;
    action?: string;
}
