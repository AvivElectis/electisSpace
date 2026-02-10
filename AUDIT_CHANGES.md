# Project Audit - Comprehensive Changes Document

## Overview

Full codebase audit of **electisSpace** - a multi-company, multi-store Electronic Shelf Label (ESL) management system integrating with SoluM AIMS API. The audit covered every server and client file, identified ~150 issues, and fixed ~75 of them across two batches.

**Branch:** `claude/project-audit-bugs-hqPHX`
**Commits:**
- `c9a1c07` — Batch 1: 23 files, 71 insertions, 126 deletions
- `17c6299` — Batch 2: 22 files, 151 insertions, 51 deletions

**Total:** 45 files modified across both batches

---

## Architecture Summary

```
electisSpace/
├── server/                    # Express.js + Prisma + PostgreSQL + Redis
│   ├── src/features/          # Domain features (auth, users, companies, stores, spaces, people, conference, sync, labels, settings)
│   ├── src/shared/            # Shared middleware, infrastructure, jobs
│   └── prisma/schema.prisma   # Database schema
├── src/                       # React + Vite + Zustand + MUI
│   ├── features/              # Feature modules (auth, people, spaces, labels, settings, sync, conference, dashboard)
│   └── shared/                # Shared services, types, hooks
└── package.json
```

### Key Data Flow
```
UI Components → Zustand Stores → API Client → Express Controllers → Services → Repository/Prisma → PostgreSQL
                                                                  ↓
                                                    SyncQueueProcessor → aimsGateway → SoluM AIMS API
```

---

## Batch 1 Fixes (Critical & High Severity)

### 1. Labels AIMS Body Format — ROOT CAUSE OF LABEL ASSIGN FAILURE

**Files:** `server/src/shared/infrastructure/services/solumService.ts`

**Problem:** The `linkLabel` and `unlinkLabel` methods were sending completely wrong body format to the SoluM AIMS API, making label assignment non-functional.

**Before:**
```typescript
// linkLabel - WRONG
const body = { labelCode, articleId };

// unlinkLabel - WRONG
const body = { labelCode };
```

**After:**
```typescript
// linkLabel - CORRECT (AIMS assignList format)
const assignEntry: any = { labelCode, articleIdList: [articleId] };
if (templateName) assignEntry.templateName = templateName;
const body = { assignList: [assignEntry] };

// unlinkLabel - CORRECT (AIMS unAssignList format)
const body = { unAssignList: [labelCode] };
```

**Impact:** Labels assign feature now works end-to-end. This was the single biggest blocker.

---

### 2. Client Labels Transform

**File:** `src/features/labels/infrastructure/labelsStore.ts`

**Problem:** `transformLabels` was reading wrong field names from AIMS response (`signalQuality` instead of `signal`, flat `articleId` instead of nested `articleList[0].articleId`).

**Impact:** Labels display now correctly parses AIMS response data.

---

### 3. Server Crash — mapServiceError

**Files:** `server/src/features/labels/controller.ts`, `server/src/features/conference/controller.ts`

**Problem:** `mapServiceError` threw on unknown errors instead of returning them, bypassing Express error handler and causing unhandled rejections/crashes.

**Before:**
```typescript
function mapServiceError(error: unknown): Error {
    if (error === 'FORBIDDEN') return forbidden('...');
    throw error;  // CRASHES THE SERVER
}
```

**After:**
```typescript
function mapServiceError(error: unknown): Error {
    if (error === 'FORBIDDEN') return forbidden('...');
    if (error instanceof Error) return error;
    return new Error(String(error));  // Safe fallback
}
```

**Impact:** Prevents server crashes from unexpected error types.

---

### 4. Security — Insecure Random Number Generation

**File:** `server/src/features/auth/service.ts`

**Problem:** 2FA codes and temporary passwords were generated using `Math.random()`, which is cryptographically insecure and predictable.

**After:** Uses `crypto.randomInt()` for both `generateCode()` and `generatePassword()`.

**Impact:** 2FA codes are no longer guessable via Math.random prediction.

---

