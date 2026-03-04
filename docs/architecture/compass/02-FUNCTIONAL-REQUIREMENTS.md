# electisCompass — Functional Requirements Specification

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft
**Constraint:** Compass is additive — existing electisSpace features remain unchanged.

---

## 1. Authentication & Authorization

### FR-AUTH-01: Employee Email+Code Login
- The system SHALL allow employees to log in using their company email address
- The system SHALL generate a 6-digit numeric verification code
- The system SHALL send the code to the employee's email
- The code SHALL expire after 10 minutes
- The system SHALL hash the code before storing (bcrypt or argon2)

### FR-AUTH-02: Device Token Auto-Login
- Upon successful verification, the system SHALL issue a device token
- The device token SHALL be stored securely (Capacitor Preferences on mobile, httpOnly cookie on web)
- On subsequent app opens, the system SHALL authenticate using the device token without requiring email/code
- Device tokens SHALL be scoped to a single CompanyUser + device combination

### FR-AUTH-03: Access & Refresh Tokens
- The system SHALL issue a JWT access token (15-minute expiry) and a refresh token (7-day expiry)
- The access token SHALL contain: `companyUserId`, `companyId`, `branchId`, `role: 'EMPLOYEE'`
- The refresh token SHALL be stored as an httpOnly cookie
- The system SHALL automatically refresh the access token on 401 responses

### FR-AUTH-04: Rate Limiting
- Login/verify endpoints SHALL be rate-limited to 5 attempts per minute per email address
- Rate limiting SHALL use Redis-backed counters (not in-memory)
- After exceeding rate limit, the system SHALL return 429 with retry-after header

### FR-AUTH-05: Session Management
- The system SHALL support concurrent sessions across multiple devices
- Logout SHALL invalidate the device token for the current device only
- Company admin SHALL be able to revoke all sessions for an employee

---

## 2. Space Browsing & Discovery

### FR-SPACE-01: Available Spaces Query
- The system SHALL return spaces with current status AVAILABLE within the employee's accessible branches
- The response SHALL include: space number, type, building, floor, area, capacity, amenities, availability window
- Spaces with mode EXCLUDED, MAINTENANCE, or PERMANENT (with assignee) SHALL be excluded

### FR-SPACE-02: Filtering
- The system SHALL support filtering by: building, floor, area, space type, amenities
- Filters SHALL be combinable (AND logic)
- The system SHALL persist last-used filters per employee (in preferences)

### FR-SPACE-03: Sorting
- Default sort: floor number ASC, space number ASC
- "Near Friends" sort: proximity to checked-in friends (same floor > same building > different building, then by sortOrder distance)
- "By Type" sort: group by space type, then by number

### FR-SPACE-04: Search
- The system SHALL support free-text search across space number, name, floor name, area name
- Search SHALL be case-insensitive and support partial matches

### FR-SPACE-05: Branch Selection
- If employee has access to multiple branches, the system SHALL show a branch selector
- Access to branches SHALL be controlled by booking rules (RESTRICT_TO_BRANCH or company-level config)

### FR-SPACE-06: Real-Time Updates
- Available spaces list SHALL update in real-time via Socket.IO
- When a space is booked/released by another user, the list SHALL update without manual refresh
- Stale data indicator: show "Updated X seconds ago" if Socket.IO connection drops

---

## 3. Booking Management

### FR-BOOK-01: Create Booking
- The system SHALL allow employees to book an available space for a time range
- Default start: current time (rounded to next granularity increment)
- Default end: end of business day (configurable per branch)
- The system SHALL validate against all applicable booking rules before confirming

### FR-BOOK-02: Concurrent Booking Protection
- The system SHALL use `SELECT FOR UPDATE` row-level locking when creating bookings
- If a concurrent booking conflict is detected, the system SHALL reject with a clear error message
- The system SHALL use a PostgreSQL `tsrange` exclusion constraint as a secondary guard

### FR-BOOK-03: Booking Rules Enforcement
- MAX_BOOKING_DURATION: system SHALL cap booking duration at the resolved maximum
- MIN_BOOKING_DURATION: system SHALL reject bookings shorter than the minimum
- BOOKING_GRANULARITY: start/end times SHALL snap to the configured increment (e.g., 30 min)
- ADVANCE_BOOKING_DAYS: system SHALL reject bookings further than N days in the future
- MAX_CONCURRENT_BOOKINGS: system SHALL reject if employee already has N active bookings

