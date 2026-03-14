# Store Isolation Safety Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent cross-store data leaks during context switches and redesign the store selector for atomic, safe transitions.

**Architecture:** Five independent changes: (1) Rewrite CompanyStoreSelector with grouped menu + atomic `setActiveContext`, (2) Add `resetSettings()` to `clearAllFeatureStores()`, (3) Add SphereLoader overlay when `isSwitchingStore`, (4) Add divergence warnings in StoreDialog, (5) Wrap desktop tabs in content-width container.

**Tech Stack:** React 19, MUI 7, Zustand 5, i18next (EN+HE)

**Spec:** `docs/superpowers/specs/2026-03-14-store-isolation-design.md`

---

## Chunk 1: Core Safety (Tasks 1-3)

### Task 1: Add settings store reset to clearAllFeatureStores

**Files:**
- Modify: `src/features/auth/infrastructure/authStore.ts:26-40`

This is the smallest, highest-impact fix. One line prevents all cross-store data leaks.

- [ ] **Step 1: Add resetSettings() call to clearAllFeatureStores**

In `src/features/auth/infrastructure/authStore.ts`, the `clearAllFeatureStores` function (line 26-40) already imports `useSettingsStore` (line 9). Add the reset call after the existing store clears:

```typescript
const clearAllFeatureStores = () => {
    try {
        useSpacesStore.getState().clearAllData();
        usePeopleStore.getState().clearAllData();
        useConferenceStore.getState().clearAllData();
        useLabelsStore.getState().clearAllData();
        useRolesStore.getState().clearAllData();
        useAimsManagementStore.getState().reset();
        useOfflineQueueStore.getState().clearItems();
        useListsStore.getState().clearAllData();
        useSyncStore.getState().setWorkingMode('SOLUM_API');
        // Reset settings (logos, appName, fieldMappings, articleFormat) to prevent cross-store leaks
        useSettingsStore.getState().resetSettings();
    } catch (e) {
        logger.warn('AuthStore', 'Failed to clear feature stores', { error: e instanceof Error ? e.message : String(e) });
    }
};
```

- [ ] **Step 2: Remove redundant settings clears from setActiveCompany**

In the same file, `setActiveCompany` (around line 525-528) has manual partial clears that are now redundant since `clearAllFeatureStores()` calls `resetSettings()`:

Remove these lines after `clearAllFeatureStores()` in `setActiveCompany`:
```typescript
// DELETE these lines — resetSettings() already handles them:
settingsStore.clearFieldMappings();
// Also clear stale article format from previous company
settingsStore.updateSettings({ solumArticleFormat: undefined });
```

- [ ] **Step 3: Verify settings repopulate after reset**

Confirm that each switch path calls `fetchSettingsFromServer` AFTER `clearAllFeatureStores()`:
- `setActiveCompany` (line ~530): fetches company settings via `settingsService.getCompanySettings(companyId)` ✓
- `setActiveStore` (line ~573): calls `settingsStore.fetchSettingsFromServer(storeId, companyId)` ✓
- `setActiveContext` (line ~615): calls `settingsStore.fetchSettingsFromServer(storeId, companyId)` ✓

No code change needed — just verify the ordering is correct.

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/infrastructure/authStore.ts
git commit -m "fix: add settings store reset to clearAllFeatureStores

Prevents cross-store data leaks (logos, appName, fieldMappings, articleFormat)
during context switches. resetSettings() resets to safe defaults; AppHeader
falls back to default logos via || operator."
```

---

### Task 2: Add SphereLoader transition guard in MainLayout

**Files:**
- Modify: `src/shared/presentation/layouts/MainLayout.tsx:221-230`

- [ ] **Step 1: Add SphereLoader import**

At the top of `MainLayout.tsx`, add the import (near the other component imports around line 19):

```typescript
import { SphereLoader } from '../components/SphereLoader';
```

- [ ] **Step 2: Add the overlay after the opening Box**

In the return JSX (line ~221-230), insert the overlay as the **first child** inside the main `<Box>` wrapper, before `<AppHeader>`. Since it uses `position: fixed` with `zIndex: modal + 1`, it will cover the entire viewport including the header.

Insert this between line 228 (`}}>`) and line 229 (`{/* Header with mobile menu support */}`):

```tsx
{/* Store switching overlay — covers all stale UI during context transition */}
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

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/layouts/MainLayout.tsx
git commit -m "fix: add SphereLoader overlay during store switching

