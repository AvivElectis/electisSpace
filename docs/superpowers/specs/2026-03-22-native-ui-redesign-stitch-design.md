# Native UI Redesign — Stitch Design System

> **Goal:** Complete native Android UI rewrite using Stitch-generated design language. Every screen purpose-built for mobile with Material Design 3 aesthetics. Fresh component architecture — no reuse of Phase 1 components.

**Stitch Project:** `7489934128320754964` (9 screens generated)
**Design References:** `docs/stitch-designs/*.html` + `docs/stitch-designs/*.png`
**Branch:** `feat/native-ui-redesign-stitch`
**Previous spec (superseded):** `docs/superpowers/specs/2026-03-18-native-ui-rewrite-design.md`

---

## Constraints

- All changes gated behind `isNative` — web app completely untouched
- Web E2E tests (Playwright) must pass unchanged
- Use MUI 7 components styled with Stitch design tokens
- RTL-aware (Hebrew + English)
- Capacitor 8, React 19, Zustand 5
- Live verification on Android emulator after each major chunk
- Delete all Phase 1 native components and start clean

---

## 1. Architecture

### Core Principle

Complete visual separation. Native gets its own component tree. Branching happens at two levels only:

1. **MainLayout** — renders web shell or native shell
2. **Route level** — each route renders web page or native page

No `isNative` checks inside individual components.

### Shared Layers (web + native)

- **Zustand stores** — all state management
- **Infrastructure** — API calls, axios instances
- **Domain** — types, schemas, Zod validation
- **Hooks** — `useSpaceTypeLabels`, `useCompanyFeatures`, `useAndroidBackButton`, etc.

### Native Presentation Layer

Each feature gets a `presentation/native/` subdirectory:

```
src/features/<feature>/
  presentation/
    native/
      Native<Feature>ListPage.tsx
      Native<Feature>FormPage.tsx
```

Shared native components live in:

```
src/shared/presentation/native/
```

### Route Tree

```
Routes (native-only, inside NativeShell):
  /                       → NativeDashboardPage
  /people                 → NativePeopleListPage
  /people/new             → NativePersonFormPage
  /people/:id/edit        → NativePersonFormPage
  /spaces                 → NativeSpacesListPage
  /spaces/new             → NativeSpaceFormPage
  /spaces/:id/edit        → NativeSpaceFormPage
  /conference             → NativeConferencePage
  /conference/new         → NativeConferenceFormPage
  /conference/:id/edit    → NativeConferenceFormPage
  /labels                 → NativeLabelsPage
  /labels/link            → NativeLinkLabelPage
  /aims-management        → NativeAimsPage
  /people/import          → NativeCSVUploadPage
  /labels/assign-image    → NativeAssignImagePage
  /labels/:code/images    → NativeLabelImagesPage
  /settings               → NativeSettingsPage (hub with inline tabs: App, SoluM, Logo, Security, Logs)
  /settings/profile       → NativeProfilePage
  /settings/users         → NativeUsersListPage
  /settings/users/new     → NativeUserFormPage
  /settings/users/:id     → NativeUserFormPage
  /settings/users/:id/elevate → NativeElevateUserPage
  /settings/companies     → NativeCompaniesListPage
  /settings/companies/new → NativeCompanyFormPage (wizard)
  /settings/companies/:id → NativeCompanyFormPage (edit)
  /settings/companies/:id/features → NativeCompanyFeaturesPage
  /settings/companies/:id/stores          → NativeStoresListPage
  /settings/companies/:id/stores/new      → NativeStoreFormPage
  /settings/companies/:id/stores/:sid     → NativeStoreFormPage
  /settings/companies/:id/stores/:sid/features → NativeStoreFeaturesPage
  /settings/roles         → NativeRolesListPage
  /settings/roles/new     → NativeRoleFormPage
  /settings/roles/:id     → NativeRoleFormPage
  /settings/logs          → NativeLogsPage
  /settings/about         → NativeAboutPage

Standalone (no NativeShell):
  /login                  → NativeLoginPage
```

---

## 2. Stitch Design System — Theme

### Design Tokens

Extracted from Stitch-generated HTML designs. Two files:

- `src/shared/presentation/themes/nativeTheme.ts` — MUI `createTheme()` override
- `src/shared/presentation/themes/nativeTokens.ts` — raw constants

#### Colors

