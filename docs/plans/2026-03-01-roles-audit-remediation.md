# Roles System Audit Remediation Plan

**Date:** 2026-03-01
**Branch:** `fix/roles-audit-remediation`
**Prerequisite:** Merge PR from `feature/5-tasks-sphere-roles-spaces-docs-settings` first

---

## Context

A comprehensive audit of the roles and permissions system was performed across the entire
codebase (client + server). The system uses a three-tier role architecture:

- **App roles (GlobalRole):** `PLATFORM_ADMIN`, `APP_VIEWER`, `null` (regular user)
- **Company roles (DB-backed):** `role-admin`, `role-manager`, `role-employee`, `role-viewer`
- **Store roles (DB-backed):** Same IDs, scoped per store, with feature toggles

The audit found 16 issues across security, functional, and polish categories.
This plan addresses all of them in priority order.

---

## Phase 1 — Critical Security Fixes

### 1.1 Protect Roles CRUD endpoints

**Problem:** All `/api/v1/roles/` routes only require `authenticate + restrictAppViewer()`.
Any authenticated user can create, update, or delete system roles.

**Files:**
- `server/src/features/roles/roles.routes.ts`

**Changes:**
- Add `requireGlobalRole('PLATFORM_ADMIN')` to POST, PATCH, DELETE routes
- Add `requirePermission('settings', 'view')` to GET routes (or at minimum scope to
  company admins who manage their own custom roles)

---

### 1.2 Fix hardcoded `role-admin` in allStoresAccess expansion

**Problem:** `server/src/shared/middleware/auth.ts` ~line 207 — when expanding stores for
`allStoresAccess=true`, ALL stores get `roleId='role-admin'` hardcoded. A company
`role-manager` with `allStoresAccess` silently becomes store admin on every store.

**Files:**
- `server/src/shared/middleware/auth.ts`

**Changes:**
- Instead of hardcoding `'role-admin'`, use the user's actual company `roleId` from the
  `UserCompany` entry when expanding stores
- Mapping: company `role-admin` → store `role-admin`, company `role-manager` → store
  `role-manager`, etc.

---

### 1.3 Add route-level middleware to elevate endpoint

**Problem:** `POST /users/:id/elevate` has no `requireGlobalRole('PLATFORM_ADMIN')`
middleware. Defense-in-depth missing — any non-viewer user can hit the endpoint.

**Files:**
- `server/src/features/users/users.routes.ts`

**Changes:**
- Add `requireGlobalRole('PLATFORM_ADMIN')` middleware to the elevate route definition

---

### 1.4 Validate roleId on user creation and assignment

**Problem:** When creating UserCompany or UserStore, no check that the provided `roleId`
actually exists in the roles table. Invalid IDs cause opaque Prisma FK errors.

**Files:**
- `server/src/features/users/service.ts` — `create()`, `assignToCompany()`, `assignToStore()`

**Changes:**
- Before creating UserCompany/UserStore, query the roles table to verify `roleId` exists
- Return `badRequest('Invalid role ID')` if not found

---

## Phase 2 — High Priority Functional Fixes

### 2.1 Remove dead `authorize()` middleware

**Problem:** `authorize(...allowedRoleNames)` in `server/src/shared/middleware/auth.ts`
~line 250 is defined but never imported or used. Confusing dead code.

**Files:**
- `server/src/shared/middleware/auth.ts`

**Changes:**
- Remove the `authorize()` function entirely

---

### 2.2 Add permission checks to settings endpoints

**Problem:** Settings read/write endpoints have no permission checks beyond authentication.
Any authenticated user can read any company's settings by guessing the ID.

**Files:**
- `server/src/features/settings/settings.routes.ts`

**Changes:**
- Add `requirePermission('settings', 'view')` to GET endpoints
- Add `requirePermission('settings', 'edit')` to PUT endpoints
- Alternatively, validate company/store membership in the service layer

---

### 2.3 Add route-level guards to bulk user operations

**Problem:** `POST /users/bulk/deactivate`, `bulk/activate`, `bulk/role` have no
route-level middleware checks.

**Files:**
- `server/src/features/users/users.routes.ts`

**Changes:**
- Add `requirePermission('users', 'edit')` to bulk routes

---

### 2.4 Add audit logging for role changes

**Problem:** Elevating users, assigning company/store roles, changing permissions — none
create audit log entries. Cannot track privilege escalation.

**Files:**
- `server/src/features/users/service.ts` — `elevate()`, `assignToCompany()`,
  `assignToStore()`, `updateUserCompany()`, `updateUserStore()`

**Changes:**
- Create AuditLog entries with `action: 'ROLE_CHANGE'`, `entityType: 'USER'`,
  capturing old and new role values, and `userId` of who made the change
- Include `oldData` / `newData` JSON fields for before/after state

---

## Phase 3 — Medium Priority Improvements

