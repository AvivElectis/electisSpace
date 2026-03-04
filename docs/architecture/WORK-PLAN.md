# Space Management Redesign — Work Plan

> Generated from deep scan of the architecture plan + existing codebase.
> Goal: Implement the redesign **without breaking existing app functionality**.

---

## Part A: Weak Spots & Issues Found

### A1. Critical Issues in the Architecture Plan

| # | Issue | Category | Where |
|---|-------|----------|-------|
| 1 | **`SpaceStatus` conflates structural state and booking lifecycle** — AVAILABLE/BOOKED/CHECKED_IN are booking states, but PERMANENT/EXCLUDED/MAINTENANCE are structural modes. A permanent space can't have a booking status. | Inconsistency | Lines 249-267, 1050-1058 |
| 2 | **No `buildingId` in Prisma Space migration** — TypeScript interface has `buildingId` (line 284) but the migration plan (lines 1307-1316) only adds `floorId, areaId`. Spaces without a floor can't reference their building. | Data Model | Lines 1307-1316 |
| 3 | **No `sortOrder` on Space** — Proximity algorithm (lines 637-646) requires it, bug #2 recommends it, but neither interface nor schema include it. | Data Model | Lines 637-646, 1675 |
| 4 | **`CompanyUserDeviceToken` model referenced but never defined** — CompanyUser relations reference it (line 1100) but the model definition is missing. | Missing Model | Line 1100 |
| 5 | **Building deletion cascades destroy booking history** — Prisma cascade on Building→Floor→Space→Booking. No soft-delete on Space model. | Edge Case | Lines 970-977 |
| 6 | **No `companyId` on Booking model** — "All bookings for a company" requires joining through Branch. Common query needs direct FK or indexed path. | Data Model | Lines 1113-1143 |
| 7 | **Booking `endTime` required but permanent assignments are indefinite** — Permanent desk assignments have no end time, but the model requires one. | Data Model | Line 1121 |
| 8 | **No `buildingId` on CompanyUser** — Has `branchId, floorId, areaId` but no `buildingId`. Can't assign user to a building in a multi-building branch. | Data Model | Line 1076 |
| 9 | **OAuth tokens for integrations not persisted** — Integration model has `clientSecretEnc` but no `accessToken/refreshToken/tokenExpiresAt`. Microsoft Graph tokens expire hourly. | Integration | Lines 1215 |
| 10 | **No pagination on any v2 API endpoint** — GET endpoints for spaces, bookings, employees return unbounded results. | API Design | Lines 1319-1423 |
| 11 | **Concurrent booking race condition** — Only a one-liner about `SELECT FOR UPDATE`. No full locking strategy specified. | Edge Case | Line 1674 |
| 12 | **Floor `rangeStart/rangeEnd` are strings** — "A101" to "A199" requires custom parsing for auto-numbering. Incrementing within string ranges is never specified. | Data Model | Lines 988-989 |
| 13 | **BookingRule targeting confusion** — Both `branchId` and `applyTo: SELECTED_BRANCHES` with `targetBranchIds[]` overlap. Resolution algorithm never uses `targetBranchIds`. | Inconsistency | Lines 367-397 |
| 14 | **`AdminRequest` FK relations missing** — `requesterId`, `resolvedById`, `relatedSpaceId` have no `@relation` directives in Prisma schema. | Data Model | Lines 1267-1289 |
| 15 | **Friendship directionality undefined** — Is it mutual (requires acceptance) or unidirectional? Privacy implications. | Edge Case | Lines 1193-1205 |
| 16 | **Socket.IO scaling strategy absent** — Compass could have thousands of concurrent WebSocket connections. No Redis adapter, no sticky sessions, no horizontal scaling plan. | Performance | Lines 1425-1435 |
| 17 | **AIMS sync volume increase unaddressed** — Every booking/check-in/release generates a sync item. Thousands of daily Compass users = orders of magnitude more sync traffic. No rate limiting. | Performance | |
| 18 | **Rule resolution not cached** — Multi-query operation on every booking request. No Redis caching strategy. | Performance | Lines 390-397 |
| 19 | **Auto-release job scans all bookings every minute** — No index on `(status, endTime)`. Grows with historical data. | Performance | Line 1511 |
| 20 | **`shared/` directory conflicts with existing `@shared/` alias** — Plan creates top-level `shared/` but existing codebase uses `src/shared/` via `@shared/*` alias. Would break all existing imports. | Migration | Lines 1860-1905 |

