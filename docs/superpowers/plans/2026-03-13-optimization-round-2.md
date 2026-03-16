# Optimization Round 2 — Bug Fixes & Hardening

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 30 bugs found across auth, sync, SSE, company dialogs, labels, and feature stores — covering critical race conditions, data integrity issues, and resource leaks.

**Architecture:** Fixes are organized into 8 independent phases by subsystem. Each phase can be committed independently. No new features — purely correctness and hardening.

**Tech Stack:** React 19, Zustand 5, Express 4, Prisma 7, PostgreSQL, Socket.IO/SSE, Axios

**Branch:** `fix/company-management-bugs` (already has Round 1 fixes applied)

---

## Chunk 1: Auth & Token Refresh Hardening

### Task 1: Unify dual token refresh mechanisms in apiClient.ts

**Files:**
- Modify: `src/shared/infrastructure/services/apiClient.ts:99-252`

The response interceptor (401 handler) and `doRefresh()` (proactive request interceptor) use independent dedup mechanisms (`isRefreshing`+`failedQueue` vs `refreshPromise`). Both can fire simultaneously, causing dual refresh calls and token invalidation.

- [ ] **Step 1: Merge both paths into `doRefresh()`**

In the response interceptor 401 handler (line ~183), replace the inline `axios.post('/auth/refresh')` call with a call to `doRefresh()`:

```typescript
// In the 401 response interceptor, replace lines ~195-230 with:
if (!originalRequest._retry) {
    originalRequest._retry = true;
    try {
        const newToken = await doRefresh();
        if (newToken) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return apiClient(originalRequest);
        }
    } catch (refreshError) {
        tokenManager.clearTokens();
        window.location.hash = '#/login';
        return Promise.reject(refreshError);
    }
}
```

- [ ] **Step 2: Remove `isRefreshing` and `failedQueue`**

Delete the now-unused `isRefreshing` variable, `failedQueue` array, and `processQueue`/`onRefreshed`/`onRefreshError` helpers. `doRefresh()` already deduplicates via `refreshPromise`.

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```
fix: unify dual token refresh mechanisms in apiClient
```

---

### Task 2: Fix `autoConnectToSolum` contradictory throw behavior

**Files:**
- Modify: `src/features/auth/infrastructure/authStore.ts:149-204`

The function comment says "don't throw" but line ~203 re-throws. All callers already catch, but the contract is misleading and fragile.

- [ ] **Step 1: Remove the re-throw**

In the `catch` block of `autoConnectToSolum`, remove `throw error;` and update the comment:

```typescript
} catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('AuthStore', 'Auto SOLUM connect failed', { error: message });
    // Fire-and-forget: callers continue regardless of AIMS state
}
```

- [ ] **Step 2: Add axios timeout to `authService.solumConnect`**

Find the `solumConnect` method in `src/shared/infrastructure/services/authService.ts` and add a timeout:

```typescript
solumConnect: async (storeId: string) => {
    const response = await apiClient.post(`/auth/solum/connect/${storeId}`, {}, { timeout: 15000 });
    return response.data;
},
```

This prevents `isSwitchingStore` from hanging indefinitely (fixes I5).

- [ ] **Step 3: Commit**

```
fix: remove contradictory re-throw in autoConnectToSolum, add timeout
```

---

## Chunk 2: SSE Token Staleness (C4)

### Task 3: Reconnect SSE on access token refresh

**Files:**
- Modify: `src/shared/infrastructure/services/apiClient.ts` — add token version counter
- Modify: `src/features/auth/infrastructure/authStore.ts` — expose tokenVersion
- Modify: `src/shared/presentation/hooks/useStoreEvents.ts:107-142` — depend on tokenVersion

- [ ] **Step 1: Add `tokenVersion` to auth store**

In `authStore.ts`, add a `tokenVersion: number` field initialized to `0`. Increment it in the `doRefresh` callback (or wherever `tokenManager.setAccessToken()` is called):

```typescript
// In the store state interface:
tokenVersion: number;

// In initial state:
tokenVersion: 0,

// After successful token refresh (in doRefresh/setAccessToken wrapper):
set(state => ({ tokenVersion: state.tokenVersion + 1 }), false, 'tokenRefreshed');
```

- [ ] **Step 2: Add tokenVersion to useStoreEvents dependency**

In `useStoreEvents.ts`, subscribe to `tokenVersion` and add it to the useEffect deps:

```typescript
const tokenVersion = useAuthStore(state => state.tokenVersion);

useEffect(() => {
    if (!activeStoreId) {
        if (disconnectRef.current) {
            disconnectRef.current();
            disconnectRef.current = null;
        }
        return;
    }

    // Connect (or reconnect on token change)
    const { disconnect } = connectToStoreEvents(activeStoreId, handleEvent, handleError);
    disconnectRef.current = disconnect;

    return () => {
        disconnect();
        disconnectRef.current = null;
    };
}, [activeStoreId, tokenVersion]);
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```
fix: reconnect SSE when access token refreshes (C4)
```

---

## Chunk 3: Settings Store Hardening

### Task 4: Replace `isSyncing` boolean with counter

**Files:**
- Modify: `src/features/settings/infrastructure/settingsStore.ts`

- [ ] **Step 1: Change `isSyncing: boolean` to `syncCount: number`**

```typescript
// Interface:
syncCount: number;  // replaces isSyncing

// Initial state:
syncCount: 0,

// Add computed getter:
get isSyncing() { return get().syncCount > 0; },
```

- [ ] **Step 2: Replace all `set({ isSyncing: true/false })` calls**

Every async operation start: `set(s => ({ syncCount: s.syncCount + 1 }))`
Every async operation end (success or error): `set(s => ({ syncCount: Math.max(0, s.syncCount - 1) }))`

Use `try/finally` blocks to guarantee decrement.

- [ ] **Step 3: Update all consumers**

Search for `state.isSyncing` or `isSyncing` selectors and update to `state.syncCount > 0`.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```
fix: replace shared isSyncing boolean with syncCount counter (I4)
```

---

### Task 5: Consolidate two-step `set()` in fetchSettingsFromServer

**Files:**
- Modify: `src/features/settings/infrastructure/settingsStore.ts:135-288`

- [ ] **Step 1: Merge the initial `set({ isSyncing: true })` into the final `set()` call**

Remove the early `set({ syncCount+1 })` (from Task 4). Instead, increment syncCount AND set all values in one atomic `set()` at the top, using the pattern:

```typescript
fetchSettingsFromServer: async (storeId, companyId) => {
    set(s => ({ syncCount: s.syncCount + 1 }), false, 'fetchSettings/start');
    try {
        // ... all the fetching logic ...
        // ONE set() call with all merged values:
        set({
            settings: mergedSettings,
            activeStoreId: storeId,
            activeCompanyId: companyId,
            lastSyncedAt: new Date().toISOString(),
        }, false, 'fetchSettings/success');
    } catch (error) {
        // error handling
    } finally {
        set(s => ({ syncCount: Math.max(0, s.syncCount - 1) }), false, 'fetchSettings/done');
    }
},
```

- [ ] **Step 2: Add fetch sequence guard**

Add a module-level counter to discard stale fetches:

```typescript
let fetchSeq = 0;

// At start of fetchSettingsFromServer:
const mySeq = ++fetchSeq;

// Before the final set():
if (fetchSeq !== mySeq) return; // stale response, discard
```

- [ ] **Step 3: Commit**

```
fix: consolidate two-step set() in fetchSettingsFromServer (I12), add sequence guard (M4)
```

---

## Chunk 4: Company Dialog Fixes

### Task 6: Wire AIMS dialog `onSave` in EditCompanyTabs

**Files:**
- Modify: `src/features/settings/presentation/companyDialog/EditCompanyTabs.tsx:1075-1080`
- Modify: `src/features/settings/presentation/companyDialog/useCompanyDialogState.ts` — expose `checkConnectionStatus`

- [ ] **Step 1: Expose `checkConnectionStatus` from hook**

In `useCompanyDialogState.ts`, add `checkConnectionStatus` to the return object:

```typescript
return {
    // ... existing ...
    checkConnectionStatus,
};
```

- [ ] **Step 2: Pass `onSave` to AIMSSettingsDialog**

```tsx
<AIMSSettingsDialog
    open={true}
    onClose={() => setAimsDialogOpen(false)}
    company={state.company}
    onSave={() => {
        if (state.company?.id) {
            state.checkConnectionStatus(state.company.id);
        }
    }}
