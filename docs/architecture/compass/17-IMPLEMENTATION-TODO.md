# electisCompass — Implementation Todo List (Bottom → Top)

**Version:** 1.0
**Date:** 2026-03-04
**Authors:** Aviv Ben Waiss + Claude Opus 4.6
**Purpose:** Complete task list for AI agents implementing Compass. Ordered from infrastructure (bottom) to advanced features (top).

---

## How to Use This List

- Tasks are grouped into **Phases** (bottom → top)
- Each task has a unique ID for cross-referencing
- Dependencies are listed — do NOT start a task before its dependencies are complete
- Each task includes the **reference document** where the specification lives
- Agents should claim tasks by phase, not cherry-pick across phases

---

## Phase 0: Monorepo & Infrastructure Setup
> Ref: [15-MONOREPO-STRUCTURE](15-MONOREPO-STRUCTURE.md), [11-INFRASTRUCTURE](11-INFRASTRUCTURE-REQUIREMENTS.md)
>
> **Current CI/CD baseline** (must be preserved and extended):
> - `deploy-ubuntu.yml`: SSH → `git pull` → `docker compose build` → `prisma migrate deploy` → `up -d server client` → health check `:3071`
> - `release.yml`: On tag push → build Electron (Windows) + Capacitor Android (from `./android`) → GitHub Release
> - `publish-wiki.yml`: On push to `docs/wiki/**` → publish to GitHub wiki
> - Docker: `docker-compose.infra.yml` (Redis only) + `docker-compose.app.yml` (client:3071, server) on external `global-network` with external `global-postgres`
> - Dev: `docker-compose.dev.yml` (self-contained Postgres:5433 + Redis:6380 + migrate + server:3001)
> - Client Dockerfile (`client/Dockerfile`): copies `src/`, `public/`, `index.html`, `tsconfig*.json`, `vite.config.ts` — no `shared/` awareness
> - Server Dockerfile (`server/Dockerfile`): copies `server/` only — no `shared/` awareness
> - Production secrets: `deploy/server.env` (not `server/.env`)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P0-01 | Create `shared/` directory with cross-app types | — | `shared/types/`, `shared/constants/`, `shared/utils/`. Export barrel files. |
| P0-02 | Add `@electis/shared` path alias to admin tsconfig | P0-01 | Update `tsconfig.json` and `vite.config.ts` path aliases |
| P0-03 | Create `compass/` directory scaffold | P0-01 | `compass/src/`, `compass/index.html`, `compass/vite.config.ts`, `compass/tsconfig.json` |
| P0-04 | Configure Compass Vite config | P0-03 | Port 3002, path aliases (`@features`, `@shared`, `@electis/shared`), build output to `compass/dist` |
| P0-05 | Configure Compass TypeScript config | P0-03 | Extends root tsconfig, references `shared/` |
| P0-06 | Add `compass:dev` and `compass:build` npm scripts | P0-04 | Root `package.json` scripts |
| P0-07 | Create `compass/Dockerfile` | P0-04 | Mirror `client/Dockerfile` pattern: multi-stage (node:20-alpine build → nginx:alpine serve on :3000). Must `COPY shared/ ./shared/` in build stage since compass imports from `@electis/shared`. Copy `compass/nginx.conf` for SPA fallback. |
| P0-08 | Update `client/Dockerfile` for shared/ | P0-02 | Add `COPY shared/ ./shared/` to build stage so admin app can import from `@electis/shared` |
| P0-09 | Update `server/Dockerfile` for shared/ | P0-01 | Add `COPY shared/ ./shared/` to build stage so server can import shared types. Update both `server-builder` and `production` stages. |
| P0-10 | Update `docker-compose.app.yml` | P0-07 | Add `compass` service: build from `compass/Dockerfile`, container `electiscompass-server`, port `127.0.0.1:3072:3000`, depends_on `server`, healthcheck, restart policy, `global-network`. Update deploy script `up -d` to include `compass`. |
| P0-11 | Update `docker-compose.dev.yml` | P0-07 | Add `compass` dev service on port `3002:3000` or run compass via `npm run compass:dev` locally (depends on preference). |
| P0-12 | Update `deploy-ubuntu.yml` | P0-10 | Change `up -d --remove-orphans server client` → `up -d --remove-orphans server client compass`. Add compass health check: `curl -f http://localhost:3072/health`. |
| P0-13 | Update `release.yml` for Compass Android | P0-06 | Add `build-compass-android` job: `npm run compass:build` → `npx cap sync android` from `compass/android/`. Upload APK as separate artifact. Include in GitHub Release. |
| P0-14 | Configure NPM proxy for compass.solumesl.co.il | P0-10 | NPM entry: `compass.solumesl.co.il` → `electiscompass-server:3000`. Add WebSocket upgrade for `/socket.io/`, API proxy for `/api/` with `proxy_buffering off`. |
| P0-15 | Move shared Compass types to `shared/` | P0-02 | `BookingStatus`, `SpaceMode`, `CompassFeatureConfig`, `FriendshipStatus` enums and interfaces |

---