```typescript
// Primary
primary:        '#005dac'   // Stitch "Executive Indigo"
primary.dark:   '#004080'
primary.light:  '#1976d2'

// Surfaces (tonal layering — "No-Line Rule")
surface:        '#f9f9fe'   // base layer
surface.low:    '#f2f3fa'   // section backgrounds
surface.high:   '#dfe2ec'   // elevated cards
surface.lowest: '#ffffff'   // floating elements

// Status
success:        '#4caf50'   // assigned, available, linked
warning:        '#ff9800'   // unassigned, upcoming
error:          '#d32f2f'   // occupied, delete, logout
info:           '#2196f3'   // coverage, sync
```

#### Typography

```typescript
headings: 'Manrope, sans-serif'   // display, headline — geometric, modern
body:     'Inter, sans-serif'     // body, labels — legibility for codes, IDs, RTL
```

#### Surfaces — "No-Line Rule"

No 1px borders for sectioning. Boundaries defined solely through tonal color shifts.

- Base layer: `surface` (#f9f9fe)
- Sections: `surface.low` (#f2f3fa)
- Cards: `surface.lowest` (#ffffff) with subtle shadow
- Elevated: `surface.high` (#dfe2ec)

#### Glass Effect

```typescript
export const glass = {
  background: 'rgba(249, 249, 254, 0.8)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};
```

Used by: NativeAppBar, NativeBottomNav, floating FABs.

#### Spacing & Sizing

```typescript
page.padding:     16    // horizontal
section.gap:      16    // vertical between sections
card.padding:     16    // inner
card.radius:      16    // border-radius
button.radius:    12
chip.radius:      8
input.radius:     12
touch.minHeight:  48    // minimum touch target
bottomNav.height: 64    // + safe-area-inset-bottom
appBar.height:    56    // + safe-area-inset-top
```

#### App Bar Gradient

```typescript
background: 'linear-gradient(135deg, #005dac, #004080)'
```

#### Shadow

```typescript
card.shadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
```

### Theme Application

The native theme wraps the app only when `isNative`:

```tsx
// In MainLayout or App
const theme = isNative ? nativeTheme : webTheme;
<ThemeProvider theme={theme}>
```

Web theme is completely untouched.

---

## 3. Shared Native Components

All in `src/shared/presentation/native/`.

### Shell Components

**NativeShell.tsx** — app shell wrapping all authenticated routes:
- Wraps content with `SyncProvider` (required for SSE event stream)
- NativeAppBar at top
- `<Outlet />` for page content (scrollable), wrapped in `StoreRequiredGuard`
- NativeBottomNav at bottom
- `SyncStatusIndicator` floating widget positioned above bottom nav
- Store-switching overlay (`isSwitchingStore` from `useCompanyStore`) — full-screen loader during store switch
- Calls `useNativeInit()` for Capacitor-specific initialization
- Calls `useAndroidBackButton()` for hardware back button handling

**Title mechanism:** Each native page sets its title via `NativePageTitleContext` (React context). NativeShell provides the context, NativeAppBar reads it. Main nav pages (Dashboard, People, etc.) set their title on mount. Sub-pages (edit forms, settings sub-pages) set their title + `showBackArrow: true`. This replaces the Phase 1 approach of each NativePage owning its own app bar.

**NativeAppBar.tsx** — top bar:
- Blue gradient background (135deg, primary → primary.dark)
- Glass effect variant for sub-pages
- Safe-area-inset-top padding
- Left: hamburger or back arrow (controlled by `NativePageTitleContext.showBackArrow`)
- Center: page title (from `NativePageTitleContext`)
- Right: action icons slot (search, filter, settings, save — set per-page via context)
- Height: 56px + safe area
- Company/store selector (on main pages only)

**NativeBottomNav.tsx** — bottom navigation:
- **Permission-aware:** reads tabs from `useNavTabs()` hook, NOT a hardcoded 5-tab list
- `useNavTabs()` dynamically includes/excludes tabs based on `isPeopleManagerMode`, `canAccessFeature()`, and user role
- Second tab swaps between People (`/people`) and Spaces (`/spaces`) based on `isPeopleManagerMode`
- Glass effect background
- Haptic feedback on tab change (ImpactStyle.Light)
- Active tab: filled icon + label. Inactive: outlined icon only
- Syncs active state with `location.pathname`
- Height: 64px + safe-area-inset-bottom

**NativePage.tsx** — scroll container:
- Safe-area padding
- Bottom offset for NativeBottomNav
- Pull-to-refresh support (native only, haptic at 80px threshold)
- Optional `noPadding` for edge-to-edge content

### List Components

**NativeGroupedList.tsx** — sectioned list:
- Generic `<T>` typed
- Sections: `{ title, count, color, icon, items }[]`
- Rounded card containers per section (16px radius)
- Section headers: uppercase, 11px, colored accent
- Dividers: tonal shift only (no 1px lines)
- Chevron on each item
- For lists exceeding 500 items (Spaces, Labels), use a separate `NativeVirtualizedList` component (flat, no grouped sections) that renders all items in a single `react-window` `FixedSizeList`. The grouped section design does not work with react-window due to dynamic container heights. Pages with large lists offer a toggle: "Group by status" (native scroll, grouped) vs "Show all" (virtualized, flat).
- FAB slot positioned above bottom nav
- Empty state slot

**NativeCard.tsx** — tonal card:
- White background, 16px radius, subtle shadow
- No borders (tonal layering)
- Tap feedback (ripple)
- Optional left accent border (colored)

**NativeChipBar.tsx** — horizontal scrollable filter chips:
- Scrollable row with 8px radius chips
- Active chip: primary color filled
- Inactive: outlined
- Overflow: horizontal scroll with fade edge

**NativeStatBar.tsx** — summary stats row:
- "112 Total • 85 Assigned • 27 Unassigned"
- Colored dots before each stat
- Centered, body2 typography

**NativeSearchBar.tsx** — expandable search:
- Collapsed: search icon in app bar
- Expanded: full-width text field with clear button
- Debounce: 300ms
- Optional filter chips below

**NativeStatusBadge.tsx** — colored status pill:
- Variants: success/warning/error/info
- Small rounded pill with text
- Used for: Available, Occupied, Upcoming, Linked, Unlinked, Assigned

**NativeFAB.tsx** — floating action button:
- Positioned above NativeBottomNav
- Single action: round button with icon
- Expandable: stacked action buttons on tap
- ClickAwayListener to close
- Haptic on tap

**NativeEmptyState.tsx** — empty list placeholder:
- Centered icon (large, muted)
- Title + subtitle text
- Optional action button

### Form Components

**NativeFormPage.tsx** — form page wrapper:
- NativeAppBar with back arrow + Save button
- Scroll container with keyboard-aware offset
- Wraps form content
- Loading state overlay
- Handles save/cancel navigation

**NativeFormSection.tsx** — titled card section:
- Section label: uppercase, primary color, 11px, Inter
- White card container: 16px radius, subtle shadow
- Inner padding: 16px
- Groups related form fields

**NativeTextField.tsx** — styled MUI TextField:
- variant="filled"
- 12px border-radius
- 48px minimum height (touch target)
- Floating label
- Matches Stitch input styling

**NativeBottomSheet.tsx** — bottom sheet picker:
- MUI SwipeableDrawer anchor="bottom"
- Rounded top corners (16px)
- Drag handle indicator
- Search field at top for long lists
- Item list with selection indicator
- Used for: space picker, type selector, role selector

**NativeDeleteButton.tsx** — destructive action:
- Red outlined button, full width
- Confirmation dialog on tap
- Haptic feedback (ImpactStyle.Heavy)

### Transition Components

**PageTransition.tsx** — route transition wrapper:
- Slide-in from inline-end (250ms ease-out)
- View Transitions API on Android 13+ (WebView 111+)
- CSS translateX fallback for older WebViews
- Feature detect: `'startViewTransition' in document`
- RTL-aware: direction flips via `document.dir`
- Back navigation: slide out to inline-end

### Feature-Specific Item Components

**NativePersonItem.tsx** — person list row:
- Avatar circle (initials or image)
- Name (body1, bold) + subtitle (department, body2, muted)
- Space badge on right (blue bg for assigned, orange for unassigned)
- Chevron icon

**NativeSpaceItem.tsx** — space list row:
- Space type icon (desk/room/chair)
- Space ID prominent
- Assigned person name or "Unassigned" (muted)
- Label status icon (chain linked/unlinked)

**NativeRoomCard.tsx** — conference room card:
- Room name (headline6)
- Status badge (NativeStatusBadge)
- Meeting info: "Team Standup • 10:00-10:30"
- Participant avatar stack (max 3 + overflow count)
- Left border accent matching status color

**NativeLabelCard.tsx** — ESL label card:
- Label code in monospace font
- Article ID + name
- Thumbnail image (right aligned, small)
- Linked/unlinked status icon
- Quick action buttons: Link/Unlink, View Images

---

## 4. Feature Screens

### 4a. Login — NativeLoginPage

Standalone (no NativeShell). Reference: `docs/stitch-designs/login.png`.

- Full-screen gradient background (surface → primary at 5%)
- No card — fields render directly on the gradient (matching Stitch login.png):
  - Logo: "electisSpace" with icon + Hebrew tagline (centered, top third)
  - EN/HE segmented toggle (top-right of screen)
  - Email field (envelope icon prefix) — filled style on transparent/surface background
  - Password field (lock icon prefix, visibility toggle suffix)
  - "Trust this device" checkbox + "Skip verification next time" subtitle
  - Blue "Sign In" button (full width, 48px height, 12px radius)
  - "Forgot password?" link
- Biometric section below form: fingerprint icon + "Biometric Login" text
- OTP flow: fields swap to 6-digit code input with countdown timer + resend

**Store:** `useAuthStore`

### 4b. Dashboard — NativeDashboardPage

Reference: `docs/stitch-designs/dashboard.png`.

- Pull-to-refresh enabled
- NativeSwipeCarousel (horizontal, dot indicators + "1/4" counter):
  - **Spaces card:** Hero number (display-lg), "Total Spaces", LinearProgress (coverage %), 3 stat tiles row
  - **Conference card:** Active rooms count with green dot, next meeting info
  - **People card:** Total count, assigned/unassigned horizontal split bar
  - **AIMS card:** Connection status dot (green/red), last sync timestamp, Sync Now button
- Quick actions row: icon buttons (Scan ESL, Floor Map)
- Recent notifications list (last 5)
- NativeFAB expandable: Add Person, Add Room, Sync Labels

**Stores:** `useSpaceStore`, `useConferenceStore`, `usePeopleStore`, `useSyncStore`

### 4c. People — NativePeopleListPage + NativePersonFormPage

Reference: `docs/stitch-designs/people-list.png`, `docs/stitch-designs/person-edit.png`.

**List page:**
- NativeStatBar: "112 Total • 85 Assigned • 27 Unassigned"
- NativeSearchBar (expandable) + NativeChipBar (Department, Status, Space Type)
- NativeGroupedList with two sections:
  - "Assigned (85)" — green accent, NativePersonItem rows with space badge
  - "Unassigned (27)" — orange accent, NativePersonItem rows with warning icon
- NativeFAB: "+" add person → navigates to `/people/new`
- Tap item → navigates to `/people/:id/edit`

**Form page:**
- NativeFormPage with Save in app bar
- NativeFormSection "Personal Information": Full Name, Employee ID, Department (dropdown), Email, Phone
- NativeFormSection "Space Assignment": current space display, Change button (opens NativeBottomSheet with space list), Unassign button
- NativeFormSection "Linked Device" (read-only): label code, thumbnail, last sync
- NativeDeleteButton at bottom (edit mode only)

**Store:** `usePeopleStore`

### 4d. Spaces — NativeSpacesListPage + NativeSpaceFormPage

Reference: `docs/stitch-designs/spaces-management.png`, `docs/stitch-designs/space-edit.png`.

**List page:**
- NativeStatBar: "142 Spaces • 3 Types • 78% Assigned"
- NativeChipBar: All, Offices, Rooms, Chairs (from space type config)
- List/grid toggle in app bar
- NativeGroupedList grouped by linked/unlinked status
- NativeSpaceItem rows
- NativeFAB: "+" add space

**Form page:**
- NativeFormSection "Space Details": Space ID (read-only on edit), Space Type (dropdown), dynamic fields from article format (rendered from `peopleManagerConfig`)
- NativeFormSection "Person Assignment": assigned person with avatar, Change/Unassign buttons
- NativeFormSection "Label Info": linked label with preview thumbnail, battery %, signal
- NativeDeleteButton (edit mode)

**Store:** `useSpaceStore`, `useSettingsStore (peopleManagerConfig selector)` for dynamic fields

### 4e. Conference — NativeConferencePage + NativeConferenceFormPage

Reference: `docs/stitch-designs/conference-rooms.png`.

**List page:**
- Summary: "3 of 8 rooms occupied"
- NativeChipBar: All, Available, Occupied
- Vertical NativeRoomCard list
- NativeFAB: "+" add room

**Form page:**
- NativeFormSection "Room Details": Room ID, Room Name
- NativeFormSection "Meeting Info": meeting title, start time (time picker), end time (time picker)
- NativeFormSection "Participants": list with add/remove
- NativeDeleteButton (edit mode)

**Store:** `useConferenceStore`

### 4f. Labels — NativeLabelsPage + NativeLinkLabelPage

Reference: `docs/stitch-designs/labels-management.png`.

**List page:**
- NativeStatBar: "248 Labels • 210 Linked • 38 Unlinked"
- "Show linked only" toggle switch
- NativeLabelCard list with pagination (25/page)
- Pagination controls at bottom
- Speed dial NativeFAB: Link Label, Bulk Assign, Refresh All

**Link page:**
- NativeFormSection: Label code input, article selector (NativeBottomSheet), preview
- Handles both link and unlink flows

**Store:** `useLabelsStore`

### 4g. AIMS — NativeAimsPage

- Connection status header: green/red dot, server URL, last sync
- Sync controls: Sync Now button, auto-sync toggle
- Tab-like section chips: Articles, Gateways, Labels, Templates
- Each section: NativeGroupedList with relevant items
- Detail view: tap item → info display (inline expandable, not separate route)

**Store:** `useSyncStore`, `useAimsManagementStore`

---

## 5. Settings — Full Sub-Page Architecture

### NativeSettingsPage (hub)

Reference: `docs/stitch-designs/settings.png`.

- NativeAppBar: "Settings", back arrow, EN/HE segmented switcher
- Quick actions row (horizontal scroll): Edit Profile, Help/Manual, About, Logout (red tint)
- Horizontal scrollable tab chips: App, SoluM, Logo, Security, Users, Companies, Roles, Logs
- Tab content renders inline below chips

### Inline Tabs (no sub-routes)

**App Settings:**
- Theme: 3 radio cards (Light, Dark, System) with preview icons
- Notifications: toggle switch
- Offline mode: toggle switch with explanation subtitle
- Cache: "Clear Cache" button with size display

**SoluM Settings:**
- Server URL: NativeTextField
- API Key: NativeTextField (type=password, masked)
- Auto-sync interval: dropdown (5min, 15min, 30min, 1hr, Manual)
- Test Connection: button with success/error status indicator

**Logo Settings:**
- Company logo: upload button + preview thumbnail + remove
- Store logo: upload button + preview thumbnail + remove
- Image picker via Capacitor Camera/Filesystem plugin

**Security:**
- Change password: current + new + confirm fields in NativeFormSection
- 2FA: toggle switch, QR code display when enabling
- Trusted devices: list of devices with "Revoke" button each
- Session timeout: dropdown selector

**Logs:**
- Monospace scrollable list from in-memory ring buffer (`GET /api/v1/logs`)
- Filter chips: All, Info, Warn, Error
- Auto-scroll toggle
- Pull-to-refresh to reload

### Deep Sub-Pages (separate routes)

**Users (admin only):**

`/settings/users` — NativeUsersListPage:
- NativeGroupedList grouped by role
- Each item: name, email, role badge
- NativeFAB: "+" invite user

`/settings/users/new` and `/settings/users/:id` — NativeUserFormPage:
- NativeFormSection "User Info": name, email, role dropdown
- NativeFormSection "Permissions": store access checkboxes
- NativeDeleteButton (edit mode)

`/settings/users/:id/elevate` — NativeElevateUserPage:
- Role selection with permission preview
- Confirmation step

**Companies (platform/company admin):**

`/settings/companies` — NativeCompaniesListPage:
- NativeGroupedList of companies
- Each item: company name, store count badge
- NativeFAB: "+" create company

`/settings/companies/new` — NativeCompanyFormPage (wizard mode):
- Step indicator: 1. Details → 2. Features → 3. First Store
- Swipeable steps with Next/Back buttons
- Step 1: Company name, description
- Step 2: Feature toggles (checkboxes)
- Step 3: Store name, AIMS server URL
- Submit creates company + first store

`/settings/companies/:id` — NativeCompanyFormPage (edit mode):
- Tab chips: Details, Features, Stores
- Details tab: company name, description (NativeFormSection)
- Features tab: feature toggles
- Stores tab: inline NativeGroupedList of stores, tap to navigate

`/settings/companies/:id/features` — NativeCompanyFeaturesPage:
- Full-page feature toggle list with descriptions
- Save in app bar

`/settings/companies/:id/stores` — NativeStoresListPage:
- NativeGroupedList of stores for this company
- NativeFAB: "+" add store

`/settings/companies/:id/stores/new` and `.../:sid` — NativeStoreFormPage:
- NativeFormSection "Store Info": name, AIMS server URL, AIMS API key
- NativeFormSection "Configuration": people manager config, article format
- NativeDeleteButton (edit mode)

`/settings/companies/:id/stores/:sid/features` — NativeStoreFeaturesPage:
- Feature toggles with "inherit from company" option per feature

**Roles (platform/company admin):**

`/settings/roles` — NativeRolesListPage:
- NativeGroupedList of roles
- Each item: role name, permission count badge, user count
- NativeFAB: "+" create role

`/settings/roles/new` and `/settings/roles/:id` — NativeRoleFormPage:
- NativeFormSection "Role Info": name, description
- NativeFormSection "Permissions": grouped checkboxes by category (Spaces, People, Labels, Conference, Settings, AIMS)
- NativeDeleteButton (edit mode, only if no users assigned)

**Standalone:**

`/settings/profile` — NativeProfilePage:
- NativeFormSection: name, email (read-only), change password fields
- Save in app bar

`/settings/about` — NativeAboutPage:
- App icon + name
- Version: "v2.14.0"
- Build info
- Links: licenses, privacy policy
- "Check for updates" button

---

## 6. Capacitor "Cannot GET /" Fix

### Problem
Android emulator shows "Cannot GET /" — Capacitor WebView hits Vite dev server but doesn't receive `index.html`.

### Root Causes & Fixes

1. **Vite host binding:** Ensure dev server binds to `0.0.0.0`:
   ```typescript
   // vite.config.ts
   server: { host: '0.0.0.0', port: 3000 }
   ```

2. **Capacitor server config:** Verify `capacitor.config.ts` points to correct host:
   ```typescript
   server: {
     url: 'http://10.0.2.2:3000',  // Android emulator → host machine
     cleartext: true
   }
   ```

3. **SPA fallback:** Vite serves `index.html` for all routes by default, but custom middleware may break this. Verify no middleware intercepts `/` before the SPA handler.

4. **Base path:** Ensure `index.html` and Vite config use correct base (`/`) for dev mode.

### Verification
- Start Vite: `npm run dev`
- Start emulator: `npx cap run android --target=Medium_Phone_API_35`
- Confirm login page loads (not "Cannot GET /")

---

## 7. Dev Environment — Live Emulator Loop

Each implementation chunk follows this cycle:

```
1. npm run dev                                    (Vite dev server on 0.0.0.0:3000)
2. npx cap sync android                           (sync web assets + plugins)
3. npx cap run android --target=Medium_Phone_API_35  (deploy to emulator)
4. Code → Vite HMR → emulator auto-reloads
5. Take emulator screenshot for verification
6. Compare against Stitch design reference
```

### Emulator Checkpoints

After chunks 4, 7, 9, 15, 17, 22, 23 — take screenshots and compare against corresponding Stitch PNG.

---

## 8. Implementation Order

### Chunk 0: Capacitor Fix + Dev Environment
- Fix "Cannot GET /" (vite.config.ts, capacitor.config.ts)
- Delete all Phase 1 native components
- Verify emulator loads login page

### Chunk 1: Stitch Theme Extraction
- Create `src/shared/presentation/themes/nativeTheme.ts`
- Create `src/shared/presentation/themes/nativeTokens.ts`
- Extract all design tokens from Stitch HTML
- Load Manrope + Inter fonts

### Chunk 2: NativeShell + NativeAppBar + NativeBottomNav + NativePage
- App shell with gradient app bar
- Glass bottom nav with 5 tabs and haptics
- Scroll container with safe-area offsets

### Chunk 3: PageTransition + Route Plumbing
- PageTransition component (View Transitions API + fallback)
- NativeRoutes in AppRoutes.tsx
- Route-to-title mapping in NativeShell

### Chunk 4: NativeLoginPage
- Full standalone login screen matching Stitch design
- Biometric auth, OTP flow, language toggle
- **EMULATOR CHECKPOINT 1**

### Chunk 5: Shared List Components
- NativeGroupedList, NativeVirtualizedList (flat, react-window), NativeCard, NativeChipBar
- NativeStatBar, NativeSearchBar, NativeStatusBadge
- NativeFAB, NativeEmptyState
- NativePersonItem, NativeSpaceItem, NativeRoomCard, NativeLabelCard

### Chunk 6: Shared Form Components
- NativeFormPage, NativeFormSection, NativeTextField
- NativeBottomSheet, NativeDeleteButton

### Chunk 7: NativeDashboardPage
- NativeSwipeCarousel with 4 stat cards
- Quick actions row
- Notifications list
- Expandable FAB
- **EMULATOR CHECKPOINT 2**

### Chunk 8: NativePeopleListPage
- Grouped list (assigned/unassigned)
- Search + filter chips
- FAB

### Chunk 9: NativePersonFormPage
- Form sections: personal info, space assignment, linked device
- Bottom sheet space picker
- Delete button
- **EMULATOR CHECKPOINT 3**

### Chunk 10: NativeSpacesListPage
- Grouped list, filter chips, list/grid toggle

### Chunk 11: NativeSpaceFormPage
- Dynamic fields from article format config

### Chunk 12: NativeConferencePage
- Room cards with status badges and participant avatars

### Chunk 13: NativeConferenceFormPage
- Room details, meeting info, time pickers

### Chunk 14: NativeLabelsPage + NativeLabelImagesPage + NativeAssignImagePage
- Label cards with thumbnails, pagination, toggle
- Label images viewer page
- Assign image to label page

### Chunk 15: NativeLinkLabelPage + NativeCSVUploadPage
- Label linking form
- CSV upload page (people import)
- **EMULATOR CHECKPOINT 4**

### Chunk 16: NativeAimsPage
- Connection status, sync controls, section lists

### Chunk 17: NativeSettingsPage
- Hub with quick actions + inline tabs (App, SoluM, Logo, Security, Logs)
- **EMULATOR CHECKPOINT 5**

### Chunk 18: Settings — Users
- NativeUsersListPage, NativeUserFormPage, NativeElevateUserPage

### Chunk 19: Settings — Companies
- NativeCompaniesListPage, NativeCompanyFormPage (wizard + edit)

### Chunk 20: Settings — Company Sub-Pages
- NativeCompanyFeaturesPage, NativeStoresListPage, NativeStoreFormPage, NativeStoreFeaturesPage

### Chunk 21: Settings — Roles
- NativeRolesListPage, NativeRoleFormPage

### Chunk 22: Settings — Profile + About
- NativeProfilePage, NativeAboutPage
- **EMULATOR CHECKPOINT 6**

### Chunk 23: Polish
- Haptic feedback on all destructive actions and successful saves
- Skeleton loading screens for all list pages
- Transition refinement (timing, easing)
- RTL verification (switch to Hebrew, verify all pages)
- **FINAL EMULATOR VERIFICATION**

---

## 9. Testing Strategy

### Web E2E (Playwright)
Must pass unchanged. All native code gated behind `isNative`. Playwright runs against web — no impact.

### Native Component Unit Tests (Vitest + Testing Library)
Each shared component gets unit tests:
- NativeGroupedList: rendering sections, empty state, tap callbacks
- NativeFormSection: rendering title + children
- NativeTextField: value changes, validation display
- NativeBottomSheet: open/close, item selection
- NativeSwipeCarousel: swipe, dot indicators, RTL direction
- PageTransition: fallback when View Transitions unavailable

### Native Page Tests
Visual verification on Android emulator at each checkpoint. No Capacitor E2E (Playwright doesn't support Capacitor WebView).

### RTL Verification
Each emulator checkpoint includes toggling to Hebrew and verifying:
- Layout flips correctly
- Text alignment correct
- Swipe directions reversed
- Back arrow position flipped

### Transition Fallback
Test by mocking `document.startViewTransition` as undefined to verify CSS translateX fallback works.

---

## 10. File Map

### New Directories
```
src/shared/presentation/native/           — shared native components
src/shared/presentation/themes/           — nativeTheme + nativeTokens
src/features/*/presentation/native/       — per-feature native pages
```

### New Files (by chunk)

**Chunk 1 (theme):**
```
src/shared/presentation/themes/nativeTheme.ts
src/shared/presentation/themes/nativeTokens.ts
```

**Chunk 2-3 (shell + transitions):**
```
src/shared/presentation/native/NativeShell.tsx
src/shared/presentation/native/NativeAppBar.tsx
src/shared/presentation/native/NativeBottomNav.tsx
src/shared/presentation/native/NativePage.tsx
src/shared/presentation/native/NativePageTitleContext.tsx
src/shared/presentation/native/PageTransition.tsx
src/shared/presentation/native/NativeRoutes.tsx
```

**Chunk 4 (login):**
```
src/features/auth/presentation/native/NativeLoginPage.tsx
```

**Chunk 5 (list components):**
```
src/shared/presentation/native/NativeGroupedList.tsx
src/shared/presentation/native/NativeVirtualizedList.tsx
src/shared/presentation/native/NativeCard.tsx
src/shared/presentation/native/NativeChipBar.tsx
src/shared/presentation/native/NativeStatBar.tsx
src/shared/presentation/native/NativeSearchBar.tsx
src/shared/presentation/native/NativeStatusBadge.tsx
src/shared/presentation/native/NativeFAB.tsx
src/shared/presentation/native/NativeEmptyState.tsx
src/shared/presentation/native/NativePersonItem.tsx
src/shared/presentation/native/NativeSpaceItem.tsx
src/shared/presentation/native/NativeRoomCard.tsx
src/shared/presentation/native/NativeLabelCard.tsx
```

**Chunk 6 (form components):**
```
src/shared/presentation/native/NativeFormPage.tsx
src/shared/presentation/native/NativeFormSection.tsx
src/shared/presentation/native/NativeTextField.tsx
src/shared/presentation/native/NativeBottomSheet.tsx
src/shared/presentation/native/NativeDeleteButton.tsx
```

**Chunk 7 (dashboard):**
```
src/shared/presentation/native/NativeSwipeCarousel.tsx
src/features/dashboard/presentation/native/NativeDashboardPage.tsx
```

**Chunks 8-9 (people):**
```
src/features/people/presentation/native/NativePeopleListPage.tsx
src/features/people/presentation/native/NativePersonFormPage.tsx
```

**Chunks 10-11 (spaces):**
```
src/features/space/presentation/native/NativeSpacesListPage.tsx
src/features/space/presentation/native/NativeSpaceFormPage.tsx
```

**Chunks 12-13 (conference):**
```
src/features/conference/presentation/native/NativeConferencePage.tsx
src/features/conference/presentation/native/NativeConferenceFormPage.tsx
```

**Chunks 14-15 (labels + import):**
```
src/features/labels/presentation/native/NativeLabelsPage.tsx
src/features/labels/presentation/native/NativeLinkLabelPage.tsx
src/features/labels/presentation/native/NativeLabelImagesPage.tsx
src/features/labels/presentation/native/NativeAssignImagePage.tsx
src/features/import-export/presentation/native/NativeCSVUploadPage.tsx
```

**Chunk 16 (AIMS):**
```
src/features/sync/presentation/native/NativeAimsPage.tsx
```

**Chunks 17-22 (settings):**
```
src/features/settings/presentation/native/NativeSettingsPage.tsx    (hub + inline tabs: App, SoluM, Logo, Security, Logs)
src/features/settings/presentation/native/NativeProfilePage.tsx
src/features/settings/presentation/native/NativeUsersListPage.tsx
src/features/settings/presentation/native/NativeUserFormPage.tsx
src/features/settings/presentation/native/NativeElevateUserPage.tsx
src/features/settings/presentation/native/NativeCompaniesListPage.tsx
src/features/settings/presentation/native/NativeCompanyFormPage.tsx
src/features/settings/presentation/native/NativeCompanyFeaturesPage.tsx
src/features/settings/presentation/native/NativeStoresListPage.tsx
src/features/settings/presentation/native/NativeStoreFormPage.tsx
src/features/settings/presentation/native/NativeStoreFeaturesPage.tsx
src/features/settings/presentation/native/NativeRolesListPage.tsx
src/features/settings/presentation/native/NativeRoleFormPage.tsx
src/features/settings/presentation/native/NativeLogsPage.tsx
src/features/settings/presentation/native/NativeAboutPage.tsx
```

### Modified Files
```
src/AppRoutes.tsx                          — import NativeRoutes, conditional rendering
src/shared/presentation/layouts/MainLayout.tsx — isNative branch to NativeShell
vite.config.ts                             — host: '0.0.0.0' for emulator
capacitor.config.ts                        — server.url fix
index.html                                 — font imports (Manrope, Inter)
```

### Deleted Files (Phase 1 cleanup)
```
src/shared/presentation/layouts/NativePage.tsx
src/shared/presentation/layouts/NativeAppHeader.tsx
src/shared/presentation/layouts/NativeBottomNav.tsx
src/shared/presentation/components/NativeGroupedList.tsx
src/shared/presentation/components/NativeFormSection.tsx
src/shared/presentation/components/NativeRoutes.tsx
src/shared/presentation/components/PageTransition.tsx
src/features/people/presentation/PersonForm.tsx
src/features/people/presentation/NativePeopleList.tsx
src/features/people/presentation/NativePersonPage.tsx
```

---

## 11. Key Principles

1. **Complete separation** — native components never import from web presentation layer
2. **Shared business logic** — stores, hooks, API, domain types are platform-agnostic
3. **Stitch design tokens** — all styling derived from extracted theme, never ad-hoc values
4. **No-line rule** — tonal shifts for boundaries, no 1px borders
5. **Progressive delivery** — each chunk produces a working app, emulator-verified
6. **Web untouched** — `isNative` gate at layout/route level only, E2E tests pass
7. **RTL-first** — all components use logical properties (inline-start/end), verified at each checkpoint
