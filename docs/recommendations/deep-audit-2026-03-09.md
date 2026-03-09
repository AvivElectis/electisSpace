# electisCompass — Deep Audit (2026-03-09)

Second pass audit after P0/P1 fixes. Focuses on recently implemented Compass features.

---

## CRITICAL (Fix Before Deploy)

### S1. SSO OIDC State Parameter Not Validated (CSRF Risk)
**Severity:** CRITICAL | **File:** `server/src/features/sso/controller.ts:228-246`

OIDC callback accepts `state` from query without verification. State is just base64-encoded JSON with no signature or session binding. Attacker can craft malicious state for account takeover.

**Fix:** Sign state with HMAC or store in server session, verify on callback, add expiration.

### S2. SSO Secrets Cleared on Re-Submit (Edit Mode)
**Severity:** HIGH | **File:** `src/features/compass/presentation/CompassSsoTab.tsx:110-112`

When editing SSO config, x509Certificate and clientSecret are intentionally not populated (masked). But if user re-submits without changing them, the payload sends `undefined`, potentially clearing existing secrets on the backend.

**Fix:** Only include secret fields in update payload if they were actually changed (track dirty state per field).

### S3. Booking Overlap Detection Flaw for Open-Ended Bookings
**Severity:** HIGH | **File:** `server/src/features/compass-bookings/service.ts:115-122`

Conflict check for bookings with `endTime: null` (open-ended) doesn't correctly detect all overlaps. The logic allows two open-ended bookings on the same space if their start times differ.

**Fix:** Add explicit check: if either existing or new booking is open-ended, check that start times don't overlap the other's time range.

### S4. Bookings Pagination Not Reset on Filter Change
**Severity:** HIGH | **File:** `src/features/compass/presentation/CompassBookingsTab.tsx:118-135`

When user changes `statusFilter`, page state remains at previous value (e.g., page 5). Filtered results may have fewer pages, returning empty data.

**Fix:** Reset page to 1 in the statusFilter onChange handler.

---

## HIGH (Fix This Week)

### S5. CSV Import Race Condition
**File:** `src/features/compass/presentation/CompassEmployeesTab.tsx:334-359`

Import loop increments counter without concurrency control. Use `Promise.allSettled()` and validate emails before import.

### S6. Integration Tab Error/Success State Confusion
**File:** `src/features/compass/presentation/CompassIntegrationsTab.tsx:122-140`

Success message set via `setError()`, displayed as error Alert. Use separate `successMessage` state.

### S7. Booking Dialog Closes Before API Confirms
**File:** `src/features/compass/presentation/CompassBookingsTab.tsx:197-203`

Dialog closes immediately, API failure leaves user with stale data. Keep dialog open until API succeeds.

### S8. Recurrence Service Skips Rule Validation
**File:** `server/src/features/compass-bookings/recurrenceService.ts:38-111`

Recurring series creation never validates `minBookingDurationMinutes`, `maxConcurrentBookings`, or `enforceWorkingHours` per instance. Users can bypass booking limits.

### S9. Missing Title Field in Booking Schema
**File:** `server/src/features/compass-bookings/types.ts:5-21`

Controller extracts `title` from payload but it's not in the Zod schema. SyncQueueProcessor expects `booking.title` to exist — can cause null reference.

**Fix:** Add `title: z.string().max(255).optional()` to schema.

---

## MEDIUM

### S10. Organization Cycle Detection Logic Bug
**File:** `server/src/features/compass-organization/service.ts:6-19`

Reports "cycle" when `depth > MAX_DEPTH=5`. Rejects legitimate deep hierarchies. Use visited-set approach instead of depth counter.

### S11. Amenity Delete Leaves Orphaned References
**File:** `server/src/features/compass-amenities/service.ts:27-31`

Soft-deleting an amenity doesn't clean up references from spaces' `compassAmenities` array. Stale amenity IDs persist.

### S12. Space Mode Transition: Permanent Assignee Not Validated
**File:** `server/src/features/compass-spaces/service.ts:60-80`

Transitioning to PERMANENT mode doesn't verify assignee exists, is active, or belongs to the company.

### S13. Integration Sync Concurrency Not Protected
**File:** `server/src/features/integrations/integrations.service.ts:114-172`

Two concurrent sync requests execute in parallel with no lock. Could cause duplicate data or credential state issues.

### S14. Device Token Cleanup Not Implemented
**File:** `server/src/features/compass-auth/service.ts:135-148`

Expired device tokens (365-day TTL) never cleaned up. Table bloat over time.

### S15. Compass Mobile: Null endTime Crashes HomePage
**File:** `compass/src/features/booking/presentation/HomePage.tsx:93-103`

Open-ended bookings (endTime=null) cause `split('T')` TypeError.

### S16. useBookingStore Socket Handler Triggers Infinite Refresh
**File:** `compass/src/features/booking/application/useBookingStore.ts:132-143`

Every socket update calls `fetchBookings()` regardless of relevance. Rapid socket emissions cause infinite loops.

### S17. BookingDialog Missing Timezone Awareness
**File:** `compass/src/features/booking/presentation/BookingDialog.tsx:156-158`

Date + time concatenated without timezone. DST transitions create ambiguous times.

### S18. Neighborhood Loading Race Condition
**File:** `src/features/compass/presentation/CompassSpacesTab.tsx:99-108`

Rapid floor changes cause overlapping fetch requests. No request cancellation — old responses overwrite newer ones.

### S19. Missing Translation Keys
**Severity:** MEDIUM

Multiple `compass.sso.*`, `compass.integrations.*`, `compass.amenities.inactive/active`, `compass.organization.noDepartments/noTeams` keys may be missing in one or both locale files.

### S20. SsoCallbackPage Hardcoded English
**File:** `compass/src/features/auth/presentation/SsoCallbackPage.tsx:32`

"Completing SSO login..." is hardcoded, not translated. No error state shown on failure.

---

## LOW

| # | File | Issue |
|---|------|-------|
| L1 | CompassRulesTab.tsx:440-453 | Priority not clamped in real-time (only on blur) |
| L2 | CompassAmenitiesTab.tsx:113-118 | Hebrew search uses toLowerCase instead of locale-aware |
| L3 | CompassBookingsTab.tsx:247-265 | CSV export missing recurrence columns |
| L4 | CompassEmployeesTab.tsx:49-102 | Filtered arrays not wrapped in useMemo |
| L5 | compass/useCompassAuthStore.ts:37-68 | Manual atob JWT decode — fragile |
| L6 | compass/BookingsPage.tsx:65-79 | Extend dialog missing time validation |
| L7 | CompassOrganizationTab.tsx:217-246 | Fetches all teams instead of just modified one |
| L8 | DashboardCompassCard.tsx:27-36 | No loading animation, skeleton only |

---

## Action Priority

| Priority | Issues | Effort |
|----------|--------|--------|
| **Immediate** | S1 (OIDC state), S2 (SSO secrets), S3 (overlap), S4 (pagination) | 2-3 hours |
| **This week** | S5-S9 | 3-4 hours |
| **Next sprint** | S10-S20 | 4-5 hours |
| **Backlog** | L1-L8 | 2-3 hours |
