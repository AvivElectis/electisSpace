/**
 * Common Types
 * 
 * @description Shared type definitions used across the server.
 */

// ======================
// Pagination
// ======================

export interface PaginationParams {
    page: number;
    limit: number;
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

// ======================
// Entity IDs
// ======================

export type EntityId = string;

// ======================
// Service Result
// ======================

export interface ServiceResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// ======================
// Request Context
// ======================

export interface RequestContext {
    userId: string;
    globalRole: string | null;
    stores: Array<{ id: string; role: string; companyId: string }>;
    companies: Array<{ id: string; role: string }>;
}

// ======================
// Common DTOs
// ======================

export interface IdParam {
    id: string;
}

export interface SearchParams extends PaginationParams {
    search?: string;
}
