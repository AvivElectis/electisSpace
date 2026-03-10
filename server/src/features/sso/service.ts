import { prisma } from '../../config/index.js';
import { notFound, badRequest } from '../../shared/middleware/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import type { SsoUserClaims } from './types.js';

// ─── CRUD ───────────────────────────────────────────

export async function createSsoConfig(companyId: string, data: {
    protocol: string;
    provider: string;
    domain: string;
    isActive?: boolean;
    forceSso?: boolean;
    autoProvision?: boolean;
    claimMapping?: Record<string, string>;
    idpEntityId?: string;
    ssoUrl?: string;
    sloUrl?: string;
    x509Certificate?: string;
    issuer?: string;
    clientId?: string;
    clientSecret?: string;
    discoveryUrl?: string;
    scopes?: string;
}) {
    return prisma.ssoConfig.create({
        data: {
            companyId,
            protocol: data.protocol,
            provider: data.provider,
            domain: data.domain.toLowerCase(),
            isActive: data.isActive ?? false,
            forceSso: data.forceSso ?? false,
            autoProvision: data.autoProvision ?? false,
            claimMapping: data.claimMapping ?? undefined,
            idpEntityId: data.idpEntityId,
            ssoUrl: data.ssoUrl,
            sloUrl: data.sloUrl,
            x509Certificate: data.x509Certificate,
            issuer: data.issuer,
            clientId: data.clientId,
            clientSecret: data.clientSecret,
            discoveryUrl: data.discoveryUrl,
            scopes: data.scopes ?? 'openid profile email',
        },
    });
}

export async function getSsoConfig(id: string, companyId: string) {
    const config = await prisma.ssoConfig.findFirst({ where: { id, companyId } });
    if (!config) throw notFound('SSO config not found');
    return config;
}

export async function listSsoConfigs(companyId: string) {
    return prisma.ssoConfig.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
    });
}

export async function updateSsoConfig(id: string, companyId: string, data: Partial<{
    protocol: string;
    provider: string;
    domain: string;
    isActive: boolean;
    forceSso: boolean;
    autoProvision: boolean;
    claimMapping: Record<string, string>;
    idpEntityId: string;
    ssoUrl: string;
    sloUrl: string;
    x509Certificate: string;
    issuer: string;
    clientId: string;
    clientSecret: string;
    discoveryUrl: string;
    scopes: string;
}>) {
    const config = await getSsoConfig(id, companyId);
    return prisma.ssoConfig.update({
        where: { id: config.id },
        data: {
            ...data,
            domain: data.domain?.toLowerCase(),
        } as any,
    });
}

export async function deleteSsoConfig(id: string, companyId: string) {
    const config = await getSsoConfig(id, companyId);
    await prisma.ssoConfig.delete({ where: { id: config.id } });
}

// ─── Domain Lookup ──────────────────────────────────

export async function findSsoConfigByDomain(emailDomain: string) {
    return prisma.ssoConfig.findFirst({
        where: {
            domain: emailDomain.toLowerCase(),
            isActive: true,
        },
    });
}

// ─── User Provisioning ──────────────────────────────

export async function findOrCreateSsoUser(companyId: string, claims: SsoUserClaims) {
    // First try to find existing user by email
    const existing = await prisma.companyUser.findFirst({
        where: { companyId, email: claims.email.toLowerCase() },
    });

    if (existing) {
        appLogger.info('SSO', `Found existing user: ${claims.email}`);
        return existing;
    }

    // Auto-provision: create new user
    const defaultBranch = await prisma.store.findFirst({
        where: { companyId },
        select: { id: true },
    });

    if (!defaultBranch) {
        throw badRequest('No branch found for company — cannot provision SSO user');
    }

    const firstName = claims.firstName || claims.displayName || claims.email.split('@')[0];
    const lastName = claims.lastName || null;
    const displayName = claims.displayName
        || [firstName, lastName].filter(Boolean).join(' ');

    appLogger.info('SSO', `Auto-provisioning user: ${claims.email}`);

    return prisma.companyUser.create({
        data: {
            companyId,
            branchId: defaultBranch.id,
            email: claims.email.toLowerCase(),
            firstName,
            lastName,
            displayName,
            role: 'EMPLOYEE',
            isActive: true,
            jobTitle: claims.jobTitle ?? null,
        },
    });
}