## Phase 1: Database Schema & Migrations
> Ref: [05-LOW-LEVEL-DESIGN](05-LOW-LEVEL-DESIGN.md), [09-RISKS](09-ARCHITECTURAL-RISKS-AND-COLLISIONS.md)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P1-01 | Add Compass columns to `Company` model | P0-01 | `compassEnabled Boolean`, `compassConfig Json` (booking rules, check-in window, etc.) |
| P1-02 | Add Compass columns to `Space` model | P1-01 | `compassMode` (AVAILABLE/EXCLUDED/MAINTENANCE/PERMANENT), `compassCapacity`, `compassAmenities`, `permanentAssigneeId` — all nullable for backwards compatibility |
| P1-03 | Create `Booking` model + migration | P1-02 | Full booking schema: id, spaceId, userId, branchId, startTime, endTime, status (enum), checkedInAt, releasedAt, autoReleased, bookedBy, notes, timestamps |
| P1-04 | Add `EXCLUDE USING gist` constraint on bookings | P1-03 | `btree_gist` extension, tsrange exclusion constraint to prevent double-booking at DB level |
| P1-05 | Create `BookingRule` model + migration | P1-03 | level (PLATFORM/COMPANY/BRANCH/SPACE), ruleType, value (JSON), priority, spaceId (nullable) |
| P1-06 | Create `CompanyUser` model + migration | P1-01 | employeeId, companyId, branchId, email, name, role (EMPLOYEE/MANAGER), status, preferences (JSON), externalId (for directory sync) |
| P1-07 | Create `Friendship` model + migration | P1-06 | requesterId, addresseeId, status (PENDING/ACCEPTED/BLOCKED), companyId |
| P1-08 | Create `DeviceToken` model + migration | P1-06 | userId, tokenHash, deviceName, platform, lastUsed, revoked |
| P1-09 | Create `VerificationCode` model + migration | P1-06 | email, codeHash, expiresAt, attempts, consumed |
| P1-10 | Create `compass_spaces` database view | P1-02 | View filtering spaces with compassMode IS NOT NULL for clean Compass queries |
| P1-11 | Add partial index on `compassMode` | P1-02 | `CREATE INDEX idx_spaces_compass ON spaces (compassMode) WHERE compassMode IS NOT NULL` |
| P1-12 | Run `npx prisma generate` and verify | P1-01 to P1-11 | Regenerate Prisma client, verify no migration conflicts |

---

## Phase 2: Server Core — Auth & Feature Gating
> Ref: [05-LLD](05-LOW-LEVEL-DESIGN.md), [02-FR](02-FUNCTIONAL-REQUIREMENTS.md), [14-BIOMETRIC](14-MOBILE-BIOMETRIC-AUTH.md)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P2-01 | Create `COMPASS_JWT_SECRET` env variable | P1-12 | Separate from admin JWT secret. Add to `server/.env.example`, `server/.env.development`, and production `deploy/server.env`. |
| P2-02 | Implement `CompassAuth` module — routes | P2-01 | `POST /api/v2/compass/auth/login` (send code), `POST /api/v2/compass/auth/verify` (verify code + issue tokens) |
| P2-03 | Implement verification code service | P2-02 | Generate 6-digit code, bcrypt hash, store with TTL, email sending |
| P2-04 | Implement Compass JWT service | P2-01 | Sign/verify with `COMPASS_JWT_SECRET`, payload: `companyUserId`, `companyId`, `branchId`, `role`, `tokenType: 'COMPASS'` |
| P2-05 | Implement `compassAuthenticate` middleware | P2-04 | Verify Compass JWT, reject admin JWTs (check `tokenType`), attach user to `req.compassUser` |
| P2-06 | Implement device token endpoints | P2-03 | `POST /device-register` (create device token after login), `POST /device-login` (auto-login with device token), `GET /devices` (list), `DELETE /devices/:id` (revoke) |
| P2-07 | Implement rate limiting for Compass auth | P2-02 | Redis-backed, 5 attempts/min per email, 429 with retry-after |
| P2-08 | Implement `compassEnabled` feature gate middleware | P1-01 | Middleware checks `company.compassEnabled` — returns 403 if not enabled |
| P2-09 | Implement `TenantScopedRepository` base class | P1-12 | Abstract base enforcing `companyId` scoping on all queries to prevent cross-tenant data access |
| P2-10 | Implement Compass refresh token endpoint | P2-04 | `POST /api/v2/compass/auth/refresh` — separate from admin refresh |

---

## Phase 3: Server Core — Bookings & Rules
> Ref: [05-LLD](05-LOW-LEVEL-DESIGN.md), [06-FLOWCHARTS](06-FLOWCHARTS.md), [07-STATE-DIAGRAMS](07-STATE-DIAGRAMS.md)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P3-01 | Implement `BookingRepository` | P1-03, P2-09 | Extends `TenantScopedRepository`. All Prisma queries for bookings. `SELECT FOR UPDATE` for concurrency. |
| P3-02 | Implement `BookingRuleRepository` | P1-05, P2-09 | CRUD for booking rules, cascading resolution (Platform → Company → Branch → Space) |
| P3-03 | Implement `RuleEngine` service | P3-02 | Resolve effective rules for a space. Redis caching with `rules:company:{id}` key. Cache invalidation on rule change. |
| P3-04 | Implement `BookingService.createBooking()` | P3-01, P3-03 | Validate rules (max bookings, time range, advance limit), check availability, create booking within transaction |
| P3-05 | Implement `BookingService.checkIn()` | P3-01 | Validate booking is BOOKED, within check-in window, update status to CHECKED_IN |
| P3-06 | Implement `BookingService.release()` | P3-01 | Manual release — update status to RELEASED, set releasedAt |
| P3-07 | Implement `BookingService.cancel()` | P3-01 | Cancel a future booking — update status to CANCELLED |
| P3-08 | Implement `BookingService.extend()` | P3-01, P3-03 | Extend end time — validate no conflicts, rule compliance |
| P3-09 | Implement booking routes + controller | P3-04 to P3-08 | `POST /api/v2/compass/bookings`, `PATCH /:id/check-in`, `PATCH /:id/release`, `PATCH /:id/extend`, `DELETE /:id` |
| P3-10 | Implement auto-release BullMQ job | P3-01 | Cron job every 1 minute: find BOOKED bookings past end time → set AUTO_RELEASED |
| P3-11 | Implement no-show detection BullMQ job | P3-01 | Find BOOKED bookings past check-in window → set NO_SHOW, release space |
| P3-12 | Implement booking rules admin CRUD | P3-02 | `GET/POST/PUT/DELETE /api/v2/admin/compass/rules` — admin endpoints for managing booking rules |

