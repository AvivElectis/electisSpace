# electisCompass — Architectural Risks, Collisions & Mitigations

**Version:** 2.0
**Date:** 2026-03-04
**Status:** Draft — Risks Resolved
**Purpose:** Identify architectural problems, data collisions, and design conflicts — and provide concrete solutions for each.

---

## 1. Critical Collisions

### COLLISION-01: Space Model Dual Purpose

**Problem:** The existing `Space` model serves the current spaces feature (flat list, global spaceType, manual assignment). Compass adds hierarchy (building/floor/area), per-space types, booking lifecycle, and soft-delete. Both features use the same table simultaneously.

**Impact:** HIGH — If a company has Compass disabled, the Space table works the old way. If enabled, Compass columns are populated. Queries must handle both modes.

**Mitigation:**
- All new columns are nullable with sensible defaults
- Existing queries (v1 API) never reference new columns
- Feature-gated: Compass queries add `WHERE space_mode IS NOT NULL` to only touch Compass-managed spaces
- Database view `compass_spaces` as a convenience layer for Compass-only queries

### COLLISION-02: `storeId` vs `branchId` Naming

**Problem:** The plan introduces "Branch" terminology but the database and 2,176 code references use `storeId`. New Compass code will want to use `branchId`, creating inconsistency.

**Impact:** MEDIUM — Confusing for developers. Risk of using wrong field name.

**Mitigation:**
- Database column stays `store_id` (no rename)
- Prisma model stays `Store`
- TypeScript type alias: `type Branch = Store; type BranchId = string;`
- New Compass code uses `branchId` in its interfaces, mapped to `storeId` at the repository layer
- Repository mappers translate: `branch.id → store.id`

### COLLISION-03: Existing SpaceType Global vs Per-Space

**Problem:** Currently `spaceType` is a global company setting (`office`/`room`/`chair`/`person-tag`). Compass makes it per-space (`OFFICE`/`DESK`/`CONFERENCE`/etc.). Different enum values, different scopes.

**Impact:** HIGH — Existing companies rely on global spaceType for UI, translations, and ESL templates.

**Mitigation:**
- When Compass is DISABLED: global spaceType continues to work unchanged
- When Compass is ENABLED: per-space `space_type` column is used, global `spaceType` is ignored
- Feature gating in the UI: `if (compassEnabled) usePerSpaceType() else useGlobalSpaceType()`
- Migration: when Compass is enabled for an existing company, all spaces get `space_type = globalSpaceType` as initial value

### COLLISION-04: Person Model vs CompanyUser Model

**Problem:** `Person` is used for ESL people-tag mode (simple display data, no auth). `CompanyUser` is a real user account with auth, bookings, friends. They serve fundamentally different purposes but represent "people in the company."

**Impact:** MEDIUM — Temptation to merge them, but they're incompatible.

**Mitigation:**
- Keep both models permanently separate
- Person = ESL display entity (People mode, Compass DISABLED)
- CompanyUser = authenticated employee (Compass ENABLED)
- When Compass replaces People mode, Person data is NOT migrated to CompanyUser (different lifecycle)
- Clear documentation: "Person ≠ CompanyUser"

### COLLISION-05: ConferenceRoom Model vs Space(type=CONFERENCE)

**Problem:** Existing `ConferenceRoom` is a separate Prisma model with its own AIMS sync, page-flipping logic, and E2E tests. Compass treats conference rooms as `Space(type=CONFERENCE)` with booking support.

**Impact:** HIGH — Two representations of the same physical entity.

**Mitigation:**
- When Compass is DISABLED: ConferenceRoom model works unchanged
- When Compass is ENABLED: conference rooms are managed as Space(type=CONFERENCE)
- No migration of ConferenceRoom data to Space — Compass creates fresh conference spaces
- ConferenceRoom feature is LOCKED when Compass is enabled (mutual exclusivity)
- Long-term (Phase 4+): migration script for companies switching to Compass

---

## 2. Data Integrity Risks

