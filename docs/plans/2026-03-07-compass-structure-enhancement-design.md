# Compass Structure Enhancement — Full Design Document

**Date:** 2026-03-07
**Authors:** Aviv Ben Waiss + Claude Opus 4.6
**Status:** Approved
**Branch:** `claude/space-management-redesign-7ANoQ`

---

## 1. Scope & Constraints

### What This Plan Covers
Integration of organizational structure, space taxonomy, amenities, recurring bookings, work hours, and branch addresses into the existing compass feature — across server, admin UI, and mobile app.

### Hard Constraints
1. **Zero breaking changes** to existing electisSpace features (spaces, people, conference, labels, AIMS sync, import/export)
2. **All schema changes are additive** — new tables or nullable columns only
3. **Existing data preserved** — migration backfills with sensible defaults
4. **Existing API contracts unchanged** — new endpoints only, no breaking changes to existing ones
5. **Compass mobile app backwards-compatible** — old app versions work until force-updated

### Integration Points with Existing Architecture
- Extends `docs/architecture/compass/17-IMPLEMENTATION-TODO.md` (adds Phase 21-24)
- Extends `docs/architecture/SPACE-MANAGEMENT-REDESIGN.md` Section 3 (Org Hierarchy) and Section 4 (Space Model)
- Follows patterns from `docs/architecture/compass/05-LOW-LEVEL-DESIGN.md`
- Follows `docs/architecture/compass/08-CLEAN-CODE-GUIDELINES.md`

---

## 2. Phase 21: Company Work Configuration + Store Address

> **Why first:** Company/Store config is foundational — operating hours affect booking validation, address affects branch display everywhere.

### 2.1 Database Changes

#### Company — New Fields (all nullable, no migration risk)
```prisma
model Company {
  // ... existing fields unchanged ...

  // NEW: Work week configuration
  workWeekStart     Int?      @default(0)    // 0=Sunday, 1=Monday, ... 6=Saturday
  workWeekEnd       Int?      @default(4)    // 0=Sun..6=Sat (inclusive)
  workingDays       Json?     // { "0": false, "1": true, "2": true, "3": true, "4": true, "5": true, "6": false }
                              // Keys are day-of-week (0=Sun), values are boolean
  workingHoursStart String?   @db.VarChar(5) // "08:00" (HH:MM, 24h)
  workingHoursEnd   String?   @db.VarChar(5) // "17:00"
  defaultTimezone   String?   @db.VarChar(50) // e.g., "Asia/Jerusalem"
  defaultLocale     String?   @db.VarChar(10) // "en" or "he"
}
```

#### Store (Branch) — New Fields
```prisma
model Store {
  // ... existing fields unchanged ...

  // NEW: Structured address
  addressLine1    String?   @db.VarChar(255)
  addressLine2    String?   @db.VarChar(255)
  city            String?   @db.VarChar(100)
  state           String?   @db.VarChar(100)
  postalCode      String?   @db.VarChar(20)
  country         String?   @db.VarChar(2)   // ISO 3166-1 alpha-2 ("IL", "US")
  latitude        Float?
  longitude       Float?

  // NEW: Capacity
  totalDesks      Int?
  maxOccupancy    Int?

  // NEW: Operating hours (overrides company defaults if set)
  workingDays     Json?     // same format as Company.workingDays — overrides if set
  workingHoursStart String? @db.VarChar(5)
  workingHoursEnd   String? @db.VarChar(5)
}
```

### 2.2 Resolution Chain: Work Hours

```
Effective working hours for a branch:
  Store.workingHoursStart ?? Company.workingHoursStart ?? "08:00"
  Store.workingHoursEnd   ?? Company.workingHoursEnd   ?? "17:00"
  Store.workingDays       ?? Company.workingDays       ?? { 0:false, 1:true, 2:true, 3:true, 4:true, 5:true, 6:false }
  Store.timezone          ?? Company.defaultTimezone    ?? "UTC"
```

### 2.3 Booking Validation Impact

Add to `ruleEngine.ts` — new resolved field:
```typescript
interface ResolvedRules {
  // ... existing fields ...
  workingHoursStart: string;   // "08:00"
  workingHoursEnd: string;     // "17:00"
  workingDays: Record<string, boolean>;  // { "0": false, "1": true, ... }
  enforceWorkingHours: boolean; // from BookingRule (default: false)
}
```

When `enforceWorkingHours` is true in a BookingRule:
- Reject bookings that start or end outside working hours
- Reject bookings on non-working days
- Admin reservations bypass this check (they already bypass all rules)

### 2.4 Server Changes

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add nullable fields to Company and Store |
| `server/src/features/companies/service.ts` | Accept new fields in create/update |
| `server/src/features/companies/types.ts` | Add Zod schemas for new fields |
| `server/src/features/compass-bookings/ruleEngine.ts` | Add work hours to resolved rules |
| `server/src/features/compass-bookings/service.ts` | Validate against work hours when enforced |
| `server/src/features/settings/controller.ts` | Accept work hours in settings update |

