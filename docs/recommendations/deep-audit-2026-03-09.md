# electisCompass — Deep Audit (2026-03-09)

Second pass audit after P0/P1 fixes. Focuses on recently implemented Compass features.

---

## CRITICAL (Fix Before Deploy)

### ~~S1. SSO OIDC State Parameter Not Validated (CSRF Risk)~~ FIXED
**Severity:** CRITICAL | **File:** `server/src/features/sso/controller.ts:228-246`

**Fixed:** State parameter now HMAC-signed with JWT_SECRET and 10-minute expiry. Verified with `crypto.timingSafeEqual`.

### ~~S2. SSO Secrets Cleared on Re-Submit (Edit Mode)~~ FALSE POSITIVE
**Severity:** HIGH | **File:** `src/features/compass/presentation/CompassSsoTab.tsx:110-112`

**Not a bug:** Client already only includes `x509Certificate`/`clientSecret` in payload if non-empty (lines 158, 161). Prisma's `update` ignores `undefined` fields.

### ~~S3. Booking Overlap Detection Flaw for Open-Ended Bookings~~ FALSE POSITIVE
**Severity:** HIGH | **File:** `server/src/features/compass-bookings/service.ts:115-122`

**Not a bug:** `adminCreateBooking` already handles open-ended bookings with separate conflict logic (lines 510-520). User bookings require `endTime` (line 42-44).

### ~~S4. Bookings Pagination Not Reset on Filter Change~~ FIXED
**Severity:** HIGH | **File:** `src/features/compass/presentation/CompassBookingsTab.tsx:118-135`

**Fixed:** Added `setPage(1)` in the `statusFilter` onChange handler.

---

## HIGH (Fix This Week)

### ~~S5. CSV Import Race Condition~~ FIXED
**File:** `src/features/compass/presentation/CompassEmployeesTab.tsx:334-359`

**Fixed:** Replaced sequential loop with `Promise.allSettled()` for concurrent import with proper result counting.

### ~~S6. Integration Tab Error/Success State Confusion~~ FIXED
**File:** `src/features/compass/presentation/CompassIntegrationsTab.tsx:122-140`

**Fixed:** Added separate `successMessage` state. Success and error now use independent Alert components.

### ~~S7. Booking Dialog Closes Before API Confirms~~ FALSE POSITIVE
**File:** `src/features/compass/presentation/CompassBookingsTab.tsx:197-203`

**Not a bug:** Both reserve and edit dialogs close inside the `try` block after `await`, so they wait for API response.

### ~~S8. Recurrence Service Skips Rule Validation~~ FIXED
**File:** `server/src/features/compass-bookings/recurrenceService.ts:38-111`

**Fixed:** `createRecurringSeries` now validates `minBookingDurationMinutes`, `maxBookingDurationMinutes`, and `maxConcurrentBookings` before creating instances.

### ~~S9. Missing Title Field in Booking Schema~~ FIXED
**File:** `server/src/features/compass-bookings/types.ts:5-21`

**Fixed:** Added `title: z.string().max(255).optional()` to both `createBookingSchema` and `adminCreateBookingSchema`.

---

## MEDIUM

### ~~S10. Organization Cycle Detection Logic Bug~~ FIXED
**File:** `server/src/features/compass-organization/service.ts:6-19`

**Fixed:** Replaced depth-counter approach with visited-set. Now correctly detects actual cycles without rejecting deep hierarchies.

### ~~S11. Amenity Delete Leaves Orphaned References~~ FIXED
**File:** `server/src/features/compass-amenities/service.ts:27-31`

**Fixed:** `deleteAmenity` now queries all spaces with the amenity ID and removes it from their `compassAmenities` array before soft-deleting.

### ~~S12. Space Mode Transition: Permanent Assignee Not Validated~~ FIXED
**File:** `server/src/features/compass-spaces/service.ts:60-80`

**Fixed:** PERMANENT mode now verifies assignee exists, is active, and belongs to the same company.

### ~~S13. Integration Sync Concurrency Not Protected~~ FIXED
**File:** `server/src/features/integrations/integrations.service.ts:114-172`

