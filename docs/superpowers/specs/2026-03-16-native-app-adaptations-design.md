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
| Header | Minimal — title + store selector + settings | Native apps don't show logos in headers |
| Back button | Smart back — close dialogs first, then navigate, double-tap exit | Expected Android UX |
| Status bar | Primary blue (#0D47A1) + white icons | Cohesive with app theme |
| Splash screen | Centered AppIcon on white | Fast, professional |
| Pull-to-refresh | All data pages | Standard mobile pattern |
| Typography | Roboto on Android, SF Pro on iOS (system defaults) | Platform-native feel |
| Haptic feedback | Bottom nav tap, pull-to-refresh, destructive confirms | Subtle, not excessive |

---

## Isolation Strategy

**Rule:** No existing component rendering logic is modified. All native UI lives in new files. Existing files get at most a single `if/else` wrapper.

```typescript
// The pattern:
const { isNative } = useNativePlatform();

// In MainLayout.tsx:
{isNative ? <NativeBottomNav /> : <ExistingDrawerNav />}

// In AppHeader area:
{isNative ? <NativeAppHeader /> : <ExistingAppHeader />}
```

### Impact assessment per file:

| File | Change | Web Impact |
|------|--------|------------|
| `MainLayout.tsx` | `if/else` wrapper for nav | **NONE** — else branch is verbatim current code |
| `AppHeader.tsx` | `if/else` wrapper | **NONE** — else branch unchanged |
| `theme.ts` | Runtime native font override | **NONE** — only applied when `isNative` |
| `index.html` | Add `viewport-fit=cover` | **NONE** — `env(safe-area-inset-*)` resolves to `0px` on web |
| `capacitor.config.ts` | Plugin config | **NONE** — Capacitor builds only |
| `android/` | Styles, icons, splash | **NONE** — separate from web |
| All new files | New components, hooks | **NONE** — tree-shaken from web builds |

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

Uses existing `platformDetector.ts` underneath. Memoized, no re-renders.

### 2. Bottom Navigation Bar

**File:** `src/shared/presentation/layouts/NativeBottomNav.tsx`

- MUI `BottomNavigation` + `BottomNavigationAction` components
- Centered fixed-width layout (not stretch-to-fill)
- Dynamic tabs based on `activeStoreEffectiveFeatures` from auth context
- Dashboard tab always present (first position)
- Feature tabs: Spaces/People (mutually exclusive), Conference, Labels, AIMS Management
- Only enabled features appear
- Active tab indicated by filled icon + primary color
- `padding-bottom: env(safe-area-inset-bottom)` for gesture bar phones
- Haptic feedback on tab change via `@capacitor/haptics`

**Tab definitions:**

| Feature Flag | Tab Label | Icon | Route |
|-------------|-----------|------|-------|
| (always) | Dashboard | DashboardIcon | `/` |
| `spacesEnabled` | Spaces | MeetingRoomIcon | `/spaces` |
| `peopleEnabled` | People | PeopleIcon | `/people` |
| `conferenceEnabled` | Conference | GroupsIcon | `/conference` |
| `labelsEnabled` | Labels | LabelIcon | `/labels` |
| (admin only) | AIMS | RouterIcon | `/aims` |

### 3. Native App Header

**File:** `src/shared/presentation/layouts/NativeAppHeader.tsx`

- Slim header: 48px height
- Left: page title (derived from current route)
- Center/Right: `CompanyStoreSelector compact`
- Right: Settings gear icon
- `padding-top: env(safe-area-inset-top)` for notch phones
- No logos, no language switcher, no manual button, no user avatar in header

**Moved items:**
- Language switcher → settings page
- Manual/help → settings page
- User profile/logout → settings page or bottom sheet from avatar

### 4. Android Back Button Handler

**File:** `src/shared/presentation/hooks/useAndroidBackButton.ts`

Uses `@capacitor/app` `App.addListener('backButton')`.

Priority order:
1. Close open MUI Dialog (if any) → done
2. Close open Drawer/BottomSheet → done
3. If form has unsaved changes → show confirm dialog
4. Navigate back in router history (`navigate(-1)`)
5. If on root route (`/`) → show toast "Press again to exit"
6. Second press within 2s → `App.exitApp()`

### 5. Pull-to-Refresh

**File:** `src/shared/presentation/hooks/usePullToRefresh.ts`

- CSS-based: `overscroll-behavior-y: contain` on scroll containers
- Custom pull indicator using transform + opacity
- Triggers the page's existing fetch function:
  - Dashboard: refetch all cards
  - Spaces/People: `fetchSpaces()` / `fetchPeople()`
  - Conference: `fetchRooms()`
  - Labels: `fetchLabels()`
  - AIMS: `refreshOverview()`
- Light haptic on pull threshold via `@capacitor/haptics`

### 6. Status Bar Styling

**File:** `android/app/src/main/res/values/styles.xml` + runtime via `@capacitor/status-bar`

- Background: `#0D47A1` (primary blue)
- Icons: white (light content)
- Set at app startup via Capacitor StatusBar plugin
- Also configured in Android theme XML for splash screen phase

### 7. Splash Screen

**Files:** `android/app/src/main/res/` (drawable, values)

- Android 12+ SplashScreen API (already have `core-splashscreen:1.0.1`)
- White background
- Centered `AppIcon.png` as the icon
- No branding text (shown for <1s)

### 8. App Icon

**Files:** `android/app/src/main/res/mipmap-*/`

- Generate all mipmap sizes from `public/logos/AppIcon.png`
- Replace default Capacitor icons
- Both regular and round variants
- Adaptive icon with white background layer

### 9. Safe Area Handling

**Files:** `index.html`, CSS in native components

- `index.html`: add `viewport-fit=cover` to viewport meta tag
- Bottom nav: `padding-bottom: env(safe-area-inset-bottom)`
- Native header: `padding-top: env(safe-area-inset-top)`
- Web browsers: env() resolves to `0px` — no visual change

### 10. Native Theme Override

**File:** `src/theme.ts`

When `isNative`:
- Font family: `'Roboto', sans-serif` (Android system font)
- Future iOS: `'-apple-system', 'SF Pro Text', sans-serif`
- Slightly tighter spacing for native density
- Material ripple effects enabled (MUI default, but ensure not disabled)

### 11. Haptic Feedback

**Plugin:** `@capacitor/haptics` (new dependency)

Haptic events:
- `ImpactStyle.Light` — bottom nav tab change
- `ImpactStyle.Medium` — pull-to-refresh threshold
- `NotificationType.Warning` — destructive action confirm dialog shown

No haptic on regular button taps — would feel excessive.

### 12. iOS Scaffolding (deferred polish)

- Run `npx cap add ios` to create platform
- Configure `Info.plist`: app name, icon, status bar
- Copy app icon assets
- Safe areas work automatically via CSS `env()` variables
- Full iOS polish (swipe-back gesture, SF Pro typography, iOS-specific transitions) deferred to future round

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| `@capacitor/haptics` | Haptic feedback |
| `@capacitor/status-bar` | Status bar color/style |

Both are official Capacitor plugins, ~10KB each.

---

## New Files

```
src/shared/presentation/hooks/useNativePlatform.ts
src/shared/presentation/hooks/useAndroidBackButton.ts
src/shared/presentation/hooks/usePullToRefresh.ts
src/shared/presentation/layouts/NativeBottomNav.tsx
src/shared/presentation/layouts/NativeAppHeader.tsx
```

---

## Modified Files (minimal changes)

```
src/shared/presentation/layouts/MainLayout.tsx    — if/else wrapper for nav
src/theme.ts                                       — native font override (runtime only)
index.html                                         — viewport-fit=cover
capacitor.config.ts                                — status-bar plugin config
android/app/src/main/res/values/styles.xml         — status bar color, splash
android/app/src/main/res/mipmap-*/                 — app icons
android/app/src/main/res/drawable/splash.xml       — splash screen drawable
package.json                                       — new Capacitor plugin deps
```

---

## Testing Strategy

- **Web E2E (Playwright):** Run existing test suite — must pass unchanged. Native components are tree-shaken out.
- **Android manual:** Test on emulator (Medium Phone API 35) — verify bottom nav, back button, pull-to-refresh, status bar, splash screen, safe areas.
- **Regression check:** Verify all feature pages render correctly on web after changes to MainLayout.tsx.

---

## Out of Scope

- Push notifications
- Biometric authentication
- Deep linking / URL schemes
- Offline mode enhancements
- iOS full polish (swipe-back, SF Pro, iOS-specific animations)
- App Store / Play Store listing
