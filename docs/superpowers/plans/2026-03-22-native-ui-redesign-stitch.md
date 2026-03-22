# Native UI Redesign (Stitch Design System) — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete native Android UI rewrite using Stitch-generated design tokens. Fresh component architecture — delete Phase 1, rebuild from scratch. Every screen purpose-built for mobile.

**Architecture:** Same React app, branched at layout/route level. Native gets its own component tree in `presentation/native/` directories. Shared stores/hooks/API untouched. MUI 7 components styled with Stitch design tokens. `isNative` checks only in MainLayout and AppRoutes — never in leaf components.

**Tech Stack:** React 19, MUI 7, Capacitor 8, Zustand 5, Vite (rolldown-vite), react-router-dom (HashRouter), View Transitions API, react-window

**Spec:** `docs/superpowers/specs/2026-03-22-native-ui-redesign-stitch-design.md`
**Design references:** `docs/stitch-designs/*.html` + `docs/stitch-designs/*.png`
**Branch:** `feat/native-ui-redesign-stitch`

**Dev environment:** Android emulator `Medium_Phone_API_35`, Vite dev server on `0.0.0.0:3000`, live reload via Capacitor.

---

## File Map

### New Directories
```
src/shared/presentation/native/          — shared native components (22 files)
src/shared/presentation/themes/          — native theme + tokens (2 files)
src/features/auth/presentation/native/   — NativeLoginPage
src/features/dashboard/presentation/native/ — NativeDashboardPage + NativeSwipeCarousel
src/features/people/presentation/native/ — list + form pages
src/features/space/presentation/native/  — list + form pages
src/features/conference/presentation/native/ — list + form pages
src/features/labels/presentation/native/ — list + link + images pages
src/features/import-export/presentation/native/ — CSV upload page
src/features/sync/presentation/native/   — AIMS page
src/features/settings/presentation/native/ — settings hub + all sub-pages (15 files)
```

### Files to Delete (Phase 1 cleanup)
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

### Files to Modify
```
vite.config.ts                              — add host: '0.0.0.0'
capacitor.config.ts                         — fix dev server URL
index.html                                  — add Manrope + Inter fonts
src/AppRoutes.tsx                           — add native route tree
src/shared/presentation/layouts/MainLayout.tsx — swap native branch to NativeShell
src/features/people/presentation/PeopleManagerView.tsx — update native imports
```

---

## Chunk 0: Capacitor Fix + Phase 1 Cleanup

### Task 0.1: Fix Vite dev server for Android emulator

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add host binding**

In `vite.config.ts`, the `server` block needs `host: '0.0.0.0'` so the Android emulator (which accesses the host via `10.0.2.2`) can reach the dev server.

```typescript
// vite.config.ts — inside server: { ... }
// Add host: '0.0.0.0' alongside the existing port: 3000
server: {
    host: '0.0.0.0',
    port: 3000,
    // ... rest of proxy config unchanged
}
```

- [ ] **Step 2: Verify Capacitor config**

Check `capacitor.config.ts`. The dev config should NOT set `server.url` — Capacitor should load from the built `dist/` folder. For live dev, we use `npx cap run` which auto-injects the dev server URL. Verify `isDev` gating is correct:

```typescript
// capacitor.config.ts — verify these settings exist:
server: {
    androidScheme: 'https',
    allowNavigation: isDev ? ['10.0.2.2:*'] : undefined,
    ...(isDev ? { cleartext: true } : {}),
},
```

If `server.url` is hardcoded, remove it — `npx cap run` handles this automatically.

- [ ] **Step 3: Add Manrope + Inter fonts to index.html**

```html
<!-- Add after existing Google Fonts link -->
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts capacitor.config.ts index.html
git commit -m "fix: Capacitor dev environment — bind Vite to 0.0.0.0, add Stitch fonts"
```

### Task 0.2: Delete Phase 1 native components

**Files:**
- Delete: all 10 files listed in "Files to Delete" above

- [ ] **Step 1: Delete all Phase 1 native files**

```bash
git rm src/shared/presentation/layouts/NativePage.tsx \
       src/shared/presentation/layouts/NativeAppHeader.tsx \
       src/shared/presentation/layouts/NativeBottomNav.tsx \
       src/shared/presentation/components/NativeGroupedList.tsx \
       src/shared/presentation/components/NativeFormSection.tsx \
       src/shared/presentation/components/NativeRoutes.tsx \
       src/shared/presentation/components/PageTransition.tsx \
       src/features/people/presentation/PersonForm.tsx \
       src/features/people/presentation/NativePeopleList.tsx \
       src/features/people/presentation/NativePersonPage.tsx
```

- [ ] **Step 2: Fix broken imports**

After deletion, imports in these files will break:
- `src/shared/presentation/layouts/MainLayout.tsx` — remove imports of `NativeAppHeader`, `NativeBottomNav`, `NATIVE_BOTTOM_NAV_HEIGHT`
- `src/AppRoutes.tsx` — remove import of `getNativeRoutes` and the `{isNative && getNativeRoutes()}` line
- `src/features/people/presentation/PeopleManagerView.tsx` — remove `NativePeopleList` import and its `<Suspense>` block
- `src/features/people/presentation/PersonDialog.tsx` — remove `PersonForm` import if present, restore inline form

For now, stub the native branch in MainLayout to render nothing:

```typescript
// MainLayout.tsx — replace native branch with placeholder
if (isNative) {
    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography>Native shell loading...</Typography>
        </Box>
    );
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no import errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete Phase 1 native components — clean slate for Stitch redesign"
```

### Task 0.3: Verify Android emulator

- [ ] **Step 1: Start dev server and emulator**

```bash
npm run dev &
CAPACITOR_ENV=dev npx cap sync android
CAPACITOR_ENV=dev npx cap run android --target=Medium_Phone_API_35
```