### 5. Security — Refresh Token Leaked in Response Body

**File:** `server/src/features/auth/controller.ts`

**Problem:** After 2FA verification, the refresh token was sent in both the HttpOnly cookie AND the JSON response body, defeating XSS protection.

**After:** Strips `refreshToken` from response body before sending.

---

### 6. Security — JWT expiresIn Mismatch

**File:** `server/src/features/auth/service.ts`

**Problem:** JWT `expiresIn` claimed 3600 (1 hour) but actual token TTL was 900s (15 min). Clients cached an expired token thinking it was valid.

**After:** Both set to 900.

---

### 7. HTTP 400 → 403 for FORBIDDEN Errors

**Files:** `server/src/features/spaces/controller.ts`, `server/src/features/people/controller.ts`, `server/src/features/sync/controller.ts`

**Problem:** Authorization failures returned HTTP 400 Bad Request instead of 403 Forbidden (6 places).

**Impact:** Clients now receive proper 403 status codes for permission errors.

---

### 8. Pagination Limit DoS Protection

**Files:** `server/src/features/spaces/controller.ts`, `server/src/features/people/controller.ts`

**Problem:** Pagination limit accepted up to 10,000 items per request, enabling DoS via large queries.

**After:** Capped at 200.

---

### 9. React Rules of Hooks Violation

**File:** `src/features/settings/presentation/CompaniesTab.tsx`

**Problem:** Early return for auth check occurred before `useCallback` and `useEffect` hooks, violating React's rules of hooks.

**After:** Moved auth check after all hooks.

---

### 10. StoreAssignment Crash

**File:** `src/features/settings/presentation/StoreAssignment.tsx`

**Problem:** Used `assignments.length` (prop can be undefined) instead of `safeAssignments.length` (safely defaulted to []).

---

### 11. Items Count Overwrite

**File:** `server/src/features/spaces-lists/controller.ts`

**Problem:** Controller recalculated `itemCount` from content that the service had already set to `undefined`, overwriting the correct count with 0.

---

### 12. Missing Features for allStoresAccess Users

**File:** `server/src/features/stores/service.ts`

**Problem:** allStoresAccess users only got 4 of 6 features (`sync` and `settings` were missing).

---

### 13. SSE Fixes

**File:** `server/src/features/stores/events.routes.ts`