Full-screen overlay when isSwitchingStore prevents users from seeing
stale tabs, logos, or content from the previous store context."
```

---

### Task 3: Wrap desktop tabs in content-width Container

**Files:**
- Modify: `src/shared/presentation/layouts/MainLayout.tsx:294-343`

- [ ] **Step 1: Add Container import if not already present**

Check the imports at top of `MainLayout.tsx` (line 1). `Container` is already imported from MUI. No change needed.

- [ ] **Step 2: Wrap the desktop tabs Box in a Container**

Replace the desktop tabs block (lines 294-343). The outer `<Box>` with padding becomes wrapped in `<Container maxWidth="xl">`:

Before:
```tsx
) : (
    <Box sx={{
        bgcolor: 'transparent',
        borderColor: 'divider',
        px: { xs: 2, sm: 3, md: 4 },
        pt: 0,
        pb: 0.5,
    }}>
        <Tabs
```

After:
```tsx
) : (
    <Container maxWidth="xl" disableGutters>
        <Box sx={{
            bgcolor: 'transparent',
            borderColor: 'divider',
            px: { xs: 2, sm: 3, md: 4 },
            pt: 0,
            pb: 0.5,
        }}>
            <Tabs
```

And close the Container after the Box closing tag:

Before:
```tsx
                        </Tabs>
                    </Box>
                )}
```

After:
```tsx
                        </Tabs>
                    </Box>
                </Container>
            )}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/layouts/MainLayout.tsx
git commit -m "fix: align desktop feature tabs to content width

Wrap desktop navigation tabs in Container maxWidth='xl' to match
the main content area width, preventing tabs from spanning full viewport."
```

---

## Chunk 2: CompanyStoreSelector Redesign (Task 4)

### Task 4: Rewrite CompanyStoreSelector with grouped menu + atomic switching

**Files:**
- Modify: `src/features/auth/presentation/CompanyStoreSelector.tsx` (full rewrite)
- Modify: `src/locales/en/common.json` (add selector keys)
- Modify: `src/locales/he/common.json` (add selector keys)

This is the largest task. The component is fully rewritten with:
- Responsive button (desktop: company+store, tablet: store only, mobile: icon only)
- Grouped dropdown with stores under company headers
- Atomic `setActiveContext` for ALL switches
- Spinner state during transition

- [ ] **Step 1: Add translation keys to EN locale**

In `src/locales/en/common.json`, add a `"selector"` section (find appropriate alphabetical location among top-level keys):

```json
"selector": {
    "selectStore": "Select Store",
    "switchingStore": "Switching...",
    "platformAdmin": "Platform Administrator",
    "code": "Code",
    "noStores": "No stores available"
}
```

- [ ] **Step 2: Add translation keys to HE locale**

In `src/locales/he/common.json`, add the matching `"selector"` section:

```json
"selector": {
    "selectStore": "בחר חנות",
    "switchingStore": "מעביר...",
    "platformAdmin": "מנהל פלטפורמה",
    "code": "קוד",
    "noStores": "אין חנויות זמינות"
}
```

- [ ] **Step 3: Rewrite CompanyStoreSelector.tsx**

Replace the entire content of `src/features/auth/presentation/CompanyStoreSelector.tsx`:

```tsx
/**
 * Company/Store Selector Component
 *
 * Responsive button + grouped dropdown for switching between stores.
 * Uses atomic setActiveContext for safe cross-company transitions.
 */

import { useState, useMemo } from 'react';
import {
    Box,
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography,
    CircularProgress,
    IconButton,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import StoreIcon from '@mui/icons-material/Store';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckIcon from '@mui/icons-material/Check';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useTranslation } from 'react-i18next';

interface CompanyStoreSelectorProps {
    /** Compact mode for smaller screens */
    compact?: boolean;
}

