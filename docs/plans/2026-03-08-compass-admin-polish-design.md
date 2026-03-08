# Compass Phase 25: Admin UI Polish, Bug Fixes & Missing Integrations

**Version:** 1.0
**Date:** 2026-03-08
**Authors:** Aviv Ben Waiss + Claude Opus 4.6
**Status:** Approved
**Branch:** `claude/space-management-redesign-7ANoQ`

---

## 1. Scope

Phase 25 addresses all bugs, missing features, and polish items discovered during a comprehensive audit of the compass admin UI, server APIs, and mobile app. This phase focuses on correctness and completeness rather than new capabilities.

### Categories

| Category | Count | Priority |
|----------|-------|----------|
| Critical API Mismatches | 5 | P0 |
| Non-functional Features | 2 | P0 |
| Missing Admin UI Features | 8 | P1 |
| Server Error Handling | 3 | P1 |
| Mobile Integration Gaps | 7 | P2 |
| Test Coverage | 5 | P2 |
| UX Polish | 6 | P3 |

---

## 2. Critical Bugs (P0)

### 2.1 Neighborhoods Tab Non-functional

**Problem:** `CompassNeighborhoodsTab.tsx` is stubbed out — returns a placeholder, never loads data, API calls don't match signatures.

**Fix:**
- Implement floor selector (fetch floors from store hierarchy)
- Wire up `fetchNeighborhoods(floorId)` on floor selection
- Fix API call signatures to match `compassAdminApi`
- Add department affinity selector
- Add proper CRUD with confirmation dialogs

**Files:** `src/features/compass/presentation/CompassNeighborhoodsTab.tsx`

### 2.2 Extend Booking API Mismatch

**Problem:** Mobile client sends `newEndTime` but server expects `endTime`.

**Fix:** Change mobile client `ExtendBookingRequest` type to use `endTime`.

**Files:** `compass/src/features/booking/domain/types.ts`

### 2.3 Block User API Mismatch

**Problem:** Mobile sends `POST /friends/block` with `userId` in body, server expects `PATCH /friends/:id/block` with friendship ID in URL.

**Fix:** Update mobile `friendsApi.blockUser()` to use correct endpoint and parameter.

**Files:** `compass/src/features/friends/infrastructure/friendsApi.ts`

### 2.4 Amenity Filter Parameter Mismatch

**Problem:** Mobile sends `amenityIds` param, server expects `amenities`.

**Fix:** Change mobile `spacesApi.list()` to send `amenities` parameter.

**Files:** `compass/src/features/booking/infrastructure/spacesApi.ts`

### 2.5 Spaces Tab Uses Raw API Instead of compassAdminApi

**Problem:** `CompassSpacesTab.tsx` imports generic `api` and calls `api.post('/spaces')` directly instead of using `compassAdminApi.createSpace()`.

**Fix:** Add `createSpace` method to `compassAdminApi` and update the tab.

**Files:**
- `src/features/compass/infrastructure/compassAdminApi.ts`
- `src/features/compass/presentation/CompassSpacesTab.tsx`

---

## 3. Admin UI Missing Features (P1)

### 3.1 Employee Edit Dialog — Missing Fields

**Problem:** Edit dialog is missing:
- Department assignment (departmentId)
- Active/Inactive toggle (isActive)
- Employee number (editable)

**Fix:** Add all missing fields to edit dialog. isActive should be a toggle with role hierarchy check (admins can deactivate managers, managers can deactivate employees).

### 3.2 Employee Edit — Role Hierarchy for Deactivation

**Problem:** Any admin can deactivate any user. Should enforce:
- ADMIN can deactivate MANAGER and EMPLOYEE
- MANAGER can deactivate EMPLOYEE only
- Cannot deactivate self

**Fix:** Add role comparison logic in toggle handler and server-side validation.

### 3.3 Organization Tab — Missing Team Member Management UI

**Problem:** API has `addTeamMember` and `removeTeamMember` but no UI for it.

