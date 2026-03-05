import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────

export const PROVIDERS = ['MICROSOFT_365', 'GOOGLE_WORKSPACE', 'OKTA'] as const;
export type Provider = (typeof PROVIDERS)[number];

export const INTEGRATION_TYPES = ['USER_DIRECTORY', 'CALENDAR_ROOMS', 'BOTH'] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const SYNC_STATUSES = ['SUCCESS', 'PARTIAL', 'FAILED'] as const;

// ─── Normalized types for adapters ──────────────────

export interface NormalizedUser {
    externalId: string;
    email: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    department?: string;
    isActive: boolean;
}

export interface NormalizedRoom {
    externalId: string;
    name: string;
    email?: string;
    capacity?: number;
    building?: string;
    floor?: string;
    features?: string[];
}

export interface SyncResult {
    created: number;
    updated: number;
    deactivated: number;
    errors: string[];
}

// ─── Adapter interface ──────────────────────────────

export interface DirectorySyncAdapter {
    fetchUsers(syncToken?: string | null): Promise<{
        users: NormalizedUser[];
        nextSyncToken: string | null;
        hasMore: boolean;
    }>;
}

export interface RoomSyncAdapter {
    fetchRooms(): Promise<NormalizedRoom[]>;
}

// ─── Credential shapes per provider ─────────────────

export interface MicrosoftCredentials {
    tenantId: string;
    clientId: string;
    clientSecret: string;
}

export interface GoogleCredentials {
    serviceAccountJson: string; // JSON string of service account key
    adminEmail: string;        // Admin email for domain-wide delegation
    domain: string;
}

export interface OktaCredentials {
    domain: string;            // e.g., "company.okta.com"
    apiToken?: string;
    clientId?: string;
    clientSecret?: string;
    authMethod: 'API_TOKEN' | 'OAUTH2';
}

// ─── Zod schemas ────────────────────────────────────

export const createIntegrationSchema = z.object({
    provider: z.enum(PROVIDERS),
    type: z.enum(INTEGRATION_TYPES),
    credentials: z.record(z.unknown()),
    syncIntervalMinutes: z.number().int().min(15).max(10080).optional(), // 15min to 7days
    fieldMapping: z.record(z.string()).optional(),
});

export const updateIntegrationSchema = z.object({
    credentials: z.record(z.unknown()).optional(),
    syncIntervalMinutes: z.number().int().min(15).max(10080).optional(),
    fieldMapping: z.record(z.string()).optional(),
    isActive: z.boolean().optional(),
});

export const triggerSyncSchema = z.object({
    fullSync: z.boolean().optional(), // If true, ignore delta token
});
