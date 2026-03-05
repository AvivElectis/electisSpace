import type { DirectorySyncAdapter, NormalizedUser, MicrosoftCredentials, RoomSyncAdapter, NormalizedRoom } from '../integrations.types.js';

/**
 * Microsoft 365 User Sync Adapter
 * Uses Microsoft Graph API with MSAL client credentials flow.
 * Supports delta queries for incremental sync.
 *
 * Required Graph API permissions (Application):
 * - User.Read.All (for user directory)
 * - Place.Read.All (for room resources)
 */
export class MicrosoftUserSyncAdapter implements DirectorySyncAdapter {
    private credentials: MicrosoftCredentials;

    constructor(rawCredentials: Record<string, unknown>) {
        this.credentials = rawCredentials as unknown as MicrosoftCredentials;
    }

    async fetchUsers(syncToken?: string | null): Promise<{
        users: NormalizedUser[];
        nextSyncToken: string | null;
        hasMore: boolean;
    }> {
        // TODO: Implement with @azure/msal-node
        // 1. Acquire token via ConfidentialClientApplication.acquireTokenByClientCredential()
        // 2. Call Graph API: GET /users/delta (or /users/delta?$deltatoken=...)
        // 3. Paginate through @odata.nextLink
        // 4. Return @odata.deltaLink as nextSyncToken

        const _accessToken = await this.getAccessToken();

        // Placeholder: construct Graph API URL
        const _baseUrl = syncToken
            ? syncToken // deltaLink from previous sync
            : 'https://graph.microsoft.com/v1.0/users/delta?$select=id,displayName,mail,givenName,surname,jobTitle,department,accountEnabled';

        // TODO: Fetch from Graph API and normalize
        return { users: [], nextSyncToken: null, hasMore: false };
    }

    private async getAccessToken(): Promise<string> {
        // TODO: Use @azure/msal-node ConfidentialClientApplication
        // const msalConfig = {
        //     auth: {
        //         clientId: this.credentials.clientId,
        //         authority: `https://login.microsoftonline.com/${this.credentials.tenantId}`,
        //         clientSecret: this.credentials.clientSecret,
        //     },
        // };
        // const cca = new ConfidentialClientApplication(msalConfig);
        // const result = await cca.acquireTokenByClientCredential({ scopes: ['https://graph.microsoft.com/.default'] });
        // return result!.accessToken;
        throw new Error('Microsoft adapter not yet configured — install @azure/msal-node');
    }
}

export class MicrosoftRoomSyncAdapter implements RoomSyncAdapter {
    private credentials: MicrosoftCredentials;

    constructor(rawCredentials: Record<string, unknown>) {
        this.credentials = rawCredentials as unknown as MicrosoftCredentials;
    }

    async fetchRooms(): Promise<NormalizedRoom[]> {
        // TODO: Call Graph API: GET /places/microsoft.graph.room
        // Normalize: { id → externalId, displayName → name, capacity, building, floorNumber → floor }
        return [];
    }
}
