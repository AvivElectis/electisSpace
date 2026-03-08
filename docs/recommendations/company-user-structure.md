# Company / Branch / User Structure — Current State & Recommendations

> Research document for agents — electisSpace Compass workspace management
> Date: 2026-03-07

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Industry Benchmark](#2-industry-benchmark)
3. [Gap Analysis](#3-gap-analysis)
4. [Recommended Data Model](#4-recommended-data-model)
5. [Migration Strategy](#5-migration-strategy)

---

## 1. Current State Analysis

### 1.1 Company Model

```
Company
├── id, name, code (3+ uppercase letters, AIMS identifier)
├── location (free text), description
├── AIMS credentials (baseUrl, cluster, username, passwordEnc)
├── settings (JSON blob):
│   ├── companyFeatures: { spacesEnabled, peopleEnabled, conferenceEnabled, ... }
│   ├── spaceType: 'office' | 'room' | 'chair' | 'person-tag'
│   └── solumArticleFormat, solumMappingConfig
├── compassEnabled, compassConfig (JSON)
├── isActive
└── Relations: stores[], buildings[], companyUsers[], bookingRules[], integrations[]
```

**Issues:**
- `location` is a free-text string — no structured address, timezone, or geo data
- No industry, size, or billing fields
- `settings` is an untyped JSON blob — easy to corrupt, hard to query
- `compassConfig` has booking rules baked into the company, duplicating `BookingRule` model
- No concept of **departments**, **teams**, **cost centers**, or **organizational units**
- `code` is AIMS-specific — couples identity to one integration

### 1.2 Store (Branch) Model

```
Store (Branch)
├── id, companyId, name, code (numeric: "01", "002")
├── settings (JSON blob):
│   ├── storeFeatures (override of company features)
│   └── storeSpaceType (override of space type)
├── timezone, locale, syncEnabled, lastAimsSyncAt
├── status: ACTIVE | MAINTENANCE | OFFLINE | ARCHIVED
├── isActive
└── Relations: spaces[], people[], conferenceRooms[], bookings[], companyUsers[]
```

**Issues:**
- No structured **address** (street, city, country, lat/lng)
- No **capacity** (total desks, max occupancy)
- No **operating hours** or **working days** config
- No **contact person** or **facilities manager** assignment
- `code` is numeric-only — AIMS-specific constraint leaking into the model
- Store ≈ Branch ≈ Office Location — naming is inconsistent across codebase
- No concept of **parking**, **amenities**, or **services** at the branch level

### 1.3 User Model (Platform Users)

```
User (Admin/Manager — electisSpace platform login)
├── id, email, passwordHash
├── firstName, lastName, phone, avatarUrl
├── globalRole: PLATFORM_ADMIN | APP_VIEWER (nullable)
├── activeCompanyId, activeStoreId (last selection)
├── isActive, lastLogin, lastActivity, loginCount
├── failedLoginAttempts, lockedUntil (brute-force protection)
├── passwordChangedAt, passwordResetRequired
├── suspendedAt, suspendedReason, suspendedById
├── preferences (JSON)
└── Access via: UserCompany[] → Role, UserStore[] → Role + features[]
```

**Issues:**
- No **department**, **team**, **job title**, or **manager** fields
- `preferences` is untyped JSON — no schema for notification prefs, locale, theme
- No **profile picture upload** (avatarUrl exists but no upload flow)
- No **SSO identifier** (externalId for SAML/OIDC mapping)
- `globalRole` only has 2 values — not extensible for future roles (e.g., BILLING_ADMIN)
- No **invitation status** (pending, accepted, expired)

### 1.4 CompanyUser Model (Compass Employees)

```
CompanyUser (Compass mobile app user)
├── id, companyId, branchId
├── buildingId, floorId, areaId (home location)
├── email, phone, displayName, avatarUrl
├── role: EMPLOYEE | MANAGER | ADMIN
├── isActive
├── preferences (JSON), externalId
├── linkedUserId (optional link to platform User)
└── Relations: bookings[], permanentSpaces[], friendships[]
```

**Issues:**
- **Duplicates User fields** (email, phone, displayName, avatarUrl)
- No **department** or **team** assignment
- No **job title**, **employee ID**, or **cost center**
- No **work schedule** (which days in-office, remote days)
- No **booking preferences** (preferred floor, near window, standing desk)
- `role` is too coarse — only 3 values, no custom roles
- No **group/team membership** model for neighborhood booking
- `branchId` locks employee to single branch — no multi-site access
- No **check-in history** or **attendance summary** on the model

### 1.5 Space Hierarchy

```
Company
└── Building (companyId, storeId)
    └── Floor (buildingId)
        └── Area (floorId, type: WING | ZONE | DEPARTMENT | SECTION)
            └── Space (storeId, buildingId?, floorId?, areaId?)
```

**Issues:**
- Building is scoped to both `companyId` AND `storeId` — confusing dual ownership
- No **space type taxonomy** beyond `AreaType` (no desk vs room vs booth vs parking)
- Space has no explicit `type` field (inferred from company `spaceType` setting)
- No **amenity/equipment** model — `compassAmenities` is a string array on Space
- No **parking spot** entity
- No **resource/equipment** booking (projectors, monitors, lockers)
- `FloorPlan` exists but is disconnected from interactive booking UX
- No **neighborhood** concept (team-based desk grouping)

### 1.6 Booking Model

```
Booking
├── id, companyUserId, spaceId, branchId, companyId
├── title, startTime, endTime (nullable for permanent)
├── status: BOOKED | CHECKED_IN | RELEASED | AUTO_RELEASED | CANCELLED | NO_SHOW
├── checkedInAt, releasedAt, autoReleased
├── bookedBy (string — admin indicator), notes
```

**Issues:**
- No **recurrence** (daily, weekly, custom patterns)
- No **booking type** (hot desk, permanent, meeting, event)
- No **attendees/participants** (only single user per booking)
- No **catering/services** attached to bookings
- `bookedBy` is a plain string — should FK to the admin user who made it
- No **approval workflow** (pending → approved → booked)
- No **waitlist** mechanism
- No **delegation** (book on behalf of someone else with proper tracking)

### 1.7 Access Control

```
Role
├── scope: SYSTEM | COMPANY
├── permissions: JSON { [resource]: [action][] }
└── Linked via: UserCompany.roleId, UserStore.roleId

UserCompany: userId + companyId + roleId + allStoresAccess
UserStore: userId + storeId + roleId + features[]
```

**Issues:**
- Two-level role assignment (company + store) is good but `features[]` on UserStore is a JSON array of strings — not validated
- No **permission inheritance** (company role → auto-grants to all stores)
- No **custom permission sets** per feature (e.g., "can book for others" vs "can only book for self")
- No **group-based access** (assign a role to a team/department, not individual users)
- No **time-based access** (temporary access, contractor expiry)

---

## 2. Industry Benchmark

Based on analysis of Robin, OfficeSpace, Skedda, Envoy, YAROOMS, Kadence, Tactic, deskbird, and Archie:

### 2.1 Organizational Structure (Industry Standard)

| Entity | Description | Used By |
|--------|-------------|---------|
| **Organization** | Top-level tenant (billing, SSO) | All platforms |
| **Location/Office** | Physical office site with address, timezone, capacity | All platforms |
| **Building** | Multi-building campuses | Robin, OfficeSpace, YAROOMS |
| **Floor** | Vertical division within building | All platforms |
| **Zone/Neighborhood** | Logical grouping on a floor (by team, dept, or purpose) | Robin, Skedda, Envoy, deskbird |
| **Department** | Organizational unit (HR, Engineering, Sales) | OfficeSpace, Kadence, Envoy |
| **Team** | Smaller unit within department | Robin, Kadence, deskbird |
| **Cost Center** | Financial allocation unit | OfficeSpace, Planon, Spacewell |

### 2.2 Space Types (Industry Standard)

| Space Type | Features | Used By |
|------------|----------|---------|
| **Desk** (hot desk, assigned, hotel) | Amenities, monitor count, standing/sitting | All platforms |
| **Meeting Room** | Capacity, AV equipment, catering | All platforms |
| **Phone Booth** | Sound-isolated, single occupancy | Robin, Envoy, YAROOMS |
| **Collaboration Zone** | Open area, no booking required | OfficeSpace, Skedda |
| **Parking Spot** | EV charging, covered/uncovered, size | YAROOMS, Envoy, Kadence |
| **Locker** | Personal storage assignment | Robin, Envoy |
| **Equipment** | Projectors, monitors, adapters | YAROOMS, Skedda |

### 2.3 User Structure (Industry Standard)

| Field | Description | Used By |
|-------|-------------|---------|
| **Department** | Organizational unit membership | All enterprise platforms |
| **Team** | Sub-unit within department | Robin, Kadence |
| **Job Title** | Role description | OfficeSpace, Envoy |
| **Manager** | Reporting hierarchy (for approvals) | OfficeSpace, Kadence |
| **Home Location** | Default office/floor/zone | Robin, deskbird |
| **Work Schedule** | In-office days, remote days | Kadence, deskbird, Tactic |
| **Booking Preferences** | Preferred zone, near colleague, amenity needs | Robin (AI-powered) |
| **Cost Center** | Budget allocation for space usage | OfficeSpace, Planon |
| **Employee ID** | HR system identifier | All enterprise platforms |
| **Access Groups** | Zone/floor access permissions | Skedda, Envoy |

### 2.4 Booking Features (Industry Standard)

| Feature | Description | Used By |
|---------|-------------|---------|
| **Recurring Bookings** | Daily/weekly/custom repeat patterns | All platforms |
| **Multi-attendee** | Invite colleagues to a booking | Robin, OfficeSpace |
| **Approval Workflow** | Manager approval for certain spaces | OfficeSpace, Skedda |
| **Waitlist** | Queue when space is full | YAROOMS, Kadence |
| **Book on Behalf** | Admin/EA books for someone else | Robin, Envoy, YAROOMS |
| **Neighborhood Booking** | Book near teammates automatically | Robin (AI), Kadence |
| **Check-in Methods** | QR code, NFC, WiFi, Bluetooth, manual | All platforms |
| **Catering/Services** | Attach services to room bookings | YAROOMS, Planon |
| **Visitor Booking** | Reserve desk/room for external visitor | Envoy, Robin |

### 2.5 Analytics (Industry Standard)

| Metric | Description |
|--------|-------------|
| **Occupancy Rate** | % of available spaces actually used |
| **Booking vs Show Rate** | Booked vs actually checked-in (no-show %) |
| **Peak Hours/Days** | When office is busiest |
| **Space Utilization** | Per-floor, per-zone, per-space-type usage |
| **Department Usage** | Which departments use office most |
| **Cost per Seat** | Real estate cost allocated by actual usage |
| **Trend Analysis** | Week-over-week, month-over-month patterns |

---

## 3. Gap Analysis

### Critical Gaps (Must Have)

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| G1 | No **Department** model | Cannot organize users by org unit, no neighborhood booking, no department-level analytics | **HIGH** |
| G2 | No **Team** model | Cannot group employees for proximity booking or team scheduling | **HIGH** |
| G3 | No **Space Type** on Space model | All spaces treated identically — no desk vs room vs booth distinction | **HIGH** |
| G4 | No **recurring bookings** | Employees must rebook daily — major UX friction | **HIGH** |
| G5 | CompanyUser locked to **single branch** | Multi-site employees cannot book across locations | **HIGH** |
| G6 | No structured **address** on Store/Branch | Cannot show on maps, calculate commute, or display in directory | **MEDIUM** |
| G7 | No **operating hours** on Store | Cannot enforce booking within business hours | **MEDIUM** |
| G8 | No **work schedule** on CompanyUser | Cannot show who's in-office which days | **MEDIUM** |

### Important Gaps (Should Have)

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| G9 | No **amenity/equipment** model | Cannot filter spaces by monitor, standing desk, etc. | **MEDIUM** |
| G10 | No **approval workflow** | All bookings auto-confirmed — no manager oversight for premium spaces | **MEDIUM** |
| G11 | No **visitor management** | No guest registration, badge printing, host notification | **MEDIUM** |
| G12 | No **parking** entity | Common enterprise need not addressed | **MEDIUM** |
| G13 | `bookedBy` is a string, not FK | Cannot track which admin made reservations | **LOW** |
| G14 | No **booking delegation** model | EAs cannot properly manage executive schedules | **LOW** |
| G15 | No **cost center** or billing | Cannot allocate space costs to departments | **LOW** |

### Nice-to-Have Gaps (Could Have)

| # | Gap | Impact |
|---|-----|--------|
| G16 | No **AI recommendations** | Cannot suggest optimal desks based on team proximity |
| G17 | No **locker/equipment** booking | Separate from desk booking |
| G18 | No **catering/services** on bookings | Meeting room catering orders |
| G19 | No **waitlist** mechanism | No queue for popular spaces |
| G20 | No **multi-attendee** bookings | Meeting rooms don't track participants |

---

## 4. Recommended Data Model

### 4.1 New: Department Model

```prisma
model Department {
  id          String   @id @default(uuid())
  companyId   String
  name        String   @db.VarChar(100)
  code        String?  @db.VarChar(20)    // HR, ENG, SALES
  parentId    String?                      // self-ref for sub-departments
  managerId   String?                      // FK to CompanyUser
  costCenter  String?  @db.VarChar(50)     // financial tracking
  color       String?  @db.VarChar(7)      // hex color for UI
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  parent      Department?  @relation("DeptHierarchy", fields: [parentId], references: [id])
  children    Department[] @relation("DeptHierarchy")
  manager     CompanyUser? @relation("DeptManager", fields: [managerId], references: [id])
  members     CompanyUser[] @relation("DeptMembers")
  neighborhoods Neighborhood[]

  @@unique([companyId, code])
  @@map("departments")
}
```

**Why:** Every enterprise space management tool organizes users by department. Enables per-department analytics ("Engineering uses 80% of Floor 3"), neighborhood auto-assignment, and approval routing.

### 4.2 New: Team Model

```prisma
model Team {
  id           String   @id @default(uuid())
  companyId    String
  departmentId String?
  name         String   @db.VarChar(100)
  leadId       String?                    // FK to CompanyUser
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
  id            String   @id @default(uuid())
  teamId        String
  companyUserId String
  joinedAt      DateTime @default(now())

  team          Team        @relation(fields: [teamId], references: [id], onDelete: Cascade)
  companyUser   CompanyUser @relation(fields: [companyUserId], references: [id], onDelete: Cascade)

  @@unique([teamId, companyUserId])
  @@map("team_members")
}
```

**Why:** Teams are the atomic unit for neighborhood booking (Robin's "sit near your team") and collaborative scheduling. A user can be on multiple teams.

### 4.3 New: Neighborhood Model

```prisma
model Neighborhood {
  id           String   @id @default(uuid())
  floorId      String
  departmentId String?                     // optional department affinity
  name         String   @db.VarChar(100)
  color        String?  @db.VarChar(7)
  description  String?  @db.VarChar(500)
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  floor        Floor       @relation(fields: [floorId], references: [id], onDelete: Cascade)
  department   Department? @relation(fields: [departmentId], references: [id])
  spaces       Space[]

  @@map("neighborhoods")
}
```

**Why:** Neighborhoods group desks on a floor by team/department affinity. This is how Robin, Skedda, and Envoy organize hot-desking zones. Different from `Area` (physical division) — a neighborhood is a logical grouping.

### 4.4 Enhanced: CompanyUser (Compass Employee)

Add these fields to the existing model:

```prisma
model CompanyUser {
  // ... existing fields ...

  // NEW: Organizational
  departmentId   String?                    // FK to Department
  jobTitle       String?  @db.VarChar(100)
  employeeId     String?  @db.VarChar(50)  // HR system ID
  managerId      String?                    // self-ref for reporting chain
  costCenter     String?  @db.VarChar(50)

  // NEW: Work Schedule
  workSchedule   Json?    // { mon: true, tue: true, wed: false, ... }
  defaultBranchId String?                   // preferred location

  // NEW: Multi-branch access
  // Replace single branchId with branchAccess[]
  // (or keep branchId as "home branch" and add additional access)

  // NEW: Booking Preferences (structured, not JSON blob)
  preferredFloorId  String?
  preferredAreaId   String?
  accessibilityNeeds String[] @default([]) // wheelchair, hearing loop, etc.

  // NEW: Relations
  department     Department? @relation("DeptMembers", fields: [departmentId], references: [id])
  manager        CompanyUser? @relation("ManagerReports", fields: [managerId], references: [id])
  directReports  CompanyUser[] @relation("ManagerReports")
  teamMemberships TeamMember[]
}
```

**Why:** Every competitor tracks department, job title, and manager hierarchy. Work schedule is critical for "who's in the office today" views (Kadence, deskbird). Multi-branch access is needed for enterprise employees who split time between offices.

### 4.5 Enhanced: Space — Add Explicit Type

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

model Space {
  // ... existing fields ...

  // NEW: Explicit space type (replaces company-level spaceType setting)
  spaceType       SpaceType   @default(DESK)

  // NEW: Neighborhood assignment
  neighborhoodId  String?
  neighborhood    Neighborhood? @relation(fields: [neighborhoodId], references: [id])

  // NEW: Capacity & amenities (structured)
  minCapacity     Int?         // for meeting rooms
  maxCapacity     Int?

  // NEW: Equipment/amenities relation
  amenities       SpaceAmenity[]
}
```

### 4.6 New: Amenity Model

```prisma
model Amenity {
  id          String   @id @default(uuid())
  companyId   String
  name        String   @db.VarChar(100)   // "External Monitor", "Standing Desk"
  nameHe      String?  @db.VarChar(100)   // Hebrew name
  icon        String?  @db.VarChar(50)    // MUI icon name
  category    String   @db.VarChar(50)    // EQUIPMENT, FURNITURE, ACCESSIBILITY, CONNECTIVITY
  isActive    Boolean  @default(true)

  company     Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  spaces      SpaceAmenity[]

  @@unique([companyId, name])
  @@map("amenities")
}

model SpaceAmenity {
  spaceId   String
  amenityId String
  quantity  Int      @default(1)

  space     Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  amenity   Amenity  @relation(fields: [amenityId], references: [id], onDelete: Cascade)

  @@id([spaceId, amenityId])
  @@map("space_amenities")
}
```

**Why:** Current `compassAmenities: String[]` is unstructured and untranslatable. A proper amenity model enables filtering ("show me desks with 2 monitors"), consistent naming, and i18n support.

### 4.7 Enhanced: Store (Branch) — Add Address & Hours

```prisma
model Store {
  // ... existing fields ...

  // NEW: Structured address
  addressLine1  String?  @db.VarChar(255)
  addressLine2  String?  @db.VarChar(255)
  city          String?  @db.VarChar(100)
  state         String?  @db.VarChar(100)
  postalCode    String?  @db.VarChar(20)
  country       String?  @db.VarChar(2)    // ISO 3166-1 alpha-2
  latitude      Float?
  longitude     Float?

  // NEW: Capacity
  totalDesks    Int?
  maxOccupancy  Int?

  // NEW: Operating hours (JSON for flexibility)
  operatingHours Json?   // { mon: { open: "08:00", close: "18:00" }, ... }
  workingDays    Json?   // { mon: true, tue: true, ..., sat: false, sun: false }

  // NEW: Contact
  facilityManagerId String?  // FK to User
}
```

### 4.8 Enhanced: Booking — Add Recurrence & Type

```prisma
enum BookingType {
  HOT_DESK       // temporary desk booking
  PERMANENT      // long-term assignment
  MEETING        // meeting room booking
  VISITOR        // guest desk reservation
  ADMIN_RESERVE  // admin-created reservation
}

model Booking {
  // ... existing fields ...

  // NEW: Type
  bookingType    BookingType   @default(HOT_DESK)

  // NEW: Recurrence
  recurrenceRule String?  @db.VarChar(255)  // iCal RRULE format
  recurrenceId   String?                     // parent booking ID for series
  isRecurrence   Boolean  @default(false)

  // NEW: Better admin tracking
  bookedById     String?                     // FK to User (admin who created)
  bookedOnBehalf Boolean  @default(false)

  // NEW: Attendees (for meeting rooms)
  attendees      BookingAttendee[]
}

model BookingAttendee {
  id            String   @id @default(uuid())
  bookingId     String
  companyUserId String?                     // internal attendee
  externalEmail String?  @db.VarChar(255)   // external attendee
  status        String   @default("PENDING") // PENDING, ACCEPTED, DECLINED

  booking       Booking     @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  companyUser   CompanyUser? @relation(fields: [companyUserId], references: [id])

  @@map("booking_attendees")
}
```

### 4.9 New: Visitor Model (Future)

```prisma
model Visitor {
  id            String   @id @default(uuid())
  companyId     String
  branchId      String

  // Visitor info
  fullName      String   @db.VarChar(200)
  email         String?  @db.VarChar(255)
  phone         String?  @db.VarChar(50)
  company       String?  @db.VarChar(100)  // visitor's company

  // Visit details
  hostId        String                      // FK to CompanyUser
  purpose       String?  @db.VarChar(255)
  visitDate     DateTime
  expectedArrival String? @db.VarChar(5)    // HH:MM
  expectedDeparture String? @db.VarChar(5)

  // Status
  status        String   @default("EXPECTED") // EXPECTED, CHECKED_IN, CHECKED_OUT, CANCELLED
  checkedInAt   DateTime?
  checkedOutAt  DateTime?
  badgeNumber   String?  @db.VarChar(20)

  // Space reservation
  bookingId     String?                      // optional desk/room booking

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("visitors")
}
```

---

## 5. Migration Strategy

### Phase 1: Foundation (Low Risk, High Value)

**Add to existing models without breaking changes:**

1. **Department model** — new table, optional FK on CompanyUser
2. **Team + TeamMember models** — new tables, no existing model changes
3. **Amenity + SpaceAmenity models** — new tables, replaces `compassAmenities` string array
4. **SpaceType enum + field on Space** — new field with default `DESK`, backfill from company `spaceType` setting
5. **Store address fields** — nullable additions to Store

**Estimated effort:** 3-5 days

### Phase 2: Enhanced Booking (Medium Risk)

1. **BookingType enum** on Booking — new field with default, no migration needed for existing data
2. **Recurrence fields** on Booking — nullable additions
3. **BookingAttendee model** — new table
4. **Neighborhood model** — new table, optional FK on Space
5. **bookedById FK** on Booking — replace string `bookedBy` with proper FK

**Estimated effort:** 5-8 days

### Phase 3: Organizational Depth (Larger Scope)

1. **CompanyUser enhancements** — department, jobTitle, managerId, workSchedule
2. **Multi-branch access** for CompanyUser — new junction table or expand branchId
3. **Store operating hours** — JSON field addition
4. **Visitor model** — new feature module
5. **Approval workflow** — new BookingApproval model

**Estimated effort:** 8-12 days

---

## Entity Relationship Diagram (Recommended)

```
Organization (Company)
├── Department[]
│   ├── Sub-departments (self-ref)
│   ├── Manager (CompanyUser)
│   └── Members (CompanyUser[])
├── Team[]
│   ├── Lead (CompanyUser)
│   └── Members (TeamMember → CompanyUser)
├── Location (Store/Branch)
│   ├── Address, Timezone, Operating Hours
│   ├── Building[]
│   │   └── Floor[]
│   │       ├── Area[] (physical zones)
│   │       ├── Neighborhood[] (logical groupings)
│   │       │   └── Spaces[]
│   │       └── FloorPlan
│   ├── Space[]
│   │   ├── SpaceType: DESK | MEETING_ROOM | PHONE_BOOTH | PARKING | ...
│   │   ├── Amenities (SpaceAmenity → Amenity)
│   │   └── Bookings[]
│   └── Visitors[]
├── CompanyUser[] (Employees)
│   ├── Department, Team[], Manager
│   ├── Home Location, Work Schedule
│   ├── Bookings[], Friendships[]
│   └── Booking Preferences
├── Amenity[] (company-wide amenity catalog)
├── BookingRule[]
└── IntegrationConfig[]
```

---

## Comparison Matrix: Current vs Recommended vs Industry

| Feature | Current | Recommended | Robin | OfficeSpace | Skedda | Envoy |
|---------|---------|-------------|-------|-------------|--------|-------|
| Departments | - | Phase 1 | Yes | Yes | - | Yes |
| Teams | - | Phase 1 | Yes | - | - | - |
| Neighborhoods/Zones | Area only | Phase 2 | Yes | Yes | Yes | Yes |
| Space Types | Company-level setting | Phase 1 | Yes | Yes | Yes | Yes |
| Amenity Model | String[] | Phase 1 | Yes | Yes | Yes | Yes |
| Recurring Bookings | - | Phase 2 | Yes | Yes | Yes | Yes |
| Multi-attendee | - | Phase 2 | Yes | Yes | - | - |
| Work Schedule | - | Phase 3 | - | - | - | Yes |
| Visitor Management | - | Phase 3 | Yes | - | - | Yes |
| Parking | - | Phase 1 (via SpaceType) | - | - | - | Yes |
| Approval Workflow | - | Phase 3 | - | Yes | Yes | - |
| Cost Centers | - | Phase 3 | - | Yes | - | - |
| AI Recommendations | - | Future | Yes | Yes | - | - |
| Check-in (QR/NFC) | NFC (ESL) | Current | Yes | Yes | Yes | Yes |

---

## Sources

- [People Managing People — 40 Best Hot Desk Booking Software (2026)](https://peoplemanagingpeople.com/tools/best-hot-desk-booking-software/)
- [YAROOMS — Space Management Software](https://www.yarooms.com/solutions/space-management)
- [Officely — 7 Must-Have Workspace Management Features](https://getofficely.com/blog/7-must-have-features-in-your-workspace-management-system)
- [OfficeSpace — Desk Booking Software](https://www.officespacesoftware.com/features/desk-booking/)
- [Robin — How to Choose Desk Booking Software](https://robinpowered.com/blog/how-to-choose-desk-booking-software-for-the-hybrid-office)
- [Skedda — What Is Desk Booking Software](https://www.skedda.com/insights/what-is-desk-booking-software)
- [Archie — Skedda vs Robin Comparison](https://archieapp.co/blog/skedda-vs-robin/)
- [Gable — Best Robin Alternatives (2026)](https://www.gable.to/blog/post/robin-alternatives)
- [Deskflex — Top 10 Workplace Management Tools (2026)](https://www.deskflex.com/blog/workplace-management-tools)
- [Flexwhere — 10 Best Hot Desk Booking Software (2026)](https://flexwhere.com/best-hot-desk-booking-software)
