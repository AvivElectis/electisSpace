# electisCompass — Deep Audit Round 3 (2026-03-09)

Fourth-pass audit after resolving all 19 findings from Round 2. Focuses on race conditions, cascade/orphan gaps, authorization boundaries, and state machine correctness.

---

## CRITICAL

### ~~R3-S1. Extend Booking Conflict Check Uses Wrong Time Boundary~~ FIXED

**Severity:** CRITICAL | **File:** `server/src/features/compass-bookings/service.ts`

**Fixed:** Changed conflict detection from `endTime: { gt: booking.endTime! }` to `endTime: { gt: booking.startTime }` to properly detect overlapping bookings during extend operations.

### ~~R3-S2. Space Mode Change to PERMANENT Doesn't Cancel Conflicting Bookings~~ FIXED

**Severity:** CRITICAL | **File:** `server/src/features/compass-spaces/service.ts`

**Fixed:** Added transactional cancellation of all active bookings by non-assignee users before switching space to PERMANENT mode.

---

## HIGH

### ~~R3-S3. Scoped Recurrence Cancellation Missing Company Isolation~~ FIXED

**Severity:** HIGH | **File:** `server/src/features/compass-bookings/service.ts`

**Fixed:** Added `companyId` filter to both `cancel()` and `adminCancel()` `updateMany` WHERE clauses for scoped recurrence cancellation.

### ~~R3-S4. Space Hierarchy Relations Missing onDelete Directives~~ FIXED

**Severity:** HIGH | **File:** `server/prisma/schema.prisma`

**Fixed:** Added `onDelete: SetNull` to Space → Building, Floor, Area, Neighborhood relations.

### ~~R3-S5. PermanentAssignee Relation Missing onDelete~~ FIXED

**Severity:** HIGH | **File:** `server/prisma/schema.prisma`

**Fixed:** Added `onDelete: SetNull` to Space → permanentAssignee relation.

### ~~R3-S6. Department Manager/Parent Orphaning on Delete~~ FIXED

**Severity:** HIGH | **File:** `server/prisma/schema.prisma` + `server/src/features/compass-organization/service.ts`

**Fixed:** Added `onDelete: SetNull` to Department → manager and parent relations, Team → department and lead relations. Updated `deleteDepartment()` to clear `managerId` and detach child departments in a transaction.

### ~~R3-S7. FriendsPage setTimeout Not Cleared on Unmount~~ FIXED

**Severity:** HIGH | **File:** `compass/src/features/friends/presentation/FriendsPage.tsx`

**Fixed:** Added `useRef` to store timeout ID, cleared in `useEffect` cleanup.

### ~~R3-S8. Verification Code Attempt Incremented Before Validation~~ FIXED

**Severity:** HIGH | **File:** `server/src/features/compass-auth/service.ts`

**Fixed:** Moved `incrementCodeAttempts()` to run only after `bcrypt.compare()` returns false.

---

## MEDIUM

### ~~R3-S9. Recurrence Conflict Detection Outside Transaction~~ FIXED

**Severity:** MEDIUM | **File:** `server/src/features/compass-bookings/recurrenceService.ts`

**Fixed:** Moved per-instance conflict detection loop inside the `$transaction` block alongside booking creation for atomicity.

### ~~R3-S10. Bulk Cancel Missing Transaction Wrapping~~ FIXED

**Severity:** MEDIUM | **File:** `server/src/features/compass-bookings/controller.ts`

**Fixed:** Wrapped admin bulk cancel `updateMany` in `prisma.$transaction()`.

### ~~R3-S11. No-Show Job Doesn't Filter Soft-Deleted Spaces~~ FIXED

**Severity:** MEDIUM | **File:** `server/src/features/compass-bookings/repository.ts`

**Fixed:** Added `space: { deletedAt: null }` filter to both `findNoShowBookings()` and `findExpiredBookings()`.

### ~~R3-S12. Socket Event Handlers Missing Error Boundaries~~ FIXED

**Severity:** MEDIUM | **File:** `compass/src/shared/infrastructure/compassSocket.ts`

**Fixed:** Added `safeHandler()` wrapper with try-catch around all socket event handlers.

### ~~R3-S13. Recurring Booking Concurrent Limit Not Per-Date~~ FIXED

**Severity:** MEDIUM | **File:** `server/src/features/compass-bookings/recurrenceService.ts`

**Fixed:** Changed global active count check to per-date check — groups recurrence dates by calendar day and validates each day's booking count against `maxConcurrentBookings`.

### ~~R3-S14. BookingType Enum Has No State Machine Validation~~ FIXED

**Severity:** MEDIUM | **File:** `server/src/features/compass-bookings/service.ts`

**Fixed:** Added `bookingType === 'PERMANENT'` guard to skip auto-release and no-show detection for permanent bookings.

---

## LOW

| # | File | Issue | Status |
|---|------|-------|--------|
| ~~R3-L1~~ | `server/prisma/schema.prisma` (AuditLog) | Missing `onDelete: SetNull` on Store/User relations | **FIXED** |
| ~~R3-L2~~ | `server/src/features/compass-organization/service.ts` | Department parent race (validate + create not in tx) | **FIXED** — wrapped in transaction |
| R3-L3 | `server/src/features/compass-auth/service.ts` | N+1 bcrypt.compare on device tokens (performance) | **Acceptable** — early-break loop limits actual comparisons; token count per user is typically 1-3 |

---

## Action Priority

| Priority | Issues | Effort | Status |
|----------|--------|--------|--------|
| **Immediate** | R3-S1 (extend conflict), R3-S2 (space mode bookings) | 2-3 hours | **All resolved** |
| **This week** | R3-S3–S8 (company isolation, schema, setTimeout, attempt order) | 3-4 hours | **All resolved** |
| **Next sprint** | R3-S9–S14 (transactions, filters, error boundaries) | 4-5 hours | **All resolved** |
| **Backlog** | R3-L1–L3 | 1-2 hours | **All resolved** |
