# Implementation Plan: Auth Connection Management & AIMS Management Feature

> **Production Safety**: This plan is designed for a live production app. Every change is backward-compatible, uses database migrations (not destructive resets), and includes rollback strategies. No user data is lost at any stage.

---

## Part 1: Device-Based Auth Token Management

### Problem Statement

The current authentication flow requires users to re-login (email + password + 2FA email code) every time the mobile browser is closed and reopened. This is because:

1. **Access token is memory-only** (`apiClient.ts:41` - `let accessTokenInMemory`). On page refresh or browser close, it's lost.
2. **Refresh token is in an httpOnly cookie** (`controller.ts:99-105`), which is correct for web security but has limitations on mobile browsers:
   - Mobile Safari and Chrome aggressively purge cookies when the browser is backgrounded/closed.
   - `sameSite: 'lax'` cookies can be lost on mobile when the PWA is evicted from memory.
   - iOS WebKit ITP (Intelligent Tracking Prevention) may clear cookies after 7 days of inactivity.
3. **The refresh token lifespan** is configurable (default `180d` per `env.ts:49`), but if the cookie is purged by the OS, the long lifespan doesn't help.
4. **Session restore** (`useSessionRestore.ts`) attempts a cookie-based refresh on app startup, which fails silently when the cookie is gone, dumping the user to the login screen.

### Proposed Solution: Device Token Authentication

Introduce a **device token** layer that sits below the standard JWT access/refresh flow. The device token is a long-lived, opaque token bound to a specific device, stored in a location more persistent than cookies on mobile (Capacitor `Preferences` API on native, `IndexedDB` via `idb-keyval` on web).

#### Architecture Overview

```
[Current Flow]
  Login → 2FA → Access Token (memory) + Refresh Token (httpOnly cookie)
  Page Refresh → cookie-based refresh → new Access Token

[New Flow]
  Login → 2FA → Access Token (memory) + Refresh Token (cookie) + Device Token (persistent storage)
  Page Refresh → cookie-based refresh → new Access Token (unchanged)
  Cookie Lost → Device Token → new Refresh Token cookie + new Access Token (seamless)
  Device Token expired/revoked → Full re-login required
```

#### Detailed Design

##### 1. Database Schema Changes

New `DeviceToken` model in `schema.prisma`:

```prisma
model DeviceToken {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  tokenHash    String   @map("token_hash") @db.VarChar(255)
  deviceId     String   @map("device_id") @db.VarChar(255) // Client-generated UUID per device
  deviceName   String?  @map("device_name") @db.VarChar(255) // "iPhone 15 - Safari", "Chrome - Windows"
  platform     String?  @db.VarChar(50) // "ios", "android", "web", "electron"
  lastUsedAt   DateTime @map("last_used_at") @default(now())
  lastIp       String?  @map("last_ip") @db.VarChar(45)
  expiresAt    DateTime @map("expires_at")
  revoked      Boolean  @default(false)

  createdAt    DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tokenHash])
  @@index([userId])
  @@index([deviceId])
  @@map("device_tokens")
}
```

**Migration strategy**: Standard Prisma migration (`prisma migrate dev`), purely additive - no existing tables are modified or dropped.

##### 2. Server-Side Changes

**a) New Auth Service Methods (`server/src/features/auth/service.ts`)**

- `createDeviceToken(userId, deviceInfo)` - Generate a cryptographically secure opaque token, hash it with bcrypt, store in `DeviceToken` table, return raw token to client. Expiry: 1 year for mobile, 90 days for web.
- `authenticateWithDeviceToken(rawToken, deviceId)` - Find matching token by iterating user's device tokens (like current refresh logic at `service.ts:318-328`), verify it's not revoked/expired, update `lastUsedAt`/`lastIp`, issue new access + refresh token pair, return them.
- `revokeDeviceToken(tokenId, userId)` - Revoke a specific device (for "log out this device" feature).
- `revokeAllDeviceTokens(userId)` - Revoke all device tokens (for "log out all devices").
- `listDeviceTokens(userId)` - List active device sessions (for device management UI).

**b) New Auth Routes (`server/src/features/auth/routes.ts`)**

```
POST   /auth/device-auth       - Authenticate using device token (public, rate-limited)
GET    /auth/devices            - List user's active devices (authenticated)
DELETE /auth/devices/:id        - Revoke a specific device token (authenticated)
DELETE /auth/devices            - Revoke all device tokens (authenticated)
```

**c) Modified: `verify2FA` Response**