### A2. Critical Risks from Existing Codebase

| # | Risk | Impact | Detail |
|---|------|--------|--------|
| 1 | **Store→Branch rename: ~2,176 occurrences across 161 files** | CRITICAL | `storeId`/`activeStoreId`/`Store` permeates every feature, every API call, auth middleware, SSE, sync, E2E tests. |
| 2 | **`Space.externalId` uniqueness constraint** | HIGH | Currently `@@unique([storeId, externalId])`. Must become `@@unique([storeId, externalId])` with `@map` if renaming, or carefully migrated. |
| 3 | **`Person.assignedSpaceId` is a string slot, not a Space FK** | HIGH | Was de-FKed in migration `20260207152538_remove_person_space_fk`. The people assignment model is fundamentally different from the redesign's booking model. |
| 4 | **Spaces/People mutual exclusivity** | HIGH | Current wizard enforces `spacesEnabled XOR peopleEnabled`. Redesign merges them. Existing companies with `peopleEnabled` only need migration strategy. |
| 5 | **`spaceType` is a global per-company setting** | HIGH | Currently `'office'|'room'|'chair'|'person-tag'` set company-wide. Redesign makes it per-space. All UI, labels, and translation logic references the global `spaceType`. |
| 6 | **Company wizard already exists (6 steps)** | MEDIUM | Full wizard at `src/features/settings/presentation/companyDialog/`. Needs extension, not replacement. |
| 7 | **Settings store dual-level merge** | MEDIUM | `settingsStore.ts` merges store + company settings. Adding branch-level settings means a third merge tier. |
| 8 | **ConferenceRoom is a separate Prisma model** | MEDIUM | Completely independent from Space. No FK between them. Migration to Space(type=CONFERENCE) requires data migration + label re-linking. |
| 9 | **`PeopleListMembership.spaceId` is a real FK** | MEDIUM | Only real FK from other models to Space. Migration must preserve referential integrity. |
| 10 | **`provisionSlots` system for people mode** | MEDIUM | Pre-creates N empty AIMS articles. Has no equivalent in the new hierarchy. Must be preserved for backward compat or migrated. |

---

## Part B: Guiding Principles

1. **Additive-first**: Add new tables/columns/endpoints alongside existing ones. Never drop or rename until the new system is proven.
2. **Feature flags**: Gate all new behavior behind company-level feature flags so existing customers are unaffected.
3. **Zero-downtime migrations**: Additive schema changes first, backfill data, switch logic, then clean up old columns.
4. **Preserve API v1**: All existing `/api/v1/` endpoints continue to work unchanged. New endpoints use `/api/v2/` or extend v1 with optional parameters.
5. **No Store→Branch rename initially**: Keep `Store` in the DB and Prisma model. Use TypeScript type aliases `type Branch = Store` for new code. Rename in a future cleanup phase.
6. **Keep `src/shared/`**: Don't create a conflicting top-level `shared/`. New shared code goes in `src/shared/` as before.

---

## Part C: Elaborate Work Plan

### Phase 0 — Plan Fixes & Pre-work (Before any code)

> Fix the identified weak spots in the architecture document itself.

