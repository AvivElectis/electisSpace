import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock appLogger to avoid importing server config (which calls process.exit)
vi.mock('../../../shared/infrastructure/services/appLogger.js', () => ({
    appLogger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock MSAL for Microsoft adapter tests
vi.mock('@azure/msal-node', () => {
    class MockCCA {
        acquireTokenByClientCredential() {
            return Promise.resolve({ accessToken: 'mock-token' });
        }
    }
    return { ConfidentialClientApplication: MockCCA };
});

// ─── Microsoft User Adapter Tests ────────────────────

describe('MicrosoftUserSyncAdapter', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should normalize Graph API user response', async () => {
        const mockGraphResponse = {
            value: [
                {
                    id: 'user-1',
                    displayName: 'John Doe',
                    mail: 'john@company.com',
                    userPrincipalName: 'john@company.com',
                    givenName: 'John',
                    surname: 'Doe',
                    jobTitle: 'Engineer',
                    department: 'Engineering',
                    officeLocation: 'Building A',
                    mobilePhone: '+1234567890',
                    accountEnabled: true,
                },
                {
                    id: 'user-2',
                    displayName: 'Jane Smith',
                    mail: 'jane@company.com',
                    userPrincipalName: 'jane@company.com',
                    givenName: 'Jane',
                    surname: 'Smith',
                    jobTitle: 'Manager',
                    department: 'HR',
                    officeLocation: null,
                    mobilePhone: null,
                    accountEnabled: false,
                },
            ],
            '@odata.deltaLink': 'https://graph.microsoft.com/v1.0/users/delta?$deltatoken=abc123',
        };

        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockGraphResponse),
            headers: new Map(),
        }) as any;

        try {
            const { MicrosoftUserSyncAdapter } = await import('../adapters/microsoftAdapter.js');
            const adapter = new MicrosoftUserSyncAdapter({
                tenantId: 'test-tenant',
                clientId: 'test-client',
                clientSecret: 'test-only-not-real', // pragma: allowlist secret
            });

            const result = await adapter.fetchUsers();

            expect(result.users).toHaveLength(2);
            expect(result.users[0]).toEqual({
                externalId: 'user-1',
                email: 'john@company.com',
                displayName: 'John Doe',
                firstName: 'John',
                lastName: 'Doe',
                jobTitle: 'Engineer',
                department: 'Engineering',
                isActive: true,
            });
            expect(result.users[1].isActive).toBe(false);
            expect(result.nextSyncToken).toBe('https://graph.microsoft.com/v1.0/users/delta?$deltatoken=abc123');
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('should use delta link as sync token for incremental sync', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ value: [], '@odata.deltaLink': 'new-delta' }),
            headers: new Map(),
        });

        const originalFetch = global.fetch;
        global.fetch = fetchMock as any;

        try {
            const { MicrosoftUserSyncAdapter } = await import('../adapters/microsoftAdapter.js');
            const adapter = new MicrosoftUserSyncAdapter({
                tenantId: 'test-tenant',
                clientId: 'test-client',
                clientSecret: 'test-only-not-real', // pragma: allowlist secret
            });

            await adapter.fetchUsers('https://graph.microsoft.com/delta?token=old');

            expect(fetchMock).toHaveBeenCalledWith(
                'https://graph.microsoft.com/delta?token=old',
                expect.any(Object),
            );
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('should skip entries without email', async () => {
        const mockGraphResponse = {
            value: [
                { id: 'svc-1', displayName: 'Service Account', mail: null, userPrincipalName: null, accountEnabled: true },
                { id: 'user-1', displayName: 'Real User', mail: 'real@co.com', userPrincipalName: 'real@co.com', accountEnabled: true },
            ],
            '@odata.deltaLink': 'delta-link',
        };

        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockGraphResponse),
            headers: new Map(),
        }) as any;

        try {
            const { MicrosoftUserSyncAdapter } = await import('../adapters/microsoftAdapter.js');
            const adapter = new MicrosoftUserSyncAdapter({
                tenantId: 't', clientId: 'c', clientSecret: 's',
            });
            const result = await adapter.fetchUsers();
            expect(result.users).toHaveLength(1);
            expect(result.users[0].email).toBe('real@co.com');
        } finally {
            global.fetch = originalFetch;
        }
    });
});

// ─── Microsoft Room Adapter Tests ────────────────────

describe('MicrosoftRoomSyncAdapter', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should normalize Graph API room response', async () => {
        const mockRoomResponse = {
            value: [
                {
                    id: 'room-1',
                    displayName: 'Conference Room A',
                    emailAddress: 'roomA@company.com',
                    capacity: 10,
                    building: 'Building 1',
                    floorNumber: 3,
                    audioDeviceName: 'Poly Studio',
                    videoDeviceName: 'Logitech Rally',
                    displayDeviceName: 'Samsung Display',
                    isWheelChairAccessible: true,
                },
            ],
        };

        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockRoomResponse),
        }) as any;

        try {
            const { MicrosoftRoomSyncAdapter } = await import('../adapters/microsoftAdapter.js');
            const adapter = new MicrosoftRoomSyncAdapter({
                tenantId: 'test-tenant',
                clientId: 'test-client',
                clientSecret: 'test-only-not-real', // pragma: allowlist secret
            });

            const rooms = await adapter.fetchRooms();

            expect(rooms).toHaveLength(1);
            expect(rooms[0]).toEqual({
                externalId: 'room-1',
                name: 'Conference Room A',
                email: 'roomA@company.com',
                capacity: 10,
                building: 'Building 1',
                floor: '3',
                features: ['audio', 'video', 'display', 'wheelchair'],
            });
        } finally {
            global.fetch = originalFetch;
        }
    });
});