- [ ] **Step 2: Verify login page loads**

The emulator should show the login page (not "Cannot GET /"). If it still fails, check:
1. Vite is listening on `0.0.0.0:3000` (check terminal output)
2. The emulator WebView can reach `10.0.2.2:3000`
3. No middleware blocks `/` before Vite's SPA fallback

- [ ] **Step 3: Take screenshot for reference**

---

## Chunk 1: Stitch Theme Extraction

### Task 1.1: Create native design tokens

**Files:**
- Create: `src/shared/presentation/themes/nativeTokens.ts`

- [ ] **Step 1: Create nativeTokens.ts**

```typescript
// src/shared/presentation/themes/nativeTokens.ts

/**
 * Design tokens extracted from Stitch-generated designs.
 * Used by nativeTheme.ts and directly in native components.
 */

// --- Colors ---
export const nativeColors = {
    primary: {
        main: '#005dac',
        dark: '#004080',
        light: '#1976d2',
        contrastText: '#ffffff',
    },
    surface: {
        base: '#f9f9fe',
        low: '#f2f3fa',
        high: '#dfe2ec',
        lowest: '#ffffff',
    },
    status: {
        success: '#4caf50',
        warning: '#ff9800',
        error: '#d32f2f',
        info: '#2196f3',
    },
} as const;

// --- Typography ---
export const nativeFonts = {
    heading: '"Manrope", sans-serif',
    body: '"Inter", sans-serif',
} as const;

// --- Spacing & Sizing ---
export const nativeSpacing = {
    pagePadding: 16,
    sectionGap: 16,
    cardPadding: 16,
} as const;

// --- Radii ---
export const nativeRadii = {
    card: 16,
    button: 12,
    chip: 8,
    input: 12,
} as const;

// --- Sizing ---
export const nativeSizing = {
    touchMinHeight: 48,
    bottomNavHeight: 64,
    appBarHeight: 56,
} as const;

// --- Shadows ---
export const nativeShadows = {
    card: '0 2px 8px rgba(0, 0, 0, 0.06)',
    elevated: '0 4px 16px rgba(0, 0, 0, 0.1)',
} as const;

// --- Glass Effect ---
export const glass = {
    background: 'rgba(249, 249, 254, 0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
} as const;

// --- Gradients ---
export const nativeGradients = {
    appBar: 'linear-gradient(135deg, #005dac, #004080)',
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/themes/nativeTokens.ts
git commit -m "feat: add Stitch design tokens — colors, typography, spacing, glass"
```

### Task 1.2: Create native MUI theme

**Files:**
- Create: `src/shared/presentation/themes/nativeTheme.ts`

- [ ] **Step 1: Create nativeTheme.ts**

```typescript
// src/shared/presentation/themes/nativeTheme.ts

import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { nativeColors, nativeFonts, nativeRadii, nativeShadows, nativeSpacing } from './nativeTokens';

export function createNativeTheme(direction: 'ltr' | 'rtl') {
    const themeOptions: ThemeOptions = {
        direction,
        palette: {
            mode: 'light',
            primary: nativeColors.primary,
            success: { main: nativeColors.status.success },
            warning: { main: nativeColors.status.warning },
            error: { main: nativeColors.status.error },
            info: { main: nativeColors.status.info },
            background: {
                default: nativeColors.surface.base,
                paper: nativeColors.surface.lowest,
            },
        },
        typography: {
            fontFamily: nativeFonts.body,
            h1: { fontFamily: nativeFonts.heading, fontWeight: 800 },
            h2: { fontFamily: nativeFonts.heading, fontWeight: 700 },
            h3: { fontFamily: nativeFonts.heading, fontWeight: 700 },
            h4: { fontFamily: nativeFonts.heading, fontWeight: 600 },
            h5: { fontFamily: nativeFonts.heading, fontWeight: 600 },
            h6: { fontFamily: nativeFonts.heading, fontWeight: 600 },
            subtitle1: { fontFamily: nativeFonts.heading, fontWeight: 600 },
            subtitle2: { fontFamily: nativeFonts.heading, fontWeight: 500 },
            body1: { fontFamily: nativeFonts.body },
            body2: { fontFamily: nativeFonts.body },
            button: { fontFamily: nativeFonts.body, fontWeight: 600 },
            caption: { fontFamily: nativeFonts.body },
            overline: {
                fontFamily: nativeFonts.body,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                fontSize: '0.6875rem', // 11px
            },
        },
        shape: {
            borderRadius: nativeRadii.card,
        },
        components: {
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: nativeRadii.card,
                        boxShadow: nativeShadows.card,
                        border: 'none',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: nativeRadii.button,
                        minHeight: 48,
                        textTransform: 'none' as const,
                        fontWeight: 600,
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: nativeRadii.chip,
                    },
                },
            },
            MuiTextField: {
                defaultProps: {
                    variant: 'filled' as const,
                },
                styleOverrides: {
                    root: {
                        '& .MuiFilledInput-root': {
                            borderRadius: nativeRadii.input,
                            '&::before, &::after': { display: 'none' },
                        },
                    },
                },
            },
            MuiFab: {
                styleOverrides: {
                    root: {
                        borderRadius: nativeRadii.button,
                    },
                },
            },
            MuiBottomNavigation: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'transparent',
                    },
                },
            },
        },
    };

    return createTheme(themeOptions);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/themes/nativeTheme.ts
git commit -m "feat: add native MUI theme with Stitch design tokens"
```

---

## Chunk 2: NativeShell + NativeAppBar + NativeBottomNav + NativePage

### Task 2.1: Create NativePageTitleContext

**Files:**
- Create: `src/shared/presentation/native/NativePageTitleContext.tsx`

- [ ] **Step 1: Create context**