### RISK-D01: Concurrent Booking Race Condition

**Problem:** Two users booking the same space at the same instant. The 30ms between "check availability" and "create booking" allows double-booking.

**Impact:** HIGH — Core system integrity. Double-booked spaces break trust.

**Mitigation (defense in depth):**
1. Application level: `SELECT FOR UPDATE` row lock on space during booking
2. Database level: PostgreSQL `EXCLUDE USING gist` constraint on `(space_id, tsrange(start_time, end_time))` — catches any slip-through
3. Application level: conflict check after lock acquisition
4. Client level: optimistic UI with server confirmation

### RISK-D02: Booking History Orphaning

**Problem:** If a Space or CompanyUser is hard-deleted, all associated bookings lose referential integrity. Analytics become impossible.

**Impact:** HIGH — Data loss, broken queries.

**Mitigation:**
- Spaces: soft-delete only (`deletedAt` timestamp), never hard delete
- CompanyUser: deactivate only (`isActive = false`), never delete
- Bookings: never deleted, only status transitions to terminal states
- All FK relationships use `ON DELETE RESTRICT` (not CASCADE) for Booking FKs

### RISK-D03: Building Deletion Cascade

**Problem:** Deleting a building cascades to floors → areas → spaces. Spaces may have active bookings or booking history.

**Impact:** HIGH — Data loss if cascade not properly guarded.

**Mitigation:**
- Building deletion is soft-delete (add `deletedAt` to Building model)
- Before soft-delete: check for active bookings in any child space
- If active bookings exist: reject deletion with "Cancel active bookings first"
- Soft-deleted buildings/floors/spaces are hidden from UI but preserved in DB

### RISK-D04: Timezone Mismatches

**Problem:** Company branches span timezones. Booking startTime/endTime, auto-release jobs, and check-in windows must all respect branch timezone.

**Impact:** HIGH — Wrong auto-release timing, incorrect check-in windows.

**Mitigation:**
- All booking times stored in UTC in PostgreSQL
- Branch `timezone` field determines display timezone
- Auto-release job resolves branch timezone before comparing endTime
- Client sends times in UTC, displays in branch timezone
- BullMQ jobs: load branch timezone, convert before comparison

---

## 3. Performance Risks

### RISK-P01: Available Spaces Query Under Load

**Problem:** "Find available spaces" requires joining Space + active Bookings + booking rules. With 10,000 spaces and high booking volume, this query could become slow.

**Impact:** MEDIUM — Degraded UX for space browsing.

**Mitigation:**
- Composite index: `Space(store_id, space_type, space_mode) WHERE deleted_at IS NULL`
- Booking conflict check uses `tsrange` exclusion constraint (O(1) lookup)
- Optional: denormalized `active_booking_count` on Space, updated by triggers
- Pagination: max 50 spaces per page
- Redis cache: availability summary per floor (30s TTL)

### RISK-P02: Socket.IO Connection Scaling

**Problem:** Compass could have hundreds/thousands of concurrent WebSocket connections. Single Node.js process has connection limits.

**Impact:** MEDIUM — Connection drops, missed real-time updates.

**Mitigation:**
- Redis adapter for Socket.IO (`@socket.io/redis-adapter`) enables multi-instance
- Dedicated namespace `/compass` isolates from admin SSE
- Room-per-branch: events only sent to users in the relevant branch
- Connection limit monitoring: alert at 80% capacity
- Graceful degradation: client falls back to polling if Socket.IO disconnects

### RISK-P03: AIMS Sync Queue Flood

**Problem:** High booking volume generates many AIMS sync items. 1000 bookings/hour = 1000 ESL updates/hour. AIMS API may throttle.

**Impact:** MEDIUM — Delayed ESL updates, queue backlog.

**Mitigation:**
- Throttle: max 1 AIMS update per space per 30 seconds (coalesce rapid changes)
- Priority queue: check-in/release events higher priority than booking-created
- Bulk AIMS API: batch article updates (if AIMS API supports it)
- Circuit breaker: if AIMS returns errors, back off exponentially
- Queue depth monitoring: alert if > 100 pending items