### FR-BOOK-04: Check-In
- The system SHALL allow check-in within the CHECK_IN_WINDOW (default: 15 minutes after booking start)
- Check-in SHALL update booking status from BOOKED to CHECKED_IN
- Check-in SHALL record the `checkedInAt` timestamp
- Check-in SHALL NOT be allowed before booking start time

### FR-BOOK-05: Release
- The system SHALL allow employees to release a checked-in booking early
- Release SHALL update status from CHECKED_IN to RELEASED
- If COOLDOWN_MINUTES > 0, the space SHALL be unavailable for cooldown duration after release

### FR-BOOK-06: Cancel
- The system SHALL allow cancellation of BOOKED (not yet checked-in) bookings
- Cancellation SHALL update status to CANCELLED
- Cancelled bookings SHALL be preserved in history (never hard-deleted)

### FR-BOOK-07: Extend
- The system SHALL allow extending the end time of a CHECKED_IN booking
- Extensions SHALL be validated against MAX_BOOKING_DURATION and conflicts
- Extension increments SHALL follow BOOKING_GRANULARITY

### FR-BOOK-08: Auto-Release
- The system SHALL automatically release bookings when their `endTime` passes (status: BOOKED → AUTO_RELEASED)
- Auto-release job SHALL run every 1 minute via BullMQ
- Auto-released bookings SHALL trigger AIMS ESL update and push notification

### FR-BOOK-09: No-Show Detection
- The system SHALL detect bookings where check-in window has passed without check-in
- If AUTO_RELEASE_ON_NO_SHOW is true: status → NO_SHOW, space released
- If false: notification sent, booking preserved until endTime

### FR-BOOK-10: Auto-Assign
- The system SHALL provide one-tap auto-assignment based on preferences and rules
- Algorithm priority: PREFER_SAME_FLOOR > PREFER_SAME_AREA > PREFER_NEAR_TEAM > SEQUENTIAL
- The system SHALL respect employee's preferredSpaceType if set

### FR-BOOK-11: Booking History
- The system SHALL maintain complete booking history (active, past, cancelled)
- Past bookings SHALL be paginated (default: 20 per page)
- Bookings SHALL never be hard-deleted

---

## 4. Friend & Proximity System

### FR-FRIEND-01: Friend Requests
- Employees SHALL be able to send friend requests to other employees in the same company
- Friend requests SHALL be bidirectional (requires acceptance)
- States: PENDING → ACCEPTED or BLOCKED

### FR-FRIEND-02: Friend Location Sharing
- The system SHALL show friends' current locations (building, floor, space) when they are checked in
- Location visibility SHALL be controlled by `isLocationVisible` preference (default: true)
- Friends who are not checked in SHALL show as "Not in office"

### FR-FRIEND-03: Proximity Calculation
- Proximity SHALL be calculated by hierarchy: same building + same floor (closest by sortOrder), same building + different floor, different building
- The system SHALL use space `sortOrder` column for numeric distance, NOT space name parsing
- Display format: "Dan — Office A203, 2 spaces away"

### FR-FRIEND-04: Privacy Controls
- Employees SHALL be able to disable location sharing (opt-out)
- When location sharing is disabled, friends see "Location hidden"
- Company admin SHALL be able to set the default for isLocationVisible per company

---

## 5. Admin Management (electisSpace Extensions)

### FR-ADMIN-01: Building CRUD
- Admin SHALL be able to create, read, update, delete buildings within a branch
- Building code SHALL be unique within a branch
- Single-building branches SHALL auto-create a default building (hidden in UI)
- Deleting a building with spaces SHALL require confirmation (soft-delete spaces)

### FR-ADMIN-02: Floor CRUD
- Admin SHALL be able to manage floors within a building
- Each floor SHALL have: number, name, prefix, range (start/end for space numbering)
- Floor prefix SHALL be unique within a building

### FR-ADMIN-03: Area CRUD
- Admin SHALL be able to manage areas within a floor
- Area types: WING, DEPARTMENT, OPEN_SPACE, ZONE
- Areas are optional organizational groupings

### FR-ADMIN-04: Batch Space Creation
- Admin SHALL be able to create N spaces at once for a given floor
- The system SHALL auto-generate externalIds using the company's article format template
- Preview of generated IDs SHALL be shown before confirmation
- Batch creation SHALL validate uniqueness of all generated externalIds

### FR-ADMIN-05: Space Mode Management
- Admin SHALL be able to set space mode: AVAILABLE, EXCLUDED, MAINTENANCE
- Admin SHALL be able to assign permanent employees to spaces (mode: PERMANENT)
- Mode changes SHALL trigger AIMS ESL update

