/**
 * SSO Config Service
 * API client for SSO configuration management (admin)
 */
import api from './apiClient';

// ─── Types ─────────────────────────────────────────

export type SsoProtocol = 'SAML' | 'OIDC';

export interface SsoConfig {
    id: string;
    companyId: string;
    protocol: SsoProtocol;
    provider: string;
    domain: string;
    isActive: boolean;
    forceSso: boolean;
    autoProvision: boolean;
    claimMapping: Record<string, string> | null;
    // SAML fields
    idpEntityId: string | null;
    ssoUrl: string | null;
    sloUrl: string | null;
    x509Certificate: string | null; // masked as '[configured]' in list
    // OIDC fields
    issuer: string | null;
    clientId: string | null;
    discoveryUrl: string | null;
    scopes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSsoConfigPayload {
    protocol: SsoProtocol;
    provider: string;
    domain: string;
    isActive?: boolean;
    forceSso?: boolean;
    autoProvision?: boolean;
    claimMapping?: Record<string, string>;
    // SAML
    idpEntityId?: string;
    ssoUrl?: string;
    sloUrl?: string;
    x509Certificate?: string;
    // OIDC
    issuer?: string;
    clientId?: string;
    clientSecret?: string;
    discoveryUrl?: string;
    scopes?: string;
}

export type UpdateSsoConfigPayload = Partial<CreateSsoConfigPayload>;

// ─── API Methods ───────────────────────────────────

const BASE = (companyId: string) => `/admin/sso/${companyId}`;

export const ssoService = {
    async list(companyId: string): Promise<SsoConfig[]> {
        const res = await api.get(BASE(companyId));
        return res.data.data;
    },

    async getById(companyId: string, id: string): Promise<SsoConfig> {
        const res = await api.get(`${BASE(companyId)}/${id}`);
        return res.data.data;
    },

    async create(companyId: string, data: CreateSsoConfigPayload): Promise<SsoConfig> {
        const res = await api.post(BASE(companyId), data);
        return res.data.data;
    },

    async update(companyId: string, id: string, data: UpdateSsoConfigPayload): Promise<SsoConfig> {
        const res = await api.put(`${BASE(companyId)}/${id}`, data);
        return res.data.data;
    },

    async remove(companyId: string, id: string): Promise<void> {
        await api.delete(`${BASE(companyId)}/${id}`);
    },

    async testConnection(companyId: string, data: Partial<CreateSsoConfigPayload>): Promise<{ success: boolean; error?: string; details?: Record<string, unknown> }> {
        const res = await api.post(`${BASE(companyId)}/test`, data);
        return res.data;
    },
};
