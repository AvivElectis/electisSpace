# electisSpace & electisCompass — Space Management Redesign

## Architecture Plan v1.0

**Date:** 2026-03-04
**Author:** Aviv Ben Waiss + Claude Opus 4.6
**Status:** Draft — Awaiting Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Organizational Hierarchy](#3-organizational-hierarchy)
4. [Space Model Redesign](#4-space-model-redesign)
5. [Space Assignment Rules Engine](#5-space-assignment-rules-engine)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [electisCompass — User App Architecture](#7-electiscompass--user-app-architecture)
8. [External Integrations](#8-external-integrations)
9. [Database Schema Evolution](#9-database-schema-evolution)
10. [API Architecture](#10-api-architecture)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Company Onboarding Wizard](#12-company-onboarding-wizard)
13. [Competitor Analysis & Gap Assessment](#13-competitor-analysis--gap-assessment)
14. [Risks & Open Questions](#14-risks--open-questions)
15. [Implementation Phases](#15-implementation-phases)

---

## 1. Executive Summary

This document proposes a comprehensive redesign of the electisSpace platform from a simple ESL management system into a full **enterprise workspace management platform** with two distinct applications:

| App | Audience | Primary Use | Access Domain |
|-----|----------|-------------|---------------|
| **electisSpace** | Admins (Platform, Company, Branch) | Configuration, rules, monitoring, AIMS management | `app.solumesl.co.il` |
| **electisCompass** | End users (employees) | Space booking, check-in, friend-finding | `compass.solumesl.co.il` |

### Key Changes
- **Multi-tenant hierarchy**: Company → Branch (Store) → Floor → Area → Space
- **Space types**: Office (default), Desk, Conference Room, Phone Booth, Lounge — per space
- **Rules engine**: Time-based assignments, auto-release, batch operations
- **User app**: Mobile-first PWA with Capacitor (Android + iOS)
- **External sync**: Microsoft 365, Google Workspace, LDAP/AD for users and conference rooms

---

## 2. Current State Analysis

### Current Architecture Summary

```
Company (AIMS Organization)
  └── Store (AIMS Store Number)
       ├── Space (externalId, labelCode, dynamic JSON data)
       ├── Person (virtualSpaceId, assignedSpaceId, dynamic JSON data)
       └── ConferenceRoom (externalId, roomName, meeting status)
```

### Current Limitations

| Area | Current State | Limitation |
|------|--------------|------------|
| Space hierarchy | Flat — spaces belong directly to a store | No floors, areas, rooms, departments |
| Space types | Global setting per company (`office`/`room`/`chair`/`person-tag`) | Cannot mix types within a store |
| Assignments | Manual admin-only, permanent until changed | No time limits, no user self-service, no auto-release |
| Users | `Person` model with dynamic JSON data | No auth, no self-service, not an actual user account |
| Conference | Manual create/toggle | No calendar sync, no booking system |
| Rules | None | No policies, no batch rules |
| User app | None | Only admin interface exists |

### Current Data Model Strengths (Keep)
- Company/Store multi-tenancy already exists
- Role-based permissions with resource/action matrix
- Device token auth for mobile
- AIMS sync queue with retry logic
- Audit logging infrastructure
- SSE for real-time updates

---

## 3. Organizational Hierarchy

### New Hierarchy Model

```
Platform (electisSpace SaaS)
  └── Company (Customer organization)
       ├── Company Settings (global rules, defaults, integrations)
       └── Branch (= AIMS Store, physical location)
            ├── Branch Settings (overrides, local rules)
            ├── Floor (physical floor level)
            │    ├── Area/Zone (wing, department area, open space section)
            │    │    └── Space (individual bookable unit)
            │    └── Space (spaces not in an area)
            └── Space (spaces without floor assignment)
```

### Entity Definitions

| Entity | Description | Key Properties |
|--------|-------------|----------------|
| **Company** | Customer org, maps to AIMS organization | name, code, AIMS config, settings, integrations |
| **Branch** | Physical location, maps to AIMS store | name, code, address, timezone, floors[], settings |
| **Floor** | Physical floor level | number, name, prefix (for space numbering) |
| **Area** | Logical grouping within floor | name, type (wing/department/open-space/zone) |
| **Space** | Bookable unit | number, type, status, floor, area, capacity, amenities |

### Floor & Space Numbering

Floors define a **prefix** and **range** for automatic space numbering:

```
Floor 1 → prefix: "1", range: 100-199 → spaces: 100, 101, 102...
Floor 2 → prefix: "2", range: 200-299 → spaces: 200, 201, 202...
Floor G → prefix: "G", range: G01-G50 → spaces: G01, G02, G03...
```

This maps directly to AIMS article IDs (externalId).

### Batch Operations

- **Create floor with N spaces**: Admin specifies floor, prefix, count → system generates spaces
- **Assign area to range**: Select spaces 200-220 → assign to "Marketing Wing"
- **Change type for range**: Select spaces 300-310 → change from Office to Desk
- **Apply rules to range**: Select spaces 400-450 → set 4-hour max booking

---

## 4. Space Model Redesign

### Space Types (per-space, changeable)

| Type | Icon | Default Bookable | Capacity | ESL Template |
|------|------|-------------------|----------|--------------|
| `OFFICE` | 🏢 | Yes | 1 | Person name/dept |
| `DESK` | 🖥️ | Yes | 1 | Person name/dept (hot desk) |
| `CONFERENCE` | 🏛️ | Yes (time slots) | 2-50 | Meeting info |
| `PHONE_BOOTH` | 📞 | Yes | 1 | Availability |
| `LOUNGE` | 🛋️ | No (open) | N/A | Status |
| `STORAGE` | 📦 | No | N/A | Label only |
| `PARKING` | 🅿️ | Yes | 1 | Vehicle/person |

### Space Status

```
AVAILABLE → BOOKED → CHECKED_IN → RELEASED
                 ↓                    ↑
            AUTO_RELEASED ────────────┘
                 ↓
            NO_SHOW (if not checked in within window)
```

| Status | Meaning |
|--------|---------|
| `AVAILABLE` | Open for booking |
| `BOOKED` | Reserved, not yet occupied |
| `CHECKED_IN` | User is physically present |
| `RELEASED` | User left, space cleaning/cooldown |
| `EXCLUDED` | Not available for regular booking |
| `MAINTENANCE` | Temporarily out of service |
| `PERMANENT` | Assigned to a permanent employee |

### Space Exclusion Model

By default, all spaces are bookable. Admins can:

1. **Exclude** a space from general booking pool
2. **Assign permanently** to a specific employee (permanent spaces)
3. Excluded spaces can ONLY be assigned to permanent employees
4. Permanent employees bypass all booking rules

### Space Data Model (New)

```typescript
interface Space {
  id: string;                    // UUID
  branchId: string;              // FK → Branch (was storeId)
  floorId?: string;              // FK → Floor
  areaId?: string;               // FK → Area

  // Identity
  number: string;                // Display number ("101", "G03")
  externalId: string;            // AIMS article ID
  name?: string;                 // Optional friendly name ("Corner Office")

  // Type & Status
  type: SpaceType;               // OFFICE, DESK, CONFERENCE, etc.
  status: SpaceStatus;           // AVAILABLE, BOOKED, etc.
  isExcluded: boolean;           // Excluded from general pool

  // Configuration
  capacity: number;              // Seating capacity
  amenities: string[];           // ["monitor", "whiteboard", "phone"]

  // Current assignment
  currentBookingId?: string;     // FK → Booking
  permanentAssigneeId?: string;  // FK → CompanyUser (permanent assignment)

  // ESL
  labelCode?: string;
  templateName?: string;
  assignedLabels: string[];

  // AIMS sync
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
  data: Record<string, unknown>; // Dynamic AIMS data
}
```

---

## 5. Space Assignment Rules Engine

### Rule Hierarchy

Rules cascade: **Platform defaults → Company rules → Branch rules → Space overrides**

A lower-level rule overrides a higher-level one. Company admin sets rules at company level or for selected branches. Branch admin sets rules for their branch.

### Rule Types

#### 5.1 Time Rules

| Rule | Description | Default | Scope |
|------|-------------|---------|-------|
| `MAX_BOOKING_DURATION` | Maximum time a space can be booked | End of day (23:59 local) | Company/Branch/Space |
| `MIN_BOOKING_DURATION` | Minimum booking slot | 30 minutes | Company/Branch |
| `BOOKING_GRANULARITY` | Time slot increments | 30 minutes | Company/Branch |
| `ADVANCE_BOOKING_DAYS` | How far ahead users can book | 7 days | Company/Branch |
| `CHECK_IN_WINDOW` | Minutes after booking start to check in | 15 minutes | Company/Branch |
| `AUTO_RELEASE_ON_NO_SHOW` | Auto-release if not checked in | true | Company/Branch |
| `COOLDOWN_MINUTES` | Time between release and next availability | 0 minutes | Company/Branch |

#### 5.2 Access Rules

| Rule | Description | Default |
|------|-------------|---------|
| `ALLOW_SELF_BOOKING` | Users can book for themselves | true |
| `ALLOW_BOOKING_FOR_OTHERS` | Users can book for colleagues | false |
| `REQUIRE_APPROVAL` | Bookings need admin approval | false |
| `MAX_CONCURRENT_BOOKINGS` | Max active bookings per user | 1 |
| `RESTRICT_TO_FLOOR` | Users can only book on assigned floor | false |
| `RESTRICT_TO_AREA` | Users can only book in assigned area | false |

#### 5.3 Auto-Assignment Rules

| Rule | Description |
|------|-------------|
| `PREFER_SAME_FLOOR` | Auto-assign prefers user's assigned floor |
| `PREFER_NEAR_TEAM` | Auto-assign prefers spaces near team members |
| `PREFER_SAME_AREA` | Auto-assign prefers user's assigned area |
| `ROUND_ROBIN` | Distribute evenly across available spaces |
| `SEQUENTIAL` | Assign in numeric order |

### Rule Data Model

```typescript
interface BookingRule {
  id: string;
  companyId: string;
  branchId?: string;            // null = company-wide
  spaceId?: string;             // null = all spaces in scope

  // Targeting
  applyTo: 'ALL' | 'SELECTED_BRANCHES' | 'SELECTED_SPACES';
  targetBranchIds?: string[];   // When applyTo = SELECTED_BRANCHES
  targetSpaceTypes?: SpaceType[];

  // Rule definition
  ruleType: string;             // MAX_BOOKING_DURATION, CHECK_IN_WINDOW, etc.
  value: string | number | boolean;

  // Metadata
  createdBy: string;
  priority: number;             // Higher = takes precedence
  isActive: boolean;
}
```

### Rule Resolution Algorithm

```
1. Collect all active rules matching (companyId, branchId?, spaceId?, spaceType)
2. Group by ruleType
3. For each ruleType, pick the most specific rule:
   Space-level > Branch-level > Company-level > Platform default
4. Return resolved rule set
```

### Individual Space Overrides

Any rule can be overridden per individual space. For example:
- Company says `MAX_BOOKING_DURATION = end of day`
- Space 305 overridden to `MAX_BOOKING_DURATION = 4 hours` (meeting room)
- A booking for space 305 uses 4 hours, all others use end of day

---

## 6. Role-Based Access Control (RBAC)

### Role Hierarchy

```
PLATFORM_ADMIN          ← Electis staff, full system access
  └── COMPANY_ADMIN     ← Customer IT/facilities team
       └── BRANCH_ADMIN ← Branch/office manager (= current STORE_MANAGER)
            └── USER    ← Regular employee (electisCompass only)
```

### Permission Matrix

| Resource | PLATFORM_ADMIN | COMPANY_ADMIN | BRANCH_ADMIN | USER |
|----------|---------------|---------------|--------------|------|
| Companies | CRUD | Read own | — | — |
| Branches | CRUD | CRUD own | Read own | — |
| Floors/Areas | CRUD | CRUD own | CRUD own | — |
| Spaces | CRUD | CRUD own | CRUD own | Read available |
| Users (Admin) | CRUD | CRUD own company | CRUD own branch | — |
| Users (Employee) | CRUD | CRUD own company | CRUD own branch | Read self |
| Booking Rules | CRUD | CRUD own company | CRUD own branch | — |
| Bookings | CRUD | CRUD own company | CRUD own branch | CRUD own |
| AIMS Config | CRUD | Read/Edit own | — | — |
| Sync | Full | Trigger own | Trigger own | — |
| Integrations | Full | Configure own | — | — |
| Audit Logs | Full | Read own company | Read own branch | — |

### New Entities

**CompanyUser** — Employee/end-user, separate from admin `User`:

```typescript
interface CompanyUser {
  id: string;
  companyId: string;

  // Identity
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  phoneDialCode: string;         // Default: "+972" (Israel)
  avatarUrl?: string;

  // Organization
  branchId?: string;              // Primary branch
  floorId?: string;               // Assigned floor
  areaId?: string;                // Assigned area
  departmentId?: string;          // Department

  // Auth
  passwordHash: string;
  isActive: boolean;
  lastLogin?: Date;

  // External sync
  externalId?: string;            // LDAP/AD objectGUID or 365 ID
  externalSource?: 'LDAP' | 'AZURE_AD' | 'GOOGLE';

  // Preferences
  preferredSpaceType?: SpaceType;
  preferDarkTheme: boolean;       // Default: true
  language: string;               // Default: based on branch locale

  // Friends
  friendIds: string[];            // Other CompanyUser IDs
}
```

**Key decision**: `CompanyUser` (employee) is a SEPARATE model from `User` (admin). Rationale:
- Different auth flows (employees use email+code, admins use email+password+2FA)
- Different permissions models
- Different apps (Compass vs Space)
- Employees are far more numerous and come from LDAP/365 sync
- Prevents privilege escalation surface between apps

---

## 7. electisCompass — User App Architecture

### 7.1 App Overview

**Primary platform**: Mobile (Android/iOS via Capacitor)
**Secondary**: Web (responsive but mobile-first design)
**Theme**: Dark mode default, light mode toggle
**Design**: Large touch targets, accessible, minimal chrome

### 7.2 Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React 19 + Vite | Same build tooling as electisSpace |
| UI | MUI 7 (dark theme default) | Shared theme tokens with electisSpace |
| State | Zustand 5 | Same pattern as electisSpace |
| Forms | React Hook Form + Zod | Same pattern |
| Routing | React Router (HashRouter) | Same pattern |
| Mobile | Capacitor 7 (Android + iOS) | iOS added |
| i18n | i18next (EN + HE) | Same locales |
| Real-time | Socket.IO client | For live space status |

### 7.3 Project Structure

The Compass app lives in the **same repository** as electisSpace but as a separate Vite entry point:

```
electisSpace/
├── src/                          ← electisSpace (admin app)
├── compass/                      ← electisCompass (user app)
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/             ← Employee auth (email + code)
│   │   │   ├── booking/          ← Space booking & management
│   │   │   ├── checkin/          ← Check-in / check-out
│   │   │   ├── friends/          ← Friend finding & proximity
│   │   │   ├── profile/          ← User profile & preferences
│   │   │   └── requests/         ← Admin requests
│   │   ├── shared/
│   │   │   ├── components/       ← Mobile-first UI components
│   │   │   ├── hooks/
│   │   │   ├── theme/            ← Dark/light theme config
│   │   │   └── i18n/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts            ← Separate Vite config
│   └── capacitor.config.ts       ← Separate Capacitor config
├── shared/                       ← Code shared between both apps
│   ├── domain/                   ← Shared types, enums
│   ├── api/                      ← Shared API client setup
│   └── utils/                    ← Shared utilities
├── server/                       ← Single server serves both
```

### 7.4 User Screens (Mobile-First)

#### Home Screen (Dashboard)
```
┌──────────────────────────┐
│  🧭 electisCompass       │
│  Good morning, Aviv      │
│                          │
│  ┌────────────────────┐  │
│  │ 📍 Your Space      │  │
│  │ Office 204, Floor 2│  │
│  │ Until 18:00        │  │
│  │                    │  │
│  │ [CHECK IN]  [FREE] │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ 👥 Friends Nearby  │  │
│  │ • Dan — Office 203 │  │
│  │ • Noa — Office 210 │  │
│  │ 2 more on Floor 2  │  │
│  └────────────────────┘  │
│                          │
│  [🔍 Find Space]        │
│  [📋 My Bookings]       │
│                          │
│ ─── ─── ─── ─── ─── ─── │
│ 🏠  🔍  📋  👤          │
└──────────────────────────┘
```

#### Find Space Screen
```
┌──────────────────────────┐
│ ← Find a Space           │
│                          │
│ Branch: [Tel Aviv ▼]     │
│ Floor:  [Floor 2 ▼]     │
│ Type:   [Any ▼]          │
│                          │
│ ┌────────────────────┐   │
│ │ 🟢 Office 201      │   │
│ │ Floor 2, Area A    │   │
│ │ Available all day   │   │
│ │        [BOOK]      │   │
│ ├────────────────────┤   │
│ │ 🟢 Office 203      │   │
│ │ Floor 2, Area A    │   │
│ │ 🧑 Dan is nearby   │   │
│ │        [BOOK]      │   │
│ ├────────────────────┤   │
│ │ 🟡 Desk 215        │   │
│ │ Floor 2, Open Space│   │
│ │ Available until 14  │   │
│ │        [BOOK]      │   │
│ └────────────────────┘   │
│                          │
│ [🎲 AUTO-ASSIGN]        │
│                          │
│ ─── ─── ─── ─── ─── ─── │
│ 🏠  🔍  📋  👤          │
└──────────────────────────┘
```

### 7.5 Key Features

| Feature | Description |
|---------|-------------|
| **Book Space** | Select from available spaces, choose duration (within rules) |
| **Auto-Assign** | One-tap to get a space based on rules & preferences |
| **Check In** | Confirm arrival (required within check-in window) |
| **Release** | Free space early |
| **My Bookings** | List of current and upcoming bookings |
| **Friends** | See where friends are, find spaces near them |
| **Proximity** | Sort available spaces by distance to friend (same floor, numeric order) |
| **Requests** | Send requests to admins (change type, extend booking, etc.) |
| **Profile** | Preferences, dark/light theme, language |
| **Notifications** | Push for booking confirmations, reminders, releases |

### 7.6 Auth Flow (Employee)

```
1. Employee enters email
2. Server sends 6-digit code to email
3. Employee enters code
4. Server validates → issues access token + device token
5. Device token stored securely (Capacitor Preferences / httpOnly cookie)
6. Subsequent opens: device token → auto-login (no password needed)
7. Password exists for web fallback / admin-set password reset
```

### 7.7 Friend Proximity Algorithm

Friends are **not** located by map or GPS. Proximity is calculated by:

```
1. Get friend's current space (booked + checked in)
2. Get friend's floor and space number
3. Find available spaces on same floor
4. Sort by numeric distance: |availableSpace.number - friend.number|
5. Show "N spaces from [friend]" in results
```

If friend is on a different floor:
```
"Dan is on Floor 3 — 2 spaces available near him"
```

### 7.8 Offline Support

Compass should work offline for:
- Viewing current booking
- Viewing check-in status
- Caching last-known friend locations

Booking/releasing requires connectivity (show clear offline indicator).

---

## 8. External Integrations

### 8.1 Microsoft 365 / Azure AD Integration

#### Conference Room Sync
```
Company Settings → Integrations → Microsoft 365
  → OAuth2 consent (admin_consent)
  → Scopes: Calendars.Read, Place.Read.All, User.Read.All
  → Map room email ↔ Space (type=CONFERENCE)
  → Sync schedule: every 5 minutes (BullMQ cron job)
```

**Sync flow:**
1. Admin maps a Space (type=CONFERENCE) to a Microsoft 365 room resource email
2. Server polls Microsoft Graph API for room calendar events
3. Updates ConferenceRoom meeting status → triggers ESL update via AIMS
4. Two-way: local toggle also updates Graph API calendar (optional)

#### User Sync (LDAP / Azure AD)
```
Company Settings → Integrations → User Directory
  → Choose: Azure AD / LDAP / Google Workspace
  → Configure connection (tenant ID, client secret / LDAP bind DN)
  → Map fields: displayName → firstName+lastName, mail → email, department, etc.
  → Sync schedule: daily or on-demand
  → Branch assignment: by AD group, OU, or manual
```

**Sync behavior:**
- New users in AD → create CompanyUser (inactive until admin activates or auto-activate rule)
- Removed users in AD → deactivate CompanyUser (don't delete, for audit)
- Changed fields → update CompanyUser
- Password NOT synced (Compass uses email+code auth)

### 8.2 Google Workspace Integration

Same patterns as Microsoft 365, using:
- Google Calendar API for conference room sync
- Google Admin SDK Directory API for user sync
- OAuth2 with service account or user consent

### 8.3 LDAP Integration

Direct LDAP bind for on-premise Active Directory:
```
Server: ldaps://dc.company.com:636
Base DN: OU=Users,DC=company,DC=com
Bind DN: CN=electis-svc,OU=ServiceAccounts,...
Filter: (&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))
```

Field mapping configurable per company.

### 8.4 Integration Data Model

```typescript
interface Integration {
  id: string;
  companyId: string;
  type: 'MICROSOFT_365' | 'GOOGLE_WORKSPACE' | 'LDAP';

  // Connection
  config: {
    // Microsoft 365
    tenantId?: string;
    clientId?: string;
    clientSecretEnc?: string;     // Encrypted

    // Google
    serviceAccountKeyEnc?: string; // Encrypted
    domain?: string;

    // LDAP
    serverUrl?: string;
    baseDn?: string;
    bindDnEnc?: string;           // Encrypted
    bindPasswordEnc?: string;     // Encrypted
    userFilter?: string;
  };

  // Field mapping
  fieldMapping: {
    email: string;                // AD: mail, LDAP: mail
    firstName: string;            // AD: givenName
    lastName: string;             // AD: sn
    department?: string;          // AD: department
    phone?: string;               // AD: telephoneNumber
    branch?: string;              // How to determine branch (AD group, OU, field)
  };

  // Sync
  syncSchedule: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MANUAL';
  lastSyncAt?: Date;
  lastSyncStatus?: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  lastSyncStats?: { created: number; updated: number; deactivated: number };

  isActive: boolean;
}
```

### 8.5 Conference Room Mapping

```typescript
interface ConferenceRoomMapping {
  id: string;
  spaceId: string;                // FK → Space (type=CONFERENCE)
  integrationId: string;          // FK → Integration

  // External reference
  externalEmail: string;          // room@company.com
  externalId: string;             // Graph API resource ID

  // Field mapping for ESL
  fieldMapping: {
    meetingName: string;          // Graph: subject
    startTime: string;            // Graph: start.dateTime
    endTime: string;              // Graph: end.dateTime
    organizer: string;            // Graph: organizer.emailAddress.name
    participants: string;         // Graph: attendees[].emailAddress.name
  };

  syncEnabled: boolean;
}
```

---

## 9. Database Schema Evolution

### New Models (Prisma)

```prisma
// ======================
// Floors
// ======================
model Floor {
  id        String   @id @default(uuid())
  branchId  String   @map("branch_id")     // was storeId
  number    Int                              // Floor number (0, 1, 2, -1)
  name      String   @db.VarChar(50)        // "Ground Floor", "Floor 2"
  prefix    String   @db.VarChar(10)        // "G", "1", "2"
  rangeStart String? @map("range_start") @db.VarChar(20) // "100"
  rangeEnd   String? @map("range_end") @db.VarChar(20)   // "199"

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  branch    Store    @relation(fields: [branchId], references: [id], onDelete: Cascade)
  areas     Area[]
  spaces    Space[]

  @@unique([branchId, number])
  @@map("floors")
}

// ======================
// Areas / Zones
// ======================
model Area {
  id        String   @id @default(uuid())
  floorId   String   @map("floor_id")
  name      String   @db.VarChar(100)
  type      AreaType @default(ZONE)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  floor     Floor    @relation(fields: [floorId], references: [id], onDelete: Cascade)
  spaces    Space[]

  @@unique([floorId, name])
  @@map("areas")
}

enum AreaType {
  WING
  DEPARTMENT
  OPEN_SPACE
  ZONE
}

// ======================
// Space (Enhanced)
// ======================
// The existing Space model will be migrated to add:
// - floorId, areaId (optional FK)
// - type (SpaceType enum)
// - status (SpaceStatus enum)
// - number (display number)
// - isExcluded, capacity, amenities
// - permanentAssigneeId
// - currentBookingId

enum SpaceType {
  OFFICE
  DESK
  CONFERENCE
  PHONE_BOOTH
  LOUNGE
  STORAGE
  PARKING
}

enum SpaceStatus {
  AVAILABLE
  BOOKED
  CHECKED_IN
  RELEASED
  EXCLUDED
  MAINTENANCE
  PERMANENT
}

// ======================
// Company Users (Employees)
// ======================
model CompanyUser {
  id            String   @id @default(uuid())
  companyId     String   @map("company_id")

  email         String   @db.VarChar(255)
  passwordHash  String?  @map("password_hash") @db.VarChar(255)
  firstName     String   @map("first_name") @db.VarChar(100)
  lastName      String   @map("last_name") @db.VarChar(100)
  phone         String?  @db.VarChar(50)
  phoneDialCode String   @default("+972") @map("phone_dial_code") @db.VarChar(10)
  avatarUrl     String?  @map("avatar_url") @db.VarChar(500)

  // Organization
  branchId      String?  @map("branch_id")
  floorId       String?  @map("floor_id")
  areaId        String?  @map("area_id")
  department    String?  @db.VarChar(100)

  // Status
  isActive      Boolean  @default(true) @map("is_active")
  lastLogin     DateTime? @map("last_login")

  // External sync
  externalId    String?  @map("external_id") @db.VarChar(255)
  externalSource String? @map("external_source") @db.VarChar(20)

  // Preferences
  preferences   Json     @default("{}")

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  company       Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  bookings      Booking[]
  friendships   Friendship[] @relation("UserFriends")
  friendOf      Friendship[] @relation("FriendOf")
  deviceTokens  CompanyUserDeviceToken[]
  verificationCodes CompanyUserVerificationCode[]

  @@unique([companyId, email])
  @@index([companyId])
  @@index([branchId])
  @@index([externalId])
  @@map("company_users")
}

// ======================
// Bookings
// ======================
model Booking {
  id            String        @id @default(uuid())
  spaceId       String        @map("space_id")
  userId        String        @map("user_id")    // FK → CompanyUser
  branchId      String        @map("branch_id")

  // Time
  startTime     DateTime      @map("start_time")
  endTime       DateTime      @map("end_time")

  // Status
  status        BookingStatus @default(BOOKED)
  checkedInAt   DateTime?     @map("checked_in_at")
  releasedAt    DateTime?     @map("released_at")
  autoReleased  Boolean       @default(false) @map("auto_released")

  // Metadata
  bookedBy      String?       @map("booked_by")  // Admin who booked on behalf
  notes         String?       @db.VarChar(500)

  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  space         Space         @relation(fields: [spaceId], references: [id])
  user          CompanyUser   @relation(fields: [userId], references: [id])

  @@index([spaceId, startTime, endTime])
  @@index([userId])
  @@index([branchId, status])
  @@map("bookings")
}

enum BookingStatus {
  BOOKED
  CHECKED_IN
  RELEASED
  AUTO_RELEASED
  CANCELLED
  NO_SHOW
}

// ======================
// Booking Rules
// ======================
model BookingRule {
  id            String   @id @default(uuid())
  companyId     String   @map("company_id")
  branchId      String?  @map("branch_id")
  spaceId       String?  @map("space_id")

  ruleType      String   @map("rule_type") @db.VarChar(50)
  value         Json                              // Flexible value storage

  applyTo       RuleScope @default(ALL) @map("apply_to")
  targetBranchIds String[] @default([]) @map("target_branch_ids")
  targetSpaceTypes SpaceType[] @default([]) @map("target_space_types")

  priority      Int      @default(0)
  isActive      Boolean  @default(true) @map("is_active")
  createdById   String?  @map("created_by")

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  company       Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId, branchId])
  @@index([ruleType])
  @@map("booking_rules")
}

enum RuleScope {
  ALL
  SELECTED_BRANCHES
  SELECTED_SPACES
}

// ======================
// Friendships
// ======================
model Friendship {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  friendId  String   @map("friend_id")

  createdAt DateTime @default(now()) @map("created_at")

  user      CompanyUser @relation("UserFriends", fields: [userId], references: [id], onDelete: Cascade)
  friend    CompanyUser @relation("FriendOf", fields: [friendId], references: [id], onDelete: Cascade)

  @@unique([userId, friendId])
  @@map("friendships")
}

// ======================
// Integrations
// ======================
model Integration {
  id            String   @id @default(uuid())
  companyId     String   @map("company_id")
  type          IntegrationType

  config        Json     @default("{}")    // Encrypted sensitive fields
  fieldMapping  Json     @default("{}")

  syncSchedule  String   @default("DAILY") @map("sync_schedule") @db.VarChar(20)
  lastSyncAt    DateTime? @map("last_sync_at")
  lastSyncStatus String? @map("last_sync_status") @db.VarChar(20)
  lastSyncStats Json?    @map("last_sync_stats")

  isActive      Boolean  @default(true) @map("is_active")

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  company       Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  roomMappings  ConferenceRoomMapping[]

  @@unique([companyId, type])
  @@map("integrations")
}

enum IntegrationType {
  MICROSOFT_365
  GOOGLE_WORKSPACE
  LDAP
}

// ======================
// Conference Room Mapping (to external calendars)
// ======================
model ConferenceRoomMapping {
  id              String   @id @default(uuid())
  spaceId         String   @map("space_id")
  integrationId   String   @map("integration_id")

  externalEmail   String   @map("external_email") @db.VarChar(255)
  externalId      String   @map("external_id") @db.VarChar(255)
  fieldMapping    Json     @default("{}")
  syncEnabled     Boolean  @default(true) @map("sync_enabled")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  integration     Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)

  @@unique([spaceId])
  @@unique([integrationId, externalEmail])
  @@map("conference_room_mappings")
}

// ======================
// Admin Requests (from users)
// ======================
model AdminRequest {
  id            String        @id @default(uuid())
  companyId     String        @map("company_id")
  branchId      String?       @map("branch_id")
  requesterId   String        @map("requester_id")  // CompanyUser

  type          RequestType
  subject       String        @db.VarChar(200)
  description   String?       @db.Text
  relatedSpaceId String?      @map("related_space_id")

  status        RequestStatus @default(PENDING)
  resolvedById  String?       @map("resolved_by")    // Admin User
  resolvedAt    DateTime?     @map("resolved_at")
  resolution    String?       @db.Text

  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  @@index([companyId, status])
  @@index([requesterId])
  @@map("admin_requests")
}

enum RequestType {
  EXTEND_BOOKING
  CHANGE_SPACE_TYPE
  PERMANENT_ASSIGNMENT
  MAINTENANCE_REPORT
  GENERAL
}

enum RequestStatus {
  PENDING
  APPROVED
  DENIED
  RESOLVED
}
```

### Migration Strategy

The migration from current schema to new schema is **additive** — no destructive changes to existing tables:

1. **Phase 1**: Add new tables (Floor, Area, CompanyUser, Booking, BookingRule, etc.)
2. **Phase 2**: Add new columns to Space (floorId, areaId, type, status, etc.) with defaults
3. **Phase 3**: Migrate existing Space data (set type=OFFICE, status=AVAILABLE as defaults)
4. **Phase 4**: Existing ConferenceRoom data can be migrated to Space (type=CONFERENCE)
5. **Phase 5**: Existing Person data becomes seed data for CompanyUser (with admin review)

---

## 10. API Architecture

### API Versioning

All new endpoints under `/api/v2/`. Existing v1 endpoints remain for backward compatibility during migration.

### New API Endpoints

#### Compass User Auth
```
POST   /api/v2/compass/auth/login          # Email → send code
POST   /api/v2/compass/auth/verify          # Code → tokens
POST   /api/v2/compass/auth/device          # Device token auth
POST   /api/v2/compass/auth/refresh         # Refresh access token
POST   /api/v2/compass/auth/logout          # Revoke tokens
POST   /api/v2/compass/auth/forgot-password # Password reset flow
```

#### Spaces (Enhanced)
```
GET    /api/v2/branches/:branchId/spaces              # List with filters
GET    /api/v2/branches/:branchId/spaces/available     # Available spaces (for Compass)
GET    /api/v2/branches/:branchId/spaces/:id           # Get space details
POST   /api/v2/branches/:branchId/spaces               # Create space
POST   /api/v2/branches/:branchId/spaces/batch         # Batch create (floor setup)
PATCH  /api/v2/branches/:branchId/spaces/:id           # Update space
PATCH  /api/v2/branches/:branchId/spaces/batch-type    # Batch change type
DELETE /api/v2/branches/:branchId/spaces/:id           # Delete space
```

#### Floors & Areas
```
GET    /api/v2/branches/:branchId/floors               # List floors
POST   /api/v2/branches/:branchId/floors               # Create floor (with spaces)
PATCH  /api/v2/branches/:branchId/floors/:id           # Update floor
DELETE /api/v2/branches/:branchId/floors/:id           # Delete floor

GET    /api/v2/floors/:floorId/areas                    # List areas
POST   /api/v2/floors/:floorId/areas                    # Create area
PATCH  /api/v2/areas/:id                                # Update area
DELETE /api/v2/areas/:id                                # Delete area
```

#### Bookings
```
POST   /api/v2/bookings                                 # Create booking
GET    /api/v2/bookings/my                               # User's bookings (Compass)
GET    /api/v2/branches/:branchId/bookings              # Admin: branch bookings
POST   /api/v2/bookings/:id/check-in                    # Check in
POST   /api/v2/bookings/:id/release                     # Release / check out
POST   /api/v2/bookings/:id/extend                      # Extend booking
DELETE /api/v2/bookings/:id                              # Cancel booking
POST   /api/v2/bookings/auto-assign                     # Auto-assign space
```

#### Rules
```
GET    /api/v2/companies/:companyId/rules               # List rules
POST   /api/v2/companies/:companyId/rules               # Create rule
PATCH  /api/v2/rules/:id                                 # Update rule
DELETE /api/v2/rules/:id                                 # Delete rule
GET    /api/v2/branches/:branchId/resolved-rules        # Get effective rules
```

#### Company Users (Employees)
```
GET    /api/v2/companies/:companyId/employees            # List employees
POST   /api/v2/companies/:companyId/employees            # Create employee
PATCH  /api/v2/employees/:id                              # Update employee
DELETE /api/v2/employees/:id                              # Deactivate employee
POST   /api/v2/employees/batch-import                    # CSV import
```

#### Friends (Compass)
```
GET    /api/v2/compass/friends                            # List friends & locations
POST   /api/v2/compass/friends/:userId                    # Add friend
DELETE /api/v2/compass/friends/:userId                    # Remove friend
GET    /api/v2/compass/friends/nearby-spaces              # Available spaces near friends
```

#### Integrations
```
GET    /api/v2/companies/:companyId/integrations          # List integrations
POST   /api/v2/companies/:companyId/integrations          # Configure integration
PATCH  /api/v2/integrations/:id                            # Update
DELETE /api/v2/integrations/:id                            # Remove
POST   /api/v2/integrations/:id/sync                      # Trigger manual sync
GET    /api/v2/integrations/:id/status                    # Sync status
```

#### Admin Requests
```
POST   /api/v2/compass/requests                           # Create request (user)
GET    /api/v2/branches/:branchId/requests                # List requests (admin)
PATCH  /api/v2/requests/:id                                # Resolve request (admin)
```

### Real-Time Events (Socket.IO / SSE)

| Event | Direction | Data |
|-------|-----------|------|
| `space:status_changed` | Server → Client | { spaceId, newStatus, booking? } |
| `booking:created` | Server → Client | { booking } |
| `booking:checked_in` | Server → Client | { bookingId, spaceId } |
| `booking:released` | Server → Client | { bookingId, spaceId } |
| `booking:auto_released` | Server → Client | { bookingId, spaceId, reason } |
| `friend:location_changed` | Server → Client (Compass) | { friendId, spaceId?, floorId? } |

---

## 11. Deployment Architecture

### Production Setup

```
Internet
   │
   ▼
NPM (Nginx Proxy Manager)
   ├── app.solumesl.co.il    → electisspace-server:3000 (Admin App)
   └── compass.solumesl.co.il → electiscompass-server:3000 (User App)

                    Both ───→ electisspace-api:3000 (Shared API Server)
```

### Docker Compose Updates

```yaml
# docker-compose.app.yml (updated)
services:
  # Admin App — Nginx serving electisSpace SPA
  client:
    build:
      context: .
      dockerfile: client/Dockerfile
    container_name: electisspace-server
    ports:
      - "127.0.0.1:3071:3000"
    networks:
      - global-network

  # Compass App — Nginx serving electisCompass SPA
  compass:
    build:
      context: .
      dockerfile: compass/Dockerfile        # New Dockerfile
    container_name: electiscompass-server
    ports:
      - "127.0.0.1:3072:3000"              # Different host port
    networks:
      - global-network

  # Shared API Server
  server:
    build:
      context: .
      dockerfile: server/Dockerfile
    container_name: electisspace-api
    ports:
      - "127.0.0.1:3073:3000"              # Internal only
    networks:
      - global-network
```

### Server Architecture

The Express server serves **both** apps through the same API. App-specific middleware differentiates:

```typescript
// Compass endpoints use compass auth middleware
app.use('/api/v2/compass', compassAuthMiddleware, compassRoutes);

// Admin endpoints use admin auth middleware
app.use('/api/v2', adminAuthMiddleware, adminRoutes);

// Shared endpoints (same auth for both)
app.use('/api/v2/bookings', unifiedAuthMiddleware, bookingRoutes);
```

### Background Jobs (BullMQ)

| Job | Schedule | Description |
|-----|----------|-------------|
| `auto-release-bookings` | Every minute | Release bookings past endTime |
| `no-show-check` | Every 5 minutes | Mark no-shows past check-in window |
| `conference-room-sync` | Every 5 minutes | Pull calendar events from 365/Google |
| `user-directory-sync` | Configurable (daily default) | Sync users from LDAP/AD/365 |
| `aims-sync` | Existing | Push ESL updates to AIMS |
| `booking-reminders` | Every 15 minutes | Push notifications for upcoming bookings |

---

## 12. Company Onboarding Wizard

### Wizard Flow (Admin App)

```
Step 1: Company Details
  → Name, code, location, description

Step 2: AIMS Configuration
  → Base URL, cluster, credentials
  → Test connection

Step 3: Article Format & Mapping  ← THIS STEP IS CRITICAL
  → Fetch article format from AIMS
  → Set field mapping (SoluM fields ↔ display fields)
  → If this feature is chosen → other features disabled
  → Only AIMS Manager enabled alongside

Step 4: Feature Selection
  → Enable: Spaces, People, Conference, Labels
  → If Article Format was set in Step 3 → only AIMS Manager available

Step 5: Branch Setup
  → Add branches (stores) with codes
  → Configure floors and initial spaces per branch

Step 6: Integration (Optional)
  → Microsoft 365 / Google Workspace / LDAP
  → Conference room mapping
  → User sync configuration

Step 7: Admin Users
  → Create company admin
  → Create branch admins (optional)

Step 8: Review & Activate
  → Summary of all settings
  → Activate company
```

### The "Article Format Lock"

When a company chooses the article format/mapping feature (Step 3):
- All other features (spaces management, booking, conference, people) are **disabled**
- Only **AIMS Manager** remains enabled — for direct label/article management
- This is for customers who use AIMS for pure ESL content management (retail, logistics)
- The lock can be toggled later in company settings (with confirmation dialog)

---

## 13. Competitor Analysis & Gap Assessment

### Market Context

Only 40% of companies now have a 1:1 employee-to-desk ratio (down from 56%), and 60% of North American companies have adopted some form of desk sharing. Assigned seating has declined from 83% to 55%, while desk-sharing models have increased from 12% to 36%. This creates strong demand for intelligent space management.

### Key Competitors

| Platform | Positioning | Best For |
|----------|-------------|----------|
| **Robin** | AI-powered desk recommendations, team neighborhoods | Mid-market tech companies |
| **Envoy** | All-in-one (desks + visitors + rooms + deliveries) | Consolidated workplace tools |
| **Skedda** | Rules engine, flexible policies, visual floor plans | Universities, multi-use facilities |
| **Kadence** | Hybrid team coordination, AI scheduling | Real estate optimization |
| **Deskbird** | Simple UX, EU compliance, 200+ integrations | European, privacy-focused orgs |
| **Joan** | Hardware-first e-ink room display panels | Physical room signage |
| **Condeco/Eptura** | Enterprise recurring bookings, MS Copilot AI | Large enterprises (500+) |
| **OfficeSpace** | Full facility mgmt: moves, assets, scenario planning | Complex multi-location portfolios |

### Feature Comparison

| Feature | Robin | Envoy | Skedda | Deskbird | Condeco | **electisCompass** |
|---------|-------|-------|--------|----------|---------|---------------------|
| Desk booking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Planned |
| Interactive floor plans | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ Phase 2+ |
| Check-in / no-show | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ Planned |
| Auto-assign (AI) | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ Planned |
| Friend finding / proximity | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ Planned |
| Calendar integration (365/Google) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Planned |
| LDAP/AD/SCIM user sync | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ Planned |
| **ESL / e-ink label integration** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ **Unique** |
| Mobile app (native feel) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Planned |
| Analytics / utilization | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ Phase 2+ |
| Slack/Teams bot | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ Phase 3+ |
| Visitor management | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ Consider |
| Parking management | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ Planned (type) |
| Recurring bookings | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ Phase 2 |
| Desk amenity filtering | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ Planned |
| Team neighborhoods/zones | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ Planned (Areas) |
| Reverse hoteling | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ Consider |
| SSO (SAML 2.0) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ Phase 2 |
| Waitlist | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ Consider |
| Room display hardware | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ **Unique (ESL)** |

### Unique Competitive Advantage: ESL Integration

electisCompass's **killer differentiator** is real-time physical display on Electronic Shelf Labels. No competitor in the desk booking space offers this. The ESL integration means:

1. **Physical space signage** — Every desk/room shows its current status on an e-ink display (no power, always visible)
2. **No tablet/screen needed** — Unlike Joan's dedicated hardware, SoluM ESLs are cheaper and battery-powered
3. **Real-time updates** — Booking changes push to physical labels within seconds
4. **Wayfinding** — Labels help visitors and employees find their assigned space physically

This positions electisCompass uniquely at the intersection of **workplace software** and **IoT/smart building hardware**.

### Features Worth Further Consideration

#### High Value — Recommend for Phase 2

| Feature | Rationale | Competitor Reference |
|---------|-----------|---------------------|
| **Interactive Floor Plans** | Industry standard. Upload floor plan image, drag-drop spaces. Color-coded availability (green/red/yellow). This is the #1 expected feature. | Robin, Envoy, Skedda, Deskbird all have this |
| **Recurring Bookings** | "Every Monday, 9-18, Office 204." Needed for hybrid patterns. Smart conflict resolution (auto-find alternative). | Condeco excels here |
| **Analytics & Reports** | Utilization heatmaps, peak hours, popular floors. Decision support for facilities and real estate optimization. | All top competitors offer this |
| **Booking Delegation** | Executive assistants booking for managers. Common enterprise need. | Robin, Condeco |
| **SSO (SAML 2.0)** | Enterprise standard. Users auth via corporate IdP (Entra ID, Okta). Eliminates separate credentials. | Universal among enterprise competitors |
| **SCIM 2.0 Provisioning** | Auto-create/disable user accounts from HR systems. Eliminates manual user management. | Robin, Envoy, Deskbird |
| **Desk Amenity Filtering** | Filter by: dual monitors, standing desk, wheelchair accessible, quiet zone. Enhances booking UX. | Deskbird stands out here |

#### Medium Value — Consider for Phase 3

| Feature | Rationale |
|---------|-----------|
| **Slack/Teams Bot** | Book from chat: `@compass book me a desk near Dan on Floor 2`. Dramatically increases adoption. |
| **Reverse Hoteling** | Assigned desks auto-released to pool when owner is away, returned when they come back. |
| **Waitlist** | When all spaces full, join waitlist for next availability notification. |
| **Visitor Management** | Pre-register visitors, assign temporary spaces, NDA signing. |
| **AI Desk Suggestions** | ML-based recommendations from booking history, team schedules, preferences. |
| **Capacity Limits** | Floor/area capacity limits (fire safety compliance). |
| **Quick Re-book** | One tap to repeat yesterday's/last week's booking. High UX value. |

#### Low Priority — Not in Scope

| Feature | Rationale |
|---------|-----------|
| Health attestation | Post-COVID, declining demand |
| Catering/amenity booking | Out of scope for space management |
| Room AV control | Complex IoT integration |
| Move management | Enterprise facility management niche |
| Sensor/IoT occupancy | Hardware dependency, complex deployment |

### Bugs & Issues in Current Plan

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 1 | **No conflict resolution for concurrent bookings** | High | Use database-level `SELECT FOR UPDATE` or advisory locks when creating bookings to prevent double-booking. Race condition when 2 users book same space simultaneously. |
| 2 | **Friend proximity by numeric order is naive** | Medium | Works for sequential numbering but fails for non-numeric IDs (G01, G02). Add a `sortOrder: Int` column on spaces for proper proximity calculation. |
| 3 | **Permanent employees + excluded spaces ambiguity** | Medium | Clarify: Can a permanent employee also book non-permanent spaces? **Recommendation: Yes** — permanent assignment is their "default" but they can also book elsewhere. |
| 4 | **No timezone handling for multi-region companies** | High | Each branch has timezone. All booking times must be stored in UTC, displayed in branch timezone. All BullMQ jobs must resolve against branch timezone for end-of-day rules. |
| 5 | **Conference rooms dual identity** | Medium | Currently ConferenceRoom is separate model. In new system, CONFERENCE is a SpaceType. Migration needed. Old ConferenceRoom data → Space(type=CONFERENCE). Keep backward compat during transition. |
| 6 | **Auto-release ESL update** | Medium | When a booking auto-releases, the ESL must update. Ensure auto-release BullMQ job triggers AIMS sync queue item. |
| 7 | **CompanyUser vs Person migration** | High | Existing Person records (used for ESL people tags) are NOT the same as CompanyUser (employee accounts). Keep Person model for ESL-only use cases, CompanyUser for auth/booking. |
| 8 | **Device token security for Compass** | Medium | CompanyUser device tokens must be separate from admin User device tokens. Different table, different validation, different expiry. |
| 9 | **Rate limiting on Compass auth** | High | Employee app will have many users. Rate limit login/verify endpoints aggressively (5 attempts/minute per email). Use Redis-backed rate limiter, not in-memory. |
| 10 | **No booking history/audit** | Medium | Bookings should never be hard-deleted. Use status (CANCELLED, RELEASED) to preserve history for analytics. Add `deletedAt` soft-delete pattern. |
| 11 | **Privacy controls for friend-finding** | High | Users MUST opt-in to being visible. GDPR/privacy compliance requires explicit consent. Add `isLocationVisible: boolean` to CompanyUser preferences. Default: true (can be changed per company policy). |
| 12 | **Floor plan initial setup burden** | Medium | Interactive floor plans require significant admin effort to set up. Consider phased approach: Phase 1 uses list-based space selection, Phase 2 adds visual floor plans. |
| 13 | **Microsoft Graph API rate limits** | Medium | High-volume conference room sync (hundreds of rooms, 5-min intervals) may hit Graph API throttling (10,000 requests per 10 minutes per app). Implement exponential backoff and delta queries. |
| 14 | **Stale availability display** | Medium | If real-time updates lag, users see available desks that are already booked. Use optimistic locking on space status + Socket.IO push for instant status changes. Show "last updated X seconds ago" indicator. |
| 15 | **No cancellation policy** | Low | Consider: Can users cancel without penalty? Should there be a minimum notice period? For Phase 1, allow free cancellation. Add policy rules in Phase 2. |
| 16 | **Missing "who's in the office" view** | Medium | Competitor research shows this is a top-3 requested feature. Beyond friend-finding, users want to see a general "X people on Floor 2 today" count. Add branch/floor occupancy counts to Compass home screen. |

---

## 14. Risks & Open Questions

### Architectural Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema migration on production DB | High — downtime | Use zero-downtime migrations: additive first, backfill, then switch |
| Two apps sharing one server | Medium — coupling | Clear API versioning, separate auth middleware, feature flags |
| Capacitor iOS (new platform) | Medium — unknown issues | Start with Android (existing), add iOS after stabilization |
| LDAP network connectivity | Medium — firewall issues | LDAP connector should run as optional service, not block main server |
| BullMQ job scaling | Low — current volume is small | Monitor queue depth, add workers if needed |

### Open Questions (Require Product Decision)

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Should CompanyUser passwords be required? | A) Optional (code-only auth) B) Required | **A) Optional** — email+code is sufficient, password as fallback |
| 2 | Can users see all company branches or only their assigned one? | A) All B) Only assigned C) Configurable | **C) Configurable** — rule per company |
| 3 | Should auto-assign consider space type preference? | A) Yes B) No, always DESK | **A) Yes** — store preference in CompanyUser |
| 4 | How to handle booking conflicts during AIMS sync? | A) Booking wins B) AIMS wins C) Alert admin | **A) Booking wins** — AIMS is display only |
| 5 | Should the Compass app work without AIMS? | A) Yes B) No | **A) Yes** — AIMS/ESL is an optional enhancement |
| 6 | Should conference room bookings in Compass sync to 365/Google? | A) One-way (read) B) Two-way | **A) One-way** initially, two-way in Phase 2 |
| 7 | Department model — explicit entity or string field? | A) Explicit model B) String field | **B) String** initially — less migration, add model later if needed |
| 8 | Should Person model be kept alongside CompanyUser? | A) Keep both B) Merge into CompanyUser | **A) Keep both** — Person is for ESL display, CompanyUser is for auth/booking |
| 9 | Max concurrent bookings — global or per type? | A) Global B) Per type | **A) Global** initially — configurable via rules |
| 10 | Should Compass support web push notifications? | A) Yes B) Mobile push only | **A) Yes** — web push for desktop users, FCM/APNs for mobile |