| # | Task | Details |
|---|------|---------|
| 0.1 | **Split `SpaceStatus` into two concepts** | Create `SpaceMode` enum (AVAILABLE, EXCLUDED, MAINTENANCE, PERMANENT) and `BookingStatus` enum (AVAILABLE, BOOKED, CHECKED_IN, RELEASED, AUTO_RELEASED, NO_SHOW). A Space has a `mode` (structural) and its current booking determines the display status. |
| 0.2 | **Add `buildingId` to Space migration plan** | Space gets `buildingId` (optional FK), `floorId` (optional FK), `areaId` (optional FK). All three optional because spaces can exist at any level. |
| 0.3 | **Add `sortOrder` to Space model** | `sortOrder Int @default(0)` for proximity calculations. Auto-set during batch creation based on range position. |
| 0.4 | **Define `CompanyUserDeviceToken` model** | `id, companyUserId, token, platform (ANDROID/IOS/WEB), createdAt, lastUsedAt`. |
| 0.5 | **Add `buildingId` to CompanyUser** | Optional FK for multi-building branch assignment. |
| 0.6 | **Make Booking `endTime` nullable** | `endTime DateTime?` — null for permanent assignments. |
| 0.7 | **Add pagination to all v2 list endpoints** | Standard `?page=1&limit=50` or cursor-based with `?cursor=X&limit=50`. |
| 0.8 | **Define range parsing algorithm** | Specify how string ranges work: extract numeric suffix, increment, re-attach prefix. Handle `BG01→BG02`, `A101→A102`. |
| 0.9 | **Fix BookingRule targeting** | Remove `branchId` from BookingRule. Use only `applyTo + targetBranchIds[]` for scope resolution. `branchId` becomes `companyId` (rules belong to a company). |
| 0.10 | **Add soft-delete to Space model** | `deletedAt DateTime?` + default scope `WHERE deletedAt IS NULL`. Prevents cascade loss of booking history. |
| 0.11 | **Add OAuth token storage to Integration model** | `accessToken, refreshToken, tokenExpiresAt` fields (encrypted). |
| 0.12 | **Define friendship as bidirectional with acceptance** | `Friendship` model: `status: PENDING/ACCEPTED/BLOCKED`. Only accepted friendships show location. |
| 0.13 | **Add `companyId` index path for Booking** | Either add `companyId` FK or create a composite index via Branch join. |
| 0.14 | **Update plan document with all fixes** | Amend SPACE-MANAGEMENT-REDESIGN.md with resolutions. |

---

### Phase 1 — Database Foundation (No UI changes, no breaking changes)

> Add new models alongside existing ones. Existing app continues unchanged.

#### 1A. New Prisma Models (Additive Only)

| # | Task | Details | Risk to Existing |
|---|------|---------|------------------|
| 1A.1 | **Create `Building` model** | `id, storeId (FK→Store), name, code, sortOrder, isActive, createdAt, updatedAt`. `@@unique([storeId, code])`. | NONE — new table |
| 1A.2 | **Create `Floor` model** | `id, buildingId (FK→Building), name, prefix, sortOrder, rangeStart, rangeEnd, isActive`. `@@unique([buildingId, prefix])`. | NONE — new table |
| 1A.3 | **Create `Area` model** | `id, floorId (FK→Floor), name, type (WING/ZONE/DEPARTMENT/SECTION), sortOrder, isActive`. | NONE — new table |
| 1A.4 | **Add optional columns to `Space`** | `buildingId, floorId, areaId, spaceType (default null), spaceMode (default null), sortOrder (default 0), capacity (default 1), deletedAt`. All nullable, no breaking changes to existing queries. | LOW — additive columns, null defaults |
| 1A.5 | **Create `CompanyUser` model** | New model for Compass employee accounts. `id, companyId, branchId (FK→Store), buildingId, floorId, areaId, email, phone, displayName, passwordHash, isActive, loginCodeHash, loginCodeExpiresAt, preferences (JSON), createdAt, updatedAt`. | NONE — new table |
| 1A.6 | **Create `Booking` model** | `id, companyUserId (FK→CompanyUser), spaceId (FK→Space), branchId (FK→Store), startTime, endTime (nullable), status, checkInAt, checkOutAt, autoReleasedAt, isRecurring, createdAt`. `@@index([spaceId, startTime, endTime])`, `@@index([companyUserId, startTime])`. | NONE — new table |
| 1A.7 | **Create `BookingRule` model** | `id, companyId (FK→Company), name, ruleType, isActive, priority, config (JSON), applyTo, targetBranchIds, targetSpaceTypes, createdAt`. | NONE — new table |
| 1A.8 | **Create `Friendship` model** | `id, userId (FK→CompanyUser), friendId (FK→CompanyUser), status (PENDING/ACCEPTED/BLOCKED), createdAt`. `@@unique([userId, friendId])`. | NONE — new table |
| 1A.9 | **Create `AdminRequest` model** | `id, companyUserId, requestType, status, data (JSON), resolvedById, resolvedAt`. With proper `@relation` directives. | NONE — new table |
| 1A.10 | **Create `CompanyUserDeviceToken` model** | `id, companyUserId, token, platform, createdAt, lastUsedAt`. | NONE — new table |
| 1A.11 | **Create migration & generate Prisma client** | Single migration file for all new models + Space additive columns. Run `prisma generate`. | LOW — existing models untouched |
| 1A.12 | **Add database indexes** | Composite indexes: `Space(storeId, spaceType, spaceMode)`, `Booking(spaceId, status, startTime)`, `Booking(status, endTime)` for auto-release job, `CompanyUser(companyId, email)`. | NONE — additive |

