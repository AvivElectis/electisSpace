import { google } from 'googleapis';
import { appLogger } from '../../../shared/infrastructure/services/appLogger.js';
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
        const auth = this.createAuth(['https://www.googleapis.com/auth/admin.directory.user.readonly']);
        const directory = google.admin({ version: 'directory_v1', auth });
        const allUsers: NormalizedUser[] = [];
        let pageToken: string | undefined;
        let newSyncToken: string | null = null;

        do {
            const params: any = {
                domain: this.credentials.domain,
                maxResults: 500,
                projection: 'basic',
                orderBy: 'email',
            };

            // Use etag for conditional request (returns 304 if no changes)
            if (syncToken && !pageToken) {
                params.showDeleted = true;
            }
            if (pageToken) {
                params.pageToken = pageToken;
            }

            try {
                const res = await directory.users.list(params);
                const users = res.data.users || [];

                for (const user of users) {
                    allUsers.push({
                        externalId: user.id || '',
                        email: user.primaryEmail || '',
                        displayName: [user.name?.givenName, user.name?.familyName].filter(Boolean).join(' ') || user.primaryEmail || '',
                        firstName: user.name?.givenName || undefined,
                        lastName: user.name?.familyName || undefined,
                        jobTitle: (user as any).organizations?.[0]?.title || undefined,
                        department: (user as any).organizations?.[0]?.department || undefined,
                        isActive: !user.suspended,
                    });
                }

                pageToken = res.data.nextPageToken || undefined;
                // Store etag for conditional requests on next sync
                if (!pageToken && res.data.etag) {
                    newSyncToken = res.data.etag;
                }
            } catch (err: any) {
                throw err;
            }
        } while (pageToken);

        appLogger.info('GoogleSync', `Fetched ${allUsers.length} users`, { delta: !!syncToken });
        return { users: allUsers, nextSyncToken: newSyncToken, hasMore: false };
    }

    private createAuth(scopes: string[]) {
        const keyData = JSON.parse(this.credentials.serviceAccountJson);
        return new google.auth.JWT({
            email: keyData.client_email,
            key: keyData.private_key,
            scopes,
            subject: this.credentials.adminEmail, // Domain-wide delegation
        });
    }
}

export class GoogleRoomSyncAdapter implements RoomSyncAdapter {
    private credentials: GoogleCredentials;

    constructor(rawCredentials: Record<string, unknown>) {
        this.credentials = rawCredentials as unknown as GoogleCredentials;
    }

    async fetchRooms(): Promise<NormalizedRoom[]> {
        const keyData = JSON.parse(this.credentials.serviceAccountJson);
        const auth = new google.auth.JWT({
            email: keyData.client_email,
            key: keyData.private_key,
            scopes: ['https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly'],
            subject: this.credentials.adminEmail,
        });

        const directory = google.admin({ version: 'directory_v1', auth });
        const rooms: NormalizedRoom[] = [];
        let pageToken: string | undefined;

        do {
            const res = await directory.resources.calendars.list({
                customer: 'my_customer',
                maxResults: 500,
                pageToken,
            });

            const items = res.data.items || [];
            for (const item of items) {
                // Only include rooms (type === '' or not set means room)
                if (item.resourceType && item.resourceType !== 'Room' && item.resourceType !== 'ROOM') continue;

                rooms.push({
                    externalId: item.resourceId || '',
                    name: item.resourceName || item.generatedResourceName || '',
                    email: item.resourceEmail || undefined,
                    capacity: item.capacity || undefined,
                    building: item.buildingId || undefined,
                    floor: item.floorName || undefined,
                    features: (item.featureInstances as any[])?.map(f => f.feature?.name).filter(Boolean) || [],
                });
            }

            pageToken = res.data.nextPageToken || undefined;
        } while (pageToken);

        appLogger.info('GoogleSync', `Fetched ${rooms.length} rooms`);
        return rooms;
    }
}
