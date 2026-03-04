# electisCompass — Use Case Specification

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft
**Scope:** Compass is an **additive** feature — it does NOT replace the existing electisSpace spaces/people/conference features. Compass is the user-facing booking & workspace app.

---

## 1. Actors

| Actor | Type | Description |
|-------|------|-------------|
| **Employee** | Primary | End user of Compass app. Books spaces, checks in, finds friends. Authenticated via email+code. |
| **Company Admin** | Primary | Manages company settings, buildings, floors, booking rules, employee accounts via electisSpace admin. |
| **Branch Admin** | Primary | Manages branch-level spaces, rules, and employee assignments. Subset of Company Admin permissions. |
| **Platform Admin** | Primary | Electis staff. Full system access. Creates companies, manages platform. |
| **AIMS System** | External | SoluM AIMS platform. Source of truth for ESL labels. Receives space status updates. |
| **Identity Provider** | External | Microsoft 365 / Google Workspace / LDAP. Source of employee directory data. |
| **Calendar System** | External | Microsoft Graph / Google Calendar API. Source of conference room bookings. |
| **BullMQ Scheduler** | System | Background job runner. Handles auto-release, no-show detection, sync jobs. |
| **Socket.IO Server** | System | Real-time event bus. Pushes booking/status changes to connected clients. |

---

## 2. Use Case Diagram (Text-Based UML)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        electisCompass System                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    EMPLOYEE USE CASES                        │   │
│  │                                                             │   │
│  │  (UC-E01) Register & Authenticate                           │   │
│  │  (UC-E02) Browse Available Spaces                           │   │
│  │  (UC-E03) Book a Space                                      │   │
│  │  (UC-E04) Auto-Assign Space                                 │   │
│  │  (UC-E05) Check In to Booked Space                          │   │
│  │  (UC-E06) Release Space Early                               │   │
│  │  (UC-E07) Cancel Booking                                    │   │
│  │  (UC-E08) Extend Booking                                    │   │
│  │  (UC-E09) View My Bookings                                  │   │
│  │  (UC-E10) Manage Friends                                    │   │
│  │  (UC-E11) Find Spaces Near Friends                          │   │
│  │  (UC-E12) Manage Profile & Preferences                      │   │
│  │  (UC-E13) Submit Admin Request                              │   │
│  │  (UC-E14) Receive Notifications                             │   │
│  │  (UC-E15) View Office Occupancy                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 ADMIN USE CASES (electisSpace)               │   │
│  │                                                             │   │
│  │  (UC-A01) Manage Buildings                                   │   │
│  │  (UC-A02) Manage Floors & Areas                              │   │
│  │  (UC-A03) Batch Create Spaces                                │   │
│  │  (UC-A04) Configure Space Types                              │   │
│  │  (UC-A05) Manage Booking Rules                               │   │
│  │  (UC-A06) Manage Employee Accounts                           │   │
│  │  (UC-A07) Import Employees (CSV / Directory Sync)            │   │
│  │  (UC-A08) Configure Integrations (365/Google/LDAP)           │   │
│  │  (UC-A09) Resolve Admin Requests                             │   │
│  │  (UC-A10) Assign Permanent Spaces                            │   │
│  │  (UC-A11) Exclude/Maintain Spaces                            │   │
│  │  (UC-A12) View Booking Analytics                             │   │
│  │  (UC-A13) Company Onboarding Wizard (Enhanced)               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   SYSTEM USE CASES                           │   │
│  │                                                             │   │
│  │  (UC-S01) Auto-Release Expired Bookings                      │   │
│  │  (UC-S02) Detect No-Shows                                    │   │
│  │  (UC-S03) Sync Space Status to ESL (AIMS)                   │   │
│  │  (UC-S04) Sync Conference Rooms from Calendar                │   │
│  │  (UC-S05) Sync Employee Directory                            │   │
│  │  (UC-S06) Push Real-Time Updates (Socket.IO)                │   │
│  │  (UC-S07) Send Booking Reminders                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

         ┌──────────┐        ┌──────────────┐      ┌────────────┐
         │ Employee │        │ Company Admin│      │Branch Admin│
         └────┬─────┘        └──────┬───────┘      └─────┬──────┘
              │                     │                     │
              │  UC-E01..UC-E15     │  UC-A01..UC-A13     │ UC-A01..UC-A04
              │                     │                     │ UC-A05..UC-A06
              ▼                     ▼                     │ UC-A09..UC-A11
         ┌────────────────────────────────────────────────▼────────┐
         │                  Compass System                         │
         └────────┬──────────────┬──────────────┬─────────────────┘
                  │              │              │
                  ▼              ▼              ▼
           ┌──────────┐  ┌────────────┐  ┌───────────────┐
           │   AIMS   │  │  Calendar  │  │  IdP (LDAP/   │
           │  System  │  │   System   │  │  365/Google)  │
           └──────────┘  └────────────┘  └───────────────┘
