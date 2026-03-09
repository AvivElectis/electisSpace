import { z } from 'zod';

export const SSO_PROTOCOLS = ['SAML', 'OIDC'] as const;
export type SsoProtocol = (typeof SSO_PROTOCOLS)[number];

export const SSO_PROVIDERS = ['AZURE_AD', 'GOOGLE', 'OKTA', 'CUSTOM'] as const;
export type SsoProvider = (typeof SSO_PROVIDERS)[number];

export const createSsoConfigSchema = z.object({
    protocol: z.enum(SSO_PROTOCOLS),
    provider: z.enum(SSO_PROVIDERS),
    domain: z.string().min(3).max(255),
    isActive: z.boolean().optional(),
    forceSso: z.boolean().optional(),
    autoProvision: z.boolean().optional(),
    claimMapping: z.record(z.string()).optional(),
    // SAML
    idpEntityId: z.string().max(500).optional(),
    ssoUrl: z.string().url().max(500).optional(),
    sloUrl: z.string().url().max(500).optional(),
    x509Certificate: z.string().optional(),
    // OIDC
    issuer: z.string().max(500).optional(),
    clientId: z.string().max(255).optional(),
    clientSecret: z.string().optional(),
    discoveryUrl: z.string().url().max(500).optional(),
    scopes: z.string().max(500).optional(),
});

export const updateSsoConfigSchema = createSsoConfigSchema.partial();

export interface SsoUserClaims {
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    department?: string;
    jobTitle?: string;
    groups?: string[];
}
