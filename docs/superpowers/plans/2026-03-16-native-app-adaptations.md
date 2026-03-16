# Native App Adaptations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Capacitor-wrapped app feel native on Android while keeping the web app completely unchanged.

**Architecture:** All native UI lives in new files. The single branching point is `MainLayout.tsx`, which renders either native layout (bottom nav + slim header) or the existing web layout. A shared `useNavTabs` hook ensures tab filtering parity between both paths.

**Tech Stack:** React 19, MUI 7, Capacitor 7, @capacitor/haptics, @capacitor/status-bar, @capacitor/app

**Spec:** `docs/superpowers/specs/2026-03-16-native-app-adaptations-design.md`

---

## Task 1: Install Dependencies & Configure Infrastructure

**Files:**
- Modify: `package.json`
- Modify: `index.html`
- Modify: `capacitor.config.ts`

- [ ] **Step 1: Install Capacitor plugins**

```bash
npm install @capacitor/haptics @capacitor/status-bar
```

- [ ] **Step 2: Add viewport-fit=cover to index.html**

In `index.html`, change the viewport meta tag:
```html
<!-- FROM: -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<!-- TO: -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

Also update theme-color to match our primary:
```html
<meta name="theme-color" content="#0D47A1" />
```

- [ ] **Step 3: Update capacitor.config.ts**

Add StatusBar plugin config:
```typescript
plugins: {
    // ... existing plugins
    StatusBar: {
        style: 'LIGHT',          // white icons
        backgroundColor: '#0D47A1', // primary blue
    },
}
```

- [ ] **Step 4: Sync Capacitor**

```bash
npx cap sync android
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json index.html capacitor.config.ts
git commit -m "chore: install haptics + status-bar plugins, viewport-fit=cover"
```

---

## Task 2: Platform Detection Hook

**Files:**
- Create: `src/shared/presentation/hooks/useNativePlatform.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

export interface NativePlatformInfo {
    isNative: boolean;
    isAndroid: boolean;
    isIOS: boolean;
    platform: 'web' | 'android' | 'ios' | 'electron';
}

export function useNativePlatform(): NativePlatformInfo {
    return useMemo(() => {
        const isNative = Capacitor.isNativePlatform();
        const capPlatform = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'

        // Check for Electron (overrides Capacitor's 'web')
        const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

        const platform = isElectron ? 'electron' as const
            : capPlatform === 'android' ? 'android' as const
            : capPlatform === 'ios' ? 'ios' as const
            : 'web' as const;

        return {
            isNative,
            isAndroid: platform === 'android',
            isIOS: platform === 'ios',
            platform,
        };
    }, []);
}
```

- [ ] **Step 2: Verify web build compiles**

```bash
npx tsc --noEmit
```

Expected: No errors. On web, `Capacitor.isNativePlatform()` returns `false`, `getPlatform()` returns `'web'`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/hooks/useNativePlatform.ts
git commit -m "feat: add useNativePlatform hook for platform detection"
```

---

## Task 3: Shared Navigation Tab Hook

**Files:**
- Create: `src/shared/presentation/hooks/useNavTabs.ts`
- Modify: `src/shared/presentation/layouts/MainLayout.tsx` (refactor tab logic to use hook)

- [ ] **Step 1: Create useNavTabs hook**

Extract the tab-building logic from `MainLayout.tsx` lines 127-144 into a shared hook:

