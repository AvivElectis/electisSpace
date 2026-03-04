# electisCompass — High-Level Design (HLD)

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft
**Principle:** Compass is additive — electisSpace remains unchanged.

---

## 1. System Context Diagram

```
                          ┌─────────────────────┐
                          │    Employee (User)   │
                          │  Mobile / Web Browser│
                          └──────────┬──────────┘
                                     │ HTTPS
                                     ▼
┌────────────────┐          ┌──────────────────┐         ┌────────────────┐
│  Admin (User)  │──HTTPS──▶│  Nginx Proxy Mgr │◀─HTTPS──│   AIMS System  │
│ electisSpace   │          │  (NPM)           │         │   (SoluM ESL)  │
└────────────────┘          └────────┬─────────┘         └────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
          ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
          │ electisSpace │ │ electisCompass│ │   API Server     │
          │  SPA (Admin) │ │  SPA (User)  │ │   (Express)      │
          │  :3071       │ │  :3072       │ │   :3073          │
          └──────────────┘ └──────────────┘ └──────┬───────────┘
                                                    │
                              ┌─────────────────────┼─────────────────┐
                              │                     │                 │
                              ▼                     ▼                 ▼
                    ┌──────────────┐      ┌──────────────┐  ┌──────────────┐
                    │  PostgreSQL  │      │    Redis     │  │   BullMQ     │
                    │  (Prisma 7)  │      │  (Cache +    │  │  (Job Queue) │
                    │              │      │  Socket.IO)  │  │              │
                    └──────────────┘      └──────────────┘  └──────────────┘

External Systems:
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ Microsoft 365    │  │ Google Workspace │  │  LDAP / AD       │
  │ (Calendar/Users) │  │ (Calendar/Users) │  │  (Users)         │
  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 2. Application Architecture

### 2.1 Two Apps, One Server

```
┌─────────────────────────────────────────────────────────────────┐
│                        Express API Server                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     Middleware Pipeline                       │ │
│  │  CORS → Helmet → RateLimit → RequestId → Logger → Routes    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  /api/v1/*            │  │  /api/v2/*                       │ │
│  │  Existing Admin API   │  │  New Endpoints                   │ │
│  │  (UNCHANGED)          │  │                                  │ │
│  │                       │  │  /api/v2/compass/*               │ │
│  │  - spaces             │  │    compassAuth middleware        │ │
│  │  - people             │  │    - auth (login/verify/device) │ │
│  │  - conference         │  │    - bookings                   │ │
│  │  - labels             │  │    - friends                    │ │
│  │  - sync               │  │    - profile                   │ │
│  │  - settings           │  │    - requests                  │ │
│  │  - companies          │  │                                  │ │
│  │  - auth               │  │  /api/v2/admin/*                │ │
│  │                       │  │    adminAuth middleware          │ │
│  │                       │  │    - buildings                  │ │
│  │                       │  │    - floors                     │ │
│  │                       │  │    - areas                      │ │
│  │                       │  │    - employees                  │ │
│  │                       │  │    - booking-rules              │ │
│  │                       │  │    - integrations               │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Shared Services Layer                       │ │
│  │                                                               │ │
│  │  BookingService │ RuleEngine │ ProximityService               │ │
│  │  ArticleIdGenerator │ AimsSync │ NotificationService          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  SSE (existing)  │  │  Socket.IO (new) │                     │
│  │  /api/v1/stores/ │  │  namespace:       │                     │
│  │  :storeId/events │  │  /compass         │                     │
│  │  (UNCHANGED)     │  │  rooms: branch_id │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Client Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     electisCompass Client                         │
│                     (React 19 + Vite)                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                        App Shell                              │ │
│  │  HashRouter │ AuthGuard │ ThemeProvider │ I18nProvider        │ │
│  │  SocketProvider │ NotificationProvider                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐ ┌───────────┐│
│  │  auth/  │ │ booking/ │ │friends/│ │profile/ │ │ requests/ ││
│  │         │ │          │ │        │ │         │ │           ││
│  │ domain/ │ │ domain/  │ │domain/ │ │domain/  │ │ domain/   ││
│  │ app/    │ │ app/     │ │app/    │ │app/     │ │ app/      ││
│  │ infra/  │ │ infra/   │ │infra/  │ │infra/   │ │ infra/    ││
│  │ ui/     │ │ ui/      │ │ui/     │ │ui/      │ │ ui/       ││
│  └─────────┘ └──────────┘ └────────┘ └─────────┘ └───────────┘│
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      shared/                                  │ │
│  │  components/ │ hooks/ │ theme/ │ i18n/ │ api/ │ utils/       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Bottom Navigation                          │ │
│  │    🏠 Home    🔍 Find    📋 Bookings    👤 Profile           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Architecture

### 3.1 Entity Relationship Overview

```
Company (existing)
  │
  ├──1:N──▶ Branch (= Store, existing)
  │           │
  │           ├──1:N──▶ Building (NEW)
  │           │           │
  │           │           ├──1:N──▶ Floor (NEW)
  │           │           │           │
  │           │           │           ├──1:N──▶ Area (NEW)
  │           │           │           │           │
  │           │           │           │           └──1:N──▶ Space (ENHANCED)
  │           │           │           │
  │           │           │           └──1:N──▶ Space (without area)
  │           │           │
  │           │           └──1:N──▶ Space (without floor)
  │           │
  │           ├──1:N──▶ Space (existing, without hierarchy)
  │           ├──1:N──▶ Person (existing, UNCHANGED)
  │           └──1:N──▶ ConferenceRoom (existing, UNCHANGED)
  │
  ├──1:N──▶ CompanyUser (NEW — employee accounts)
  │           │
  │           ├──1:N──▶ Booking (NEW)
  │           ├──N:M──▶ Friendship (NEW)
  │           └──1:N──▶ DeviceToken (NEW)
  │
  ├──1:N──▶ BookingRule (NEW)
  ├──1:N──▶ Integration (NEW)
  └──1:N──▶ AdminRequest (NEW)

  Booking ──N:1──▶ Space
  Booking ──N:1──▶ CompanyUser
  ConferenceRoomMapping ──N:1──▶ Integration
  ConferenceRoomMapping ──1:1──▶ Space (type=CONFERENCE)
```

### 3.2 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CompanyUser vs User | Separate models | Different auth flows, different apps, different scaling |
| Space hierarchy optional | All FKs nullable | Existing spaces work without buildings/floors |
| Store kept as DB name | TypeScript alias `Branch = Store` | 2,176 occurrences too risky to rename now |
| Person model kept | Separate from CompanyUser | Person = ESL display data, CompanyUser = auth/booking |
| v1 API unchanged | New endpoints under v2 | Zero risk to existing integrations |
| Socket.IO alongside SSE | Additive, separate namespace | SSE serves admin, Socket.IO serves Compass |

---

## 4. Integration Architecture

```
┌─────────────────────────────────────────────────────┐
│                    API Server                        │
│                                                     │
│  ┌───────────────┐   ┌───────────────────────────┐ │
│  │ BookingService │──▶│ AIMS Sync Queue (BullMQ)  │─┼──▶ AIMS API
│  │               │   │ Throttle: 1/space/30s      │ │
│  └───────┬───────┘   └───────────────────────────┘ │
│          │                                          │
│          │   ┌───────────────────────────────────┐ │
│          ├──▶│ Socket.IO (/compass namespace)     │─┼──▶ Compass Clients
│          │   │ Redis Adapter for scaling          │ │
│          │   └───────────────────────────────────┘ │
│          │                                          │
│          │   ┌───────────────────────────────────┐ │
│          └──▶│ Notification Service               │─┼──▶ FCM / APNs / WebPush
│              │ Email (SMTP)                       │ │
│              └───────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Background Jobs (BullMQ)                       │ │
│  │                                               │ │
│  │  ┌──────────────┐  ┌──────────────────────┐  │ │
│  │  │ auto-release  │  │ conference-room-sync │  │ │
│  │  │ every 1 min   │  │ every 5 min          │  │ │
│  │  └──────────────┘  └──────────────────────┘  │ │
│  │  ┌──────────────┐  ┌──────────────────────┐  │ │
│  │  │ no-show-check│  │ user-directory-sync  │  │ │
│  │  │ every 5 min  │  │ configurable (daily) │  │ │
│  │  └──────────────┘  └──────────────────────┘  │ │
│  │  ┌──────────────┐                            │ │
│  │  │ reminders    │                            │ │
│  │  │ every 15 min │                            │ │
│  │  └──────────────┘                            │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Compass Client** | React 19 + Vite | SPA, mobile-first |
| **Admin Client** | React 19 + Vite (existing) | electisSpace admin, unchanged |
| **UI Framework** | MUI 7 (dark theme default) | Components, theming, RTL |
| **State** | Zustand 5 | Client state management |
| **Forms** | React Hook Form + Zod | Validation, type safety |
| **i18n** | i18next | EN + HE bilingual |
| **Real-time (Compass)** | Socket.IO client | Live space/booking updates |
| **Real-time (Admin)** | SSE (existing) | Unchanged |
| **Mobile** | Capacitor 7 | Android (Phase 1), iOS (Phase 2) |
| **API Server** | Express 4 (existing) | Shared server, extended with v2 routes |
| **ORM** | Prisma 7 | Database access, type-safe queries |
| **Database** | PostgreSQL 15 | Primary data store |
| **Cache** | Redis 7 | Rule cache, session cache, Socket.IO adapter |
| **Queue** | BullMQ | Background jobs (auto-release, sync, notifications) |
| **Auth** | JWT (RS256) | Access + refresh tokens, device tokens |
| **ESL Sync** | AIMS API (existing) | SoluM label management |
| **Deployment** | Docker Compose | Nginx containers + API + infra |

---

## 6. Network Architecture

```
Internet
    │
    ▼
┌──────────────────────────────────────────────┐
│              Nginx Proxy Manager              │
│                                              │
│  app.solumesl.co.il ──────▶ :3071 (Admin)   │
│  compass.solumesl.co.il ──▶ :3072 (Compass) │
│  api.solumesl.co.il ──────▶ :3073 (API)     │
│                                              │
│  WebSocket upgrade: /socket.io/* ──▶ :3073   │
│  SSE: /api/v1/stores/*/events ──▶ :3073      │
│    proxy_buffering off                       │
│    proxy_read_timeout 24h                    │
└──────────────────────────────────────────────┘
          │
          │  Docker: global-network
          │
    ┌─────┼─────────────────────────┐
    │     │     │     │     │       │
    ▼     ▼     ▼     ▼     ▼       ▼
  Admin Compass  API  Redis  PG   BullMQ
  :3071  :3072  :3073 :6379 :5432  Worker
