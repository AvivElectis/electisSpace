# electisSpace Server - Flow Charts

## Document Purpose
Visual representations of key system workflows using Mermaid diagrams.

---

## 1. Authentication Flows

### 1.1 Login Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database
    participant R as Redis

    C->>S: POST /auth/login {email, password}
    S->>R: Check rate limit
    alt Rate Limited
        R-->>S: Blocked
        S-->>C: 429 Too Many Requests
    else Allowed
        R-->>S: OK
        S->>DB: Find user by email
        alt User Not Found
            DB-->>S: null
            S-->>C: 401 Invalid credentials
        else User Found
            DB-->>S: User record
            S->>S: Verify password hash
            alt Password Invalid
                S-->>C: 401 Invalid credentials
            else Password Valid
                S->>S: Generate JWT tokens
                S->>DB: Store refresh token hash
                S->>DB: Update lastLogin
                S->>DB: Log audit event
                S-->>C: 200 {accessToken, refreshToken}
            end
        end
    end
```

### 1.2 Token Refresh Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database

    C->>S: POST /auth/refresh (HttpOnly cookie)
    S->>S: Extract refresh token
    S->>DB: Find token by hash
    alt Token Not Found
        DB-->>S: null
        S-->>C: 401 Invalid token
    else Token Found
        DB-->>S: Token record
        alt Token Expired
            S-->>C: 401 Token expired
        else Token Revoked
            S-->>C: 401 Token revoked
        else Token Valid
            S->>DB: Revoke old token
            S->>S: Generate new token pair
            S->>DB: Store new refresh token
            S-->>C: 200 {accessToken, refreshToken}
        end
    end
```

---

## 2. CRUD Operation Flows

### 2.1 Create Space Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database
    participant Q as Sync Queue
    participant AIMS as SoluM AIMS

    C->>S: POST /api/spaces {data}
    S->>S: Validate JWT
    S->>S: Check permissions
    S->>S: Validate input (Zod)
    S->>DB: INSERT space (status: pending)
    DB-->>S: Space record
    S->>Q: Enqueue sync job
    S-->>C: 201 Created {space}
    
    Note over Q,AIMS: Async Processing
    Q->>AIMS: POST /articles
    alt Success
        AIMS-->>Q: 200 OK
        Q->>DB: UPDATE status = 'synced'
    else Failure
        AIMS-->>Q: Error
        Q->>Q: Retry with backoff
    end
```

### 2.2 Assign Person to Space Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database
    participant Q as Sync Queue
    participant AIMS as SoluM AIMS
    participant WS as WebSocket

    C->>S: POST /api/people/:id/assign {spaceId}
    S->>S: Validate JWT & permissions
    S->>DB: Get person record
    S->>DB: Check if space exists & available
    
    alt Space Not Available
        S-->>C: 409 Conflict
    else Space Available
        S->>DB: BEGIN TRANSACTION
        S->>DB: Clear old space assignment
        S->>DB: Update person.assignedSpaceId
        S->>DB: COMMIT
        S->>Q: Enqueue AIMS sync
        S->>WS: Broadcast person:assigned
        S-->>C: 200 OK {person}
        
        Note over Q,AIMS: Async Sync
        Q->>AIMS: Clear old article
        Q->>AIMS: Update new article
        Q->>DB: Update sync status
    end
```

---

## 3. Sync Engine Flows

### 3.1 Full Sync Flow

```mermaid
flowchart TD
    A[Trigger Full Sync] --> B{Auth Valid?}
    B -->|No| C[Return 401]
    B -->|Yes| D[Set sync_status = syncing]
    D --> E[Fetch all from AIMS]
    E --> F{AIMS Reachable?}
    F -->|No| G[Queue for retry]
    G --> H[Return 503]
    F -->|Yes| I[Compare with DB]
    I --> J{Conflicts?}
    J -->|Yes| K[Apply resolution strategy]
    J -->|No| L[Merge data]
    K --> L
    L --> M[Update Database]
    M --> N[Push local changes to AIMS]
    N --> O{Push success?}
    O -->|No| P[Queue failed items]
    O -->|Yes| Q[Update sync_status = synced]
    P --> Q
    Q --> R[Broadcast sync:completed]
    R --> S[Return 200]
```

### 3.2 Sync Queue Processing

```mermaid
flowchart TD
    A[Job enters queue] --> B[Worker picks up job]
    B --> C{Attempt count < max?}
    C -->|No| D[Move to dead letter queue]
    D --> E[Alert admin]
    C -->|Yes| F[Execute AIMS API call]
    F --> G{Success?}
    G -->|Yes| H[Update DB sync_status = synced]
    H --> I[Remove from queue]
    G -->|No| J{Retryable error?}
    J -->|No| D
    J -->|Yes| K[Calculate backoff delay]
    K --> L[Increment attempt count]
    L --> M[Re-queue with delay]
```

---

## 4. Health Check Flows

### 4.1 Readiness Check Flow

