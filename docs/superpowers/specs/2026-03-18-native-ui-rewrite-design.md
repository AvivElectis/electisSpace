# Native UI Rewrite — Design Spec

> **Goal:** Transform the Capacitor Android app from a "web app in a shell" into a native-feeling Android experience. Every screen should feel purpose-built for mobile.

**Constraints:**
- All changes gated behind `isNative` — web app untouched
- Existing E2E tests must pass
- Use MUI 7 components, Capacitor 8, Material Design 3 patterns
- RTL-aware (Hebrew + English)

---

## Architecture

### NativePageRoute Abstraction

Each dialog's form content is extracted into a standalone component shared between Dialog (web) and NativePage (native).

```tsx
// Before: PersonDialog owns everything
<Dialog open={open} onClose={onClose}>
  <DialogTitle>Edit Person</DialogTitle>
  <DialogContent><form>...</form></DialogContent>
</Dialog>

// After: PersonForm is shared, rendered differently per platform
// Web:
<Dialog open={open} onClose={onClose}>
  <DialogTitle>Edit Person</DialogTitle>
  <DialogContent><PersonForm person={person} onSave={save} /></DialogContent>
</Dialog>

// Native (routed):
<NativePage title="Edit Person" actions={<SaveButton />}>
  <PersonForm person={person} onSave={save} />
</NativePage>
```

**Key files:**
- `src/shared/presentation/layouts/NativePage.tsx` — page wrapper (blue AppBar, back arrow, safe-area, scroll container)
- `src/shared/presentation/components/NativePageRoute.tsx` — renders NativePage on native, Dialog on web
- `src/shared/presentation/components/PageTransition.tsx` — shared element + slide transitions

### NativePageRoute Component API

`NativePageRoute` is a React component that renders its children inside a Dialog on web or navigates to a NativePage route on native. The parent feature page uses it identically on both platforms.

```tsx
interface NativePageRouteProps {
    title: string;
    open: boolean;                    // controls Dialog on web; ignored on native
    onClose: () => void;              // closes Dialog on web; navigate(-1) on native
    nativeRoute: string;              // e.g. '/people/new' — used on native
    dialogProps?: Partial<DialogProps>; // maxWidth, fullWidth, etc. — web only
    children: React.ReactNode;        // the extracted form component
}

// Usage in PeopleManagerView:
const handleEdit = (person: Person) => {
    if (isNative) {
        navigate(`/people/${person.id}/edit`);
    } else {
        setEditingPerson(person);
        setPersonDialogOpen(true);
    }
};

// Web path: Dialog renders inline (existing pattern, unchanged)
{!isNative && personDialogOpen && (
    <PersonDialog open={personDialogOpen} onClose={() => setPersonDialogOpen(false)} person={editingPerson} />
)}
```

On native, the parent page simply calls `navigate()`. The routed page component handles everything.

### Data Flow for Routed Native Pages

When a form renders on a native route like `/people/:id/edit`, data is loaded by the **route page wrapper**, not the form itself. This keeps the form component pure (props in, callbacks out).

```tsx
// src/features/people/presentation/NativePersonPage.tsx (route target)
function NativePersonPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const people = usePeopleStore(s => s.people);
    const person = people.find(p => p.id === id);

    // Person not found (direct URL access or stale link)
    if (!person) {
        return <NativePage title={t('people.editPerson')} onBack={() => navigate(-1)}>
            <EmptyState message={t('common.notFound')} />
        </NativePage>;
    }

    return (
        <NativePage title={t('people.editPerson')} actions={<SaveButton form="person-form" />}>
            <PersonForm person={person} onSave={() => navigate(-1)} />
        </NativePage>
    );
}
```

**Pattern:** Route params → store lookup → pass as props to form. This is consistent with the existing `useEffect` + store pattern — data is already in the store (fetched by the parent list page). The route page is a thin wrapper.

**Create mode** (`/people/new`): No ID param, no lookup. `PersonForm` receives no `person` prop and renders in create mode.

