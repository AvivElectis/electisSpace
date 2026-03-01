# Feature Deep Dive: AIMS Integration

> **Status**: Production Stable
> **Server Gateway**: `server/src/shared/infrastructure/services/aimsGateway.ts`
> **Sync Service**: `server/src/features/sync/service.ts`
> **Queue Processor**: `server/src/shared/infrastructure/jobs/SyncQueueProcessor.ts`
> **Client Settings UI**: `SolumSettingsTab.tsx`, `EditCompanyTabs.tsx`

## 1. Overview

AIMS (Article Information Management System) is SoluM's cloud platform for managing Electronic Shelf Labels (ESL). electisSpace integrates with AIMS to:

- **Push** space/person/conference data as AIMS "articles" that drive ESL label displays
- **Pull** article data from AIMS to keep the local database in sync
- **Link/unlink** physical ESL labels to articles
- **Manage** gateways (the hardware bridges between labels and the network)
- **Monitor** label status, battery, signal strength, and update history

AIMS operates on a per-company basis — each company has its own AIMS credentials and endpoint. Within a company, each store maps to an AIMS store code.

## 2. Architecture

```
┌──────────────────────────────────────────────────┐
│  Client (React)                                  │
│  ┌────────────────┐   ┌───────────────────────┐  │
│  │ SolumSettings  │   │ CompanyDialog         │  │
│  │ Tab            │   │ AIMS Config Tab       │  │
│  └───────┬────────┘   └──────────┬────────────┘  │
│          │                       │               │
│          ▼                       ▼               │
│  ┌──────────────────────────────────────┐        │
│  │ Sync API  (infrastructure/syncApi)   │        │
│  └──────────────┬───────────────────────┘        │
└─────────────────┼────────────────────────────────┘
                  │  HTTP
                  ▼
┌─────────────────────────────────────────────────────┐
│  Server (Express)                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Sync     │  │ Spaces   │  │ Companies         │  │
│  │ Routes   │  │ Routes   │  │ Routes            │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       ▼              ▼                 ▼             │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Sync     │  │ Spaces   │  │ Company            │ │
│  │ Service  │  │ Service  │  │ Service            │ │
│  └────┬─────┘  └────┬─────┘  └────────┬───────────┘ │
│       │              │                 │             │
│       ▼              ▼                 ▼             │
│  ┌─────────────────────────────────────────────┐    │
│  │        aimsGateway (singleton)               │    │
│  │  Token cache │ Singleflight │ Retry logic    │    │
│  └────────────────────┬────────────────────────┘    │
│                       │                              │
│  ┌────────────────────▼────────────────────────┐    │
│  │        solumService (HTTP client)            │    │
│  └────────────────────┬────────────────────────┘    │
└───────────────────────┼──────────────────────────────┘
                        │  HTTPS
                        ▼
              ┌─────────────────┐
              │  SoluM AIMS     │
              │  Cloud API      │
              └─────────────────┘
```

## 3. Connection Setup

### 3.1 Credentials

AIMS credentials are stored at the **company** level in the database:

| Field | DB Column | Description |
|-------|-----------|-------------|
| Cluster | `Company.aimsCluster` | `"c1"` or `"common"` — determines the base URL |
| Base URL | `Company.aimsBaseUrl` | Auto-derived from cluster (e.g., `https://eu.common.solumesl.com/c1/common`) |
| Username | `Company.aimsUsername` | AIMS login email |
| Password | `Company.aimsPasswordEnc` | AES-256 encrypted, decrypted at runtime by `aimsGateway` |

### 3.2 Cluster Options

| Cluster | Base URL |
|---------|----------|
| C1 | `https://eu.common.solumesl.com/c1/common` |
| Common | `https://eu.common.solumesl.com/common` |

### 3.3 Configuration UI

Credentials are configured in **Company Settings > AIMS Config tab** (`EditCompanyTabs.tsx`):

1. Select a cluster (C1 or Common) — base URL auto-populates
2. Enter username and password
3. Click **Test Connection** to verify credentials
4. On success, the connection status shows a green check

When already connected, a **Disconnect** button is available to clear the AIMS link.

## 4. Authentication Flow

The server manages AIMS authentication transparently:

```
1. aimsGateway.getToken(companyId)
   ├── Check in-memory token cache (Map<companyId, {token, expiresAt}>)
   │   └── If valid (>5 min until expiry) → return cached token
   ├── Check inflight login requests (singleflight pattern)
   │   └── If another caller is already logging in → await that promise
   └── Call loginWithRetry()
       ├── Decrypt password from DB
       ├── POST to AIMS /login endpoint
       ├── Retry up to 3x on 429/5xx with exponential backoff + jitter
       └── Cache token with expiry
```

**Key behaviors:**
- **Singleflight pattern**: Multiple concurrent requests share a single login call, preventing duplicate auth requests
- **Auto-refresh**: On 401/403 responses, the token is invalidated and a fresh login is attempted before retrying the operation
- **5-minute buffer**: Tokens are refreshed 5 minutes before actual expiry to prevent mid-operation failures

## 5. Article Format & Field Mapping

### 5.1 Article Format (Schema)

AIMS articles have a configurable schema — the set of fields each article contains. The format is fetched from AIMS and cached at three levels:

1. **In-memory cache** (30-minute TTL) — fastest
2. **Database** (`Company.settings.solumArticleFormat`) — survives server restarts
3. **Live AIMS fetch** — source of truth, saved back to DB

### 5.2 Field Mapping Configuration

The mapping system translates between app entities (spaces, people, conferences) and AIMS article fields:

| Mapping Type | Purpose | UI Location |
|--------------|---------|-------------|
| **Unique ID Field** | Which AIMS field serves as the article identifier | SolumSettingsTab > Field Mapping |
| **Conference Mapping** | Maps AIMS fields to `meetingName`, `meetingTime`, `participants` | SolumSettingsTab > Field Mapping |
| **Mapping Info** | `articleId` and `articleName` field names | SolumSettingsTab > Field Mapping |
| **Global Fields** | Assign constant values to specific AIMS fields (e.g., Building = "A") | SolumSettingsTab > Field Mapping |
| **Friendly Names** | Human-readable display names for each AIMS field | SolumSettingsTab > Field Mapping |

### 5.3 Article Building

When syncing entities to AIMS, dedicated builder functions construct articles:

- `buildSpaceArticle()` — Space entity → AIMS article
- `buildPersonArticle()` — Person entity → AIMS article
- `buildConferenceArticle()` — Conference room → AIMS article
- `buildEmptySlotArticle()` — Placeholder for unassigned spaces

## 6. Synchronization

### 6.1 Outbound Sync (App → AIMS)

Uses an **outbox pattern** with a queue processor:

```
Entity created/updated/deleted
       ↓
SyncQueueItem created (status: PENDING)
       ↓  5-second debounce delay
SyncQueueProcessor.tick() [runs every 10 seconds]
       ↓
Claims up to 50 PENDING items → PROCESSING (atomic transaction)
       ↓
Groups items by store, fetches article format + mappings
       ↓
Builds articles via entity-specific builders
       ↓
aimsGateway.pushArticles() [batches of ≤500]
       ↓
On success: COMPLETED, Store.lastAimsSyncAt updated
On failure: attempts++ → retry or FAILED after 5 attempts
       ↓
SSE broadcast to connected clients
```

**Queue item schema:**

| Field | Description |
|-------|-------------|
| `entityType` | `"space"`, `"person"`, `"conference"` |
| `entityId` | UUID of the entity |
| `action` | `CREATE`, `UPDATE`, `DELETE`, `SYNC_FULL` |
| `payload` | Entity snapshot at time of queue insertion |
| `attempts` / `maxAttempts` | Retry tracking (default max: 5) |
| `status` | `PENDING` → `PROCESSING` → `COMPLETED` / `FAILED` |

### 6.2 Inbound Sync (AIMS → App)

Pull operations fetch articles from AIMS and upsert them as local entities:

```
syncService.pullFromAims(storeId)
       ↓
aimsGateway.pullArticles(storeId)
  - Paginates in pages of 100
  - Up to 50 pages (5,000 articles max)
  - Auto-retries on 401/403
       ↓
For each article: upsert Space by externalId = articleId
       ↓
Returns { total, created, updated, unchanged }
```

### 6.3 Auto-Sync

When enabled in SoluM Settings:
- Configurable interval: 10s, 20s, 30s, 40s, 50s, 1m, 2m, 3m, 4m, 5m
- The `SyncQueueProcessor` runs on its own 10-second tick regardless
- Auto-sync controls whether pull operations run periodically

