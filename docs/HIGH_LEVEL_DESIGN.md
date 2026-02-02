# electisSpace - High-Level Design (HLD)

**Version:** 2.0.0  
**Last Updated:** February 2, 2026  
**Status:** Production

---

## 1. Executive Summary

**electisSpace** is a comprehensive Electronic Shelf Label (ESL) management application integrated with SoluM AIMS. It enables organizations to manage digital labels for offices, conference rooms, and personnel across multiple locations. The application supports Web, Windows (Electron), and Android (Capacitor) platforms from a single codebase.

### Key Capabilities
- **Space Management**: CRUD operations for rooms, desks, and offices with ESL label assignment
- **People Management**: Employee directory with space assignments and CSV import
- **Conference Room Management**: Meeting room displays with real-time status
- **Multi-Tenancy**: Company → Store → User hierarchy with role-based access
- **SoluM Integration**: Direct API integration with SoluM AIMS for ESL hardware control

---

## 2. System Architecture

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │   Web App   │    │  Electron   │    │  Android    │                      │
│  │   (Vite)    │    │  (Desktop)  │    │ (Capacitor) │                      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                      │
│         │                  │                  │                              │
│         └──────────────────┴──────────────────┘                              │
│                            │                                                 │
│              ┌─────────────┴─────────────┐                                   │
│              │      React 19 + Zustand    │                                   │
│              │     (Shared Codebase)      │                                   │
│              └─────────────┬─────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                             │ HTTPS/REST
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVER LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│              ┌─────────────────────────────┐                                 │
│              │     Express.js API Server   │                                 │
│              │    (Node.js + TypeScript)   │                                 │
│              └─────────────┬───────────────┘                                 │
│                            │                                                 │
│         ┌──────────────────┼──────────────────┐                              │
│         ▼                  ▼                  ▼                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                        │
│  │   Prisma    │   │    Redis    │   │  SoluM API  │                        │
│  │    ORM      │   │   (Cache)   │   │  (External) │                        │
│  └──────┬──────┘   └─────────────┘   └─────────────┘                        │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐                                                            │
│  │ PostgreSQL  │                                                            │
│  │  Database   │                                                            │
│  └─────────────┘                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Principles

1. **Feature-Sliced Design (FSD)**: Vertical slices organized by business domain
2. **Clean Architecture**: Separation of concerns within each feature
3. **Single Codebase Multi-Platform**: One React codebase for Web/Desktop/Mobile
4. **API-First**: RESTful backend with typed contracts
5. **Offline-First**: Local state persistence with sync queue

---

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 6.x | Build Tool & Dev Server |
| Material UI | 7.x | Component Library |
| Zustand | 5.x | State Management |
| i18next | 24.x | Internationalization (EN/HE) |
| Axios | 1.x | HTTP Client |

### 3.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22.x | Runtime |
| Express | 4.x | Web Framework |
| TypeScript | 5.x | Type Safety |
| Prisma | 6.x | ORM |
| PostgreSQL | 16.x | Database |
| Redis | 7.x | Caching & Sessions |
| Zod | 3.x | Validation |
| JWT | - | Authentication |

### 3.3 Platform Shells

| Platform | Technology | Purpose |
|----------|------------|---------|
| Desktop | Electron 33.x | Windows Application |
| Mobile | Capacitor 7.x | Android APK |
| Web | Vite | Browser SPA |

---

## 4. Multi-Tenancy Architecture

### 4.1 Hierarchy Model

```
┌───────────────────────────────────────────────────────────────────┐
│                           COMPANY                                  │
│  (Organization with SoluM AIMS credentials)                        │
│  • Owns API connection settings                                    │
│  • Can have multiple stores                                        │
└───────────────────────────────────────────────────────────────────┘
                              │ 1:N
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                            STORE                                   │
│  (Physical location/branch)                                        │
│  • Contains spaces, people, conference rooms                       │
│  • Has own settings and timezone                                   │
└───────────────────────────────────────────────────────────────────┘
                              │ 1:N
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐
│     SPACE      │  │    PERSON      │  │   CONFERENCE_ROOM      │
│ (Rooms/Desks)  │  │   (Employees)  │  │   (Meeting Rooms)      │
└────────────────┘  └────────────────┘  └────────────────────────┘
```

### 4.2 User Access Model

Users can have access to multiple companies and stores with different roles:

**Company Roles:**
- `COMPANY_ADMIN`: Full company management
- `VIEWER`: Read-only company access

**Store Roles:**
- `STORE_ADMIN`: Full store management, settings, user management
- `STORE_MANAGER`: CRUD operations, sync triggers
- `STORE_EMPLOYEE`: Limited updates to assigned items
- `STORE_VIEWER`: Read-only access

### 4.3 Data Isolation

Every database query is scoped by the user's accessible store IDs:

```typescript
// All queries include store filter
const spaces = await prisma.space.findMany({
    where: {
        storeId: { in: getUserStoreIds(req) }  // Enforced isolation
    }
});
```

---

## 5. Data Flow Architecture

### 5.1 Client-Side Data Flow

```
┌─────────────────┐
│   React UI      │  User interactions
│  (Components)   │
└────────┬────────┘
         │ dispatch actions
         ▼
┌─────────────────┐
│  Zustand Store  │  Local state management
│  (Persisted)    │  • localStorage (small data)
└────────┬────────┘  • IndexedDB (large datasets)
         │ API calls
         ▼
┌─────────────────┐
│  API Service    │  HTTP client with interceptors
│  (Axios)        │  • Auto JWT attach
└────────┬────────┘  • Token refresh on 401
         │
         ▼
   ┌──────────┐
   │ Backend  │
   └──────────┘
```