**Verification**: After this sub-phase, run all existing tests (`npm run test:unit`, `cd server && npx vitest run`, `npm run test:e2e`). All must pass with zero changes.

#### 1B. Server — Building/Floor/Area CRUD (New Routes)

| # | Task | Details | Risk to Existing |
|---|------|---------|------------------|
| 1B.1 | **Create `buildings` feature module** | `server/src/features/buildings/` with routes, controller, service, repository, types. Full CRUD: list by store, create, update, delete (with soft-delete check on child spaces). | NONE — new feature module |
| 1B.2 | **Create `floors` feature module** | `server/src/features/floors/` — CRUD scoped to building. Auto-generates space number ranges. | NONE — new feature module |
| 1B.3 | **Create `areas` feature module** | `server/src/features/areas/` — CRUD scoped to floor. | NONE — new feature module |
| 1B.4 | **Mount new routes in `app.ts`** | Add under `/api/v1/buildings`, `/api/v1/floors`, `/api/v1/areas`. Use existing auth middleware. | LOW — additive route mounting |
| 1B.5 | **Extend Space service for hierarchy** | Add optional `buildingId/floorId/areaId` to space creation. Existing creation without these fields continues to work (backward compat). | LOW — optional parameters |
| 1B.6 | **Article ID generation service** | `server/src/shared/infrastructure/services/articleIdGenerator.ts` — resolves `{building}{floor}{number}` template from company settings. Used by batch space creation. | NONE — new utility |
| 1B.7 | **Batch space creation endpoint** | `POST /api/v1/spaces/batch` — given floorId + count, generates spaces with auto-incremented externalIds using the article format template. | NONE — new endpoint |

**Verification**: All existing tests pass. New endpoints tested with new unit tests.

#### 1C. Client — Building/Floor/Area Admin UI

| # | Task | Details | Risk to Existing |
|---|------|---------|------------------|
| 1C.1 | **Create `building` feature module (client)** | `src/features/building/` with DDD structure: domain types, infrastructure API, application store, presentation components. | NONE — new feature |
| 1C.2 | **BuildingManagementPage** | Accessed from Settings or a new admin route. Tree view: Company → Branch → Buildings → Floors → Areas. CRUD actions at each level. | NONE — new page |
| 1C.3 | **BatchSpaceCreationDialog** | Select floor → set count → preview generated IDs → create. Uses article format template from company settings. | NONE — new dialog |
| 1C.4 | **Extend SpacesManagementView** | Add optional hierarchy filter sidebar (building → floor → area dropdowns). Existing flat view remains default. Toggle between "flat" and "hierarchy" view. | LOW — additive UI, existing view unchanged |
| 1C.5 | **Add `spaceType` column to spaces table** | Show per-space type when hierarchy mode is active. Existing companies without hierarchy see the global `spaceType` as before. | LOW — conditional display |
| 1C.6 | **Extend SpaceDialog for hierarchy fields** | Add optional Building/Floor/Area selectors to the add/edit space dialog. Pre-populated if creating from a floor context. | LOW — optional fields |
| 1C.7 | **Add article format setting to Company wizard** | Extend Step 3 (ArticleFormatStep) with Space Management Mode option: template input, number padding, preview. Keep existing AIMS-Only Mode as-is. | MEDIUM — extends existing wizard step |
| 1C.8 | **Translations** | Add keys for all new UI text in both `en/common.json` and `he/common.json`. | LOW |