**Fix:** Add member management to team edit dialog:
- Autocomplete to search and add employees
- List current members with remove button
- Show member count badge

### 3.4 Bookings Tab — No Edit Capability

**Problem:** Can only cancel bookings, not edit them (change time, notes, space).

**Fix:** Add edit booking dialog with time/notes modification.

### 3.5 Spaces Tab — Incomplete Add/Edit Form

**Problem:** Add space form only has name and ID. Missing:
- Space type selector
- Floor/building assignment
- Capacity fields
- Amenity assignment
- Neighborhood assignment

**Fix:** Enhance add dialog and add edit dialog.

### 3.6 Amenities Tab — Hardcoded English Helper Text

**Problem:** Icon field has hardcoded `"e.g. monitor, wifi, wheelchair"`.

**Fix:** Add translation keys `compass.amenities.iconHint` for EN and HE.

### 3.7 Rules Tab — Space Type Translation Key Bug

**Problem:** Uses `compass.spaceType.${st}` (singular) but translations use `compass.spaceTypes.${st}` (plural).

**Fix:** Change to `compass.spaceTypes.${st}`.

### 3.8 Rules Tab — Save Button Missing Loading Spinner

**Problem:** Delete shows spinner but Save doesn't.

**Fix:** Add `saving` state check to Save button.

---

## 4. Server Error Handling (P1)

### 4.1 Generic Errors Instead of AppError

**Problem:** Three repositories throw `new Error()` instead of using `notFound()` from AppError:
- `compass-bookings/repository.ts` — rule not found
- `compass-friends/repository.ts` — company user not found

**Fix:** Import and use `notFound()` factory helper. Returns 404 instead of 500.

### 4.2 Department Name Not Populated in Mobile Auth

**Problem:** `mapToUserInfo()` in compass-auth service doesn't include `departmentName`. Profile page references it but gets undefined.

**Fix:** Join department table in user query and include `department.name` in response.

**Files:** `server/src/features/compass-auth/service.ts`

---

## 5. Mobile Integration Gaps (P2)

### 5.1 Work Hours Configuration Not Fetched

**Problem:** `branchWorkHours` is hardcoded as `null` in BookingDialog. Work hours validation never triggers.

**Fix:** Fetch work hours from server API (`GET /compass/work-hours/:branchId`) and pass to validation.

### 5.2 Branch Address Not Fetched in Profile

**Problem:** Branch address is hardcoded as `null` in ProfilePage.

**Fix:** Fetch branch details from server and display address.

### 5.3 Socket.IO Events Not Consumed

**Problem:** Server emits `space:booked`, `space:checkedIn`, `space:released`, `friend:request`, `friend:checkedIn` but mobile never subscribes.

**Fix:** Add Socket.IO listeners in mobile app stores to update state in real-time.

### 5.4 Requests Feature Empty

**Problem:** `compass/src/features/requests/` has empty subdirectories — no implementation.

**Fix:** Implement friend request management UI (pending requests, accept/decline).

### 5.5 Recurrence Cancel Scopes Missing in Mobile

**Problem:** Cancel action accepts `scope` but no UI offers the choice (instance/future/all).

**Fix:** Add cancel scope dialog when canceling a recurring booking.

### 5.6 Recurrence Pattern Display Missing

**Problem:** No component to show recurrence info on a booking (pattern, end date, series count).

**Fix:** Add RecurrenceInfo component shown in booking detail/list.

### 5.7 RRULE UNTIL Date Format

**Problem:** UNTIL date format `20260315T235959Z` may not match server expectations.

**Fix:** Verify and align date format between client and server RRULE parsing.

---

## 6. Test Coverage (P2)

### 6.1 Mobile App Has Zero Unit Tests

All compass mobile features lack tests. Priority test targets:
- `useBookingStore` — booking CRUD, recurrence
- `useFriendsStore` — friend management
- `useAuthStore` — login flow, token management