### 5.2 Server-Side Data Flow

```
┌─────────────────┐
│  HTTP Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Middleware     │  • CORS, Helmet, Rate Limiting
│  Stack          │  • JWT Authentication
└────────┬────────┘  • Role Authorization
         │
         ▼
┌─────────────────┐
│  Route Handler  │  • Input validation (Zod)
│  (Controller)   │  • Business logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Prisma ORM     │  • Query building
│  (Repository)   │  • Store-scoped queries
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │
└─────────────────┘
```

---

## 6. Synchronization Architecture

### 6.1 Sync Strategy

The application uses a **queue-based synchronization** model:

1. **Local Changes**: Data saved to PostgreSQL immediately
2. **Sync Queue**: Changes queued for external sync
3. **Background Processor**: Processes queue, pushes to SoluM AIMS
4. **Retry Logic**: Failed syncs retried with exponential backoff

### 6.2 Auto-Sync Configuration

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| `autoSyncEnabled` | Enable automatic sync | `false` | boolean |
| `autoSyncInterval` | Sync frequency (seconds) | `30` | 10-3600 |

### 6.3 Sync Queue Model

```
SyncQueueItem {
    id           UUID
    storeId      UUID     // Scoped to store
    entityType   String   // 'spaces', 'people', 'conference', 'ALL'
    action       String   // 'CREATE', 'UPDATE', 'DELETE', 'SYNC_FULL'
    payload      JSON
    status       Enum     // PENDING → PROCESSING → COMPLETED/FAILED
    attempts     Int
    maxAttempts  Int      // Default: 5
    errorMessage String?
}
```

---

## 7. Authentication & Security

### 7.1 Authentication Flow

```
┌─────────┐       ┌─────────┐       ┌─────────┐       ┌─────────┐
│  User   │──────▶│ Login   │──────▶│  2FA    │──────▶│ Tokens  │
│         │ Email │ Verify  │ Code  │ Verify  │       │ Issued  │
└─────────┘ Pass  └─────────┘       └─────────┘       └─────────┘
```

### 7.2 Token Configuration

| Token Type | Expiration | Purpose |
|------------|------------|---------|
| Access Token | 7 days | API authentication |
| Refresh Token | 30 days | Token renewal |

**Persistent Sessions**: Users remain authenticated until explicit logout. Access tokens are automatically refreshed when expired using the refresh token.

### 7.3 Security Measures

- **2FA**: Email verification code on login
- **JWT**: Signed tokens with user roles embedded
- **Rate Limiting**: 100 requests/minute per IP
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers
- **Input Validation**: Zod schemas on all endpoints
- **Password Hashing**: bcrypt with salt rounds

---

## 8. External Integrations

### 8.1 SoluM AIMS API

Primary integration for ESL hardware management:

| Operation | Endpoint | Purpose |
|-----------|----------|---------|
| Auth | POST /common/api/v2/token | OAuth token exchange |
| Articles | GET/POST /common/api/v2/articles | Label content management |
| Labels | GET /common/api/v2/labels | Hardware label info |
| Sync | POST /common/api/v2/sync | Push changes to labels |

### 8.2 Integration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ electisSpace│────▶│  Sync Queue │────▶│  SoluM AIMS │
│   Backend   │     │  Processor  │     │    API      │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  ESL Labels │
                                        │  (Hardware) │
                                        └─────────────┘
```

---

## 9. Deployment Architecture

### 9.1 Development

```bash
# Frontend
npm run dev          # Vite dev server (port 5173)

# Backend
cd server && npm run dev  # Express (port 3000)

# Desktop
npm run electron:dev      # Electron with hot reload
```

### 9.2 Production

**Docker Compose Stack:**
- **app**: Node.js Express API
- **db**: PostgreSQL 16
- **redis**: Redis 7

**Desktop Distribution:**
- Windows: NSIS installer (.exe)
- Portable: Unpacked executable

**Mobile Distribution:**
- Android: Signed APK via Capacitor

---

## 10. Feature Modules

| Module | Path | Description |
|--------|------|-------------|
| Dashboard | `/` | Overview cards and quick actions |
| Spaces | `/spaces` | Room/desk management with labels |
| People | `/people` | Employee directory and assignments |
| Conference | `/conference` | Meeting room displays |
| Labels | `/labels` | Direct ESL label management |
| Settings | Dialog | Configuration and preferences |
| Sync | Toolbar | Sync status and triggers |

---

## 11. Non-Functional Requirements

### 11.1 Performance

- **Initial Load**: < 3 seconds on 3G
- **API Response**: < 500ms for CRUD operations
- **Sync Throughput**: 1000 items/minute

### 11.2 Scalability

- Horizontal scaling via load balancer
- Database connection pooling
- Redis for session caching

### 11.3 Availability

- Target: 99.9% uptime
- Graceful degradation without external APIs
- Offline support with sync queue

---

## 12. Document References

| Document | Purpose |
|----------|---------|
| [LOW_LEVEL_DESIGN.md](LOW_LEVEL_DESIGN.md) | Detailed component specifications |
| [USER_MANUAL.md](USER_MANUAL.md) | End-user documentation |
| [API_REFERENCE.md](API_REFERENCE.md) | REST API documentation |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Complete database schema |

