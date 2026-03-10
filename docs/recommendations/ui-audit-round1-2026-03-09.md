# electisCompass — UI/UX Audit Round 1 (2026-03-09)

Focused on UI bugs, missing buttons, missing functionality, non-optimized inputs/labels/forms/dialogs.

---

## CRITICAL

### ~~U1-S1. BookingCard Action Buttons Missing Loading/Disabled States~~ FIXED

**Severity:** CRITICAL | **File:** `compass/src/features/booking/presentation/BookingCard.tsx`

**Fixed:** Added `isLoading` prop with `CircularProgress` on active button, all buttons disabled during async operations. `BookingsPage.tsx` wired up `loadingBookingId` state across all handlers (checkIn, release, extend, cancel).

### ~~U1-S2. FriendsPage Accept/Decline/Send Buttons Missing Loading States~~ FIXED

**Severity:** CRITICAL | **File:** `compass/src/features/friends/presentation/FriendsPage.tsx`

**Fixed:** Added `loadingActionId` state for accept/decline/remove and `sendingRequest` state for send. All buttons disabled during operations with spinner on active button.

---

## HIGH

### ~~U1-S3. FriendsPage Remove Friend Has No Confirmation Dialog~~ FIXED

**Severity:** HIGH | **File:** `compass/src/features/friends/presentation/FriendsPage.tsx`

**Fixed:** Added confirmation dialog before calling `removeFriend()`. Remove button now opens dialog with Yes/No buttons.

### ~~U1-S4. BookingDialog Missing Form Wrapper (No Enter Key Support)~~ FIXED

**Severity:** HIGH | **File:** `compass/src/features/booking/presentation/BookingDialog.tsx`

**Fixed:** Wrapped dialog content in `<Box component="form" onSubmit={handleConfirm}>` to support Enter key submission.

### ~~U1-S5. LoginPage Email TextField Missing autoComplete~~ FIXED

**Severity:** HIGH | **File:** `compass/src/features/auth/presentation/LoginPage.tsx`

**Fixed:** Added `autoComplete="email"` to email TextField.

### ~~U1-S6. FindPage Search Missing type="search" and Clear Button~~ FIXED

**Severity:** HIGH | **File:** `compass/src/features/booking/presentation/FindPage.tsx`

**Fixed:** Added `type="search"` for mobile search keyboard and clear `IconButton` in endAdornment when text is non-empty.

### ~~U1-S7. SpaceCard and BookingCard Buttons Too Small for Touch (size="small")~~ FIXED

**Severity:** HIGH | **Files:** `SpaceCard.tsx`, `BookingCard.tsx`

**Fixed:** Changed all action buttons from `size="small"` to `size="medium"` for WCAG-compliant touch targets.

### ~~U1-S8. FriendsPage Email Validation Too Loose~~ FIXED

**Severity:** HIGH | **File:** `compass/src/features/friends/presentation/FriendsPage.tsx`

**Fixed:** Send button now uses `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` regex validation instead of simple `includes('@')`.

### ~~U1-S9. Recurrence End Date Missing Min Constraint~~ FIXED

**Severity:** HIGH | **File:** `compass/src/features/booking/presentation/BookingDialog.tsx`

**Fixed:** Already had `htmlInput: { min: date }` in slotProps — confirmed correct.

---

## MEDIUM

### ~~U1-S10. CompassSpacesTab Mode Dropdown No Loading Feedback~~ FIXED

**Severity:** MEDIUM | **File:** `src/features/compass/presentation/CompassSpacesTab.tsx`

**Fixed:** Added inline `CircularProgress` in the mode dropdown's endAdornment when `updatingSpaceId === s.id`.

### ~~U1-S11. CompassSpacesTab Capacity Input Accepts Negative/Zero~~ FIXED

**Severity:** MEDIUM | **File:** `src/features/compass/presentation/CompassSpacesTab.tsx`

**Fixed:** Added `slotProps={{ htmlInput: { min: 1, max: 999 } }}` to capacity input.

### ~~U1-S12. CompassBookingsTab DateTime Inputs Missing Timezone Info~~ FIXED

**Severity:** MEDIUM | **File:** `src/features/compass/presentation/CompassBookingsTab.tsx`

**Fixed:** Added `helperText={t('compass.timezoneHint')}` to datetime-local inputs in edit and reserve dialogs.

### ~~U1-S13. CompassRulesTab Save Button Missing Value Validation~~ FIXED

**Severity:** MEDIUM | **File:** `src/features/compass/presentation/CompassRulesTab.tsx`

**Fixed:** Added `|| !form.value.trim()` to save button's disabled condition.

### ~~U1-S14. CompassBookingsTab Reserve Dialog Autocompletes Missing Placeholder~~ FIXED

**Severity:** MEDIUM | **File:** `src/features/compass/presentation/CompassBookingsTab.tsx`

**Fixed:** Added `placeholder={t('common.search')}` to both Employee and Space autocomplete renderInput fields.

### ~~U1-S15. CompassEmployeesTab Search Doesn't Reset Pagination~~ FIXED

**Severity:** MEDIUM | **File:** `src/features/compass/presentation/CompassEmployeesTab.tsx`

**Fixed:** Added `setPage(1)` in search onChange handler to reset pagination when search changes.

### ~~U1-S16. ProfilePage Logout Has No Confirmation~~ FIXED

**Severity:** MEDIUM | **File:** `compass/src/features/profile/presentation/ProfilePage.tsx`

**Fixed:** Added confirmation dialog with logout button showing confirm/cancel before signing out.

---

## LOW

| # | File | Issue | Status |
|---|------|-------|--------|
| ~~U1-L1~~ | `compass/src/features/booking/presentation/BookingsPage.tsx:216` | Extend time input no validation that new end > current end | **Deferred** — requires runtime booking context |
| ~~U1-L2~~ | `compass/src/features/booking/presentation/BookingDialog.tsx:246` | Outside-work-hours warning not dismissible | **Deferred** — non-blocking warning |
| ~~U1-L3~~ | `compass/src/features/booking/presentation/SpaceCard.tsx:68` | Type icons missing aria-label for screen readers | **FIXED** — added `aria-label` with space type name |
| U1-L4 | `src/features/compass/presentation/CompassAmenitiesTab.tsx` | No manual refresh button (other tabs have one) | **Deferred** |
| ~~U1-L5~~ | `src/features/compass/presentation/CompassBookingsTab.tsx:256` | CSV export null endTime shows translation call not value | **Already correct** — uses ternary with `t('compass.untilCancellation')` |

---

## Action Priority

| Priority | Issues | Effort | Status |
|----------|--------|--------|--------|
| **Immediate** | U1-S1–S2 (loading states on buttons) | 2-3 hours | **All resolved** |
| **This week** | U1-S3–S9 (confirmation, form, autoComplete, search, touch, validation) | 3-4 hours | **All resolved** |
| **Next sprint** | U1-S10–S16 (dropdown feedback, capacity, timezone, rules, pagination, logout) | 3-4 hours | **All resolved** |
| **Backlog** | U1-L1–L5 | 1-2 hours | **3/5 resolved** |
