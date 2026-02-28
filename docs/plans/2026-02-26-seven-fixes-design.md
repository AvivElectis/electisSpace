# Design: Seven Production Fixes & Role Redesign

**Date:** 2026-02-26
**Branch:** `fix/seven-production-fixes` (from latest `main`)
**Author:** Aviv Ben Waiss + Claude

---

## Issue 1: CI/CD Orphan Containers + npm Update

### Problem
`deploy-ubuntu.yml` line 51 starts `loki`, `promtail`, `grafana` from `docker-compose.infra.yml` but those services were removed (moved to global-infra stack). Produces orphan container warnings on every deploy.

### Solution
- Remove the observability start step (lines 50-51) from `deploy-ubuntu.yml`
- Add `--remove-orphans` flag to `docker compose up -d server client` to clean up leftover containers
- Remove the one-time migration resolve hack (line 40)
- Add `npm install -g npm@latest` in both:
  - CI runner (before docker build)
  - Production deploy script (SSH step, before docker compose build)

### Files Changed
- `.github/workflows/deploy-ubuntu.yml`

---

## Issue 2 + 7: Roles & Permissions Redesign (Unified)

### Problem
- 3 separate role layers (GlobalRole, CompanyRole, StoreRole) that conflict
- CompanyRole enum has store-level names (STORE_ADMIN, STORE_VIEWER) causing confusion
- Store assignment returns 400 when changing role to STORE_MANAGER
- Hardcoded permission matrix — admins can't customize
- No custom roles capability
- No single source of truth for what a user can do

### Solution: Complete Role/Permission Overhaul

#### Database Changes (Prisma)

**New `Role` table:**
```
Role {
  id          String   @id @default(uuid())
  name        String                          // "Admin", "Manager", "Viewer", custom names
  description String?
  scope       RoleScope                       // SYSTEM | COMPANY
  companyId   String?                         // null = system-wide, set = company-specific
  permissions Json                            // { spaces: ["view","create","edit","delete"], ... }
  isDefault   Boolean  @default(false)        // system defaults can't be deleted
  createdAt   DateTime
  updatedAt   DateTime
}

enum RoleScope {
  SYSTEM    // Platform admin creates, available to all companies
  COMPANY   // Company admin creates, available within their company
}
```

**Seed default roles:**
| Role | Permissions |
|------|------------|
| Admin | Full CRUD on all features |
| Manager | CRUD on spaces/people/conference/labels, view sync/settings, manage aims |
| Employee | Read/update on spaces/people/conference, view sync/labels |
| Viewer | Read-only on all features |

**Update `UserStore`:**
- Replace `role: StoreRole` enum with `roleId: String` FK to `Role` table
- Keep `features: Json` for feature-flag gating (which features the store has enabled)

**Clean up `CompanyRole` enum:**
- Rename to clear names: `COMPANY_ADMIN`, `COMPANY_MANAGER`, `COMPANY_VIEWER`
- Remove `STORE_ADMIN`, `STORE_VIEWER`, `SUPER_USER` from company level
- Company role determines **scope** (which stores), not **what you can do**

**`UserCompany` changes:**
- `role` still determines company-level access scope
- `allStoresAccess` stays as-is
- When `allStoresAccess=true`, the default store role comes from a mapping: COMPANY_ADMIN → Admin role, COMPANY_MANAGER → Manager role, COMPANY_VIEWER → Viewer role

#### Server Changes

**New feature module: `server/src/features/roles/`**
- `roles.routes.ts` — CRUD endpoints for roles
- `roles.controller.ts` — Request handling
- `roles.service.ts` — Business logic (create, update, delete, list roles)
- `roles.types.ts` — Zod schemas

**API Endpoints:**
- `GET /api/v1/roles` — List roles (system + company-specific)
- `POST /api/v1/roles` — Create role (platform admin: system, company admin: company)
- `PATCH /api/v1/roles/:id` — Update role permissions
- `DELETE /api/v1/roles/:id` — Delete custom role (not defaults)
- `GET /api/v1/roles/permissions` — Get available permissions matrix (for UI)

**Update `auth.ts` middleware:**
- Replace hardcoded `STORE_ROLE_PERMISSIONS` with DB-backed role lookup
- Cache role permissions (same 60s TTL pattern as user context cache)
- `requirePermission(resource, action)` looks up user's role → role.permissions → check

**Update user management endpoints:**
- Fix store assignment validation to accept roleId instead of StoreRole enum
- Default role assignment: when adding user to store, default to company's mapped role
- When creating/editing user, single role picker per store (from available roles)

#### Client Changes

**Role Management UI (Settings):**
- New "Roles" tab in Settings (visible to platform admin + company admin)
- List view: system roles (read-only for company admin) + company custom roles
- Create/Edit dialog: role name, description, permission matrix
- Permission matrix: features as rows, actions as columns, checkboxes
- Features: spaces, people, conference, labels, sync, settings, aims-management
- Actions per feature: view, create, edit, delete + feature-specific (sync: trigger, labels: link/unlink/manage)

**User Assignment UI fixes:**
- Single role selector per store (dropdown of available roles)
- Default role auto-populated from company role mapping
- Remove the confusing dual company-role + store-role selection
- Clear visual: "Role in [Store Name]: [Role Dropdown]"

**Permission helpers update:**
- `permissionHelpers.ts` — fetch role from store, check permissions from role.permissions JSON
- `ProtectedFeature` component works the same but reads from role-based permissions
- `useAuthContext` hook updated to use new role structure