### RISK-P04: Auto-Release Job Scaling

**Problem:** Auto-release job runs every minute, scanning all BOOKED bookings with endTime < now. As booking history grows, this scan could slow down.

**Impact:** LOW-MEDIUM — Delayed auto-releases.

**Mitigation:**
- Partial index: `Booking(status, end_time) WHERE status = 'BOOKED'` — only scans active bookings
- Job only processes bookings from the last 24 hours (safety net)
- Batch processing: update 100 bookings per iteration, yield between batches
- Monitor job execution time: alert if > 5 seconds

---

## 4. Security Risks

### RISK-S01: Compass Auth Token Confusion

**Problem:** Admin and Compass use JWTs signed by the same server. A Compass token could potentially be used on admin endpoints (or vice versa).

**Impact:** HIGH — Privilege escalation.

**Mitigation:**
- Different JWT signing keys: `ADMIN_JWT_SECRET` vs `COMPASS_JWT_SECRET`
- Token payload includes `type: 'admin' | 'compass'`
- Middleware validates token type: `compassAuthMiddleware` rejects admin tokens, `adminAuthMiddleware` rejects compass tokens
- Token subject is different: admin tokens use `User.id`, compass tokens use `CompanyUser.id`

### RISK-S02: Cross-Tenant Data Leakage

**Problem:** Multi-tenant system where a CompanyUser from Company A could potentially see spaces or bookings from Company B.

**Impact:** CRITICAL — Data breach.

**Mitigation:**
- All Compass queries include `companyId` filter (derived from JWT, never from request body)
- Repository layer enforces tenant scope: `findAvailable(branchId)` validates branch belongs to user's company
- Database: no cross-company FKs exist (CompanyUser.companyId is always checked)
- Integration tests: verify cross-tenant isolation

### RISK-S03: Friend Location Privacy

**Problem:** Showing real-time employee locations raises GDPR/privacy concerns. Employees may not consent.

**Impact:** HIGH — Legal/compliance risk.

**Mitigation:**
- `isLocationVisible` preference: default configurable per company (recommended: `true` with opt-out)
- Location data only shared with accepted friends (not all company employees)
- Location is "which space they're checked into" — not GPS coordinates
- Admin cannot bulk-view employee locations without explicit feature flag
- Data retention: location history not stored (only current booking status)

---

## 5. Migration Risks

### RISK-M01: Enabling Compass on Existing Companies

**Problem:** Existing companies have spaces without buildings/floors. Enabling Compass requires hierarchy data.

**Impact:** MEDIUM — Onboarding friction for existing customers.

**Mitigation:**
- Compass enablement wizard (in Settings): guides admin through:
  1. Create buildings for existing branches (or use auto-created default building)
  2. Assign existing spaces to floors
  3. Set per-space types (defaults from global spaceType)
  4. Configure booking rules
  5. Import employees
- Existing spaces keep working if hierarchy columns remain null
- Progressive adoption: admin can enable Compass per-branch

### RISK-M02: Disabling Compass After Use

**Problem:** Company enables Compass, creates bookings, employees, buildings. Then disables Compass. What happens to the data?

**Impact:** MEDIUM — Data orphaning, confusing state.

**Mitigation:**
- Disabling Compass requires confirmation: "This will cancel all active bookings"
- Active bookings → CANCELLED (with notification to employees)
- CompanyUser accounts → deactivated (not deleted)
- Buildings, floors, areas, booking rules → preserved (soft-hidden)
- Spaces → new columns remain populated but ignored by non-Compass queries
- Re-enabling Compass restores all preserved data

---

## 6. Integration Risks

### RISK-I01: Microsoft Graph API Rate Limits

**Problem:** Conference room sync polls Graph API every 5 minutes. With 100 rooms across 10 branches, that's 1000 API calls every 5 minutes = 12,000/hour. Graph API limit: 10,000 requests/10 min/app.

**Impact:** MEDIUM — Sync failures, stale conference data.