```typescript
// src/shared/presentation/native/NativePageTitleContext.tsx

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface NativePageTitle {
    title: string;
    showBackArrow: boolean;
    actions?: ReactNode;
}

interface NativePageTitleContextType {
    pageTitle: NativePageTitle;
    setPageTitle: (title: string, showBackArrow?: boolean, actions?: ReactNode) => void;
}

const NativePageTitleContext = createContext<NativePageTitleContextType | null>(null);

export function NativePageTitleProvider({ children }: { children: ReactNode }) {
    const [pageTitle, setPageTitleState] = useState<NativePageTitle>({
        title: '',
        showBackArrow: false,
    });

    const setPageTitle = useCallback((title: string, showBackArrow = false, actions?: ReactNode) => {
        setPageTitleState({ title, showBackArrow, actions });
    }, []);

    return (
        <NativePageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
            {children}
        </NativePageTitleContext.Provider>
    );
}

export function useNativePageTitle() {
    const ctx = useContext(NativePageTitleContext);
    if (!ctx) throw new Error('useNativePageTitle must be used within NativePageTitleProvider');
    return ctx;
}

/**
 * Hook for native pages to set their title on mount.
 * Usage: useSetNativeTitle('Dashboard');
 * Usage: useSetNativeTitle('Edit Person', true, <SaveButton />);
 */
export function useSetNativeTitle(title: string, showBackArrow = false, actions?: ReactNode) {
    const { setPageTitle } = useNativePageTitle();
    // Set on every render so title updates when props change
    setPageTitle(title, showBackArrow, actions);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/NativePageTitleContext.tsx
git commit -m "feat: add NativePageTitleContext for native page title management"
```

### Task 2.2: Create NativeAppBar

**Files:**
- Create: `src/shared/presentation/native/NativeAppBar.tsx`

- [ ] **Step 1: Create NativeAppBar**

```typescript
// src/shared/presentation/native/NativeAppBar.tsx

import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import { useNativePageTitle } from './NativePageTitleContext';
import { nativeGradients, nativeSizing } from '../themes/nativeTokens';
import { CompanyStoreSelector } from '@features/settings/presentation/CompanyStoreSelector';

export function NativeAppBar() {
    const navigate = useNavigate();
    const { pageTitle } = useNativePageTitle();

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                background: nativeGradients.appBar,
                paddingTop: 'max(env(safe-area-inset-top, 0px), 28px)',
            }}
        >
            <Toolbar
                sx={{
                    minHeight: `${nativeSizing.appBarHeight}px !important`,
                    height: nativeSizing.appBarHeight,
                    px: 1,
                    gap: 0.5,
                }}
            >
                {pageTitle.showBackArrow && (
                    <IconButton
                        onClick={() => navigate(-1)}
                        sx={{ color: 'primary.contrastText' }}
                        size="small"
                    >
                        <ArrowBackIcon />
                    </IconButton>
                )}

                <Typography
                    variant="h6"
                    fontWeight={700}
                    color="primary.contrastText"
                    noWrap
                    sx={{ flex: 1, ml: pageTitle.showBackArrow ? 0 : 1 }}
                >
                    {pageTitle.title}
                </Typography>

                {/* Per-page actions (Save button, search icon, etc.) */}
                {pageTitle.actions}

                {/* Only show company selector on main pages (no back arrow) */}
                {!pageTitle.showBackArrow && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CompanyStoreSelector compact />
                        <IconButton
                            onClick={() => navigate('/settings')}
                            sx={{ color: 'primary.contrastText' }}
                            size="small"
                        >
                            <SettingsIcon />
                        </IconButton>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/NativeAppBar.tsx
git commit -m "feat: add NativeAppBar with gradient, title context, and safe area"
```

### Task 2.3: Create NativeBottomNav

**Files:**
- Create: `src/shared/presentation/native/NativeBottomNav.tsx`

- [ ] **Step 1: Create NativeBottomNav**

```typescript
// src/shared/presentation/native/NativeBottomNav.tsx

import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNavTabs } from '../hooks/useNavTabs';
import { glass, nativeSizing } from '../themes/nativeTokens';

export { nativeSizing as NATIVE_SIZING };

export function NativeBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const navTabs = useNavTabs();

    const activeValue = navTabs.find(tab => tab.value === location.pathname)?.value ?? false;

    const handleChange = async (_event: React.SyntheticEvent, newValue: string) => {
        if (newValue === activeValue) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch {
            // Haptics not available — silently ignore
        }
        navigate(newValue);
    };

    return (
        <Paper
            elevation={0}
            sx={{
                position: 'fixed',
                bottom: 0,
                insetInlineStart: 0,
                insetInlineEnd: 0,
                zIndex: theme.zIndex.appBar,
                ...glass,
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            <BottomNavigation
                showLabels
                value={activeValue}
                onChange={handleChange}
                sx={{
                    height: nativeSizing.bottomNavHeight,
                    bgcolor: 'transparent',
                }}
            >
                {navTabs.map(tab => (
                    <BottomNavigationAction
                        key={tab.value}
                        label={tab.label}
                        value={tab.value}
                        icon={tab.icon}
                    />
                ))}
            </BottomNavigation>
        </Paper>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/NativeBottomNav.tsx
git commit -m "feat: add NativeBottomNav with glass effect, haptics, permission-aware tabs"
```

### Task 2.4: Create NativePage (scroll container)

**Files:**
- Create: `src/shared/presentation/native/NativePage.tsx`

- [ ] **Step 1: Create NativePage**