```typescript
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import LabelIcon from '@mui/icons-material/Label';
import RouterIcon from '@mui/icons-material/Router';
import { ConferenceIcon } from '../../../components/icons/ConferenceIcon';

export interface NavTab {
    labelKey: string;
    label: string;
    value: string;
    icon: React.ReactElement;
    feature?: string;
}

export function useNavTabs(): NavTab[] {
    const { t } = useTranslation();
    const { canAccessFeature, activeStoreEffectiveFeatures } = useAuthContext();
    const workingMode = useSettingsStore(state => state.settings.workingMode);
    const peopleManagerEnabled = useSettingsStore(state => state.settings.peopleManagerEnabled);

    const isPeopleManagerMode = (activeStoreEffectiveFeatures?.peopleEnabled ?? peopleManagerEnabled) && workingMode === 'SOLUM_API';

    return useMemo(() => {
        const allTabs: NavTab[] = [
            { labelKey: 'navigation.dashboard', label: t('navigation.dashboard'), value: '/', icon: <DashboardIcon fontSize="small" />, feature: 'dashboard' },
            {
                labelKey: isPeopleManagerMode ? 'navigation.people' : 'navigation.spaces',
                label: t(isPeopleManagerMode ? 'navigation.people' : 'navigation.spaces'),
                value: isPeopleManagerMode ? '/people' : '/spaces',
                icon: isPeopleManagerMode ? <PeopleIcon fontSize="small" /> : <BusinessIcon fontSize="small" />,
                feature: isPeopleManagerMode ? 'people' : 'spaces',
            },
            { labelKey: 'navigation.conference', label: t('navigation.conference'), value: '/conference', icon: <ConferenceIcon fontSize="small" />, feature: 'conference' },
            { labelKey: 'navigation.labels', label: t('navigation.labels'), value: '/labels', icon: <LabelIcon fontSize="small" />, feature: 'labels' },
            { labelKey: 'navigation.aimsManagement', label: t('navigation.aimsManagement'), value: '/aims-management', icon: <RouterIcon fontSize="small" />, feature: 'aims-management' },
        ];

        return allTabs.filter(tab => !tab.feature || canAccessFeature(tab.feature as any));
    }, [t, isPeopleManagerMode, canAccessFeature]);
}
```

- [ ] **Step 2: Refactor MainLayout.tsx to use the hook**

Replace the `allNavTabs` / `navTabs` block (lines 127-144) with:
```typescript
import { useNavTabs } from '../hooks/useNavTabs';
// ...
const navTabs = useNavTabs();
```

Remove the now-unused `NavTab` interface and the `allNavTabs` variable. Remove the icon imports that moved to the hook (DashboardIcon, BusinessIcon, PeopleIcon, LabelIcon, RouterIcon, ConferenceIcon) — only if they're not used elsewhere in MainLayout.

- [ ] **Step 3: Verify web build and test**

```bash
npx tsc --noEmit
npm run build
```

Expected: Clean build. Web app unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/shared/presentation/hooks/useNavTabs.ts src/shared/presentation/layouts/MainLayout.tsx
git commit -m "refactor: extract useNavTabs hook from MainLayout"
```

---

## Task 4: Translation Keys

**Files:**
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

- [ ] **Step 1: Add native-only keys to EN locale**

In `src/locales/en/common.json`, inside the `"app"` object, add:
```json
"pressAgainToExit": "Press again to exit"
```

The `"settings"` key likely already exists — verify first.

- [ ] **Step 2: Add native-only keys to HE locale**

In `src/locales/he/common.json`, inside the `"app"` object, add:
```json
"pressAgainToExit": "לחץ שוב כדי לצאת"
```

- [ ] **Step 3: Commit**

```bash
git add src/locales/en/common.json src/locales/he/common.json
git commit -m "feat: add native-only translation keys"
```

---

## Task 5: Native App Header

**Files:**
- Create: `src/shared/presentation/layouts/NativeAppHeader.tsx`

- [ ] **Step 1: Create NativeAppHeader component**

```typescript
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useLocation } from 'react-router-dom';
import { useNavTabs } from '../hooks/useNavTabs';
import { CompanyStoreSelector } from '@features/auth/presentation/CompanyStoreSelector';

interface NativeAppHeaderProps {
    onSettingsClick: () => void;
}

export function NativeAppHeader({ onSettingsClick }: NativeAppHeaderProps) {
    const location = useLocation();
    const navTabs = useNavTabs();

    // Derive page title from current route
    const currentTab = navTabs.find(tab => tab.value === location.pathname) || navTabs[0];
    const pageTitle = currentTab?.label || '';

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                bgcolor: 'primary.main',
                // Safe area for notch
                paddingTop: 'env(safe-area-inset-top)',
            }}
        >
            <Toolbar sx={{ minHeight: 48, px: 1.5, justifyContent: 'space-between' }}>
                <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: 'primary.contrastText', fontSize: '1.1rem' }}
                >
                    {pageTitle}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CompanyStoreSelector compact />
                    <IconButton
                        color="inherit"
                        onClick={onSettingsClick}
                        edge="end"
                        sx={{ color: 'primary.contrastText' }}
                    >
                        <SettingsIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/layouts/NativeAppHeader.tsx
git commit -m "feat: add NativeAppHeader with slim layout"
```

---

## Task 6: Bottom Navigation Bar

**Files:**
- Create: `src/shared/presentation/layouts/NativeBottomNav.tsx`

- [ ] **Step 1: Create NativeBottomNav component**

```typescript
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavTabs } from '../hooks/useNavTabs';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNativePlatform } from '../hooks/useNativePlatform';