### 3.1 Refactor APP_VIEWER exception handling

**Problem:** `restrictAppViewer()` has hardcoded URL exceptions. New self-service
endpoints must remember to update the list.

**Files:**
- `server/src/shared/middleware/auth.ts`

**Changes:**
- Move exception patterns to a configuration constant
- Or use a route-level opt-in approach (tag routes as `viewerSafe`)

---

### 3.2 Show all company/store roles in user profile

**Problem:** `getRoleLabel()` in `useUserDialogState.ts` only shows `companies[0]` role.
Multi-company users only see their first assignment.

**Files:**
- `src/features/settings/presentation/userDialog/useUserDialogState.ts`
- `src/features/settings/presentation/userDialog/UserProfileHeader.tsx`

**Changes:**
- Update `getRoleLabel()` to return the highest-priority role across all assignments
- Or show multiple role chips in the profile header

---

### 3.3 Add role scope indicators in user table

**Problem:** An "Admin" chip in the user list has no scope context — is it app, company,
or store level?

**Files:**
- `src/features/settings/presentation/UsersSettingsTab.tsx`

**Changes:**
- Differentiate chip labels: "App Admin" vs "Company Admin" vs "Store Admin"
- Or use different colors/icons for each scope level

---

### 3.4 Standardize `read`/`view` and `update`/`edit` action aliases

**Problem:** Permission types define `'read'` and `'view'` as separate actions.
Some code paths check one, some the other. Potential bypass if mismatched.

**Files:**
- `server/src/features/roles/types.ts`
- `server/src/shared/middleware/auth.ts` — `requirePermission()`

**Changes:**
- Normalize actions in `requirePermission()`: map `'read'` → `'view'` and
  `'update'` → `'edit'` before checking
- Or remove the aliases from the types entirely and update all references

---

## Phase 4 — Low Priority Polish

### 4.1 Validate feature arrays in UserStore

**Problem:** `features: ["dashboard", "spaces"]` stored as JSON with no validation.
Typos won't be caught.

**Files:**
- `server/src/features/users/service.ts`

**Changes:**
- Validate feature names against `AVAILABLE_FEATURES` constant before saving

---

### 4.2 Unify translation key naming convention

**Problem:** Some keys use `underscore_case` (`admin_desc`), others use
`camelCase` (`adminDesc`).

**Files:**
- `src/locales/en/common.json`
- `src/locales/he/common.json`

**Changes:**
- Audit all role-related translation keys and standardize on one convention
- Update component references accordingly

---

### 4.3 Improve user context cache invalidation

**Problem:** User context cached for 60s. If roles change, stale cache serves old
permissions. `invalidateUserCache()` depends on every code path remembering to call it.

**Files:**
- `server/src/shared/middleware/auth.ts`

**Changes:**
- Add `invalidateUserCache()` calls to all role mutation paths that don't already have it
- Consider reducing TTL or using event-driven invalidation

---

## Verification Checklist

After implementation, verify:

- [ ] Non-platform-admin cannot access `/api/v1/roles` write endpoints
- [ ] Company manager with `allStoresAccess` gets manager (not admin) on expanded stores
- [ ] Non-platform-admin calling `/users/:id/elevate` gets 403 at middleware level
- [ ] Invalid `roleId` on user creation returns 400 (not 500 FK error)
- [ ] Settings endpoints return 403 for users without permission
- [ ] Bulk user operations return 403 for unauthorized callers
- [ ] Audit logs contain entries for all role changes with before/after state
- [ ] `read`/`view` aliases resolve to same permission
- [ ] User table chips show scope context (App/Company/Store)
- [ ] Feature arrays with invalid names are rejected

---

## Files Summary

| File | Phase | Changes |
|------|-------|---------|
| `server/src/features/roles/roles.routes.ts` | 1.1 | Add requireGlobalRole/requirePermission |
| `server/src/shared/middleware/auth.ts` | 1.2, 2.1, 3.1, 4.3 | Fix allStoresAccess, remove authorize(), refactor viewer exceptions, cache |
| `server/src/features/users/users.routes.ts` | 1.3, 2.3 | Add middleware to elevate + bulk routes |
| `server/src/features/users/service.ts` | 1.4, 2.4 | Validate roleId, add audit logging |
| `server/src/features/settings/settings.routes.ts` | 2.2 | Add permission checks |
| `server/src/features/roles/types.ts` | 3.4 | Standardize action aliases |
| `src/features/settings/presentation/userDialog/useUserDialogState.ts` | 3.2 | Multi-role display |
| `src/features/settings/presentation/userDialog/UserProfileHeader.tsx` | 3.2 | Multi-role chips |
| `src/features/settings/presentation/UsersSettingsTab.tsx` | 3.3 | Scope indicators |
| `src/locales/en/common.json` | 4.2 | Standardize keys |
| `src/locales/he/common.json` | 4.2 | Standardize keys |