#### Migration Strategy
1. Create `Role` table with seeded defaults
2. Migrate existing `UserStore.role` enum values to corresponding default `Role` records
3. Migrate `CompanyRole` enum values to new clean names
4. Drop old enums after data migration
5. All in a single Prisma migration

---

## Issue 3: Device Auth — Network Reconnection Redirect

### Problem
`useAuthWatchdog.ts` line 41: when `validateSession()` fails after network loss, it immediately logs out and redirects to `/login`. Doesn't distinguish between network failure and actual auth failure.

### Solution

**In `performValidation()` (useAuthWatchdog.ts):**
```
1. Call validateSession()
2. If network error (no response / timeout / offline):
   → Log warning, do NOT logout
   → Will retry on next interval or next 'online' event
3. If auth error (401/403):
   → Try device token re-auth (import deviceTokenStorage, call authService.deviceAuth)
   → If device auth succeeds: continue as normal
   → If device auth fails: THEN logout and redirect
```

**In `validateSession()` (authStore.ts):**
- Return a result object `{ valid: boolean, networkError: boolean }` instead of just `boolean`
- This lets the watchdog distinguish the failure type

**In the `online` event handler:**
- Add a small delay (2-3 seconds) after reconnection before validating
- Network `online` event fires before connections are fully ready

### Files Changed
- `src/features/auth/application/useAuthWatchdog.ts`
- `src/features/auth/infrastructure/authStore.ts` (validateSession return type)

---

## Issue 4: People Mode Spaces Count — Per Store

### Problem
`totalSpaces` saved via `saveCompanySettingsToServer()` — company-wide. Should be per-store.

### Solution

**Server:**
- Add `peopleManagerConfig` JSON field to Store model (or store settings) if not already there
- Update settings endpoints to read/write `totalSpaces` from store-level settings
- Migration: copy existing company `totalSpaces` to each store as default

**Client:**
- `usePeopleController.setTotalSpaces()`: change from `saveCompanySettingsToServer()` to `saveStoreSettingsToServer()`
- Settings read: `totalSpaces` comes from `settings.storeSettings?.peopleManagerConfig?.totalSpaces`
- `PeopleStatsPanel`: reads from store-level settings

### Files Changed
- `server/prisma/schema.prisma` (if Store model needs field)
- `server/src/features/settings/` (settings service/controller)
- `src/features/people/application/usePeopleController.ts`
- `src/features/people/presentation/components/PeopleStatsPanel.tsx`
- `src/features/settings/infrastructure/settingsStore.ts`

---

## Issue 5: App Header/SubHeader Not Persisting

### Problem
Changing appName/appSubtitle reflects immediately (Zustand) but resets on refresh. Either not saving to server or loading from wrong source.

### Solution
- Trace save: find where header settings are persisted (company vs store level)
- Trace load: check `fetchSettingsFromServer()` response for appName/appSubtitle
- Fix the mismatch: ensure save and load target the same level
- Verify the server endpoint actually writes appName/appSubtitle to DB

### Files Changed
- `src/features/settings/infrastructure/settingsStore.ts`
- Possibly `server/src/features/settings/` (service/controller)

---

## Issue 6: Link Label 500 + Whitelist Auto-Fix + Better Errors

### Problem
Dashboard QuickActionsPanel `POST /api/v1/labels/link` returns 500. AIMS errors bubble up as generic 500s. Labels may fail because they're not whitelisted.

### Solution

**New method in `solumService.ts`:**
```typescript
async whitelistLabel(config, token, labelCode): Promise<AimsApiResponse> {
    // POST /api/v2/common/whitelist?company={}&store={}
    // Body: { labelList: [labelCode] }
}
```

**Updated `aimsGateway.linkLabel()`:**
```
1. Try linkLabel via solumService
2. If error response contains "whitelist" (case-insensitive):
   a. Call solumService.whitelistLabel(labelCode)
   b. Retry linkLabel
   c. If retry fails: return descriptive error
3. Map AIMS errors to proper HTTP status codes:
   - Label not found → 404
   - Label already linked → 409
   - Not whitelisted (after auto-fix fails) → 400 with message
   - AIMS unreachable → 502
   - Auth failure → 502 (upstream auth issue)
4. Log raw AIMS response for debugging
```

**Updated `mapServiceError()` in labels controller:**
- Handle new error types with descriptive messages

**Client-side (DashboardPage QuickActionsPanel):**
- Show server error message in snackbar instead of generic "Failed"
- Translate common error codes to user-friendly messages

### Files Changed
- `server/src/shared/infrastructure/services/solumService.ts` (new whitelistLabel method)
- `server/src/shared/infrastructure/services/aimsGateway.ts` (whitelist auto-fix, error mapping)
- `server/src/features/labels/controller.ts` (better error mapping)
- `server/src/features/labels/service.ts` (error wrapping)
- `src/features/dashboard/DashboardPage.tsx` (error display)
- `src/locales/en/common.json` + `src/locales/he/common.json` (error messages)

---

## Execution Order

1. **Issue 1** (CI/CD) — standalone, no dependencies
2. **Issue 5** (Header persistence) — standalone investigation + fix
3. **Issue 4** (Spaces per store) — schema change, small scope
4. **Issue 3** (Device auth) — client-only, isolated
5. **Issue 6** (Link label) — server + client, medium scope
6. **Issue 2+7** (Roles redesign) — largest change, DB migration + full stack