export function NativeBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const navTabs = useNavTabs();
    const { isNative } = useNativePlatform();

    const currentTab = navTabs.findIndex(tab => tab.value === location.pathname);

    const handleChange = (_: React.SyntheticEvent, newValue: number) => {
        const tab = navTabs[newValue];
        if (tab && tab.value !== location.pathname) {
            if (isNative) {
                Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
            }
            navigate(tab.value);
        }
    };

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 0,
                insetInlineStart: 0,
                insetInlineEnd: 0,
                zIndex: (theme) => theme.zIndex.appBar,
                paddingBottom: 'env(safe-area-inset-bottom)',
                borderTop: 1,
                borderColor: 'divider',
            }}
        >
            <BottomNavigation
                value={currentTab >= 0 ? currentTab : 0}
                onChange={handleChange}
                showLabels
                sx={{
                    height: 56,
                    justifyContent: 'center',
                    gap: 0.5,
                    '& .MuiBottomNavigationAction-root': {
                        minWidth: 56,
                        maxWidth: 80,
                        px: 1,
                    },
                }}
            >
                {navTabs.map((tab) => (
                    <BottomNavigationAction
                        key={tab.value}
                        label={tab.label}
                        icon={tab.icon}
                    />
                ))}
            </BottomNavigation>
        </Paper>
    );
}

/** Height of bottom nav (for offset calculations) */
export const NATIVE_BOTTOM_NAV_HEIGHT = 56;
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/layouts/NativeBottomNav.tsx
git commit -m "feat: add NativeBottomNav with haptic feedback"
```

---

## Task 7: Android Back Button Handler

**Files:**
- Create: `src/shared/presentation/hooks/useAndroidBackButton.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { useNativePlatform } from './useNativePlatform';
import { useTranslation } from 'react-i18next';

/**
 * Handles Android hardware back button with smart priority:
 * 1. Close open dialog (via onCloseDialog callback)
 * 2. Navigate back in history
 * 3. On root route: double-tap to exit
 */
export function useAndroidBackButton(onCloseDialog?: () => boolean) {
    const { isAndroid } = useNativePlatform();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const lastBackPress = useRef<number>(0);
    const toastShown = useRef(false);

    const handleBackButton = useCallback(() => {
        // 1. Try to close an open dialog
        if (onCloseDialog && onCloseDialog()) {
            return;
        }

        // 2. If not on root, navigate back
        const isRoot = location.pathname === '/' || location.pathname === '';
        if (!isRoot) {
            navigate(-1);
            return;
        }

        // 3. On root: double-tap to exit
        const now = Date.now();
        if (now - lastBackPress.current < 2000) {
            App.exitApp();
            return;
        }

        lastBackPress.current = now;
        toastShown.current = true;

        // Show native-like toast (using a simple DOM toast since MUI Snackbar
        // would require state management outside this hook)
        const toast = document.createElement('div');
        toast.textContent = t('app.pressAgainToExit');
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)',
            color: 'white',
            padding: '8px 24px',
            borderRadius: '24px',
            fontSize: '14px',
            zIndex: '99999',
            transition: 'opacity 0.3s',
        });
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 1700);
    }, [onCloseDialog, location.pathname, navigate, t]);

    useEffect(() => {
        if (!isAndroid) return;

        const handle = App.addListener('backButton', handleBackButton);

        return () => {
            handle.then(h => h.remove());
        };
    }, [isAndroid, handleBackButton]);
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/hooks/useAndroidBackButton.ts
git commit -m "feat: add Android back button handler with smart priority"
```

---

## Task 8: Pull-to-Refresh

**Files:**
- Create: `src/shared/presentation/components/PullToRefresh.tsx`

- [ ] **Step 1: Create PullToRefresh wrapper component**

```typescript
import { type ReactNode, useRef, useState, useCallback } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useNativePlatform } from '../hooks/useNativePlatform';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
}

const PULL_THRESHOLD = 80;

