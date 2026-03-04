# electisCompass — Directory & Calendar Sync (Microsoft 365 / Google Workspace / Okta)

**Version:** 1.1
**Date:** 2026-03-04
**Status:** Draft
**Purpose:** Enable enterprise employee directory import and conference room resource sync from Microsoft 365, Google Workspace, and Okta, supporting easy onboarding and migration.

---

## 1. Overview

Compass supports syncing two data types from external identity providers:

| Data Type | Source (Microsoft) | Source (Google) | Maps To |
|-----------|-------------------|----------------|---------|
| **Employee directory** | Microsoft Graph Users API | Google Admin SDK Directory API | Okta Users API (SCIM) | `CompanyUser` model |
| **Conference rooms** | Microsoft Graph Places API | Google Admin SDK Resources API | — (Okta has no room resources) | `Space(type=CONFERENCE)` |

All integrations are **optional** — companies can manually manage employees and spaces without any external sync.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         API Server                                │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    Integration Service                        ││
│  │                                                              ││
│  │  ┌────────────────────┐    ┌────────────────────┐           ││
│  │  │ MicrosoftSyncAdapter│    │ GoogleSyncAdapter  │           ││
│  │  │                    │    │                    │           ││
│  │  │ • MSAL client creds│    │ • Service account  │           ││
│  │  │ • Graph API v1.0   │    │ • Domain-Wide DWD  │           ││
│  │  │ • Delta queries    │    │ • Admin SDK        │           ││
│  │  └────────┬───────────┘    └────────┬───────────┘           ││
│  │           │                         │                        ││
│  │           ▼                         ▼                        ││
│  │  ┌───────────────────────────────────────────────────┐      ││
│  │  │              DirectorySyncService                  │      ││
│  │  │  (adapter-agnostic — receives normalized users)    │      ││
│  │  └──────────┬────────────────────┬───────────────────┘      ││
│  │             │                    │                           ││
│  │             ▼                    ▼                           ││
│  │     ┌──────────────┐    ┌──────────────────┐                ││
│  │     │ CompanyUser   │    │ Space(CONFERENCE)│                ││
│  │     │ Repository    │    │ Repository       │                ││
│  │     └──────────────┘    └──────────────────┘                ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ BullMQ Jobs                                                   ││
│  │  ┌────────────────────┐  ┌──────────────────────────────┐   ││
│  │  │ directory-sync     │  │ conference-room-availability │   ││
│  │  │ Cron: configurable │  │ Cron: every 5 minutes        │   ││
│  │  │ (default: daily)   │  │                              │   ││
│  │  └────────────────────┘  └──────────────────────────────┘   ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Integration Data Model

```typescript
// server/src/features/integrations/integrations.types.ts

interface Integration {
  id: string;
  companyId: string;
  provider: 'MICROSOFT_365' | 'GOOGLE_WORKSPACE' | 'OKTA' | 'LDAP';
  type: 'USER_DIRECTORY' | 'CALENDAR_ROOMS' | 'BOTH';
  isActive: boolean;

  // Encrypted credentials (AES-256)
  credentials: EncryptedJson;

  // Sync state
  lastSyncAt: Date | null;
  lastSyncStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' | null;
  lastSyncError: string | null;
  syncToken: string | null;       // Delta sync cursor (Microsoft deltaLink / Google syncToken)

  // Configuration
  config: IntegrationConfig;

  createdAt: Date;
  updatedAt: Date;
}

interface IntegrationConfig {
  syncSchedule: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MANUAL';
  userFilter?: string;            // Microsoft: $filter, Google: query
  defaultBranchId?: string;       // Branch to assign new users to
  autoDeactivateRemoved: boolean; // Deactivate users removed from directory
  autoCreateUsers: boolean;       // Auto-create CompanyUser for new directory entries
  roomBuildingMapping?: Record<string, string>; // Directory building name → Compass buildingId
}
```

### Credentials Format

```typescript
// Microsoft 365
interface MicrosoftCredentials {
  tenantId: string;       // Azure AD tenant ID
  clientId: string;       // App registration client ID
  clientSecret: string;   // App registration client secret
}

// Google Workspace
interface GoogleCredentials {
  serviceAccountEmail: string;
  privateKey: string;     // RSA private key from service account JSON
  adminEmail: string;     // Admin email for domain-wide delegation impersonation
  customerId: string;     // Google Workspace customer ID (for Admin SDK)
}

// Okta
interface OktaCredentials {
  domain: string;         // Okta tenant domain (e.g., "company.okta.com")
  apiToken: string;       // Okta API token (SSWS token) — OR —
  clientId: string;       // OAuth 2.0 client ID (for client credentials flow)
  clientSecret: string;   // OAuth 2.0 client secret
  authMethod: 'API_TOKEN' | 'OAUTH2'; // Which auth approach to use
}
```

