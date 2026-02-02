# electisSpace - Low-Level Design (LLD)

**Version:** 2.0.0  
**Last Updated:** February 2, 2026  
**Status:** Production

---

## 1. Project Structure

### 1.1 Directory Layout

```
electisSpace/
├── src/                          # Frontend source
│   ├── features/                 # Feature modules (FSD)
│   │   ├── space/               # Spaces/rooms management
│   │   ├── people/              # People management
│   │   ├── conference/          # Conference rooms
│   │   ├── settings/            # App settings
│   │   ├── sync/                # Synchronization
│   │   ├── configuration/       # SoluM configuration
│   │   ├── dashboard/           # Dashboard page
│   │   ├── labels/              # Label management
│   │   └── update/              # Auto-update feature
│   ├── shared/                  # Shared code
│   │   ├── application/         # Shared hooks & controllers
│   │   ├── domain/              # Shared types & interfaces
│   │   ├── infrastructure/      # Shared services & stores
│   │   └── presentation/        # Shared components & layouts
│   ├── locales/                 # i18n translations (en, he)
│   └── test/                    # Test utilities
├── server/                      # Backend source
│   ├── src/
│   │   ├── config/             # Environment & database config
│   │   ├── features/           # Feature routes
│   │   │   ├── auth/          # Authentication
│   │   │   ├── spaces/        # Spaces API
│   │   │   ├── people/        # People API
│   │   │   ├── conference/    # Conference API
│   │   │   ├── sync/          # Sync API
│   │   │   └── settings/      # Settings API
│   │   └── shared/            # Middleware & services
│   └── prisma/                 # Database schema & migrations
├── electron/                   # Desktop shell
├── android/                    # Mobile shell
├── e2e/                        # End-to-end tests
└── docs/                       # Documentation
```

### 1.2 Feature Module Structure

Each feature follows Clean Architecture layers:

```
feature/
├── application/          # Business logic layer
│   ├── use{Feature}Controller.ts    # Main controller hook
│   └── hooks/                       # Additional hooks
├── domain/               # Domain layer
│   ├── types.ts                     # TypeScript interfaces
│   └── businessRules.ts             # Pure business logic
├── infrastructure/       # Data layer
│   ├── {feature}Store.ts            # Zustand store
│   └── {feature}Api.ts              # API service
└── presentation/         # UI layer
    ├── {Feature}Page.tsx            # Main page component
    └── components/                  # Sub-components
```

---

## 2. Database Schema

### 2.1 Core Tables

#### Company

```sql
CREATE TABLE "Company" (
    "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"               VARCHAR(255) NOT NULL,
    "aimsCompanyCode"    VARCHAR(100),
    "aimsBaseUrl"        VARCHAR(500),
    "aimsCluster"        VARCHAR(50) DEFAULT 'common',
    "aimsUsername"       VARCHAR(255),
    "aimsPasswordEnc"    TEXT,                    -- Encrypted
    "settings"           JSONB DEFAULT '{}',
    "isActive"           BOOLEAN DEFAULT true,
    "createdAt"          TIMESTAMP DEFAULT NOW(),
    "updatedAt"          TIMESTAMP DEFAULT NOW()
);
```

#### Store

```sql
CREATE TABLE "Store" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyId"   UUID NOT NULL REFERENCES "Company"("id"),
    "name"        VARCHAR(255) NOT NULL,
    "storeNumber" VARCHAR(100) NOT NULL,
    "timezone"    VARCHAR(100) DEFAULT 'UTC',
    "settings"    JSONB DEFAULT '{}',
    "isActive"    BOOLEAN DEFAULT true,
    "createdAt"   TIMESTAMP DEFAULT NOW(),
    "updatedAt"   TIMESTAMP DEFAULT NOW(),
    UNIQUE("companyId", "storeNumber")
);
```

#### User

```sql
CREATE TABLE "User" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email"        VARCHAR(255) NOT NULL UNIQUE,
    "passwordHash" VARCHAR(255) NOT NULL,
    "firstName"    VARCHAR(100),
    "lastName"     VARCHAR(100),
    "globalRole"   VARCHAR(50),              -- 'PLATFORM_ADMIN' only
    "isActive"     BOOLEAN DEFAULT true,
    "createdAt"    TIMESTAMP DEFAULT NOW(),
    "updatedAt"    TIMESTAMP DEFAULT NOW()
);
```

#### UserCompany (M:N Junction)