After successful 2FA verification, if the client sends a `deviceId` and `deviceName` in the request body, also generate and return a `deviceToken` in the response. This is backward-compatible - existing clients that don't send `deviceId` won't receive a device token.

**d) Modified: `logout`**

On logout, revoke the device token for the current device if `deviceId` is provided. This allows per-device logout vs. "logout everywhere."

**e) Rate Limiting**

The `/auth/device-auth` endpoint gets its own rate limiter (similar to the 2FA limiter) keyed on `deviceId + IP`:
- 5 attempts per 15 minutes per device
- On 3 consecutive failures, revoke the device token (potential stolen token)

##### 3. Client-Side Changes

**a) Device Identity (`src/shared/infrastructure/services/deviceIdentity.ts`)**

New module that:
- Generates a stable device UUID on first launch, persists it:
  - **Capacitor native (Android)**: `@capacitor/preferences` (survives app updates, not lost on browser close)
  - **Web/PWA**: `idb-keyval` (IndexedDB - more persistent than cookies/localStorage on mobile browsers)
  - **Electron**: `electron-store` or filesystem-based
- Detects platform and device name using `@capacitor/device` (already a dependency) or `navigator.userAgent` for web.
- Exports: `getDeviceId()`, `getDeviceName()`, `getPlatform()`

Note: `@capacitor/device` and `@capacitor/preferences` and `idb-keyval` are already project dependencies.

**b) Device Token Storage (`src/shared/infrastructure/services/deviceTokenStore.ts`)**

New module that:
- Stores/retrieves the raw device token using the same persistence layer as the device ID.
- Exports: `getDeviceToken()`, `setDeviceToken(token)`, `clearDeviceToken()`

**c) Modified: Auth Service (`src/shared/infrastructure/services/authService.ts`)**

- `verify2FA` call now includes `deviceId` and `deviceName` in the request body.
- New `deviceAuth(deviceToken, deviceId)` method that calls `POST /auth/device-auth`.

**d) Modified: Session Restore (`src/features/auth/application/useSessionRestore.ts`)**

Current flow at line 41: "Try to refresh token using httpOnly cookie." New flow:

```
1. Try cookie-based refresh (existing behavior - fast path)
2. If cookie refresh fails → try device token auth:
   a. Read device token from persistent storage
   b. Call POST /auth/device-auth with {deviceToken, deviceId}
   c. On success: new access token + refresh token cookie set by server → session restored
   d. On failure: clear device token → show login screen
```

This is a non-breaking change - step 1 is identical to the current behavior. Step 2 is a new fallback.

**e) Modified: API Client (`src/shared/infrastructure/services/apiClient.ts`)**

The 401 response interceptor (line 116-173) gains a second fallback:

```
Current: 401 → try cookie refresh → if fails → dispatch auth:logout
New:     401 → try cookie refresh → if fails → try device token auth → if fails → dispatch auth:logout
```

**f) New: Device Management UI**

A new section in Settings (under the existing settings feature) showing:
- List of active device sessions with device name, platform, last used timestamp, and current IP.
- "Revoke" button per device.
- "Revoke all other devices" button.

##### 4. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Device token stolen via XSS | IndexedDB is same-origin; tokens are opaque random values, not JWTs |
| Device token stolen from device | Tokens are hashed server-side (bcrypt); the raw token exists only on the device |
| Token replay | Each device token use updates `lastUsedAt`; anomaly detection can flag simultaneous use from different IPs |
| Lost/stolen device | Users can revoke specific devices from Settings; admins can revoke via admin panel |
| Brute force | Rate limiting + auto-revoke after 3 failures |

##### 5. Migration & Rollback Plan

1. **Phase 1 (server-only)**: Deploy new DB migration + new endpoints. No client changes. Zero impact on existing users.
2. **Phase 2 (client)**: Deploy updated client. New installs and re-logins get device tokens. Existing sessions continue working via cookies.
3. **Rollback**: If issues arise, the server endpoints can be disabled via feature flag. Clients gracefully fall back to cookie-only refresh (existing behavior).

---

## Part 2: AIMS Management Feature

### Problem Statement

Users need visibility into their AIMS (SoluM ESL) infrastructure status:
- **Gateway status**: Which gateways are online/offline, their configuration, and health.
- **Label status**: Label update history, success/failure rates, battery levels.
- **Product (Article) updates**: Batch update status and history with label-level detail.
- **Gateway management**: Register new gateways or deregister old ones.