### 2.5 Admin UI Changes

| File | Change |
|------|--------|
| `CreateCompanyWizard.tsx` | Add work hours step (or extend features step) |
| `EditCompanyTabs.tsx` | Add "Work Hours" section to company settings |
| `StoreDialog.tsx` | Add address fields + work hours override toggle |
| Locales (EN + HE) | Add keys for all new fields |

### 2.6 Mobile App Changes

| File | Change |
|------|--------|
| `compass/src/features/booking/BookingDialog.tsx` | Show warning if booking falls outside working hours |
| `compass/src/features/profile/ProfilePage.tsx` | Show branch address |

### 2.7 Potential Issues & Mitigations

| Issue | Risk | Mitigation |
|-------|------|------------|
| Timezone handling in booking validation | HIGH | Always store UTC in DB, convert using branch timezone for display and work-hours check. Use `Intl.DateTimeFormat` on client. |
| Existing bookings violating new work hours | MEDIUM | Work hours enforcement is opt-in via BookingRule. Existing bookings are never retroactively invalidated. |
| Company has no work hours set yet | LOW | Default to 08:00-17:00, Sun-Thu (Israel) or Mon-Fri. Admin can change anytime. |
| Store timezone differs from company | LOW | Store timezone always wins for that branch. Clearly display timezone in booking confirmation. |

---

## 3. Phase 22: Organizational Structure (Departments + Teams)

> **Why second:** Departments/teams are needed before neighborhoods (Phase 23) and before enhanced user profiles.

### 3.1 Database Changes — New Tables

```prisma
model Department {
  id          String   @id @default(uuid()) @db.Uuid
  companyId   String   @db.Uuid
  name        String   @db.VarChar(100)
  code        String?  @db.VarChar(20)      // "HR", "ENG", "SALES"
  parentId    String?  @db.Uuid             // self-ref for sub-departments
  managerId   String?  @db.Uuid             // FK to CompanyUser
  color       String?  @db.VarChar(7)       // "#FF5733" for UI
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  parent      Department?   @relation("DeptHierarchy", fields: [parentId], references: [id])
  children    Department[]  @relation("DeptHierarchy")
  manager     CompanyUser?  @relation("DeptManager", fields: [managerId], references: [id])
  members     CompanyUser[] @relation("DeptMembers")
  neighborhoods Neighborhood[]
  teams       Team[]

  @@unique([companyId, code])
  @@map("departments")
}

model Team {
  id           String   @id @default(uuid()) @db.Uuid
  companyId    String   @db.Uuid
  departmentId String?  @db.Uuid
  name         String   @db.VarChar(100)
  leadId       String?  @db.Uuid             // FK to CompanyUser
  color        String?  @db.VarChar(7)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company      Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  department   Department?  @relation(fields: [departmentId], references: [id])
  lead         CompanyUser? @relation("TeamLead", fields: [leadId], references: [id])
  members      TeamMember[]

  @@map("teams")
}

model TeamMember {
  id            String   @id @default(uuid()) @db.Uuid
  teamId        String   @db.Uuid
  companyUserId String   @db.Uuid
  role          String   @default("MEMBER") @db.VarChar(20) // MEMBER, LEAD
  joinedAt      DateTime @default(now())

  team          Team        @relation(fields: [teamId], references: [id], onDelete: Cascade)
  companyUser   CompanyUser @relation(fields: [companyUserId], references: [id], onDelete: Cascade)

  @@unique([teamId, companyUserId])
  @@map("team_members")
}
```

#### CompanyUser — New Fields (all nullable)
```prisma
model CompanyUser {
  // ... existing fields unchanged ...

  // NEW: Organizational
  departmentId     String?  @db.Uuid
  jobTitle         String?  @db.VarChar(100)
  employeeNumber   String?  @db.VarChar(50)   // HR system ID
  managerId        String?  @db.Uuid          // self-ref reporting chain
  costCenter       String?  @db.VarChar(50)

  // NEW: Work schedule
  workSchedule     Json?    // { "0": false, "1": true, "2": true, ... } in-office days
  isRemote         Boolean  @default(false)   // fully remote employee

  // NEW: Relations
  department       Department?  @relation("DeptMembers", fields: [departmentId], references: [id])
  manager          CompanyUser? @relation("ManagerReports", fields: [managerId], references: [id])
  directReports    CompanyUser[] @relation("ManagerReports")
  teamMemberships  TeamMember[]
  managedDepartments Department[] @relation("DeptManager")
  ledTeams         Team[]       @relation("TeamLead")
}
```

### 3.2 Server Feature Module: `compass-organization`

New feature module at `server/src/features/compass-organization/`:

```
compass-organization/
  types.ts          — Zod schemas for department/team CRUD
  service.ts        — Business logic (validate hierarchy, prevent cycles)
  repository.ts     — Prisma queries
  controller.ts     — HTTP handlers
  routes.ts         — Express router
```

#### API Endpoints

**Admin routes (Admin JWT):**
```
GET    /admin/compass/departments/:companyId           — List departments (tree)
POST   /admin/compass/departments/:companyId           — Create department
PUT    /admin/compass/departments/:companyId/:id        — Update department
DELETE /admin/compass/departments/:companyId/:id        — Delete (soft) department

GET    /admin/compass/teams/:companyId                  — List teams
POST   /admin/compass/teams/:companyId                  — Create team
PUT    /admin/compass/teams/:companyId/:id               — Update team
DELETE /admin/compass/teams/:companyId/:id               — Delete team
POST   /admin/compass/teams/:companyId/:id/members      — Add member
DELETE /admin/compass/teams/:companyId/:id/members/:uid  — Remove member
```

**Compass routes (Compass JWT) — read-only for employees:**
```
GET    /compass/departments        — List my company's departments
GET    /compass/teams              — List my teams
GET    /compass/teams/:id/members  — List team members
```

### 3.3 Admin UI Changes

New tab in CompassPage: **"Organization"** (between Employees and Rules)

| Component | What it shows |
|-----------|---------------|
| `CompassOrganizationTab.tsx` | Two sub-sections: Departments + Teams |
| Department section | Tree view (expandable), create/edit dialog, assign manager |
| Team section | List with member count, create/edit dialog, add/remove members |
| Employee dialog (existing) | Add department dropdown + job title + employee number fields |

### 3.4 Mobile App Changes

| Screen | Change |
|--------|--------|
| Profile page | Show department + job title |
| Find page | Add "My Team" filter chip (show spaces near team members) |
| Friends page | Show department badge next to friend names |

### 3.5 Potential Issues & Mitigations

| Issue | Risk | Mitigation |
|-------|------|------------|
| Circular department hierarchy (A→B→C→A) | HIGH | Validate in service: walk up parentId chain, reject if cycle detected. Max depth = 5. |
| Deleting department with members | MEDIUM | Soft-delete: set `isActive=false`. Members keep `departmentId` but it shows as "(Deleted)". Admin can reassign. |
| Employee in multiple teams | LOW | By design — TeamMember is many-to-many. UI shows all teams. |
| Performance: deep department tree | LOW | Max depth 5. Fetch entire tree in one query using recursive CTE or app-level tree building. |
| Directory sync (M365/Google) department mapping | MEDIUM | `NormalizedUser` already has `department: string`. Add mapping in sync service: match by name → create if not found. Phase 10 integration. |

---

## 4. Phase 23: Space Types + Amenities + Neighborhoods

> **Why third:** Depends on Department model from Phase 22 (neighborhoods have department affinity).

### 4.1 Database Changes — New Tables + Enums

```prisma
enum SpaceType {
  DESK
  MEETING_ROOM
  PHONE_BOOTH
  COLLABORATION_ZONE
  PARKING
  LOCKER
  EVENT_SPACE
}

model Amenity {
  id          String   @id @default(uuid()) @db.Uuid
  companyId   String   @db.Uuid
  name        String   @db.VarChar(100)      // "External Monitor"
  nameHe      String?  @db.VarChar(100)      // "מסך חיצוני"
  icon        String?  @db.VarChar(50)       // MUI icon name: "Monitor"
  category    String   @db.VarChar(50)       // EQUIPMENT, FURNITURE, ACCESSIBILITY, CONNECTIVITY
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  spaces      SpaceAmenity[]

  @@unique([companyId, name])
  @@map("amenities")
}

model SpaceAmenity {
  spaceId     String   @db.Uuid
  amenityId   String   @db.Uuid
  quantity    Int      @default(1)

  space       Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  amenity     Amenity  @relation(fields: [amenityId], references: [id], onDelete: Cascade)

  @@id([spaceId, amenityId])
  @@map("space_amenities")
}

model Neighborhood {
  id           String   @id @default(uuid()) @db.Uuid
  floorId      String   @db.Uuid
  departmentId String?  @db.Uuid              // optional department affinity
  name         String   @db.VarChar(100)
  color        String?  @db.VarChar(7)
  description  String?  @db.VarChar(500)
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  floor        Floor        @relation(fields: [floorId], references: [id], onDelete: Cascade)
  department   Department?  @relation(fields: [departmentId], references: [id])
  spaces       Space[]

  @@map("neighborhoods")
}
```