```typescript
// src/shared/presentation/native/NativePage.tsx

import { Box } from '@mui/material';
import { nativeSizing, nativeSpacing, nativeColors } from '../themes/nativeTokens';
import { PullToRefresh } from '../components/PullToRefresh';
import type { ReactNode } from 'react';

interface NativePageProps {
    children: ReactNode;
    noPadding?: boolean;
    onRefresh?: () => Promise<void>;
}

export function NativePage({ children, noPadding = false, onRefresh }: NativePageProps) {
    const content = (
        <Box
            sx={{
                flex: 1,
                overflow: 'auto',
                bgcolor: nativeColors.surface.base,
                px: noPadding ? 0 : `${nativeSpacing.pagePadding}px`,
                pt: noPadding ? 0 : 1,
                pb: `calc(${nativeSizing.bottomNavHeight + 32}px + env(safe-area-inset-bottom))`,
            }}
        >
            {children}
        </Box>
    );

    if (onRefresh) {
        return <PullToRefresh onRefresh={onRefresh}>{content}</PullToRefresh>;
    }

    return content;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/NativePage.tsx
git commit -m "feat: add NativePage scroll container with safe area and pull-to-refresh"
```

### Task 2.5: Create NativeShell

**Files:**
- Create: `src/shared/presentation/native/NativeShell.tsx`

- [ ] **Step 1: Create NativeShell**

```typescript
// src/shared/presentation/native/NativeShell.tsx

import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useBackendSyncController } from '@features/sync/application/useBackendSyncController';
import { SyncProvider } from '@features/sync/application/SyncContext';
import { StoreRequiredGuard } from '@features/auth/presentation/StoreRequiredGuard';
import { SyncStatusIndicator } from '@features/sync/presentation/SyncStatusIndicator';
import { useNativeInit } from '../hooks/useNativeInit';
import { useAndroidBackButton } from '../hooks/useAndroidBackButton';
import { NativeAppBar } from './NativeAppBar';
import { NativeBottomNav } from './NativeBottomNav';
import { NativePageTitleProvider } from './NativePageTitleContext';
import { SphereLoader } from '../components/SphereLoader';
import { nativeSizing } from '../themes/nativeTokens';

export function NativeShell() {
    useNativeInit();
    const syncController = useBackendSyncController();
    const isSwitchingStore = useAuthStore(state => state.isSwitchingStore);

    useAndroidBackButton();

    return (
        <SyncProvider value={syncController}>
            <NativePageTitleProvider>
                <Box
                    sx={{
                        minHeight: '100vh',
                        bgcolor: 'background.default',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Store switching overlay */}
                    {isSwitchingStore && (
                        <Box
                            sx={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: (theme) => theme.zIndex.modal + 1,
                                bgcolor: 'background.default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <SphereLoader />
                        </Box>
                    )}

                    <NativeAppBar />

                    <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <StoreRequiredGuard>
                            <Outlet />
                        </StoreRequiredGuard>
                    </Box>

                    <SyncStatusIndicator
                        sx={{
                            position: 'fixed',
                            bottom: `calc(${nativeSizing.bottomNavHeight + 8}px + env(safe-area-inset-bottom))`,
                            insetInlineEnd: 16,
                            zIndex: (theme) => theme.zIndex.appBar - 1,
                        }}
                    />

                    <NativeBottomNav />
                </Box>
            </NativePageTitleProvider>
        </SyncProvider>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/NativeShell.tsx
git commit -m "feat: add NativeShell with SyncProvider, store guard, and title context"
```

---

## Chunk 3: PageTransition + Route Plumbing

### Task 3.1: Create PageTransition

**Files:**
- Create: `src/shared/presentation/native/PageTransition.tsx`

- [ ] **Step 1: Create PageTransition**

```typescript
// src/shared/presentation/native/PageTransition.tsx

import { useLocation } from 'react-router-dom';
import { useRef, useEffect, type ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
}

/**
 * Wraps route content with View Transitions API on navigation.
 * Falls back to CSS slide if API unavailable (Android < 13).
 * CSS animations defined in index.html.
 */
export function PageTransition({ children }: PageTransitionProps) {
    const location = useLocation();
    const prevPathRef = useRef(location.pathname);

    useEffect(() => {
        if (prevPathRef.current === location.pathname) return;
        prevPathRef.current = location.pathname;

        // View Transitions API: available in Android WebView 111+ (Android 13+)
        if ('startViewTransition' in document) {
            (document as any).startViewTransition(() => {
                // The transition animates between old and new DOM snapshots.
                // React has already rendered the new route by this point.
            });
        }
        // Fallback: CSS animations in index.html handle the transition
    }, [location.pathname]);

    return <>{children}</>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/PageTransition.tsx
git commit -m "feat: add PageTransition with View Transitions API + CSS fallback"
```

### Task 3.2: Create NativeRoutes and wire into AppRoutes

**Files:**
- Create: `src/shared/presentation/native/NativeRoutes.tsx`
- Modify: `src/AppRoutes.tsx`
- Modify: `src/shared/presentation/layouts/MainLayout.tsx`

- [ ] **Step 1: Create NativeRoutes with initial stub routes**