Currently the app has AIMS connectivity (`aimsGateway.ts`) for articles and labels, but no dedicated status/monitoring feature and no gateway management.

### Key Requirement: Feature Toggle + Admin-Only Access

**The AIMS Management feature must integrate into the existing company feature toggle system and be restricted to admin roles only.**

#### Feature Toggle Design

AIMS Management becomes a new toggle in `CompanyFeatures`, following the exact same pattern as `spacesEnabled`, `conferenceEnabled`, `labelsEnabled`:

```typescript
// Updated CompanyFeatures interface (server + client)
export interface CompanyFeatures {
    spacesEnabled: boolean;
    peopleEnabled: boolean;
    conferenceEnabled: boolean;
    simpleConferenceMode: boolean;
    labelsEnabled: boolean;
    aimsManagementEnabled: boolean;  // NEW
}

// Updated defaults - enabled by default
export const DEFAULT_COMPANY_FEATURES: CompanyFeatures = {
    spacesEnabled: false,
    peopleEnabled: true,
    conferenceEnabled: true,
    simpleConferenceMode: false,
    labelsEnabled: true,
    aimsManagementEnabled: true,     // NEW - enabled by default
};
```

This means:
- **Enabled by default** for all companies (new and existing via backward-compat logic in `extractCompanyFeatures`)
- **Can be disabled** per-company by toggling it off in Company Settings > Features tab
- **Can be overridden per-store** via store-level feature overrides (existing pattern)
- **Backward compatible** - companies without the field get it enabled (via `?? true` in extraction)

#### Role-Based Access Control

Unlike features like "spaces" or "conference" which are visible to all store users, **AIMS Management is admin-only**:

| Role | Access Level |
|------|-------------|
| **PLATFORM_ADMIN** | Full access to all companies/stores. Can view status, manage gateways, see all history. |
| **COMPANY_ADMIN** | Full access within their company. Can view all stores' AIMS status, manage gateways. |
| **STORE_ADMIN** | Full access to their assigned store(s) only. Can view status and manage gateways. |
| **STORE_MANAGER** | **Read-only** access to their store(s). Can view status/history but cannot register/deregister/reboot gateways. |
| **STORE_EMPLOYEE** | **No access**. Feature hidden from navigation and UI. |
| **STORE_VIEWER** | **No access**. Feature hidden from navigation and UI. |
| **VIEWER** | **No access**. Feature hidden from navigation and UI. |

This is enforced at three layers:
1. **Navigation**: Tab only shown if user has minimum `STORE_MANAGER` role AND `aimsManagementEnabled` is true
2. **Client-side**: `ProtectedFeature` component wraps all AIMS UI with `feature="aims-management" minimumStoreRole="STORE_MANAGER" requireAll`
3. **Server-side**: Routes require `authenticate` + minimum `STORE_MANAGER` role. Write operations require `STORE_ADMIN` or higher.

### Architecture Decision: Server Proxy vs. Direct Client Access

**Recommendation: Server proxy (through electisSpace server)**

| Factor | Direct Client Access | Server Proxy (Recommended) |
|--------|---------------------|---------------------------|
| Security | AIMS token exposed to client-side JS; AIMS credentials visible in network tab | Credentials and AIMS tokens stay server-side; client only talks to electisSpace API |
| Token Management | Client must manage AIMS token refresh independently; complex retry logic duplicated | Server's `aimsGateway.ts` already handles token caching, retry, and singleflight dedup |
| CORS | AIMS SaaS servers may block cross-origin requests from the browser | No CORS issues - server-to-server calls |
| Offline/Mobile | Direct calls fail when mobile network is unreliable | Server can queue/cache; responds faster from server-side cache |
| Existing Pattern | Breaks current architecture (all AIMS calls go through server) | Consistent with existing `solumConnect`, `solumRefresh`, labels, sync features |
| Rate Limiting | Hard to control per-user AIMS API usage from client | Server can throttle and aggregate requests |
| Audit Trail | Harder to log who did what | All operations logged in server audit logs |

The **existing `aimsGateway.ts`** already has the full credential management, token caching, and retry infrastructure. Adding new methods there for gateway/status endpoints is minimal work and maintains architectural consistency.

### Detailed Design

#### 1. Feature System Integration (All Layers)

##### a) Server-side: Feature Resolution (`server/src/shared/utils/featureResolution.ts`)