**Verification**: Existing E2E tests pass. New unit tests for building components.

---

### Phase 2 — Compass App Foundation (Parallel workstream)

> New app, no impact on existing electisSpace.

#### 2A. Compass Server APIs

| # | Task | Details | Risk to Existing |
|---|------|---------|------------------|
| 2A.1 | **CompanyUser auth module** | `server/src/features/compass-auth/` — email+code login, device token, JWT with CompanyUser claims. Separate middleware `compassAuth`. | NONE — new module, separate middleware |
| 2A.2 | **Booking API module** | `server/src/features/bookings/` — create, check-in, release, cancel, list my bookings, available spaces. Uses `SELECT FOR UPDATE` for concurrent booking protection. | NONE — new module |
| 2A.3 | **Booking rule engine** | `server/src/shared/infrastructure/services/bookingRuleEngine.ts` — resolve applicable rules for a (company, branch, spaceType, space) tuple. Cache resolved rules in Redis (invalidate on rule CRUD). | NONE — new service |
| 2A.4 | **Auto-release BullMQ job** | `server/src/shared/infrastructure/jobs/autoReleaseBookings.ts` — runs every minute, finds BOOKED bookings past endTime, releases them, triggers AIMS sync. Index: `Booking(status, endTime)`. | LOW — new job, queries new table |
| 2A.5 | **No-show detection job** | Similar to auto-release but for BOOKED bookings where check-in window has passed. | LOW |
| 2A.6 | **Friendship API** | `server/src/features/friendships/` — send request, accept/reject, list friends, get friend locations. Bidirectional with acceptance. | NONE — new module |
| 2A.7 | **Employee profile API** | `server/src/features/compass-profile/` — get/update profile, preferences, notification settings. | NONE |
| 2A.8 | **Socket.IO integration** | Add Socket.IO alongside existing SSE. Separate namespace `/compass`. Events: `booking:created`, `booking:released`, `space:status_changed`, `friend:location_changed`. Use Redis adapter for horizontal scaling. | LOW — additive, SSE untouched |
| 2A.9 | **Rate limiting on Compass auth** | Redis-backed rate limiter: 5 attempts/minute per email on login/verify endpoints. | NONE |
| 2A.10 | **Pagination middleware** | Reusable pagination helper for all list endpoints: parse `?page&limit`, apply to Prisma query, return `{data, meta: {page, limit, total}}`. | NONE — new middleware |

#### 2B. Compass Client App

| # | Task | Details | Risk to Existing |
|---|------|---------|------------------|
| 2B.1 | **Scaffold Compass app** | New Vite project at `compass/` or `src/apps/compass/`. React + MUI + Zustand + i18next. Capacitor Android target. Separate build config. | NONE — separate app |
| 2B.2 | **Auth flow** | Email input → login code → verify → store device token. Access token in memory + refresh token cookie. | NONE |
| 2B.3 | **Home screen** | Current booking card (or empty state), quick actions (Find Space, My Bookings), friend locations summary. | NONE |
| 2B.4 | **Find Space screen** | Branch selector → floor filter → available spaces list. Sort by: name, proximity to friends. Booking action. | NONE |
| 2B.5 | **Booking flow** | Select space → confirm time range → create booking. Handle conflicts with user-friendly error. | NONE |
| 2B.6 | **My Bookings screen** | Active booking, upcoming bookings, past bookings (paginated). Check-in, cancel actions. | NONE |
| 2B.7 | **Friends screen** | Friend list, add friend (search by email/name), pending requests, accept/reject. | NONE |
| 2B.8 | **Profile screen** | Display name, email, preferences, notification settings, language (en/he). | NONE |
| 2B.9 | **Bottom navigation** | Home, Find Space, My Bookings, Friends, Profile. | NONE |

**Verification**: Compass is a fully separate app. Zero risk to existing electisSpace.

