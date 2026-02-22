# Chapter 5 — Integration & Synchronization

### 5.1 SoluM AIMS Integration Overview

```mermaid
graph TB
    subgraph "electisSpace Server"
        GW[AIMS Gateway<br/>Singleton]
        SOLUM[Solum Service<br/>HTTP Client]
        AB[Article Builder<br/>Data Mapping]
        SQS[Sync Queue Service]
        SQP[Sync Queue Processor<br/>Every 10s]
        RECON[Reconciliation Job<br/>Every 60s]
    end

    subgraph "SoluM AIMS Platform"
        AUTH_EP[Auth Endpoint<br/>Login / Token]
        ART_EP[Articles Endpoint<br/>CRUD / Info]
        LABEL_EP[Labels Endpoint<br/>List / Link / Blink]
        STORE_EP[Stores Endpoint<br/>List stores]
    end

    GW --> SOLUM
    SOLUM --> AUTH_EP
    SOLUM --> ART_EP
    SOLUM --> LABEL_EP
    SOLUM --> STORE_EP

    SQP --> GW
    SQP --> AB
    RECON --> GW
    RECON --> AB
    SQS --> SQP
```

### 5.2 Push Sync Flow (Entity Changed)

```mermaid
sequenceDiagram
    participant Client as React Client
    participant API as Express API
    participant SVC as Feature Service
    participant DB as PostgreSQL
    participant SQS as Sync Queue Service
    participant SQP as Sync Queue Processor
    participant AIMS as SoluM AIMS

    Client->>API: PATCH /spaces/:id
    API->>SVC: spacesService.update()
    SVC->>DB: prisma.space.update()
    SVC->>SQS: syncQueueService.queueUpdate(storeId, 'space', id)
    SQS->>DB: Mark entity syncStatus = PENDING
    SQS->>DB: Upsert SyncQueueItem (deduplicates)
    SVC-->>Client: 200 OK (immediate response)

    Note over SQP: 10-second tick...
    SQP->>DB: Claim PENDING items (atomic transaction)
    SQP->>DB: Fetch entity data
    SQP->>SQP: articleBuilder.buildSpaceArticle()
    SQP->>AIMS: aimsGateway.pushArticles()
    AIMS-->>SQP: 200 OK
    SQP->>DB: Mark SyncQueueItem COMPLETED
    SQP->>DB: Mark entity syncStatus = SYNCED
```

Key design decisions:
- **Asynchronous push** -- Entity updates return immediately; AIMS sync happens in the background.
- **Deduplication** -- If a pending/processing queue item already exists for the same entity, it is updated in-place rather than creating a duplicate.
- **5-second delay** -- Items must be at least 5 seconds old before processing, allowing rapid edits to coalesce into a single AIMS push.

### 5.3 Reconciliation Sync Flow (Periodic)

```mermaid
sequenceDiagram
    participant Job as Reconciliation Job
    participant DB as PostgreSQL
    participant Builder as Article Builder
    participant AIMS as SoluM AIMS

    Note over Job: Every 60 seconds...

    Job->>DB: Find active stores with AIMS credentials

    loop For each store
        Job->>DB: Determine working mode (spaces vs. people)

        alt Spaces Mode
            Job->>DB: Fetch all spaces + conference rooms
        else People Mode
            Job->>DB: Fetch assigned people + empty slots + conference rooms
        end

        Job->>Builder: Build expected article map
        Job->>AIMS: pullArticles(storeId)
        AIMS-->>Job: Current AIMS articles

        Job->>Job: Diff expected vs. actual

        alt Missing or changed articles
            Job->>AIMS: pushArticles(storeId, toPush)
        end

        alt Extra articles in AIMS
            Job->>AIMS: deleteArticles(storeId, toDelete)
        end

        Job->>AIMS: pullArticleInfo(storeId)
        AIMS-->>Job: Article info with assignedLabels
        Job->>DB: Sync assignedLabels back to DB
        Job->>DB: Update store.lastAimsSyncAt
    end
```

The reconciliation job ensures eventual consistency even if individual push sync items fail. It is mode-aware:

- **Spaces mode**: Expected articles = all spaces + conference rooms.
- **People mode**: Expected articles = assigned people (keyed by `assignedSpaceId`) + empty slot articles for unoccupied spaces + conference rooms.

### 5.4 Article Building Pipeline

```mermaid
graph LR
    ENTITY[Entity Data<br/>Space / Person / Conference] --> BUILDER[Article Builder]
    FORMAT[Article Format<br/>from AIMS / Company settings] --> BUILDER
    MAPPING[Mapping Config<br/>from Company settings] --> BUILDER
    BUILDER --> ARTICLE[AIMS Article<br/>articleId + articleName<br/>+ nfcUrl + data object]
    ARTICLE --> AIMS[Push to AIMS<br/>Batched max 500]
```

The Article Builder maps entity data to the AIMS article format:

1. **Top-level fields** (`articleId`, `articleName`, `nfcUrl`) use generic AIMS keys.
2. **Data object** contains the company's custom column names from `mappingInfo`.
3. **Global field assignments** (from company settings) inject static values across all articles.
4. **Conference mapping** maps `meetingName`, `meetingTime`, and `participants` to configurable AIMS fields.

### 5.5 Label Operations

Labels are the physical e-ink devices managed through AIMS:

| Operation | Flow |
|-----------|------|
| **Fetch Labels** | Server -> AIMS `/labels` endpoint -> Return to client |
| **Link Label** | Client sends `labelCode` + `articleId` -> Server -> AIMS link endpoint |
| **Unlink Label** | Client sends `labelCode` -> Server -> AIMS unlink endpoint |
| **Blink Label** | Client sends `labelCode` -> Server -> AIMS blink endpoint (flashes LED) |
| **Push Image** | Client sends base64 image -> Server -> AIMS image push endpoint |
| **Dither Preview** | Client sends image params -> Server -> AIMS dither endpoint -> Return preview |

Label-to-entity binding (`assignedLabels` arrays) is synced back from AIMS during the reconciliation job's `syncAssignedLabels` step.