```

---

## 3. Detailed Use Cases

### UC-E01: Register & Authenticate

| Field | Value |
|-------|-------|
| **ID** | UC-E01 |
| **Name** | Register & Authenticate |
| **Actor** | Employee |
| **Precondition** | Employee's email exists in CompanyUser table (created by admin or directory sync) |
| **Trigger** | Employee opens Compass app for the first time or session expired |
| **Description** | Employee authenticates via email+code flow. Device token enables auto-login on subsequent opens. |

**Main Flow:**
1. Employee opens Compass app
2. System checks for valid device token in secure storage
3. If no valid token → show login screen
4. Employee enters company email address
5. System validates email exists in CompanyUser table
6. System generates 6-digit verification code, stores hash with 10min expiry
7. System sends code to employee's email
8. Employee enters code
9. System validates code against stored hash
10. System issues access token (JWT, 15min) + refresh token (httpOnly cookie)
11. System generates device token, stores in CompanyUserDeviceToken
12. System stores device token in Capacitor Preferences (mobile) or httpOnly cookie (web)
13. Employee sees Home screen

**Alternative Flows:**
- **2a.** Valid device token found → auto-login, skip to step 13
- **5a.** Email not found → show "Contact your administrator" message
- **9a.** Invalid code → increment attempt counter, show error. After 5 attempts → lock for 15 minutes
- **9b.** Expired code → offer to resend

**Postcondition:** Employee is authenticated, device token stored for future sessions.

---

### UC-E02: Browse Available Spaces

| Field | Value |
|-------|-------|
| **ID** | UC-E02 |
| **Actor** | Employee |
| **Precondition** | Employee is authenticated |
| **Trigger** | Employee navigates to "Find Space" screen |

**Main Flow:**
1. Employee opens Find Space screen
2. System loads employee's primary branch (from CompanyUser.branchId)
3. System fetches available spaces for current branch
4. System applies branch-level booking rules to filter results
5. Employee optionally filters by: building, floor, area, space type, amenities
6. System displays available spaces sorted by floor/number
7. Each space card shows: number, type, floor, area, availability window, friend proximity indicator

**Alternative Flows:**
- **2a.** Employee has access to multiple branches → show branch selector
- **3a.** No spaces available → show empty state "No spaces available for selected filters"
- **6a.** Employee sorts by "Near Friends" → system reorders by proximity algorithm (same floor first, then same building, then numeric distance)

**Business Rules:**
- BR-E02-1: Spaces with mode EXCLUDED or MAINTENANCE are never shown
- BR-E02-2: Spaces with mode PERMANENT and an assignee are never shown
- BR-E02-3: If rule RESTRICT_TO_FLOOR is active, only show spaces on employee's assigned floor
- BR-E02-4: If rule RESTRICT_TO_AREA is active, only show spaces in employee's assigned area

---

### UC-E03: Book a Space

| Field | Value |
|-------|-------|
| **ID** | UC-E03 |
| **Actor** | Employee |
| **Precondition** | Employee is authenticated, space is available |
| **Trigger** | Employee taps "Book" on a space card |

**Main Flow:**
1. Employee selects a space from available list
2. System shows booking form: start time (default: now), end time (default: end of day)
3. System validates against booking rules (max duration, granularity, advance days)
4. Employee confirms booking
5. System acquires row-level lock on the space (`SELECT FOR UPDATE`)
6. System checks for conflicting bookings in the time range
7. System creates Booking record (status: BOOKED)
8. System updates Space display status
9. System queues AIMS sync item (update ESL: "Reserved: [Name], [Time]")
10. System emits Socket.IO event `booking:created`
11. System shows confirmation with check-in reminder
12. Employee sees booking in "My Bookings"

**Alternative Flows:**
- **6a.** Conflict detected (concurrent booking) → release lock, show "Space just booked by someone else", return to list
- **3a.** Duration exceeds MAX_BOOKING_DURATION → show rule violation, cap at max
- **3b.** Employee has MAX_CONCURRENT_BOOKINGS active → show "You already have N active bookings"
- **3c.** REQUIRE_APPROVAL is true → create booking with status PENDING_APPROVAL, notify branch admin

**Postcondition:** Booking created. ESL update queued. Real-time update pushed.

---

### UC-E04: Auto-Assign Space

| Field | Value |
|-------|-------|
| **ID** | UC-E04 |
| **Actor** | Employee |
| **Precondition** | Employee is authenticated |
| **Trigger** | Employee taps "Auto-Assign Me" button |

**Main Flow:**
1. Employee taps "Auto-Assign Me"
2. System resolves applicable booking rules for employee's branch
3. System queries available spaces matching employee's preferred space type
4. System applies auto-assignment algorithm:
   a. If PREFER_SAME_FLOOR → prioritize employee's assigned floor
   b. If PREFER_SAME_AREA → prioritize employee's assigned area
   c. If PREFER_NEAR_TEAM → find spaces near checked-in team members
   d. If SEQUENTIAL → pick lowest available space number
   e. If ROUND_ROBIN → pick least-recently-booked space
5. System selects best available space
6. System creates booking (same as UC-E03 steps 5-12)
7. Employee sees assigned space confirmation

**Alternative Flows:**
- **5a.** No spaces match criteria → show "No spaces available matching your preferences"
- **4a.** Employee has friends checked in → include friend proximity as secondary sort factor

---

### UC-E05: Check In to Booked Space

| Field | Value |
|-------|-------|
| **ID** | UC-E05 |
| **Actor** | Employee |
| **Precondition** | Employee has an active booking with status BOOKED, within check-in window |
| **Trigger** | Employee taps "Check In" on booking card |

**Main Flow:**
1. Employee taps "Check In" on active booking
2. System validates booking is within check-in window (default: 15 min after start)
3. System updates booking status: BOOKED → CHECKED_IN
4. System sets `checkedInAt` timestamp
5. System queues AIMS sync item (update ESL: "Occupied: [Name]")
6. System emits Socket.IO event `booking:checked_in`
7. System updates friend location for employee's friends
8. Employee sees updated booking card with "Release" button

**Alternative Flows:**
- **2a.** Too early (before booking start) → show "Check-in opens at [time]"
- **2b.** Check-in window expired → show "Check-in window has passed. Your booking may be auto-released."

---

### UC-E06: Release Space Early

| Field | Value |
|-------|-------|
| **ID** | UC-E06 |
| **Actor** | Employee |
| **Precondition** | Employee has a CHECKED_IN booking |
| **Trigger** | Employee taps "Release" button |

**Main Flow:**
1. Employee taps "Release" on active booking
2. System shows confirmation: "Release Office 204? This space will become available to others."
3. Employee confirms
4. System updates booking status: CHECKED_IN → RELEASED
5. System sets `releasedAt` timestamp
6. If COOLDOWN_MINUTES > 0 → space enters cooldown, shown as temporarily unavailable
7. System queues AIMS sync item (update ESL: "Available")
8. System emits Socket.IO events: `booking:released`, `space:status_changed`
9. Employee's booking moves to "Past Bookings"

---

### UC-E07: Cancel Booking

| Field | Value |
|-------|-------|
| **ID** | UC-E07 |
| **Actor** | Employee |
| **Precondition** | Employee has a BOOKED (not yet checked-in) booking |
| **Trigger** | Employee taps "Cancel" on upcoming booking |

**Main Flow:**
1. Employee taps "Cancel" on booking
2. System shows confirmation
3. Employee confirms
4. System updates booking status: BOOKED → CANCELLED
5. System queues AIMS sync (revert ESL to "Available")
6. System emits Socket.IO event `booking:released`
7. Booking preserved in history (never hard-deleted)

---

### UC-E08: Extend Booking

| Field | Value |
|-------|-------|
| **ID** | UC-E08 |
| **Actor** | Employee |
| **Precondition** | Employee has an active CHECKED_IN booking |
| **Trigger** | Employee taps "Extend" button |

**Main Flow:**
1. Employee taps "Extend" on active booking
2. System shows extension options (30min increments, up to MAX_BOOKING_DURATION)
3. Employee selects new end time
4. System checks for conflicting bookings after current end time
5. System validates against MAX_BOOKING_DURATION rule
6. System updates booking `endTime`
7. System queues AIMS sync (update ESL time display)
8. System emits Socket.IO event

**Alternative Flows:**
- **4a.** Conflict exists → show "Space is booked by someone else starting at [time]"
- **5a.** Exceeds max duration → cap at max, show rule message

---

### UC-E10: Manage Friends

| Field | Value |
|-------|-------|
| **ID** | UC-E10 |
| **Actor** | Employee |
| **Precondition** | Employee is authenticated |

**Main Flow:**
1. Employee opens Friends screen
2. System shows: accepted friends with current location, pending sent/received requests
3. Employee searches for colleague by name or email
4. Employee sends friend request
5. System creates Friendship record (status: PENDING)
6. Target employee receives notification
7. Target employee accepts → Friendship status: ACCEPTED
8. Both users now see each other's locations (if isLocationVisible=true)

**Business Rules:**
- BR-E10-1: Friendship is bidirectional — both must accept
- BR-E10-2: Users with `isLocationVisible: false` show as "Location hidden"
- BR-E10-3: Friend search is scoped to same company only

---

### UC-E11: Find Spaces Near Friends

| Field | Value |
|-------|-------|
| **ID** | UC-E11 |
| **Actor** | Employee |
| **Precondition** | Employee has accepted friends who are checked in |

**Main Flow:**
1. Employee taps on a friend's location or "Find space near [Friend]"
2. System identifies friend's current space (building, floor, sortOrder)
3. System queries available spaces using proximity algorithm:
   a. Same building + same floor → sort by |space.sortOrder - friend.sortOrder|
   b. Same building + adjacent floors → secondary priority
   c. Different building → lowest priority
4. System displays results with proximity indicators: "2 spaces from Dan"
5. Employee books a space (→ UC-E03)

---

### UC-A01: Manage Buildings

| Field | Value |
|-------|-------|
| **ID** | UC-A01 |
| **Actor** | Company Admin, Branch Admin |
| **Precondition** | Admin is authenticated in electisSpace |

**Main Flow:**
1. Admin navigates to Building Management (Settings or dedicated page)
2. System shows tree: Branch → Buildings → Floors → Areas
3. Admin creates a new building: name, code, optional address
4. System validates code uniqueness within branch
5. System creates Building record
6. For single-building branches, building is auto-created and UI hides the selector

---

### UC-A03: Batch Create Spaces

| Field | Value |
|-------|-------|
| **ID** | UC-A03 |
| **Actor** | Company Admin, Branch Admin |
| **Precondition** | Building and floor exist |

**Main Flow:**
1. Admin selects a floor in Building Management
2. Admin clicks "Create Spaces"
3. System shows batch creation dialog: count, starting number, space type
4. System previews generated externalIds using company's article format template
5. Admin confirms
6. System generates N spaces with auto-incremented externalIds
7. System queues AIMS sync for new articles (if sync enabled)

---

### UC-A05: Manage Booking Rules

| Field | Value |
|-------|-------|
| **ID** | UC-A05 |
| **Actor** | Company Admin, Branch Admin |
| **Precondition** | Admin is authenticated |

**Main Flow:**
1. Admin opens Booking Rules page
2. System shows current rules grouped by type
3. Admin creates new rule: select type, scope (company/branch/space), value
4. System validates rule consistency (no contradictions)
5. System saves rule, invalidates Redis rule cache
6. Rules take effect immediately for new bookings

---

### UC-S01: Auto-Release Expired Bookings

| Field | Value |
|-------|-------|
| **ID** | UC-S01 |
| **Actor** | BullMQ Scheduler (System) |
| **Trigger** | Cron: every 1 minute |

**Main Flow:**
1. Job queries bookings: `status = BOOKED AND endTime < NOW()`
2. For each expired booking:
   a. Update status → AUTO_RELEASED
   b. Set autoReleased = true
   c. Queue AIMS sync (ESL → "Available")
   d. Emit Socket.IO `booking:auto_released`
   e. Send push notification to employee
3. Job logs count of released bookings

**Performance Note:** Uses partial index `Booking(status, endTime) WHERE status = 'BOOKED'`

---

### UC-S02: Detect No-Shows

| Field | Value |
|-------|-------|
| **ID** | UC-S02 |
| **Actor** | BullMQ Scheduler (System) |
| **Trigger** | Cron: every 5 minutes |

**Main Flow:**
1. Job resolves CHECK_IN_WINDOW rule per branch
2. Queries bookings: `status = BOOKED AND startTime + checkInWindow < NOW()`
3. If AUTO_RELEASE_ON_NO_SHOW is true:
   a. Update status → NO_SHOW
   b. Queue AIMS sync (ESL → "Available")
   c. Emit Socket.IO event
   d. Send notification: "Your booking was released (no check-in)"
4. If AUTO_RELEASE_ON_NO_SHOW is false:
   a. Send reminder notification only

---

### UC-S03: Sync Space Status to ESL (AIMS)

| Field | Value |
|-------|-------|
| **ID** | UC-S03 |
| **Actor** | System (triggered by booking events) |
| **Precondition** | Company has AIMS integration enabled, space has externalId |

**Main Flow:**
1. Booking event triggers sync queue item
2. System throttles: max 1 update per space per 30 seconds
3. System resolves ESL template based on space type
4. System builds AIMS article data payload:
   - Booked → `{ name: "John Doe", department: "Engineering", until: "18:00" }`
   - Available → `{ status: "Available" }`
   - Occupied → `{ name: "John Doe", checkInTime: "09:15" }`
5. System pushes article update via existing AIMS sync queue
6. AIMS updates the physical ESL label

---

## 4. Use Case Dependency Matrix

```
UC-E03 (Book Space)
  ├── depends on: UC-E02 (Browse Spaces)
  ├── triggers: UC-S03 (AIMS Sync)
  ├── triggers: UC-S06 (Socket.IO Push)
  └── may trigger: UC-S07 (Reminder)

