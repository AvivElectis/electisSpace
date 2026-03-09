import { ConfidentialClientApplication } from '@azure/msal-node';
import { appLogger } from '../../../shared/infrastructure/services/appLogger.js';
import type { DirectorySyncAdapter, NormalizedUser, MicrosoftCredentials, RoomSyncAdapter, NormalizedRoom } from '../integrations.types.js';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const USER_SELECT = 'id,displayName,mail,userPrincipalName,givenName,surname,jobTitle,department,officeLocation,mobilePhone,accountEnabled';

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
    private cca: ConfidentialClientApplication;

    constructor(rawCredentials: Record<string, unknown>) {
        this.credentials = rawCredentials as unknown as MicrosoftCredentials;
        this.cca = new ConfidentialClientApplication({
            auth: {
                clientId: this.credentials.clientId,
                authority: `https://login.microsoftonline.com/${this.credentials.tenantId}`,
                clientSecret: this.credentials.clientSecret,
            },
        });
    }

    async fetchUsers(syncToken?: string | null): Promise<{
        users: NormalizedUser[];
        nextSyncToken: string | null;
        hasMore: boolean;
    }> {
        const accessToken = await this.getAccessToken();
        const allUsers: NormalizedUser[] = [];

        // Use delta link from previous sync or start fresh
        let url = syncToken
            ? syncToken
            : `${GRAPH_BASE}/users/delta?$select=${USER_SELECT}&$top=200`;

        let nextDeltaLink: string | null = null;

        while (url) {
            const response = await this.graphFetch(url, accessToken);
            const data = await response.json() as GraphDeltaResponse;

            if (data.value) {
                for (const user of data.value) {
                    // Skip non-user accounts (service principals, etc.)
                    if (!user.mail && !user.userPrincipalName) continue;

                    allUsers.push({
                        externalId: user.id,
                        email: user.mail || user.userPrincipalName || '',
                        displayName: user.displayName || '',
                        firstName: user.givenName || undefined,
                        lastName: user.surname || undefined,
                        jobTitle: user.jobTitle || undefined,
                        department: user.department || undefined,
                        isActive: user.accountEnabled !== false,
                    });
                }
            }

            // Handle pagination
            if (data['@odata.nextLink']) {
                url = data['@odata.nextLink'];
            } else {
                nextDeltaLink = data['@odata.deltaLink'] || null;
                url = '';
            }
        }

        appLogger.info('MicrosoftSync', `Fetched ${allUsers.length} users`, { delta: !!syncToken });
        return { users: allUsers, nextSyncToken: nextDeltaLink, hasMore: false };
    }

    private async getAccessToken(): Promise<string> {
        const result = await this.cca.acquireTokenByClientCredential({
            scopes: ['https://graph.microsoft.com/.default'],
        });
        if (!result?.accessToken) {
            throw new Error('Failed to acquire Microsoft Graph access token');
        }
        return result.accessToken;
    }

    private async graphFetch(url: string, accessToken: string): Promise<Response> {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        // Handle rate limiting (429)
        if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
            appLogger.warn('MicrosoftSync', `Rate limited, retrying after ${retryAfter}s`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return this.graphFetch(url, accessToken);
        }

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Graph API error ${response.status}: ${body}`);
        }

        return response;
    }
}

export class MicrosoftRoomSyncAdapter implements RoomSyncAdapter {
    private credentials: MicrosoftCredentials;
    private cca: ConfidentialClientApplication;

    constructor(rawCredentials: Record<string, unknown>) {
        this.credentials = rawCredentials as unknown as MicrosoftCredentials;
        this.cca = new ConfidentialClientApplication({
            auth: {
                clientId: this.credentials.clientId,
                authority: `https://login.microsoftonline.com/${this.credentials.tenantId}`,
                clientSecret: this.credentials.clientSecret,
            },
        });
    }

    async fetchRooms(): Promise<NormalizedRoom[]> {
        const result = await this.cca.acquireTokenByClientCredential({
            scopes: ['https://graph.microsoft.com/.default'],
        });
        if (!result?.accessToken) {
            throw new Error('Failed to acquire Microsoft Graph access token');
        }

        const rooms: NormalizedRoom[] = [];
        let url: string | null = `${GRAPH_BASE}/places/microsoft.graph.room?$top=100`;

        while (url) {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${result.accessToken}` },
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(`Graph API error ${response.status}: ${body}`);
            }

            const data = await response.json() as GraphRoomResponse;

            if (data.value) {
                for (const room of data.value) {
                    rooms.push({
                        externalId: room.id,
                        name: room.displayName || '',
                        email: room.emailAddress || undefined,
                        capacity: room.capacity || undefined,
                        building: room.building || undefined,
                        floor: room.floorNumber?.toString() || undefined,
                        features: [
                            room.audioDeviceName && 'audio',
                            room.videoDeviceName && 'video',
                            room.displayDeviceName && 'display',
                            room.isWheelChairAccessible && 'wheelchair',
                        ].filter(Boolean) as string[],
                    });
                }
            }

            url = data['@odata.nextLink'] || null;
        }

        appLogger.info('MicrosoftSync', `Fetched ${rooms.length} rooms`);
        return rooms;
    }
}

// ─── Graph API Response Types ────────────────────────

interface GraphUser {
    id: string;
    displayName: string | null;
    mail: string | null;
    userPrincipalName: string | null;
    givenName: string | null;
    surname: string | null;
    jobTitle: string | null;
    department: string | null;
    officeLocation: string | null;
    mobilePhone: string | null;
    accountEnabled: boolean;
}

interface GraphDeltaResponse {
    value: GraphUser[];
    '@odata.nextLink'?: string;
    '@odata.deltaLink'?: string;
}

interface GraphRoom {
    id: string;
    displayName: string | null;
    emailAddress: string | null;
    capacity: number | null;
    building: string | null;
    floorNumber: number | null;
    audioDeviceName: string | null;
    videoDeviceName: string | null;
    displayDeviceName: string | null;
    isWheelChairAccessible: boolean | null;
}

interface GraphRoomResponse {
    value: GraphRoom[];
    '@odata.nextLink'?: string;
}