/**
 * Pull-to-refresh wrapper. On native, adds pull-down gesture to trigger refresh.
 * On web, renders children directly (no-op).
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const { isNative } = useNativePlatform();
    const [pulling, setPulling] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
            setPulling(true);
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!pulling || refreshing) return;
        const distance = Math.max(0, e.touches[0].clientY - startY.current);
        setPullDistance(Math.min(distance, PULL_THRESHOLD * 1.5));
    }, [pulling, refreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (!pulling) return;
        setPulling(false);

        if (pullDistance >= PULL_THRESHOLD) {
            Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
            setRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
            }
        }
        setPullDistance(0);
    }, [pulling, pullDistance, onRefresh]);

    // On web, just render children directly
    if (!isNative) return <>{children}</>;

    const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

    return (
        <Box
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{ position: 'relative', overscrollBehaviorY: 'contain', flex: 1, overflow: 'auto' }}
        >
            {/* Pull indicator */}
            {(pullDistance > 0 || refreshing) && (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    py: 1,
                    opacity: refreshing ? 1 : progress,
                    transform: `scale(${refreshing ? 1 : progress})`,
                    transition: refreshing ? 'none' : 'transform 0.1s',
                }}>
                    <CircularProgress
                        size={28}
                        variant={refreshing ? 'indeterminate' : 'determinate'}
                        value={progress * 100}
                    />
                </Box>
            )}
            {children}
        </Box>
    );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/components/PullToRefresh.tsx
git commit -m "feat: add PullToRefresh wrapper component for native"
```

---

## Task 9: Native Theme Override

**Files:**
- Modify: `src/theme.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add native parameter to createAppTheme**

In `src/theme.ts`, update the `createAppTheme` function signature:

```typescript
export function createAppTheme(direction: 'ltr' | 'rtl', isNative = false) {
```

Inside the `typography` section, conditionally override the font:

```typescript
typography: {
    fontFamily: isNative
        ? ['"Roboto"', 'sans-serif'].join(',')
        : ['"Assistant"', '-apple-system', /* ...existing fonts */].join(','),
    // ... rest unchanged
},
```

- [ ] **Step 2: Pass isNative from App.tsx**

In `src/App.tsx`, where the theme is created, detect the platform and pass it:

```typescript
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const theme = createAppTheme(direction, isNative);
```

- [ ] **Step 3: Verify web build**

```bash
npm run build
```

Expected: Clean build. On web, `Capacitor.isNativePlatform()` returns `false`, so the font stays as-is.

- [ ] **Step 4: Commit**

```bash
git add src/theme.ts src/App.tsx
git commit -m "feat: native theme override with Roboto font on Android"
```

---

## Task 10: MainLayout Integration (the single branching point)

**Files:**
- Modify: `src/shared/presentation/layouts/MainLayout.tsx`

This is the critical task where native and web paths diverge.

- [ ] **Step 1: Add imports at the top of MainLayout.tsx**

```typescript
import { useNativePlatform } from '../hooks/useNativePlatform';
import { NativeAppHeader } from './NativeAppHeader';
import { NativeBottomNav, NATIVE_BOTTOM_NAV_HEIGHT } from './NativeBottomNav';
import { useAndroidBackButton } from '../hooks/useAndroidBackButton';
```

- [ ] **Step 2: Add native detection and hooks inside MainLayout**

After the existing hooks (around line 83), add:

```typescript
const { isNative } = useNativePlatform();

// Android back button — close settings dialog if open, otherwise default behavior
useAndroidBackButton(isNative ? () => {
    if (settingsOpen) { setSettingsOpen(false); return true; }
    if (manualOpen) { setManualOpen(false); return true; }
    if (profileOpen) { setProfileOpen(false); return true; }
    if (mobileMenuOpen) { setMobileMenuOpen(false); return true; }
    return false;
} : undefined);
```

- [ ] **Step 3: Wrap the return JSX with platform branching**

The native branch renders `NativeAppHeader` instead of `AppHeader`, `NativeBottomNav` instead of the Drawer, and adjusts the content area to account for bottom nav height. The web branch is the entire existing JSX verbatim.

In the return statement, **before** the existing `<StoreRequiredGuard>`:

```typescript
// Native layout branch
if (isNative) {
    return (
        <SyncProvider controller={syncController}>
            <StoreRequiredGuard>
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <NativeAppHeader onSettingsClick={() => setSettingsOpen(true)} />

                    {/* Store switching overlay */}
                    {isSwitchingStore && (
                        <Box sx={{ position: 'fixed', inset: 0, zIndex: (theme) => theme.zIndex.modal + 1, bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SphereLoader />
                        </Box>
                    )}

                    {/* Main content — padded for bottom nav */}
                    <Box component="main" sx={{ flex: 1, pb: `${NATIVE_BOTTOM_NAV_HEIGHT + 24}px` }}>
                        <Container maxWidth="xl" sx={{ py: { xs: 1.5, sm: 2 } }}>
                            {children}
                        </Container>
                    </Box>

                    <NativeBottomNav />

                    {/* Sync FAB — positioned above bottom nav */}
                    <SyncStatusIndicator
                        syncState={syncState}
                        sx={{
                            position: 'fixed',
                            bottom: `${NATIVE_BOTTOM_NAV_HEIGHT + 24}px`,
                            insetInlineEnd: 16,
                            zIndex: 1050,
                        }}
                    />

                    {/* Dialogs (shared between native and web) */}
                    <Suspense fallback={null}>
                        {settingsOpen && <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
                        {manualOpen && <ManualDialog open={manualOpen} onClose={() => setManualOpen(false)} />}
                        {profileOpen && <EnhancedUserDialog open={profileOpen} onClose={() => setProfileOpen(false)} mode="profile" user={currentUser!} />}
                    </Suspense>

                    {commandPalette.isOpen && (
                        <Suspense fallback={null}>
                            <CommandPalette open={commandPalette.isOpen} onClose={commandPalette.close} />
                        </Suspense>
                    )}
                </Box>
            </StoreRequiredGuard>
        </SyncProvider>
    );
}

// Web layout (existing code below, unchanged)
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Clean build. Web app unchanged.

- [ ] **Step 5: Manual web regression test**

Open `npm run dev` in browser. Verify:
- Desktop tabs work
- Mobile hamburger menu works
- All feature pages render
- Settings dialog opens

- [ ] **Step 6: Commit**

```bash
git add src/shared/presentation/layouts/MainLayout.tsx
git commit -m "feat: MainLayout native/web branching with bottom nav and slim header"
```

---

## Task 11: Status Bar & Splash Screen (Android native)

**Files:**
- Modify: `android/app/src/main/res/values/styles.xml`
- Create: `android/app/src/main/res/values/colors.xml` (if not exists)

- [ ] **Step 1: Add primary color to Android resources**

Create or update `android/app/src/main/res/values/colors.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="primaryBlue">#0D47A1</color>
    <color name="splashBackground">#FFFFFF</color>
</resources>
```

- [ ] **Step 2: Update styles.xml for status bar and splash**

In `android/app/src/main/res/values/styles.xml`, update `AppTheme`:
```xml
<style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
    <item name="colorPrimary">@color/primaryBlue</item>
    <item name="colorPrimaryDark">@color/primaryBlue</item>
    <item name="colorAccent">@color/primaryBlue</item>
    <item name="android:statusBarColor">@color/primaryBlue</item>
</style>
```

Update `AppTheme.NoActionBarLaunch` to use the icon-based splash:
```xml
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
    <item name="windowSplashScreenBackground">@color/splashBackground</item>
    <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>
    <item name="android:statusBarColor">@color/primaryBlue</item>
    <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
</style>
```

- [ ] **Step 3: Initialize StatusBar at runtime**

Create `src/shared/presentation/hooks/useNativeInit.ts`:
```typescript
import { useEffect } from 'react';
import { useNativePlatform } from './useNativePlatform';

export function useNativeInit() {
    const { isNative } = useNativePlatform();

    useEffect(() => {
        if (!isNative) return;

        (async () => {
            try {
                const { StatusBar, Style } = await import('@capacitor/status-bar');
                await StatusBar.setBackgroundColor({ color: '#0D47A1' });
                await StatusBar.setStyle({ style: Style.Light }); // white icons
            } catch {
                // StatusBar not available (web fallback)
            }
        })();
    }, [isNative]);
}
```

Call `useNativeInit()` in `App.tsx` or `MainLayout.tsx` (inside the component body, before the return).

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/res/values/ src/shared/presentation/hooks/useNativeInit.ts
git commit -m "feat: Android status bar blue + splash screen with app icon"
```

---

## Task 12: App Icon Generation

**Files:**
- Modify: `android/app/src/main/res/mipmap-*/`

- [ ] **Step 1: Generate icons using Capacitor assets tool**

```bash
npx @capacitor/assets generate --android --icon-background-color '#FFFFFF' --icon-background-color-dark '#1a1a2e'
```

If the tool requires specific file placement, copy `public/logos/AppIcon.png` to the project root as `icon.png` first:

```bash
cp public/logos/AppIcon.png resources/icon.png
npx @capacitor/assets generate --android
```