```typescript
// src/shared/presentation/native/NativeRoutes.tsx

import { Route } from 'react-router-dom';
import { NativeShell } from './NativeShell';
import { Box, Typography } from '@mui/material';

// Placeholder component for routes not yet implemented
function NativePlaceholder({ name }: { name: string }) {
    return (
        <Box sx={{ p: 2, textAlign: 'center', mt: 4 }}>
            <Typography variant="h6" color="text.secondary">{name}</Typography>
            <Typography variant="body2" color="text.secondary">Coming soon</Typography>
        </Box>
    );
}

/**
 * Returns native-only Route elements wrapped in NativeShell.
 * Called from AppRoutes when isNative is true.
 */
export function getNativeRoutes() {
    return (
        <Route element={<NativeShell />}>
            <Route index element={<NativePlaceholder name="Dashboard" />} />
            <Route path="people" element={<NativePlaceholder name="People" />} />
            <Route path="people/new" element={<NativePlaceholder name="Add Person" />} />
            <Route path="people/:id/edit" element={<NativePlaceholder name="Edit Person" />} />
            <Route path="spaces" element={<NativePlaceholder name="Spaces" />} />
            <Route path="spaces/new" element={<NativePlaceholder name="Add Space" />} />
            <Route path="spaces/:id/edit" element={<NativePlaceholder name="Edit Space" />} />
            <Route path="conference" element={<NativePlaceholder name="Conference" />} />
            <Route path="conference/new" element={<NativePlaceholder name="Add Room" />} />
            <Route path="conference/:id/edit" element={<NativePlaceholder name="Edit Room" />} />
            <Route path="labels" element={<NativePlaceholder name="Labels" />} />
            <Route path="labels/link" element={<NativePlaceholder name="Link Label" />} />
            <Route path="aims-management" element={<NativePlaceholder name="AIMS" />} />
            <Route path="settings" element={<NativePlaceholder name="Settings" />} />
            <Route path="settings/profile" element={<NativePlaceholder name="Profile" />} />
            <Route path="settings/users" element={<NativePlaceholder name="Users" />} />
            <Route path="settings/users/new" element={<NativePlaceholder name="Add User" />} />
            <Route path="settings/users/:id" element={<NativePlaceholder name="Edit User" />} />
            <Route path="settings/companies" element={<NativePlaceholder name="Companies" />} />
            <Route path="settings/companies/new" element={<NativePlaceholder name="Add Company" />} />
            <Route path="settings/companies/:id" element={<NativePlaceholder name="Edit Company" />} />
            <Route path="settings/roles" element={<NativePlaceholder name="Roles" />} />
            <Route path="settings/roles/new" element={<NativePlaceholder name="Add Role" />} />
            <Route path="settings/roles/:id" element={<NativePlaceholder name="Edit Role" />} />
            <Route path="settings/about" element={<NativePlaceholder name="About" />} />
        </Route>
    );
}
```

- [ ] **Step 2: Wire NativeRoutes into AppRoutes**

In `src/AppRoutes.tsx`:
- Import `getNativeRoutes` from `@shared/presentation/native/NativeRoutes`
- Import `useNativePlatform` from `@shared/presentation/hooks/useNativePlatform`
- Import `PageTransition` from `@shared/presentation/native/PageTransition`
- Inside `<Routes>`, add `{isNative && getNativeRoutes()}`
- Wrap the return in `PageTransition` when native

- [ ] **Step 3: Update MainLayout native branch to render NativeShell**

Replace the placeholder in `MainLayout.tsx` native branch. Since NativeShell is now a route-level wrapper (via `<Route element={<NativeShell />}>`), MainLayout's native branch should simply render `{children}` without its own shell:

```typescript
// MainLayout.tsx — native branch becomes a pass-through
if (isNative) {
    return <>{children}</>;
}
```

The shell chrome (app bar, bottom nav, sync provider) is handled by NativeShell at the route level.

- [ ] **Step 4: Verify build and test**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/presentation/native/NativeRoutes.tsx src/AppRoutes.tsx src/shared/presentation/layouts/MainLayout.tsx
git commit -m "feat: add native route tree with NativeShell and PageTransition"
```

---

## Chunk 4: NativeLoginPage

### Task 4.1: Create NativeLoginPage

**Files:**
- Create: `src/features/auth/presentation/native/NativeLoginPage.tsx`

- [ ] **Step 1: Create NativeLoginPage**

Build a standalone login page (no NativeShell) matching `docs/stitch-designs/login.png`:
- Gradient background, no card
- Logo centered, EN/HE toggle top-right
- Email + password fields (filled style)
- Trust device checkbox
- Sign In button
- Biometric section
- OTP flow

Reference the existing `LoginPage.tsx` for auth logic patterns (biometric, OTP auto-submit, language toggle). The native version reuses the same `useAuthStore` actions but has completely independent JSX using Stitch design tokens.

Key auth hooks/functions to reuse from existing LoginPage:
- `useAuthStore` — `login`, `verify2FA`, `clearError`, `isLoading`, `error`
- `biometricService.authenticate()` — for fingerprint auth
- `deviceTokenStorage.getDeviceToken()` / `getDeviceId()` — for trusted device
- `i18n.changeLanguage()` — for language toggle

Style with `nativeColors`, `nativeRadii`, `nativeFonts` from nativeTokens.

- [ ] **Step 2: Add NativeLoginPage route**

In `AppRoutes.tsx`, add a separate route for native login (outside NativeShell since login has no bottom nav):

```typescript
// Before the NativeShell routes
{isNative && <Route path="/login" element={<NativeLoginPage />} />}
```

- [ ] **Step 3: Verify on emulator — EMULATOR CHECKPOINT 1**

```bash
CAPACITOR_ENV=dev npx cap run android --target=Medium_Phone_API_35
```

Verify: Login page renders with Stitch styling. Compare against `docs/stitch-designs/login.png`.

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/presentation/native/NativeLoginPage.tsx src/AppRoutes.tsx
git commit -m "feat: add NativeLoginPage with Stitch design — biometric, OTP, language toggle"
```

---

## Chunk 5: Shared List Components

### Task 5.1: NativeCard

**Files:**
- Create: `src/shared/presentation/native/NativeCard.tsx`

- [ ] **Step 1: Create NativeCard**

```typescript
// src/shared/presentation/native/NativeCard.tsx

import { Paper, type PaperProps } from '@mui/material';
import { nativeRadii, nativeShadows, nativeColors } from '../themes/nativeTokens';

interface NativeCardProps extends Omit<PaperProps, 'elevation'> {
    accentColor?: string;
}

export function NativeCard({ accentColor, sx, children, ...props }: NativeCardProps) {
    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: `${nativeRadii.card}px`,
                boxShadow: nativeShadows.card,
                bgcolor: nativeColors.surface.lowest,
                border: 'none',
                overflow: 'hidden',
                ...(accentColor && {
                    borderInlineStart: `3px solid ${accentColor}`,
                }),
                ...sx,
            }}
            {...props}
        >
            {children}
        </Paper>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/NativeCard.tsx
git commit -m "feat: add NativeCard with tonal styling and accent border"
```