---

## 4. Microsoft 365 Integration

### 4.1 Authentication: MSAL Client Credentials

```typescript
// server/src/shared/infrastructure/integrations/microsoft/msalClient.ts

import { ConfidentialClientApplication } from '@azure/msal-node';

export function createMsalClient(creds: MicrosoftCredentials): ConfidentialClientApplication {
  return new ConfidentialClientApplication({
    auth: {
      clientId: creds.clientId,
      authority: `https://login.microsoftonline.com/${creds.tenantId}`,
      clientSecret: creds.clientSecret,
    },
  });
}

export async function getGraphToken(msal: ConfidentialClientApplication): Promise<string> {
  const result = await msal.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });
  if (!result?.accessToken) throw new IntegrationError('MICROSOFT_AUTH_FAILED');
  return result.accessToken;
}
```

**Azure AD App Registration Requirements:**
- Application (not delegated) permissions:
  - `User.Read.All` — Read user directory
  - `Place.Read.All` — Read conference room resources
  - `Calendars.Read` — Read room calendars for availability
- Admin consent granted by tenant admin

### 4.2 User Directory Sync

```typescript
// server/src/shared/infrastructure/integrations/microsoft/microsoftUserSync.ts

interface MicrosoftUser {
  id: string;
  displayName: string;
  givenName: string;
  surname: string;
  mail: string;
  jobTitle: string | null;
  department: string | null;
  officeLocation: string | null;
  mobilePhone: string | null;
  accountEnabled: boolean;
  preferredLanguage: string | null;
}

export class MicrosoftUserSyncAdapter implements DirectorySyncAdapter {
  constructor(
    private readonly graphClient: GraphClient,
    private readonly integration: Integration,
  ) {}

  async syncUsers(): Promise<SyncResult> {
    const deltaLink = this.integration.syncToken;

    // First sync: full directory. Subsequent syncs: delta only.
    const url = deltaLink
      ? deltaLink  // Resume from last delta link
      : '/users/delta?$select=id,displayName,givenName,surname,mail,jobTitle,department,officeLocation,mobilePhone,accountEnabled,preferredLanguage'
        + (this.integration.config.userFilter ? `&$filter=${this.integration.config.userFilter}` : '');

    const result = await this.fetchAllPages<MicrosoftUser>(url);

    return {
      users: result.items.map(this.normalizeUser),
      removed: result.removed,           // Users with @removed annotation in delta
      newDeltaLink: result.deltaLink,     // Store for next sync
      provider: 'MICROSOFT_365',
    };
  }

  private normalizeUser(msUser: MicrosoftUser): NormalizedUser {
    return {
      externalId: msUser.id,
      email: msUser.mail,
      firstName: msUser.givenName,
      lastName: msUser.surname,
      displayName: msUser.displayName,
      jobTitle: msUser.jobTitle,
      department: msUser.department,
      officeLocation: msUser.officeLocation,
      phone: msUser.mobilePhone,
      isActive: msUser.accountEnabled,
      language: msUser.preferredLanguage?.startsWith('he') ? 'he' : 'en',
    };
  }

  private async fetchAllPages<T>(initialUrl: string): Promise<DeltaResult<T>> {
    const items: T[] = [];
    const removed: string[] = [];
    let nextLink: string | null = initialUrl;
    let deltaLink: string | null = null;

    while (nextLink) {
      const response = await this.graphClient.get(nextLink);

      for (const item of response.value) {
        if (item['@removed']) {
          removed.push(item.id);
        } else {
          items.push(item as T);
        }
      }

      nextLink = response['@odata.nextLink'] || null;
      deltaLink = response['@odata.deltaLink'] || deltaLink;
    }

    return { items, removed, deltaLink };
  }
}
```

### 4.3 Conference Room Sync

```typescript
// server/src/shared/infrastructure/integrations/microsoft/microsoftRoomSync.ts

interface MicrosoftRoom {
  id: string;
  displayName: string;
  emailAddress: string;
  capacity: number;
  building: string | null;
  floorNumber: number | null;
  floorLabel: string | null;
  audioDeviceName: string | null;
  videoDeviceName: string | null;
  displayDeviceName: string | null;
  isWheelChairAccessible: boolean | null;
}