```sql
CREATE TABLE "UserCompany" (
    "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"    UUID NOT NULL REFERENCES "User"("id"),
    "companyId" UUID NOT NULL REFERENCES "Company"("id"),
    "role"      VARCHAR(50) NOT NULL,        -- 'COMPANY_ADMIN', 'VIEWER'
    "createdAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE("userId", "companyId")
);
```

#### UserStore (M:N Junction)

```sql
CREATE TABLE "UserStore" (
    "id"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"   UUID NOT NULL REFERENCES "User"("id"),
    "storeId"  UUID NOT NULL REFERENCES "Store"("id"),
    "role"     VARCHAR(50) NOT NULL,         -- Store roles
    "features" JSONB DEFAULT '["dashboard"]', -- Allowed features
    "createdAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE("userId", "storeId")
);

-- Store Roles:
-- 'STORE_ADMIN'    - Full access
-- 'STORE_MANAGER'  - CRUD + sync
-- 'STORE_EMPLOYEE' - Limited updates
-- 'STORE_VIEWER'   - Read only
```

### 2.2 Entity Tables

#### Space

```sql
CREATE TABLE "Space" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "storeId"     UUID NOT NULL REFERENCES "Store"("id"),
    "externalId"  VARCHAR(255),              -- External system ID
    "labelCode"   VARCHAR(100),              -- Assigned ESL label
    "data"        JSONB NOT NULL DEFAULT '{}', -- Dynamic fields
    "syncStatus"  VARCHAR(50) DEFAULT 'PENDING',
    "createdAt"   TIMESTAMP DEFAULT NOW(),
    "updatedAt"   TIMESTAMP DEFAULT NOW(),
    UNIQUE("storeId", "externalId")
);
```

#### Person

```sql
CREATE TABLE "Person" (
    "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "storeId"        UUID NOT NULL REFERENCES "Store"("id"),
    "externalId"     VARCHAR(255),
    "data"           JSONB NOT NULL DEFAULT '{}',
    "assignedSpaceId" UUID REFERENCES "Space"("id"),
    "syncStatus"     VARCHAR(50) DEFAULT 'PENDING',
    "createdAt"      TIMESTAMP DEFAULT NOW(),
    "updatedAt"      TIMESTAMP DEFAULT NOW(),
    UNIQUE("storeId", "externalId")
);
```

#### ConferenceRoom

```sql
CREATE TABLE "ConferenceRoom" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "storeId"      UUID NOT NULL REFERENCES "Store"("id"),
    "roomName"     VARCHAR(255) NOT NULL,
    "labelCode"    VARCHAR(100),
    "hasMeeting"   BOOLEAN DEFAULT false,
    "meetingName"  VARCHAR(255),
    "startTime"    VARCHAR(10),              -- HH:mm format
    "endTime"      VARCHAR(10),              -- HH:mm format
    "participants" JSONB DEFAULT '[]',
    "data"         JSONB DEFAULT '{}',
    "createdAt"    TIMESTAMP DEFAULT NOW(),
    "updatedAt"    TIMESTAMP DEFAULT NOW()
);
```

### 2.3 Supporting Tables

#### RefreshToken

```sql
CREATE TABLE "RefreshToken" (
    "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"    UUID NOT NULL REFERENCES "User"("id"),
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "revoked"   BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW()
);
```

#### VerificationCode

```sql
CREATE TABLE "VerificationCode" (
    "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"    UUID NOT NULL REFERENCES "User"("id"),
    "code"      VARCHAR(10) NOT NULL,
    "type"      VARCHAR(50) NOT NULL,        -- 'LOGIN_2FA', 'PASSWORD_RESET'
    "expiresAt" TIMESTAMP NOT NULL,
    "used"      BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW()
);
```

#### SyncQueueItem

```sql
CREATE TABLE "SyncQueueItem" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "storeId"      UUID NOT NULL REFERENCES "Store"("id"),
    "entityType"   VARCHAR(50) NOT NULL,     -- 'spaces', 'people', 'conference'
    "entityId"     VARCHAR(255),
    "action"       VARCHAR(50) NOT NULL,     -- 'CREATE', 'UPDATE', 'DELETE'
    "payload"      JSONB NOT NULL,
    "status"       VARCHAR(50) DEFAULT 'PENDING',
    "attempts"     INT DEFAULT 0,
    "maxAttempts"  INT DEFAULT 5,
    "errorMessage" TEXT,
    "createdAt"    TIMESTAMP DEFAULT NOW(),
    "processedAt"  TIMESTAMP
);
```

