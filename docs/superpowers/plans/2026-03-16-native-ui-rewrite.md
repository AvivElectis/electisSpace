# Native UI Rewrite — Full Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** Transform the Capacitor app from a "web app in a shell" to a native-feeling Android app. Every screen the user touches should feel purpose-built for mobile.

**Architecture:** On native, all MUI Dialogs are replaced with routed full-screen pages using slide transitions. Lists use card-based layouts. Forms use section-based full-page layouts. All changes are gated behind `isNative` — the web app is untouched.

**Key Pattern:** `NativePage` wrapper component provides consistent page chrome (blue header with back button + title, safe-area padding, scroll container). All native pages use this wrapper.

**Spec:** `docs/superpowers/specs/2026-03-16-native-app-adaptations-design.md`

---

## Shared Infrastructure (do first)

### Task 1: NativePage Wrapper Component

**Create:** `src/shared/presentation/layouts/NativePage.tsx`

A reusable page wrapper for ALL native pages:
- Blue AppBar header with back arrow + title
- `paddingTop: max(env(safe-area-inset-top), 28px)`
- Optional right-side action buttons (save, etc.)
- Scroll container for content with `px: 2, py: 1.5`
- `paddingBottom: calc(var(--native-bottom-nav-offset, 0px) + 16px)` when inside MainLayout
- Slide-in entrance animation (from right for push, from left for back)

```typescript
interface NativePageProps {
    title: string;
    children: React.ReactNode;
    onBack?: () => void; // defaults to navigate(-1)
    actions?: React.ReactNode; // right-side header buttons
    noPadding?: boolean; // for full-bleed content
    hideBottomNavPadding?: boolean; // for pages outside MainLayout
}
```

### Task 2: NativePageRoute Helper

**Create:** `src/shared/presentation/components/NativePageRoute.tsx`

Wraps a component so it renders as a native page on native, or as a Dialog on web:
```typescript
// Usage in feature code:
<NativePageRoute
    title={t('conference.addRoom')}
    dialogProps={{ maxWidth: 'sm' }}
    open={dialogOpen}
    onClose={() => setDialogOpen(false)}
>
    <ConferenceRoomForm onSave={handleSave} room={room} />
</NativePageRoute>
```

On native: renders children inside `<NativePage>` at a route.
On web: renders children inside `<Dialog>` with existing props.

This is the key abstraction that lets us convert all 28 dialogs without duplicating components.

### Task 3: Page Slide Transitions

**Create:** `src/shared/presentation/components/PageTransition.tsx`

Wraps routes with CSS slide-in/out transitions for native:
- Push: slide in from inline-end
- Pop: slide in from inline-start
- Uses `useLocation` key changes to detect navigation direction
- RTL-aware (insetInlineStart/End)
- Duration: 250ms ease-out

### Task 4: Native Route Registry

**Modify:** `src/AppRoutes.tsx`

Add all native-only routes. On web, these routes don't exist (guarded by `isNative`):

```
/settings                   — NativeSettingsPage (exists)
/settings/company/:id       — CompanyDialog content as page
/settings/company/new        — CreateCompanyWizard as page
/settings/store/:id          — StoreDialog content as page
/settings/role/:id           — RoleDialog content as page
/settings/role/new           — RoleDialog content as page
/settings/user/:id           — EnhancedUserDialog as page
/settings/user/:id/elevate   — ElevateUserDialog as page
/settings/aims/:companyId    — AIMSSettingsDialog as page
/manual                     — NativeManualPage (exists)
/about                      — NativeAboutPage (exists)
/spaces/new                  — SpaceDialog as page
/spaces/:id/edit             — SpaceDialog as page
/people/new                  — PersonDialog as page
/people/:id/edit             — PersonDialog as page
/people/import               — CSVUploadDialog as page
/people/lists                — PeopleListsManagerDialog as page
/people/save-list            — PeopleSaveListDialog as page
/conference/new              — ConferenceRoomDialog as page
/conference/:id/edit         — ConferenceRoomDialog as page
/labels/link                 — LinkLabelDialog as page
/labels/assign-image         — AssignImageDialog as page
/labels/:code/images         — LabelImagesDialog as page
/aims/gateway/register       — GatewayRegistration as page
/aims/gateway/:id            — GatewayConfigDialog as page
/aims/article/:id            — ArticleDetailDialog as page
/aims/label/:code            — LabelDetailView as page
/aims/template/:id           — TemplateDetailDialog as page
/aims/template/upload        — UploadTemplateDialog as page
```

---

## Phase 1: Dialogs → Pages (highest impact)

### Task 5: Convert Feature CRUD Dialogs