#### Space — New Fields
```prisma
model Space {
  // ... existing fields unchanged ...

  // NEW: Explicit space type (replaces company-level spaceType setting for compass)
  spaceType        SpaceType?                  // null = legacy (use company default)

  // NEW: Neighborhood
  neighborhoodId   String?    @db.Uuid
  neighborhood     Neighborhood? @relation(fields: [neighborhoodId], references: [id])

  // NEW: Capacity (structured — replaces compassCapacity for typed spaces)
  minCapacity      Int?                        // meeting rooms: minimum attendees
  maxCapacity      Int?                        // meeting rooms: maximum attendees

  // NEW: Amenities relation
  structuredAmenities SpaceAmenity[]
}
```

### 4.2 Migration Strategy for Existing Data

```sql
-- 1. Backfill spaceType from company settings
-- For compass-enabled companies, set spaceType based on company.settings.spaceType
UPDATE spaces s
SET space_type = CASE
  WHEN c.settings->>'spaceType' = 'office' THEN 'DESK'
  WHEN c.settings->>'spaceType' = 'room' THEN 'MEETING_ROOM'
  WHEN c.settings->>'spaceType' = 'chair' THEN 'DESK'
  ELSE 'DESK'
END
FROM stores st
JOIN companies c ON st.company_id = c.id
WHERE s.store_id = st.id
AND s.compass_mode IS NOT NULL;

-- 2. Migrate compassAmenities string[] to SpaceAmenity records
-- This is done in application code during migration:
-- For each space with compassAmenities:
--   For each amenity string:
--     Find or create Amenity record by name
--     Create SpaceAmenity junction record

-- 3. Copy compassCapacity to maxCapacity
UPDATE spaces SET max_capacity = compass_capacity WHERE compass_capacity IS NOT NULL;
```

**Important:** `compassAmenities` string[] field is NOT removed. It's kept as a fallback for backwards compatibility. New code reads from `SpaceAmenity` first, falls back to `compassAmenities`. Once all data is migrated, `compassAmenities` becomes read-only.

### 4.3 Server Changes

New feature module: `server/src/features/compass-amenities/`

**Admin API:**
```
GET    /admin/compass/amenities/:companyId         — List amenity catalog
POST   /admin/compass/amenities/:companyId         — Create amenity
PUT    /admin/compass/amenities/:companyId/:id      — Update amenity
DELETE /admin/compass/amenities/:companyId/:id      — Delete amenity

GET    /admin/compass/neighborhoods/:storeId        — List neighborhoods
POST   /admin/compass/neighborhoods/:storeId        — Create neighborhood
PUT    /admin/compass/neighborhoods/:storeId/:id     — Update neighborhood
DELETE /admin/compass/neighborhoods/:storeId/:id     — Delete neighborhood
```

**Compass routes (read-only):**
```
GET    /compass/amenities           — List amenities (for filter UI)
GET    /compass/neighborhoods       — List neighborhoods on current floor
```

**Changes to existing modules:**
- `compass-spaces/service.ts` — Add `spaceType` and `neighborhoodId` to space queries
- `compass-spaces/service.ts` — Add amenity-based filtering (`GET /spaces?amenities=monitor,standing`)
- `compass-spaces/repository.ts` — Join `SpaceAmenity` + `Amenity` in space queries
- Space creation endpoints — Accept `spaceType`, `neighborhoodId`, amenity IDs

### 4.4 AIMS Sync Impact

**CRITICAL:** The AIMS article builder must handle new space types correctly.

| SpaceType | AIMS Article Data |
|-----------|-------------------|
| DESK | `SPACE_TYPE=DESK`, standard compass fields |
| MEETING_ROOM | `SPACE_TYPE=MEETING_ROOM`, includes capacity, current meeting |
| PHONE_BOOTH | `SPACE_TYPE=PHONE_BOOTH`, simple status |
| PARKING | `SPACE_TYPE=PARKING`, vehicle/assignee info |
| COLLABORATION_ZONE | `SPACE_TYPE=COLLAB`, no booking status (always open) |

**File:** `server/src/shared/infrastructure/services/articleBuilder.ts`
- `buildSpaceArticle()` — Add `SPACE_TYPE` field from `space.spaceType`
- No breaking change: if `spaceType` is null, falls back to existing behavior

### 4.5 Admin UI Changes

| Component | Change |
|-----------|--------|
| `CompassSpacesTab.tsx` | Add Type column with dropdown, add Neighborhood column, add Amenities chips |
| New: `CompassAmenitiesTab.tsx` | Manage amenity catalog (name EN/HE, icon, category) |
| New: `CompassNeighborhoodsTab.tsx` | Manage neighborhoods per floor (name, color, department affinity) |
| `CompassPage.tsx` | Add "Amenities" and "Neighborhoods" as sub-tabs or sections |
| Space add/edit dialog | Add type dropdown, neighborhood dropdown, amenity multi-select |

### 4.6 Mobile App Changes

| Screen | Change |
|--------|--------|
| `FindPage.tsx` | Add filter chips: Type (Desk, Room, Booth), Amenities (multi-select), Neighborhood |
| `SpaceCard.tsx` | Show space type icon, amenity icons (up to 4), neighborhood badge |
| `BookingDialog.tsx` | Show space type + amenities in booking confirmation |
| `useSpacesStore.ts` | Add type/amenity/neighborhood filter params |