---

## Phase 4: Server Core — Spaces, Friends & Proximity
> Ref: [05-LLD](05-LOW-LEVEL-DESIGN.md), [02-FR](02-FUNCTIONAL-REQUIREMENTS.md)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P4-01 | Implement Compass space endpoints | P2-05, P1-10 | `GET /api/v2/compass/spaces` — filtered by compass_spaces view, real-time availability |
| P4-02 | Implement space filtering & sorting | P4-01 | Filter by: building, floor, area, type, amenities. Sort by: number, proximity to friends |
| P4-03 | Implement `CompanyUserRepository` | P1-06, P2-09 | CRUD for company employees, tenant-scoped |
| P4-04 | Implement `FriendshipRepository` | P1-07, P2-09 | Send request, accept, block, list friends, mutual friends |
| P4-05 | Implement `FriendshipService` | P4-04 | Business logic for friend requests, validation (same company), status transitions |
| P4-06 | Implement friendship routes + controller | P4-05 | `GET /friends`, `POST /friends/request`, `PATCH /friends/:id/accept`, `DELETE /friends/:id` |
| P4-07 | Implement `ProximityService` | P4-04, P3-01 | Calculate distance between spaces: same floor (sortOrder diff) < same building < different building |
| P4-08 | Implement "Near Friends" query | P4-07 | `GET /api/v2/compass/spaces?sort=nearFriends` — sort available spaces by proximity to checked-in friends |
| P4-09 | Implement admin employee management endpoints | P4-03 | `GET/POST/PUT/DELETE /api/v2/admin/compass/employees` — admin CRUD for company users |
| P4-10 | Implement admin space management for Compass | P4-01 | `PUT /api/v2/admin/compass/spaces/:id/mode` — set compassMode (AVAILABLE/EXCLUDED/MAINTENANCE/PERMANENT) |

---

## Phase 5: Server — Real-Time & Notifications
> Ref: [05-LLD](05-LOW-LEVEL-DESIGN.md), [04-HLD](04-HIGH-LEVEL-DESIGN.md)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P5-01 | Create Socket.IO `/compass` namespace | P2-05 | Authenticate with Compass JWT, join company room and branch room |
| P5-02 | Implement Redis adapter for Socket.IO | P5-01 | `@socket.io/redis-adapter` for horizontal scaling support |
| P5-03 | Emit booking events on `/compass` | P3-04, P5-01 | `space:booked`, `space:released`, `space:checkedIn` events with space + booking data |
| P5-04 | Emit friend events on `/compass` | P4-05, P5-01 | `friend:checkedIn`, `friend:left`, `friend:request` events |
| P5-05 | Implement push notification service | P1-08 | BullMQ job for sending push notifications (booking reminders, friend check-ins) |
| P5-06 | Integrate AIMS sync for Compass bookings | P3-04 | On booking status change → queue AIMS label sync job (update ESL with booking info) |

---

## Phase 6: Admin Dashboard Integration (electisSpace)
> Ref: [10-ADMIN-DASHBOARD](10-ADMIN-DASHBOARD-INTEGRATION.md)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P6-01 | Implement `compassEnabled` feature gate in admin UI | P2-08 | Check `company.compassEnabled` — hide/show Compass UI elements |
| P6-02 | Lock Spaces/People/Conference tabs when Compass enabled | P6-01 | When `compassEnabled=true`, disable navigation to locked features, show "Managed by Compass" message |
| P6-03 | Implement Compass Dashboard Card component | P6-01 | `DashboardCompassCard.tsx` — today's stats, employees, occupancy, check-in rate, space status, rules summary |
| P6-04 | Implement dashboard summary API | P3-01, P4-03 | `GET /api/v2/compass/dashboard/summary` — aggregate bookings, check-ins, occupancy per floor |
| P6-05 | Add Compass speed dial actions | P6-01 | "Add Booking", "Manage Spaces", "View Rules" actions in dashboard speed dial (when Compass enabled) |
| P6-06 | Create Compass Bookings admin page | P3-12 | `src/features/compass/presentation/CompassBookingsPage.tsx` — list, filter, cancel bookings |
| P6-07 | Create Compass Spaces admin page | P4-10 | Admin page for managing space modes, viewing occupancy |
| P6-08 | Create Compass Employees admin page | P4-09 | Admin page for viewing/managing company users, their bookings, sessions |
| P6-09 | Create Compass Rules admin page | P3-12 | Admin page for creating/editing booking rules with cascading preview |
| P6-10 | Update admin navigation | P6-06 to P6-09 | Add Compass tab/section when `compassEnabled`, replace locked tabs |