```typescript
// Add to CompanyFeatures interface:
aimsManagementEnabled: boolean;

// Add to DEFAULT_COMPANY_FEATURES:
aimsManagementEnabled: true,

// Add to ALL_FEATURES_ENABLED:
aimsManagementEnabled: true,

// Add to extractCompanyFeatures():
aimsManagementEnabled: f.aimsManagementEnabled ?? true, // default enabled for backward compat
```

##### b) Server-side: Validation Schema (`server/src/features/companies/types.ts`)

```typescript
// Add to companyFeaturesSchema:
export const companyFeaturesSchema = z.object({
    spacesEnabled: z.boolean(),
    peopleEnabled: z.boolean(),
    conferenceEnabled: z.boolean(),
    simpleConferenceMode: z.boolean(),
    labelsEnabled: z.boolean(),
    aimsManagementEnabled: z.boolean(),  // NEW
}).refine(
    (data) => !(data.spacesEnabled && data.peopleEnabled),
    { message: 'Spaces and People cannot both be enabled' }
);
```

##### c) Client-side: Auth Service Types (`src/shared/infrastructure/services/authService.ts`)

```typescript
// Add to CompanyFeatures interface:
aimsManagementEnabled: boolean;

// Add to DEFAULT_COMPANY_FEATURES:
aimsManagementEnabled: true,
```

##### d) Client-side: Permission Helpers (`src/features/auth/application/permissionHelpers.ts`)

```typescript
// Extend Feature type:
export type Feature = 'dashboard' | 'spaces' | 'conference' | 'people' | 'sync' | 'settings' | 'labels' | 'aims-management';

// Add to isFeatureEnabled():
case 'aims-management': return features.aimsManagementEnabled;
```

##### e) Client-side: Company Features UI (`src/features/settings/presentation/companyDialog/EditCompanyTabs.tsx`)

Add a new toggle in the Features tab, after the Labels toggle:

```tsx
<FormControlLabel
    control={
        <Switch
            checked={state.companyFeatures.aimsManagementEnabled}
            onChange={(e) => state.handleFeatureToggle('aimsManagementEnabled', e.target.checked)}
        />
    }
    label={t('settings.companies.aimsManagement', 'AIMS Management')}
/>
```

##### f) Client-side: Store Feature Assignment (`src/features/settings/presentation/StoreAssignment.tsx`)

Add `aims-management` to `AVAILABLE_FEATURES`:

```typescript
const AVAILABLE_FEATURES = [
    { id: 'dashboard', icon: '...' },
    { id: 'spaces', icon: '...' },
    { id: 'conference', icon: '...' },
    { id: 'people', icon: '...' },
    { id: 'aims-management', icon: '...' },  // NEW
    { id: 'sync', icon: '...' },
    { id: 'settings', icon: '...' },
] as const;
```

#### 2. New AIMS API Endpoints Identified (from `solumapi.yaml`)

**Gateway Operations:**
| Operation | AIMS Endpoint | HTTP Method |
|-----------|---------------|-------------|
| List Gateways | `/common/api/v2/common/gateway?company=X&store=Y` | GET |
| Gateway Details | `/common/api/v2/common/gateway/detail?company=X&store=Y&gateway=MAC` | GET |
| Floating Gateways | `/common/api/v2/common/gateway/floating?company=X` | GET |
| Register Gateway | `/common/api/v2/common/gateway` (body: `{gateway: "MAC"}`) | POST |
| Deregister Gateway | `/common/api/v2/common/gateway?company=X&store=Y&gateways=MAC1,MAC2` | DELETE |
| Update GW Config | `/common/api/v2/common/gateway` (body: config) | PUT |
| Reboot Gateway | `/common/api/v2/common/gateway?company=X&store=Y&gateway=MAC` | PATCH |
| GW Debug Report | `/common/api/v2/common/gateway/debug/info?company=X&store=Y&gateway=MAC` | GET |

**Label Status & History:**
| Operation | AIMS Endpoint | HTTP Method |
|-----------|---------------|-------------|
| Label List | `/common/api/v2/common/labels?company=X&store=Y` | GET |
| Label Status History | `/common/api/v2/common/labels/status/history?company=X&store=Y&label=CODE` | GET |

**Product (Article) Update History:**
| Operation | AIMS Endpoint | HTTP Method |
|-----------|---------------|-------------|
| Batch Update History | `/common/api/v2/common/articles/history?company=X&...` | GET |
| Batch Detail (with labels) | `/common/api/v2/common/articles/history/detail?company=X&name=BATCH` | GET |
| Batch Validation Errors | `/common/api/v2/common/articles/validationerror/logs?company=X&...` | GET |
| Article Update History | `/common/api/v2/common/articles/update/history?company=X&store=Y&article=ID` | GET |