### Task 5.2: NativeGroupedList + NativeVirtualizedList

**Files:**
- Create: `src/shared/presentation/native/NativeGroupedList.tsx`
- Create: `src/shared/presentation/native/NativeVirtualizedList.tsx`

- [ ] **Step 1: Create NativeGroupedList**

Generic sectioned list with colored section headers, rounded card containers, chevron navigation, FAB slot, and empty state. Reference `docs/stitch-designs/people-list.png` for the visual target.

Key props:
```typescript
interface Section<T> {
    title: string;
    count: number;
    color: 'success' | 'warning' | 'error' | 'info' | 'primary';
    icon?: ReactNode;
    items: T[];
}

interface NativeGroupedListProps<T> {
    sections: Section<T>[];
    renderItem: (item: T) => ReactNode;
    onItemTap: (item: T) => void;
    keyExtractor: (item: T) => string;
    emptyState?: ReactNode;
    fab?: { icon: ReactNode; onClick: () => void };
}
```

Each section renders: overline header (uppercase, colored) → NativeCard containing items with dividers (tonal shift, no borders) and chevron icons.

- [ ] **Step 2: Create NativeVirtualizedList**

Flat list using `react-window` `FixedSizeList` for 500+ item pages. No section grouping.

```typescript
interface NativeVirtualizedListProps<T> {
    items: T[];
    renderItem: (item: T) => ReactNode;
    onItemTap: (item: T) => void;
    keyExtractor: (item: T) => string;
    itemHeight: number;
    emptyState?: ReactNode;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/native/NativeGroupedList.tsx src/shared/presentation/native/NativeVirtualizedList.tsx
git commit -m "feat: add NativeGroupedList and NativeVirtualizedList"
```

### Task 5.3: NativeChipBar + NativeStatBar + NativeSearchBar

**Files:**
- Create: `src/shared/presentation/native/NativeChipBar.tsx`
- Create: `src/shared/presentation/native/NativeStatBar.tsx`
- Create: `src/shared/presentation/native/NativeSearchBar.tsx`

- [ ] **Step 1: Create all three components**

**NativeChipBar:** Horizontal scrollable chip row. Active chip = primary filled, inactive = outlined.

**NativeStatBar:** Single row: "112 Total • 85 Assigned • 27 Unassigned" with colored dots.

**NativeSearchBar:** Expandable search field. Starts as search icon, expands to full-width TextField with clear button. 300ms debounce.

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/NativeChipBar.tsx src/shared/presentation/native/NativeStatBar.tsx src/shared/presentation/native/NativeSearchBar.tsx
git commit -m "feat: add NativeChipBar, NativeStatBar, NativeSearchBar"
```

### Task 5.4: NativeStatusBadge + NativeFAB + NativeEmptyState

**Files:**
- Create: `src/shared/presentation/native/NativeStatusBadge.tsx`
- Create: `src/shared/presentation/native/NativeFAB.tsx`
- Create: `src/shared/presentation/native/NativeEmptyState.tsx`

- [ ] **Step 1: Create all three**

**NativeStatusBadge:** Small colored pill. Props: `label: string`, `color: 'success' | 'warning' | 'error' | 'info'`.

**NativeFAB:** Floating action button above bottom nav. Single action (round icon button) or expandable (stacked actions on tap with ClickAwayListener). Haptic on tap.

**NativeEmptyState:** Centered icon + title + subtitle + optional action button.

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/NativeStatusBadge.tsx src/shared/presentation/native/NativeFAB.tsx src/shared/presentation/native/NativeEmptyState.tsx
git commit -m "feat: add NativeStatusBadge, NativeFAB, NativeEmptyState"
```

### Task 5.5: Feature-specific item components

**Files:**
- Create: `src/shared/presentation/native/NativePersonItem.tsx`
- Create: `src/shared/presentation/native/NativeSpaceItem.tsx`
- Create: `src/shared/presentation/native/NativeRoomCard.tsx`
- Create: `src/shared/presentation/native/NativeLabelCard.tsx`

- [ ] **Step 1: Create all four item components**

Each follows the Stitch design for its respective list:
- **NativePersonItem:** Avatar, name, department subtitle, space badge (blue assigned / orange unassigned), chevron
- **NativeSpaceItem:** Type icon, space ID, assigned person or "Unassigned" muted, label status icon
- **NativeRoomCard:** Room name, NativeStatusBadge, meeting info, participant avatar stack, left accent border
- **NativeLabelCard:** Label code (monospace), article name, thumbnail, linked/unlinked status, quick action buttons

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/NativePersonItem.tsx src/shared/presentation/native/NativeSpaceItem.tsx src/shared/presentation/native/NativeRoomCard.tsx src/shared/presentation/native/NativeLabelCard.tsx
git commit -m "feat: add native list item components — person, space, room, label"
```

---

## Chunk 6: Shared Form Components

### Task 6.1: NativeFormPage + NativeFormSection + NativeTextField

**Files:**
- Create: `src/shared/presentation/native/NativeFormPage.tsx`
- Create: `src/shared/presentation/native/NativeFormSection.tsx`
- Create: `src/shared/presentation/native/NativeTextField.tsx`

- [ ] **Step 1: Create form components**

**NativeFormPage:** Wrapper for create/edit pages. Sets title + back arrow + Save action via `useSetNativeTitle`. Scroll container with keyboard-aware offset. Loading overlay on save.

**NativeFormSection:** Titled card section. Overline label (primary color, uppercase, 11px) + NativeCard container.

**NativeTextField:** Styled MUI TextField. variant="filled", 12px radius, 48px min-height, no underline.

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/NativeFormPage.tsx src/shared/presentation/native/NativeFormSection.tsx src/shared/presentation/native/NativeTextField.tsx
git commit -m "feat: add NativeFormPage, NativeFormSection, NativeTextField"
```