**Problems fixed:**
- Platform admins and allStoresAccess users were blocked from SSE
- `user.name` (doesn't exist) → `user.firstName`
- Removed debug console.logs and test messages

---

### 14. Other Batch 1 Fixes

| File | Fix |
|------|-----|
| `auth/types.ts` | Added digits-only regex for 2FA/reset codes |
| `users/types.ts` | Fixed password min from 6 to 8 |
| `conference/types.ts` | Added min(1) for externalId and roomName |
| `errorHandler.ts` | Changed if-chain to else-if |
| `solumConfig.ts` | Added aimsPasswordEnc check |
| `SecuritySettingsTab.tsx` | Fixed identical ternary, onKeyPress→onKeyDown |
| `StoresDialog.tsx` | Removed debug logs |
| `usePeopleAssignment.ts` | Removed debug logs |
| `usePeopleController.ts` | Removed ~23 debug log lines |

---

## Batch 2 Fixes (Authorization, Sync, State Management, Infrastructure)

### 15. CRITICAL — Users Service Authorization Bypass

**File:** `server/src/features/users/service.ts`

**Problem:** When a non-admin user had NO `STORE_ADMIN` stores, `managedStoreIds` was empty, and the store filter was not applied. This allowed any authenticated user to list ALL users in the system.

**Before:**
```typescript
if (managedStoreIds.length > 0 && !isPlatformAdmin(user)) {
    where.userStores = { some: { storeId: { in: managedStoreIds } } };
}
// When managedStoreIds is empty AND user is not admin → NO filter applied!
```

**After:**
```typescript
// Non-admin users with no managed stores get empty results
if (managedStoreIds.length === 0) {
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
}

// Always scope non-admin users
if (!isPlatformAdmin(user)) {
    where.userStores = { some: { storeId: { in: managedStoreIds } } };
}
```

---

### 16. Platform Admins Locked Out of Spaces

**Files:** `server/src/features/spaces/types.ts`, `server/src/features/spaces/service.ts`, `server/src/features/spaces/controller.ts`

**Problem:** `SpacesUserContext` lacked `globalRole`, so `validateStoreAccess` couldn't check if user was a platform admin. Platform admins with no explicit store assignments were blocked.

**After:**
- Added `globalRole` to `SpacesUserContext`
- Controller now passes `globalRole` from `req.user`
- `validateStoreAccess` skips check for platform admins

---

### 17. CRITICAL — Sync pushToAims Processes ALL Stores

**Files:** `server/src/features/sync/service.ts`, `server/src/shared/infrastructure/jobs/SyncQueueProcessor.ts`

**Problem:** `pushToAims(storeId)` validated access to a specific store and counted its pending items, but then called `processPendingItems()` without the storeId, processing items from ALL stores.

**After:**
- `processPendingItems()` now accepts optional `storeId` parameter
- Query filters by storeId when provided
- `pushToAims` passes storeId to scope processing

---

### 18. Missing Auth on Sync getJob Endpoint

**File:** `server/src/features/sync/controller.ts`, `server/src/features/sync/service.ts`

**Problem:** Any authenticated user could fetch ANY sync job by ID, including jobs from other users' stores.

**After:** Extracts user context, passes to service, validates store access before returning job data.

---

### 19. People Search Filter Ignored

**Files:** `server/src/features/people/service.ts`, `server/src/features/people/repository.ts`

**Problem:** The search parameter was accepted in the API and type definitions but never passed to the repository query.

**After:**
- Service passes `filters.search` to repository
- Repository adds `OR` filter on `externalId` and `virtualSpaceId` (case-insensitive)

---

### 20. AimsPullSyncJob Missing globalFieldAssignments

**File:** `server/src/shared/infrastructure/jobs/AimsPullSyncJob.ts`

**Problem:** Reconciliation built person articles WITHOUT globalFieldAssignments, while SyncQueueProcessor built them WITH it. This caused false "needs update" diffs and unnecessary re-syncs.

**After:** Fetches globalFieldAssignments from company settings and passes to `buildPersonArticle()`.

---

### 21. AimsVerificationJob Wrong Article ID Lookup

**File:** `server/src/shared/infrastructure/jobs/AimsVerificationJob.ts`

**Problems:**
1. Used `article.data?.ARTICLE_ID` fallback which doesn't exist in AIMS articles
2. Only flagged `POOL-*` articles as "extra in AIMS" — other stale articles were ignored

**After:**
- Simplified to `article.articleId || article.id`
- Removed POOL- restriction to detect all stale articles

---

### 22. AIMS Article Pagination Missing

**File:** `server/src/shared/infrastructure/services/aimsGateway.ts`

**Problem:** `pullArticles()` only fetched page 0 (first 100 articles). Stores with >100 articles had incomplete sync data.

**After:** Pagination loop fetches all pages until empty or `articles.length < PAGE_SIZE`, with MAX_PAGES safety limit of 50.

---

### 23. solumConfig — Wrong Company Field + Encrypted Password

**File:** `server/src/shared/utils/solumConfig.ts`

**Problems:**
1. Used `company.name` (display name) instead of `company.code` (AIMS identifier)
2. Returned encrypted password — callers expected decrypted

**After:**
- Uses `company.code`
- Added comment clarifying callers must decrypt

---

### 24. ProtectedRoute — Stale Persisted User

**File:** `src/features/auth/presentation/ProtectedRoute.tsx`

**Problem:** Check was `!isAuthenticated && !hasToken && !user` — if `user` existed in localStorage from a previous session but `isAuthenticated` was false and token was expired, the route still allowed access.

**After:** `!isAuthenticated && !hasToken` — doesn't rely on stale persisted user object.

---

### 25. AuthStore — Empty Token Validation

**File:** `src/features/auth/infrastructure/authStore.ts`

**Problem:** SOLUM auto-connect didn't validate that `response.tokens.accessToken` was non-empty. Empty/undefined token caused API calls to hang.

**After:** Validates token before storing: `if (!response.tokens?.accessToken) throw new Error(...)`.

---

### 26. Zustand Whole-Store Subscriptions (Performance)

**Files:**
- `src/features/people/application/hooks/usePeopleAIMS.ts`
- `src/features/people/application/hooks/usePeopleAssignment.ts`
- `src/features/people/application/hooks/usePeopleCSV.ts`
- `src/features/people/application/hooks/usePeopleLists.ts`

**Problem:** All hooks used `const store = usePeopleStore()` subscribing to the ENTIRE store, causing re-renders on ANY state change, defeating all `useCallback` memoization.

**After:**
- `usePeopleAIMS`: Uses individual selectors (`state => state.people`, etc.)
- Others: Use `useShallow` from `zustand/react/shallow` for selective subscriptions

---

### 27. Missing triggerPush in addPersonWithSync

**File:** `src/features/people/application/usePeopleController.ts`

**Problem:** `addPersonWithSync` created person on server (which auto-queues sync) but never called `triggerPush()` for immediate AIMS processing. All other mutation functions called `triggerPush()`.

**After:** Added `await triggerPush()` after both space assignment and plain creation paths.

---

### 28. SecuritySettingsTab — Async Await

**File:** `src/features/settings/presentation/SecuritySettingsTab.tsx`

**Problem:** `onSetPassword(newPassword)` was not awaited. Success dialog appeared before password was actually saved.

**After:** `await onSetPassword(newPassword)` + updated type to `void | Promise<void>`.

---

### 29. Database Indexes

**File:** `server/prisma/schema.prisma`

**Problem:** `Person.externalId` and `Person.virtualSpaceId` had no indexes despite being heavily queried in verification, sync, and search operations.

**After:** Added `@@index([externalId])` and `@@index([virtualSpaceId])`.

---

## Remaining Known Issues (Not Yet Fixed)

### Server
- DB query on every auth middleware request (should cache user context)
- N+1 queries in some sync job loops
- No SSE max connections limit
- Token leaked in SSE URL query parameter
- Race conditions in sync queue dedup (concurrent processors)
- `clearAllStores` inconsistency in auth service

### Client
- `usePeopleController` still uses `getState()` snapshot pattern (stale data risk)
- Camera barcode scanning is a stub (`window.prompt`)
- Blink feature has no UI button
- N+1 image fetch in labels list
- `templateName` never populated from AIMS format
- Massive code duplication between people hooks
- `loadPeopleFromCSV` only loads locally, no server persistence

### Infrastructure
- No migration for new Person indexes (needs `prisma migrate dev`)
- Redis not used for session store (could reduce DB auth queries)
- No rate limiting on auth endpoints
- No CORS restriction configuration

---

## Files Modified Summary

### Batch 1 (23 files)
| File | Changes |
|------|---------|
| `server/src/shared/infrastructure/services/solumService.ts` | AIMS body format fix |
| `server/src/features/labels/controller.ts` | mapServiceError crash fix |
| `server/src/features/conference/controller.ts` | mapServiceError + forbidden fix |
| `server/src/features/spaces-lists/controller.ts` | itemCount overwrite fix |
| `server/src/features/spaces/controller.ts` | FORBIDDEN→403, pagination limit |
| `server/src/features/people/controller.ts` | FORBIDDEN→403, pagination limit |
| `server/src/features/auth/service.ts` | crypto.randomInt, expiresIn, adminReset |
| `server/src/features/auth/types.ts` | Digits-only regex |
| `server/src/features/auth/controller.ts` | Strip refreshToken from body |
| `server/src/features/stores/events.routes.ts` | Platform admin SSE, user.name fix |
| `server/src/features/stores/service.ts` | Missing sync+settings features |
| `server/src/features/sync/controller.ts` | FORBIDDEN→403 |
| `server/src/features/users/types.ts` | Password min 6→8 |
| `server/src/features/conference/types.ts` | min(1) validation |
| `server/src/shared/middleware/errorHandler.ts` | else-if chain |
| `server/src/shared/utils/solumConfig.ts` | aimsPasswordEnc check |
| `src/features/labels/infrastructure/labelsStore.ts` | Transform labels fix |
| `src/features/settings/presentation/CompaniesTab.tsx` | Hooks violation |
| `src/features/settings/presentation/StoreAssignment.tsx` | Crash fix, debug logs |
| `src/features/settings/presentation/SecuritySettingsTab.tsx` | Identical ternary, onKeyPress |
| `src/features/settings/presentation/StoresDialog.tsx` | Debug logs |
| `src/features/people/application/hooks/usePeopleAssignment.ts` | Debug logs |
| `src/features/people/application/usePeopleController.ts` | Debug logs |

### Batch 2 (22 files)
| File | Changes |
|------|---------|
| `server/prisma/schema.prisma` | Person indexes |
| `server/src/features/people/repository.ts` | Search filter support |
| `server/src/features/people/service.ts` | Pass search to repository |
| `server/src/features/spaces/controller.ts` | Pass globalRole |
| `server/src/features/spaces/service.ts` | Platform admin check |
| `server/src/features/spaces/types.ts` | Add globalRole field |
| `server/src/features/sync/controller.ts` | Auth check on getJob |
| `server/src/features/sync/service.ts` | Scoped pushToAims, getJob auth |
| `server/src/features/users/service.ts` | Authorization bypass fix |
| `server/src/shared/infrastructure/jobs/AimsPullSyncJob.ts` | globalFieldAssignments |
| `server/src/shared/infrastructure/jobs/AimsVerificationJob.ts` | Article ID fix |
| `server/src/shared/infrastructure/jobs/SyncQueueProcessor.ts` | Scoped processing |
| `server/src/shared/infrastructure/services/aimsGateway.ts` | Pagination loop |
| `server/src/shared/utils/solumConfig.ts` | company.code fix |
| `src/features/auth/infrastructure/authStore.ts` | Token validation |
| `src/features/auth/presentation/ProtectedRoute.tsx` | Stale user fix |
| `src/features/people/application/hooks/usePeopleAIMS.ts` | Selective subscriptions |
| `src/features/people/application/hooks/usePeopleAssignment.ts` | useShallow |
| `src/features/people/application/hooks/usePeopleCSV.ts` | useShallow |
| `src/features/people/application/hooks/usePeopleLists.ts` | useShallow |
| `src/features/people/application/usePeopleController.ts` | Missing triggerPush |
| `src/features/settings/presentation/SecuritySettingsTab.tsx` | Await async |

---

## How Changes Affect Architecture

### Security Layer
- Auth middleware now produces correct error codes (403 vs 400)
- Token generation uses CSPRNG instead of Math.random
- Refresh tokens no longer leaked in response body
- 2FA codes validated as digits-only
- Protected routes require active auth, not stale localStorage

### Authorization Layer
- Users service properly scopes queries to managed stores
- Platform admins have universal store access (not locked out)
- Sync job access is now validated
- SSE connections properly check all access patterns (platform admin, allStoresAccess, store membership)

### AIMS Integration Layer
- Labels assign/unassign now sends correct AIMS body format
- Article pagination ensures all articles are fetched (not just first 100)
- Reconciliation and verification jobs produce consistent articles (globalFieldAssignments)
- Verification detects all stale articles, not just POOL-* prefixed ones
- Sync pushToAims processes only the target store, not all stores
- solumConfig uses company code (AIMS identifier) not display name

### Client State Management
- Zustand hooks use selective subscriptions, reducing unnecessary re-renders
- useShallow prevents object identity changes from triggering re-renders
- addPersonWithSync triggers immediate AIMS push
- Settings operations properly awaited before UI feedback

### Database Layer
- New indexes on Person.externalId and virtualSpaceId improve query performance
- People search filter now functional

### Error Handling
- mapServiceError returns errors instead of throwing (prevents crashes)
- SSE connections have proper error handling and keep-alive
- Auth store validates token presence before storing