#### 3. Server-Side Changes

**a) New methods on `AIMSGateway` class (`server/src/shared/infrastructure/services/aimsGateway.ts`)**

```typescript
// Gateway Operations
async fetchGateways(storeId: string): Promise<AimsGateway[]>
async fetchGatewayDetail(storeId: string, gatewayMac: string): Promise<AimsGatewayDetail>
async fetchFloatingGateways(companyId: string): Promise<AimsGateway[]>
async registerGateway(storeId: string, gatewayMac: string): Promise<AimsApiResponse>
async deregisterGateway(storeId: string, gatewayMacs: string[]): Promise<AimsApiResponse>
async rebootGateway(storeId: string, gatewayMac: string): Promise<AimsApiResponse>
async fetchGatewayDebugReport(storeId: string, gatewayMac: string): Promise<AimsGatewayDebugReport>

// Label Status
async fetchLabelStatusHistory(storeId: string, labelCode: string, params?: LabelHistoryParams): Promise<AimsLabelStatusHistory>

// Product Update History
async fetchArticleBatchHistory(storeId: string, params?: BatchHistoryParams): Promise<AimsBatchHistory>
async fetchArticleBatchDetail(storeId: string, batchName: string, params?: BatchDetailParams): Promise<AimsBatchDetail>
async fetchArticleBatchErrors(storeId: string, batchId: string): Promise<AimsBatchErrors>
async fetchArticleUpdateHistory(storeId: string, articleId: string): Promise<AimsArticleUpdateHistory>
```

Each method follows the existing pattern in `aimsGateway.ts`:
1. Get token for store (with caching/singleflight)
2. Call AIMS API via `solumService`
3. On 401/403, invalidate token cache and retry once

**b) New types (`server/src/shared/infrastructure/services/aims.types.ts`)**

Add interfaces for gateway, label history, and batch history responses based on the SOLUM API response schemas.

**c) New `solumService` methods (`server/src/shared/infrastructure/services/solumService.ts`)**

Low-level HTTP calls to the AIMS API for each new operation, following the existing pattern.

**d) New server feature: `server/src/features/aims-status/`**

Create a new feature module following the existing clean architecture pattern:

```
server/src/features/aims-status/
  ├── controller.ts   # HTTP request/response handling
  ├── routes.ts       # Route definitions with auth + role guards
  ├── service.ts      # Business logic (delegates to aimsGateway)
  ├── types.ts        # Request/response types, Zod schemas
  └── index.ts        # Barrel export
```

**Routes with Role-Based Guards:**

```
# Read-only operations: minimum STORE_MANAGER role
# Feature gate: aimsManagementEnabled must be true for the store

GET    /aims/gateways                - List gateways for active store
GET    /aims/gateways/:mac           - Gateway detail
GET    /aims/gateways/:mac/debug     - Gateway debug report
GET    /aims/gateways/floating       - List floating (unassigned) gateways
GET    /aims/labels/:code/history    - Label status history
GET    /aims/products/history        - Batch update history (with date range filters)
GET    /aims/products/history/:name  - Batch detail with per-label status
GET    /aims/products/history/:name/errors - Batch validation errors
GET    /aims/products/:articleId/history   - Single article update history

# Write operations: minimum STORE_ADMIN role
POST   /aims/gateways               - Register a gateway (body: {mac: "D02544FFFE..."})
DELETE /aims/gateways                - Deregister gateways (body: {macs: ["MAC1", ...]})
PATCH  /aims/gateways/:mac/reboot   - Reboot a gateway
PUT    /aims/gateways/:mac/config   - Update gateway config
```

**Server-side role enforcement middleware:**

```typescript
// In routes.ts:
const readAccess = [authenticate, requireStoreRole('STORE_MANAGER'), requireFeature('aimsManagementEnabled')];
const writeAccess = [authenticate, requireStoreRole('STORE_ADMIN'), requireFeature('aimsManagementEnabled')];

router.get('/aims/gateways', ...readAccess, controller.listGateways);
router.post('/aims/gateways', ...writeAccess, controller.registerGateway);
// etc.
```

The `requireFeature` middleware checks the store's effective features (company-level or store-override) and returns 403 if the feature is disabled. This mirrors how features are checked in the client.

**e) Audit logging**

All gateway management operations (register, deregister, reboot) are logged to the existing `AuditLog` table with:
- `action`: `GATEWAY_REGISTER`, `GATEWAY_DEREGISTER`, `GATEWAY_REBOOT`
- `userId`: The requesting user
- `storeId`: The target store
- `details`: JSON with the gateway MAC and operation result

