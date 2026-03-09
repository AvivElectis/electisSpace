/**
 * Integration Service
 * API client for directory/calendar sync integration management
 */
import api from './apiClient';

// ─── Types ─────────────────────────────────────────

export type Provider = 'MICROSOFT_365' | 'GOOGLE_WORKSPACE' | 'OKTA' | 'LDAP';
export type IntegrationType = 'USER_DIRECTORY' | 'CALENDAR_ROOMS' | 'BOTH';
export type SyncStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface Integration {
    id: string;
    provider: Provider;
    type: IntegrationType;
    isActive: boolean;
    syncIntervalMinutes: number;
    lastSyncAt: string | null;
    lastSyncStatus: SyncStatus | null;
    lastSyncError: string | null;
    lastSyncStats: { created: number; updated: number; deactivated: number } | null;
    fieldMapping?: Record<string, string> | null;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateIntegrationPayload {
    provider: Provider;
    type: IntegrationType;
    credentials: Record<string, unknown>;
    syncIntervalMinutes?: number;
    fieldMapping?: Record<string, string>;
}

export interface UpdateIntegrationPayload {
    credentials?: Record<string, unknown>;
    syncIntervalMinutes?: number;
    fieldMapping?: Record<string, string>;
    isActive?: boolean;
}

// ─── API ───────────────────────────────────────────

const basePath = (companyId: string) =>
    `/admin/companies/${companyId}/integrations`;

export const integrationService = {
    async list(companyId: string): Promise<Integration[]> {
        const { data } = await api.get(basePath(companyId));
        return data.integrations;
    },

    async getById(companyId: string, id: string): Promise<Integration> {
        const { data } = await api.get(`${basePath(companyId)}/${id}`);
        return data;
    },

    async create(companyId: string, payload: CreateIntegrationPayload): Promise<Integration> {
        const { data } = await api.post(basePath(companyId), payload);
        return data;
    },

    async update(companyId: string, id: string, payload: UpdateIntegrationPayload): Promise<Integration> {
        const { data } = await api.put(`${basePath(companyId)}/${id}`, payload);
        return data;
    },

    async remove(companyId: string, id: string): Promise<void> {
        await api.delete(`${basePath(companyId)}/${id}`);
    },

    async triggerSync(companyId: string, id: string, fullSync = false): Promise<{ created: number; updated: number; deactivated: number }> {
        const { data } = await api.post(`${basePath(companyId)}/${id}/sync`, { fullSync });
        return data.result;
    },
};
