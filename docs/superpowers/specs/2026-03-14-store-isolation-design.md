# Store Isolation Safety — Design Spec

**Date:** 2026-03-14
**Status:** Approved (brainstorming complete)
**Branch:** `fix/store-isolation-safety`

## Problem

Admin users managing multiple companies/stores experience data leaks during context switches:
1. **Settings store not cleared** — logos, app name, field mappings, article format persist from Store A when switching to Store B
2. **No visual guard during transition** — stale tabs, logos, and content flash while new data loads
3. **Store feature overrides can silently diverge** from company settings — causing wrong tabs/features for a store
4. **Two-step company→store switching** creates intermediate state where `activeStoreId: null` enables ALL features via backward-compat fallback

## Root Cause (Production Incident)

TST company's HQ store had orphaned `storeFeatures` override in `settings` JSON column (`peopleEnabled: true, conferenceEnabled: true`) contradicting company settings (`spacesEnabled: true`). The `resolveEffectiveFeatures()` function correctly prioritized the store override, but the override was wrong. Additionally, a `storeLogoOverride` leaked another store's logo.

**Production fix applied:** Removed store-level overrides via SQL.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Store switching UX | Grouped menu with atomic `setActiveContext` | Single click switches both company+store; no intermediate null-store state |
| Transition guard | Full-screen SphereLoader overlay | Covers all stale UI; matches app loading pattern |
| Override policy | Free-form overrides with divergence warnings | Flexible for legitimate use; warns when store diverges from company |
| Settings reset timing | Immediate on switch start | Ensures no cross-store data visible; defaults are safe fallbacks |

## Section 1: CompanyStoreSelector Redesign

### Button Design (Responsive)

**Desktop (md+):** Gradient-background pill button showing company name (small uppercase) + store name (bold). Chevron rotates on open. Stands out from flat nav tabs via subtle gradient + elevated border.

**Tablet (sm-md):** Compact — store name + icon only, no company label.

**Mobile (xs):** Icon-only button (42px touch target) with gradient background.

**Mockup:** `docs/superpowers/mockups/store-selector-button.html`

### Grouped Dropdown Menu

- Stores grouped under company headers (non-clickable)
- Current selection shown with checkmark + highlighted background
- Platform Admin badge at top (when applicable)
- Each store shows name + code
- Clicking any store triggers atomic `setActiveContext(companyId, storeId)` — even for same-company switches

### Atomic Context Switching

Replace separate `handleCompanySelect` / `handleStoreSelect` with single `handleStoreSelect(companyId, storeId)` that always calls `setActiveContext`. This eliminates the intermediate state where `activeStoreId: null` causes backward-compat to enable ALL features.

## Section 2: Settings Store Cleanup + Header Safety

### What Gets Leaked Without Fix

- `settings.logos.logo1` / `logo2` — wrong company/store logos in header
- `settings.appName` / `appSubtitle` — wrong branding
- `settings.fieldMappings` — wrong field labels in forms
- `settings.articleFormat` — wrong format settings
- `spaceTypeLabels` — wrong space type names

### Reset Strategy

**Phase 1 — Immediate reset** (when switch begins, before any fetch):
Call `useSettingsStore.getState().resetSettings()` inside `clearAllFeatureStores()`.

This resets to safe defaults:
- Logos → `null` (AppHeader falls back to default SoluM/electis logos via `||` operator)
- App name → "electis Space" (neutral default)
- App subtitle → empty
- Field mappings, article format → defaults

**Phase 2 — Repopulate** (after `fetchSettingsFromServer` completes):
New store's logos, app name, features load in. SphereLoader overlay hides the brief default state.

### Header Behavior During Switch

| Element | During Switch | After Switch |
|---------|--------------|--------------|
| Left logo | Default SoluM logo | New store/company logo |
| Right logo | Default electis logo | New store/company logo |
| App name | "electis Space" | New store's configured name |
| Store selector button | Spinner + frozen text | Updated company/store name |
| Feature tabs | Hidden behind SphereLoader | New store's permitted tabs |

### Code Change

In `authStore.ts`, modify `clearAllFeatureStores()`:

```typescript
function clearAllFeatureStores() {
    // Existing clears...
    useSpacesStore.getState().clearAllData();
    usePeopleStore.getState().clearAllData();
    // ... etc

    // NEW: Clear settings store to prevent cross-store data leaks
    useSettingsStore.getState().resetSettings();
}
```

## Section 3: SphereLoader Transition Guard

### Behavior

When `isSwitchingStore === true` in `authStore`, render a full-screen overlay with the app's existing `SphereLoader` animation. This:
- Covers all stale UI (tabs, content, header branding during reset)
- Prevents user interaction with stale data
- Matches the existing app loading pattern (SphereLoader used in `AppLoader`)

### Implementation Location

In `MainLayout.tsx`, after the header and before the content area:

```tsx
{isSwitchingStore && (
    <Box sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 1,
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    }}>
        <SphereLoader />
    </Box>
)}
```

### Guard Coverage

The `isSwitchingStore` flag is already properly managed in all three switch paths (`setActiveCompany`, `setActiveStore`, `setActiveContext`) with `finally` blocks ensuring it's always unset, even on error.

## Section 4: Store Override Divergence Warnings

### Location

`EditCompanyTabs.tsx` — the admin UI for editing company/store features.

### Behavior

When saving store feature overrides, compare against the parent company's `companyFeatures`. If any store-level override diverges (enables a feature the company disables, or vice versa), show an inline warning:

> "This store's features differ from the company defaults. Store overrides take priority."

This is informational, not blocking — legitimate overrides are allowed.

### Detection Logic

```typescript
function getFeatureDivergences(companyFeatures: Features, storeFeatures: Features): string[] {
    const divergences: string[] = [];
    for (const [key, companyValue] of Object.entries(companyFeatures)) {
        if (key in storeFeatures && storeFeatures[key] !== companyValue) {
            divergences.push(key);
        }
    }
    return divergences;
}
```

## Section 5: Feature Tabs in Content Width

### Current Problem

Desktop feature tabs (Dashboard, Spaces, Labels, AIMS) span full viewport width via a `Box` with padding, while the main content below uses `<Container maxWidth="xl">`. This looks inconsistent.

### Fix

Wrap the desktop tabs `Box` in a matching `<Container maxWidth="xl">` so tabs align with content:

```tsx
// In MainLayout.tsx, replace the desktop tabs Box wrapper:
<Container maxWidth="xl" disableGutters>
    <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: 0, pb: 0.5 }}>
        <Tabs ...>
            {navTabs.map(tab => ...)}
        </Tabs>
    </Box>
</Container>
```

## Validation Summary

| Check | Result |
|-------|--------|
| `resetSettings()` exists in settingsStore | Yes (line 110-115) |
| `isSwitchingStore` managed in all switch paths | Yes, with `finally` blocks |
| SSE disconnects on store switch | Yes, via useStoreEvents dependency |
| Sync timers cleared on switch | Yes, via useEffect cleanup |
| `activeStoreEffectiveFeatures` follows storeId | Yes, atomic via useMemo |
| No other components read logos besides AppHeader | Confirmed |
| No store-specific stores missed by clearAllFeatureStores | Only settingsStore (this fix) |
