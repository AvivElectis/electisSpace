# electisCompass — E2E Test Plan

## Current State

**Existing E2E tests (142 tests):** Auth (7), Dashboard (15), Navigation (26), Spaces (19), People (27), Conference (24), Settings (24) — all cover the original electisSpace admin features.

**Missing coverage:** All Compass-specific features from Phases 1–27 have zero E2E coverage.

---

## Test Architecture

### Two Test Suites

| Suite | Base URL | App | Auth |
|-------|----------|-----|------|
| **Admin** | `http://localhost:3000` | electisSpace admin | Existing `auth.setup.ts` (admin JWT) |
| **Compass** | `http://localhost:5173` | Compass mobile app | New `compass-auth.setup.ts` (compass JWT) |

### New Page Objects Needed

**Admin POM extensions:**
- `CompassPage.ts` — Tab-based Compass admin page (bookings, spaces, employees, rules, org, amenities, neighborhoods, integrations, SSO)
- `CompanyWizardPage.ts` — Company creation wizard with Compass steps

**Compass Mobile POMs:**
- `CompassBasePage.ts` — Mobile shell, bottom nav, auth bypass
- `CompassLoginPage.ts` — Email + code login, SSO redirect
- `CompassHomePage.ts` — Today's booking, quick actions
- `CompassFindPage.ts` — Space search with filters
- `CompassBookingsPage.ts` — Active/past bookings, check-in/release
- `CompassProfilePage.ts` — Profile, friends, settings

### New Helpers

- `compassAuthSetup()` — Login as compass employee, cache compass JWT
- `waitForCompassReady(page)` — Wait for bottom nav tabs
- `createTestBooking(api)` — API helper to seed booking data
- `seedTestCompany(api)` — Create company with compass enabled + buildings + spaces

---

## Test Specs by Phase

### Phase 6 & 19: Admin Dashboard + Compass Card
**File:** `e2e/compass-dashboard.spec.ts` (~8 tests)

```
- Display compass card when company has compassEnabled
- Show daily booking stats (today's occupancy)
- Show booking count in compass card
- Navigate to compass admin from card
- Speed dial shows compass actions
- Compass card hidden when feature disabled
- Card shows correct occupancy percentage
- Card links to compass bookings tab
```

### Phase 7: Company Wizard with Compass
**File:** `e2e/compass-wizard.spec.ts` (~10 tests)

```
- Show compassEnabled toggle in step 1
- Expand wizard to include compass steps when enabled
- Building hierarchy step: add building + floor
- Space configuration step: assign space types
- Employee import step: CSV upload
- Booking rules step: configure rules
- Review step: show compass summary
- Complete wizard and verify company created
- Spaces/People/Conference tabs locked when Compass enabled
- Wizard disables non-compass features when toggle on
```

### Phase 6 (Admin Tabs): Compass Bookings Tab
**File:** `e2e/compass-bookings.spec.ts` (~12 tests)

```
- Display bookings table with columns
- Filter bookings by status (BOOKED/CHECKED_IN/RELEASED/CANCELLED)
- Pagination works for large booking lists
- Reserve space dialog: select employee + space
- Reserve space: "Until Cancellation" checkbox
- Reserve space: date/time picker
- Cancel booking from admin
- Edit booking details
- Show recurring booking group
- Cancel recurring: scope selector (instance/future/all)
- Bulk cancel bookings
- Export bookings as CSV
```

### Phase 6 (Admin Tabs): Compass Spaces Tab
**File:** `e2e/compass-spaces.spec.ts` (~10 tests)

```
- Display spaces table with type, capacity, amenities
- Filter by building/floor
- Edit space mode (hot desk / assigned / disabled)
- Edit space properties (type, capacity, amenities, neighborhood)
- Add space dialog with full property cascade
- Bulk operations on spaces
- Neighborhood cascade: select floor → load neighborhoods
- Amenity tags displayed on space rows
- Space type column with correct labels
- Permanent assignee field appears for assigned mode
```

### Phase 6 (Admin Tabs): Compass Employees Tab
**File:** `e2e/compass-employees.spec.ts` (~10 tests)

```
- Display employees table
- Add employee dialog with department/team/job title
- Edit employee: update department, isActive
- Deactivate employee
- Bulk activate/deactivate employees
- Import employees via CSV
- Export employees as CSV
- Filter by department
- Filter by active status
- Search employees by name/email
```

### Phase 6 (Admin Tabs): Compass Rules Tab
**File:** `e2e/compass-rules.spec.ts` (~8 tests)

```
- Display rules list with type and priority
- Add booking rule with type selection
- Configure rule: max duration, advance booking days, check-in window
- Edit existing rule
- Delete rule with confirmation
- Rule priority ordering
- Target branch/space type selection
- Toggle rule active/inactive
```

### Phase 22: Organization Tab (Departments + Teams)
**File:** `e2e/compass-organization.spec.ts` (~10 tests)

```
- Display department tree
- Create root department
- Create sub-department (child)
- Edit department (name, color, manager)
- Delete department with confirmation
- Display teams list
- Create team with department assignment
- Edit team (name, lead, members)
- Delete team
- Department hierarchy max depth handling
```

### Phase 23: Amenities + Neighborhoods Tabs
**File:** `e2e/compass-amenities.spec.ts` (~8 tests)

```
- Display amenities table with categories
- Add amenity with icon and category
- Edit amenity name
- Delete amenity with confirmation
- Display neighborhoods table per floor
- Add neighborhood with color and department affinity
- Edit neighborhood
- Delete neighborhood with confirmation
```

### Phase 10 & 26: Integrations Tab
**File:** `e2e/compass-integrations.spec.ts` (~8 tests)

