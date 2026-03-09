import { prisma } from '../../config/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import { encryptCredentials, decryptCredentials } from './credentialEncryption.js';
import { notFound, badRequest } from '../../shared/middleware/index.js';
import type {
    Provider,
    IntegrationType,
    NormalizedUser,
    SyncResult,
    DirectorySyncAdapter,
} from './integrations.types.js';

// ─── CRUD ───────────────────────────────────────────

export async function createIntegration(
    companyId: string,
    provider: Provider,
    type: IntegrationType,
    credentials: Record<string, unknown>,
    options?: { syncIntervalMinutes?: number; fieldMapping?: Record<string, string> },
) {
    const credStr = JSON.stringify(credentials);
    const { encrypted, iv, tag } = encryptCredentials(credStr);

    return prisma.integrationConfig.create({
        data: {
            companyId,
            provider,
            type,
            credentials: encrypted,
            credentialsIv: iv,
            credentialsTag: tag,
            syncIntervalMinutes: options?.syncIntervalMinutes ?? 1440,
            fieldMapping: options?.fieldMapping ?? undefined,
        },
    });
}

export async function getIntegration(id: string, companyId: string) {
    const integration = await prisma.integrationConfig.findFirst({
        where: { id, companyId },
    });
    if (!integration) throw notFound('Integration not found');
    return integration;
}

export async function listIntegrations(companyId: string) {
    return prisma.integrationConfig.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
    });
}

export async function updateIntegration(
    id: string,
    companyId: string,
    data: {
        credentials?: Record<string, unknown>;
        syncIntervalMinutes?: number;
        fieldMapping?: Record<string, string>;
        isActive?: boolean;
    },
) {
    const integration = await getIntegration(id, companyId);

    const updateData: any = {};

    if (data.credentials) {
        const credStr = JSON.stringify(data.credentials);
        const { encrypted, iv, tag } = encryptCredentials(credStr);
        updateData.credentials = encrypted;
        updateData.credentialsIv = iv;
        updateData.credentialsTag = tag;
    }

    if (data.syncIntervalMinutes !== undefined) {
        updateData.syncIntervalMinutes = data.syncIntervalMinutes;
    }
    if (data.fieldMapping !== undefined) {
        updateData.fieldMapping = data.fieldMapping;
    }
    if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
    }

    return prisma.integrationConfig.update({
        where: { id: integration.id },
        data: updateData,
    });
}

export async function deleteIntegration(id: string, companyId: string) {
    const integration = await getIntegration(id, companyId);
    await prisma.integrationConfig.delete({ where: { id: integration.id } });
}

// ─── Credential Retrieval ───────────────────────────

export function getDecryptedCredentials(integration: {
    credentials: string;
    credentialsIv: string;
    credentialsTag: string;
}): Record<string, unknown> {
    const decrypted = decryptCredentials(
        integration.credentials,
        integration.credentialsIv,
        integration.credentialsTag,
    );
    return JSON.parse(decrypted);
}

// ─── Sync Execution ─────────────────────────────────

export async function executeSyncForIntegration(id: string, companyId: string, fullSync = false) {
    const integration = await getIntegration(id, companyId);

    if (!integration.isActive) {
        throw badRequest('Integration is not active');
    }

    const credentials = getDecryptedCredentials(integration);
    const syncToken = fullSync ? null : integration.syncToken;

    let adapter: DirectorySyncAdapter;

    switch (integration.provider) {
        case 'MICROSOFT_365':
            adapter = await createMicrosoftAdapter(credentials);
            break;
        case 'GOOGLE_WORKSPACE':
            adapter = await createGoogleAdapter(credentials);
            break;
        case 'OKTA':
            adapter = await createOktaAdapter(credentials);
            break;
        case 'LDAP':
            adapter = await createLdapAdapter(credentials);
            break;
        default:
            throw badRequest(`Unsupported provider: ${integration.provider}`);
    }

    try {
        const { users, nextSyncToken } = await adapter.fetchUsers(syncToken);
        const result = await applyUserSync(companyId, users);

        await prisma.integrationConfig.update({
            where: { id: integration.id },
            data: {
                lastSyncAt: new Date(),
                lastSyncStatus: result.errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
                lastSyncError: result.errors.length > 0 ? result.errors.join('; ') : null,
                lastSyncStats: { created: result.created, updated: result.updated, deactivated: result.deactivated },
                syncToken: nextSyncToken,
            },
        });

        appLogger.info('IntegrationSync', `Sync completed for ${id}`, { integrationId: id, ...result } as any);
        return result;
    } catch (error: any) {
        await prisma.integrationConfig.update({
            where: { id: integration.id },
            data: {
                lastSyncAt: new Date(),
                lastSyncStatus: 'FAILED',
                lastSyncError: error.message,
            },
        });
        appLogger.error('IntegrationSync', `Sync failed for ${id}: ${error.message}`);
        throw error;
    }
}