**Error handling:** If person ID not found in store (stale URL, app restored from background), show an empty state with back navigation. The store is repopulated on app resume via `fetchPeople()` in `PeopleManagerView`'s useEffect.

### Navigation Guards for Dirty Forms

Native form pages integrate with a `useUnsavedChangesGuard` hook:

```tsx
// Inside NativePersonPage
const [isDirty, setIsDirty] = useState(false);

useAndroidBackButton({
    onCloseDialog: useCallback(() => {
        if (isDirty) {
            // Show confirm dialog: "Discard changes?"
            confirmDiscard().then(discard => { if (discard) navigate(-1); });
            return true; // handled, don't navigate
        }
        return false; // not dirty, allow normal back
    }, [isDirty]),
});
```

### Route File Organization

Native routes are grouped in a `NativeRoutes` sub-component to keep `AppRoutes.tsx` clean:

```tsx
// AppRoutes.tsx
{isNative && <NativeRoutes />}

// src/shared/presentation/components/NativeRoutes.tsx
export function NativeRoutes() {
    return <>
        <Route path="/people/new" element={<NativePersonPage />} />
        <Route path="/people/:id/edit" element={<NativePersonPage />} />
        {/* ... all native-only routes */}
    </>;
}
```

### NativePage Wrapper

```typescript
interface NativePageProps {
    title: string;
    children: React.ReactNode;
    onBack?: () => void;          // defaults to navigate(-1)
    actions?: React.ReactNode;    // right-side header buttons (Save, etc.)
    noPadding?: boolean;          // for full-bleed content
    hideBottomNavPadding?: boolean;
    viewTransitionName?: string;  // for shared element transitions
}
```

- Blue AppBar header: back arrow + title + optional action buttons
- `paddingTop: max(env(safe-area-inset-top), 28px)`
- Content scroll container: `px: 2, py: 1.5`
- Bottom padding accounts for bottom nav: `calc(var(--native-bottom-nav-offset, 0px) + 16px)`

### Native Route Registry

~30 native-only routes in `AppRoutes.tsx`, gated by `isNative`:

```
/people/new              → PersonForm (create)
/people/:id/edit         → PersonForm (edit)
/spaces/new              → SpaceForm (create)
/spaces/:id/edit         → SpaceForm (edit)
/conference/new          → ConferenceRoomForm (create)
/conference/:id/edit     → ConferenceRoomForm (edit)
/people/import           → CSVUploadForm
/people/lists            → PeopleListsManager
/people/save-list        → PeopleSaveList
/labels/link             → LinkLabelForm
/labels/assign-image     → AssignImageForm
/labels/:code/images     → LabelImagesView
/settings/company/:id    → CompanyForm (edit)
/settings/company/new    → CompanyWizard
/settings/store/:id      → StoreForm
/settings/role/:id       → RoleForm
/settings/role/new       → RoleForm
/settings/user/:id       → UserForm
/settings/user/:id/elevate → ElevateUserForm
/settings/aims/:companyId  → AIMSSettingsForm
/aims/gateway/register   → GatewayRegistration
/aims/gateway/:id        → GatewayConfig
/aims/article/:id        → ArticleDetail
/aims/label/:code        → LabelDetail
/aims/template/:id       → TemplateDetail
/aims/template/upload    → UploadTemplate
```

On web, these routes don't exist. Feature pages open Dialogs via state as before.

---

## Lists — Grouped Sections

iOS-style grouped layout: items grouped by status in rounded containers with section headers.

### Structure

```
┌─ Section Header: "Assigned (14)" ──────── ✓ ─┐
│┌─────────────────────────────────────────────┐│
││ [5]  John Smith          Engineering    ›   ││
││─────────────────────────────────────────────││
││ [12] Sarah Cohen         Marketing     ›   ││
││─────────────────────────────────────────────││
││ [3]  Noa Barak           Sales         ›   ││
│└─────────────────────────────────────────────┘│
│                                               │
│─ Section Header: "Unassigned (2)" ──── ⚠ ───│
│┌─────────────────────────────────────────────┐│
││ [—]  David Levi          HR · Tap to assign ›││
││─────────────────────────────────────────────││
││ [—]  Yael Green          Finance · Tap...   ›││
│└─────────────────────────────────────────────┘│
└───────────────────────────────────────────────┘
```