---

## Phase 7: Company Wizard — Compass Expansion
> Ref: [06-FLOWCHARTS](06-FLOWCHARTS.md), [10-ADMIN-DASHBOARD](10-ADMIN-DASHBOARD-INTEGRATION.md)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P7-01 | Add `compassEnabled` toggle to wizard step 1 | P6-01 | Checkbox in company creation wizard — "Enable Compass workspace booking" |
| P7-02 | Implement wizard expansion logic | P7-01 | When `compassEnabled` toggled ON → expand wizard from ~4 steps to ~10 steps |
| P7-03 | Create wizard step: Building hierarchy | P7-02 | Building → Floor → Area setup with drag-and-drop ordering |
| P7-04 | Create wizard step: Space configuration | P7-02 | Import/assign spaces to buildings, set compass modes, capacity, amenities |
| P7-05 | Create wizard step: Employee import | P7-02 | Upload CSV or connect directory sync (Microsoft/Google) — preview mapping |
| P7-06 | Create wizard step: Booking rules | P7-02 | Set default booking rules for the company (max duration, advance booking, check-in window) |
| P7-07 | Create wizard step: Notification preferences | P7-02 | Configure email templates, push notification settings |
| P7-08 | Create wizard step: ESL configuration | P7-02 | Map label templates for booking status display on e-ink labels |
| P7-09 | Create wizard step: Review & launch | P7-03 to P7-08 | Summary of all Compass settings, "Launch Compass" button |
| P7-10 | Handle mutual exclusivity on wizard save | P7-01 | When saving company with `compassEnabled=true`, ensure `spacesEnabled=false`, `peopleEnabled=false`, `conferenceEnabled=false` |

---

## Phase 8: Compass Employee App — Core
> Ref: [12-APP-SCREEN-DIAGRAMS](12-APP-SCREEN-DIAGRAMS.md), [15-MONOREPO](15-MONOREPO-STRUCTURE.md)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P8-01 | Create Compass app shell | P0-03 | React 19 + MUI 7 + Zustand 5, HashRouter, i18n (en + he), RTL support |
| P8-02 | Implement Compass auth store | P2-04 | `useCompassAuthStore` — login flow, token management, auto-refresh |
| P8-03 | Implement email+code login screen | P8-02 | Email input → code input → verification, error handling |
| P8-04 | Implement bottom tab navigation | P8-01 | 4 tabs: Home, Find, Bookings, Profile |
| P8-05 | Implement Home tab | P8-04 | Current booking card (or "No active booking"), quick actions, friend activity feed |
| P8-06 | Implement Find Space tab | P8-04, P4-01 | Space list with filters (building, floor, type), search, real-time availability |
| P8-07 | Implement booking confirm bottom sheet | P8-06 | Space details, time picker, notes, "Book" button |
| P8-08 | Implement Bookings tab | P8-04, P3-09 | Upcoming bookings list, past bookings, cancel/extend actions |
| P8-09 | Implement check-in flow | P8-05 | "Check In" button on Home tab when booking is active, confirmation |
| P8-10 | Implement release flow | P8-05 | "Release" button when checked in, confirmation dialog |
| P8-11 | Implement Profile tab | P8-04 | User info, preferences, notification settings, device management, logout |
| P8-12 | Implement Socket.IO client | P5-01 | Connect to `/compass` namespace, handle real-time updates for spaces and friends |
| P8-13 | Implement friends list UI | P8-11, P4-06 | View friends, send requests, accept/decline, see checked-in friends' locations |
| P8-14 | Implement "Near Friends" sort in Find tab | P8-06, P4-08 | Sort spaces by proximity to checked-in friends |
| P8-15 | Implement push notification handling | P5-05 | Register device for push, handle incoming notifications, deep links |

---

## Phase 9: Compass App — Mobile (Capacitor)
> Ref: [14-MOBILE-BIOMETRIC-AUTH](14-MOBILE-BIOMETRIC-AUTH.md), [12-APP-SCREEN-DIAGRAMS](12-APP-SCREEN-DIAGRAMS.md)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P9-01 | Initialize Capacitor in compass app | P8-01 | `npx cap init` inside `compass/`, add Android platform (`compass/android/`), configure `compass/capacitor.config.ts`. Note: admin app already has `./android/` — compass must use a separate `compass/android/` directory with its own `applicationId`. |
| P9-02 | Add biometric auth plugin | P9-01 | `@capacitor-community/biometric-auth` — check availability, prompt fingerprint/Face ID |
| P9-03 | Implement secure token storage | P9-01 | `@capacitor/preferences` with EncryptedSharedPreferences (Android) |
| P9-04 | Implement biometric login flow | P9-02, P9-03, P2-06 | App launch → check stored device token → biometric prompt → auto-login or fallback to email+code |
| P9-05 | Implement biometric enrollment after login | P9-02 | After successful email+code login, offer to enable biometric. Store device token securely. |
| P9-06 | Implement offline mode | P9-01 | Cache last booking state, show "Offline" indicator, queue actions for sync on reconnect |
| P9-07 | Configure Android build | P9-01 | `compass/android/`, gradle config, signing, deep links |
| P9-08 | Add Capacitor push notifications | P9-01, P5-05 | `@capacitor/push-notifications` — register, handle incoming, badge count |

---