UC-E04 (Auto-Assign)
  ├── depends on: UC-E02 (Browse Spaces)
  └── triggers: UC-E03 (Book Space) — internally

UC-E05 (Check In)
  ├── depends on: UC-E03 (Book Space)
  ├── triggers: UC-S03 (AIMS Sync)
  └── enables: UC-E11 (Friend Proximity) — friend location becomes visible

UC-E06 (Release)
  ├── depends on: UC-E05 (Check In)
  └── triggers: UC-S03 (AIMS Sync)

UC-S01 (Auto-Release)
  ├── depends on: UC-E03 (Book Space)
  └── triggers: UC-S03 (AIMS Sync)

UC-A03 (Batch Create)
  ├── depends on: UC-A01 (Buildings), UC-A02 (Floors)
  └── triggers: UC-S03 (AIMS Sync) — new articles

UC-A05 (Rules)
  └── affects: UC-E02, UC-E03, UC-E04, UC-E08 — all booking-related UCs
```

---

## 5. Actor-Use Case Access Matrix

| Use Case | Employee | Branch Admin | Company Admin | Platform Admin |
|----------|----------|-------------|--------------|----------------|
| UC-E01 Register | x | | | |
| UC-E02 Browse | x | | | |
| UC-E03 Book | x | | | |
| UC-E04 Auto-Assign | x | | | |
| UC-E05 Check In | x | | | |
| UC-E06 Release | x | | | |
| UC-E07 Cancel | x | | | |
| UC-E08 Extend | x | | | |
| UC-E09 My Bookings | x | | | |
| UC-E10 Friends | x | | | |
| UC-E11 Near Friends | x | | | |
| UC-E12 Profile | x | | | |
| UC-E13 Request | x | | | |
| UC-E14 Notifications | x | | | |
| UC-E15 Occupancy | x | | | |
| UC-A01 Buildings | | x (own branch) | x (own company) | x (all) |
| UC-A02 Floors/Areas | | x (own branch) | x (own company) | x (all) |
| UC-A03 Batch Create | | x (own branch) | x (own company) | x (all) |
| UC-A04 Space Types | | x (own branch) | x (own company) | x (all) |
| UC-A05 Rules | | x (own branch) | x (own company) | x (all) |
| UC-A06 Employees | | x (own branch) | x (own company) | x (all) |
| UC-A07 Import | | | x (own company) | x (all) |
| UC-A08 Integrations | | | x (own company) | x (all) |
| UC-A09 Requests | | x (own branch) | x (own company) | x (all) |
| UC-A10 Permanent | | x (own branch) | x (own company) | x (all) |
| UC-A11 Exclude | | x (own branch) | x (own company) | x (all) |
| UC-A12 Analytics | | x (own branch) | x (own company) | x (all) |
| UC-A13 Wizard | | | | x (all) |
