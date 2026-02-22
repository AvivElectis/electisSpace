# Chapter 2 — Data Architecture

### 2.1 Entity-Relationship Model

```mermaid
erDiagram
    Company ||--o{ Store : "has many"
    Company ||--o{ UserCompany : "has many"
    Store ||--o{ UserStore : "has many"
    Store ||--o{ Space : "has many"
    Store ||--o{ Person : "has many"
    Store ||--o{ ConferenceRoom : "has many"
    Store ||--o{ PeopleList : "has many"
    Store ||--o{ SpacesList : "has many"
    Store ||--o{ AuditLog : "has many"
    Store ||--o{ SyncQueueItem : "has many"
    User ||--o{ UserCompany : "has many"
    User ||--o{ UserStore : "has many"
    User ||--o{ RefreshToken : "has many"
    User ||--o{ VerificationCode : "has many"
    User ||--o{ AuditLog : "authored"
    PeopleList ||--o{ PeopleListMembership : "has many"
    Person ||--o{ PeopleListMembership : "belongs to"
    Space ||--o{ PeopleListMembership : "optional"

    Company {
        uuid id PK
        string name
        string code UK "3+ capital letters"
        string aimsBaseUrl
        string aimsCluster
        string aimsUsername
        string aimsPasswordEnc "AES encrypted"
        json settings "logos, CSV config, etc."
        boolean isActive
    }

    Store {
        uuid id PK
        uuid companyId FK
        string name
        string code "unique per company"
        json settings "store overrides"
        string timezone
        boolean syncEnabled
        datetime lastAimsSyncAt
        boolean isActive
    }

    User {
        uuid id PK
        string email UK
        string passwordHash "bcrypt 12 rounds"
        enum globalRole "PLATFORM_ADMIN or null"
        uuid activeCompanyId "last selected"
        uuid activeStoreId "last selected"
        json preferences "UI prefs"
        boolean isActive
        int failedLoginAttempts
        datetime lockedUntil
    }

    UserCompany {
        uuid id PK
        uuid userId FK
        uuid companyId FK
        enum role "CompanyRole"
        boolean allStoresAccess
    }

    UserStore {
        uuid id PK
        uuid userId FK
        uuid storeId FK
        enum role "StoreRole"
        json features "enabled features array"
    }

    Space {
        uuid id PK
        uuid storeId FK
        string externalId "unique per store"
        string labelCode
        string_array assignedLabels
        json data "dynamic fields"
        enum syncStatus
        datetime lastSyncedAt
    }

    Person {
        uuid id PK
        uuid storeId FK
        string virtualSpaceId
        string assignedSpaceId "slot number"
        string labelCode
        string_array assignedLabels
        json data "dynamic fields"
        enum syncStatus
    }

    ConferenceRoom {
        uuid id PK
        uuid storeId FK
        string externalId
        string roomName
        boolean hasMeeting
        string meetingName
        string startTime
        string endTime
        string_array participants
        string_array assignedLabels
        enum syncStatus
    }

    SyncQueueItem {
        uuid id PK
        uuid storeId FK
        string entityType
        string entityId
        string action "CREATE/UPDATE/DELETE"
        json payload
        int attempts
        int maxAttempts
        enum status "QueueStatus"
        string errorMessage
    }
```

### 2.2 Multi-Tenancy Model

The system implements a two-level multi-tenancy hierarchy:

```mermaid
graph TD
    PLATFORM[Platform Level<br/>PLATFORM_ADMIN]
    COMPANY[Company Level<br/>COMPANY_ADMIN, SUPER_USER]
    STORE[Store Level<br/>STORE_ADMIN, STORE_MANAGER,<br/>STORE_EMPLOYEE, STORE_VIEWER]

    PLATFORM --> COMPANY
    COMPANY --> STORE

    style PLATFORM fill:#e74c3c,color:#fff
    style COMPANY fill:#f39c12,color:#fff
    style STORE fill:#27ae60,color:#fff
```

**Company** is the top-level tenant. Each company:
- Has its own AIMS API credentials (base URL, cluster, username, encrypted password).
- Stores company-wide settings as JSON (logos, CSV import config, SoluM field mappings, people manager config).
- Can have multiple Stores.

**Store** is the operational unit within a company:
- Maps to a SoluM AIMS store number.
- Has store-specific settings that can override company defaults.
- All domain entities (spaces, people, conference rooms) are scoped to a store.
- Has its own sync queue and sync state.

**User access** is managed through two junction tables:
- `UserCompany` — grants company-level access with a `CompanyRole` and an `allStoresAccess` flag.
- `UserStore` — grants store-level access with a `StoreRole` and a feature-permissions JSON array.

### 2.3 Dynamic Data Pattern

Spaces, People, and Conference Rooms use a **dynamic data** pattern via a `data Json` column. This allows each company to define its own custom fields (e.g., department, floor, extension) without schema changes. The field definitions and display mappings are stored in the company's `settings` JSON.

When syncing to AIMS, the `data` JSON fields are mapped to AIMS article data fields using the company's `solumArticleFormat` (fetched from AIMS) and `solumMappingConfig` (user-configured).

### 2.4 Sync Status State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Entity created/updated
    PENDING --> SYNCING: Queue processor picks up
    SYNCING --> SYNCED: AIMS push succeeded
    SYNCING --> FAILED: AIMS push failed
    FAILED --> PENDING: Retry scheduled
    SYNCED --> PENDING: Entity modified again
```

### 2.5 Queue Status State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Item queued
    PENDING --> PROCESSING: Processor claims item
    PROCESSING --> COMPLETED: Success
    PROCESSING --> FAILED: Max retries exceeded
    PROCESSING --> PENDING: Retry with backoff
    FAILED --> PROCESSING: Manual retry
```

### 2.6 Key Database Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `stores` | `(companyId)` | Fast store lookup by company |
| `stores` | `(companyId, code)` UNIQUE | Unique store code per company |
| `spaces` | `(storeId, externalId)` UNIQUE | Unique space per store |
| `spaces` | `(storeId)`, `(labelCode)` | Query performance |
| `people` | `(storeId)`, `(assignedSpaceId)`, `(externalId)`, `(virtualSpaceId)` | Multi-path lookup |
| `sync_queue` | `(status, scheduledAt)` | Efficient pending item fetch |
| `audit_logs` | `(entityType, entityId)`, `(createdAt)` | Audit trail queries |
| `refresh_tokens` | `(tokenHash)`, `(userId)` | Fast token validation |
| `verification_codes` | `(userId, type, used)`, `(code)` | 2FA lookup |
