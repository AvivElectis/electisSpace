# Native UI Rewrite — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation (NativePage, PageTransition, NativeRoutes) and convert the People feature's dialog to a full-page native experience with grouped list.

**Architecture:** Extract form content from dialogs into standalone components. On native, render forms inside `NativePage` at dedicated routes. On web, continue using Dialogs unchanged. Use View Transitions API for shared-element morphing with CSS slide fallback.

**Tech Stack:** React 19, MUI 7, Capacitor 8, Zustand 5, react-router-dom (HashRouter), CSS View Transitions API

**Spec:** `docs/superpowers/specs/2026-03-18-native-ui-rewrite-design.md`

**Dev environment:** Branch `feat/native-ui-rewrite`, Android emulator `Medium_Phone_API_35`, Vite dev server on port 3001.

---

## File Map

### New Files
```
src/shared/presentation/layouts/NativePage.tsx              — page wrapper (AppBar + back + scroll)
src/shared/presentation/components/NativeGroupedList.tsx     — grouped section list component
src/shared/presentation/components/NativeFormSection.tsx     — form section card wrapper
src/shared/presentation/components/NativeRoutes.tsx          — all native-only route definitions
src/shared/presentation/components/PageTransition.tsx        — view transition + slide wrapper
src/features/people/presentation/PersonForm.tsx              — extracted form (shared web+native)
src/features/people/presentation/NativePersonPage.tsx        — route wrapper for person edit/create
src/features/people/presentation/NativePeopleList.tsx        — grouped list for people page
```

### Modified Files
```
src/AppRoutes.tsx                                            — add NativeRoutes import
src/features/people/presentation/PersonDialog.tsx            — use PersonForm internally
src/features/people/presentation/PeopleManagerView.tsx       — native: navigate, show NativePeopleList
```

---

## Chunk 1: Foundation Components

### Task 1: NativePage Wrapper

**Files:**
- Create: `src/shared/presentation/layouts/NativePage.tsx`

- [ ] **Step 1: Create NativePage component**

Reference existing patterns from `NativeAppHeader.tsx:35` (safe-area) and `NativeBottomNav.tsx:14` (height constant).

```tsx
// src/shared/presentation/layouts/NativePage.tsx
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NATIVE_BOTTOM_NAV_HEIGHT } from './NativeBottomNav';

interface NativePageProps {
    title: string;
    children: React.ReactNode;
    onBack?: () => void;
    actions?: React.ReactNode;
    noPadding?: boolean;
    hideBottomNavPadding?: boolean;
    viewTransitionName?: string;
}

export function NativePage({
    title,
    children,
    onBack,
    actions,
    noPadding = false,
    hideBottomNavPadding = false,
    viewTransitionName,
}: NativePageProps) {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'he';

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    paddingTop: 'max(env(safe-area-inset-top, 0px), 28px)',
                    backgroundColor: 'primary.dark',
                }}
            >
                <Toolbar sx={{ minHeight: '56px !important', height: 56, gap: 1 }}>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleBack}
                        aria-label="back"
                    >
                        <ArrowBackIcon sx={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />
                    </IconButton>
                    <Typography
                        variant="h6"
                        component="h1"
                        sx={{
                            flex: 1,
                            fontSize: '1.1rem',
                            fontWeight: 500,
                            textAlign: isRtl ? 'right' : 'left',
                        }}
                        style={viewTransitionName ? { viewTransitionName: `title-${viewTransitionName}` } as React.CSSProperties : undefined}
                    >
                        {title}
                    </Typography>
                    {actions}
                </Toolbar>
            </AppBar>

            <Box
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    backgroundColor: '#f8f9fa',
                    ...(noPadding ? {} : { px: 2, py: 1.5 }),
                    ...(hideBottomNavPadding ? {} : {
                        pb: `calc(${NATIVE_BOTTOM_NAV_HEIGHT + 16}px + env(safe-area-inset-bottom, 0px))`,
                    }),
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build 2>&1 | tail -3`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/layouts/NativePage.tsx
git commit -m "feat: add NativePage wrapper component"
```

---

### Task 2: NativeFormSection Component

**Files:**
- Create: `src/shared/presentation/components/NativeFormSection.tsx`

- [ ] **Step 1: Create NativeFormSection**

```tsx
// src/shared/presentation/components/NativeFormSection.tsx
import { Box, Typography } from '@mui/material';