export class MicrosoftRoomSyncAdapter implements RoomSyncAdapter {
  async syncRooms(): Promise<NormalizedRoom[]> {
    // Places API — list all rooms
    const rooms = await this.fetchAllPages<MicrosoftRoom>('/places/microsoft.graph.room');

    return rooms.items.map(room => ({
      externalId: room.id,
      name: room.displayName,
      email: room.emailAddress,
      capacity: room.capacity,
      building: room.building,
      floor: room.floorNumber,
      floorLabel: room.floorLabel,
      amenities: this.extractAmenities(room),
      provider: 'MICROSOFT_365' as const,
    }));
  }

  async getRoomAvailability(
    roomEmails: string[],
    startTime: Date,
    endTime: Date,
  ): Promise<RoomAvailability[]> {
    // getSchedule API — batched, max 20 per request
    const batches = chunk(roomEmails, 20);
    const results: RoomAvailability[] = [];

    for (const batch of batches) {
      const response = await this.graphClient.post('/me/calendar/getSchedule', {
        schedules: batch,
        startTime: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
        endTime: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
        availabilityViewInterval: 30,
      });

      for (const schedule of response.value) {
        results.push({
          email: schedule.scheduleId,
          busySlots: schedule.scheduleItems
            .filter((item: { status: string }) => item.status !== 'free')
            .map((item: { start: { dateTime: string }; end: { dateTime: string }; subject: string }) => ({
              start: new Date(item.start.dateTime),
              end: new Date(item.end.dateTime),
              subject: item.subject,
            })),
        });
      }
    }

    return results;
  }

  private extractAmenities(room: MicrosoftRoom): string[] {
    const amenities: string[] = [];
    if (room.audioDeviceName) amenities.push('AUDIO');
    if (room.videoDeviceName) amenities.push('VIDEO');
    if (room.displayDeviceName) amenities.push('DISPLAY');
    if (room.isWheelChairAccessible) amenities.push('ACCESSIBLE');
    return amenities;
  }
}
```

### 4.4 Microsoft Rate Limits

| API | Limit | Strategy |
|-----|-------|----------|
| Users delta | 3,500-8,000 RU / 10s per tenant | Batch with pagination, back off on 429 |
| Places (rooms) | 3,500 RU / 10s | One-time sync + cache, rarely changes |
| getSchedule | 3,500 RU / 10s | Batch 20 rooms/request, 5-minute cache |

```typescript
// Retry with exponential backoff on 429
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (error instanceof GraphError && error.statusCode === 429) {
        const retryAfter = error.headers?.get('Retry-After') ?? String(Math.pow(2, attempt));
        await sleep(parseInt(retryAfter) * 1000);
        continue;
      }
      throw error;
    }
  }
  throw new IntegrationError('MICROSOFT_MAX_RETRIES_EXCEEDED');
}
```

---

## 5. Google Workspace Integration

### 5.1 Authentication: Service Account with Domain-Wide Delegation

```typescript
// server/src/shared/infrastructure/integrations/google/googleAuthClient.ts

import { GoogleAuth } from 'google-auth-library';

export function createGoogleAuth(creds: GoogleCredentials): GoogleAuth {
  return new GoogleAuth({
    credentials: {
      client_email: creds.serviceAccountEmail,
      private_key: creds.privateKey,
    },
    // Impersonate admin for Directory API (requires DWD)
    clientOptions: {
      subject: creds.adminEmail,
    },
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
  });
}
```

**Google Cloud Setup Requirements:**
1. Create service account in Google Cloud Console
2. Enable Admin SDK API and Google Calendar API
3. Grant Domain-Wide Delegation to the service account
4. In Google Workspace Admin Console → Security → API Controls → Domain-Wide Delegation:
   - Add service account client ID
   - Scopes: `admin.directory.user.readonly`, `admin.directory.resource.calendar.readonly`, `calendar.readonly`

### 5.2 User Directory Sync

```typescript
// server/src/shared/infrastructure/integrations/google/googleUserSync.ts

interface GoogleUser {
  id: string;
  primaryEmail: string;
  name: { givenName: string; familyName: string; fullName: string };
  isAdmin: boolean;
  isDelegatedAdmin: boolean;
  suspended: boolean;
  orgUnitPath: string;
  phones?: Array<{ value: string; type: string }>;
  organizations?: Array<{ title: string; department: string }>;
  languages?: Array<{ languageCode: string; preference: string }>;
}

export class GoogleUserSyncAdapter implements DirectorySyncAdapter {
  constructor(
    private readonly adminClient: AdminDirectoryClient,
    private readonly integration: Integration,
  ) {}