/>
```

- [ ] **Step 3: Commit**

```
fix: wire AIMS dialog onSave to refresh connection status (I1)
```

---

### Task 7: Fix AIMS creds saved before connection test

**Files:**
- Modify: `src/features/settings/presentation/companyDialog/useCompanyDialogState.ts:229-261`

- [ ] **Step 1: Reorder `handleTestConnection` — test first, save on success**

```typescript
const handleTestConnection = async () => {
    if (!company?.id) return;
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
        // If credentials changed, test with a temporary config first
        if (aimsChanged && aimsBaseUrl && aimsCluster && aimsUsername) {
            const aimsData: UpdateAimsConfigDto = {
                baseUrl: aimsBaseUrl.trim(),
                cluster: aimsCluster.trim(),
                username: aimsUsername.trim(),
            };
            if (aimsPassword) aimsData.password = aimsPassword;

            // Test connection first (server tests without persisting)
            const result = await fieldMappingService.testAimsConnection(company.id, aimsData);
            setConnectionTestResult({ success: result.success, message: result.message });

            if (result.success) {
                // Only save after successful test
                await companyService.updateAimsConfig(company.id, aimsData);
                setAimsChanged(false);
                setIsConnected(true);
                startHealthCheck(company.id);
            } else {
                setIsConnected(false);
            }
        } else {
            // No changes — just test existing config
            const result = await fieldMappingService.testAimsConnection(company.id);
            setConnectionTestResult({ success: result.success, message: result.message });
            if (result.success) {
                setIsConnected(true);
                startHealthCheck(company.id);
            } else {
                setIsConnected(false);
            }
        }
    } catch (err: any) {
        setConnectionTestResult({
            success: false,
            message: err.response?.data?.message || t('settings.companies.connectionTestError'),
        });
        setIsConnected(false);
    } finally {
        setTestingConnection(false);
    }
};
```

Note: This requires the server's `testAimsConnection` endpoint to accept optional credentials for testing without saving. If the endpoint doesn't support this, a new server endpoint is needed — check `fieldMappingService.testAimsConnection` signature first.

- [ ] **Step 2: Commit**

```
fix: test AIMS connection before saving credentials (I6)
```

---

### Task 8: Fix EditCompanyTabs data fetch + articleFormatLoading split

**Files:**
- Modify: `src/features/settings/presentation/companyDialog/EditCompanyTabs.tsx`

- [ ] **Step 1: Add `open` prop to EditCompanyTabs and add to fetch useEffect deps**

Thread `open` through from `CompanyDialog.tsx` → `EditCompanyTabs` props. Add to the data fetch useEffect:

```typescript
// Props interface:
interface EditCompanyTabsProps {
    state: ReturnType<typeof useCompanyDialogState>;
    onClose: () => void;
    open: boolean;  // ADD
}

// useEffect:
useEffect(() => {
    if (!state.company?.id || !open) return;
    // ... fetch stores and settings
}, [state.company?.id, open]);
```

- [ ] **Step 2: Split `articleFormatLoading` into two flags**

```typescript
const [articleFormatFetching, setArticleFormatFetching] = useState(false);
const [articleFormatSaving, setArticleFormatSaving] = useState(false);