---

### Phase 3 — Integration & Sync Enhancement

| # | Task | Details | Risk to Existing |
|---|------|---------|------------------|
| 3.1 | **AIMS sync awareness of hierarchy** | When pushing spaces to AIMS, include hierarchy metadata in article data fields (building name, floor name in `data` JSON). Pull sync maps new articles to "Unassigned" area by default. | LOW — extends existing sync, doesn't change it |
| 3.2 | **ESL template mapping per space type** | Map each SpaceType (OFFICE, DESK, CONFERENCE, etc.) to an ESL template. Configure in company settings. Default: use existing template for all types. | LOW — additive setting |
| 3.3 | **Booking events → AIMS sync** | When booking status changes, queue a space status update to AIMS (e.g., update `data` fields showing "Booked by: John" on the ESL). Throttle: max 1 update per space per 30 seconds. | MEDIUM — new sync trigger |
| 3.4 | **Microsoft 365 conference room sync** | New integration module. OAuth2 flow with token refresh. Fetch rooms via Graph API, map to Space(type=CONFERENCE). Calendar sync for room status. | NONE — new feature |
| 3.5 | **LDAP/AD user sync** | Optional sync service for CompanyUser. Runs as BullMQ job. Maps AD users to CompanyUser records. | NONE — new feature |

---

### Phase 4 — ConferenceRoom Migration (Careful, phased)

| # | Task | Details | Risk to Existing |
|---|------|---------|------------------|
| 4.1 | **Add `migratedToSpaceId` column to ConferenceRoom** | Track which ConferenceRooms have been migrated. Nullable FK to Space. | LOW — additive column |
| 4.2 | **Create migration script** | For each ConferenceRoom: create a Space(type=CONFERENCE) with matching externalId, copy relevant fields into Space.data, set `migratedToSpaceId`. | MEDIUM — data migration |
| 4.3 | **Dual-read period** | Conference feature reads from both ConferenceRoom and Space(type=CONFERENCE). Admin UI continues showing ConferenceRoom view. Feature flag per company. | MEDIUM — requires careful dual-path logic |
| 4.4 | **Switch to Space-based conference** | Once validated, new companies use Space(type=CONFERENCE) directly. Old companies migrated. ConferenceRoom model kept but no longer actively used. | LOW — after validation |

**Verification**: Existing conference E2E tests pass throughout migration.

---

### Phase 5 — Company Wizard Enhancement

| # | Task | Details | Risk to Existing |
|---|------|---------|------------------|
| 5.1 | **Add Building/Floor setup to wizard Step 5** | After branch selection, optional "Add buildings" and "Configure floors per building" sub-steps. Skip for single-building setups. | MEDIUM — extends existing step |
| 5.2 | **Article format template in wizard Step 3** | In Space Management Mode: template builder with preview. Input: `{building}{floor}{number}`, padding selector. Live preview of generated IDs. | MEDIUM — extends existing step |
| 5.3 | **Per-space-type feature toggle** | Extend FeaturesStep to show available space types when spaces feature is enabled. Default: OFFICE + DESK. | LOW — extends existing step |
| 5.4 | **Employee seeding** | Optional Step 6.5: Import initial CompanyUser list via CSV or integration. | LOW — new optional step |

---

### Phase 6 — Polish, Performance & Cleanup

| # | Task | Details | Risk to Existing |
|---|------|---------|------------------|
| 6.1 | **Redis caching for booking rules** | Cache resolved rule sets per (companyId, branchId, spaceType). Invalidate on rule CRUD. TTL: 5 minutes. | NONE |
| 6.2 | **Optimized available spaces query** | Denormalize booking count on Space (`activeBookingCount`), updated by triggers or application logic. Use for fast availability queries. | LOW |
| 6.3 | **Socket.IO Redis adapter** | Add `@socket.io/redis-adapter` for multi-instance deployment. Separate Socket.IO namespace for Compass. | LOW |
| 6.4 | **Booking overlap database constraint** | PostgreSQL exclusion constraint using `tsrange` for bulletproof overlap prevention. | LOW — additive constraint |
| 6.5 | **Dashboard hierarchy stats** | Extend DashboardSpacesCard with optional building/floor breakdown. Show only when hierarchy exists. | LOW |
| 6.6 | **Auto-release job optimization** | Add index `Booking(status, endTime) WHERE status = 'BOOKED'` (partial index). Limit scan to last 24 hours. | NONE |
| 6.7 | **Store→Branch type alias** | Create `type Branch = Store` alias in shared types. New code uses `Branch` terminology. DB stays as `stores`. Document plan for future rename. | LOW |
| 6.8 | **CHANGELOG.md updates** | Add entries for each phase under `[Unreleased]`. | LOW |
| 6.9 | **Wiki documentation** | Update `docs/wiki/` with new architecture chapters: Building hierarchy, Compass app, Booking system. | LOW |