```
- Display integrations list (empty state)
- Add integration: select provider (Microsoft 365, Google, Okta, LDAP)
- Fill provider-specific credentials
- Test connection before save (success flow)
- Test connection failure shows error
- Save disabled when test fails
- Trigger manual sync
- Show sync status and last sync time
```

### Phase 11 & 27: SSO Tab
**File:** `e2e/compass-sso.spec.ts` (~10 tests)

```
- Display SSO configs list (empty state)
- Add SAML config: fill IdP entity ID, SSO URL, certificate
- Add OIDC config: fill discovery URL, client ID, secret
- Test SAML connection (reachability check)
- Test OIDC connection (discovery validation)
- Save disabled when test fails
- Toggle SSO active/inactive
- Force SSO toggle
- Auto-provision toggle
- Delete SSO config with confirmation dialog
```

### Phase 8: Compass Mobile — Login
**File:** `e2e/compass-mobile-login.spec.ts` (~8 tests)

```
- Display email input on login page
- Submit email → show code input
- Invalid email shows error
- Enter correct code → navigate to home
- Invalid code shows error
- SSO: email with SSO domain redirects to IdP
- Login page responsive on mobile viewport
- Biometric prompt option (if available)
```

### Phase 8: Compass Mobile — Home + Bookings
**File:** `e2e/compass-mobile-bookings.spec.ts` (~14 tests)

```
- Display home tab with today's booking
- Show "no bookings" when empty
- Quick book from home
- Navigate to Find tab
- Find tab: display available spaces
- Find tab: filter by building/floor
- Find tab: filter by space type
- Find tab: filter by amenities
- Book a space from Find results
- Booking confirmation dialog
- Active bookings list
- Check-in to booking
- Release booking
- Cancel booking
```

### Phase 24: Compass Mobile — Recurring Bookings
**File:** `e2e/compass-mobile-recurring.spec.ts` (~6 tests)

```
- Create recurring booking (weekly)
- View recurring booking group in list
- Cancel single instance
- Cancel future instances
- Cancel all instances
- Recurring booking shows recurrence label
```

### Phase 8: Compass Mobile — Friends + Profile
**File:** `e2e/compass-mobile-social.spec.ts` (~8 tests)

```
- Display friends list
- Send friend request
- Accept friend request
- See friend's checked-in location
- Profile tab: display user info
- Profile tab: show department and team
- Profile tab: show branch address
- Profile tab: work hours display
```

---

## Test Data Seeding Strategy

**Option A (Recommended): API-based seeding**
- Before each spec file, use API calls to create required data
- Each spec uses unique company/employee data to avoid collisions
- Cleanup in `afterAll` or rely on unique IDs

**Option B: Shared seed data**
- Seed once during setup, share across all specs
- Risk: tests become order-dependent

### Required Seed Data

| Spec File | Seed Data |
|-----------|-----------|
| compass-dashboard | Company with compassEnabled, buildings, spaces, 1+ booking |
| compass-wizard | Clean state (no company) |
| compass-bookings | Company + employees + spaces + bookings in various statuses |
| compass-spaces | Company + buildings + floors + spaces with types/amenities |
| compass-employees | Company + departments + employees |
| compass-rules | Company + booking rules |
| compass-organization | Company + departments (nested) + teams |
| compass-amenities | Company + buildings + floors + amenities + neighborhoods |
| compass-integrations | Company (integration configs are ephemeral) |
| compass-sso | Company (SSO configs are ephemeral) |
| compass-mobile-* | Company + employee user + spaces + bookings |

---

## Implementation Priority

| Priority | Spec File | Tests | Rationale |
|----------|-----------|-------|-----------|
| P0 | compass-bookings.spec.ts | 12 | Core booking CRUD — most critical business logic |
| P0 | compass-spaces.spec.ts | 10 | Space management — fundamental to Compass |
| P0 | compass-mobile-bookings.spec.ts | 14 | Mobile booking flow — primary user journey |
| P1 | compass-employees.spec.ts | 10 | Employee management |
| P1 | compass-mobile-login.spec.ts | 8 | Mobile auth flow |
| P1 | compass-sso.spec.ts | 10 | SSO — recently added, needs validation |
| P1 | compass-integrations.spec.ts | 8 | Integration setup — complex flow |
| P2 | compass-dashboard.spec.ts | 8 | Dashboard card |
| P2 | compass-rules.spec.ts | 8 | Rule configuration |
| P2 | compass-organization.spec.ts | 10 | Org structure |
| P2 | compass-amenities.spec.ts | 8 | Amenities + neighborhoods |
| P3 | compass-wizard.spec.ts | 10 | Wizard (rarely changed) |
| P3 | compass-mobile-recurring.spec.ts | 6 | Recurring (edge cases) |
| P3 | compass-mobile-social.spec.ts | 8 | Friends + profile |

**Total new tests: ~130 tests across 14 spec files**

---

## Playwright Config Changes

```typescript
// Add compass mobile project to playwright.config.ts
{
  name: 'compass-setup',
  testMatch: /compass-auth\.setup\.ts/,
},
{
  name: 'compass',
  testMatch: /compass-mobile-.+\.spec\.ts/,
  dependencies: ['compass-setup'],
  use: {
    baseURL: 'http://localhost:5173',
    storageState: 'e2e/.auth/compass-user.json',
    viewport: { width: 375, height: 667 },
  },
}
```

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Infrastructure (POMs, helpers, auth setup) | 2-3 hours |
| P0 specs (3 files, 36 tests) | 4-5 hours |
| P1 specs (4 files, 36 tests) | 4-5 hours |
| P2 specs (4 files, 34 tests) | 3-4 hours |
| P3 specs (3 files, 24 tests) | 2-3 hours |
| **Total** | **~15-20 hours** |
