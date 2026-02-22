/**
 * People Feature - Types
 * 
 * @description Validation schemas, DTOs and types for people management.
 */
import { z } from 'zod';

// ======================
// Validation Schemas
// ======================

/** Schema for creating a person */
export const createPersonSchema = z.object({
    storeId: z.string().uuid(),
    externalId: z.string().max(50).optional(),
    data: z.record(z.unknown()).default({}),
});

/** Schema for updating a person */
export const updatePersonSchema = z.object({
    data: z.record(z.unknown()).optional(),
});

/** Schema for assigning person to space (spaceId is a slot number, not a Space UUID) */
export const assignSchema = z.object({
    spaceId: z.string().min(1, 'Space ID is required'),
});

// ======================
// DTOs
// ======================

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type AssignPersonInput = z.infer<typeof assignSchema>;

// ======================
// Filter Types
// ======================

export interface ListPeopleFilters {
    page: number;
    limit: number;
    search?: string;
    assigned?: string;
    listId?: string;
    storeId?: string;
}

// ======================
// Response Types
// ======================

export interface PersonResponse {
    id: string;
    externalId: string | null;
    labelCode: string | null;
    virtualSpaceId: string | null;
    data: Record<string, any>;
    storeId: string;
    assignedSpaceId: string | null;
    assignedLabels: string[];
    store?: { name: string; code: string };
    syncStatus: string;
    lastSyncedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaginatedPeopleResponse {
    data: PersonResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ImportResponse {
    message: string;
    jobId: string;
}

// ======================
// User Context for Authorization
// ======================

export interface PeopleUserContext {
    id: string;
    globalRole?: string | null;
    stores?: Array<{ id: string }>;
}