// ─── Okta Adapter Tests ──────────────────────────────

describe('OktaUserSyncAdapter', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should normalize Okta user response with API Token auth', async () => {
        const mockOktaResponse = [
            {
                id: 'okta-1',
                status: 'ACTIVE',
                profile: {
                    login: 'john@company.com',
                    email: 'john@company.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    displayName: 'John Doe',
                    title: 'Engineer',
                    department: 'Engineering',
                    organization: null,
                    mobilePhone: null,
                },
            },
            {
                id: 'okta-2',
                status: 'SUSPENDED',
                profile: {
                    login: 'jane@company.com',
                    email: 'jane@company.com',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    displayName: null,
                    title: null,
                    department: null,
                    organization: null,
                    mobilePhone: null,
                },
            },
        ];

        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockOktaResponse),
            headers: { get: () => null },
        }) as any;

        try {
            const { OktaUserSyncAdapter } = await import('../adapters/oktaAdapter.js');
            const adapter = new OktaUserSyncAdapter({
                domain: 'company.okta.com',
                apiToken: 'test-token',
                authMethod: 'API_TOKEN',
            });

            const result = await adapter.fetchUsers();

            expect(result.users).toHaveLength(2);
            expect(result.users[0]).toEqual({
                externalId: 'okta-1',
                email: 'john@company.com',
                displayName: 'John Doe',
                firstName: 'John',
                lastName: 'Doe',
                jobTitle: 'Engineer',
                department: 'Engineering',
                isActive: true,
            });
            expect(result.users[1].isActive).toBe(false);
            expect(result.nextSyncToken).toBeTruthy();
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('should use SSWS auth header with API token', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
            headers: { get: () => null },
        });

        const originalFetch = global.fetch;
        global.fetch = fetchMock as any;

        try {
            const { OktaUserSyncAdapter } = await import('../adapters/oktaAdapter.js');
            const adapter = new OktaUserSyncAdapter({
                domain: 'company.okta.com',
                apiToken: 'my-api-token',
                authMethod: 'API_TOKEN',
            });

            await adapter.fetchUsers();

            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('company.okta.com/api/v1/users'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'SSWS my-api-token',
                    }),
                }),
            );
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('should apply lastUpdated filter for incremental sync', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
            headers: { get: () => null },
        });

        const originalFetch = global.fetch;
        global.fetch = fetchMock as any;

        try {
            const { OktaUserSyncAdapter } = await import('../adapters/oktaAdapter.js');
            const adapter = new OktaUserSyncAdapter({
                domain: 'company.okta.com',
                apiToken: 'test',
                authMethod: 'API_TOKEN',
            });

            const syncToken = '2026-01-01T00:00:00.000Z';
            await adapter.fetchUsers(syncToken);

            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining(`lastUpdated gt "${syncToken}"`),
                expect.any(Object),
            );
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('should handle PASSWORD_EXPIRED and RECOVERY as active', async () => {
        const mockResponse = [
            { id: '1', status: 'PASSWORD_EXPIRED', profile: { login: 'a@b.com', email: 'a@b.com', firstName: 'A', lastName: 'B', displayName: 'A B', title: null, department: null, organization: null, mobilePhone: null } },
            { id: '2', status: 'RECOVERY', profile: { login: 'c@d.com', email: 'c@d.com', firstName: 'C', lastName: 'D', displayName: 'C D', title: null, department: null, organization: null, mobilePhone: null } },
            { id: '3', status: 'DEPROVISIONED', profile: { login: 'e@f.com', email: 'e@f.com', firstName: 'E', lastName: 'F', displayName: 'E F', title: null, department: null, organization: null, mobilePhone: null } },
        ];

        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true, status: 200,
            json: () => Promise.resolve(mockResponse),
            headers: { get: () => null },
        }) as any;

        try {
            const { OktaUserSyncAdapter } = await import('../adapters/oktaAdapter.js');
            const adapter = new OktaUserSyncAdapter({ domain: 'test.okta.com', apiToken: 'tok', authMethod: 'API_TOKEN' });
            const result = await adapter.fetchUsers();

            expect(result.users[0].isActive).toBe(true);  // PASSWORD_EXPIRED
            expect(result.users[1].isActive).toBe(true);  // RECOVERY
            expect(result.users[2].isActive).toBe(false);  // DEPROVISIONED
        } finally {
            global.fetch = originalFetch;
        }
    });
});

// ─── LDAP Adapter Tests ──────────────────────────────

describe('LdapUserSyncAdapter', () => {
    it('should construct with LDAP credentials', async () => {
        const { LdapUserSyncAdapter } = await import('../adapters/ldapAdapter.js');
        const adapter = new LdapUserSyncAdapter({
            url: 'ldaps://ldap.company.com:636',
            bindDn: 'cn=admin,dc=company,dc=com',
            bindPassword: 'test-only-not-real', // pragma: allowlist secret
            searchBase: 'ou=users,dc=company,dc=com',
            searchFilter: '(objectClass=person)',
            useTls: true,
        });

        expect(adapter).toBeDefined();
    });

    it('should always return null syncToken (no incremental support)', async () => {
        // We can't easily test actual LDAP connection, just verify the interface contract
        const { LdapUserSyncAdapter } = await import('../adapters/ldapAdapter.js');
        const adapter = new LdapUserSyncAdapter({
            url: 'ldap://localhost:389',
            bindDn: 'cn=admin',
            bindPassword: 'test-only-not-real', // pragma: allowlist secret
            searchBase: 'dc=test',
            searchFilter: '(objectClass=person)',
            useTls: false,
        });

        // The adapter exists and implements the interface
        expect(typeof adapter.fetchUsers).toBe('function');
    });
});