## Phase 10: Directory & Calendar Sync
> Ref: [13-DIRECTORY-AND-CALENDAR-SYNC](13-DIRECTORY-AND-CALENDAR-SYNC.md)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P10-01 | Create `IntegrationConfig` model + migration | P1-12 | Provider (MICROSOFT/GOOGLE), encrypted credentials (AES-256), sync settings, last sync timestamp |
| P10-02 | Implement `DirectorySyncService` (adapter pattern) | P10-01 | Provider-agnostic service: create/update/deactivate users based on adapter results |
| P10-03 | Implement `MicrosoftUserSyncAdapter` | P10-02 | MSAL client credentials, Graph API `/users/delta` with delta queries |
| P10-04 | Implement `GoogleUserSyncAdapter` | P10-02 | Service account with Domain-Wide Delegation, Admin SDK Directory API with syncToken |
| P10-04B | Implement `OktaUserSyncAdapter` | P10-02 | Okta Users API (`/api/v1/users`) with API Token or OAuth 2.0 client credentials. Incremental sync via `lastUpdated` filter. Link header pagination. Rate limit: 600 req/min, respect `X-Rate-Limit-Remaining` header. Users only — no room/resource sync. |
| P10-05 | Implement `MicrosoftRoomSyncAdapter` | P10-03 | Graph API Places (`/places/microsoft.graph.room`), `getSchedule` for availability (batch 20/call) |
| P10-06 | Implement `GoogleRoomSyncAdapter` | P10-04 | Resources API, FreeBusy API for availability (batch 50/call) |
| P10-07 | Implement sync BullMQ jobs | P10-02 | Scheduled user sync (configurable interval), on-demand sync trigger |
| P10-08 | Implement admin integration setup UI | P10-01 | Provider selection (Microsoft 365 / Google Workspace / Okta / LDAP) → credential form → test connection → field mapping → sync schedule. Okta form: domain + API token or OAuth 2.0 client credentials. |
| P10-09 | Implement integration API endpoints | P10-02 | `POST /integrations`, `GET /integrations/:id/status`, `POST /integrations/:id/sync`, `PUT /integrations/:id`, `DELETE /integrations/:id` |
| P10-10 | Implement conference room availability check | P10-05, P10-06 | Phase 1: read-only availability display in Compass app |
| P10-11 | Implement credential encryption service | P10-01 | AES-256 encryption for stored OAuth tokens and service account keys |

---

## Phase 11: SSO (SAML + OIDC)
> Ref: [16-ADVANCED-CAPABILITIES](16-ADVANCED-CAPABILITIES.md) §3

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P11-01 | Create `SsoConfig` model + migration | P1-12 | companyId, provider (SAML/OIDC), entityId/clientId, certificate/secret, metadata URL, claim mapping, emailDomain. Supports IdPs: Okta, Azure AD, Google, OneLogin, Auth0, Ping Identity, etc. |
| P11-02 | Install SSO dependencies | — | `@node-saml/passport-saml`, `openid-client` |
| P11-03 | Implement SAML auth flow | P11-01, P11-02 | SP metadata generation, IdP redirect, assertion callback, claim → CompanyUser mapping |
| P11-04 | Implement OIDC auth flow | P11-01, P11-02 | Discovery document, authorization code flow, token exchange, userinfo → CompanyUser mapping |
| P11-05 | Implement SSO email domain lookup | P11-01 | On Compass login, check email domain → redirect to SSO if configured |
| P11-06 | Implement admin SSO configuration UI | P11-01 | SAML/OIDC setup form with SP metadata display, test connection |
| P11-07 | Implement SSO API endpoints | P11-03, P11-04 | `POST /sso/config`, `GET /sso/config/:id`, `GET /sso/saml/metadata`, `POST /sso/saml/callback`, `GET /sso/oidc/callback` |
| P11-08 | Update Compass login screen for SSO | P11-05, P8-03 | Show "Sign in with SSO" button when email domain has SSO config |

---

## Phase 12: Advanced Analytics
> Ref: [16-ADVANCED-CAPABILITIES](16-ADVANCED-CAPABILITIES.md) §1

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P12-01 | Create analytics materialized views | P3-01 | `booking_analytics_daily`, `occupancy_analytics_hourly`, `employee_analytics_monthly` PostgreSQL materialized views |
| P12-02 | Create analytics refresh BullMQ job | P12-01 | Scheduled refresh of materialized views (hourly for occupancy, daily for booking/employee) |
| P12-03 | Implement analytics API endpoints | P12-01 | `GET /analytics/overview`, `/occupancy`, `/spaces`, `/employees`, `/heatmap`, `/export` |
| P12-04 | Install charting dependencies | — | `recharts` for charts, `exceljs` for Excel export |
| P12-05 | Create Analytics Dashboard admin page | P12-03, P12-04 | KPI cards, occupancy heatmap, space utilization bar chart, employee engagement, floor comparison, booking patterns |
| P12-06 | Implement Excel/CSV export | P12-03, P12-04 | Export analytics data with date range filter, company branding |
| P12-07 | Implement analytics Redis caching | P12-03 | Cache dashboard aggregations in Redis (5-min TTL for overview, 1-hour for heatmap) |

---