```mermaid
flowchart TD
    A[GET /health/ready] --> B[Check Database]
    B --> C{DB Connected?}
    C -->|No| D[db: error]
    C -->|Yes| E[db: ok]
    
    E --> F[Check Redis]
    D --> F
    F --> G{Redis Connected?}
    G -->|No| H[redis: error]
    G -->|Yes| I[redis: ok]
    
    I --> J[Check SoluM]
    H --> J
    J --> K{SoluM Reachable?}
    K -->|No| L[solum: error]
    K -->|Yes| M[solum: ok]
    
    M --> N{All OK?}
    L --> N
    N -->|Yes| O[Return 200 status: ok]
    N -->|No| P[Return 503 status: degraded]
```

### 4.2 SoluM Alive Signal Flow

```mermaid
sequenceDiagram
    participant S as Server
    participant AIMS as SoluM AIMS
    participant DB as Database
    participant WS as WebSocket

    loop Every 60 seconds
        S->>AIMS: GET /health or ping
        alt AIMS Responds
            AIMS-->>S: 200 OK
            S->>DB: Update lastSolumPing
            S->>WS: Broadcast health:solum:ok
        else AIMS Timeout
            S->>DB: Log connection failure
            S->>WS: Broadcast health:solum:error
            S->>S: Pause sync queue
        end
    end
```

---

## 5. User Management Flows

### 5.1 Create User Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant S as Server
    participant DB as Database
    participant E as Email Service

    A->>S: POST /api/users {email, role, ...}
    S->>S: Validate JWT (Admin only)
    S->>S: Validate input
    S->>DB: Check email unique
    alt Email Exists
        DB-->>S: User found
        S-->>A: 409 Email already exists
    else Email Available
        S->>S: Generate temp password
        S->>S: Hash password
        S->>DB: INSERT user
        S->>DB: Log audit event
        S->>E: Send welcome email
        S-->>A: 201 Created {user}
    end
```

### 5.2 Change Password Flow

```mermaid
sequenceDiagram
    participant U as User
    participant S as Server
    participant DB as Database

    U->>S: POST /auth/change-password {old, new}
    S->>S: Validate JWT
    S->>DB: Get user password hash
    S->>S: Verify old password
    alt Old Password Invalid
        S-->>U: 401 Invalid current password
    else Old Password Valid
        S->>S: Validate new password strength
        alt Weak Password
            S-->>U: 400 Password too weak
        else Strong Password
            S->>S: Hash new password
            S->>DB: UPDATE password_hash
            S->>DB: Revoke all refresh tokens
            S->>DB: Log audit event
            S-->>U: 200 Password changed
        end
    end
```

---

## 6. Conference Room Flows

### 6.1 Toggle Meeting Status Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database
    participant Q as Sync Queue
    participant AIMS as SoluM AIMS
    participant ESL as ESL Label

    C->>S: POST /api/conference/:id/toggle
    S->>S: Validate JWT & permissions
    S->>DB: Get conference room
    S->>DB: Toggle hasMeeting
    
    alt Turning OFF
        S->>DB: Clear meetingName, times, participants
    end
    
    S->>Q: Enqueue sync job
    S-->>C: 200 OK {room}
    
    Note over Q,ESL: Async Processing
    Q->>AIMS: PUT /articles {room data}
    AIMS-->>Q: 200 OK
    Q->>AIMS: POST /labels/page {flip}
    AIMS->>ESL: Display update
    Q->>DB: Update sync_status
```

---

## 7. Multi-Tenant Data Flow

```mermaid
flowchart TD
    subgraph "Organization A"
        A1[Admin User] --> A2[Spaces A]
        A1 --> A3[People A]
        A2 --> A4[SoluM Config A]
    end
    
    subgraph "Organization B"
        B1[Admin User] --> B2[Spaces B]
        B1 --> B3[People B]
        B2 --> B4[SoluM Config B]
    end
    
    subgraph "Server"
        S1[Auth Middleware]
        S2[Org Filter Middleware]
        S3[Database Queries]
    end
    
    A1 --> S1
    B1 --> S1
    S1 --> S2
    S2 --> S3
    S3 -->|WHERE org_id = A| A2
    S3 -->|WHERE org_id = B| B2
```

---

## 8. Error Handling Flow

```mermaid
flowchart TD
    A[Request] --> B{Validation Error?}
    B -->|Yes| C[400 Bad Request]
    B -->|No| D{Auth Error?}
    D -->|Yes| E{Token Expired?}
    E -->|Yes| F[401 + refresh hint]
    E -->|No| G[401 Unauthorized]
    D -->|No| H{Permission Error?}
    H -->|Yes| I[403 Forbidden]
    H -->|No| J{Resource Not Found?}
    J -->|Yes| K[404 Not Found]
    J -->|No| L{Business Logic Error?}
    L -->|Yes| M[409 Conflict / 422 Unprocessable]
    L -->|No| N{External Service Error?}
    N -->|Yes| O[502 Bad Gateway / 503 Unavailable]
    N -->|No| P[500 Internal Server Error]
    
    C & F & G & I & K & M & O & P --> Q[Log Error]
    Q --> R[Return Error Response]
```
