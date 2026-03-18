# Native App Adaptations — Design Spec

**Date:** 2026-03-16
**Version target:** v2.14.0
**Platforms:** Android (full), iOS (scaffolding only)
**Branch:** `feat/native-app-adaptations`

---

## Goal

Make the Capacitor-wrapped app feel native on Android (and future iOS) while keeping the web app completely unchanged. Every native adaptation is gated behind `isNative` platform checks — the web build never sees native code paths.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation | Bottom tab bar, centered fixed-width | Material Design 3 pattern, balanced even with 2 tabs |
| Tab content | Dynamic — only enabled features | Matches company feature gating, 2-5 tabs depending on config |
| Tab visibility | Uses `canAccessFeature` + `isPeopleManagerMode` | Must match web `MainLayout` logic exactly |
| Header | Minimal — title + store selector + settings | Native apps don't show logos in headers |
| Back button | Smart back — close dialogs first, then navigate, double-tap exit | Expected Android UX |
| Status bar | Primary blue (#0D47A1) + white icons | Cohesive with app theme |
| Splash screen | Centered AppIcon on white (replace existing PNG splash) | Fast, professional |
| Pull-to-refresh | All data pages via `onRefresh` prop (not direct store import) | Standard mobile pattern, respects DDD layers |
| Typography | Roboto on Android, SF Pro on iOS (system defaults) | Platform-native feel |
| Haptic feedback | Bottom nav tap, pull-to-refresh, destructive confirms | Subtle, not excessive |
| RTL | All native layout uses `insetInlineStart/End`, never `left/right` | Full Hebrew/RTL support required |

---

## Isolation Strategy

**Rule:** No existing component rendering logic is modified. All native UI lives in new files. The only branching point is in `MainLayout.tsx` — it decides whether to render native or web layout. `AppHeader.tsx` is NOT modified.

```typescript
// The single branching point in MainLayout.tsx:
const { isNative } = useNativePlatform();

if (isNative) {
  return <NativeLayout>{/* routes */}</NativeLayout>;
} else {
  return <WebLayout>{/* existing layout verbatim */}</WebLayout>;
}
```

### Impact assessment per file:

| File | Change | Web Impact |
|------|--------|------------|
| `MainLayout.tsx` | Top-level `if/else` — native path renders `NativeAppHeader` + `NativeBottomNav`, web path is verbatim current code | **NONE** |
| `AppHeader.tsx` | **NOT MODIFIED** — only used in the web branch | **NONE** |
| `theme.ts` | Runtime native font override | **NONE** — only applied when `isNative` |
| `index.html` | Add `viewport-fit=cover` | **NONE** — `env(safe-area-inset-*)` resolves to `0px` on web |
| `capacitor.config.ts` | Plugin config | **NONE** — Capacitor builds only |
| `package.json` | New plugin deps (`@capacitor/haptics`, `@capacitor/status-bar`) | **NONE** — unused on web |
| `android/` | Styles, icons, splash | **NONE** — separate from web |
| All new files | New components, hooks | **NONE** — tree-shaken from web builds |
| Locale files | New translation keys for native-only strings | **NONE** — keys unused on web |

---

## Components

### 1. Platform Detection Hook

**File:** `src/shared/presentation/hooks/useNativePlatform.ts`

```typescript
interface NativePlatformInfo {
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  platform: 'web' | 'android' | 'ios' | 'electron';
}
```

**Important:** Must call `Capacitor.getPlatform()` directly to distinguish `'android'` from `'ios'`. The existing `platformDetector.ts` collapses both into `'android'` — the hook must NOT delegate to `detectPlatform()` for the platform string. Instead, use `Capacitor.isNativePlatform()` for the `isNative` flag, and `Capacitor.getPlatform()` for the specific platform.

Memoized via `useMemo` with empty deps (platform never changes at runtime). No re-renders.

### 2. Shared Navigation Tab Hook

**File:** `src/shared/presentation/hooks/useNavTabs.ts`

Extracts the tab filtering logic currently in `MainLayout.tsx` into a shared hook so both `NativeBottomNav` and the web tab bar use identical logic:

```typescript
function useNavTabs(): NavTab[] {
  // Uses canAccessFeature() from useAuthContext
  // Uses isPeopleManagerMode (peopleEnabled + workingMode === 'SOLUM_API')
  // Returns only the tabs the current user can see
  // Dashboard is always first
  // Spaces/People are mutually exclusive via isPeopleManagerMode
}
```

Both `MainLayout.tsx` (web tabs) and `NativeBottomNav.tsx` consume this hook. This eliminates the risk of tab visibility divergence.

### 3. Bottom Navigation Bar

**File:** `src/shared/presentation/layouts/NativeBottomNav.tsx`

- MUI `BottomNavigation` + `BottomNavigationAction` components
- Centered fixed-width layout (not stretch-to-fill)
- Consumes `useNavTabs()` for dynamic tab list (same filtering as web)
- Active tab indicated by filled icon + primary color
- `paddingBottom: env(safe-area-inset-bottom)` for gesture bar phones
- Haptic feedback on tab change via `@capacitor/haptics`
- **RTL-safe:** uses MUI `sx` props only, no hardcoded `left`/`right`

**Tab icon mapping:**

| Route | Icon | Translation Key |
|-------|------|----------------|
| `/` | DashboardIcon | `navigation.dashboard` |
| `/spaces` | MeetingRoomIcon | `navigation.spaces` |
| `/people` | PeopleIcon | `navigation.people` |
| `/conference` | GroupsIcon | `navigation.conference` |
| `/labels` | LabelIcon | `navigation.labels` |
| `/aims` | RouterIcon | `navigation.aims` |

### 4. Native App Header

**File:** `src/shared/presentation/layouts/NativeAppHeader.tsx`

- Slim header: 48px height + `env(safe-area-inset-top)` for notch
- Start side: page title (derived from current route via `useNavTabs()`)
- End side: `CompanyStoreSelector compact` + Settings gear icon
- **RTL-safe:** uses `insetInlineStart`/`insetInlineEnd` and MUI directional props, never `left`/`right`
- No logos, no language switcher, no manual button, no user avatar

**Moved items (accessible from settings page):**
- Language switcher
- Manual/help
- User profile/logout

### 5. Android Back Button Handler

**File:** `src/shared/presentation/hooks/useAndroidBackButton.ts`

Uses `@capacitor/app` `App.addListener('backButton')`.

**Cleanup:** The `useEffect` MUST return `() => handle.remove()` to prevent double listener registration in React strict mode.

Priority order:
1. Close open MUI Dialog (if any) → done
2. Close open Drawer/BottomSheet → done
3. If form has unsaved changes → show confirm dialog
4. Navigate back in router history (`navigate(-1)`)
5. If on root route (`/`) → show toast with `t('app.pressAgainToExit')`
6. Second press within 2s → `App.exitApp()`

### 6. Pull-to-Refresh

**File:** `src/shared/presentation/components/PullToRefresh.tsx` (wrapper component)
**File:** `src/shared/presentation/hooks/usePullToRefresh.ts` (internal logic)

**Architecture:** A wrapper component that receives `onRefresh: () => Promise<void>` as a prop. This respects the DDD layer rule — the shared component never imports from feature stores. Each page passes its own fetch function:

```typescript
// In SpacesPage:
<PullToRefresh onRefresh={() => fetchSpaces()}>
  {/* page content */}
</PullToRefresh>
```

- Only renders on native (`isNative` guard inside the component; on web, renders children directly)
- CSS-based: `overscroll-behavior-y: contain` on scroll container
- Custom pull indicator using transform + opacity
- Light haptic on pull threshold via `@capacitor/haptics`

### 7. Sync FAB Repositioning

**Issue:** The sync status FAB in `MainLayout.tsx` is `position: fixed; bottom: 16-24px` — it will overlap the bottom nav on native.

**Fix:** On native, adjust the FAB bottom offset to `bottom: bottomNavHeight + env(safe-area-inset-bottom) + 16px`. This is part of the `MainLayout.tsx` native branch — the web branch keeps the current positioning unchanged.

### 8. Status Bar Styling

**File:** `android/app/src/main/res/values/styles.xml` + runtime via `@capacitor/status-bar`

- Background: `#0D47A1` (primary blue)
- Icons: white (light content)
- Set at app startup via Capacitor StatusBar plugin in `App.tsx` or a `useNativeInit` hook
- Also configured in Android theme XML for the splash screen phase (before WebView loads)

### 9. Splash Screen

**Files:** `android/app/src/main/res/` (drawable, values)

- Android 12+ SplashScreen API (already have `core-splashscreen:1.0.1`)
- White background with centered `AppIcon.png`
- **Replaces** existing PNG-based splash (`drawable-port-*/splash.png`, `drawable-land-*/splash.png`) with the new icon-centered approach
- The existing `AppTheme.NoActionBarLaunch` theme (inherits `Theme.SplashScreen`) will be updated to reference the new icon drawable

### 10. App Icon

**Files:** `android/app/src/main/res/mipmap-*/`

- Generate all mipmap sizes from `public/logos/AppIcon.png`
- Replace default Capacitor icons
- Both regular and round variants
- Adaptive icon with white background layer

### 11. Safe Area Handling

**Files:** `index.html`, CSS in native components

- `index.html`: add `viewport-fit=cover` to viewport meta tag
- Bottom nav: `paddingBottom: env(safe-area-inset-bottom)`
- Native header: `paddingTop: env(safe-area-inset-top)`
- Web browsers: env() resolves to `0px` — no visual change

### 12. Native Theme Override

**File:** `src/theme.ts`

When `isNative` (determined at theme creation time, passed as parameter):
- Android font family: `'Roboto', sans-serif` (system default, no font loading)
- Future iOS: `'-apple-system', 'SF Pro Text', sans-serif`
- Slightly tighter spacing for native density
- Material ripple effects remain enabled

### 13. Haptic Feedback

**Plugin:** `@capacitor/haptics` (new dependency)

Haptic events:
- `ImpactStyle.Light` — bottom nav tab change
- `ImpactStyle.Medium` — pull-to-refresh threshold
- `NotificationType.Warning` — destructive action confirm dialog shown

No haptic on regular button taps.

### 14. iOS Scaffolding (deferred polish)

- Run `npx cap add ios` to create platform
- Configure `Info.plist`: app name, icon, status bar
- Copy app icon assets
- Safe areas work automatically via CSS `env()` variables
- Full iOS polish (swipe-back gesture, SF Pro typography, iOS-specific transitions) deferred to future round

---

## New Translation Keys

Add to both `src/locales/en/common.json` and `src/locales/he/common.json`:

```json
{
  "app": {
    "pressAgainToExit": "Press again to exit",
    "settings": "Settings"
  }
}
```

Hebrew:
```json
{
  "app": {
    "pressAgainToExit": "לחץ שוב כדי לצאת",
    "settings": "הגדרות"
  }
}
```

Page titles for native header are derived from existing `navigation.*` keys (already present).

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| `@capacitor/haptics` | Haptic feedback |
| `@capacitor/status-bar` | Status bar color/style |

Both are official Capacitor 7-compatible plugins.

---

## New Files

```
src/shared/presentation/hooks/useNativePlatform.ts
src/shared/presentation/hooks/useNavTabs.ts
src/shared/presentation/hooks/useAndroidBackButton.ts
src/shared/presentation/hooks/usePullToRefresh.ts
src/shared/presentation/components/PullToRefresh.tsx
src/shared/presentation/layouts/NativeBottomNav.tsx
src/shared/presentation/layouts/NativeAppHeader.tsx
```

---

## Modified Files

```
src/shared/presentation/layouts/MainLayout.tsx    — top-level if/else for native vs web layout
src/theme.ts                                       — native font override (runtime, parameter-based)
index.html                                         — viewport-fit=cover
capacitor.config.ts                                — status-bar plugin config
package.json                                       — new Capacitor plugin deps
src/locales/en/common.json                         — new native-only translation keys
src/locales/he/common.json                         — new native-only translation keys
android/app/src/main/res/values/styles.xml         — status bar color, splash icon reference
android/app/src/main/res/mipmap-*/                 — app icons (replace defaults)
android/app/src/main/res/drawable/                 — splash screen (replace PNG with icon approach)
```

---

## Testing Strategy

- **Web E2E (Playwright):** Run existing test suite — must pass unchanged. Native components are tree-shaken out via `isNative` guards.
- **Android manual:** Test on emulator (Medium Phone API 35):
  - Bottom nav: correct tabs for feature config, haptic on tap
  - Back button: closes dialogs → navigates back → double-tap exit
  - Pull-to-refresh: all data pages
  - Status bar: blue with white icons
  - Splash screen: centered icon on white
  - Safe areas: no content behind status bar or gesture bar
  - RTL: switch to Hebrew, verify header and bottom nav layout
- **Regression check:** Verify all feature pages render correctly on web desktop + mobile after MainLayout changes.

---

## Out of Scope

- Push notifications
- Biometric authentication
- Deep linking / URL schemes
- Offline mode enhancements
- iOS full polish (swipe-back, SF Pro, iOS-specific animations)
- App Store / Play Store listing