### Task 6.2: NativeBottomSheet + NativeDeleteButton

**Files:**
- Create: `src/shared/presentation/native/NativeBottomSheet.tsx`
- Create: `src/shared/presentation/native/NativeDeleteButton.tsx`

- [ ] **Step 1: Create both**

**NativeBottomSheet:** MUI SwipeableDrawer anchor="bottom". Rounded top corners (16px), drag handle, search field for long lists, item list with selection indicator.

**NativeDeleteButton:** Full-width red outlined button. Shows confirmation dialog on tap. Haptic feedback (ImpactStyle.Heavy).

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/native/NativeBottomSheet.tsx src/shared/presentation/native/NativeDeleteButton.tsx
git commit -m "feat: add NativeBottomSheet picker and NativeDeleteButton"
```

---

## Chunk 7: NativeDashboardPage

### Task 7.1: NativeSwipeCarousel + NativeDashboardPage

**Files:**
- Create: `src/features/dashboard/presentation/native/NativeSwipeCarousel.tsx`
- Create: `src/features/dashboard/presentation/native/NativeDashboardPage.tsx`

- [ ] **Step 1: Create NativeSwipeCarousel**

Reference the existing `DashboardMobileCarousel` pattern in `DashboardPage.tsx` (touch events, RTL-aware swipe, dot indicators with counter). Rebuild with Stitch design tokens.

- [ ] **Step 2: Create NativeDashboardPage**

Uses `useSetNativeTitle('Dashboard')`. Pull-to-refresh via `NativePage.onRefresh`. Contains:
- NativeSwipeCarousel with 4 stat cards (spaces, conference, people, AIMS)
- Quick actions row
- Recent notifications list
- NativeFAB (expandable: Add Person, Add Room, Sync)

Stores: `useSpacesStore`, `useConferenceStore`, `usePeopleStore`, `useSyncStore`.

- [ ] **Step 3: Wire into NativeRoutes**

Replace `<NativePlaceholder name="Dashboard" />` with `<NativeDashboardPage />` in NativeRoutes.

- [ ] **Step 4: Verify on emulator — EMULATOR CHECKPOINT 2**

Compare against `docs/stitch-designs/dashboard.png`.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/presentation/native/ src/shared/presentation/native/NativeRoutes.tsx
git commit -m "feat: add NativeDashboardPage with swipe carousel and Stitch design"
```

---

## Chunk 8–9: People

### Task 8.1: NativePeopleListPage

**Files:**
- Create: `src/features/people/presentation/native/NativePeopleListPage.tsx`

- [ ] **Step 1: Build people list page**

Uses `useSetNativeTitle(t('navigation.people'))`. Contains:
- NativeStatBar with total/assigned/unassigned counts
- NativeSearchBar + NativeChipBar (Department, Status, Space Type)
- NativeGroupedList with assigned/unassigned sections
- NativePersonItem rows
- NativeFAB → navigate to `/people/new`

Store: `usePeopleStore`. Filter/search in component state with debounce.

- [ ] **Step 2: Wire into NativeRoutes and update PeopleManagerView**

- [ ] **Step 3: Commit**

### Task 9.1: NativePersonFormPage

**Files:**
- Create: `src/features/people/presentation/native/NativePersonFormPage.tsx`

- [ ] **Step 1: Build person form page**

NativeFormPage with Save action. Reads `id` from route params (undefined = create mode).

Sections:
- "Personal Information" — name, employee ID, department dropdown, email, phone
- "Space Assignment" — current space, Change button (NativeBottomSheet), Unassign
- "Linked Device" — read-only label code + thumbnail

NativeDeleteButton at bottom (edit mode only).

Store: `usePeopleStore` for save/delete.

- [ ] **Step 2: Wire into NativeRoutes**

- [ ] **Step 3: Verify on emulator — EMULATOR CHECKPOINT 3**

Compare against `docs/stitch-designs/people-list.png` and `docs/stitch-designs/person-edit.png`.

- [ ] **Step 4: Commit**

```bash
git add src/features/people/presentation/native/
git commit -m "feat: add NativePeopleListPage and NativePersonFormPage"
```

---

## Chunks 10–15: Spaces, Conference, Labels

### Task 10.1: NativeSpacesListPage + Task 11.1: NativeSpaceFormPage

Same pattern as People. Reference `docs/stitch-designs/spaces-management.png` and `docs/stitch-designs/space-edit.png`.

**Files:**
- Create: `src/features/space/presentation/native/NativeSpacesListPage.tsx`
- Create: `src/features/space/presentation/native/NativeSpaceFormPage.tsx`

Key difference: dynamic fields from `useSettingsStore(state => state.settings.peopleManagerConfig)`.

### Task 12.1: NativeConferencePage + Task 13.1: NativeConferenceFormPage

Reference `docs/stitch-designs/conference-rooms.png`.

**Files:**
- Create: `src/features/conference/presentation/native/NativeConferencePage.tsx`
- Create: `src/features/conference/presentation/native/NativeConferenceFormPage.tsx`

### Task 14.1: NativeLabelsPage + NativeLabelImagesPage + NativeAssignImagePage

Reference `docs/stitch-designs/labels-management.png`.

**Files:**
- Create: `src/features/labels/presentation/native/NativeLabelsPage.tsx`
- Create: `src/features/labels/presentation/native/NativeLabelImagesPage.tsx`
- Create: `src/features/labels/presentation/native/NativeAssignImagePage.tsx`