// ─── User Sync Logic ────────────────────────────────

async function applyUserSync(companyId: string, users: NormalizedUser[]): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, deactivated: 0, errors: [] };

    // Get the default branch for this company (first store/branch)
    const defaultBranch = await prisma.store.findFirst({
        where: { companyId },
        select: { id: true },
    });

    if (!defaultBranch) {
        result.errors.push('No branch found for company — cannot sync users');
        return result;
    }

    for (const user of users) {
        try {
            const existing = await prisma.companyUser.findFirst({
                where: { companyId, externalId: user.externalId },
            });

            if (existing) {
                // Update existing user
                await prisma.companyUser.update({
                    where: { id: existing.id },
                    data: {
                        email: user.email,
                        displayName: user.displayName,
                        isActive: user.isActive,
                    },
                });
                if (!user.isActive && existing.isActive) {
                    result.deactivated++;
                } else {
                    result.updated++;
                }
            } else if (user.isActive) {
                // Create new user
                await prisma.companyUser.create({
                    data: {
                        companyId,
                        branchId: defaultBranch.id,
                        email: user.email,
                        displayName: user.displayName,
                        externalId: user.externalId,
                        role: 'EMPLOYEE',
                        isActive: true,
                    },
                });
                result.created++;
            }
        } catch (err: any) {
            result.errors.push(`${user.email}: ${err.message}`);
        }
    }

    return result;
}

// ─── Test Connection ─────────────────────────────────

export async function testIntegrationConnection(
    provider: Provider,
    credentials: Record<string, unknown>,
): Promise<{ success: boolean; error?: string; details?: Record<string, unknown> }> {
    try {
        switch (provider) {
            case 'MICROSOFT_365': {
                // Try to acquire a token via MSAL
                const { MicrosoftUserSyncAdapter } = await import('./adapters/microsoftAdapter.js');
                const adapter = new MicrosoftUserSyncAdapter(credentials);
                const result = await adapter.fetchUsers();
                return {
                    success: true,
                    details: { usersFound: result.users.length, hasMore: result.hasMore },
                };
            }
            case 'GOOGLE_WORKSPACE': {
                const { GoogleUserSyncAdapter } = await import('./adapters/googleAdapter.js');
                const adapter = new GoogleUserSyncAdapter(credentials);
                const result = await adapter.fetchUsers();
                return {
                    success: true,
                    details: { usersFound: result.users.length },
                };
            }
            case 'OKTA': {
                const { OktaUserSyncAdapter } = await import('./adapters/oktaAdapter.js');
                const adapter = new OktaUserSyncAdapter(credentials);
                const result = await adapter.fetchUsers();
                return {
                    success: true,
                    details: { usersFound: result.users.length },
                };
            }
            case 'LDAP': {
                // For LDAP, just try to bind
                const { LdapUserSyncAdapter } = await import('./adapters/ldapAdapter.js');
                const adapter = new LdapUserSyncAdapter(credentials);
                const result = await adapter.fetchUsers();
                return {
                    success: true,
                    details: { usersFound: result.users.length },
                };
            }
            default:
                return { success: false, error: `Unsupported provider: ${provider}` };
        }
    } catch (err: any) {
        appLogger.warn('Integrations', `Connection test failed for ${provider}: ${err.message}`);
        return { success: false, error: err.message || 'Connection test failed' };
    }
}

// ─── Adapter Factory Stubs ──────────────────────────
// These will be replaced with real implementations in Phase 10 tasks P10-03/04/04B

async function createMicrosoftAdapter(credentials: Record<string, unknown>): Promise<DirectorySyncAdapter> {
    // Import dynamically when needed
    const { MicrosoftUserSyncAdapter } = await import('./adapters/microsoftAdapter.js');
    return new MicrosoftUserSyncAdapter(credentials);
}

async function createGoogleAdapter(credentials: Record<string, unknown>): Promise<DirectorySyncAdapter> {
    const { GoogleUserSyncAdapter } = await import('./adapters/googleAdapter.js');
    return new GoogleUserSyncAdapter(credentials);
}

async function createOktaAdapter(credentials: Record<string, unknown>): Promise<DirectorySyncAdapter> {
    const { OktaUserSyncAdapter } = await import('./adapters/oktaAdapter.js');
    return new OktaUserSyncAdapter(credentials);
}

async function createLdapAdapter(credentials: Record<string, unknown>): Promise<DirectorySyncAdapter> {
    const { LdapUserSyncAdapter } = await import('./adapters/ldapAdapter.js');
    return new LdapUserSyncAdapter(credentials);
}