For each feature's create/edit dialog, extract the form content into a standalone component, then render it in either a Dialog (web) or a NativePage (native).

**5a: SpaceDialog → NativeSpacePage**
- Extract form content from SpaceDialog into `SpaceForm.tsx`
- SpaceDialog renders `<Dialog><SpaceForm /></Dialog>` on web
- Route `/spaces/:id/edit` and `/spaces/new` render `<NativePage><SpaceForm /></NativePage>` on native
- SpacesManagementView: on native, "Add" FAB navigates to `/spaces/new` instead of opening dialog

**5b: PersonDialog → NativePersonPage**
- Same pattern: extract `PersonForm.tsx`
- Routes: `/people/new`, `/people/:id/edit`

**5c: ConferenceRoomDialog → NativeConferencePage**
- Extract `ConferenceRoomForm.tsx`
- Routes: `/conference/new`, `/conference/:id/edit`

**5d: LinkLabelDialog → NativeLinkLabelPage**
- Extract link form content
- Route: `/labels/link`

**5e: CSVUploadDialog → NativeCSVUploadPage**
- Route: `/people/import`

**5f: AssignImageDialog → NativeAssignImagePage**
- Route: `/labels/assign-image`

### Task 6: Convert Settings Dialogs

**6a: CompanyDialog → NativeCompanyPage**
- CREATE mode: wizard steps as a full-page flow
- EDIT mode: tabbed page
- Routes: `/settings/company/new`, `/settings/company/:id`

**6b: StoreDialog → NativeStorePage**
- Full-page form
- Route: `/settings/store/:id`

**6c: RoleDialog → NativeRolePage**
- Full-page with permission matrix cards
- Routes: `/settings/role/new`, `/settings/role/:id`

**6d: AIMSSettingsDialog → NativeAIMSSettingsPage**
- Accordion sections as full-page
- Route: `/settings/aims/:companyId`

**6e: EnhancedUserDialog → NativeUserPage**
- Tabbed user profile page
- Route: `/settings/user/:id`

**6f: ElevateUserDialog → NativeElevateUserPage**
- Role selection page
- Route: `/settings/user/:id/elevate`

### Task 7: Convert AIMS Detail Dialogs

**7a: ArticleDetailDialog → page**
**7b: GatewayConfigDialog → page**
**7c: GatewayRegistration → page**
**7d: LabelDetailView → page**
**7e: TemplateDetailDialog → page**
**7f: UploadTemplateDialog → page**

### Task 8: Convert List Management Dialogs

**8a: ListsManagerDialog → page** (`/people/lists` or similar)
**8b: PeopleListsManagerDialog → page**
**8c: PeopleSaveListDialog → page**
**8d: SaveListDialog → page**
**8e: SpaceSelectionDialog → bottom sheet** (keep as modal, but use MUI SwipeableDrawer instead of Dialog)

### Task 9: Keep as Dialogs (native-appropriate)

These stay as dialogs on native — they're quick confirmations or small inputs:
- **ConfirmDialog** — keep (native confirm pattern)
- **UnlockDialog** — keep (quick password prompt)
- **UpdateDialog** — keep (info + action)
- **ExportDialog** — keep (quick options)
- **ImportDialog** — keep (quick file picker)
- **LabelImagesDialog** → could be a page, but gallery overlays are native-appropriate

---

## Phase 2: Native Card Lists

### Task 10: NativeList Component

**Create:** `src/shared/presentation/components/NativeList.tsx`

A reusable list component optimized for native:
- Card-based items with consistent spacing
- Swipe-to-action (edit/delete) via touch gestures
- Pull-to-refresh built in
- Search bar integrated at top
- Empty state built in
- Section headers support
- FAB integration (positioned above bottom nav)

### Task 11: Feature Page Native Lists

**11a: Spaces → NativeSpacesList**
- Card per space: ID badge, name, assignment status, sync icon
- Swipe right: edit, Swipe left: delete
- Tap: view/edit (navigates to `/spaces/:id/edit`)
- Search + filter bar at top

**11b: People → NativePeopleList**
- Card per person: index, name, assignment, list memberships
- Swipe actions: edit, assign/unassign, delete
- Bulk selection via long-press

**11c: Conference → NativeConferenceList**
- Card per room: name, meeting status indicator, capacity
- Tap: edit, toggle meeting

**11d: Labels → NativeLabelsList**
- Card per label: code, linked article, battery/signal indicators
- Tap: view detail
- Actions: blink, push image

**11e: AIMS Gateways/Labels/Articles tabs**
- Native card lists for each AIMS Management tab