### 6.2 Phase 21-24 Server Tests Incomplete

Missing test coverage for:
- RecurrenceService edge cases
- Organization hierarchy validation
- Amenity/neighborhood CRUD operations

### 6.3 E2E Tests for Compass Admin

No Playwright tests for any compass admin tab.

---

## 7. UX Polish (P3)

### 7.1 Compass Page Tab State Loss

**Problem:** Tab switching unmounts/remounts components, losing state.

**Fix:** Use hidden display approach or cache state in parent.

### 7.2 No Deep Linking for Compass Tabs

**Problem:** Can't bookmark or share link to specific compass tab.

**Fix:** Use URL hash or query param for tab index.

### 7.3 Amenities Status Toggle Not Obvious

**Problem:** Chip is clickable to toggle status but looks like a label.

**Fix:** Add explicit toggle button or use Switch component.

### 7.4 No Bulk Operations

All tabs lack bulk select/edit/delete. Low priority but useful for large datasets.

### 7.5 No Pagination

Organization and employees tabs load all records. Will be slow for large companies.

### 7.6 No Export/Import

No CSV/Excel export or bulk import for employees, departments, amenities.

---

## 8. Implementation Order

```
Phase 25A — Critical Bugs (P0):           ~2 hours
  2.1 Fix Neighborhoods tab
  2.2 Fix Extend Booking API mismatch
  2.3 Fix Block User API mismatch
  2.4 Fix Amenity filter parameter
  2.5 Fix Spaces tab API usage

Phase 25B — Admin UI Features (P1):       ~3 hours
  3.1 Employee edit — all fields
  3.2 Employee role hierarchy
  3.3 Team member management UI
  3.4 Booking edit capability
  3.5 Space add/edit form
  3.6 Amenity icon hint translation
  3.7 Rules space type translation key
  3.8 Rules save spinner

Phase 25C — Server Fixes (P1):            ~1 hour
  4.1 AppError usage
  4.2 Department name in auth

Phase 25D — Mobile Integration (P2):      ~4 hours
  5.1-5.7 Mobile gaps

Phase 25E — Tests (P2):                   ~3 hours
  6.1-6.3 Test coverage

Phase 25F — UX Polish (P3):              ~2 hours
  7.1-7.6 Polish items
```

### Dependencies

- 25A blocks 25B (some fixes needed before feature enhancement)
- 25C can run in parallel with 25A/25B
- 25D depends on 25A (API fixes needed first)
- 25E depends on 25A-25D (test the fixed code)
- 25F is independent

---

## 9. Files Summary

### New Files
- None (all modifications to existing files)

### Modified Files (by priority)

**P0:**
- `src/features/compass/presentation/CompassNeighborhoodsTab.tsx`
- `src/features/compass/presentation/CompassSpacesTab.tsx`
- `src/features/compass/infrastructure/compassAdminApi.ts`
- `compass/src/features/booking/domain/types.ts`
- `compass/src/features/friends/infrastructure/friendsApi.ts`
- `compass/src/features/booking/infrastructure/spacesApi.ts`

**P1:**
- `src/features/compass/presentation/CompassEmployeesTab.tsx`
- `src/features/compass/presentation/CompassOrganizationTab.tsx`
- `src/features/compass/presentation/CompassBookingsTab.tsx`
- `src/features/compass/presentation/CompassAmenitiesTab.tsx`
- `src/features/compass/presentation/CompassRulesTab.tsx`
- `server/src/features/compass-bookings/repository.ts`
- `server/src/features/compass-friends/repository.ts`
- `server/src/features/compass-auth/service.ts`
- `src/locales/en/common.json`
- `src/locales/he/common.json`

**P2:**
- `compass/src/features/booking/presentation/BookingDialog.tsx`
- `compass/src/features/profile/presentation/ProfilePage.tsx`
- `compass/src/features/requests/` (all subdirectories)
- `compass/src/features/booking/application/useBookingStore.ts`