  async syncUsers(): Promise<SyncResult> {
    const syncToken = this.integration.syncToken;

    let allUsers: GoogleUser[] = [];
    let pageToken: string | undefined;
    let newSyncToken: string | null = null;

    do {
      const params: Record<string, string> = {
        customer: this.integration.credentials.customerId || 'my_customer',
        maxResults: '500',
        projection: 'full',
        orderBy: 'email',
      };

      if (syncToken) {
        // Incremental sync — only changes since last sync
        params.syncToken = syncToken;
      }
      if (pageToken) {
        params.pageToken = pageToken;
      }

      const response = await this.adminClient.users.list(params);

      if (response.users) {
        allUsers = allUsers.concat(response.users);
      }

      pageToken = response.nextPageToken;
      newSyncToken = response.nextSyncToken || newSyncToken;

    } while (pageToken);

    return {
      users: allUsers.filter(u => !u.suspended).map(this.normalizeUser),
      removed: allUsers.filter(u => u.suspended).map(u => u.id),
      newDeltaLink: newSyncToken,
      provider: 'GOOGLE_WORKSPACE',
    };
  }

  private normalizeUser(gUser: GoogleUser): NormalizedUser {
    const org = gUser.organizations?.[0];
    const phone = gUser.phones?.find(p => p.type === 'mobile') || gUser.phones?.[0];
    const lang = gUser.languages?.find(l => l.preference === 'preferred');

    return {
      externalId: gUser.id,
      email: gUser.primaryEmail,
      firstName: gUser.name.givenName,
      lastName: gUser.name.familyName,
      displayName: gUser.name.fullName,
      jobTitle: org?.title || null,
      department: org?.department || null,
      officeLocation: gUser.orgUnitPath,
      phone: phone?.value || null,
      isActive: !gUser.suspended,
      language: lang?.languageCode?.startsWith('he') ? 'he' : 'en',
    };
  }
}
```

### 5.3 Conference Room Sync

```typescript
// server/src/shared/infrastructure/integrations/google/googleRoomSync.ts

interface GoogleCalendarResource {
  resourceId: string;
  resourceName: string;
  resourceEmail: string;
  resourceType: string;         // e.g., "Conference Room"
  capacity: number;
  buildingId: string;
  floorName: string;
  floorSection: string;
  featureInstances?: Array<{ feature: { name: string } }>;
  userVisibleDescription: string;
}