---

## 15. Implementation Phases

### Phase 1 — Foundation (Estimated: 8-12 weeks)

**Goal:** Core schema, hierarchy, basic booking, Compass MVP

| Task | Priority | Dependencies |
|------|----------|-------------|
| Database migration: Floor, Area, SpaceType, SpaceStatus | P0 | — |
| Database migration: CompanyUser, Booking, BookingRule | P0 | — |
| Update Space model with new fields | P0 | Floor, Area |
| Basic booking API (create, check-in, release) | P0 | Space updates |
| CompanyUser auth (email+code, device token) | P0 | CompanyUser model |
| Compass app scaffold (Vite, routing, theme) | P0 | — |
| Compass: Home, Find Space, Book, My Bookings | P0 | Booking API |
| Admin: Floor/Area management UI | P1 | Floor/Area models |
| Admin: Batch space creation | P1 | Floor management |
| Admin: Space type management | P1 | SpaceType |
| Admin: Basic booking rules CRUD | P1 | BookingRule model |
| Auto-release BullMQ job | P0 | Booking model |
| No-show detection job | P1 | Booking model |
| Docker: Compass container setup | P0 | Compass build |
| NPM: compass.solumesl.co.il routing | P0 | Compass container |

### Phase 2 — Features & Integrations (Estimated: 6-10 weeks)

