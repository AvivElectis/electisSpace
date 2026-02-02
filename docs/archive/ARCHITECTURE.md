# System Architecture

## 1. Overview

**electisSpace** is a comprehensive ESL (Electronic Shelf Label) management platform integrated with SoluM AIMS. It supports **Web**, **Windows (Electron)**, and **Android (Capacitor)** from a single codebase.

```mermaid
C4Context
    title System Context Diagram
    
    Person(admin, "Admin/User", "Manages spaces, people, and ESLs")
    System(electisSpace, "electisSpace", "Multi-platform ESL Management")
    System_Ext(solumAims, "SoluM AIMS", "External ESL Management Server")
    SystemDb_Ext(postgres, "PostgreSQL", "Central Database")
    
    Rel(admin, electisSpace, "Uses", "HTTPS/Electron/Capacitor")
    Rel(electisSpace, solumAims, "Syncs ESL data", "HTTPS/REST")
    Rel(electisSpace, postgres, "Persists data", "Prisma ORM")
```

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Material UI v7, Zustand |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM |
| **Database** | PostgreSQL (Multi-Company/Multi-Store) |
| **Desktop** | Electron |
| **Mobile** | Capacitor (Android) |
| **Testing** | Vitest (Unit), Playwright (E2E) |
| **i18n** | i18next (EN/HE with RTL support) |

---

## 3. Architecture Pattern

The project follows **Feature-Sliced Design** combined with **Clean Architecture** principles.

### 3.1 Frontend Structure (`src/`)

```
src/
├── features/           # Feature slices (vertical)
│   ├── auth/           # Authentication
│   ├── dashboard/      # Main dashboard
│   ├── space/          # Space management
│   ├── conference/     # Conference rooms
│   ├── people/         # People manager
│   ├── labels/         # Label assignment
│   ├── sync/           # Synchronization
│   ├── settings/       # App settings
│   └── update/         # Auto-update
├── shared/             # Shared utilities
│   ├── application/    # Shared hooks
│   ├── domain/         # Shared types
│   ├── infrastructure/ # Services, stores
│   └── presentation/   # Shared components
├── locales/            # i18n (en/, he/)
└── theme.ts            # MUI theme config
```

### 3.2 Feature Layer Structure

Each feature follows Clean Architecture:

```
features/<feature>/
├── application/        # Business logic, hooks, controllers
├── domain/             # Types, interfaces, rules
├── infrastructure/     # API calls, Zustand stores
├── presentation/       # React components
└── __tests__/          # Unit tests
```

**Example**: `useSpaceController` (application) orchestrates `spacesStore` (infrastructure) and renders via `SpacesPage` (presentation).

---

## 4. Backend Architecture (`server/`)

### 4.1 Server Structure

```
server/
├── prisma/             # Database schema & migrations
│   └── schema.prisma   # Multi-Company/Multi-Store model
├── src/
│   ├── features/       # Feature modules
│   │   ├── auth/       # JWT authentication, 2FA
│   │   ├── users/      # User management
│   │   ├── spaces/     # Space CRUD
│   │   ├── conference/ # Conference rooms
│   │   ├── people/     # People management
│   │   ├── sync/       # SoluM sync orchestration
│   │   ├── settings/   # Company/Store settings
│   │   └── health/     # Health probes
│   └── shared/         # Shared services
└── docker-compose.yml  # Dev/Prod containers
```

### 4.2 Database Schema (Prisma)

**Multi-Tenant Architecture**: `Company` → `Store` → `User`

```mermaid
erDiagram
    Company ||--o{ Store : has
    Company ||--o{ UserCompany : members
    Store ||--o{ UserStore : access
    Store ||--o{ Space : contains
    Store ||--o{ Person : contains
    Store ||--o{ ConferenceRoom : contains
    Store ||--o{ PeopleList : contains
    User ||--o{ UserCompany : belongs
    User ||--o{ UserStore : assigned
    Person }o--o{ PeopleList : membership
```

**Key Models**:
| Model | Description |
|-------|-------------|
| `Company` | Organization with AIMS credentials (encrypted) |
| `Store` | Physical store with timezone, settings |
| `User` | Platform user with roles |
| `UserStore` | Store access with feature permissions |
| `Space` | Room/Desk/Chair with label assignment |
| `ConferenceRoom` | Meeting room with status |
| `Person` | People with virtual pool ID assignment |
| `SyncQueueItem` | Async sync job queue |
| `AuditLog` | Activity tracking |

**Roles & Permissions**:
- `PLATFORM_ADMIN` - Global admin
- `COMPANY_ADMIN` / `VIEWER` - Company-level
- `STORE_ADMIN` / `STORE_MANAGER` / `STORE_EMPLOYEE` / `STORE_VIEWER` - Store-level

---

## 5. State Management

**Zustand** stores are located in `infrastructure/*Store.ts`:

| Store | Purpose |
|-------|---------|
| `authStore` | User session, tokens |
| `settingsStore` | App configuration |
| `spacesStore` | Spaces data |
| `conferenceStore` | Conference rooms |
| `peopleStore` | People & lists |
| `syncStore` | Sync state |
| `labelsStore` | Label management |
| `notificationStore` | Toast messages |

---

## 6. Key Workflows

### 6.1 Authentication Flow
1. User submits email/password → `/api/auth/login`
2. Server validates → Issues JWT + Refresh Token
3. (Optional) 2FA verification code via email
4. Client stores tokens in `authStore`

### 6.2 SoluM Sync Flow
1. User triggers sync (manual or auto)
2. Server authenticates with SoluM AIMS
3. Fetches articles (ESL data)
4. Maps to local Space/ConferenceRoom models
5. Updates database & sync queue
6. Returns status to client

### 6.3 Label Assignment Flow
1. User selects space/person from dashboard
2. Navigates to `/labels` page
3. Scans or selects label code
4. System updates local store + queues SoluM sync

---

## 7. Platform Support

| Platform | Entry Point | Build Command |
|----------|-------------|---------------|
| **Web** | `npm run dev` | `npm run build` |
| **Electron** | `npm run electron:dev` | `npm run electron:build` |
| **Android** | `npm run cap:sync` | `npm run android:build` |

---

## 8. API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/verify` - 2FA verification
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - List users (admin)
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Spaces
- `GET /api/spaces` - List spaces
- `POST /api/spaces` - Create space
- `PUT /api/spaces/:id` - Update space
- `DELETE /api/spaces/:id` - Delete space

### Conference
- `GET /api/conference` - List rooms
- `POST /api/conference` - Create room
- `PUT /api/conference/:id` - Update room
- `PUT /api/conference/:id/meeting` - Update meeting status

### Sync
- `POST /api/sync/trigger` - Manual sync
- `GET /api/sync/status` - Sync status

### Health
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

---

## 9. Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/electisspace

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# SoluM (per-company, stored encrypted)
SOLUM_BASE_URL=https://eu.common.solumesl.com
```

---

## 10. Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 11. Deployment

### Docker
```bash
# Development
cd server && npm run dev:docker

# Production
docker-compose up -d
```

### Electron Release
```bash
npm run electron:build
# Outputs: dist-electron/electisSpace Setup x.x.x.exe
```