### 4.7 Potential Issues & Mitigations

| Issue | Risk | Mitigation |
|-------|------|------------|
| Amenity data duplication (string[] vs structured) | HIGH | Migration script converts existing data. New writes go to structured model. Read from structured first, fallback to string[]. |
| SpaceType null for legacy spaces | MEDIUM | Null means "use company default" — query resolves `space.spaceType ?? company.spaceType`. UI shows resolved type. |
| Too many amenities slowing queries | LOW | SpaceAmenity has composite PK, indexed on both FKs. Max ~20 amenities per space. |
| Neighborhood without department = no team affinity | LOW | Neighborhood-department link is optional. Without it, any team can book in any neighborhood. |
| AIMS sync for new space types | MEDIUM | Article builder already handles compass data. Just add `SPACE_TYPE` field. Non-compass companies unaffected. |

---

## 5. Phase 24: Recurring Bookings

> **Why last:** Most complex feature, depends on all previous phases being stable.

### 5.1 Database Changes

```prisma
enum BookingType {
  HOT_DESK        // standard desk booking
  MEETING         // meeting room booking
  ADMIN_RESERVE   // admin-created reservation
  PERMANENT       // permanent assignment (no end time)
}

model Booking {
  // ... existing fields unchanged ...

  // NEW: Booking type
  bookingType       BookingType  @default(HOT_DESK)

  // NEW: Recurrence
  recurrenceRule    String?   @db.VarChar(255)   // iCal RRULE: "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260401"
  recurrenceGroupId String?   @db.Uuid           // links all instances in a series
  isRecurrence      Boolean   @default(false)     // true for generated instances
  parentBookingId   String?   @db.Uuid           // FK to the "template" booking

  // NEW: Better admin tracking
  bookedById        String?   @db.Uuid           // FK to User (admin who created it)
}
```

### 5.2 Recurrence Logic

#### RRULE Examples
```
Every weekday (Mon-Fri):    FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
Every Mon/Wed/Fri:          FREQ=WEEKLY;BYDAY=MO,WE,FR
Every day for 2 weeks:      FREQ=DAILY;COUNT=10
Weekly on Tuesday:          FREQ=WEEKLY;BYDAY=TU
Monthly first Monday:       FREQ=MONTHLY;BYDAY=1MO
```

#### New Service: `RecurrenceService`
```
server/src/features/compass-bookings/recurrenceService.ts
```

```typescript
interface RecurrenceService {
  // Generate booking instances from RRULE
  generateInstances(params: {
    rrule: string;
    startTime: string;      // time of day: "09:00"
    endTime: string | null;  // time of day: "17:00" or null
    spaceId: string;
    companyUserId: string;
    companyId: string;
    branchId: string;
    maxInstances?: number;   // safety limit, default 90
  }): Promise<Date[]>;

  // Create a recurring booking series
  createRecurringSeries(params: {
    ...bookingParams;
    rrule: string;
  }): Promise<{ groupId: string; instances: Booking[]; conflicts: Date[] }>;

  // Cancel: single instance vs all future
  cancelInstance(bookingId: string): Promise<void>;
  cancelAllFuture(groupId: string, fromDate: Date): Promise<void>;

  // Modify: single instance vs all future
  modifyInstance(bookingId: string, changes: Partial<Booking>): Promise<Booking>;
  modifyAllFuture(groupId: string, fromDate: Date, changes: Partial<Booking>): Promise<Booking[]>;
}
```

#### Generation Strategy: **Materialized Instances**

Each recurrence generates actual `Booking` rows (not virtual). Advantages:
- Conflict detection works with existing booking queries
- Auto-release/no-show jobs work unchanged
- Simple cancel/modify for individual instances
- AIMS sync triggers per-instance

Disadvantages (mitigated):
- More rows in bookings table → Index on `[spaceId, startTime, status]` handles this
- Must limit max instances → Cap at 90 (3 months daily)

### 5.3 API Changes

**Compass routes (employee):**
```
POST   /bookings                      — Create booking (now accepts optional recurrenceRule)
DELETE /bookings/:id                  — Cancel single instance
DELETE /bookings/:id?scope=future     — Cancel this + all future instances
DELETE /bookings/:id?scope=all        — Cancel entire series
```

**Admin routes:**
```
POST   /admin/compass/bookings/:companyId  — Admin create (now accepts recurrenceRule)
```

**Existing endpoints unchanged** — `GET /bookings` returns individual instances as before.

### 5.4 Booking Creation Flow (with recurrence)