| Task | Priority |
|------|----------|
| Microsoft 365 conference room sync | P1 |
| Google Workspace conference room sync | P2 |
| LDAP/AD user sync | P1 |
| Azure AD user sync | P2 |
| Compass: Friends & proximity | P1 |
| Compass: Admin requests | P2 |
| Compass: Push notifications (FCM/APNs/Web Push) | P1 |
| Admin: Employee management UI | P1 |
| Admin: Integration configuration UI | P1 |
| Admin: Company onboarding wizard | P1 |
| Recurring bookings | P2 |
| Analytics dashboard (basic utilization) | P2 |
| Capacitor iOS build | P2 |
| ConferenceRoom → Space migration | P1 |

### Phase 3 — Polish & Advanced (Estimated: 4-8 weeks)

| Task | Priority |
|------|----------|
| Interactive floor plans (upload + map spaces) | P2 |
| Booking delegation (book for others) | P2 |
| Slack/Teams bot integration | P3 |
| Waitlist system | P3 |
| Visitor management (basic) | P3 |
| Advanced analytics (heatmaps, trends) | P2 |
| Capacity limits per floor/area | P2 |
| Two-way calendar sync | P3 |
| Performance optimization & load testing | P1 |

---

## Appendix A: ESL Integration Points

The **unique differentiator** of electisSpace+Compass vs competitors is ESL integration. Every booking/status change should optionally update the physical Electronic Shelf Label:

| Event | ESL Update |
|-------|-----------|
| Space booked | Show "Reserved: [Name], [Time]" |
| Check-in | Show "Occupied: [Name]" |
| Released | Show "Available" |
| Conference: Meeting starts | Flip to Page 2 (Busy template) |
| Conference: Meeting ends | Flip to Page 1 (Available template) |
| Permanent assignment | Show "[Name], [Department]" static |

All ESL updates flow through the existing AIMS sync queue.

---

## Appendix B: Theme & Design System (Compass)

### Dark Theme (Default)
```
Background:     #121212
Surface:        #1E1E1E
Primary:        #4FC3F7 (Light Blue)
Secondary:      #81C784 (Green — available)
Error:          #EF5350 (Red — occupied/error)
Warning:        #FFB74D (Orange — booking expiring)
Text Primary:   #FFFFFF
Text Secondary: #B0B0B0
```

### Light Theme
```
Background:     #FAFAFA
Surface:        #FFFFFF
Primary:        #0288D1 (Blue)
Secondary:      #388E3C (Green)
Error:          #D32F2F (Red)
Warning:        #F57C00 (Orange)
Text Primary:   #212121
Text Secondary: #757575
```

### Typography (Mobile-First)
```
H1: 28px / Bold    — Screen titles
H2: 22px / SemiBold — Section headers
Body: 16px / Regular — Content (minimum for readability)
Caption: 14px / Regular — Secondary info
Button: 16px / Bold — Touch targets (min 48px height)
```

### Touch Targets
- Minimum button height: 48px
- Minimum tap area: 44x44px
- Spacing between interactive elements: 8px minimum

---

## Appendix C: Shared Code Strategy

Code shared between electisSpace and electisCompass:

```
shared/
├── domain/
│   ├── types.ts          # Space, SpaceType, SpaceStatus, Booking, etc.
│   ├── enums.ts          # All shared enums
│   └── validation.ts     # Shared Zod schemas
├── api/
│   ├── client.ts         # Axios instance factory
│   └── interceptors.ts   # Auth refresh interceptor
├── utils/
│   ├── date.ts           # date-fns wrappers with timezone
│   ├── i18n.ts           # Shared i18n setup
│   └── platform.ts       # Platform detection
└── theme/
    ├── tokens.ts         # Design tokens (colors, spacing)
    └── dark.ts           # Dark theme configuration
    └── light.ts          # Light theme configuration
```

Both Vite configs reference this shared directory via path aliases:
```typescript
// vite.config.ts (both apps)
resolve: {
  alias: {
    '@shared': path.resolve(__dirname, '../shared'),
  }
}
```
