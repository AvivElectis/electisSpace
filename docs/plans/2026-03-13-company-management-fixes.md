# Company Management Bugs & Optimizations Plan

**Date:** 2026-03-13
**Branch:** `fix/company-management-bugs`
**Scope:** Company wizard, company switching, settings store, MainLayout sync, SSE, StoreRequiredGuard

---

## Phase 1: Store Switching — Data Integrity (Critical)

### 1A. Clear ALL feature stores on company/store switch
- **Files:** `authStore.ts`, `labelsStore.ts`, `rolesStore.ts`
- Add `clearAllData()` to labels store (proper method instead of raw setState)
- Add `clearAllData()` to roles store
- Import + call `useRolesStore`, `useAimsManagementStore`, `useOfflineQueueStore` in authStore
- Extract `clearAllFeatureStores()` helper, replace 3 duplicated blocks

### 1B. `setActiveCompany` must load new company settings + clear article format
- **File:** `authStore.ts`
- After clearing stores, also clear `solumArticleFormat` via settings store
- Fetch company-level settings (logos, features, branding) so UI updates immediately

### 1C. Gate MainLayout auto-sync on `isSwitchingStore`
- **File:** `MainLayout.tsx`
- Read `isSwitchingStore` from auth store
- Only trigger 500ms sync timer when `isSwitchingStore === false`

### 1D. Reset `autoSelectTriggered` ref on user change
- **File:** `StoreRequiredGuard.tsx`
- Track `user.id` in a ref; reset `autoSelectTriggered` when it changes

---

## Phase 2: Company Wizard Fixes

### 2A. Race condition — clear stale stores on connection test
- **File:** `CreateCompanyWizard.tsx`
- Clear `aimsStores` and `formData.stores` before fetch starts

### 2B. Validate store names/timezones in step 1
- **File:** `CreateCompanyWizard.tsx`
- Step 1 `isStepValid`: check every store has non-empty name and timezone

### 2C. Null-safe type casting on submit
- **File:** `CreateCompanyWizard.tsx`
- Explicit null check before casting articleFormat/fieldMapping

### 2D. Reset `codeAvailable` immediately on keystroke
- **File:** `CreateCompanyWizard.tsx`
- Set `codeAvailable(null)` at top of debounce effect before timer

### 2E. Server: wrap company+stores creation in transaction
- **File:** `server/src/features/companies/service.ts`
- Use `prisma.$transaction` for atomic company + stores creation

### 2F. FeaturesStep: fix `ms:` → `ml:`, add InputLabel to conference Select
- **File:** `FeaturesStep.tsx`

---

## Phase 3: EditCompanyTabs Fixes

### 3A. Fix stale closure in SortableFieldRow callbacks
- **File:** `EditCompanyTabs.tsx`
- Change `{ ...field, ...}` to `{ ...prev.fields[key], ...}` in all 3 callbacks

### 3B. Wire AIMS dialog `onSave` to refresh connection status
- **File:** `EditCompanyTabs.tsx`

### 3C. Use dedicated endpoints for article format + field mapping fetch
- **File:** `EditCompanyTabs.tsx`
- Replace `settingsService.getCompanySettings` with `fieldMappingService` calls

### 3D. Split `articleFormatLoading` into fetch vs save states
- **File:** `EditCompanyTabs.tsx`

### 3E. Fix `state` object in useCallback deps
- **File:** `EditCompanyTabs.tsx`
- Destructure specific values needed

---

## Phase 4: useCompanyDialogState Fixes

### 4A. Fix health-check interval leak on dialog re-open
- **File:** `useCompanyDialogState.ts`
- Clear interval at top of `open === true` branch

### 4B. Move `checkConnectionStatus` above the useEffect that calls it
- **File:** `useCompanyDialogState.ts`

### 4C. Save AIMS creds only after successful connection test
- **File:** `useCompanyDialogState.ts`

---

## Phase 5: Infrastructure Fixes

### 5A. SSE: reconnect on token refresh
- **File:** `storeEventsService.ts` or `useStoreEvents.ts`
- Track token; force reconnect when it changes

### 5B. CompanyStoreSelector: close menu after company selection
- **File:** `CompanyStoreSelector.tsx`

### 5C. Settings store: combine stale-data clear + isSyncing into single set()
- **File:** `settingsStore.ts`

### 5D. Dashboard: extract `can()` call to variable before useEffect dep array
- **File:** `DashboardPage.tsx`

---

## Phase 6: Shared Code Extraction

### 6A. Extract `generateInitialMapping` to shared domain file
- **New file:** `src/features/settings/domain/generateInitialMapping.ts`
- Update imports in `FieldMappingStep.tsx` and `EditCompanyTabs.tsx`

---

## Execution Order
Phases 1 → 2 → 6 → 3 → 4 → 5 (dependencies flow downward)