## Phase 13: Service Tickets
> Ref: [16-ADVANCED-CAPABILITIES](16-ADVANCED-CAPABILITIES.md) §2

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P13-01 | Create `Ticket`, `TicketComment`, `TicketAttachment` models + migration | P1-12 | Status lifecycle: OPEN → IN_PROGRESS → WAITING → RESOLVED → CLOSED |
| P13-02 | Implement ticket service | P13-01 | CRUD, status transitions, assignment, priority, SLA tracking |
| P13-03 | Implement admin ticket API endpoints | P13-02 | 8 endpoints: list, get, create, update, assign, comment, attach, close |
| P13-04 | Implement employee ticket API endpoints | P13-02 | 6 endpoints: list own, create (facility request), comment, view status |
| P13-05 | Create admin Tickets page | P13-03 | Ticket list with filters (status, priority, assignee), detail view, comment thread |
| P13-06 | Create employee ticket submission (Compass) | P13-04 | "Report Issue" button on Profile tab → new ticket dialog (category, description, photo upload) |
| P13-07 | Implement ticket notification service | P13-02, P5-05 | Email + push notifications for ticket updates (new, assigned, resolved) |

---

## Phase 14: Live Chat
> Ref: [16-ADVANCED-CAPABILITIES](16-ADVANCED-CAPABILITIES.md) §4

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P14-01 | Create `ChatConversation`, `ChatMessage` models + migration | P1-12 | Conversation status (OPEN/ASSIGNED/RESOLVED), message types (text, image, system) |
| P14-02 | Implement chat Socket.IO namespaces | P5-01 | `/chat/admin` for support agents, `/chat/compass` for employees |
| P14-03 | Implement chat service | P14-01 | Create conversation, send/receive messages, assign to agent, resolve, escalate to ticket |
| P14-04 | Implement chat REST API | P14-03 | Conversation history, search, agent assignment |
| P14-05 | Create admin chat dashboard | P14-02, P14-04 | Chat queue, active conversations, agent routing, canned responses |
| P14-06 | Create Compass chat widget | P14-02 | Floating chat button → chat panel, message bubbles, typing indicator |
| P14-07 | Implement chat → ticket escalation | P14-03, P13-02 | "Escalate to Ticket" button — auto-creates ticket from chat transcript |

---

## Phase 15: Webhooks
> Ref: [16-ADVANCED-CAPABILITIES](16-ADVANCED-CAPABILITIES.md) §5

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P15-01 | Create `WebhookEndpoint`, `WebhookDelivery` models + migration | P1-12 | URL, secret (HMAC-SHA256), events array, status, failure tracking |
| P15-02 | Implement webhook delivery BullMQ worker | P15-01 | HMAC-SHA256 signing, retry with exponential backoff, auto-disable after 10 consecutive failures |
| P15-03 | Implement webhook event emitter | P15-02 | Hook into booking/space/employee events → queue webhook deliveries |
| P15-04 | Implement webhook admin API endpoints | P15-01 | CRUD endpoints, delivery logs, test endpoint, re-deliver |
| P15-05 | Create admin Webhooks management page | P15-04 | Endpoint list, event subscription checkboxes, delivery log viewer, health indicator |
| P15-06 | Define 12 webhook event payloads | P15-03 | `booking.created`, `booking.checked_in`, `booking.released`, `booking.cancelled`, `booking.no_show`, `space.mode_changed`, `space.created`, `space.deleted`, `employee.created`, `employee.updated`, `employee.deactivated`, `rule.changed` |

---

## Phase 16: Company API
> Ref: [16-ADVANCED-CAPABILITIES](16-ADVANCED-CAPABILITIES.md) §6

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P16-01 | Create `ApiKey` model + migration | P1-12 | keyHash (SHA-256), prefix (first 8 chars for identification), companyId, scopes array, rateLimit, expiresAt |
| P16-02 | Implement API key auth middleware | P16-01 | Verify `X-API-Key` header, check scopes, rate limiting (Redis), attach company context |
| P16-03 | Implement public API endpoints (`/api/v2/public/`) | P16-02 | 18 endpoints: spaces (list, get), bookings (list, create, cancel), employees (list, get), rules (list), availability (check) |
| P16-04 | Implement API key management endpoints | P16-01 | Admin endpoints: create key (return once), list keys, revoke key, rotate key |
| P16-05 | Create admin API Keys management page | P16-04 | Key list, scope checkboxes, usage stats, create/revoke buttons |
| P16-06 | Generate OpenAPI/Swagger documentation | P16-03 | `swagger-jsdoc` + `swagger-ui-express` at `/api/v2/public/docs` |
| P16-07 | Implement API response format | P16-03 | Standard envelope: `{ data, meta: { total, page, limit }, error }`, rate limit headers |

---