export class GoogleRoomSyncAdapter implements RoomSyncAdapter {
  async syncRooms(): Promise<NormalizedRoom[]> {
    let allRooms: GoogleCalendarResource[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.adminClient.resources.calendars.list({
        customer: this.integration.credentials.customerId || 'my_customer',
        maxResults: 500,
        pageToken,
      });

      if (response.items) {
        allRooms = allRooms.concat(
          response.items.filter(r => r.resourceType === 'Conference Room')
        );
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    return allRooms.map(room => ({
      externalId: room.resourceId,
      name: room.resourceName,
      email: room.resourceEmail,
      capacity: room.capacity,
      building: room.buildingId,
      floor: parseInt(room.floorName) || null,
      floorLabel: room.floorName,
      amenities: (room.featureInstances || []).map(f => f.feature.name.toUpperCase()),
      provider: 'GOOGLE_WORKSPACE' as const,
    }));
  }

  async getRoomAvailability(
    roomEmails: string[],
    startTime: Date,
    endTime: Date,
  ): Promise<RoomAvailability[]> {
    // FreeBusy API — batched, max 50 per request
    const batches = chunk(roomEmails, 50);
    const results: RoomAvailability[] = [];

    for (const batch of batches) {
      const response = await this.calendarClient.freebusy.query({
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: batch.map(email => ({ id: email })),
      });

      for (const [email, calendar] of Object.entries(response.calendars || {})) {
        results.push({
          email,
          busySlots: (calendar.busy || []).map(slot => ({
            start: new Date(slot.start),
            end: new Date(slot.end),
          })),
        });
      }
    }

    return results;
  }
}
```

### 5.4 Google Rate Limits

| API | Limit | Strategy |
|-----|-------|----------|
| Admin SDK users.list | 2,400 QPM per admin | Use pageToken pagination, respect Retry-After |
| Admin SDK resources.calendars | 2,400 QPM | One-time sync + cache |
| Calendar FreeBusy | 10,000 QPD per project | Batch 50 rooms/request, 5-minute cache |

---

## 6. Okta Integration

### 6.1 Authentication: API Token or OAuth 2.0 Client Credentials

```typescript
// server/src/shared/infrastructure/integrations/okta/oktaAuthClient.ts

import axios, { AxiosInstance } from 'axios';

export function createOktaClient(creds: OktaCredentials): AxiosInstance {
  const baseURL = `https://${creds.domain}/api/v1`;

  if (creds.authMethod === 'API_TOKEN') {
    return axios.create({
      baseURL,
      headers: { Authorization: `SSWS ${creds.apiToken}` },
    });
  }

  // OAuth 2.0 — token will be fetched on first request
  return axios.create({ baseURL });
}

export async function getOktaOAuthToken(creds: OktaCredentials): Promise<string> {
  const response = await axios.post(
    `https://${creds.domain}/oauth2/v1/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'okta.users.read',
    }),
    {
      auth: { username: creds.clientId, password: creds.clientSecret },
    }
  );
  return response.data.access_token;
}
```

**Okta Setup Requirements:**
- **API Token approach:** Admin → Security → API → Tokens → Create Token (simplest, but token is tied to an admin account)
- **OAuth 2.0 approach:** Admin → Applications → Create API Services app → Client Credentials grant, assign `okta.users.read` scope
- Required Okta permissions: Read users (`okta.users.read`)

### 6.2 User Directory Sync

```typescript
// server/src/shared/infrastructure/integrations/okta/oktaUserSync.ts

interface OktaUser {
  id: string;
  status: 'STAGED' | 'PROVISIONED' | 'ACTIVE' | 'RECOVERY' | 'LOCKED_OUT' | 'PASSWORD_EXPIRED' | 'SUSPENDED' | 'DEPROVISIONED';
  profile: {
    login: string;           // Usually email
    email: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    mobilePhone: string | null;
    title: string | null;
    department: string | null;
    organization: string | null;
    preferredLanguage: string | null;
  };
  lastUpdated: string;
}

export class OktaUserSyncAdapter implements DirectorySyncAdapter {
  constructor(
    private readonly client: AxiosInstance,
    private readonly integration: Integration,
  ) {}

  async syncUsers(): Promise<SyncResult> {
    const lastSyncAt = this.integration.lastSyncAt;

    // Okta supports filtering by lastUpdated for incremental sync
    let url = '/users?limit=200';
    if (this.integration.config.userFilter) {
      url += `&filter=${this.integration.config.userFilter}`;
    } else if (lastSyncAt) {
      // Incremental: only users updated since last sync
      url += `&filter=lastUpdated gt "${lastSyncAt.toISOString()}"`;
    }

    const allUsers: OktaUser[] = [];
    let nextUrl: string | null = url;

    while (nextUrl) {
      const response = await this.client.get(nextUrl);
      allUsers.push(...response.data);

      // Okta uses Link header for pagination
      const linkHeader = response.headers['link'] as string | undefined;
      nextUrl = this.parseNextLink(linkHeader);
    }

    const activeStatuses = new Set(['ACTIVE', 'RECOVERY', 'LOCKED_OUT', 'PASSWORD_EXPIRED']);
    const deactivatedStatuses = new Set(['SUSPENDED', 'DEPROVISIONED']);

    return {
      users: allUsers
        .filter(u => activeStatuses.has(u.status))
        .map(this.normalizeUser),
      removed: allUsers
        .filter(u => deactivatedStatuses.has(u.status))
        .map(u => u.id),
      newDeltaLink: null, // Okta uses lastUpdated filter, not delta tokens
      provider: 'OKTA',
    };
  }

  private normalizeUser(oktaUser: OktaUser): NormalizedUser {
    return {
      externalId: oktaUser.id,
      email: oktaUser.profile.email,
      firstName: oktaUser.profile.firstName,
      lastName: oktaUser.profile.lastName,
      displayName: oktaUser.profile.displayName || `${oktaUser.profile.firstName} ${oktaUser.profile.lastName}`,
      jobTitle: oktaUser.profile.title,
      department: oktaUser.profile.department,
      officeLocation: oktaUser.profile.organization,
      phone: oktaUser.profile.mobilePhone,
      isActive: oktaUser.status === 'ACTIVE',
      language: oktaUser.profile.preferredLanguage?.startsWith('he') ? 'he' : 'en',
    };
  }

  private parseNextLink(linkHeader: string | undefined): string | null {
    if (!linkHeader) return null;
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    return match ? match[1] : null;
  }
}
```

### 6.3 Okta Rate Limits

| API | Limit | Strategy |
|-----|-------|----------|
| List users | 600 req/min (org-wide) | Paginate with `limit=200`, respect `X-Rate-Limit-Remaining` header |
| Get user | 600 req/min | Cache individual lookups |
| Search users (with filter) | 600 req/min | Use `lastUpdated` filter for incremental sync |

```typescript
// Rate limit handling — Okta returns rate limit headers
async function withOktaRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const response = await fn();
  const remaining = parseInt(response.headers?.['x-rate-limit-remaining'] ?? '100');
  if (remaining < 10) {
    const resetEpoch = parseInt(response.headers?.['x-rate-limit-reset'] ?? '0');
    const waitMs = Math.max(0, resetEpoch * 1000 - Date.now());
    if (waitMs > 0) await sleep(waitMs);
  }
  return response;
}
```

### 6.4 Okta Notes

- **No conference room resources:** Okta is an identity provider, not a workspace tool. It syncs users only — conference rooms still require Microsoft 365 or Google Workspace integration.
- **SSO synergy:** When Okta is used for directory sync, it's natural to also use Okta for SSO (SAML/OIDC). The SSO configuration in [16-ADVANCED-CAPABILITIES](16-ADVANCED-CAPABILITIES.md) §3 already supports Okta as an IdP via standard SAML 2.0 or OIDC protocols.
- **SCIM future:** Okta supports SCIM (System for Cross-domain Identity Management) for real-time provisioning. Phase 2 could add a SCIM endpoint on the Compass server for push-based user sync instead of polling.

---

## 7. Shared Sync Service (Adapter-Agnostic)

```typescript
// server/src/features/integrations/directory-sync.service.ts

export interface NormalizedUser {
  externalId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  officeLocation: string | null;
  phone: string | null;
  isActive: boolean;
  language: 'en' | 'he';
}

export interface NormalizedRoom {
  externalId: string;
  name: string;
  email: string;
  capacity: number;
  building: string | null;
  floor: number | null;
  floorLabel: string | null;
  amenities: string[];
  provider: 'MICROSOFT_365' | 'GOOGLE_WORKSPACE' | 'OKTA';
}

export interface SyncResult {
  users: NormalizedUser[];
  removed: string[];
  newDeltaLink: string | null;
  provider: 'MICROSOFT_365' | 'GOOGLE_WORKSPACE' | 'OKTA';
}

export class DirectorySyncService {
  constructor(
    private readonly userRepo: CompanyUserRepository,
    private readonly integrationRepo: IntegrationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async syncUsers(integrationId: string): Promise<SyncSummary> {
    const integration = await this.integrationRepo.findById(integrationId);
    if (!integration || !integration.isActive) {
      throw new BusinessError('INTEGRATION_NOT_ACTIVE');
    }

    const adapter = this.createAdapter(integration);
    const result = await adapter.syncUsers();

    const summary: SyncSummary = { created: 0, updated: 0, deactivated: 0, errors: [] };

    // Process each user from directory
    for (const normalizedUser of result.users) {
      try {
        const existing = await this.userRepo.findByExternalId(
          integration.companyId, normalizedUser.externalId
        );

        if (existing) {
          // Update existing user
          await this.userRepo.update(existing.id, this.mapToUpdate(normalizedUser));
          summary.updated++;
        } else if (integration.config.autoCreateUsers) {
          // Create new CompanyUser
          await this.userRepo.create({
            companyId: integration.companyId,
            branchId: integration.config.defaultBranchId!,
            email: normalizedUser.email,
            firstName: normalizedUser.firstName,
            lastName: normalizedUser.lastName,
            displayName: normalizedUser.displayName,
            externalId: normalizedUser.externalId,
            externalProvider: result.provider,
            isActive: true,
            language: normalizedUser.language,
          });
          summary.created++;
        }
      } catch (error) {
        summary.errors.push({ email: normalizedUser.email, error: String(error) });
      }
    }

    // Handle removed users
    if (integration.config.autoDeactivateRemoved) {
      for (const removedId of result.removed) {
        const user = await this.userRepo.findByExternalId(integration.companyId, removedId);
        if (user && user.isActive) {
          await this.userRepo.update(user.id, { isActive: false });
          summary.deactivated++;
        }
      }
    }

    // Update sync state
    await this.integrationRepo.updateSyncState(integrationId, {
      lastSyncAt: new Date(),
      lastSyncStatus: summary.errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
      lastSyncError: summary.errors.length > 0 ? JSON.stringify(summary.errors.slice(0, 10)) : null,
      syncToken: result.newDeltaLink,
    });

    this.eventBus.emit('integration:sync_completed', { integrationId, summary });
    return summary;
  }

  private mapToUpdate(user: NormalizedUser): Partial<CompanyUserEntity> {
    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      isActive: user.isActive,
    };
  }

  private createAdapter(integration: Integration): DirectorySyncAdapter {
    switch (integration.provider) {
      case 'MICROSOFT_365':
        return new MicrosoftUserSyncAdapter(
          createGraphClient(integration.credentials as MicrosoftCredentials),
          integration,
        );
      case 'GOOGLE_WORKSPACE':
        return new GoogleUserSyncAdapter(
          createAdminClient(integration.credentials as GoogleCredentials),
          integration,
        );
      case 'OKTA':
        return new OktaUserSyncAdapter(
          createOktaClient(integration.credentials as OktaCredentials),
          integration,
        );
      default:
        throw new BusinessError('UNSUPPORTED_PROVIDER', { provider: integration.provider });
    }
  }
}
```

---

## 7. Field Mapping

### 7.1 User Field Mapping

| CompanyUser Field | Microsoft Graph | Google Admin SDK |
|-------------------|----------------|-----------------|
| `email` | `mail` | `primaryEmail` | `profile.email` |
| `firstName` | `givenName` | `name.givenName` | `profile.firstName` |
| `lastName` | `surname` | `name.familyName` | `profile.lastName` |
| `displayName` | `displayName` | `name.fullName` | `profile.displayName` |
| `externalId` | `id` (GUID) | `id` (numeric string) | `id` (Okta user ID) |
| `isActive` | `accountEnabled` | `!suspended` | `status === 'ACTIVE'` |
| `language` | `preferredLanguage` | `languages[0].languageCode` | `profile.preferredLanguage` |
| `jobTitle` | `jobTitle` | `organizations[0].title` | `profile.title` |
| `department` | `department` | `organizations[0].department` | `profile.department` |
| `phone` | `mobilePhone` | `phones[type=mobile].value` | `profile.mobilePhone` |

### 7.2 Room Field Mapping

| Space(CONFERENCE) Field | Microsoft Graph | Google Admin SDK |
|------------------------|----------------|-----------------|
| `name` / `number` | `displayName` | `resourceName` |
| `externalEmail` | `emailAddress` | `resourceEmail` |
| `capacity` | `capacity` | `capacity` |
| `buildingId` | Mapped via `building` string | `buildingId` |
| `floorId` | Mapped via `floorNumber` | `floorName` |
| `amenities` (JSON) | `audioDevice`, `videoDevice`, `displayDevice` | `featureInstances[].feature.name` |

---

## 8. Admin UI: Integration Setup

### Setup Wizard (in electisSpace Settings)

```
┌────────────────────────────────────────────────────────────────┐
│ ⚙ Integrations                                   [+ Add New]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Step 1: Choose Provider                                        │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│ │ Microsoft 365    │  │ Google Workspace │  │ Okta         │  │ LDAP / AD  │ │
│ │ 🔵               │  │ 🟢               │  │ 🟣            │  │ 🟡          │ │
│ │ Azure AD         │  │ Admin SDK        │  │ Universal Dir│  │ On-premise │ │
│ └──────────────────┘  └──────────────────┘  └──────────────┘  └────────────┘ │
│                                                                │
│ Step 2: Enter Credentials                                      │
│ (provider-specific form — see below)                           │
│                                                                │
│ Step 3: Test Connection                                        │
│ [🔄 Test Connection]  → ✅ Connected · Found 234 users         │
│                                                                │
│ Step 4: Configure Sync                                         │
│ Schedule:          [Daily ▼]                                   │
│ Default branch:    [Tel Aviv HQ ▼]                             │
│ Auto-create users: [✅]                                        │
│ Auto-deactivate:   [✅]                                        │
│ Room mapping:      [Configure ▼]                               │
│                                                                │
│ Step 5: Initial Sync                                           │
│ [▶ Run Initial Sync]  → Syncing... 47/234 users               │
│                                                                │
│ [Save Integration]                                             │
└────────────────────────────────────────────────────────────────┘
```

### Microsoft 365 Credentials Form

```
┌────────────────────────────────────────────┐
│ Microsoft 365 Configuration               │
│                                            │
│ Tenant ID:                                 │
│ [________________________________]         │
│                                            │
│ Application (Client) ID:                   │
│ [________________________________]         │
│                                            │
│ Client Secret:                             │
│ [________________________________] 🔒     │
│                                            │
│ ℹ Create an App Registration in Azure AD   │
│   with User.Read.All, Place.Read.All,      │
│   and Calendars.Read permissions.          │
│   Grant admin consent.                     │
│                                            │
│ [📋 Setup Guide]  [🔄 Test Connection]     │
└────────────────────────────────────────────┘
```

### Google Workspace Credentials Form

```
┌────────────────────────────────────────────┐
│ Google Workspace Configuration             │
│                                            │
│ Service Account JSON:                      │
│ [📁 Upload JSON Key File]                  │
│ ✅ service-account@project.iam.gserviceacc │
│                                            │
│ Admin Email (for impersonation):           │
│ [admin@company.com_________________]       │
│                                            │
│ Customer ID (optional):                    │
│ [C0xxxxxxx_________________________]       │
│                                            │
│ ℹ Enable Domain-Wide Delegation in         │
│   Google Workspace Admin Console.          │
│   Add service account client ID with:      │
│   admin.directory.user.readonly,           │
│   admin.directory.resource.calendar,       │
│   calendar.readonly                        │
│                                            │
│ [📋 Setup Guide]  [🔄 Test Connection]     │
└────────────────────────────────────────────┘
```

### Okta Credentials Form

```
┌────────────────────────────────────────────┐
│ Okta Configuration                         │
│                                            │
│ Okta Domain:                               │
│ [company.okta.com________________]         │
│                                            │
│ Auth Method:                               │
│ (●) API Token  ( ) OAuth 2.0              │
│                                            │
│ API Token:                                 │
│ [________________________________] 🔒     │
│                                            │
│ — OR (when OAuth 2.0 selected) —           │
│                                            │
│ Client ID:                                 │
│ [________________________________]         │
│                                            │
│ Client Secret:                             │
│ [________________________________] 🔒     │
│                                            │
│ ℹ Create an API token in Okta Admin →      │
│   Security → API → Tokens, or create an    │
│   API Services app for OAuth 2.0.          │
│   Note: Okta syncs users only, not rooms.  │
│                                            │
│ [📋 Setup Guide]  [🔄 Test Connection]     │
└────────────────────────────────────────────┘
```

---

## 10. Sync API Endpoints

```
POST   /api/v2/admin/integrations
  → Create new integration (provider + credentials + config)

GET    /api/v2/admin/integrations
  → List all integrations for company

GET    /api/v2/admin/integrations/:id
  → Get integration details (credentials masked)

PUT    /api/v2/admin/integrations/:id
  → Update integration config

DELETE /api/v2/admin/integrations/:id
  → Deactivate integration (soft delete)

POST   /api/v2/admin/integrations/:id/test
  → Test connection (verify credentials, return user count)

POST   /api/v2/admin/integrations/:id/sync
  → Trigger manual sync

GET    /api/v2/admin/integrations/:id/sync/status
  → Get last sync result + progress for running sync

GET    /api/v2/admin/integrations/:id/sync/history
  → Sync history (last 30 runs)

POST   /api/v2/admin/integrations/:id/rooms/availability
  → Check conference room availability via external calendar
```

---

## 11. Security Considerations

| Concern | Mitigation |
|---------|------------|
| **Credential storage** | AES-256-GCM encryption at rest. Encryption key from env var `INTEGRATION_ENCRYPTION_KEY` |
| **Credential exposure** | API responses mask client secrets: `"client***ret"`. Full credentials never returned |
| **Token caching** | MSAL/Google tokens cached in Redis with TTL matching token expiry |
| **Tenant isolation** | Integration queries always scoped by `companyId` from JWT |
| **API key rotation** | Admin UI supports updating credentials without re-creating integration |
| **Sync logging** | Structured logs per sync run. PII (emails) redacted in logs |
| **Error handling** | Integration errors never bubble to end users. Admin sees structured error in sync history |

---

## 12. Conference Room Availability Integration with Compass Bookings

When a Space has `type=CONFERENCE` and is linked to an external calendar room:

```
┌──────────────────────────────────────────────────────────────┐
│              Conference Room Booking Flow                      │
│                                                                │
│  Employee opens Compass → Filters by CONFERENCE spaces        │
│       │                                                        │
│       ▼                                                        │
│  API fetches available conference spaces                       │
│       │                                                        │
│       ├──▶ Check Compass bookings (PostgreSQL)                │
│       │    No internal conflict? Continue                      │
│       │                                                        │
│       ├──▶ Check external calendar (Microsoft/Google)          │
│       │    Room free in external calendar? Continue             │
│       │    Room busy? Mark as UNAVAILABLE with reason          │
│       │                                                        │
│       ▼                                                        │
│  Show merged availability to employee                         │
│       │                                                        │
│       ▼                                                        │
│  Employee books → Compass creates internal booking            │
│       │                                                        │
│       └──▶ (Phase 2) Create calendar event in Microsoft/Google│
│            to block the room in the external calendar too      │
└──────────────────────────────────────────────────────────────┘
```

**Phase 1:** Read-only integration (check availability from external calendar).
**Phase 2:** Write integration (create calendar events to reserve rooms externally).