### Task 12: Settings Native Lists

**12a: CompaniesTab → NativeCompaniesList**
**12b: UsersSettingsTab → NativeUsersList**
**12c: RolesTab → NativeRolesList**
**12d: StoresDialog → NativeStoresList**

---

## Phase 3: Native Forms

### Task 13: NativeForm Components

**Create:** `src/shared/presentation/components/native/`

Native-optimized form building blocks:
- `NativeFormSection.tsx` — section with header, description, card container
- `NativeFormField.tsx` — full-width input with floating label, larger touch target
- `NativeFormSwitch.tsx` — labeled switch row with description
- `NativeFormSelect.tsx` — opens bottom sheet picker instead of dropdown
- `NativeFormActions.tsx` — sticky bottom bar with save/cancel buttons

### Task 14: Convert Feature Forms

Apply NativeForm components to all create/edit pages:
- SpaceForm: section-based layout with mapped fields
- PersonForm: dynamic fields from CSV mapping
- ConferenceRoomForm: meeting details sections
- CompanyWizard: step pages with NativeForm fields
- StoreForm: grouped settings sections
- RoleForm: info section + permission cards
- UserForm: tabbed sections

---

## Phase 4: Transitions & Polish

### Task 15: Page Transitions

- Slide-in from right on navigate forward
- Slide-out to right on navigate back (Android back button)
- Fade transition for tab switches
- RTL-aware (directions flip)

### Task 16: Touch Interactions

- Long-press on list items: shows context menu (edit/delete/assign)
- Swipe on list items: reveal action buttons
- Pull-to-refresh: already implemented, verify on all pages
- Haptic on: destructive actions, successful save, pull threshold

### Task 17: Native Loading Patterns

- Skeleton screens instead of spinners for list loading
- Inline loading indicators for form submissions
- Optimistic updates where possible (update UI before server confirms)

### Task 18: Visual Polish

- Consistent elevation/shadow on cards (Material Design 3 tonal surfaces)
- Rounded corners on all containers (borderRadius: 16px)
- Typography: slightly larger body text for mobile readability
- Color: use primary tonal palette for backgrounds (light blue tints)
- Icons: filled variants for selected states, outlined for unselected

---

## Implementation Order

**Week 1: Foundation + Phase 1 (Core Dialogs)**
1. NativePage wrapper (Task 1)
2. NativePageRoute abstraction (Task 2)
3. Page transitions (Task 3)
4. Route registry (Task 4)
5. Feature CRUD dialogs → pages (Task 5a-5f)
6. Settings dialogs → pages (Task 6a-6f)

**Week 2: Phase 1 (Remaining) + Phase 2 (Lists)**
7. AIMS detail dialogs → pages (Task 7)
8. List management dialogs → pages (Task 8)
9. NativeList component (Task 10)
10. Feature page native lists (Task 11a-11e)
11. Settings native lists (Task 12)

**Week 3: Phase 3 + Phase 4 (Forms & Polish)**
12. NativeForm components (Task 13)
13. Convert feature forms (Task 14)
14. Transitions & touch (Tasks 15-16)
15. Loading patterns & visual polish (Tasks 17-18)

---

## Key Principles

1. **Extract, don't duplicate** — Form content is extracted into standalone components shared between Dialog (web) and NativePage (native)
2. **NativePage wrapper handles chrome** — Every native page gets consistent header/back/safe-area via one component
3. **Routes are native-only** — Web never sees `/spaces/new` etc. (guarded by isNative)
4. **Progressive enhancement** — Each task produces a working app. No big-bang switchover.
5. **Web is untouched** — `isNative` guard on everything. Existing E2E tests must pass.

---

## Files Summary

**New shared components:**
```
src/shared/presentation/layouts/NativePage.tsx
src/shared/presentation/components/NativePageRoute.tsx
src/shared/presentation/components/PageTransition.tsx
src/shared/presentation/components/NativeList.tsx
src/shared/presentation/components/native/NativeFormSection.tsx
src/shared/presentation/components/native/NativeFormField.tsx
src/shared/presentation/components/native/NativeFormSwitch.tsx
src/shared/presentation/components/native/NativeFormSelect.tsx
src/shared/presentation/components/native/NativeFormActions.tsx
```

**Extracted form components (shared web+native):**
```
src/features/space/presentation/SpaceForm.tsx
src/features/people/presentation/PersonForm.tsx
src/features/conference/presentation/ConferenceRoomForm.tsx
(etc. — one per dialog that becomes a page)
```

**Modified:** `src/AppRoutes.tsx` (native routes), all feature pages (navigate instead of open dialog on native)