### 6.4 Sync API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/sync/status` | GET | Overall sync status + AIMS health |
| `/api/v1/sync/health` | GET | AIMS connection health check |
| `/api/v1/sync/pull` | POST | Pull articles from AIMS |
| `/api/v1/sync/push` | POST | Push pending queue to AIMS |
| `/api/v1/sync/full` | POST | Full sync (pull + push) |
| `/api/v1/sync/stores/:storeId/status` | GET | Store-specific sync status |
| `/api/v1/sync/stores/:storeId/pull` | POST | Pull for specific store |
| `/api/v1/sync/stores/:storeId/push` | POST | Push for specific store |
| `/api/v1/sync/queue` | GET | List queue items |
| `/api/v1/sync/queue/:id/retry` | POST | Retry a failed item |

## 7. Working Modes

AIMS behavior varies by the active working mode:

| Mode | Entity Type | Sync Behavior |
|------|-------------|---------------|
| **Spaces** | Space | Each space syncs as its own article. Direct AIMS mapping. |
| **People** | Person (with optional Space) | Person data builds the article. Spaces are containers, not synced directly. |
| **Conference** | Conference Room | Conference room data maps to specialized article format with meeting fields. |

Mode is configured per company in **Company Settings > Features tab**. The `SyncQueueProcessor` uses `peopleManagerEnabled` to determine which entity types to process.

## 8. Label Operations

Beyond article sync, AIMS manages physical ESL labels:

| Operation | Gateway Method | Description |
|-----------|----------------|-------------|
| Link | `linkLabel()` | Associate a label with an article. Auto-whitelists on whitelist errors. |
| Unlink | `unlinkLabel()` | Remove label-article association |
| Blink | `blinkLabel()` | Flash the physical label for identification |
| Push Image | `pushLabelImage()` | Send a custom image to a label page |
| Dither Preview | `fetchDitherPreview()` | Preview how an image will render on the label's display |
| Label Info | `fetchLabelTypeInfo()` | Hardware info: dimensions, color type, DPI, NFC |
| Status History | `fetchLabelStatusHistory()` | Signal, battery, update history |

## 9. Gateway Management

Gateways are the hardware bridges between ESL labels and the network:

| Operation | Description |
|-----------|-------------|
| List Gateways | Fetch registered gateways for a store |
| Gateway Detail | IP, firmware, connected labels, signal |
| Floating Gateways | Unregistered gateways detected on the network |
| Register | Add a floating gateway to the store |
| Deregister | Remove a gateway from the store |
| Reboot | Remotely reboot a gateway |
| Debug Report | Diagnostic data for troubleshooting |

## 10. Error Handling

### 10.1 AIMS Operation Errors

The `AimsOperationError` class captures AIMS-specific failures:

| Field | Description |
|-------|-------------|
| `responseCode` | AIMS error code string |
| `responseMessage` | Human-readable error from AIMS |
| `statusCode` | HTTP status code |

### 10.2 Common Error Scenarios

| Scenario | Handling |
|----------|----------|
| **Expired token** | Auto-invalidate + re-login + retry (transparent) |
| **Rate limiting (429)** | Exponential backoff with jitter, up to 3 retries |
| **Server error (5xx)** | Same retry strategy as rate limiting |
| **Label whitelist error** | Auto-whitelist the label, then retry the link |
| **Network failure** | Queue item stays PENDING, retried on next tick |
| **Max retries exceeded** | Queue item marked FAILED, visible in sync UI for manual retry |

### 10.3 Sync Queue Failure Recovery

Failed queue items can be retried:
- **Automatic**: Items with `attempts < maxAttempts` (5) are retried on subsequent ticks
- **Manual**: Admin can retry specific items via the sync UI or API (`POST /sync/queue/:id/retry`)

## 11. Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| "Not connected to AIMS" warning | Credentials not configured or invalid | Check Company Settings > AIMS Config tab |
| Labels not updating | Sync queue backed up or paused | Check sync status, verify `syncEnabled` on store |
| "Connection test failed" | Wrong cluster, invalid credentials, or AIMS downtime | Verify cluster selection, re-enter credentials |
| Articles not appearing in AIMS | Article format mismatch or field mapping incomplete | Review Field Mapping tab, ensure unique ID field is set |
| Duplicate articles in AIMS | `externalId` field not properly configured | Check mapping info configuration |
| Gateway offline | Hardware issue or network connectivity | Check gateway detail page, attempt reboot |

---

*See also: [Settings](SETTINGS.md) for general app configuration, [Sync System](SYNC_SYSTEM.md) for the sync UI.*
