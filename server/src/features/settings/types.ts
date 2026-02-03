/**
 * Settings Feature - Types
 * 
 * @description Validation schemas, DTOs and types for settings management.
 */
import { z } from 'zod';

// ======================
// Validation Schemas
// ======================

/** Schema for updating generic settings */
export const updateSettingsSchema = z.object({
    settings: z.record(z.any()),
});

/** Schema for solum field mapping */
export const solumFieldMappingSchema = z.object({
    friendlyNameEn: z.string(),
    friendlyNameHe: z.string(),
    visible: z.boolean(),
});

/** Schema for conference mapping */
export const conferenceMappingSchema = z.object({
    meetingName: z.string(),
    meetingTime: z.string(),
    participants: z.string(),
});

/** Schema for field mapping configuration */
export const fieldMappingConfigSchema = z.object({
    uniqueIdField: z.string().min(1),
    fields: z.record(solumFieldMappingSchema),
    conferenceMapping: conferenceMappingSchema,
    globalFieldAssignments: z.record(z.string()).optional(),
    mappingInfo: z.object({
        articleIdField: z.string().optional(),
        articleNameField: z.string().optional(),
    }).optional(),
});

// ======================
// DTOs
// ======================

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type FieldMappingConfigInput = z.infer<typeof fieldMappingConfigSchema>;

// ======================
// Response Types
// ======================

export interface StoreSettingsResponse {
    storeId: string;
    storeName: string;
    storeCode: string;
    settings: Record<string, any>;
}

export interface CompanySettingsResponse {
    companyId: string;
    companyName: string;
    companyCode: string;
    settings: Record<string, any>;
}

export interface FieldMappingsResponse {
    companyId: string;
    fieldMappings: {
        uniqueIdField: string;
        fields: Record<string, { friendlyNameEn: string; friendlyNameHe: string; visible: boolean }>;
        conferenceMapping: { meetingName: string; meetingTime: string; participants: string };
        globalFieldAssignments?: Record<string, string>;
    };
}

export interface AimsConfigResponse {
    companyId: string;
    aimsConfig: {
        configured: boolean;
        baseUrl: string | null;
        cluster: string | null;
        username: string | null;
        hasPassword: boolean;
    };
}

export interface AimsTestResponse {
    success: boolean;
    message: string;
    configured: boolean;
}

export interface UpdateSuccessResponse {
    storeId?: string;
    companyId?: string;
    settings?: Record<string, any>;
    fieldMappings?: FieldMappingConfigInput;
    message: string;
}

// ======================
// User Context for Authorization
// ======================

export interface SettingsUserContext {
    id: string;
    globalRole: string | null;
}