**Fixed:** Added in-memory `Set<string>` concurrency lock. `executeSyncForIntegration` checks/adds integration ID before executing and removes it in `finally` block. Concurrent requests get `badRequest('Sync already in progress')`.

### ~~S14. Device Token Cleanup Not Implemented~~ FIXED
**File:** `server/src/features/compass-auth/service.ts:291-299`

**Fixed:** Added `cleanupExpiredDeviceTokens()` function that deletes device tokens past their `expiresAt` date.

### ~~S15. Compass Mobile: Null endTime Crashes HomePage~~ FIXED
**File:** `compass/src/features/booking/presentation/HomePage.tsx:93-103`

**Fixed:** Added null check for `endTime` — displays translated "Open-ended" text when null.

### ~~S16. useBookingStore Socket Handler Triggers Infinite Refresh~~ FIXED
**File:** `compass/src/features/booking/application/useBookingStore.ts:132-143`

**Fixed:** `updateBookingFromSocket` now checks if the booking exists in active/upcoming/past lists before triggering refresh.

### ~~S17. BookingDialog Missing Timezone Awareness~~ FIXED
**File:** `compass/src/features/booking/presentation/BookingDialog.tsx:156-162`

**Fixed:** Added NaN validation guard for parsed dates. Uses local timezone via `Date` constructor (not UTC string parsing), which handles DST correctly.

### ~~S18. Neighborhood Loading Race Condition~~ FIXED
**File:** `src/features/compass/presentation/CompassSpacesTab.tsx:99-108`

**Fixed:** Added cleanup function with `cancelled` flag to prevent stale responses from overwriting newer ones.

### ~~S19. Missing Translation Keys~~ FIXED
**Severity:** MEDIUM

**Fixed:** All referenced compass keys already exist in web app locales. Added missing mobile app keys (`auth.completingSsoLogin`, `booking.untilCancellation`) to both EN and HE locale files.

### ~~S20. SsoCallbackPage Hardcoded English~~ FIXED
**File:** `compass/src/features/auth/presentation/SsoCallbackPage.tsx:32`

**Fixed:** Added `useTranslation` hook and replaced hardcoded string with `t('auth.completingSsoLogin')`.

---

## LOW

| # | File | Issue | Status |
|---|------|-------|--------|
| ~~L1~~ | CompassRulesTab.tsx:440-453 | Priority not clamped in real-time (only on blur) | **Already handled** — `Math.min/max` clamp exists in onChange |
| ~~L2~~ | CompassAmenitiesTab.tsx:113-118 | Hebrew search uses toLowerCase instead of locale-aware | **FIXED** — replaced with `toLocaleLowerCase()` |
| ~~L3~~ | ~~CompassBookingsTab.tsx:247-265~~ | ~~CSV export missing recurrence columns~~ | **FIXED** |
| ~~L4~~ | CompassEmployeesTab.tsx:376-380 | Filtered arrays not wrapped in useMemo | **FIXED** — wrapped in `useMemo` + locale-aware search |
| ~~L5~~ | compass/useCompassAuthStore.ts:37-68 | Manual atob JWT decode — fragile | **FIXED** — base64url-safe decode with proper UTF-8 handling |
| ~~L6~~ | compass/BookingsPage.tsx:65-79 | Extend dialog missing time validation | **FIXED** — null-safe fallback to `startTime` for date extraction |
| ~~L7~~ | CompassOrganizationTab.tsx:217-246 | Fetches all teams instead of just modified one | **FIXED** — extracted `refreshTeamMembers()` that fetches once and updates both `teams` and `membersTeam` |
| ~~L8~~ | DashboardCompassCard.tsx:27-36 | No loading animation, skeleton only | **Acceptable** — MUI Skeleton is standard loading pattern |

---

## Action Priority

| Priority | Issues | Effort | Status |
|----------|--------|--------|--------|
| **Immediate** | S1, S2, S3, S4 | 2-3 hours | **All resolved** |
| **This week** | S5-S9 | 3-4 hours | **All resolved** |
| **Next sprint** | S10-S20 | 4-5 hours | **All resolved** |
| **Backlog** | L1-L8 | 2-3 hours | **All resolved** |