// In handleRefetchArticleFormat: use setArticleFormatFetching
// In handleSaveArticleFormat: use setArticleFormatSaving
// In render: disabled={articleFormatFetching || articleFormatSaving || !state.company?.aimsConfigured}
```

- [ ] **Step 3: Fix Math.max spread**

```typescript
// Replace:
const maxOrder = Math.max(...Object.values(existingFields).map(f => f.order ?? 0), -1);
// With:
const maxOrder = Object.values(existingFields).reduce((max, f) => Math.max(max, f.order ?? 0), -1);
```

- [ ] **Step 4: Commit**

```
fix: EditCompanyTabs data re-fetch on reopen (I8), split loading flags (I9), safe max order
```

---

## Chunk 5: People & Sync Correctness

### Task 9: Fix missing await on deletePerson

**Files:**
- Modify: `src/features/people/presentation/PeopleManagerView.tsx:302-314`

- [ ] **Step 1: Add await**

```typescript
if (confirmed) {
    try {
        await peopleController.deletePerson(id);
    } catch (error: any) {
        logger.error('PeopleManagerView', 'Failed to delete person', { error: error?.message });
    }
}
```

- [ ] **Step 2: Commit**

```
fix: await deletePerson to catch errors
```

---

### Task 10: Fix sync status always marked 'synced' after triggerPush

**Files:**
- Modify: `src/features/people/application/usePeopleController.ts`

- [ ] **Step 1: Make `triggerPush` return a boolean**

```typescript
const triggerPush = useCallback(async (): Promise<boolean> => {
    try {
        const activeStoreId = useAuthStore.getState().activeStoreId;
        if (!activeStoreId) return false;
        await syncApi.push(activeStoreId);
        return true;
    } catch (error: any) {
        logger.warn('PeopleController', 'Push after operation failed', { error: error.message });
        return false;
    }
}, []);
```

- [ ] **Step 2: Update all callers to conditionally set sync status**

At every `updateSyncStatusLocal([...], 'synced')` call (lines ~258, 292, 483, 512, 647):

```typescript
const pushed = await triggerPush();
getStoreState().updateSyncStatusLocal([personId], pushed ? 'synced' : 'error');
```

- [ ] **Step 3: Commit**

```
fix: sync status reflects actual AIMS push result
```

---

### Task 11: Fix `Date.now()` in people list IDs

**Files:**
- Modify: `src/features/people/infrastructure/peopleStore.ts`

- [ ] **Step 1: Use deterministic ID**

```typescript
// Replace:
id: `list_${storageName}_${Date.now()}`,
// With:
id: `list_${storageName}`,
```

- [ ] **Step 2: Commit**

```
fix: use deterministic list IDs to prevent duplicates
```

---

### Task 12: Fix useOfflineQueue syncingRef not reset in finally

**Files:**
- Modify: `src/features/sync/application/useOfflineQueue.ts:134-200`

- [ ] **Step 1: Wrap syncQueue body in try/finally**

```typescript
const syncQueue = useCallback(async () => {
    if (!storeId || syncingRef.current) {
        return { succeeded: 0, failed: 0 };
    }
    syncingRef.current = true;
    setSyncing(true);
    try {
        // ... existing loop logic ...
        return { succeeded, failed };
    } finally {
        syncingRef.current = false;
        setSyncing(false);
    }
}, [storeId]);
```

- [ ] **Step 2: Commit**

```
fix: guarantee syncingRef reset in useOfflineQueue
```

---

## Chunk 6: Dashboard & Conference Fixes

### Task 13: Wire onSync to Dashboard controllers

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx:147-156`

- [ ] **Step 1: Add handleSync and pass to controllers**

Find how `handleSync` is defined in `SpacesManagementView.tsx` and replicate the pattern:

```typescript
const handleSync = useCallback(async () => {
    if (!activeStoreId) return;
    try {
        await syncApi.push(activeStoreId);
    } catch (error: any) {
        logger.warn('DashboardPage', 'Sync push failed', { error: error.message });
    }
}, [activeStoreId]);

const spaceController = useSpaceController({
    csvConfig: settingsController.settings.csvConfig,
    solumMappingConfig: settingsController.settings.solumMappingConfig,
    onSync: handleSync,
});

const conferenceController = useConferenceController({
    solumConfig: ...,
    solumToken: ...,
    solumMappingConfig: ...,
    onSync: handleSync,
});
```

- [ ] **Step 2: Commit**

```
fix: wire onSync to Dashboard controllers for AIMS push
```

---

### Task 14: Fix ConferencePage console.log and labelPages ref

**Files:**
- Modify: `src/features/conference/presentation/ConferencePage.tsx`

- [ ] **Step 1: Replace console.log with logger**

```typescript
// Replace:
console.log('[ConferencePage] SSE event received:', event);
// With:
logger.debug('ConferencePage', 'SSE event received', { type: event.type });
```

- [ ] **Step 2: Reset labelPagesFetchedRef on isSimpleMode change**

```typescript
// Update the reset effect:
useEffect(() => {
    labelPagesFetchedRef.current = false;
    setLabelPages({});
}, [activeStoreId, isSimpleMode]);
```

- [ ] **Step 3: Commit**

```
fix: replace console.log, reset label pages ref on mode toggle
```

---

## Chunk 7: MainLayout Memoization Fix

### Task 15: Fix settings object reference defeating memoization

**Files:**
- Modify: `src/shared/presentation/layouts/MainLayout.tsx:91,114-123`

- [ ] **Step 1: Select individual primitives instead of object**

```typescript
// Replace:
const settings = useSettingsStore(state => state.settings);

// With individual selectors:
const peopleManagerEnabled = useSettingsStore(state => state.settings.peopleManagerEnabled);
const workingMode = useSettingsStore(state => state.settings.workingMode);
```

- [ ] **Step 2: Update handleSpaceUpdate deps**

