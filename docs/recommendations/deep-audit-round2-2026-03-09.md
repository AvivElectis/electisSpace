# electisCompass — Deep Audit Round 2 (2026-03-09)

Third-pass audit after resolving all 28 findings from Round 1. Focuses on deeper logic bugs, security gaps, and architectural issues.

---

## CRITICAL

### ~~R2-S1. Recurrence Conflict Check Only Matches Exact Start Times~~ FIXED

**Severity:** CRITICAL | **File:** `server/src/features/compass-bookings/recurrenceService.ts:95-118`

**Fixed:** Replaced `startTime: { in: dates }` with per-instance overlap detection using the same time-range logic as the single-booking path (`startTime < endDate`, `endTime > date`).

### ~~R2-S2. Admin Status Filter Passes Raw String to Prisma as BookingStatus~~ FIXED

**Severity:** HIGH | **File:** `server/src/features/compass-bookings/controller.ts:150`

**Fixed:** Added explicit validation against `VALID` status array before passing to repository. Invalid status now returns 400 instead of 500.

### ~~R2-S3. Cancel Scope Query Param Unvalidated~~ FIXED

**Severity:** HIGH | **File:** `server/src/features/compass-bookings/controller.ts:131`

**Fixed:** Added inline validation that `rawScope` is one of `['instance', 'future', 'all']` before using it.

---

## HIGH

### ~~R2-S4. Socket Listeners Accumulate on Reconnect (Memory Leak)~~ FIXED

**Severity:** HIGH | **File:** `compass/src/shared/infrastructure/compassSocket.ts:9-71`

**Fixed:** Added `removeAllListeners()` + `disconnect()` cleanup of stale socket before creating new one.

### ~~R2-S5. Booking Rule Config Shape Not Validated~~ FIXED

**Severity:** HIGH | **File:** `server/src/features/compass-bookings/types.ts:42`

**Fixed:** Changed `z.record(z.unknown())` to `z.object({ value: z.unknown() }).passthrough()` to ensure `config.value` is always present.

### ~~R2-S6. CSV Export Vulnerable to Formula Injection~~ FIXED

**Severity:** HIGH | **File:** `src/features/compass/presentation/CompassBookingsTab.tsx:247-267`

**Fixed:** Added `csvSafe()` helper that prefixes cells starting with `=`, `+`, `-`, `@`, `\t`, `\r` with a single quote to prevent spreadsheet formula injection.

### ~~R2-S7. Work Hours Validation Ignores Timezone~~ FIXED

**Severity:** HIGH | **File:** `server/src/features/compass-bookings/workHoursService.ts`

**Fixed:** Added `getTimeInTimezone()` helper using `Intl.DateTimeFormat` to convert booking times to company timezone before comparing against work hours. Falls back to UTC if timezone is invalid.

---

## MEDIUM

### ~~R2-S8. Recurrence Creates Bookings Without Transaction~~ FIXED

**Severity:** MEDIUM | **File:** `server/src/features/compass-bookings/recurrenceService.ts:120-137`

**Fixed:** Wrapped `createMany` in `params.prisma.$transaction()`.

### ~~R2-S9. BookingDialog Unmount Doesn't Cancel Work Hours Fetch~~ FIXED

**Severity:** MEDIUM | **File:** `compass/src/features/booking/presentation/BookingDialog.tsx:88-92`

**Fixed:** Added `cancelled` flag with cleanup function to prevent setState on unmounted component.

### ~~R2-S10. useBookingStore createBooking Fire-and-Forget Refreshes~~ FIXED

**Severity:** MEDIUM | **File:** `compass/src/features/booking/application/useBookingStore.ts:62-78`

**Fixed:** Changed to `await Promise.all([fetchActiveBooking(), fetchBookings()])` so refresh completes before isLoading is cleared.

### ~~R2-S11. Team Member Add Has No Duplicate Check~~ FIXED

**Severity:** MEDIUM | **File:** `server/src/features/compass-organization/service.ts:117-127`

**Fixed:** Added `findUnique` check before `create`. Returns user-friendly `badRequest('User is already a member of this team')` instead of cryptic P2002.

### ~~R2-S12. Friendship Block Doesn't Validate Current Status~~ FIXED

**Severity:** MEDIUM | **File:** `server/src/features/compass-friends/service.ts:118-133`

**Fixed:** Added `if (friendship.status === 'BLOCKED') throw badRequest('User is already blocked')` before state transition.

### ~~R2-S13. SSO Audit Logging Missing~~ FIXED

**Severity:** MEDIUM | **File:** `server/src/features/sso/controller.ts`

**Fixed:** Added `appLogger.info('SSO', ...)` calls for create, update, and delete operations with companyId and configId context.

---

## LOW

| # | File | Issue | Status |
|---|------|-------|--------|
| ~~R2-L1~~ | `compass/src/features/auth/presentation/LoginPage.tsx:168` | Auto-submit timing race | **FIXED** — replaced `setTimeout(fn, 100)` with `requestAnimationFrame` |
| ~~R2-L2~~ | `server/src/features/compass-bookings/types.ts:72` | `bookingQuerySchema.status` unvalidated | **FIXED** — added `.refine()` validating comma-separated status values |
| ~~R2-L3~~ | `compass/src/shared/infrastructure/compassSocket.ts:23-31` | `console.log` in production | **FIXED** — replaced with silent comments |
| ~~R2-L4~~ | `server/src/features/compass-bookings/service.ts:43` | Inconsistent error format | **FIXED** — changed to error code enum `END_TIME_REQUIRED` |
| ~~R2-L5~~ | `server/prisma/schema.prisma` Booking model | Missing composite index | **FIXED** — added `@@index([companyUserId, status, startTime])` |
| ~~R2-L6~~ | `src/features/compass/presentation/CompassBookingsTab.tsx` | No debounce on filter | **Acceptable** — dropdown selection is intentional immediate action |

---

## Action Priority

| Priority | Issues | Effort | Status |
|----------|--------|--------|--------|
| **Immediate** | R2-S1 (recurrence overlap), R2-S2 (status filter), R2-S3 (scope validation) | 2-3 hours | **All resolved** |
| **This week** | R2-S4 (socket leak), R2-S5 (rule config), R2-S6 (CSV injection), R2-S7 (timezone) | 3-4 hours | **All resolved** |
| **Next sprint** | R2-S8 through R2-S13 | 3-4 hours | **All resolved** |
| **Backlog** | R2-L1 through R2-L6 | 1-2 hours | **All resolved** |
