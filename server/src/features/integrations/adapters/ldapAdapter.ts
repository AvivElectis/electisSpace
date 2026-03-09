import ldap from 'ldapjs';
import { appLogger } from '../../../shared/infrastructure/services/appLogger.js';
import type { DirectorySyncAdapter, NormalizedUser, LdapCredentials } from '../integrations.types.js';

/**
 * LDAP User Sync Adapter
 * Connects to LDAP/Active Directory using ldapjs.
 * Supports LDAP (389) and LDAPS (636) connections.
 * Full sync only — LDAP doesn't support delta queries natively.
 *
 * Maps LDAP attributes:
 * - cn/displayName → displayName
 * - mail → email
 * - givenName → firstName
 * - sn → lastName
 * - title → jobTitle
 * - department → department
 * - telephoneNumber → phone
 * - userAccountControl (AD) or active status → isActive
 */
export class LdapUserSyncAdapter implements DirectorySyncAdapter {
    private credentials: LdapCredentials;

    constructor(rawCredentials: Record<string, unknown>) {
        this.credentials = rawCredentials as unknown as LdapCredentials;
    }

    async fetchUsers(_syncToken?: string | null): Promise<{
        users: NormalizedUser[];
        nextSyncToken: string | null;
        hasMore: boolean;
    }> {
        const client = await this.createClient();

        try {
            await this.bind(client);
            const entries = await this.search(client);

            const users: NormalizedUser[] = entries.map(entry => {
                const attrs = this.entryToMap(entry);
                const email = attrs['mail'] || '';
                if (!email) return null;

                // Active Directory uses userAccountControl bitmask (bit 1 = disabled)
                const uac = parseInt(attrs['useraccountcontrol'] || '0', 10);
                const isDisabledAD = uac > 0 && (uac & 0x0002) !== 0;

                return {
                    externalId: attrs['objectguid'] || attrs['entryuuid'] || attrs['uid'] || attrs['dn'] || email,
                    email,
                    displayName: attrs['displayname'] || attrs['cn'] || email,
                    firstName: attrs['givenname'] || undefined,
                    lastName: attrs['sn'] || undefined,
                    jobTitle: attrs['title'] || undefined,
                    department: attrs['department'] || undefined,
                    isActive: !isDisabledAD,
                };
            }).filter(Boolean) as NormalizedUser[];

            appLogger.info('LdapSync', `Fetched ${users.length} users from ${this.credentials.url}`);
            // LDAP doesn't support incremental sync, always return null token
            return { users, nextSyncToken: null, hasMore: false };
        } finally {
            client.unbind();
        }
    }

    private createClient(): Promise<ldap.Client> {
        return new Promise((resolve, reject) => {
            const opts: ldap.ClientOptions = {
                url: this.credentials.url,
                timeout: 30000,
                connectTimeout: 10000,
            };

            if (this.credentials.useTls && !this.credentials.url.startsWith('ldaps://')) {
                opts.tlsOptions = { rejectUnauthorized: false };
            }

            const client = ldap.createClient(opts);

            client.on('connect', () => resolve(client));
            client.on('error', (err: Error) => reject(new Error(`LDAP connection failed: ${err.message}`)));

            // Timeout fallback
            setTimeout(() => reject(new Error('LDAP connection timeout')), 15000);
        });
    }

    private bind(client: ldap.Client): Promise<void> {
        return new Promise((resolve, reject) => {
            client.bind(this.credentials.bindDn, this.credentials.bindPassword, (err) => {
                if (err) reject(new Error(`LDAP bind failed: ${err.message}`));
                else resolve();
            });
        });
    }

    private search(client: ldap.Client): Promise<ldap.SearchEntry[]> {
        return new Promise((resolve, reject) => {
            const searchOpts: ldap.SearchOptions = {
                filter: this.credentials.searchFilter || '(objectClass=person)',
                scope: 'sub',
                attributes: [
                    'dn', 'cn', 'mail', 'displayName', 'givenName', 'sn',
                    'title', 'department', 'telephoneNumber', 'memberOf',
                    'uid', 'objectGUID', 'entryUUID', 'userAccountControl',
                ],
                paged: { pageSize: 500 },
            };

            const entries: ldap.SearchEntry[] = [];

            client.search(this.credentials.searchBase, searchOpts, (err, res) => {
                if (err) { reject(new Error(`LDAP search failed: ${err.message}`)); return; }

                res.on('searchEntry', (entry) => entries.push(entry));
                res.on('error', (searchErr) => reject(new Error(`LDAP search error: ${searchErr.message}`)));
                res.on('end', () => resolve(entries));
            });
        });
    }

    private entryToMap(entry: ldap.SearchEntry): Record<string, string> {
        const map: Record<string, string> = {};
        map['dn'] = entry.dn?.toString() || '';

        if (entry.pojo?.attributes) {
            for (const attr of entry.pojo.attributes) {
                const key = attr.type.toLowerCase();
                map[key] = attr.values?.[0] || '';
            }
        }

        return map;
    }
}
