import { appLogger } from '../../../shared/infrastructure/services/appLogger.js';
import type { DirectorySyncAdapter, NormalizedUser, OktaCredentials } from '../integrations.types.js';

/**
 * Okta User Sync Adapter
 * Uses Okta Users API with API Token or OAuth 2.0 client credentials.
 * Incremental sync via `lastUpdated` filter.
 * Rate limit: 600 req/min. Respects X-Rate-Limit-Remaining header.
 * Okta has no room/resource sync — users only.
 */
export class OktaUserSyncAdapter implements DirectorySyncAdapter {
    private credentials: OktaCredentials;

    constructor(rawCredentials: Record<string, unknown>) {
        this.credentials = rawCredentials as unknown as OktaCredentials;
    }

    async fetchUsers(syncToken?: string | null): Promise<{
        users: NormalizedUser[];
        nextSyncToken: string | null;
        hasMore: boolean;
    }> {
        const authHeader = await this.getAuthHeader();
        const allUsers: NormalizedUser[] = [];
        const baseUrl = `https://${this.credentials.domain}/api/v1/users`;

        // Build initial URL — use lastUpdated filter for incremental sync
        let url: string;
        if (syncToken) {
            // syncToken is an ISO timestamp of the last sync
            url = `${baseUrl}?filter=lastUpdated gt "${syncToken}"&limit=200`;
        } else {
            url = `${baseUrl}?limit=200`;
        }

        while (url) {
            const response = await this.oktaFetch(url, authHeader);
            const data = await response.json() as OktaUser[];

            for (const user of data) {
                allUsers.push({
                    externalId: user.id,
                    email: user.profile.email || user.profile.login || '',
                    displayName: [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ')
                        || user.profile.displayName || user.profile.email || '',
                    firstName: user.profile.firstName || undefined,
                    lastName: user.profile.lastName || undefined,
                    jobTitle: user.profile.title || undefined,
                    department: user.profile.department || undefined,
                    isActive: user.status === 'ACTIVE' || user.status === 'PASSWORD_EXPIRED' || user.status === 'RECOVERY',
                });
            }

            // Pagination via Link header
            url = this.parseLinkHeader(response.headers.get('link'));
        }

        // Store current timestamp as sync token for next incremental sync
        const nextSyncToken = new Date().toISOString();

        appLogger.info('OktaSync', `Fetched ${allUsers.length} users`, { delta: !!syncToken });
        return { users: allUsers, nextSyncToken, hasMore: false };
    }

    private async getAuthHeader(): Promise<string> {
        if (this.credentials.authMethod === 'API_TOKEN' && this.credentials.apiToken) {
            return `SSWS ${this.credentials.apiToken}`;
        }

        // OAuth 2.0 client credentials flow
        if (this.credentials.clientId && this.credentials.clientSecret) {
            const tokenUrl = `https://${this.credentials.domain}/oauth2/v1/token`;
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(`${this.credentials.clientId}:${this.credentials.clientSecret}`).toString('base64')}`,
                },
                body: 'grant_type=client_credentials&scope=okta.users.read',
            });

            if (!response.ok) {
                throw new Error(`Okta OAuth token error: ${response.status}`);
            }

            const tokenData = await response.json() as { access_token: string };
            return `Bearer ${tokenData.access_token}`;
        }

        throw new Error('Okta credentials missing: provide either apiToken or clientId/clientSecret');
    }

    private async oktaFetch(url: string, authHeader: string): Promise<Response> {
        const response = await fetch(url, {
            headers: { Authorization: authHeader, Accept: 'application/json' },
        });

        // Rate limiting
        const remaining = parseInt(response.headers.get('x-rate-limit-remaining') || '100', 10);
        if (remaining < 10) {
            const resetEpoch = parseInt(response.headers.get('x-rate-limit-reset') || '0', 10);
            const waitMs = Math.max(0, resetEpoch * 1000 - Date.now()) + 1000;
            appLogger.warn('OktaSync', `Rate limit low (${remaining}), waiting ${waitMs}ms`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
        }

        if (response.status === 429) {
            const resetEpoch = parseInt(response.headers.get('x-rate-limit-reset') || '0', 10);
            const waitMs = Math.max(1000, resetEpoch * 1000 - Date.now() + 1000);
            appLogger.warn('OktaSync', `Rate limited (429), retrying after ${waitMs}ms`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            return this.oktaFetch(url, authHeader);
        }

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Okta API error ${response.status}: ${body}`);
        }

        return response;
    }

    private parseLinkHeader(header: string | null): string {
        if (!header) return '';
        // Parse Link: <https://...>; rel="next"
        const match = header.match(/<([^>]+)>;\s*rel="next"/);
        return match ? match[1] : '';
    }
}

// ─── Okta API Response Types ─────────────────────────

interface OktaUser {
    id: string;
    status: string;
    profile: {
        login: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        displayName: string | null;
        title: string | null;
        department: string | null;
        organization: string | null;
        mobilePhone: string | null;
    };
}