### Task 15.1: NativeLinkLabelPage + NativeCSVUploadPage

**Files:**
- Create: `src/features/labels/presentation/native/NativeLinkLabelPage.tsx`
- Create: `src/features/import-export/presentation/native/NativeCSVUploadPage.tsx`

- [ ] **After all above: Verify on emulator — EMULATOR CHECKPOINT 4**

- [ ] **Commit after each feature pair (spaces, conference, labels)**

---

## Chunk 16: AIMS

### Task 16.1: NativeAimsPage

**Files:**
- Create: `src/features/sync/presentation/native/NativeAimsPage.tsx`

Connection status, sync controls, section chips (Articles, Gateways, Labels, Templates), inline expandable details.

Stores: `useSyncStore`, `useAimsManagementStore`.

---

## Chunk 17: Settings Hub

### Task 17.1: NativeSettingsPage

**Files:**
- Create: `src/features/settings/presentation/native/NativeSettingsPage.tsx`

Reference `docs/stitch-designs/settings.png` and existing `NativeSettingsPage.tsx` pattern.

- Back arrow, EN/HE switcher in app bar
- Quick actions row: Edit Profile, Help, About, Logout
- Horizontal scrollable tab chips: App, SoluM, Logo, Security, Users, Companies, Roles, Logs
- Tab content inline (lazy-loaded with Suspense)
- Role-based tab filtering (same pattern as existing NativeSettingsPage)

- [ ] **Verify on emulator — EMULATOR CHECKPOINT 5**

---

## Chunks 18–22: Settings Sub-Pages

### Task 18.1: Users (NativeUsersListPage + NativeUserFormPage + NativeElevateUserPage)

**Files:**
- Create: `src/features/settings/presentation/native/NativeUsersListPage.tsx`
- Create: `src/features/settings/presentation/native/NativeUserFormPage.tsx`
- Create: `src/features/settings/presentation/native/NativeElevateUserPage.tsx`

### Task 19.1: Companies (NativeCompaniesListPage + NativeCompanyFormPage)

**Files:**
- Create: `src/features/settings/presentation/native/NativeCompaniesListPage.tsx`
- Create: `src/features/settings/presentation/native/NativeCompanyFormPage.tsx`

Wizard mode (create): 3-step flow with step indicator.
Edit mode: tab chips (Details, Features, Stores).

### Task 20.1: Company sub-pages

**Files:**
- Create: `src/features/settings/presentation/native/NativeCompanyFeaturesPage.tsx`
- Create: `src/features/settings/presentation/native/NativeStoresListPage.tsx`
- Create: `src/features/settings/presentation/native/NativeStoreFormPage.tsx`
- Create: `src/features/settings/presentation/native/NativeStoreFeaturesPage.tsx`

### Task 21.1: Roles (NativeRolesListPage + NativeRoleFormPage)

**Files:**
- Create: `src/features/settings/presentation/native/NativeRolesListPage.tsx`
- Create: `src/features/settings/presentation/native/NativeRoleFormPage.tsx`

### Task 22.1: Profile + About

**Files:**
- Create: `src/features/settings/presentation/native/NativeProfilePage.tsx`
- Create: `src/features/settings/presentation/native/NativeAboutPage.tsx`

- [ ] **Verify on emulator — EMULATOR CHECKPOINT 6**

- [ ] **Commit after each settings chunk**

---

## Chunk 23: Polish

### Task 23.1: Haptics

- [ ] Add `Haptics.impact({ style: ImpactStyle.Heavy })` to all NativeDeleteButton confirmations
- [ ] Add `Haptics.impact({ style: ImpactStyle.Medium })` to successful form saves
- [ ] Add haptic to pull-to-refresh threshold (already exists in PullToRefresh)

### Task 23.2: Skeleton loaders

- [ ] Add skeleton loading states to all list pages (NativePeopleListPage, NativeSpacesListPage, etc.)
- [ ] Use MUI `<Skeleton variant="rounded" />` with nativeRadii.card radius

### Task 23.3: Transition polish

- [ ] Fine-tune PageTransition timing
- [ ] Verify slide direction is correct in RTL
- [ ] Test fallback on older WebView (mock `startViewTransition` as undefined)

### Task 23.4: RTL verification

- [ ] Switch to Hebrew, verify ALL pages:
  - Layout flips correctly (logical properties)
  - Text alignment correct
  - Swipe carousel direction reversed
  - Back arrow position flipped
  - Bottom nav layout correct

### Task 23.5: Final emulator verification

- [ ] Take screenshots of ALL 9 main screens
- [ ] Compare against Stitch design PNGs
- [ ] Document any deviations

- [ ] **FINAL COMMIT**

```bash
git add -A
git commit -m "feat: native UI polish — haptics, skeletons, transitions, RTL verification"
```

---

## Summary

| Chunk | What | Files | Checkpoint |
|-------|------|-------|------------|
| 0 | Capacitor fix + cleanup | 13 deleted, 3 modified | - |
| 1 | Stitch theme | 2 created | - |
| 2 | Shell + AppBar + BottomNav + Page | 5 created | - |
| 3 | Transitions + routes | 2 created, 2 modified | - |
| 4 | Login | 1 created | **CP1** |
| 5 | List components | 12 created | - |
| 6 | Form components | 5 created | - |
| 7 | Dashboard | 2 created | **CP2** |
| 8-9 | People | 2 created | **CP3** |
| 10-11 | Spaces | 2 created | - |
| 12-13 | Conference | 2 created | - |
| 14-15 | Labels + CSV | 5 created | **CP4** |
| 16 | AIMS | 1 created | - |
| 17 | Settings hub | 1 created | **CP5** |
| 18-22 | Settings sub-pages | 15 created | **CP6** |
| 23 | Polish | modifications | **FINAL** |
| **Total** | | **~55 new files** | **7 checkpoints** |