```
1. User selects space + time + recurrence pattern
2. Client sends: { spaceId, startTime, endTime, recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE" }
3. Server generates dates from RRULE (max 90 instances)
4. Server checks conflicts for ALL instances in parallel
5. If any conflict:
   a. Return { conflicts: [date1, date2], nonConflicting: [date3, date4, ...] }
   b. Client shows: "2 of 12 dates have conflicts. Book remaining 10?"
   c. User confirms → server creates only non-conflicting instances
6. All instances share same recurrenceGroupId
7. Each instance is a real Booking row with isRecurrence=true
8. Socket emits space:booked for each instance
```

### 5.5 Admin UI Changes

| Component | Change |
|-----------|--------|
| `CompassBookingsTab.tsx` | Show recurrence icon + group badge on recurring bookings. Add "Cancel Series" option. |
| Reserve dialog | Add recurrence picker: None / Daily / Weekly (day checkboxes) / Custom RRULE |

### 5.6 Mobile App Changes

| Screen | Change |
|--------|--------|
| `BookingDialog.tsx` | Add recurrence toggle + day selector (Mon-Sun checkboxes) + end date |
| `BookingsPage.tsx` | Group recurring instances visually. Show "Part of series" badge. |
| Cancel dialog | "Cancel this booking" vs "Cancel all future" vs "Cancel entire series" |
| `useBookingStore.ts` | Add `recurrenceRule` to create params, handle cancel scope |

### 5.7 RRULE Library

Use `rrule` npm package (well-maintained, 14M weekly downloads):
```bash
cd server && npm install rrule
```

### 5.8 Potential Issues & Mitigations

| Issue | Risk | Mitigation |
|-------|------|------------|
| Too many instances created at once | HIGH | Hard cap: 90 instances per series. RRULE `COUNT` or `UNTIL` required — reject infinite rules. |
| Transaction timeout for 90 conflict checks | HIGH | Batch conflict checks: query `WHERE spaceId = X AND startTime IN (date1, date2, ...)` in one query, not 90 separate queries. |
| Cancelling future instances while some are past | MEDIUM | Only cancel instances with `startTime > NOW()`. Past instances remain for history. |
| Auto-release job performance with more bookings | MEDIUM | Existing index on `[status, endTime]` handles this. Job already processes in batches. |
| AIMS sync flood from 90 bookings created | MEDIUM | Batch sync: don't emit 90 sync events. Instead, queue one sync per space (deduplicated by SyncQueueProcessor). |
| User modifies recurrence pattern mid-series | MEDIUM | "Modify all future": cancel future instances, create new series with modified RRULE from that date forward. |
| Work hours conflict with recurring pattern | LOW | Validate each generated date against work hours. Skip non-working days automatically. |

---

## 6. Cross-Cutting Concerns

### 6.1 Migration Safety

All migrations use this pattern:
```sql
-- Always nullable additions
ALTER TABLE companies ADD COLUMN IF NOT EXISTS work_week_start INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS working_hours_start VARCHAR(5);
-- etc.
```

Single migration per phase:
- `20260307_phase21_company_work_config` — Company + Store fields
- `20260307_phase22_org_structure` — Department + Team + TeamMember + CompanyUser fields
- `20260307_phase23_space_taxonomy` — SpaceType + Amenity + SpaceAmenity + Neighborhood + Space fields
- `20260307_phase24_recurring_bookings` — BookingType + recurrence fields on Booking

### 6.2 i18n Keys to Add

**English (`src/locales/en/common.json`):**
```json
{
  "compass": {
    "organization": {
      "title": "Organization",
      "departments": "Departments",
      "teams": "Teams",
      "addDepartment": "Add Department",
      "addTeam": "Add Team",
      "parentDepartment": "Parent Department",
      "manager": "Manager",
      "teamLead": "Team Lead",
      "members": "Members",
      "addMember": "Add Member",
      "jobTitle": "Job Title",
      "employeeNumber": "Employee Number",
      "costCenter": "Cost Center",
      "noMembers": "No members yet"
    },
    "workHours": {
      "title": "Work Hours",
      "workWeekStart": "Work Week Start",
      "workWeekEnd": "Work Week End",
      "workingHours": "Working Hours",
      "start": "Start",
      "end": "End",
      "workingDays": "Working Days",
      "outsideHoursWarning": "This booking is outside working hours",
      "enforceWorkingHours": "Enforce Working Hours"
    },
    "spaceTypes": {
      "DESK": "Desk",
      "MEETING_ROOM": "Meeting Room",
      "PHONE_BOOTH": "Phone Booth",
      "COLLABORATION_ZONE": "Collaboration Zone",
      "PARKING": "Parking",
      "LOCKER": "Locker",
      "EVENT_SPACE": "Event Space"
    },
    "amenities": {
      "title": "Amenities",
      "addAmenity": "Add Amenity",
      "category": "Category",
      "EQUIPMENT": "Equipment",
      "FURNITURE": "Furniture",
      "ACCESSIBILITY": "Accessibility",
      "CONNECTIVITY": "Connectivity"
    },
    "neighborhoods": {
      "title": "Neighborhoods",
      "addNeighborhood": "Add Neighborhood",
      "departmentAffinity": "Department Affinity"
    },
    "recurrence": {
      "title": "Repeat",
      "none": "Does not repeat",
      "daily": "Daily",
      "weekdays": "Every weekday",
      "weekly": "Weekly",
      "custom": "Custom",
      "endsOn": "Ends on",
      "conflicts": "{{count}} dates have conflicts",
      "bookRemaining": "Book remaining {{count}}",
      "cancelInstance": "Cancel this booking",
      "cancelFuture": "Cancel this and future bookings",
      "cancelSeries": "Cancel entire series",
      "partOfSeries": "Part of a series"
    },
    "address": {
      "title": "Address",
      "line1": "Address Line 1",
      "line2": "Address Line 2",
      "city": "City",
      "state": "State/Province",
      "postalCode": "Postal Code",
      "country": "Country",
      "capacity": "Capacity",
      "totalDesks": "Total Desks",
      "maxOccupancy": "Max Occupancy"
    },
    "bookingType": {
      "HOT_DESK": "Hot Desk",
      "MEETING": "Meeting",
      "ADMIN_RESERVE": "Admin Reserve",
      "PERMANENT": "Permanent"
    }
  }
}
```