```

---

## 7. Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Security Layers                           │
│                                                              │
│  Layer 1: Network                                            │
│    ├── HTTPS termination at Nginx                            │
│    ├── CORS: only compass.solumesl.co.il, app.solumesl.co.il│
│    └── Helmet.js security headers                            │
│                                                              │
│  Layer 2: Authentication                                     │
│    ├── Admin: email + password + 2FA → JWT                   │
│    ├── Compass: email + code → JWT + device token            │
│    ├── Separate middleware: adminAuth vs compassAuth          │
│    └── Token storage: access in memory, refresh in cookie    │
│                                                              │
│  Layer 3: Authorization                                      │
│    ├── Role hierarchy: PLATFORM > COMPANY > BRANCH > USER    │
│    ├── Tenant isolation: all queries scoped by companyId     │
│    └── Resource-level: own bookings, own branch spaces       │
│                                                              │
│  Layer 4: Rate Limiting                                      │
│    ├── Redis-backed sliding window                           │
│    ├── Per-endpoint limits (auth: strict, queries: relaxed)  │
│    └── 429 response with Retry-After header                  │
│                                                              │
│  Layer 5: Data Protection                                    │
│    ├── Encrypted at rest: integration credentials (AES-256)  │
│    ├── Hashed: passwords (bcrypt), verification codes        │
│    ├── No PII in logs (redact email, phone)                  │
│    └── Soft-delete: preserve data integrity                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Deployment Architecture

### 8.1 Docker Compose Topology

```yaml
# docker-compose.app.yml (extended)
services:
  client:          # electisSpace SPA (Nginx)    — EXISTING, UNCHANGED
  compass:         # electisCompass SPA (Nginx)  — NEW
  server:          # API Server (Node.js)        — EXTENDED with v2 routes

# docker-compose.infra.yml (existing, unchanged)
services:
  postgres:        # PostgreSQL 15
  redis:           # Redis 7
```

### 8.2 CI/CD Pipeline

```
Push to feature branch
    │
    ▼
GitHub Actions: Build & Test
    ├── npm run test:unit (client)
    ├── cd server && npx vitest run (server)
    ├── npm run build (client)
    ├── cd compass && npm run build (compass)
    └── cd server && npx tsc --noEmit
    │
    ▼
PR Review & Merge to main
    │
    ▼
GitHub Actions: Deploy
    ├── Build Docker images (client, compass, server)
    ├── Push to registry
    └── Deploy to production (docker compose pull + up)
```