## Phase 16B: Floor Plans, Maps & AIMS LBS
> Ref: [18-FLOOR-PLANS-AND-LBS](18-FLOOR-PLANS-AND-LBS.md)
>
> **CRITICAL: AIMS LBS is an OPTIONAL expansion** — must be enabled by SoluM per customer contract, then toggled per-store (`lbsEnabled: true`). Floor plans and space placement work WITHOUT LBS — AIMS sync is an additional layer.
> **AIMS has its own Map Management UI** (CAD editor, components, shelf IDs, zones, routes) in the Cloud Dashboard. Compass provides a simplified admin experience that syncs to AIMS LBS via API.
> **Shelf ID pattern:** Configurable per-store: `[Prefix][Separator][Counter]` (e.g., `C-001`, `D.001`, `ZONE_001`).
> **AIMS LBS API used:** `PUT /api/v2/common/labels/update/shelf` (batch location sync), store `lbsEnabled` flag, label fields: `floor`, `shelfId`, `shelfFloor`, `order`, `arrow`.
> **Current AIMS integration:** `solumService.ts` + `aimsGateway.ts` handle auth, article CRUD, label operations — but have NO shelf/LBS methods yet.

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P16B-00 | Implement AIMS LBS availability check | — | Query store `lbsEnabled` flag via AIMS API. Show "LBS not available" in admin UI when disabled. Floor plan features work without LBS — only the AIMS sync buttons/jobs are disabled. Store shelf ID pattern config (prefix, separator, digit count) in `Company.compassConfig`. |
| P16B-01 | Create `FloorPlan` model + migration | P1-12 | id, floorId, branchId, companyId, imageUrl, imageWidth, imageHeight, mimeType, fileSize, name, scale, rotation. Unique on (floorId, branchId). |
| P16B-02 | Add map position columns to `Space` model | P1-02 | Nullable: `mapX Float?`, `mapY Float?`, `mapRotation Float?`, `lbsFloor String?`, `lbsShelfId String?`, `lbsShelfFloor Int?`, `lbsOrder Int?`, `lbsArrow String?` |
| P16B-03 | Add `updateLabelShelfInfo()` to `solumService.ts` | — | New method: `PUT /api/v2/common/labels/update/shelf` with `{ labelShelfInfo: [{ updateId, floor, shelfId, shelfFloor, order }] }`. Params: `company`, `store`, `updateType=LABELS`. |
| P16B-04 | Add `AimsShelfInfoUpdate` type to `aims.types.ts` | — | `{ updateId: string, floor: string, shelfId: string, shelfFloor: number, order: number }` |
| P16B-05 | Implement `FloorPlanService` | P16B-01, P16B-02 | Upload (multer, 10MB limit, PNG/JPG/SVG), thumbnail generation, CRUD, batch space position update, LBS field derivation from floor/area context |
| P16B-06 | Implement AIMS LBS sync service | P16B-03, P16B-02 | Collect spaces with labelCode on floor → build `shelfInfoList` → call `updateLabelShelfInfo()` via `aimsGateway`. Per-floor and per-space sync. Error handling with retry. |
| P16B-07 | Implement floor plan admin API endpoints | P16B-05 | 9 endpoints: GET/POST/PUT/DELETE floor plan, PUT batch space positions, PUT single space position, DELETE space position, POST sync-lbs (floor), POST sync-lbs (space) |
| P16B-08 | Implement Compass app map API endpoints | P16B-05 | `GET /api/v2/compass/floors/:floorId/map` (plan + positions + status), `GET /api/v2/compass/floors/:floorId/occupancy` (real-time overlay) |
| P16B-09 | Add Docker volume for floor plan uploads | P0-10 | Add `floorplan_uploads` volume to `docker-compose.app.yml`, mount at `/app/uploads/floorplans`. Serve static via Nginx. |
| P16B-10 | Create admin Floor Plan Editor page | P16B-07 | `FloorPlanEditor.tsx` — Canvas (react-konva): upload image, drag-drop spaces, zoom/pan, unplaced spaces sidebar, space detail panel with LBS fields |
| P16B-11 | Create admin Occupancy Map overlay | P16B-10, P6-04 | Real-time color-coded occupancy on floor plan (green=available, blue=booked, orange=occupied, gray=excluded). Socket.IO updates. |
| P16B-12 | Create Compass app Map View | P16B-08, P8-06 | SVG overlay on floor plan image in Find tab. Toggle between List/Map views. Pinch-to-zoom, tap space → booking bottom sheet. Floor picker tabs. |
| P16B-13 | Show friends on Compass map | P16B-12, P8-13 | Friend avatars at checked-in space positions. "Near Friends" filter highlights friend locations. |
| P16B-14 | Add floor plan step to company wizard | P7-04 | Optional sub-step 4c in wizard Space Configuration: upload floor plans per floor, drag spaces onto map. |
| P16B-15 | Implement LBS sync BullMQ job | P16B-06 | Background job: on space position save → queue AIMS shelf update. Batch multiple position updates within 5s debounce window. |

---

## Phase 17: Testing & Quality
> Ref: [08-CLEAN-CODE-GUIDELINES](08-CLEAN-CODE-GUIDELINES.md), [03-NFR](03-NON-FUNCTIONAL-REQUIREMENTS.md)

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P17-01 | Write unit tests for BookingService | P3-04 | Cover all booking flows: create, check-in, release, extend, cancel, auto-release, no-show |
| P17-02 | Write unit tests for RuleEngine | P3-03 | Test cascading resolution, cache hit/miss, rule priority |
| P17-03 | Write unit tests for CompassAuth | P2-03, P2-04 | Verification code flow, JWT signing, device token, rate limiting |
| P17-04 | Write unit tests for ProximityService | P4-07 | Distance calculations: same floor, same building, different building |
| P17-05 | Write unit tests for DirectorySyncService | P10-02 | User sync (create/update/deactivate), error handling, delta queries |
| P17-06 | Write E2E tests for Compass admin pages | P6-06 to P6-09 | Test dashboard card, bookings page, spaces page, rules page via Playwright |
| P17-07 | Write E2E tests for wizard Compass expansion | P7-09 | Test wizard flow: enable Compass → complete all steps → verify company created correctly |
| P17-08 | Write integration tests for booking concurrency | P1-04 | Verify `EXCLUDE USING gist` constraint prevents double-booking under concurrent requests |
| P17-09 | Write Compass app component tests | P8-01 to P8-15 | Test all Compass app screens, navigation, booking flow |
| P17-10 | Performance test: booking throughput | P3-04 | Verify < 200ms p95 for booking creation under load |
| P17-11 | Write unit tests for FloorPlanService | P16B-05 | Upload, position update, LBS field derivation, batch sync |
| P17-12 | Write E2E tests for floor plan editor | P16B-10 | Upload image, place spaces, save positions, sync to AIMS |

