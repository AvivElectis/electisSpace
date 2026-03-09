# electisCompass — Weak Spots Audit (2026-03-09)

## Critical Issues

### 1. Neighborhood service missing companyId scoping
**Severity:** HIGH | **Files:** `server/src/features/compass-amenities/service.ts:37-68`

`listNeighborhoods(floorId)`, `updateNeighborhood(id, data)`, and `deleteNeighborhood(id)` don't verify the floor/neighborhood belongs to the requesting user's company. Although protected by `requireCompassAdmin()` at the route level, a platform admin could accidentally modify neighborhoods belonging to a different company.

**Fix:** Add company verification via floor → building → store → company chain in update/delete. For list, the floorId already scopes indirectly but should be validated.

### 2. Admin compass-spaces routes missing requireCompassAdminForStore
**Severity:** HIGH | **File:** `server/src/features/compass-spaces/routes.ts:19-20`

```typescript
adminCompassSpaceRoutes.put('/:id/mode', authenticate, controller.updateMode);
adminCompassSpaceRoutes.put('/:id/properties', authenticate, controller.updateProperties);
```

These routes only require `authenticate` — any authenticated admin user could modify spaces in any company. Should use `requireCompassAdminForStore` or equivalent.

### 3. SSO JWT_SECRET hardcoded fallback
**Severity:** MEDIUM | **File:** `server/src/features/sso/controller.ts:11`

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
```

If `JWT_SECRET` env var is missing in production, tokens would be signed with `'dev-secret'`. Should throw at startup if missing in production.

---

## Input Validation Gaps

### 4. SSO Zod schemas missing string length limits
**File:** `server/src/features/sso/types.ts`

- `x509Certificate`, `clientSecret`, `claimMapping` values have no max length
- Could allow unbounded payloads. Should add `.max()` limits.

### 5. Booking rule config schema too loose
**File:** `server/src/features/compass-bookings/types.ts:40`

```typescript
config: z.record(z.unknown())
```

Accepts any JSON object with no size/depth limits. Should constrain allowed keys and value types.

### 6. CompassSsoTab TextFields missing maxLength
**File:** `src/features/compass/presentation/CompassSsoTab.tsx`

None of the 9+ text fields have `inputProps.maxLength` — could submit arbitrarily long strings.

---

## Data Integrity

### 7. Booking race conditions on concurrent check-ins
**File:** `server/src/features/compass-bookings/service.ts`

The booking status transition (BOOKED → CHECKED_IN) doesn't use `SELECT FOR UPDATE` or optimistic locking. Two concurrent check-in requests for the same booking could both succeed.

### 8. SSO auto-provisioning creates user without default branch validation
**File:** `server/src/features/sso/service.ts:120-127`

`findOrCreateSsoUser()` picks the first store for the company as branchId. If the company has no stores, it throws. But if it has multiple, the user gets assigned to an arbitrary branch.

---

## Performance Concerns

### 9. Integration test connection fetches all users
**File:** `server/src/features/integrations/integrations.service.ts:testIntegrationConnection()`

The test connection function calls `adapter.fetchUsers()` which may return thousands of records from the directory. Should limit to a small page or use a dedicated connectivity check.

### 10. CompassPage renders all 9 tabs at once
**File:** `src/features/compass/presentation/CompassPage.tsx`

All tabs use `display:none` to preserve state. This means all 9 tabs mount their components and fetch data on first load. Consider lazy-loading inactive tabs.

---

## Missing Features

### 11. No audit log for SSO config changes
SSO config CRUD operations (create/update/delete) don't emit audit log entries. Changes to authentication configuration should be tracked.

### 12. No rate limiting on SSO auth endpoints
**File:** `server/src/features/sso/routes.ts`

The public SSO auth routes (`/login`, `/callback`, `/oidc/callback`) have no rate limiting. Could be used for domain enumeration (checking which domains have SSO configured).

### 13. Delete confirmation missing for SSO configs
**File:** `src/features/compass/presentation/CompassSsoTab.tsx`

The delete button calls `handleDelete` directly without a confirmation dialog, unlike the Integrations tab which has one.

### 14. No way to view sync error details for integrations
The integration table shows sync status chip but the full error message is only visible as a tooltip. Long errors get truncated.

---

## Additional Findings (Background Audit)

### 17. RRULE validation missing — DoS risk
**Severity:** HIGH | **File:** `server/src/features/compass-bookings/types.ts:10`

`recurrenceRule: z.string().max(255).optional()` accepts any string. Malformed RRULE passed to `rrulestr()` can cause parser hangs.

### 18. Organization cycle detection logic bug
**Severity:** MEDIUM | **File:** `server/src/features/compass-organization/service.ts:6-19`

`detectCycle()` reports "cycle" when depth > MAX_DEPTH=5. This is a false positive — it prevents deep org hierarchies, not just cycles.

### 19. ExternalId collision across providers
**Severity:** MEDIUM | **File:** `server/src/features/integrations/integrations.service.ts:192-194`

`findFirst` by `externalId` doesn't filter by provider. Two different providers could match the same user incorrectly.

### 20. Recurring booking overlap detection is exact-match only
**Severity:** MEDIUM | **File:** `server/src/features/compass-bookings/recurrenceService.ts:70-89`

Conflict check uses exact startTime match. Overlapping time ranges (10:00-10:30 vs 10:15-10:45) won't be detected.

### 21. Missing rate limiting on sync trigger endpoint
**Severity:** MEDIUM | **File:** `server/src/features/integrations/integrations.routes.ts`

`POST /:id/sync` has no rate limiting. Could trigger many parallel syncs.

---

## Code Quality

### 15. Inconsistent error handling patterns
- Some controllers use `try { ... } catch (err) { next(err); }` (correct)
- SSO controller uses the same pattern consistently (good)
- Some components show errors briefly with `setTimeout(() => setError(null), 5000)` which can cause state issues if component unmounts

### 16. Unused imports in compass mobile auth
**File:** `compass/src/features/auth/application/useCompassAuthStore.ts`

The `_refreshToken` parameter in `handleSsoCallback` is accepted but not used. The refresh token from SSO should be stored for token refresh functionality.

---

## Action Priority

| # | Issue | Effort | Priority |
|---|-------|--------|----------|
| 2 | Missing requireCompassAdminForStore | 5 min | P0 |
| 1 | Neighborhoods missing company scoping | 30 min | P0 |
| 3 | JWT_SECRET hardcoded fallback | 5 min | P1 |
| 12 | Rate limit SSO endpoints | 10 min | P1 |
| 13 | Delete confirmation for SSO | 5 min | P1 |
| 7 | Booking race condition | 30 min | P1 |
| 4 | SSO schema length limits | 10 min | P2 |
| 5 | Booking rule config schema | 10 min | P2 |
| 6 | TextField maxLength | 15 min | P2 |
| 9 | Test connection fetches all users | 15 min | P2 |
| 10 | Lazy-load compass tabs | 30 min | P3 |
| 11 | SSO audit log | 20 min | P3 |