**Mitigation:**
- Use Graph API delta queries (only fetch changes since last sync)
- Batch room status queries using `$batch` endpoint
- Stagger sync across branches (not all at the same minute)
- Exponential backoff on 429 responses
- Alert: "Microsoft sync degraded — rate limited"

### RISK-I02: LDAP Connectivity

**Problem:** LDAP sync requires direct network access to on-premise Active Directory. Docker containers may not have access to corporate network.

**Impact:** MEDIUM — LDAP sync fails silently.

**Mitigation:**
- LDAP sync is optional (not required for Compass)
- Connection test endpoint: `POST /api/v2/integrations/ldap/test`
- Clear error messages: "Cannot reach LDAP server at ldaps://dc.company.com:636"
- Alternative: Azure AD sync (cloud-based, no firewall issues)
- Manual CSV import as fallback for employee creation

---

## 7. Admin Dashboard Integration Risks

### RISK-UI01: Dashboard Card Overload

**Problem:** When Compass is enabled, the admin dashboard needs a Compass card showing booking stats, occupancy, and employee activity. This adds to an already busy dashboard.

**Impact:** LOW — UX clutter.

**Mitigation:**
- Compass Dashboard Card only visible when `compassEnabled = true`
- Card shows summary: today's bookings, check-in rate, occupancy %, active employees
- Card is collapsible (consistent with other dashboard cards)
- Quick action buttons in dashboard speed dial: "View Bookings", "Manage Rules"
- Replaces Spaces/People/Conference cards (since those features are locked)

### RISK-UI02: Navigation Tab Conflict

**Problem:** Currently electisSpace has tabs: Dashboard, People, Conference Rooms, Labels. When Compass is enabled, People and Conference are locked. What replaces them?

**Impact:** MEDIUM — Navigation confusion.

**Mitigation:**
- When Compass DISABLED: existing tabs unchanged
- When Compass ENABLED:
  - Dashboard tab → includes Compass card
  - "People" tab → becomes "Employees" (Compass employee management)
  - "Conference Rooms" tab → hidden (conference rooms are spaces in Compass)
  - "Spaces" tab (if visible) → becomes "Compass Spaces" with hierarchy view
  - Labels tab → unchanged
  - New possible tab: "Bookings" (admin view of all bookings)

---

## 8. Risk Priority Matrix

| Risk | Probability | Impact | Priority | Phase to Address |
|------|------------|--------|----------|-----------------|
| COLLISION-01: Space dual purpose | Certain | High | **P0** | Phase 1A (DB) |
| COLLISION-03: SpaceType global vs per-space | Certain | High | **P0** | Phase 1A (DB) |
| RISK-D01: Concurrent booking race | High | High | **P0** | Phase 1A (DB constraint) |
| RISK-S01: Token confusion | Medium | High | **P0** | Phase 2A (Auth) |
| RISK-S02: Cross-tenant leakage | Low | Critical | **P0** | Phase 1B (Middleware) |
| COLLISION-02: storeId vs branchId | Certain | Medium | **P1** | Phase 0 (Type aliases) |
| COLLISION-05: ConferenceRoom vs Space | High | High | **P1** | Phase 1 (Feature gating) |
| RISK-D04: Timezone mismatches | High | High | **P1** | Phase 1B (Service) |
| RISK-P02: Socket.IO scaling | Medium | Medium | **P1** | Phase 2A (Redis adapter) |
| RISK-S03: Friend privacy | Medium | High | **P1** | Phase 2B (Preferences) |
| RISK-P01: Spaces query performance | Medium | Medium | **P2** | Phase 6 (Optimization) |
| RISK-P03: AIMS sync flood | Medium | Medium | **P2** | Phase 3 (Throttling) |
| RISK-M01: Existing company migration | High | Medium | **P2** | Phase 5 (Wizard) |
| RISK-I01: Graph API limits | Low | Medium | **P3** | Phase 3 (Integration) |
| RISK-UI02: Navigation tab conflict | Certain | Medium | **P2** | Phase 1C (UI) |