**Hebrew keys follow same structure with Hebrew translations.**

### 6.3 Performance Optimizations

| Optimization | Phase | Details |
|-------------|-------|---------|
| Index: `departments(companyId, isActive)` | 22 | Fast department listing |
| Index: `team_members(companyUserId)` | 22 | Fast "my teams" query |
| Index: `amenities(companyId, isActive)` | 23 | Fast amenity catalog |
| Index: `space_amenities(amenityId)` | 23 | Reverse lookup: which spaces have monitor? |
| Index: `spaces(space_type, compass_mode)` | 23 | Filter by type + mode |
| Index: `bookings(recurrence_group_id)` | 24 | Fast series queries |
| Index: `bookings(space_id, start_time, status)` | 24 | Conflict detection for recurrence |
| Cache: Department tree per company (Redis, 5min TTL) | 22 | Avoid recursive queries |
| Cache: Amenity catalog per company (Redis, 10min TTL) | 23 | Rarely changes |

### 6.4 Existing Feature Safety Matrix

| Existing Feature | Phase 21 Impact | Phase 22 Impact | Phase 23 Impact | Phase 24 Impact |
|-----------------|-----------------|-----------------|-----------------|-----------------|
| Spaces (non-compass) | NONE | NONE | NONE (spaceType nullable) | NONE |
| People | NONE | NONE | NONE | NONE |
| Conference Rooms | NONE | NONE | NONE | NONE |
| Labels / ESL | NONE | NONE | NONE | NONE |
| AIMS Sync | NONE | NONE | Add SPACE_TYPE field (backwards-compatible) | NONE (dedup prevents flood) |
| Import/Export | NONE | NONE | NONE | NONE |
| Auth (admin) | NONE | NONE | NONE | NONE |
| Dashboard | NONE | NONE | NONE | NONE |
| Settings | Add work hours UI | NONE | NONE | NONE |
| Company Wizard | Add work hours step | NONE | NONE | NONE |

---

## 7. Implementation Order & Dependencies

```
Phase 21 (Company Work Config + Store Address)
  ├── No dependencies on other phases
  └── ~3 days

Phase 22 (Departments + Teams)
  ├── No dependencies on Phase 21
  ├── Can run in parallel with Phase 21
  └── ~4 days

Phase 23 (Space Types + Amenities + Neighborhoods)
  ├── Depends on Phase 22 (Department model for Neighborhood.departmentId)
  └── ~5 days

Phase 24 (Recurring Bookings)
  ├── Depends on Phase 23 (BookingType needs SpaceType context)
  └── ~5 days

Total: ~17 days (serial) or ~12 days (21+22 parallel)
```

---

## 8. Risks & Open Questions

### Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Work hours timezone mismatch causes wrong booking validation | HIGH | All dates stored as UTC. Convert to branch timezone for work-hours comparison. Unit test edge cases (DST transitions). |
| R2 | Recurring booking creates 90 rows, client timeout | HIGH | Use streaming or background job. Return `202 Accepted` with job ID. Poll for completion. |
| R3 | Department tree circular reference | HIGH | Validate on create/update: walk parentId chain, reject if cycle or depth > 5. |
| R4 | SpaceType migration for existing spaces | MEDIUM | Default null. Only compass-enabled spaces get backfilled. Non-compass spaces untouched. |
| R5 | Amenity migration from string[] | MEDIUM | Run as idempotent script. Can re-run safely. Keep string[] as fallback. |
| R6 | AIMS article builder changes break ESL display | MEDIUM | New SPACE_TYPE field is additive. Existing templates ignore unknown fields. Test with real AIMS. |
| R7 | Mobile app crashes on new fields in API response | LOW | New fields are optional in TypeScript types. Old app versions ignore unknown JSON fields. |