---

## Part D: Dependency Graph

```
Phase 0 (Plan Fixes)
  └── Phase 1A (DB Models) ──────────────────┐
        ├── Phase 1B (Server CRUD) ──────────┤
        │     └── Phase 1C (Client UI) ──────┤
        │                                     │
        ├── Phase 2A (Compass Server) ────────┤
        │     └── Phase 2B (Compass Client) ──┤
        │                                     │
        └── Phase 3 (Integrations) ──────────┤
                                              │
              Phase 4 (Conference Migration) ─┤  (after Phase 1A + 1B)
              Phase 5 (Wizard Enhancement) ───┤  (after Phase 1C)
              Phase 6 (Polish & Cleanup) ─────┘  (ongoing, after Phase 2)
```

**Parallel tracks:**
- Phase 1B + 1C (admin hierarchy) and Phase 2A + 2B (Compass) can run in parallel after 1A.
- Phase 3 (integrations) can start after Phase 1B.
- Phase 4 (conference migration) can start after Phase 1A + 1B are stable.
- Phase 5 (wizard) can start after Phase 1C.

---

## Part E: Testing Strategy

| Phase | Testing Approach |
|-------|-----------------|
| Phase 0 | N/A (document changes only) |
| Phase 1A | Run ALL existing tests after migration. Zero regressions allowed. |
| Phase 1B | New server unit tests for building/floor/area CRUD. Run existing space tests. |
| Phase 1C | New client unit tests for hierarchy components. Run existing E2E suite. |
| Phase 2A | New server unit tests for bookings, auth, friendships. Existing tests unaffected. |
| Phase 2B | New Compass-specific E2E tests (separate Playwright project). |
| Phase 3 | Integration tests with mock AIMS. Existing sync tests unchanged. |
| Phase 4 | Migration script tests with fixture data. Run existing conference E2E after migration. |
| Phase 5 | Extend existing wizard E2E tests. |
| Phase 6 | Performance benchmarks: booking creation latency, available spaces query time. |

**Critical rule**: After every sub-phase, run the full existing test suite:
```bash
npm run test:unit && cd server && npx vitest run && cd .. && npm run test:e2e
```
Any regression = stop and fix before proceeding.

---

## Part F: What NOT to Change

These existing behaviors must remain intact throughout all phases:

| Area | Guarantee |
|------|-----------|
| `/api/v1/*` endpoints | All existing endpoints continue to work unchanged |
| Existing Space CRUD | Creating/editing/deleting spaces without hierarchy fields works as before |
| AIMS sync (pull/push) | Existing sync flow unchanged; hierarchy is additive metadata |
| People mode | Companies using `peopleEnabled` continue to work with the Person model |
| Conference rooms | Existing ConferenceRoom model stays functional until Phase 4 migration |
| SSE events | `GET /api/v1/stores/:storeId/events` unchanged; Socket.IO is additive |
| Auth flow | Existing admin auth (JWT + refresh cookie) unchanged |
| Settings structure | Existing `settings` JSON blob backward compatible; new fields have defaults |
| E2E test selectors | No changes to existing DOM structure that would break E2E tests |
| `@shared/*` imports | Path alias continues to point to `src/shared/` |
| Electron builds | Desktop app continues to build and work |
| Docker deployment | Existing `docker-compose.app.yml` structure preserved |