### FR-ADMIN-06: Booking Rule Management
- Admin SHALL be able to create, update, delete booking rules
- Rules SHALL be scoped: company-wide, selected branches, selected spaces
- Rules SHALL have priority for conflict resolution
- Rule changes SHALL invalidate Redis cache immediately

### FR-ADMIN-07: Employee Management
- Admin SHALL be able to create, update, deactivate CompanyUser accounts
- Admin SHALL be able to assign employees to branches, floors, areas
- Admin SHALL be able to bulk import via CSV
- Admin SHALL be able to trigger directory sync (LDAP/365/Google)

### FR-ADMIN-08: Admin Request Resolution
- Admin SHALL see pending requests from employees
- Admin SHALL be able to approve/deny/resolve requests
- Resolution SHALL include notes visible to the employee

---

## 6. AIMS/ESL Integration

### FR-ESL-01: Booking Status on Labels
- When a booking is created, the ESL SHALL display: "Reserved: [Name], [Time Range]"
- When checked in, the ESL SHALL display: "Occupied: [Name]"
- When released/cancelled, the ESL SHALL display: "Available"
- For permanent assignments: "[Name], [Department]" — static display

### FR-ESL-02: Sync Throttling
- AIMS sync SHALL be throttled to max 1 update per space per 30 seconds
- Multiple rapid changes SHALL coalesce into a single sync item

### FR-ESL-03: Template Mapping
- Each SpaceType SHALL map to an ESL template
- Templates SHALL be configurable per company in settings
- Default: use existing company template for all types

### FR-ESL-04: Backward Compatibility
- Existing electisSpace AIMS sync (pull/push for spaces, people, conference) SHALL remain unchanged
- Compass booking events are an additional sync trigger, not a replacement
- Companies without Compass enabled SHALL have zero impact on their AIMS sync

---

## 7. Notifications

### FR-NOTIF-01: Push Notifications
- The system SHALL send push notifications via FCM (Android), APNs (iOS), and Web Push
- Notification types:
  - Booking confirmation
  - Check-in reminder (at booking start time)
  - Auto-release notice
  - No-show warning
  - Friend request received
  - Admin request resolved

### FR-NOTIF-02: Email Notifications
- Verification codes SHALL be sent via email
- Booking confirmation emails SHALL be optional (configurable per employee)
- Emails SHALL be bilingual (language from CompanyUser preferences)

### FR-NOTIF-03: In-App Notifications
- The system SHALL maintain an in-app notification feed
- Unread count SHALL be shown on the notification bell icon
- Notifications SHALL be clearable individually or in bulk

---

## 8. Internationalization

### FR-I18N-01: Full EN + HE Support
- All UI text SHALL be available in English and Hebrew
- Language SHALL be selectable in user profile (persisted to server)
- RTL layout SHALL activate automatically for Hebrew

### FR-I18N-02: Locale-Aware Formatting
- Dates SHALL use locale-specific formatting (EN: "Mar 4, 2026", HE: "4 במרץ 2026")
- Times SHALL use 24h format by default in Hebrew, configurable in English
- Numbers SHALL always render LTR, even within RTL context
- Phone numbers SHALL always render LTR

### FR-I18N-03: Server-Side Localization
- Email templates SHALL be sent in the employee's preferred language
- Push notification text SHALL be localized per employee preference
- Error messages from API SHALL include localized user-facing text

---

## 9. Offline Support

### FR-OFFLINE-01: Cached Data
- Current booking details SHALL be cached locally for offline viewing
- Check-in status SHALL be cached
- Last-known friend locations SHALL be cached

### FR-OFFLINE-02: Offline Indicators
- The system SHALL display a clear offline indicator when network is unavailable
- Actions requiring network (book, release, check-in) SHALL show "Requires internet connection"
- Cached data SHALL show "Last updated: [timestamp]"

---

## 10. Data Integrity & Safety

### FR-DATA-01: No Article Deletion
- Compass booking operations SHALL NEVER delete AIMS articles
- Article creation is only allowed through admin batch-create or AIMS sync
- Feature toggling SHALL NOT trigger article deletion

### FR-DATA-02: Soft Delete
- Spaces SHALL use soft-delete (`deletedAt` timestamp) to preserve booking history
- CompanyUser accounts SHALL be deactivated, never hard-deleted
- Bookings SHALL never be deleted — only status changes

### FR-DATA-03: Audit Trail
- All booking state changes SHALL be logged with: timestamp, actor, previous state, new state
- Admin actions (rule changes, employee management, space mode changes) SHALL be audit-logged
- Audit logs SHALL be queryable by company and branch admins