---

## Phase 18: Deployment & Infrastructure
> Ref: [11-INFRASTRUCTURE](11-INFRASTRUCTURE-REQUIREMENTS.md), [15-MONOREPO](15-MONOREPO-STRUCTURE.md)
>
> **Current deployment flow**: Push to `main` → `deploy-ubuntu.yml` SSHes to server at `/opt/electisSpace`, runs `git pull`, `docker compose build`, `prisma migrate deploy`, `up -d`. PostgreSQL is **external** (`global-postgres` on `global-network`), managed separately. Backups use `pg_dump` piped to gzip, keeping last 5.

| ID | Task | Dependencies | Details |
|----|------|-------------|---------|
| P18-01 | Build and test all 3 Docker images locally | P0-07, P0-10 | Build `client`, `compass`, `server` images. Verify they start, connect to `global-network`, and serve health checks. |
| P18-02 | Add Compass env vars to `deploy/server.env` | P2-01 | `COMPASS_JWT_SECRET`, `COMPASS_JWT_EXPIRES_IN`, `COMPASS_EMAIL_FROM`. Keep existing admin vars unchanged. |
| P18-03 | Verify `deploy-ubuntu.yml` compass integration | P0-12 | Confirm: `docker compose build` builds all 3, `up -d server client compass`, health checks pass for `:3071` (admin) AND `:3072` (compass). |
| P18-04 | Configure NPM SSL for compass.solumesl.co.il | P0-14 | Add Let's Encrypt certificate in NPM for `compass.solumesl.co.il`, HTTPS redirect, WebSocket upgrade for Socket.IO. |
| P18-05 | Verify backup script includes new tables | — | Existing `pg_dump` in `deploy-ubuntu.yml` dumps entire `electisspace_prod` DB — new Compass tables (bookings, company_users, etc.) are automatically included. Verify dump size is reasonable. |
| P18-06 | Verify `release.yml` Compass Android build | P0-13 | Confirm `build-compass-android` job produces APK from `compass/android/`, uploaded as separate artifact in GitHub Release. |
| P18-07 | Set up monitoring thresholds | — | CPU > 70% warning, RAM > 80% warning, API p95 > 500ms, Socket.IO > 800 connections, BullMQ queue > 50 pending. |
| P18-08 | Deploy to staging environment | P18-01 to P18-07 | Full stack deployment via modified `deploy-ubuntu.yml`, smoke test all features including compass health check. |
| P18-09 | Production deployment | P18-08 | Push to `main`, monitor automated deployment, verify 3 containers running, health checks green, monitor for 24h. |

---

## Summary: Phase Dependencies

```
Phase 0 (Monorepo)
  └→ Phase 1 (Database)
       └→ Phase 2 (Auth)
            └→ Phase 3 (Bookings)
            │    └→ Phase 5 (Real-Time)
            │    └→ Phase 6 (Admin Dashboard)
            │         └→ Phase 7 (Wizard)
            └→ Phase 4 (Spaces/Friends)
                 └→ Phase 8 (Compass App)
                      └→ Phase 9 (Mobile/Capacitor)

Phase 1 ──→ Phase 10 (Directory Sync)
Phase 1 ──→ Phase 11 (SSO)
Phase 3 ──→ Phase 12 (Analytics)
Phase 1 ──→ Phase 13 (Tickets)
Phase 5 ──→ Phase 14 (Chat)
Phase 3 ──→ Phase 15 (Webhooks)
Phase 3 ──→ Phase 16 (Company API)
Phase 1 + Phase 4 ──→ Phase 16B (Floor Plans & LBS)
Phase 16B + Phase 8 ──→ Compass Map View

All Phases ──→ Phase 17 (Testing)
All Phases ──→ Phase 18 (Deployment)
```

---

## Task Count

| Phase | Tasks | Category |
|-------|-------|----------|
| 0 — Monorepo Setup | 15 | Infrastructure |
| 1 — Database Schema | 12 | Infrastructure |
| 2 — Auth & Feature Gating | 10 | Core Server |
| 3 — Bookings & Rules | 12 | Core Server |
| 4 — Spaces, Friends, Proximity | 10 | Core Server |
| 5 — Real-Time & Notifications | 6 | Core Server |
| 6 — Admin Dashboard | 10 | Admin UI |
| 7 — Company Wizard | 10 | Admin UI |
| 8 — Compass App Core | 15 | Compass App |
| 9 — Mobile (Capacitor) | 8 | Compass App |
| 10 — Directory Sync | 12 | Integration |
| 11 — SSO | 8 | Integration |
| 12 — Analytics | 7 | Advanced |
| 13 — Tickets | 7 | Advanced |
| 14 — Chat | 7 | Advanced |
| 15 — Webhooks | 6 | Advanced |
| 16 — Company API | 7 | Advanced |
| 16B — Floor Plans & LBS | 16 | Integration |
| 17 — Testing | 12 | Quality |
| 18 — Deployment | 9 | Operations |
| **Total** | **199** | |