```typescript
const handleSpaceUpdate = useCallback((spaces: any[]) => {
    if ((activeStoreEffectiveFeatures?.peopleEnabled ?? peopleManagerEnabled) && workingMode === 'SOLUM_API') {
        logger.info('MainLayout', 'Skipping spaces update (people managed by server)', {
            articlesCount: spaces.length
        });
        return;
    }
    setSpaces(spaces);
}, [setSpaces, peopleManagerEnabled, workingMode, activeStoreEffectiveFeatures]);
```

- [ ] **Step 3: Update any other references to `settings.X` in MainLayout**

Search for remaining `settings.` usages in MainLayout and either add individual selectors or replace with the new variables.

- [ ] **Step 4: Commit**

```
fix: select primitive settings values to prevent memoization cascade (I10)
```

---

## Chunk 8: Server-Side Fixes

### Task 16: Fix SyncQueueProcessor concurrent processing

**Files:**
- Modify: `server/src/shared/infrastructure/jobs/SyncQueueProcessor.ts`
- Modify: `server/src/features/sync/service.ts:111`

- [ ] **Step 1: Guard `processPendingItems` with isRunning**

```typescript
async processPendingItems(storeId?: string): Promise<ProcessResult> {
    if (this.isRunning) {
        logger.info('SyncQueueProcessor', 'Already running, skipping');
        return { processed: 0, succeeded: 0, failed: 0, errors: [] };
    }
    this.isRunning = true;
    try {
        // ... existing logic ...
    } finally {
        this.isRunning = false;
    }
}
```

- [ ] **Step 2: Pass storeId in triggerSync**

```typescript
// In sync/service.ts triggerSync:
const result = await syncQueueProcessor.processPendingItems(input.storeId);
```

- [ ] **Step 3: Commit**

```
fix: guard processPendingItems with isRunning, scope triggerSync to store
```

---

### Task 17: Fix SSE 503 after headers flushed

**Files:**
- Modify: `server/src/features/stores/events.routes.ts`

- [ ] **Step 1: Move connection limit check before flushHeaders**

```typescript
// Check BEFORE flushing:
const wouldAccept = sseManager.canAcceptClient(storeId);
if (!wouldAccept) {
    return res.status(503).json({
        error: { code: 'TOO_MANY_CONNECTIONS', message: 'Connection limit reached' }
    });
}

// Then set headers and flush:
res.writeHead(200, { ... });
res.flushHeaders();

// Then add client (should always succeed now):
const accepted = sseManager.addClient({ ... });
```

Add `canAcceptClient(storeId)` method to `SseManager`:

```typescript
canAcceptClient(storeId: string): boolean {
    return this.clients.size < this.maxClients;
}
```

- [ ] **Step 2: Commit**

```
fix: check SSE connection limit before flushing headers
```

---

### Task 18: Fix string throws in labels service

**Files:**
- Modify: `server/src/features/labels/service.ts:18,25`

- [ ] **Step 1: Replace string throws with AppError**

```typescript
// Replace:
throw 'FORBIDDEN';
// With:
throw forbidden('Access denied to this store');

// Replace:
throw 'AIMS_NOT_CONFIGURED';
// With:
throw badRequest('AIMS not configured for this store');
```

Import `forbidden` and `badRequest` from the shared error module.

- [ ] **Step 2: Update `mapServiceError` in labels controller**

Check if `mapServiceError` in `server/src/features/labels/controller.ts` needs updating — it currently checks `error === 'FORBIDDEN'` which won't match an Error object.

- [ ] **Step 3: Commit**

```
fix: use AppError instead of string throws in labels service
```

---

## Final Verification

### Task 19: Full build check and type verification

- [ ] **Step 1: Run client type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Run server type check**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Run client build**

```bash
npm run build
```

- [ ] **Step 4: Run server build**

```bash
cd server && npm run build
```

- [ ] **Step 5: Final commit if any lint/type fixes needed**

```
chore: fix type errors from optimization round 2
```

---

## Issues Deferred (Low Priority / Needs More Context)

These were identified but are better handled in a separate task:

| ID | Issue | Reason Deferred |
|----|-------|----------------|
| H9 | Labels store direct AIMS calls bypass server gateway | Large refactor — needs new server endpoints and migration of 4 AIMS call sites |
| M2 | CompanyStoreSelector local switching desyncs | Low impact — cosmetic double-click risk |
| M3 | Hardcoded 1-hour AIMS token expiry | Server-side token management handles this |
| M7 | Order-dependent label diff | Performance nit, not correctness |
| M8 | processItemById races with tick() | Low frequency — only manual retries |