If the tool doesn't work, manually resize `AppIcon.png` to the required mipmap sizes:
- `mipmap-mdpi`: 48x48
- `mipmap-hdpi`: 72x72
- `mipmap-xhdpi`: 96x96
- `mipmap-xxhdpi`: 144x144
- `mipmap-xxxhdpi`: 192x192

And copy to both `ic_launcher.png` and `ic_launcher_round.png` in each directory.

- [ ] **Step 2: Verify icon in emulator**

```bash
cd android && ./gradlew.bat assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Check the app icon in the launcher.

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/res/mipmap-*
git commit -m "feat: replace default Capacitor icons with AppIcon"
```

---

## Task 13: Wrap Feature Pages with PullToRefresh

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/features/space/presentation/SpacesManagementView.tsx`
- Modify: `src/features/people/presentation/PeopleManagerView.tsx`
- Modify: `src/features/conference/presentation/ConferencePage.tsx`
- Modify: `src/features/labels/presentation/LabelsPage.tsx`
- Modify: `src/features/aims-management/presentation/AimsManagementPage.tsx`

- [ ] **Step 1: Add PullToRefresh wrapper to each page**

For each page, wrap the outer `<Box>` with `<PullToRefresh>` and pass the existing fetch function. Example for SpacesManagementView:

```typescript
import { PullToRefresh } from '@shared/presentation/components/PullToRefresh';

// In the return:
return (
    <PullToRefresh onRefresh={() => spaceController.fetchSpaces()}>
        <Box>
            {/* existing content */}
        </Box>
    </PullToRefresh>
);
```

Repeat for each page with the appropriate fetch function:
- Dashboard: the data fetch effect's function
- People: `fetchPeople()`
- Conference: the rooms fetch function
- Labels: the labels fetch function
- AIMS: the overview refresh function

On web, `PullToRefresh` renders children directly (no-op), so this is safe.

- [ ] **Step 2: Verify web build**

```bash
npm run build
```

Expected: Clean build. Web unaffected.

- [ ] **Step 3: Commit**

```bash
git add src/features/*/presentation/*.tsx
git commit -m "feat: add pull-to-refresh on all data pages (native only)"
```

---

## Task 14: Android Build, Test & Deploy

- [ ] **Step 1: Sync and build**

```bash
npx cap sync android
cd android && ./gradlew.bat assembleDebug
```

- [ ] **Step 2: Install on emulator**

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.electisspace.app/.MainActivity
```

- [ ] **Step 3: Manual test checklist**

- Bottom nav shows correct tabs for current store's feature config
- Tapping tabs navigates, haptic feedback fires
- Header shows page title + store selector + settings gear
- Android back button closes dialogs → navigates back → double-tap exits
- Pull-to-refresh works on all data pages
- Status bar is blue with white icons
- Splash screen shows app icon on white
- App icon is correct in launcher
- RTL (switch to Hebrew): header and bottom nav layout correctly
- Safe areas: no content behind status bar or gesture bar

- [ ] **Step 4: Run web E2E tests**

```bash
npm run test:e2e
```

Expected: All existing tests pass — web app unchanged.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: address testing feedback"
```

---

## Task 15: iOS Scaffolding

- [ ] **Step 1: Add iOS platform**

```bash
npx cap add ios
```

Note: This requires Xcode on macOS. If not available, skip this task and document it for future.

- [ ] **Step 2: Sync assets**

```bash
npx cap sync ios
```

- [ ] **Step 3: Commit**

```bash
git add ios/
git commit -m "chore: add iOS Capacitor platform (scaffolding only)"
```

---

## Task 16: Version Bump & Documentation

**Files:**
- Modify: `package.json` — version bump to 2.14.0
- Modify: `CHANGELOG.md` — v2.14.0 section
- Modify: `src/locales/en/common.json` — release notes
- Modify: `src/locales/he/common.json` — release notes
- Modify: `docs/wiki/Chapter-4-—-Client-Architecture.md` — update sections 4.10, 4.11

- [ ] **Step 1: Bump version**

`package.json`: `"version": "2.14.0"`

- [ ] **Step 2: Update CHANGELOG.md**

Add v2.14.0 section with all Added/Changed items.

- [ ] **Step 3: Update release notes in both locales**

- [ ] **Step 4: Push and create PR**

```bash
git push -u origin feat/native-app-adaptations
gh pr create --title "feat: v2.14.0 — Native app adaptations (Android + iOS scaffolding)"
```