### Open Questions (for future discussion)

1. **Should neighborhoods auto-assign based on department?** (When employee is in Engineering dept, auto-suggest Engineering neighborhood desks)
2. **Should recurring bookings count against maxConcurrentBookings per instance or per series?** (Recommendation: per instance)
3. **Should parking spaces have vehicle registration tracking?** (Recommendation: Phase 25+)
4. **Should we support half-day work schedules?** (e.g., Sunday 08:00-13:00, Monday-Thursday 08:00-17:00)

---

## 9. Files to Create/Modify (Summary)

### New Files
| File | Phase |
|------|-------|
| `server/src/features/compass-organization/types.ts` | 22 |
| `server/src/features/compass-organization/service.ts` | 22 |
| `server/src/features/compass-organization/repository.ts` | 22 |
| `server/src/features/compass-organization/controller.ts` | 22 |
| `server/src/features/compass-organization/routes.ts` | 22 |
| `server/src/features/compass-amenities/types.ts` | 23 |
| `server/src/features/compass-amenities/service.ts` | 23 |
| `server/src/features/compass-amenities/repository.ts` | 23 |
| `server/src/features/compass-amenities/controller.ts` | 23 |
| `server/src/features/compass-amenities/routes.ts` | 23 |
| `server/src/features/compass-bookings/recurrenceService.ts` | 24 |
| `src/features/compass/presentation/CompassOrganizationTab.tsx` | 22 |
| `src/features/compass/presentation/CompassAmenitiesTab.tsx` | 23 |
| `src/features/compass/presentation/CompassNeighborhoodsTab.tsx` | 23 |
| `server/prisma/migrations/YYYYMMDD_phase21_*` | 21 |
| `server/prisma/migrations/YYYYMMDD_phase22_*` | 22 |
| `server/prisma/migrations/YYYYMMDD_phase23_*` | 23 |
| `server/prisma/migrations/YYYYMMDD_phase24_*` | 24 |

### Modified Files
| File | Phase | Change |
|------|-------|--------|
| `server/prisma/schema.prisma` | 21-24 | Add all new models + fields |
| `server/src/features/companies/service.ts` | 21 | Accept work hour fields |
| `server/src/features/companies/types.ts` | 21 | Add work hour Zod schemas |
| `server/src/features/compass-bookings/ruleEngine.ts` | 21 | Add work hours to resolved rules |
| `server/src/features/compass-bookings/service.ts` | 21, 24 | Work hours validation + recurrence |
| `server/src/features/compass-bookings/types.ts` | 24 | Add recurrence fields to schemas |
| `server/src/features/compass-bookings/controller.ts` | 24 | Handle recurrence in create |
| `server/src/features/compass-bookings/routes.ts` | 24 | Add cancel scope query param |
| `server/src/features/compass-spaces/service.ts` | 23 | Add type/amenity/neighborhood filters |
| `server/src/features/compass-spaces/repository.ts` | 23 | Join amenity tables |
| `server/src/features/compass-friends/repository.ts` | 22 | Include department in employee queries |
| `server/src/shared/infrastructure/services/articleBuilder.ts` | 23 | Add SPACE_TYPE field |
| `server/src/server.ts` | 22, 23 | Register new routes |
| `src/features/compass/presentation/CompassPage.tsx` | 22, 23 | Add new tabs |
| `src/features/compass/presentation/CompassSpacesTab.tsx` | 23 | Add type/neighborhood columns |
| `src/features/compass/presentation/CompassBookingsTab.tsx` | 24 | Recurrence UI |
| `src/features/compass/presentation/CompassEmployeesTab.tsx` | 22 | Dept/title fields |
| `src/features/compass/infrastructure/compassAdminApi.ts` | 22, 23, 24 | New API methods |
| `src/features/compass/domain/types.ts` | 22, 23, 24 | New TypeScript types |
| `src/features/settings/presentation/companyDialog/*` | 21 | Work hours step |
| `src/locales/en/common.json` | 21-24 | New translation keys |
| `src/locales/he/common.json` | 21-24 | New translation keys |
| `compass/src/features/booking/BookingDialog.tsx` | 21, 24 | Work hours warning, recurrence |
| `compass/src/features/booking/FindPage.tsx` | 23 | Type/amenity filters |
| `compass/src/features/booking/useSpacesStore.ts` | 23 | Filter params |
| `compass/src/features/booking/useBookingStore.ts` | 24 | Recurrence support |
| `compass/src/features/booking/BookingsPage.tsx` | 24 | Series grouping |
| `compass/src/features/profile/ProfilePage.tsx` | 21, 22 | Address, dept/title |