#### AuditLog

```sql
CREATE TABLE "AuditLog" (
    "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"     UUID REFERENCES "User"("id"),
    "storeId"    UUID REFERENCES "Store"("id"),
    "action"     VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100),
    "entityId"   VARCHAR(255),
    "oldData"    JSONB,
    "newData"    JSONB,
    "ipAddress"  VARCHAR(50),
    "createdAt"  TIMESTAMP DEFAULT NOW()
);
```

---

## 3. API Reference

### 3.1 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Step 1: Verify credentials, send 2FA |
| POST | `/api/v1/auth/verify-2fa` | Step 2: Verify code, get tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET | `/api/v1/auth/me` | Get current user info |

#### Login Request

```json
POST /api/v1/auth/login
{
    "email": "user@company.com",
    "password": "securePassword123"
}
```

#### Verify 2FA Request

```json
POST /api/v1/auth/verify-2fa
{
    "email": "user@company.com",
    "code": "123456"
}
```

#### Token Response

```json
{
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800,
    "user": {
        "id": "uuid",
        "email": "user@company.com",
        "firstName": "John",
        "lastName": "Doe",
        "globalRole": null,
        "stores": [...],
        "companies": [...]
    }
}
```

### 3.2 Spaces Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/spaces` | List spaces (paginated) |
| GET | `/api/v1/spaces/:id` | Get single space |
| POST | `/api/v1/spaces` | Create space |
| PUT | `/api/v1/spaces/:id` | Update space |
| DELETE | `/api/v1/spaces/:id` | Delete space |
| POST | `/api/v1/spaces/bulk` | Bulk create/update |

#### Query Parameters

```
GET /api/v1/spaces?page=1&limit=50&search=room&sortBy=createdAt&sortOrder=desc
```

#### Space Object

```json
{
    "id": "uuid",
    "storeId": "uuid",
    "externalId": "ROOM-001",
    "labelCode": "ESL-A1B2C3",
    "data": {
        "name": "Conference Room A",
        "floor": "3",
        "capacity": "10"
    },
    "syncStatus": "SYNCED",
    "createdAt": "2026-02-01T10:00:00Z",
    "updatedAt": "2026-02-01T12:00:00Z"
}
```

### 3.3 People Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/people` | List people |
| POST | `/api/v1/people` | Create person |
| PUT | `/api/v1/people/:id` | Update person |
| DELETE | `/api/v1/people/:id` | Delete person |
| POST | `/api/v1/people/import` | CSV import |
| POST | `/api/v1/people/:id/assign` | Assign to space |

### 3.4 Conference Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/conference` | List rooms |
| POST | `/api/v1/conference` | Create room |
| PUT | `/api/v1/conference/:id` | Update room |
| PUT | `/api/v1/conference/:id/meeting` | Toggle meeting status |

### 3.5 Sync Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/sync/status` | Get sync status |
| POST | `/api/v1/sync/trigger` | Trigger manual sync |
| GET | `/api/v1/sync/queue` | View sync queue |

---

## 4. Frontend Components

### 4.1 Store Architecture (Zustand)

#### Auth Store

```typescript
interface AuthStore {
    // State
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    verify2FA: (email: string, code: string) => Promise<void>;
    logout: () => void;
    refreshAccessToken: () => Promise<void>;
}
```

#### Settings Store

```typescript
interface SettingsStore {
    // State
    settings: SettingsData;
    passwordHash: string | null;
    isLocked: boolean;
    activeStoreId: string | null;

    // Actions
    updateSettings: (updates: Partial<SettingsData>) => void;
    setLogos: (logos: LogoConfig) => void;
    fetchSettingsFromServer: (storeId: string) => Promise<void>;
    saveSettingsToServer: () => Promise<void>;
}
```

#### Sync Store

```typescript
interface SyncStore {
    // State
    workingMode: WorkingMode;
    syncState: SyncState;
    autoSyncEnabled: boolean;
    autoSyncInterval: number;  // seconds (min: 10, default: 30)
    solumTokens: SolumTokens | null;

    // Actions
    setAutoSyncEnabled: (enabled: boolean) => void;
    setAutoSyncInterval: (interval: number) => void;
    setSolumTokens: (tokens: SolumTokens | null) => void;
}
```

### 4.2 Controller Hooks

