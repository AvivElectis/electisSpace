# First-Run Experience & Empty States — Design Spec

**Date:** 2026-04-16
**Status:** Approved design, ready for implementation planning
**Parent:** `docs/superpowers/specs/2026-04-16-ux-audit-and-redesign.md`
**Audit items addressed:** #1 (empty states), #2 (feature restriction feedback), #6 (clickable dashboard cards)

---

## Overview

Per-feature first-use guided tours, meaningful empty states on all pages, clickable dashboard cards, and feature restriction feedback. Tours teach workflows — not setup (handled by `CreateCompanyWizard`).

## Scope

| Component | What |
|-----------|------|
| Per-feature tours | Non-blocking tooltip tours on first visit to each feature page |
| Empty states | Icon + message + CTA on all feature pages when data is empty |
| Dashboard cards | Clickable, navigate to feature pages, zero-data messages |
| Feature restriction toast | Info snackbar when redirected from a disabled feature |

### Out of Scope

- AIMS connection setup (handled by `CreateCompanyWizard`)
- Store configuration (handled by `CreateCompanyWizard`)
- Dark mode
- Mobile-native (Capacitor) onboarding — tours work on web/Electron only for now

---

## 1. Per-Feature First-Use Tours

### Architecture

- **Custom stepper** using MUI `Popper` for tooltip positioning — no new dependencies
- **Zustand store** `onboardingStore` in `src/shared/application/onboardingStore.ts`
- **Step configs** defined as typed arrays per feature, filtered at runtime
- **Persistence** via server user preferences endpoint (won't re-show after completion/skip)
- **Re-trigger** available from Settings → "Restart Tours" button

### State Shape

```typescript
interface OnboardingState {
  // Per-feature completion tracking
  completedTours: Record<FeatureTour, boolean>;
  // Active tour state
  activeTour: FeatureTour | null;
  currentStep: number;
  // Actions
  startTour: (tour: FeatureTour) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetAllTours: () => void;
}

type FeatureTour = 'dashboard' | 'spaces' | 'people' | 'conference' | 'labels';
```

### Step Config Shape

```typescript
interface TourStep {
  targetSelector: string;       // CSS selector for the target element
  title: string;                // i18n key for title
  body: string;                 // i18n key for body text
  placement: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  feature?: Feature;            // Only show if this feature is enabled
  requireAdmin?: boolean;       // Only show for admin roles
  requireMultiStore?: boolean;  // Only show for multi-store users
}
```

### Step Filtering Logic

```typescript
const steps = allSteps
  .filter(s => !s.feature || canAccessFeature(s.feature))
  .filter(s => !s.requireMultiStore || userStores.length > 1)
  .filter(s => !s.requireAdmin || isAdmin);
// Steps renumber dynamically: 1, 2, 3... N
```

### Tour Trigger

Each feature page checks on mount:

```typescript
// In page useEffect:
if (isAppReady && !completedTours[tourName]) {
  startTour(tourName);
}
```

### Tour Definitions

#### Dashboard Tour (3 steps)

| # | Target | Title | Body |
|---|--------|-------|------|
| 1 | Stats card area | `onboarding.dashboard.statsCards` | Your store overview at a glance. |
| 2 | Quick actions panel / FAB | `onboarding.dashboard.quickActions` | Quick access to link labels, add spaces or rooms. |
| 3 | First stats card | `onboarding.dashboard.cardNavigation` | Click any card to go directly to that feature. |

#### Spaces Tour (5 steps)

| # | Target | Title | Body |
|---|--------|-------|------|
| 1 | Add Space button | `onboarding.spaces.addSpace` | Enter a unique ID and fill in the details. You can link an ESL label to it later. |
| 2 | Table row actions | `onboarding.spaces.tableActions` | Edit or delete any space from the table. |
| 3 | Search bar | `onboarding.spaces.search` | Search by ID or any field. Click column headers to sort. |
| 4 | Manage Lists button | `onboarding.spaces.lists` | Save your current spaces as a named list to reload later. |
| 5 | AIMS Sync panel | `onboarding.spaces.aimsSync` | Check sync status. Spaces sync to AIMS automatically after changes. |

#### People Manager Tour (5 steps)

| # | Target | Title | Body |
|---|--------|-------|------|
| 1 | Stats panel (total slots) | `onboarding.people.setSlots` | Set the total available slots for this store. |
| 2 | Add / Upload button | `onboarding.people.addPeople` | Add people one by one or upload a CSV file. |
| 3 | Bulk actions bar | `onboarding.people.assign` | Select people and click "Bulk Assign" to auto-fill slots. Or click a row to assign individually. |
| 4 | List panel | `onboarding.people.lists` | Save assignments as named lists for shift rotation. Load a list to swap everyone at once. |
| 5 | SSE alert area | `onboarding.people.liveAlerts` | Alerts appear here when other users load or modify lists. |

#### Conference Tour — Advanced Mode (4 steps)

Shown when `simpleConferenceMode === false`.

| # | Target | Title | Body |
|---|--------|-------|------|
| 1 | Add Room button | `onboarding.conference.addRoom` | Enter a room ID and name. Optionally set a current meeting. |
| 2 | Room card actions | `onboarding.conference.editDelete` | Update or remove rooms. |
| 3 | Search bar | `onboarding.conference.search` | Find rooms by name or status. |
| 4 | AIMS sync indicator | `onboarding.conference.aimsSync` | Rooms sync to AIMS for label updates. |

#### Conference Tour — Simple Mode (3 steps)

Shown when `simpleConferenceMode === true`.

| # | Target | Title | Body |
|---|--------|-------|------|
| 1 | Room cards area | `onboarding.conferenceSimple.roomCards` | Each card shows a room and its current status. |
| 2 | Status toggle buttons | `onboarding.conferenceSimple.flipStatus` | Tap to toggle. The linked ESL label updates automatically. |
| 3 | Disabled room card | `onboarding.conferenceSimple.noLabel` | Rooms without linked labels are disabled. Link a label from the Labels page. |

#### Labels Tour (4 steps)

| # | Target | Title | Body |
|---|--------|-------|------|
| 1 | Labels table/cards | `onboarding.labels.browse` | All ESL devices in your store. Blue accent = linked, grey = unlinked. |
| 2 | Link Label button | `onboarding.labels.link` | Connect a label to a space, room, or person by scanning or entering codes. |
| 3 | Unlink button | `onboarding.labels.unlink` | Disconnect a label from its article. |
| 4 | Health indicators | `onboarding.labels.health` | Check signal strength, battery level, and toggle image preview. |

### Tooltip Component

**File:** `src/shared/presentation/components/OnboardingTooltip.tsx`

Visual spec:
- White background (`#FFFFFF`), 12px border-radius, `box-shadow: 0 12px 40px rgba(0,0,0,0.12)`
- CSS arrow triangle pointing to target element
- Semi-transparent spotlight backdrop (`rgba(0,0,0,0.35)`) with cutout around target
- Title: 16px, weight 700, color `#3C3C3E`
- Body: 13.5px, color `#86868B`, max 2 lines
- Step counter: pill badge, 11px, white on `#0D47A1`
- Navigation: "Skip Tour" link (left), Back/Next pill buttons (right)
- Last step: "Next" becomes "Done"
- Font: Assistant (inherits from theme)

RTL behavior:
- Header, footer, and nav buttons flex-direction reversed
- **Step numbering flipped**: `1 / 5` in EN → `5 / 1` in HE
- Arrow and tooltip placement mirrored
- All text from i18n

### Persistence

No server-side user preferences endpoint exists yet. Use **localStorage** for now:

```typescript
// Key: 'electisspace_onboarding'
// Value: JSON { dashboard: true, spaces: true, ... }

// After tour completion or skip:
const key = 'electisspace_onboarding';
const current = JSON.parse(localStorage.getItem(key) || '{}');
current[tourName] = true;
localStorage.setItem(key, JSON.stringify(current));
```

On mount, `useFeatureTour` reads localStorage. If `onboarding[tourName] === true`, tour does not trigger.

**Trade-off:** localStorage is per-device — user sees tours again on a new browser. Acceptable for first iteration. Future enhancement: add a user preferences table + API endpoint and migrate persistence there.

The "Restart Tours" button in Settings clears the localStorage key.

### Settings Integration

Add "Restart Tours" button to Settings dialog (General tab):
- Calls `onboardingStore.resetAllTours()`
- Clears server-side `onboarding` preferences
- Shows success toast: "Tours will show again on next visit to each page."

---

## 2. Empty States

### Existing Component

`src/shared/presentation/components/EmptyState.tsx` — already exists with props:

```typescript
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}
```

No changes needed to the component API. Only need to ensure all feature pages use it with good copy.

### Per-Page Empty States

All strings via i18n (`onboarding.emptyState.*` namespace).

| Page | Icon | Title | Description | CTA | CTA Action |
|------|------|-------|-------------|-----|------------|
| Spaces | `FolderOpenIcon` (80px) | No spaces yet | Spaces represent rooms, desks, or areas. Create your first space to get started. | + Add Space | Open SpaceDialog |
| People | `GroupIcon` (80px) | No people added yet | Add people to assign them to spaces and sync to ESL labels. | + Add Person | Open PersonDialog |
| Conference (Advanced) | `MeetingRoomIcon` (80px) | No conference rooms yet | Add rooms and link labels to display availability on e-ink signs. | + Add Room | Open ConferenceRoomDialog |
| Conference (Simple) | `MeetingRoomIcon` (80px) | No rooms available | Rooms are managed in advanced mode. Ask your admin to add rooms and link labels. | — | — |
| Labels | `LabelIcon` (80px) | No labels linked | Labels are ESL devices managed through AIMS. They appear here once your store is connected. | — | — |

Notes:
- CTA only shown if `canEdit` (viewers see message only)
- Conference simple mode: no CTA (rooms managed in advanced mode)
- Labels: no manual add — labels come from AIMS sync

### Search-Filtered Empty State

When search returns zero results but data exists:

- Title: `No {featureName} matching "{query}"`
- Description: omitted
- CTA: "Clear Search" → clears search input
- Already partially implemented in `SpacesManagementView` — extend pattern to People, Conference, Labels

---

## 3. Clickable Dashboard Cards

### Current State

Dashboard cards (`DashboardSpacesCard`, `DashboardConferenceCard`, `DashboardPeopleCard`) display stats but are not interactive.

### Changes

Wrap each card in a clickable container:

```tsx
<Card
  sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4, transform: 'translateY(-1px)' } }}
  onClick={() => navigate('/spaces')}
>
```

Add "View All →" link in card header (right-aligned, `color: primary`, 12px, weight 500).

### Zero-Data Messages

When card shows count = 0, replace generic "0" subtitle with contextual message:

| Card | Zero-data subtitle |
|------|--------------------|
| Spaces | No spaces created yet |
| People | No people added yet |
| Conference | No rooms configured |
| AIMS | Not connected |

Use i18n keys: `dashboard.card.{feature}.empty`.

---

## 4. Feature Restriction Toast

### Current State

`ProtectedFeature` component silently renders `fallback={<Navigate to="/" replace />}` when a feature is disabled. User gets redirected with no explanation.

### Changes

Before redirecting, fire an info notification:

```tsx
// In ProtectedFeature.tsx, when feature is disabled:
const { showInfo } = useNotifications();
const shownRef = useRef(new Set<string>());

if (!isEnabled && !shownRef.current.has(feature)) {
  shownRef.current.add(feature);
  showInfo(t('featureRestriction.notAvailable', { feature: t(`features.${feature}`) }));
}
```

Toast spec:
- Uses existing `NotificationContainer` (top-right, `Alert` variant `filled`, severity `info`)
- Auto-dismiss: 6 seconds (default)
- Message: `"{Feature Name}" is not enabled for this store. Contact your admin.`
- Deduplicated per session (Set tracks shown features via ref)

i18n keys:
- `featureRestriction.notAvailable`: `"{{feature}}" is not enabled for this store. Contact your admin.`
- `features.spaces`, `features.conference`, `features.people`, `features.labels`

---

## 5. i18n

All new strings added to both `src/locales/en/common.json` and `src/locales/he/common.json`.

### Key Namespace Structure

```json
{
  "onboarding": {
    "skipTour": "Skip Tour",
    "next": "Next",
    "back": "Back",
    "done": "Done",
    "stepCounter": "{{current}} / {{total}}",
    "stepCounterRtl": "{{total}} / {{current}}",
    "dashboard": { "statsCards": "...", "quickActions": "...", "cardNavigation": "..." },
    "spaces": { "addSpace": "...", "tableActions": "...", ... },
    "people": { "setSlots": "...", "addPeople": "...", ... },
    "conference": { "addRoom": "...", ... },
    "conferenceSimple": { "roomCards": "...", ... },
    "labels": { "browse": "...", ... },
    "emptyState": {
      "spaces": { "title": "...", "description": "...", "cta": "..." },
      "people": { ... },
      "conference": { ... },
      "conferenceSimple": { ... },
      "labels": { ... }
    },
    "settings": {
      "restartTours": "Restart Tours",
      "restartToursSuccess": "Tours will show again on next visit to each page."
    }
  },
  "featureRestriction": {
    "notAvailable": "\"{{feature}}\" is not enabled for this store. Contact your admin."
  },
  "dashboard": {
    "card": {
      "viewAll": "View All",
      "spaces": { "empty": "No spaces created yet" },
      "people": { "empty": "No people added yet" },
      "conference": { "empty": "No rooms configured" }
    }
  }
}
```

### RTL-Specific

- Step counter uses `stepCounterRtl` key when `i18n.dir === 'rtl'` to flip `current / total` → `total / current`
- Tooltip footer flex-direction reversed via `theme.direction`
- Arrow placement mirrored (left ↔ right) based on direction
- MUI Popper handles RTL placement automatically when theme direction is set

---

## 6. Theme Compliance

All new components follow the existing MUI theme from `src/theme.ts`:

| Token | Value |
|-------|-------|
| Primary | `#0D47A1` |
| Success | `#34C759` |
| Warning | `#FF9500` |
| Error | `#FF3B30` |
| Background | `#F5F5F7` |
| Paper | `#FFFFFF` |
| Text primary | `#3C3C3E` |
| Text secondary | `#86868B` |
| Font family | `Assistant`, system fallbacks |
| Card radius | 16px |
| Button radius | 24px (pill) |
| Default radius | 12px |

No custom CSS — all styling via MUI `sx` prop and theme tokens.

---

## 7. File Structure

### New Files

```
src/shared/application/onboardingStore.ts          — Zustand store
src/shared/presentation/components/OnboardingTooltip.tsx  — Tooltip + spotlight component
src/shared/presentation/hooks/useFeatureTour.ts    — Hook: checks completion, starts tour on mount
src/shared/domain/onboardingTypes.ts               — Types and step configs
```

### Modified Files

```
src/features/dashboard/presentation/DashboardPage.tsx         — Tour trigger, clickable cards
src/features/dashboard/presentation/components/DashboardSpacesCard.tsx    — onClick + "View All" link
src/features/dashboard/presentation/components/DashboardPeopleCard.tsx    — onClick + "View All" link
src/features/dashboard/presentation/components/DashboardConferenceCard.tsx — onClick + "View All" link
src/features/space/presentation/SpacesManagementView.tsx      — Tour trigger, improved empty state copy
src/features/people/presentation/PeopleManagerView.tsx        — Tour trigger, empty state
src/features/conference/presentation/ConferencePage.tsx       — Tour trigger (mode-aware), empty state
src/features/labels/presentation/LabelsPage.tsx               — Tour trigger, empty state
src/features/auth/presentation/ProtectedFeature.tsx           — Feature restriction toast
src/features/settings/presentation/SettingsDialog.tsx         — "Restart Tours" button in General tab
src/locales/en/common.json                                    — All new i18n keys
src/locales/he/common.json                                    — All new i18n keys (Hebrew)
```

---

## 8. Visual Mockups

Interactive mockups with EN/HE toggle saved in:
- `.superpowers/brainstorm/99-1776331121/content/tooltip-themed.html` — Tooltip component
- `.superpowers/brainstorm/99-1776331121/content/empty-states-themed.html` — Empty states + dashboard cards + toast
- `.superpowers/brainstorm/99-1776331121/content/revised-onboarding-v2.html` — All feature tours + examples
- `.superpowers/brainstorm/99-1776331121/content/conference-modes.html` — Conference advanced vs simple