export function CompanyStoreSelector({ compact = false }: CompanyStoreSelectorProps) {
    const { t } = useTranslation();
    const {
        activeCompany,
        activeStore,
        companies,
        stores,
        isPlatformAdmin,
        setActiveContext,
        isLoading,
    } = useAuthContext();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [switching, setSwitching] = useState(false);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    /** Atomic store switch — always uses setActiveContext for safety */
    const handleStoreSelect = async (companyId: string, storeId: string) => {
        if (storeId === activeStore?.id) {
            handleClose();
            return;
        }

        setSwitching(true);
        handleClose();
        try {
            await setActiveContext(companyId, storeId);
        } finally {
            setSwitching(false);
        }
    };

    // Build grouped store list: companies with their stores
    // NOTE: Company type from authService does NOT have `stores` property.
    // `stores` is a separate array from useAuthContext with `companyId` on each store.
    const groupedStores = useMemo(() => {
        return companies.map(company => ({
            company,
            stores: stores.filter(s => s.companyId === company.id),
        }));
    }, [companies, stores]);

    // Don't show if user has no companies
    if (companies.length === 0 && !isPlatformAdmin) {
        return null;
    }

    // Single company + single store: show static text only
    const totalStores = groupedStores.reduce((sum, g) => sum + g.stores.length, 0);
    if (companies.length === 1 && totalStores <= 1 && !isPlatformAdmin) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StoreIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary" noWrap>
                    {activeStore?.name || activeCompany?.name || ''}
                </Typography>
            </Box>
        );
    }

    const chevronIcon = switching
        ? <CircularProgress size={16} />
        : open
            ? <KeyboardArrowUpIcon sx={{ fontSize: 20 }} />
            : <KeyboardArrowDownIcon sx={{ fontSize: 20 }} />;

    return (
        <>
            {/* Mobile: icon-only button */}
            <IconButton
                onClick={handleClick}
                disabled={isLoading || switching}
                sx={{
                    display: { xs: 'flex', sm: 'none' },
                    width: 42,
                    height: 42,
                    background: 'linear-gradient(135deg, rgba(13,71,161,0.06) 0%, rgba(13,71,161,0.12) 100%)',
                    border: '1px solid',
                    borderColor: open ? 'primary.main' : 'divider',
                    '&:hover': {
                        borderColor: 'primary.main',
                        background: 'linear-gradient(135deg, rgba(13,71,161,0.10) 0%, rgba(13,71,161,0.18) 100%)',
                    },
                }}
            >
                {switching ? <CircularProgress size={20} /> : <StoreIcon fontSize="small" color="primary" />}
            </IconButton>

            {/* Tablet: compact store name only */}
            <Button
                onClick={handleClick}
                disabled={isLoading || switching}
                endIcon={chevronIcon}
                sx={{
                    display: { xs: 'none', sm: compact ? 'inline-flex' : 'none', md: compact ? 'none' : 'none' },
                    textTransform: 'none',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: '14px',
                    border: '1px solid',
                    borderColor: open ? 'primary.main' : 'divider',
                    background: 'linear-gradient(135deg, rgba(13,71,161,0.04) 0%, rgba(13,71,161,0.10) 100%)',
                    boxShadow: open ? 2 : 1,
                    '&:hover': {
                        borderColor: 'primary.main',
                        background: 'linear-gradient(135deg, rgba(13,71,161,0.08) 0%, rgba(13,71,161,0.14) 100%)',
                        boxShadow: 2,
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StoreIcon fontSize="small" color="primary" />
                    <Typography variant="body2" fontWeight={700} noWrap>
                        {activeStore?.name || t('selector.selectStore', 'Select Store')}
                    </Typography>
                </Box>
            </Button>

            {/* Desktop: full company/store button */}
            <Button
                onClick={handleClick}
                disabled={isLoading || switching}
                endIcon={chevronIcon}
                sx={{
                    display: { xs: 'none', sm: compact ? 'none' : 'inline-flex', md: 'inline-flex' },
                    textTransform: 'none',
                    px: 2,
                    py: 0.75,
                    borderRadius: '14px',
                    border: '1px solid',
                    borderColor: open ? 'primary.main' : 'divider',
                    background: 'linear-gradient(135deg, rgba(13,71,161,0.04) 0%, rgba(13,71,161,0.10) 100%)',
                    boxShadow: open ? 2 : 1,
                    minWidth: 180,
                    maxWidth: 300,
                    justifyContent: 'space-between',
                    '&:hover': {
                        borderColor: 'primary.main',
                        background: 'linear-gradient(135deg, rgba(13,71,161,0.08) 0%, rgba(13,71,161,0.14) 100%)',
                        boxShadow: 2,
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
                    <StoreIcon fontSize="small" color="primary" />
                    <Box sx={{ textAlign: 'start', overflow: 'hidden' }}>
                        {activeCompany && (
                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    color: 'text.secondary',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    lineHeight: 1.2,
                                }}
                                noWrap
                            >
                                {activeCompany.name}
                            </Typography>
                        )}
                        <Typography variant="body2" fontWeight={700} color="primary" noWrap>
                            {activeStore?.name || t('selector.selectStore', 'Select Store')}
                        </Typography>
                    </Box>
                </Box>
            </Button>

            {/* Grouped dropdown menu */}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'start' }}
                transformOrigin={{ vertical: 'top', horizontal: 'start' }}
                slotProps={{
                    paper: {
                        sx: {
                            minWidth: 280,
                            maxWidth: 360,
                            maxHeight: 400,
                            borderRadius: '16px',
                            mt: 1,
                        }
                    }
                }}
            >
                {/* Platform Admin Badge */}
                {isPlatformAdmin && [
                    <Box key="admin-badge" sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AdminPanelSettingsIcon fontSize="small" color="primary" />
                        <Typography variant="caption" color="primary" fontWeight={600}>
                            {t('selector.platformAdmin', 'Platform Administrator')}
                        </Typography>
                    </Box>,
                    <Divider key="admin-divider" />,
                ]}

                {/* Grouped stores by company */}
                {groupedStores.map((group, groupIndex) => [
                    // Company header (non-clickable)
                    <Box
                        key={`company-${group.company.id}`}
                        sx={{
                            px: 2,
                            py: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mt: groupIndex > 0 ? 0.5 : 0,
                        }}
                    >
                        <BusinessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            {group.company.name}
                            {group.company.code ? ` (${group.company.code})` : ''}
                        </Typography>
                    </Box>,

                    // Stores under this company
                    ...(group.stores.length > 0
                        ? group.stores.map((store) => (
                            <MenuItem
                                key={store.id}
                                onClick={() => handleStoreSelect(group.company.id, store.id)}
                                selected={store.id === activeStore?.id}
                                sx={{
                                    pl: 4,
                                    borderRadius: '10px',
                                    mx: 1,
                                    '&.Mui-selected': {
                                        bgcolor: 'primary.50',
                                        '&:hover': { bgcolor: 'primary.100' },
                                    },
                                }}
                            >
                                <ListItemIcon>
                                    {store.id === activeStore?.id ? (
                                        <CheckIcon fontSize="small" color="primary" />
                                    ) : (
                                        <StoreIcon fontSize="small" color="action" />
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={store.name}
                                    secondary={`${t('selector.code', 'Code')}: ${store.code}`}
                                    primaryTypographyProps={{
                                        fontWeight: store.id === activeStore?.id ? 700 : 400,
                                    }}
                                />
                            </MenuItem>
                        ))
                        : [
                            <MenuItem key={`no-stores-${group.company.id}`} disabled sx={{ pl: 4 }}>
                                <ListItemText
                                    primary={t('selector.noStores', 'No stores available')}
                                    sx={{ color: 'text.disabled' }}
                                />
                            </MenuItem>,
                        ]
                    ),

                    // Divider between groups (except last)
                    ...(groupIndex < groupedStores.length - 1
                        ? [<Divider key={`divider-${group.company.id}`} sx={{ my: 0.5 }} />]
                        : []
                    ),
                ])}
            </Menu>
        </>
    );
}

export default CompanyStoreSelector;
```

- [ ] **Step 4: Verify types compile**

**IMPORTANT type note:** The `Company` type from `authService.ts` (used in useAuthContext) does NOT have a `stores` property. Companies and stores are separate arrays on the User object. The `stores` array (from `useAuthContext`) has a `companyId` field on each store. The `groupedStores` memo above already handles this by filtering `stores.filter(s => s.companyId === company.id)`.

Verify that `useAuthContext` exposes `stores` (it does — line 118: `const stores = useMemo(() => getAccessibleStores(user), [user]);`). The `Store` type has `companyId: string` (authService.ts line 37).

Run `npx tsc --noEmit` to verify no type errors.

- [ ] **Step 5: Update AppHeader.tsx references**

In `src/shared/presentation/layouts/AppHeader.tsx`, the `CompanyStoreSelector` is used in two places:
- Line 171: `<CompanyStoreSelector compact />` (sm+ screens)
- Line 327: `<CompanyStoreSelector compact />` (mobile second row)

The `compact` prop still exists in the new component. No changes needed to AppHeader — the new component handles responsive behavior internally via display breakpoints.

However, since the mobile icon-only variant is now built into the component itself, the mobile second row in AppHeader (line 327) can use the same component without `compact`:

Change line 327 from:
```tsx
{user && <CompanyStoreSelector compact />}
```
to:
```tsx
{user && <CompanyStoreSelector />}
```

And line 171 can remain as `compact` for tablet breakpoint behavior:
```tsx
<CompanyStoreSelector compact />
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors related to CompanyStoreSelector or MainLayout.

- [ ] **Step 7: Commit**

```bash
git add src/features/auth/presentation/CompanyStoreSelector.tsx src/shared/presentation/layouts/AppHeader.tsx src/locales/en/common.json src/locales/he/common.json
git commit -m "feat: redesign CompanyStoreSelector with grouped menu and atomic switching

Stores grouped under company headers. All switches use setActiveContext
for atomic company+store transition. Responsive: desktop (company+store),
tablet (store name), mobile (icon-only). Gradient pill button stands out
from flat nav tabs."
```

---

## Chunk 3: Divergence Warnings + Final Verification (Tasks 5-6)

### Task 5: Add store override divergence warnings in StoreDialog

**Files:**
- Modify: `src/features/settings/presentation/StoreDialog.tsx`
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

The divergence warning appears in StoreDialog (where store overrides are edited), not EditCompanyTabs.

- [ ] **Step 1: Add translation keys**

In `src/locales/en/common.json`, add to the `"settings"` section (or wherever store dialog keys live):

```json
"storeFeatureDivergence": "This store's features differ from the company defaults. Store overrides take priority."
```

In `src/locales/he/common.json`:

```json
"storeFeatureDivergence": "תכונות החנות שונות מברירת המחדל של החברה. הגדרות החנות גוברות."
```

- [ ] **Step 2: Add divergence detection and warning Alert**

In `StoreDialog.tsx`, find where the store feature override toggle/checkboxes are rendered. Add an inline `<Alert severity="warning">` that shows when `overrideEnabled` is true and the store features differ from company features.

The detection logic:

```typescript
const featureDivergences = useMemo(() => {
    if (!overrideEnabled || !storeFeatures || !companyFeatures) return [];
    return Object.keys(companyFeatures).filter(
        key => key in storeFeatures && storeFeatures[key as keyof typeof storeFeatures] !== companyFeatures[key as keyof typeof companyFeatures]
    );
}, [overrideEnabled, storeFeatures, companyFeatures]);
```

Add `Alert` import from MUI and render conditionally:

```tsx
{featureDivergences.length > 0 && (
    <Alert severity="warning" sx={{ mt: 1 }}>
        {t('settings.storeFeatureDivergence')}
    </Alert>
)}
```

The exact insertion point depends on where the override checkboxes are in StoreDialog. Place it right after the feature toggles section.

- [ ] **Step 3: Thread companyFeatures as a prop**

StoreDialog currently receives `companyId` but not `companyFeatures`. The parent is `StoresDialog` (`src/features/settings/presentation/StoresDialog.tsx`), which receives `company: Company` (from `companyService.ts` — this Company type HAS `companyFeatures?: CompanyFeatures`).

**3a. Update StoreDialog interface** (StoreDialog.tsx line 75-81):
```typescript
interface StoreDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    companyId: string;
    companyFeatures?: CompanyFeatures;  // ADD THIS
    store?: CompanyStore | null;
}
```

Add `CompanyFeatures` to imports from `companyService` (or `authService` — both export it).

**3b. Update StoresDialog call site** (StoresDialog.tsx line 413-419):
```tsx
<StoreDialog
    open={true}
    onClose={handleStoreDialogClose}
    onSave={handleStoreSave}
    companyId={company.id}
    companyFeatures={company.companyFeatures}  // ADD THIS
    store={selectedStore}
/>
```

**3c. Destructure in StoreDialog** (line 83):
```typescript
export function StoreDialog({ open, onClose, onSave, companyId, companyFeatures, store }: StoreDialogProps) {
```

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/presentation/StoreDialog.tsx src/locales/en/common.json src/locales/he/common.json
git commit -m "feat: add divergence warning when store features override company defaults

Shows inline Alert in StoreDialog when store-level feature overrides
differ from the parent company's settings. Informational only — does
not block saves."
```

---

### Task 6: Final verification and build check

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run unit tests**

```bash
npm run test:unit -- --run
```

Expected: All existing tests pass.

- [ ] **Step 3: Run dev server and manually test**

```bash
npm run dev
```

Manual checks:
1. Open app, verify SphereLoader shows during store switch
2. Switch stores — verify logos, app name, tabs reset and reload correctly
3. Verify grouped dropdown shows all companies with stores
4. Verify desktop tabs align with main content width
5. Test mobile responsive — icon-only button, full dropdown

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address review findings from store isolation testing"
```

Only if fixes were needed from manual testing.