- **Space badge**: 36px rounded square, blue background (#e3f2fd) for assigned, orange (#fff3e0) for unassigned
- **Chevron (›)** on right indicates tap-to-navigate
- **Section headers**: uppercase, 11px, colored (blue for assigned, orange for unassigned), with count
- **Container**: white background, 16px border-radius, subtle shadow
- **Dividers**: 1px #f0f0f0 between items within a container

### Interaction

- **Tap** → navigate to `/people/:id/edit` (full-page edit form)
- **Pull-to-refresh** → Material circular indicator (existing `PullToRefresh` component)
- **FAB** → "Add Person" button positioned above bottom nav

### NativeGroupedList Component

```typescript
interface NativeGroupedListProps<T> {
    sections: Array<{
        title: string;
        count: number;
        color: 'primary' | 'warning';
        icon?: React.ReactNode;
        items: T[];
    }>;
    renderItem: (item: T) => React.ReactNode;
    onItemTap: (item: T) => void;
    emptyState?: React.ReactNode;
    searchBar?: boolean;
    fab?: { label: string; onClick: () => void };
}
```

Applied to: People, Spaces, Conference Rooms, Labels, AIMS sub-lists, Settings lists.

**Virtualization:** For lists under ~200 items (People, Conference, Settings), native scroll is sufficient. For Spaces and Labels lists that can exceed 500 items, `NativeGroupedList` accepts an optional `virtualized` prop that enables `react-window` windowing within each section container.

---

## Transitions

### Shared Element + Slide

When navigating from list to detail page:
1. The **space badge** in the list card has `view-transition-name: space-badge-{id}`
2. The badge in the NativePage header has the matching name
3. CSS View Transitions API morphs the badge between positions
4. Simultaneously, the new page slides in from inline-end (250ms ease-out)
5. RTL-aware: directions flip automatically via `inset-inline-start/end`

```typescript
// PageTransition.tsx
// Wraps route content with startViewTransition on navigation
// Falls back to simple slide if View Transitions API unavailable
```

### Fallback for Older WebViews

The View Transitions API requires Android WebView 111+ (Android 13+). For older devices:
- Feature-detect via `'startViewTransition' in document`
- Fallback: simple CSS slide transition (translateX) without shared element morph
- Both paths use 250ms ease-out, so the experience is smooth either way

### Back Navigation
- Page slides out to inline-end
- Badge morphs back to list position (if View Transitions supported)
- Android hardware back button triggers this via existing `useAndroidBackButton`
- RTL: transition direction is set via `document.dir` check, using `inset-inline-start/end` for CSS-based transitions

---

## Forms — Sectioned Cards

### Layout

```
┌─ Blue AppBar ─────────────────────────────────┐
│  ←  Edit Person                        [Save] │
├───────────────────────────────────────────────┤
│                                               │
│  ┌─ PERSONAL INFO ─────────────────────────┐  │
│  │  Name *                                 │  │
│  │  John Smith                    (focused) │  │
│  │  ─────────────────────────────────────── │  │
│  │  Department                             │  │
│  │  Engineering                            │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─ SPACE ASSIGNMENT ──────────────────────┐  │
│  │  [5]  Space 5                           │  │
│  │       ✓ Assigned           Change ›     │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─ STATUS ────────────────────────────────┐  │
│  │  ● Synced · 2 min ago                   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
└───────────────────────────────────────────────┘
```

### NativeFormSection Component

```typescript
interface NativeFormSectionProps {
    title: string;
    children: React.ReactNode;
}
```

Renders: section label (uppercase, blue, 11px) + white card container (16px radius, subtle shadow).

### Form Fields

Standard MUI TextFields with these native adjustments:
- Larger touch targets: `min-height: 48px`
- Floating labels (MUI default)
- Bottom-border style (variant="standard") inside sections
- Focused field: blue bottom border (2px)

### Space Selector on Native

Instead of MUI Autocomplete dropdown, opens a **bottom sheet** (MUI SwipeableDrawer anchor="bottom") with the full space list. Matches native Android picker patterns.

---

## Phased Implementation

### Phase 1: Foundation + Core Dialogs (ship first)
1. NativePage wrapper component
2. NativePageRoute abstraction (Dialog on web, NativePage on native)
3. PageTransition with shared element + slide
4. Route registry in AppRoutes.tsx
5. Convert: PersonDialog, SpaceDialog, ConferenceRoomDialog, LinkLabelDialog, CSVUploadDialog, AssignImageDialog
6. NativeGroupedList component
7. People page native list

### Phase 2: Settings & AIMS Dialogs
8. CompanyDialog, StoreDialog, RoleDialog, AIMSSettingsDialog, UserDialog, ElevateUserDialog → pages
9. AIMS detail dialogs (Article, Gateway, Label, Template) → pages
10. List management dialogs → pages

### Phase 3: Native Lists for All Pages
11. Spaces page → NativeGroupedList
12. Conference page → NativeGroupedList
13. Labels page → NativeGroupedList
14. AIMS management tabs → NativeGroupedList
15. Settings lists (Companies, Users, Roles) → NativeGroupedList

### Phase 4: Polish & Haptics
16. NativeFormSection, NativeFormField components
17. Skeleton loading screens
18. Haptic feedback on destructive actions and successful saves
19. Visual polish: MD3 tonal surfaces, 16px corners, larger body text, filled/outlined icon states

---

## Key Principles

1. **Extract, don't duplicate** — form content shared between Dialog and NativePage
2. **NativePage handles chrome** — consistent header/back/safe-area via one component
3. **Routes are native-only** — web never sees `/spaces/new` etc.
4. **Progressive** — each task produces a working app, no big-bang switchover
5. **Web is untouched** — `isNative` guard on everything, E2E tests pass unchanged

---

## Testing Strategy

- **Web E2E tests (Playwright):** Must pass unchanged. Native routes don't exist on web, native components are gated by `isNative`. No impact.
- **Shared form components:** Unit tested with Vitest + Testing Library. Each extracted form (PersonForm, SpaceForm, etc.) gets its own test file verifying form behavior independent of Dialog/NativePage wrapper.
- **Native components:** Unit tested (NativePage, NativeGroupedList, NativeFormSection). No Capacitor-specific E2E since Playwright doesn't run in Capacitor. Manual testing on Android emulator during development.
- **Transition fallback:** Tested by mocking `document.startViewTransition` as undefined.

---

## Files Summary

**New shared components:**
```
src/shared/presentation/layouts/NativePage.tsx
src/shared/presentation/components/NativePageRoute.tsx
src/shared/presentation/components/PageTransition.tsx
src/shared/presentation/components/NativeGroupedList.tsx
src/shared/presentation/components/native/NativeFormSection.tsx
```

**Extracted form components (shared web+native):**
```
src/features/people/presentation/PersonForm.tsx
src/features/space/presentation/SpaceForm.tsx
src/features/conference/presentation/ConferenceRoomForm.tsx
(one per dialog that becomes a page)
```

**Refactored:**
- `src/features/settings/presentation/NativeSettingsPage.tsx` — refactor to use `NativePage` wrapper instead of building its own header
- `src/features/settings/presentation/NativeAboutPage.tsx` — same
- `src/features/manual/presentation/NativeManualPage.tsx` — same

**Modified:**
- `src/AppRoutes.tsx` — import `NativeRoutes` sub-component
- All feature pages — navigate instead of open dialog on native (gated by `isNative`)
- `src/theme.ts` — MD3 tonal surface adjustments for native