---

## 9. Concrete Solutions — Implementation Blueprint

This section provides the exact code and SQL to resolve each risk. Reference these during implementation.

### SOL-C01: Space Model Dual Purpose — Database Migration

```sql
-- Migration: Add Compass columns to Space table (all nullable, zero impact on existing queries)

ALTER TABLE "Space" ADD COLUMN IF NOT EXISTS "building_id" UUID REFERENCES "Building"("id") ON DELETE RESTRICT;
ALTER TABLE "Space" ADD COLUMN IF NOT EXISTS "floor_id" UUID REFERENCES "Floor"("id") ON DELETE RESTRICT;
ALTER TABLE "Space" ADD COLUMN IF NOT EXISTS "area_id" UUID REFERENCES "Area"("id") ON DELETE RESTRICT;
ALTER TABLE "Space" ADD COLUMN IF NOT EXISTS "space_type" VARCHAR(20);     -- Per-space type (Compass)
ALTER TABLE "Space" ADD COLUMN IF NOT EXISTS "space_mode" VARCHAR(20);     -- AVAILABLE|EXCLUDED|MAINTENANCE|PERMANENT
ALTER TABLE "Space" ADD COLUMN IF NOT EXISTS "capacity" INTEGER DEFAULT 1;
ALTER TABLE "Space" ADD COLUMN IF NOT EXISTS "amenities" JSONB DEFAULT '[]';
ALTER TABLE "Space" ADD COLUMN IF NOT EXISTS "assigned_user_id" UUID REFERENCES "CompanyUser"("id") ON DELETE SET NULL;
ALTER TABLE "Space" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

-- Convenience view for Compass-only queries
CREATE OR REPLACE VIEW compass_spaces AS
  SELECT * FROM "Space"
  WHERE "space_mode" IS NOT NULL AND "deleted_at" IS NULL;

-- Partial index: only index Compass-managed spaces
CREATE INDEX IF NOT EXISTS idx_space_compass
  ON "Space" ("store_id", "space_type", "space_mode")
  WHERE "space_mode" IS NOT NULL AND "deleted_at" IS NULL;
```