interface NativeFormSectionProps {
    title: string;
    children: React.ReactNode;
}

export function NativeFormSection({ title, children }: NativeFormSectionProps) {
    return (
        <Box sx={{ mb: 1.5 }}>
            <Typography
                variant="overline"
                sx={{
                    color: 'primary.main',
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    fontSize: '0.68rem',
                    px: 0.5,
                    mb: 1,
                    display: 'block',
                }}
            >
                {title}
            </Typography>
            <Box
                sx={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    '& > :not(:last-child)': {
                        borderBottom: '1px solid #f0f0f0',
                    },
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/components/NativeFormSection.tsx
git commit -m "feat: add NativeFormSection card wrapper component"
```

---

### Task 3: NativeGroupedList Component

**Files:**
- Create: `src/shared/presentation/components/NativeGroupedList.tsx`

- [ ] **Step 1: Create NativeGroupedList**

```tsx
// src/shared/presentation/components/NativeGroupedList.tsx
import { Box, Typography, Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from 'react-i18next';
import { NATIVE_BOTTOM_NAV_HEIGHT } from '../layouts/NativeBottomNav';

interface Section<T> {
    title: string;
    count: number;
    color: 'primary' | 'warning';
    icon?: React.ReactNode;
    items: T[];
}

interface NativeGroupedListProps<T> {
    sections: Section<T>[];
    renderItem: (item: T) => React.ReactNode;
    onItemTap: (item: T) => void;
    emptyState?: React.ReactNode;
    fab?: { label: string; onClick: () => void };
    keyExtractor: (item: T) => string;
}

export function NativeGroupedList<T>({
    sections,
    renderItem,
    onItemTap,
    emptyState,
    fab,
    keyExtractor,
}: NativeGroupedListProps<T>) {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'he';

    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

    if (totalItems === 0 && emptyState) {
        return <>{emptyState}</>;
    }

    return (
        <Box sx={{ pb: fab ? 10 : 0 }}>
            {sections.map((section) => {
                if (section.items.length === 0) return null;

                const colorMap = {
                    primary: { header: 'primary.main', icon: '#4caf50' },
                    warning: { header: '#e65100', icon: '#ff9800' },
                };
                const colors = colorMap[section.color];

                return (
                    <Box key={section.title} sx={{ mb: 2 }}>
                        {/* Section header */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                px: 0.5,
                                mb: 1,
                            }}
                        >
                            <Typography
                                variant="overline"
                                sx={{
                                    color: colors.header,
                                    fontWeight: 600,
                                    letterSpacing: 0.8,
                                    fontSize: '0.68rem',
                                }}
                            >
                                {section.title} ({section.count})
                            </Typography>
                            {section.icon}
                        </Box>

                        {/* Items container */}
                        <Box
                            sx={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}
                        >
                            {section.items.map((item, index) => (
                                <Box
                                    key={keyExtractor(item)}
                                    onClick={() => onItemTap(item)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        px: 2,
                                        py: 1.5,
                                        cursor: 'pointer',
                                        '&:active': { backgroundColor: '#f5f5f5' },
                                        ...(index < section.items.length - 1 ? {
                                            borderBottom: '1px solid #f0f0f0',
                                        } : {}),
                                    }}
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        {renderItem(item)}
                                    </Box>
                                    <ChevronRightIcon
                                        sx={{
                                            color: '#ccc',
                                            fontSize: 20,
                                            flexShrink: 0,
                                            transform: isRtl ? 'scaleX(-1)' : 'none',
                                        }}
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                );
            })}

            {fab && (
                <Fab
                    color="primary"
                    variant="extended"
                    onClick={fab.onClick}
                    sx={{
                        position: 'fixed',
                        bottom: `calc(${NATIVE_BOTTOM_NAV_HEIGHT + 24}px + env(safe-area-inset-bottom, 0px))`,
                        right: 24,
                        zIndex: 1050,
                        height: 56,
                        px: 3,
                        fontWeight: 600,
                    }}
                >
                    <AddIcon sx={{ mr: isRtl ? 0 : 1, ml: isRtl ? 1 : 0 }} />
                    {fab.label}
                </Fab>
            )}
        </Box>
    );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/components/NativeGroupedList.tsx
git commit -m "feat: add NativeGroupedList with grouped sections"
```

---

### Task 4: PageTransition Component

**Files:**
- Create: `src/shared/presentation/components/PageTransition.tsx`

- [ ] **Step 1: Create PageTransition with View Transitions API + CSS fallback**

```tsx
// src/shared/presentation/components/PageTransition.tsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Triggers CSS View Transitions on route changes.
 * Falls back to CSS-only slide animation on older WebViews.
 * Place this component inside the Router, above route content.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const prevPathRef = useRef(location.pathname);

    useEffect(() => {
        if (prevPathRef.current === location.pathname) return;

        const supportsViewTransitions = 'startViewTransition' in document;

        if (supportsViewTransitions) {
            // The View Transitions API captures the old DOM state,
            // then applies the new state and animates between them.
            // React has already committed the new DOM by this effect,
            // so we use a micro-task trick: the transition wraps the
            // update callback (which is a no-op since React already updated).
            (document as any).startViewTransition(() => {
                // DOM already updated by React — this is the "after" snapshot
                return Promise.resolve();
            });
        }

        prevPathRef.current = location.pathname;
    }, [location.pathname]);

    return <>{children}</>;
}

/**
 * CSS to add to index.html or a global stylesheet for view transition animations.
 * These keyframes are used by the View Transitions API automatically.
 *
 * Add this CSS globally:
 *
 * ::view-transition-old(root) {
 *   animation: slide-out 250ms ease-out;
 * }
 * ::view-transition-new(root) {
 *   animation: slide-in 250ms ease-out;
 * }
 * @keyframes slide-in {
 *   from { transform: translateX(30%); opacity: 0; }
 *   to { transform: translateX(0); opacity: 1; }
 * }
 * @keyframes slide-out {
 *   from { transform: translateX(0); opacity: 1; }
 *   to { transform: translateX(-30%); opacity: 0; }
 * }
 *
 * For RTL, use [dir="rtl"] selector to flip directions.
 */
```

- [ ] **Step 2: Add view transition CSS to index.html**

Add the following `<style>` block inside `<head>` of `index.html`:

```html
<style>
  ::view-transition-old(root) {
    animation: vt-slide-out 250ms ease-out;
  }
  ::view-transition-new(root) {
    animation: vt-slide-in 250ms ease-out;
  }
  @keyframes vt-slide-in {
    from { transform: translateX(30%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes vt-slide-out {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(-30%); opacity: 0; }
  }
  [dir="rtl"] ::view-transition-old(root) {
    animation: vt-slide-out-rtl 250ms ease-out;
  }
  [dir="rtl"] ::view-transition-new(root) {
    animation: vt-slide-in-rtl 250ms ease-out;
  }
  @keyframes vt-slide-in-rtl {
    from { transform: translateX(-30%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes vt-slide-out-rtl {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(30%); opacity: 0; }
  }
</style>
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build 2>&1 | tail -3`

- [ ] **Step 4: Commit**

```bash
git add src/shared/presentation/components/PageTransition.tsx index.html
git commit -m "feat: add PageTransition with View Transitions API + CSS fallback"
```

---

### Task 5: NativeRoutes Sub-component

**Files:**
- Create: `src/shared/presentation/components/NativeRoutes.tsx`
- Modify: `src/AppRoutes.tsx`

- [ ] **Step 1: Create NativeRoutes with initial People routes**

```tsx
// src/shared/presentation/components/NativeRoutes.tsx
import { Route } from 'react-router-dom';
import { lazy } from 'react';

// Lazy-load native page wrappers
const NativePersonPage = lazy(() =>
    import('@features/people/presentation/NativePersonPage').then(m => ({ default: m.NativePersonPage }))
);

/**
 * Native-only routes. These don't exist on web.
 * Rendered inside <Routes> only when isNative is true.
 */
export function NativeRoutes() {
    return (
        <>
            <Route path="/people/new" element={<NativePersonPage />} />
            <Route path="/people/:id/edit" element={<NativePersonPage />} />
        </>
    );
}
```

- [ ] **Step 2: Add NativeRoutes to AppRoutes.tsx**

In `src/AppRoutes.tsx`, add the import and render `NativeRoutes` inside the `<Routes>` block, gated by `isNative`:

Add import at top:
```tsx
import { useNativePlatform } from '@shared/presentation/hooks/useNativePlatform';
import { NativeRoutes } from '@shared/presentation/components/NativeRoutes';
import { PageTransition } from '@shared/presentation/components/PageTransition';
```

Inside the `AppRoutes` function, add `const { isNative } = useNativePlatform();` and wrap the `<Routes>` content with `<PageTransition>` when native. Add `{isNative && <NativeRoutes />}` inside `<Routes>` before the catch-all route.

- [ ] **Step 3: Verify it builds**

Run: `npm run build 2>&1 | tail -3`

- [ ] **Step 4: Commit**

```bash
git add src/shared/presentation/components/NativeRoutes.tsx src/AppRoutes.tsx
git commit -m "feat: add NativeRoutes registry and PageTransition to AppRoutes"
```

---

## Chunk 2: Extract PersonForm & Convert People Feature

### Task 6: Extract PersonForm from PersonDialog

**Files:**
- Create: `src/features/people/presentation/PersonForm.tsx`
- Modify: `src/features/people/presentation/PersonDialog.tsx`

The goal: extract the form fields, validation, and save logic from `PersonDialog.tsx:56-288` into a standalone `PersonForm` component. The Dialog keeps its shell (Dialog/DialogTitle/DialogActions) and renders `PersonForm` inside.

- [ ] **Step 1: Create PersonForm with extracted form content**

`PersonForm` receives props for the person data, save handler, and dirty-state callback. It contains all the form fields currently in PersonDialog lines 56-288 (state, validation, field rendering, SpaceSelector).

```tsx
// src/features/people/presentation/PersonForm.tsx
interface PersonFormProps {
    person?: Person;
    onSave: () => void;
    onDirtyChange?: (dirty: boolean) => void;
}

export function PersonForm({ person, onSave, onDirtyChange }: PersonFormProps)
```

The component should contain:
- `formData` state (from PersonDialog line 56-60)
- `errors` state (line 61)
- `editableFields` memo (lines 67-100)
- `nameField` memo (lines 103-122)
- `useEffect` for form initialization (lines 125-152)
- `validate` function (lines 154-172)
- `handleSave` function (lines 173-212) — calls `onSave()` after successful save
- `handleFieldChange` (lines 214-219)
- All field rendering JSX (lines 238-288): name field, dynamic fields, divider, space assignment section
- `saving` state (line 62)

The form should call `onDirtyChange?.(true)` whenever `formData` changes from initial values.

Do NOT include: Dialog, DialogTitle, DialogContent, DialogActions, useConfirmDialog. Those stay in PersonDialog.

- [ ] **Step 2: Refactor PersonDialog to use PersonForm**

Modify `PersonDialog.tsx` to import and render `PersonForm` inside its Dialog shell:

```tsx
export function PersonDialog({ open, onClose, person }: PersonDialogProps) {
    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile} dir={isRtl ? 'rtl' : 'ltr'}>
                <DialogTitle>...</DialogTitle>
                <DialogContent>
                    <PersonForm person={person} onSave={onClose} />
                </DialogContent>
            </Dialog>
        </>
    );
}
```

The save/cancel buttons can either stay in PersonDialog's DialogActions (calling a ref/callback on PersonForm) or move into PersonForm. The simpler approach: move save/cancel into PersonForm so it's self-contained, and PersonDialog is just the Dialog shell.

- [ ] **Step 3: Verify web still works — build and run unit tests**

Run: `npm run build 2>&1 | tail -3`
Run: `npm run test:unit -- --run 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add src/features/people/presentation/PersonForm.tsx src/features/people/presentation/PersonDialog.tsx
git commit -m "refactor: extract PersonForm from PersonDialog for web+native sharing"
```

---

### Task 7: NativePersonPage Route Wrapper

**Files:**
- Create: `src/features/people/presentation/NativePersonPage.tsx`

- [ ] **Step 1: Create NativePersonPage**

This is the route target for `/people/new` and `/people/:id/edit`. It loads person data from the store, renders PersonForm inside NativePage.

```tsx
// src/features/people/presentation/NativePersonPage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@mui/material';
import { NativePage } from '@shared/presentation/layouts/NativePage';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { useAndroidBackButton } from '@shared/presentation/hooks/useAndroidBackButton';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { PersonForm } from './PersonForm';

export function NativePersonPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const people = usePeopleStore(s => s.people);
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const [isDirty, setIsDirty] = useState(false);

    const isEditMode = !!id;
    const person = isEditMode ? people.find(p => p.id === id) : undefined;

    // Guard: editing a person that doesn't exist in store
    if (isEditMode && !person) {
        return (
            <NativePage title={t('people.editPerson')} onBack={() => navigate(-1)}>
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                    {t('common.notFound')}
                </Box>
            </NativePage>
        );
    }

    // Dirty form guard for Android back button
    useAndroidBackButton({
        onCloseDialog: useCallback(() => {
            if (isDirty) {
                confirm({
                    title: t('common.unsavedChanges'),
                    message: t('common.discardChanges'),
                    confirmLabel: t('common.discard'),
                    severity: 'warning',
                }).then(discard => {
                    if (discard) navigate(-1);
                });
                return true;
            }
            return false;
        }, [isDirty, confirm, navigate, t]),
    });

    const title = isEditMode ? t('people.editPerson') : t('people.addPerson');

    return (
        <>
            <NativePage
                title={title}
                viewTransitionName={person?.id}
            >
                <PersonForm
                    person={person}
                    onSave={() => navigate(-1)}
                    onDirtyChange={setIsDirty}
                />
            </NativePage>
            <ConfirmDialog />
        </>
    );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/features/people/presentation/NativePersonPage.tsx
git commit -m "feat: add NativePersonPage route wrapper for person edit/create"
```

---

### Task 8: NativePeopleList for People Page

**Files:**
- Create: `src/features/people/presentation/NativePeopleList.tsx`

- [ ] **Step 1: Create NativePeopleList using NativeGroupedList**

This component wraps `NativeGroupedList` with people-specific logic: grouping by assigned/unassigned, rendering person items with space badges.

```tsx
// src/features/people/presentation/NativePeopleList.tsx
import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { NativeGroupedList } from '@shared/presentation/components/NativeGroupedList';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import type { Person } from '../domain/types';

interface NativePeopleListProps {
    people: Person[];
    canEdit: boolean;
}

export function NativePeopleList({ people, canEdit }: NativePeopleListProps) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { getLabel } = useSpaceTypeLabels();

    const sections = useMemo(() => {
        const assigned = people.filter(p => p.assignedSpaceId);
        const unassigned = people.filter(p => !p.assignedSpaceId);

        return [
            {
                title: t('people.assigned'),
                count: assigned.length,
                color: 'primary' as const,
                icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />,
                items: assigned.sort((a, b) => {
                    const aNum = parseInt(a.assignedSpaceId || '0', 10);
                    const bNum = parseInt(b.assignedSpaceId || '0', 10);
                    return aNum - bNum;
                }),
            },
            {
                title: t('people.unassigned'),
                count: unassigned.length,
                color: 'warning' as const,
                icon: <WarningIcon sx={{ fontSize: 16, color: '#ff9800' }} />,
                items: unassigned,
            },
        ];
    }, [people, t]);

    const getDisplayName = (person: Person): string => {
        return Object.values(person.data)[0] || person.id.slice(0, 8);
    };

    const getSubtitle = (person: Person): string => {
        const values = Object.values(person.data);
        const dept = values[1] || '';
        if (person.assignedSpaceId) {
            return dept ? `${dept} · ${getLabel('singular')} ${person.assignedSpaceId}` : `${getLabel('singular')} ${person.assignedSpaceId}`;
        }
        return dept ? `${dept} · ${t('people.unassigned')}` : t('people.unassigned');
    };

    return (
        <NativeGroupedList
            sections={sections}
            keyExtractor={(p) => p.id}
            onItemTap={(person) => {
                if (canEdit) {
                    navigate(`/people/${person.id}/edit`);
                }
            }}
            renderItem={(person) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: 14,
                            flexShrink: 0,
                            backgroundColor: person.assignedSpaceId ? '#e3f2fd' : '#fff3e0',
                            color: person.assignedSpaceId ? 'primary.main' : '#e65100',
                        }}
                        style={person.id ? { viewTransitionName: `badge-${person.id}` } as React.CSSProperties : undefined}
                    >
                        {person.assignedSpaceId || '—'}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 14 }} noWrap>
                            {getDisplayName(person)}
                        </Typography>
                        <Typography variant="caption" sx={{
                            color: person.assignedSpaceId ? 'text.secondary' : '#e65100',
                            fontSize: 11,
                        }} noWrap>
                            {getSubtitle(person)}
                        </Typography>
                    </Box>
                </Box>
            )}
            fab={canEdit ? {
                label: t('people.addPerson'),
                onClick: () => navigate('/people/new'),
            } : undefined}
        />
    );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/features/people/presentation/NativePeopleList.tsx
git commit -m "feat: add NativePeopleList with grouped sections for native"
```

---

### Task 9: Wire PeopleManagerView for Native

**Files:**
- Modify: `src/features/people/presentation/PeopleManagerView.tsx`

- [ ] **Step 1: Add native branching to PeopleManagerView**

In `PeopleManagerView.tsx`, add:

1. Import `useNativePlatform` and `NativePeopleList`
2. Get `isNative` from the hook
3. Change `handleEdit` (line 322) to navigate on native
4. Change `handleAdd` (line 327) to navigate on native
5. In the render section, conditionally render `NativePeopleList` instead of `PeopleTable` when `isNative`

Key changes:

```tsx
// Add imports
import { useNativePlatform } from '@shared/presentation/hooks/useNativePlatform';
const NativePeopleList = lazy(() =>
    import('./NativePeopleList').then(m => ({ default: m.NativePeopleList }))
);

// Inside component
const { isNative } = useNativePlatform();

// Modify handleEdit (line 322)
const handleEdit = useCallback((person: Person) => {
    if (isNative) {
        navigate(`/people/${person.id}/edit`);
    } else {
        setEditingPerson(person);
        setPersonDialogOpen(true);
    }
}, [isNative, navigate]);

// Modify handleAdd (line 327)
const handleAdd = useCallback(() => {
    if (isNative) {
        navigate('/people/new');
    } else {
        setEditingPerson(undefined);
        setPersonDialogOpen(true);
    }
}, [isNative, navigate]);

// In render: conditionally show NativePeopleList vs PeopleTable
{isNative ? (
    <NativePeopleList people={filteredPeople} canEdit={canEdit} />
) : (
    <PeopleTable ... />  // existing table code unchanged
)}
```

Also gate the web-only dialogs with `!isNative`:
```tsx
{!isNative && personDialogOpen && (
    <PersonDialog ... />
)}
```

- [ ] **Step 2: Add `useNavigate` import if not present**

Check if `useNavigate` is already imported. If not, add it from `react-router-dom`.

- [ ] **Step 3: Verify build and that web is unaffected**

Run: `npm run build 2>&1 | tail -3`
Run: `npm run test:unit -- --run 2>&1 | tail -5`

- [ ] **Step 4: Test on Android emulator**

Build and sync to Android:
```bash
npx cap sync android
```

Open in emulator and verify:
- People page shows grouped list (Assigned / Unassigned sections)
- Tapping a person navigates to the edit page
- Back button returns to list
- FAB "Add Person" navigates to create page

- [ ] **Step 5: Commit**

```bash
git add src/features/people/presentation/PeopleManagerView.tsx
git commit -m "feat: wire PeopleManagerView for native grouped list + page navigation"
```

---

## Chunk 3: Integration & Testing

### Task 10: End-to-End Integration Test

- [ ] **Step 1: Verify web E2E tests still pass**

Run: `npm run test:e2e 2>&1 | tail -20`

The native changes are gated by `isNative` which is `false` in Playwright (web browser). All existing tests should pass unchanged.

- [ ] **Step 2: Test full native flow on emulator**

Manually test on the running Android emulator:
1. Navigate to People tab → see grouped sections
2. Tap a person → slide transition to edit page
3. Edit a field → save → returns to list
4. Tap "Add Person" FAB → create page
5. Fill form → save → returns to list with new person
6. Press Android back button → returns from edit page
7. Press back on root → double-tap to exit behavior

- [ ] **Step 3: Final commit with all adjustments**

```bash
git add -A
git commit -m "feat: native UI Phase 1 — NativePage, grouped list, person pages"
```