Each feature exposes a controller hook that bridges UI and business logic:

```typescript
// Example: useSpaceController
export function useSpaceController(options?: SpaceControllerOptions) {
    const store = useSpacesStore();
    const settings = useSettingsStore();

    return {
        // Data
        spaces: store.spaces,
        selectedSpace: store.selectedSpace,
        isLoading: store.isLoading,
        error: store.error,

        // Actions
        fetchSpaces: useCallback(async () => {...}, []),
        createSpace: useCallback(async (data) => {...}, []),
        updateSpace: useCallback(async (id, data) => {...}, []),
        deleteSpace: useCallback(async (id) => {...}, []),
        selectSpace: useCallback((space) => {...}, []),
    };
}
```

### 4.3 Key Components

| Component | Path | Description |
|-----------|------|-------------|
| `MainLayout` | shared/presentation/layouts | App shell with navigation |
| `DataGrid` | shared/presentation/components | Virtual scrolling table |
| `SyncStatusBar` | sync/presentation | Real-time sync indicator |
| `SettingsDialog` | settings/presentation | Modal settings panel |
| `SpaceCard` | space/presentation | Space item display |

---

## 5. Security Implementation

### 5.1 JWT Token Structure

#### Access Token Payload

```json
{
    "sub": "user-uuid",
    "globalRole": null,
    "stores": [
        {
            "id": "store-uuid",
            "role": "STORE_ADMIN",
            "companyId": "company-uuid"
        }
    ],
    "companies": [
        {
            "id": "company-uuid",
            "role": "COMPANY_ADMIN"
        }
    ],
    "iat": 1706832000,
    "exp": 1707436800
}
```

### 5.2 Middleware Stack

```typescript
// Applied to all routes
app.use(helmet());           // Security headers
app.use(cors(corsOptions));  // CORS policy
app.use(rateLimiter);        // 100 req/min

// Applied to protected routes
router.use(authenticate);    // Verify JWT
router.use(authorize);       // Check permissions
```

### 5.3 Permission Matrix

| Resource | STORE_ADMIN | STORE_MANAGER | STORE_EMPLOYEE | STORE_VIEWER |
|----------|-------------|---------------|----------------|--------------|
| Spaces | CRUD | CRUD | RU | R |
| People | CRUD + Import | CRUD + Import | RU | R |
| Conference | CRUD | CRUD | RU | R |
| Settings | RW | R | - | - |
| Users | CRUD | - | - | - |
| Sync | Trigger | Trigger | - | View |

---

## 6. Configuration

### 6.1 Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://localhost:6379

# JWT (Persistent sessions)
JWT_ACCESS_SECRET=<32+ char secret>
JWT_REFRESH_SECRET=<32+ char secret>
JWT_ACCESS_EXPIRES_IN=7d      # 7 days for persistent auth
JWT_REFRESH_EXPIRES_IN=30d    # 30 days

# Encryption
ENCRYPTION_KEY=<32+ char key>

# CORS
CORS_ORIGINS=http://localhost:5173,https://app.example.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 6.2 Auto-Sync Configuration

| Setting | Type | Default | Min | Max | Description |
|---------|------|---------|-----|-----|-------------|
| `autoSyncEnabled` | boolean | `false` | - | - | Enable automatic sync |
| `autoSyncInterval` | number | `30` | `10` | `3600` | Interval in seconds |

---

## 7. Error Handling

### 7.1 Error Response Format

```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input data",
        "details": [
            {
                "field": "email",
                "message": "Invalid email format"
            }
        ]
    }
}
```

### 7.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 8. Testing Strategy

### 8.1 Test Types

| Type | Tool | Location | Command |
|------|------|----------|---------|
| Unit | Vitest | `**/__tests__/*.test.ts` | `npm run test` |
| Integration | Vitest | `src/test/integration/` | `npm run test` |
| E2E | Playwright | `e2e/*.spec.ts` | `npm run test:e2e` |

### 8.2 Test Coverage Targets

| Area | Target |
|------|--------|
| Business Rules | 90% |
| API Routes | 80% |
| Controllers | 75% |
| UI Components | 60% |

---

## 9. Deployment

### 9.1 Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:pass@db:5432/electisspace
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=electisspace
      - POSTGRES_PASSWORD=pass

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

### 9.2 Build Commands

```bash
# Frontend build
npm run build

# Electron build (Windows)
npm run electron:build

# Android build
npm run android:build
```