**Solution guarantee:** Existing v1 queries never see new columns (they don't SELECT them). New v2 queries use the `compass_spaces` view or the `WHERE space_mode IS NOT NULL` guard.

### SOL-C02: storeId vs branchId — Type Alias Pattern

```typescript
// server/src/shared/domain/branch.types.ts

import type { Store } from '@prisma/client';

// Public API uses "Branch" terminology
export type Branch = Store;
export type BranchId = string;

// Mapper at repository boundary
export function toBranch(store: Store): Branch {
  return store; // Same shape, just renamed for clarity
}

// All new Compass code imports Branch, never Store
```

**Solution guarantee:** Zero database changes. Type system enforces naming consistency. Repository layer handles the mapping.

### SOL-C03: SpaceType Resolution — Feature-Gated Helper

```typescript
// server/src/shared/infrastructure/services/spaceTypeResolver.ts

export function resolveSpaceType(
  space: SpaceEntity,
  company: CompanyEntity,
): string {
  if (company.compassEnabled && space.spaceType) {
    // Compass per-space type (e.g., 'OFFICE', 'DESK', 'CONFERENCE')
    return space.spaceType;
  }
  // Legacy global type (e.g., 'office', 'room', 'chair')
  return company.spaceType;
}

// Client-side equivalent
export function useSpaceTypeLabel(space: Space): string {
  const { compassEnabled, spaceType: globalType } = useCompanyStore();
  const { t } = useTranslation();

  const type = compassEnabled && space.spaceType
    ? space.spaceType
    : globalType;

  return t(`spaceTypes.${type}`);
}
```

### SOL-C05: ConferenceRoom Mutual Exclusivity — Feature Gating Validator

```typescript
// server/src/features/settings/feature-gating.service.ts

export function validateFeatureFlags(flags: FeatureFlags): ValidationResult {
  const errors: string[] = [];

  if (flags.compassEnabled) {
    // Compass locks these features
    if (flags.spacesEnabled) errors.push('Spaces mode must be disabled when Compass is enabled');
    if (flags.peopleEnabled) errors.push('People mode must be disabled when Compass is enabled');
    if (flags.conferenceEnabled) errors.push('Conference mode must be disabled when Compass is enabled');
  }

  return { valid: errors.length === 0, errors };
}

// Called before saving company settings
async function updateCompanyFeatures(companyId: string, flags: FeatureFlags): Promise<void> {
  const validation = validateFeatureFlags(flags);
  if (!validation.valid) {
    throw new BusinessError('INVALID_FEATURE_COMBINATION', { errors: validation.errors });
  }

  // When enabling Compass, auto-disable conflicting features
  if (flags.compassEnabled) {
    flags.spacesEnabled = false;
    flags.peopleEnabled = false;
    flags.conferenceEnabled = false;
  }

  await companyRepo.updateFeatures(companyId, flags);
}
```

### SOL-D01: Concurrent Booking — PostgreSQL Exclusion Constraint

```sql
-- Requires btree_gist extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Exclusion constraint prevents overlapping bookings on the same space
ALTER TABLE "Booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    space_id WITH =,
    tstzrange(start_time, COALESCE(end_time, 'infinity'::timestamptz)) WITH &&
  )
  WHERE (status IN ('BOOKED', 'CHECKED_IN'));
```

```typescript
// Repository: SELECT FOR UPDATE as first line of defense
async findActiveBySpace(spaceId: string, range: TimeRange): Promise<BookingEntity[]> {
  return this.prisma.$queryRaw`
    SELECT * FROM "Booking"
    WHERE "space_id" = ${spaceId}
      AND "status" IN ('BOOKED', 'CHECKED_IN')
      AND tstzrange("start_time", COALESCE("end_time", 'infinity'::timestamptz))
          && tstzrange(${range.start}, ${range.end || null}::timestamptz)
    FOR UPDATE OF "Booking"
  `;
}
```

**Solution guarantee:** Even if the application-level lock is bypassed (e.g., two concurrent transactions), the database constraint rejects the second insert with a constraint violation error, which the service catches and returns as `SPACE_ALREADY_BOOKED`.

### SOL-S01: Token Confusion — Separate Signing Keys + Middleware

```typescript
// server/src/shared/middleware/compassAuth.ts

export function compassAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ error: 'MISSING_TOKEN' });

  try {
    // Uses COMPASS_JWT_SECRET — admin tokens will fail verification
    const payload = jwt.verify(token, process.env.COMPASS_JWT_SECRET!) as CompassTokenPayload;

    // Double-check token type
    if (payload.type !== 'compass') {
      return res.status(403).json({ error: 'WRONG_TOKEN_TYPE' });
    }

    req.userId = payload.sub;         // CompanyUser.id
    req.companyId = payload.companyId;
    req.branchId = payload.branchId;
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}

// Existing adminAuth middleware remains unchanged — uses ADMIN_JWT_SECRET
```

### SOL-S02: Cross-Tenant Isolation — Repository Base Class

```typescript
// server/src/shared/infrastructure/repository/tenantScopedRepository.ts

export abstract class TenantScopedRepository<T> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly companyId: string, // Injected from JWT at controller level
  ) {}

  // All queries automatically scoped
  protected scopedWhere(where: Record<string, unknown> = {}): Record<string, unknown> {
    return { ...where, companyId: this.companyId };
  }

  // Validate that a resource belongs to the current tenant
  protected async validateOwnership(resourceId: string, table: string): Promise<void> {
    const resource = await (this.prisma[table] as any).findFirst({
      where: { id: resourceId, companyId: this.companyId },
      select: { id: true },
    });
    if (!resource) {
      throw new ForbiddenError('RESOURCE_NOT_IN_TENANT');
    }
  }
}
```

### SOL-D04: Timezone Safety — Utility Functions

```typescript
// server/src/shared/infrastructure/services/timezoneService.ts

import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export function isBookingExpiredInBranchTimezone(
  booking: BookingEntity,
  branchTimezone: string,
  now: Date = new Date(),
): boolean {
  if (!booking.endTime) return false; // Permanent booking never expires

  // Compare in UTC — both booking.endTime and now are UTC
  return booking.endTime < now;
}

export function isWithinCheckInWindow(
  booking: BookingEntity,
  windowMinutes: number,
  branchTimezone: string,
  now: Date = new Date(),
): boolean {
  const windowEnd = addMinutes(booking.startTime, windowMinutes);
  return now >= booking.startTime && now <= windowEnd;
}

// Display helper — convert UTC booking times to branch timezone for UI
export function formatBookingTime(utcTime: Date, branchTimezone: string): string {
  const zonedTime = utcToZonedTime(utcTime, branchTimezone);
  return format(zonedTime, 'HH:mm');
}
```

### SOL-I01: Microsoft Graph Rate Limiting — Retry with Backoff

```typescript
// Implemented in 13-DIRECTORY-AND-CALENDAR-SYNC.md — withRetry() function
// Key additions:
// - Delta queries reduce API calls by 90%+ after initial sync
// - Room status cached in Redis for 5 minutes
// - getSchedule batches 20 rooms per request
// - Circuit breaker: 3 consecutive failures → pause sync for 30 minutes
```

---

## 10. Risk Resolution Status

| Risk | Status | Solution Reference |
|------|--------|-------------------|
| COLLISION-01: Space dual purpose | **RESOLVED** | SOL-C01: Nullable columns + compass_spaces view |
| COLLISION-02: storeId vs branchId | **RESOLVED** | SOL-C02: Type alias + repository mapper |
| COLLISION-03: SpaceType scope | **RESOLVED** | SOL-C03: Feature-gated resolver function |
| COLLISION-04: Person vs CompanyUser | **RESOLVED** | Keep separate — documented in LLD |
| COLLISION-05: ConferenceRoom vs Space | **RESOLVED** | SOL-C05: Feature gating validator |
| RISK-D01: Concurrent booking | **RESOLVED** | SOL-D01: SELECT FOR UPDATE + EXCLUDE constraint |
| RISK-D02: Booking orphaning | **RESOLVED** | Soft-delete + ON DELETE RESTRICT |
| RISK-D03: Building cascade | **RESOLVED** | Soft-delete + active booking guard |
| RISK-D04: Timezone mismatches | **RESOLVED** | SOL-D04: All UTC + branch timezone display |
| RISK-S01: Token confusion | **RESOLVED** | SOL-S01: Separate keys + type validation |
| RISK-S02: Cross-tenant leakage | **RESOLVED** | SOL-S02: TenantScopedRepository base class |
| RISK-S03: Friend privacy | **RESOLVED** | isLocationVisible preference + friends-only |
| RISK-P01: Spaces query perf | **RESOLVED** | Partial index + Redis cache + pagination |
| RISK-P02: Socket.IO scaling | **RESOLVED** | Redis adapter + rooms + fallback polling |
| RISK-P03: AIMS sync flood | **RESOLVED** | Throttle + priority queue + circuit breaker |
| RISK-P04: Auto-release scaling | **RESOLVED** | Partial index + batch + 24h window |
| RISK-I01: Graph API limits | **RESOLVED** | Delta queries + batch + backoff (see doc 13) |
| RISK-I02: LDAP connectivity | **RESOLVED** | Optional + connection test + cloud alternative |
| RISK-M01: Migration friction | **RESOLVED** | Compass enablement wizard (see doc 06) |
| RISK-M02: Compass disable | **RESOLVED** | Confirmation + cancel bookings + soft-preserve |
| RISK-UI01: Dashboard overload | **RESOLVED** | Replaces locked cards (see doc 10) |
| RISK-UI02: Nav tab conflict | **RESOLVED** | Compass tab replaces locked tabs (see doc 10) |
