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
        // TODO: Implement with fetch/axios
        // 1. Auth: API token → Authorization: SSWS {apiToken}
        //    OR OAuth 2.0 → POST /oauth2/v1/token with client_credentials grant
        // 2. Call: GET https://{domain}/api/v1/users
        //    - If syncToken (ISO date): filter=lastUpdated gt "{syncToken}"
        //    - Paginate via Link: <url>; rel="next" header
        //    - Respect X-Rate-Limit-Remaining header (pause if < 10)
        // 3. Map profile fields: { id → externalId, profile.email, profile.displayName, etc. }
        // 4. Return current timestamp as nextSyncToken

        // Placeholder
        return { users: [], nextSyncToken: null, hasMore: false };
    }
}
