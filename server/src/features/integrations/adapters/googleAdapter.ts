import type { DirectorySyncAdapter, NormalizedUser, GoogleCredentials, RoomSyncAdapter, NormalizedRoom } from '../integrations.types.js';

/**
 * Google Workspace User Sync Adapter
 * Uses Google Admin SDK Directory API with a Service Account + Domain-Wide Delegation.
 * Supports syncToken for incremental sync.
 *
 * Required Admin SDK scopes:
 * - https://www.googleapis.com/auth/admin.directory.user.readonly
 * - https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly
 */
export class GoogleUserSyncAdapter implements DirectorySyncAdapter {
    private credentials: GoogleCredentials;

    constructor(rawCredentials: Record<string, unknown>) {
        this.credentials = rawCredentials as unknown as GoogleCredentials;
    }

    async fetchUsers(syncToken?: string | null): Promise<{
        users: NormalizedUser[];
        nextSyncToken: string | null;
        hasMore: boolean;
    }> {
        // TODO: Implement with googleapis
        // 1. Authenticate with service account JWT (impersonating adminEmail)
        // 2. Call Admin SDK: GET /admin/directory/v1/users
        //    - domain={domain}, projection=basic, maxResults=500
        //    - If syncToken: append syncToken param for incremental sync
        // 3. Paginate through nextPageToken
        // 4. Return new syncToken for next incremental sync

        // Placeholder
        return { users: [], nextSyncToken: null, hasMore: false };
    }
}

export class GoogleRoomSyncAdapter implements RoomSyncAdapter {
    private credentials: GoogleCredentials;

    constructor(rawCredentials: Record<string, unknown>) {
        this.credentials = rawCredentials as unknown as GoogleCredentials;
    }

    async fetchRooms(): Promise<NormalizedRoom[]> {
        // TODO: Implement with googleapis
        // Call Admin SDK: GET /admin/directory/v1/customer/{customerId}/resources/calendars
        // Normalize: { resourceId → externalId, resourceName → name, capacity, buildingId → building, floorName → floor, featureInstances → features }
        return [];
    }
}