#### 4. Client-Side Changes

**a) New feature module: `src/features/aims-status/`**

Following the existing clean architecture pattern used by other features:

```
src/features/aims-status/
  ├── application/
  │   ├── useGateways.ts          # Hook for gateway list/detail
  │   ├── useGatewayManagement.ts # Hook for register/deregister/reboot
  │   ├── useLabelHistory.ts      # Hook for label status history
  │   └── useProductHistory.ts    # Hook for product batch history
  ├── infrastructure/
  │   ├── aimsStatusStore.ts      # Zustand store for AIMS status state
  │   └── aimsStatusService.ts    # API calls to server /aims/* endpoints
  └── presentation/
      ├── AimsStatusPage.tsx       # Main page with tab navigation
      ├── GatewayList.tsx          # Gateway list with status indicators
      ├── GatewayDetail.tsx        # Single gateway detail view
      ├── GatewayRegistration.tsx  # Register/deregister dialog (admin-only)
      ├── LabelHistory.tsx         # Label status history view
      ├── ProductHistory.tsx       # Product batch update history
      └── ProductBatchDetail.tsx   # Per-label status for a batch
```

**b) Navigation & Routing Integration**

Add to `MainLayout.tsx` navigation tabs (filtered by permissions):

```typescript
// In allNavTabs array:
{
    labelKey: 'navigation.aimsManagement',
    value: '/aims-management',
    icon: <RouterIcon />,
    feature: 'aims-management',
    // Additional role check applied in filter
},

// Filter with combined feature + role check:
const navTabs = allNavTabs.filter(tab => {
    if (!tab.feature || canAccessFeature(tab.feature as any)) {
        // For aims-management, also require minimum STORE_MANAGER role
        if (tab.feature === 'aims-management') {
            return hasStoreRole('STORE_MANAGER');
        }
        return true;
    }
    return false;
});
```

Add route in `AppRoutes.tsx`:
```typescript
<Route
    path="/aims-management"
    element={
        <ProtectedFeature
            feature="aims-management"
            minimumStoreRole="STORE_MANAGER"
            requireAll
            fallback={<Navigate to="/" />}
        >
            <AimsStatusPage />
        </ProtectedFeature>
    }
/>
```

**c) UI Design**

The AIMS Management page is a new top-level feature page accessible from the main navigation. It has four tabs:

1. **Overview** (default tab) - Dashboard summary
   - Total gateways / online / offline count
   - Total labels / recently updated / failed count
   - Recent product update batches with success rate
   - AIMS connection health indicator

2. **Gateways** - Card/table view of all gateways for the active store
   - Columns: MAC Address, IP, Status (online/offline indicator), Model, Firmware, Connected Labels Count
   - Actions (STORE_ADMIN+ only): View Details, Reboot, Deregister
   - "Register Gateway" button (STORE_ADMIN+ only) opens a dialog for entering MAC address
   - "Floating Gateways" section showing gateways registered to the company but not assigned to any store
   - STORE_MANAGER sees read-only view without action buttons

3. **Labels Status** - Searchable list of labels with latest status
   - Search by label code
   - Click to expand: full status history showing update timestamps, gateway, signal strength, battery level
   - Color-coded status: SUCCESS (green), PROCESSING (yellow), TIMEOUT/FAIL (red)

4. **Product Updates** - Timeline view of product batch updates
   - Date range filter
   - Each batch entry shows: batch name, timestamp, total articles, success/fail counts
   - Click to expand: per-label update status with error details
   - Validation error tab for batch errors

**d) Store-Scoped Access (Critical)**

The AIMS data is **always scoped to the user's active store**:
- **STORE_MANAGER / STORE_ADMIN**: Sees only data for their assigned store(s). The active store selector in the AppHeader determines which store's AIMS data is shown.
- **COMPANY_ADMIN**: Can switch between any store in their company via the store selector.
- **PLATFORM_ADMIN**: Can switch between any company and any store.

This is consistent with how all other features (Spaces, People, Labels, Conference) work - data is always scoped to the active store, and store switching is handled by the existing `CompanyStoreSelector`.

#### 5. Data Flow Architecture

