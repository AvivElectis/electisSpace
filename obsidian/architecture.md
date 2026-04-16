---
tags: [#architecture, #react, #server, #ddd, #zustand, #mui, #prisma]
---

**Related:** [[electisSpace]], [[api]], [[deploy]], [[conventions]], [[domain]]

# Architecture

## Client -- Domain-Driven Design per Feature

```
src/features/<feature>/
  application/    -- Zustand stores, hooks, business logic orchestration
  domain/         -- TypeScript types, interfaces, enums, validation schemas
  infrastructure/ -- API calls (axios), adapters, external service integration
  presentation/   -- React components, pages, dialogs
  __tests__/      -- Unit tests (Vitest + Testing Library)
```

Shared code lives in `src/shared/` with the same DDD layers.

### Tech Stack (Client)

| Layer | Technology |
|-------|-----------|
| Framework | React 19, TypeScript 5.9 |
| Build | Vite (rolldown-vite 7.2) |
| UI | MUI 7 (Material UI) |
| State | Zustand 5 |
| Forms | React Hook Form + Zod |
| Routing | React Router 7 with HashRouter (`/#/` prefix) |
| i18n | i18next + react-i18next (English + Hebrew with RTL) |
| Virtualization | react-window |
| Desktop | Electron 39 with auto-update via GitHub Releases |
| Mobile | Capacitor 8 (Android) |
| Testing | Vitest (unit), Playwright (E2E), MSW (mocking) |

### Path Aliases

- `@features/*` -> `src/features/*`
- `@shared/*` -> `src/shared/*`
- `@test/*` -> `src/test/*`

### Responsive Layout

- Desktop: Tab-based navigation (Dashboard / People / Conference Rooms / Labels)
- Mobile (<600px): Hamburger menu -> MUI Drawer with list navigation
- Breakpoint detection: `Promise.race` between `[role="tablist"]` and `[aria-label="menu"]`

### Zustand State Management

- Each feature has its own store in `application/`
- Access token lives only in memory (Zustand auth store), never localStorage/sessionStorage
- Use selective subscriptions (`state => state.field`) or `useShallow` to avoid full-store re-renders
- Callbacks use `getState()` for fresh data without re-renders; exposed state uses subscriptions

### MUI Theming & RTL

- Theme configured in `src/theme.ts`
- RTL support via stylis + stylis-plugin-rtl
- Emotion for CSS-in-JS (`@emotion/react`, `@emotion/styled`)
- Use MUI 7 components exclusively -- never add custom CSS frameworks

## Server -- Feature Modules

```
server/src/features/<feature>/
  *.routes.ts     -- Express route definitions
  *.controller.ts -- Request handling, validation, response
  *.service.ts    -- Business logic
  *.types.ts      -- Zod schemas and TypeScript types
  __tests__/      -- Unit tests (Vitest)
```

### Tech Stack (Server)

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 20 |
| Framework | Express 4 |
| ORM | Prisma 7 + PostgreSQL |
| Cache | Redis 7 (Alpine) + ioredis |
| Auth | JWT (access token Bearer + refresh httpOnly cookie) |
| Validation | Zod |
| Logging | Structured JSON via `appLogger` (ring buffer at `GET /api/v1/logs`) |
| Security | Helmet.js, bcrypt, rate limiting, CORS |
| Email | Nodemailer |

### Auth Flow

1. Login -> server returns access token (body) + refresh token (httpOnly cookie)
2. Access token stored in Zustand memory (never localStorage)
3. Axios interceptor auto-refreshes on 401 using refresh cookie
4. Auto-refresh debounced to prevent concurrent refresh calls
5. Auth middleware caches user context (60s TTL, max 500 entries) to reduce DB load

### SSE (Server-Sent Events)

- Endpoint: `GET /api/v1/stores/:storeId/events`
- JWT passed as `?token=` query param (EventSource limitation)
- Nginx requires `proxy_buffering off` and 24h read timeout
- Connection limits: 500 total, 50 per store (returns 503 when exceeded)
- Heartbeat keep-alive for connection persistence

### Error Handling

- `AppError` class with factory helpers: `notFound()`, `badRequest()`, `unauthorized()`, `forbidden()`
- Global error handler middleware catches and formats all errors
- `mapServiceError` returns errors (never throws) to prevent server crashes

### Background Jobs

- Sync Queue Processor: processes pending AIMS sync items every 10 seconds
- Reconciliation Job: diffs DB state vs AIMS state every 60 seconds
- AIMS Verification Job: detects stale articles in AIMS
- Per-store company settings fetched once per batch (not per-item) to avoid N+1

## Feature Map

| Feature | Client Path | Server Path |
|---------|-------------|-------------|
| Auth (login, 2FA, roles) | `src/features/auth/` | `server/src/features/auth/` |
| Dashboard | `src/features/dashboard/` | -- |
| Spaces (offices/rooms/chairs) | `src/features/space/` | `server/src/features/spaces/` |
| People | `src/features/people/` | `server/src/features/people/` |
| Conference Rooms | `src/features/conference/` | `server/src/features/conference/` |
| Labels (ESL) | `src/features/labels/` | `server/src/features/labels/` |
| Settings | `src/features/settings/` | `server/src/features/settings/` |
| Sync (AIMS) | `src/features/sync/` | `server/src/features/sync/` |
| AIMS Management | `src/features/aims-management/` | `server/src/features/aims-management/` |
| Import/Export | `src/features/import-export/` | -- |
| Notifications | `src/features/notifications/` | -- |
| Offline Mode | `src/features/offline-mode/` | -- |
| Audit Log | `src/features/audit-log/` | `server/src/features/admin/` |
| Roles | `src/features/roles/` | `server/src/features/roles/` |
| Label Health | `src/features/label-health/` | -- |
| Quick Actions | `src/features/quick-actions/` | -- |
| Lists | `src/features/lists/` | `server/src/features/people-lists/`, `server/src/features/spaces-lists/` |

## Repository Structure

```
electisSpace/
  src/                      # Frontend (React SPA)
  server/                   # Backend (Express API)
    prisma/                 # Prisma schema + migrations
  client/                   # Client container config (Dockerfile + nginx.conf)
  electron/                 # Electron desktop wrapper
  android/                  # Capacitor Android project
  deploy/                   # Deployment configs and env files
  e2e/                      # Playwright E2E tests
  docs/                     # Documentation (wiki, app_book, archive)
  docker-compose.app.yml    # Production app containers
  docker-compose.infra.yml  # Infrastructure (Redis)
  docker-compose.dev.yml    # All-in-one dev stack
  .github/workflows/        # CI/CD
  obsidian/                 # Second brain (vault junction)
```