```
[Client]                    [electisSpace Server]              [AIMS SaaS]
   |                              |                                |
   |  GET /aims/gateways          |                                |
   |  (Bearer: access_token)      |                                |
   |----------------------------->|                                |
   |                              | 1. Verify JWT token             |
   |                              | 2. Check role >= STORE_MANAGER  |
   |                              | 3. Check aimsManagementEnabled  |
   |                              | 4. Get AIMS token for store     |
   |                              |                                |
   |                              |  GET /common/api/v2/common/gateway
   |                              |  (Bearer: aims_token)          |
   |                              |------------------------------->|
   |                              |                                |
   |                              |  <-- gateway list JSON         |
   |                              |<-------------------------------|
   |  <-- normalized response     |                                |
   |<-----------------------------|                                |
```

The server acts as a secure proxy, translating between the client's `storeId`-based requests and the AIMS API's `company`/`store` code-based parameters. This translation happens in the `aims-status` service layer using the same `aimsGateway.getStoreConfig()` method used by existing sync features.

#### 6. History & Caching Strategy

- **Gateway list**: Cached client-side for 30 seconds (Zustand + stale timer). Pull-to-refresh on mobile.
- **Gateway details**: Fetched on demand, cached for 60 seconds.
- **Label history**: Fetched on demand per label, no client cache (always fresh).
- **Product batch history**: Paginated server-side (20 per page), cached client-side per page.
- **Server-side**: No additional caching beyond the existing AIMS token cache. AIMS status data should be real-time.

#### 7. Error Handling

- **AIMS unreachable**: Show "AIMS server unreachable" banner with retry button. Don't block the UI.
- **AIMS credentials not configured**: Show "AIMS not configured for this store" with link to Settings for admins, or "Contact your administrator" for non-admins (consistent with existing `storeConnectionInfo` endpoint).
- **AIMS rate limit (429)**: Show "AIMS rate limited, retrying..." with exponential backoff (reusing existing `loginWithRetry` pattern).
- **Feature disabled**: If `aimsManagementEnabled` is false, server returns 403; client never shows the nav tab.

---

## Implementation Order (Recommended)

### Phase 1: Feature Toggle Infrastructure
1. Add `aimsManagementEnabled` to `CompanyFeatures` in server `featureResolution.ts`
2. Add `aimsManagementEnabled` to server validation schemas (`companies/types.ts`)
3. Add `aimsManagementEnabled` to server `ALL_FEATURES_ENABLED` and `extractCompanyFeatures`
4. Add `aimsManagementEnabled` to client `CompanyFeatures` and `DEFAULT_COMPANY_FEATURES`
5. Add `'aims-management'` to client `Feature` type in `permissionHelpers.ts`
6. Add `case 'aims-management'` to `isFeatureEnabled()` function
7. Add toggle in Company Features UI (`EditCompanyTabs.tsx`)
8. Add to `StoreAssignment.tsx` available features list
9. Create server `requireFeature` middleware if not already present
10. **Test**: Toggle on/off in company settings, verify backward compat (existing companies get it enabled)

### Phase 2: AIMS Status Feature (Read-Only)
1. Add AIMS types for gateway, label history, batch history
2. Add `solumService` methods for new AIMS API calls
3. Add `aimsGateway` methods wrapping the solumService calls
4. Create `aims-status` server feature (routes, controller, service, types) with role guards
5. Create client `aims-status` feature (service, store, hooks, pages)
6. Add routing with `ProtectedFeature` wrapper and navigation with role check
7. Test with real AIMS SaaS instance

### Phase 3: Gateway Management
1. Add gateway register/deregister/reboot to `solumService` and `aimsGateway`
2. Add write endpoints to `aims-status` routes with `STORE_ADMIN` role guards
3. Add audit logging for management operations
4. Build client-side registration/deregistration UI (hidden from STORE_MANAGER)
5. Test register/deregister flow against AIMS sandbox

### Phase 4: Device Token Auth
1. Create DB migration for `DeviceToken` model
2. Implement server-side device token service methods
3. Add server routes (`/auth/device-auth`, `/auth/devices`)
4. Build `deviceIdentity` and `deviceTokenStore` client modules
5. Modify `verify2FA` to issue device token
6. Modify `useSessionRestore` to use device token as fallback
7. Modify API client 401 interceptor for device token fallback
8. Build device management UI in Settings
9. Test on mobile (iOS Safari, Android Chrome) with browser close/reopen cycles

### Phase 5: Polish & Hardening
1. Add i18n translations for all new UI strings
2. Add E2E tests for critical flows
3. Monitor device token usage metrics
4. Gradual rollout via feature flags

---

## Files to Create

| File | Purpose |
|------|---------|
| `server/prisma/migrations/YYYYMMDD_add_device_tokens/migration.sql` | DB migration |
| `server/src/features/aims-status/controller.ts` | AIMS status HTTP handlers |
| `server/src/features/aims-status/routes.ts` | AIMS status route definitions with role guards |
| `server/src/features/aims-status/service.ts` | AIMS status business logic |
| `server/src/features/aims-status/types.ts` | AIMS status types & schemas |
| `server/src/features/aims-status/index.ts` | Barrel export |
| `src/features/aims-status/application/useGateways.ts` | Gateway hooks |
| `src/features/aims-status/application/useGatewayManagement.ts` | Gateway management hooks |
| `src/features/aims-status/application/useLabelHistory.ts` | Label history hooks |
| `src/features/aims-status/application/useProductHistory.ts` | Product history hooks |
| `src/features/aims-status/infrastructure/aimsStatusStore.ts` | Zustand store |
| `src/features/aims-status/infrastructure/aimsStatusService.ts` | API service |
| `src/features/aims-status/presentation/AimsStatusPage.tsx` | Main page |
| `src/features/aims-status/presentation/GatewayList.tsx` | Gateway list |
| `src/features/aims-status/presentation/GatewayDetail.tsx` | Gateway detail |
| `src/features/aims-status/presentation/GatewayRegistration.tsx` | Register/deregister dialog |
| `src/features/aims-status/presentation/LabelHistory.tsx` | Label history |
| `src/features/aims-status/presentation/ProductHistory.tsx` | Product history |
| `src/features/aims-status/presentation/ProductBatchDetail.tsx` | Batch detail |
| `src/shared/infrastructure/services/deviceIdentity.ts` | Device ID management |
| `src/shared/infrastructure/services/deviceTokenStore.ts` | Device token storage |

## Files to Modify

| File | Change |
|------|--------|
| **Feature Toggle (Phase 1)** | |
| `server/src/shared/utils/featureResolution.ts` | Add `aimsManagementEnabled` to `CompanyFeatures`, defaults, `ALL_FEATURES_ENABLED`, `extractCompanyFeatures` |
| `server/src/features/companies/types.ts` | Add `aimsManagementEnabled` to `companyFeaturesSchema` |
| `server/src/features/stores/types.ts` | Add `aimsManagementEnabled` to store feature schemas if present |
| `src/shared/infrastructure/services/authService.ts` | Add `aimsManagementEnabled` to `CompanyFeatures` and `DEFAULT_COMPANY_FEATURES` |
| `src/features/auth/application/permissionHelpers.ts` | Add `'aims-management'` to `Feature` type, add case in `isFeatureEnabled` |
| `src/features/settings/presentation/companyDialog/EditCompanyTabs.tsx` | Add AIMS Management toggle in Features tab |
| `src/features/settings/presentation/companyDialog/useCompanyDialogState.ts` | Ensure `aimsManagementEnabled` is handled in feature state |
| `src/features/settings/presentation/StoreAssignment.tsx` | Add `aims-management` to `AVAILABLE_FEATURES` |
| **AIMS Status (Phase 2-3)** | |
| `server/src/shared/infrastructure/services/aimsGateway.ts` | Add gateway/status methods |
| `server/src/shared/infrastructure/services/solumService.ts` | Add AIMS API call methods |
| `server/src/shared/infrastructure/services/aims.types.ts` | Add gateway/history types |
| `server/src/app.ts` | Register new aims-status routes |
| `src/AppRoutes.tsx` | Add AIMS management route with ProtectedFeature |
| `src/shared/presentation/layouts/MainLayout.tsx` | Add AIMS management nav tab with role-based filtering |
| **Device Token (Phase 4)** | |
| `server/prisma/schema.prisma` | Add `DeviceToken` model, add relation to `User` |
| `server/src/features/auth/service.ts` | Add device token methods |
| `server/src/features/auth/controller.ts` | Add device auth endpoint, modify verify2FA |
| `server/src/features/auth/routes.ts` | Add device auth routes |
| `server/src/features/auth/types.ts` | Add device token schemas |
| `src/shared/infrastructure/services/authService.ts` | Add deviceAuth, modify verify2FA |
| `src/shared/infrastructure/services/apiClient.ts` | Add device token fallback in 401 interceptor |
| `src/features/auth/application/useSessionRestore.ts` | Add device token restore fallback |
| `src/features/auth/infrastructure/authStore.ts` | Minor: pass deviceId in verify2FA |
| `src/features/settings/` | Add device management section |
