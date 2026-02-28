# Seven Production Fixes & Role Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 6 production bugs and redesign the role/permissions system into a single-source-of-truth architecture with custom roles.

**Architecture:** Incremental fixes (issues 1,3,4,5,6) followed by a full-stack role redesign (issues 2+7). Each fix is isolated. The role redesign touches DB schema, server middleware, API endpoints, and client UI.

**Tech Stack:** Prisma 7, Express 4, Zustand 5, React 19, MUI 7, Zod, GitHub Actions

---

## Task 1: CI/CD — Remove Orphan Containers + Update npm

**Files:**
- Modify: `.github/workflows/deploy-ubuntu.yml`

**Step 1: Edit the deploy workflow**

Remove the observability start step (lines 50-51), remove the migration resolve hack (line 40), add `--remove-orphans` flag, and add npm update.

Replace the entire `script:` block (lines 25-54) with:

```yaml
          script: |
            set -e
            cd /opt/electisSpace

            echo "=== Updating npm ==="
            npm install -g npm@latest

            echo "=== Pulling latest code ==="
            git remote set-url origin "https://x-access-token:${GH_PAT}@github.com/AvivElectis/electisSpace.git"
            git pull origin main

            echo "=== Building app containers ==="
            docker compose -f docker-compose.infra.yml -f docker-compose.app.yml build

            echo "=== Starting Redis ==="
            docker compose -f docker-compose.infra.yml up -d redis

            echo "=== Running migrations ==="
            docker compose -f docker-compose.infra.yml -f docker-compose.app.yml run --rm -T server npx prisma migrate deploy

            echo "=== Starting core services ==="
            docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up -d --remove-orphans server client

            echo "=== Health check ==="
            sleep 10
            curl -f http://localhost:3071/health || echo "Health check failed"

            echo "=== Deployment complete ==="
            docker compose -f docker-compose.infra.yml -f docker-compose.app.yml ps
```

**Step 2: Commit**

```bash
git add .github/workflows/deploy-ubuntu.yml
git commit -m "fix: remove orphan containers and update npm in CI/CD deploy"
```

---

## Task 2: Header/SubHeader Persistence Fix

**Files:**
- Investigate: `src/features/settings/infrastructure/settingsStore.ts`
- Investigate: `server/src/features/settings/service.ts`
- Investigate: `server/src/features/settings/repository.ts`

**Context:**
- `appName` and `appSubtitle` are in `SettingsData` interface
- `saveSettingsToServer()` (settingsStore.ts:279-339) splits settings into company-wide and store-level
- `fetchSettingsFromServer()` (settingsStore.ts:135-277) merges company settings on top
- Company settings include appName/appSubtitle per the code at lines 293-307

**Step 1: Trace the save path**

Read `settingsStore.ts` lines 279-339. Identify whether `appName` and `appSubtitle` are included in the `companyWideSettings` object that gets sent to `settingsService.updateCompanySettings()`.

**Step 2: Trace the load path**

Read `settingsStore.ts` lines 135-277. Check whether `fetchSettingsFromServer()` properly reads `appName`/`appSubtitle` from the company settings response and applies them to the store state.

**Step 3: Trace the server persist path**

Read `server/src/features/settings/service.ts` and `server/src/features/settings/repository.ts`. Verify that `updateCompanySettings()` actually writes appName/appSubtitle into the `Company.settings` JSON field in the database, and that `getCompanySettings()` reads them back.

**Step 4: Fix the bug**

The likely issue is one of:
- (a) `appName`/`appSubtitle` not included in the company-wide settings object during save
- (b) Server merges settings incorrectly (overwriting with defaults)
- (c) `fetchSettingsFromServer()` reads store settings first, then company settings overwrite with empty/default values

Fix whichever path is broken. Ensure:
1. Save writes appName/appSubtitle to Company.settings JSON
2. Load reads them back from Company.settings and applies to Zustand state
3. No default values overwrite the saved values during merge

**Step 5: Test manually**

1. Change appName in Settings
2. Refresh the page
3. Verify appName persists

**Step 6: Commit**

```bash
git add -A  # stage only relevant files
git commit -m "fix: persist app header/subheader settings across refresh"
```

---

## Task 3: People Mode Spaces Count — Per Store

**Files:**
- Modify: `src/features/people/application/usePeopleController.ts` (line 452)
- Modify: `src/features/settings/infrastructure/settingsStore.ts` (fetchSettingsFromServer, saveSettingsToServer)
- Modify: `server/src/features/settings/service.ts` (if needed)
- Possibly modify: `server/prisma/schema.prisma` (Store.settings already has JSON field)

**Step 1: Change the save from company to store level**

In `src/features/people/application/usePeopleController.ts`, find the `setTotalSpaces` function (line 452):

```typescript
// BEFORE (line 452):
saveCompanySettingsToServer({ peopleManagerConfig: { totalSpaces: count } });

// AFTER:
saveSettingsToServer();  // This saves store-level settings including peopleManagerConfig
```

Ensure `peopleManagerConfig` is NOT in the `companyWideSettings` list in `saveSettingsToServer()` (settingsStore.ts ~line 293). It should be saved as a store-level setting.

**Step 2: Update settingsStore to treat peopleManagerConfig as store-level**

In `settingsStore.ts` `saveSettingsToServer()` (~line 293-307), ensure `peopleManagerConfig` is NOT extracted into `companyWideSettings`. It should remain in the store-level settings payload.

In `fetchSettingsFromServer()`, ensure `peopleManagerConfig.totalSpaces` is read from store settings, not company settings.

**Step 3: Update settingsStore updateSettings to track peopleManagerConfig**

Ensure `updateSettings()` in the settings store includes `peopleManagerConfig` in what gets saved to the store.

**Step 4: Test manually**

1. Set totalSpaces = 10 in Store A
2. Switch to Store B
3. Verify Store B has its own totalSpaces (default or different)
4. Switch back to Store A
5. Verify Store A still has totalSpaces = 10

**Step 5: Commit**

```bash
git commit -m "fix: make people mode totalSpaces per-store instead of per-company"
```

---

## Task 4: Device Auth — Network Reconnection Fix

**Files:**
- Modify: `src/features/auth/infrastructure/authStore.ts` (validateSession)
- Modify: `src/features/auth/application/useAuthWatchdog.ts`

**Step 1: Update validateSession to distinguish network errors**

In `authStore.ts`, change `validateSession` to return a result object instead of boolean:

```typescript
// Return type changes from Promise<boolean> to:
interface ValidationResult {
    valid: boolean;
    networkError: boolean;
}

validateSession: async (): Promise<ValidationResult> => {
    const hasToken = !!tokenManager.getAccessToken();
    if (!hasToken) {
        set({
            isAuthenticated: false,
            user: null,
            lastValidation: Date.now(),
            activeCompanyId: null,
            activeStoreId: null,
        }, false, 'validateSession/noToken');
        return { valid: false, networkError: false };
    }

    try {
        const response = await authService.me();
        const { user } = response;
        const activeCompanyId = user.activeCompanyId || user.companies?.[0]?.id || null;
        const activeStoreId = user.activeStoreId || user.stores?.[0]?.id || null;

        set({
            user,
            isAuthenticated: true,
            lastValidation: Date.now(),
            activeCompanyId,
            activeStoreId,
        }, false, 'validateSession/success');
        return { valid: true, networkError: false };
    } catch (error: unknown) {
        // Distinguish network errors from auth errors
        const isNetworkError = !navigator.onLine ||
            (error instanceof Error && (
                error.message.includes('Network Error') ||
                error.message.includes('timeout') ||
                error.message.includes('ERR_NETWORK') ||
                error.message.includes('Failed to fetch')
            )) ||
            (typeof error === 'object' && error !== null && 'code' in error && (
                (error as { code?: string }).code === 'ERR_NETWORK' ||
                (error as { code?: string }).code === 'ECONNABORTED'
            ));

        if (isNetworkError) {
            logger.warn('AuthStore', 'Network error during session validation, keeping session');
            return { valid: false, networkError: true };
        }

        // Actual auth failure — clear state
        set({
            isAuthenticated: false,
            user: null,
            lastValidation: Date.now(),
            activeCompanyId: null,
            activeStoreId: null,
        }, false, 'validateSession/failed');
        return { valid: false, networkError: false };
    }
},
```

**Step 2: Update useAuthWatchdog to handle network errors and device token fallback**

In `useAuthWatchdog.ts`, update `performValidation`:

```typescript
const performValidation = useCallback(async () => {
    if (!isAuthenticated || location.pathname === '/login') {
        return;
    }

    const now = Date.now();
    if (lastValidation && (now - lastValidation) < MIN_VALIDATION_INTERVAL_MS) {
        return;
    }

    logger.debug('AuthWatchdog', 'Validating session...');

    const result = await validateSession();

    if (result.valid) {
        logger.debug('AuthWatchdog', 'Session valid');
        return;
    }

    if (result.networkError) {
        logger.warn('AuthWatchdog', 'Network error during validation, will retry later');
        return; // Do NOT logout — will retry on next interval or online event
    }

    // Auth truly failed — try device token re-auth before giving up
    logger.warn('AuthWatchdog', 'Session invalid, attempting device token re-auth');
    try {
        const { deviceTokenStorage } = await import('@shared/infrastructure/services/deviceTokenStorage');
        const deviceToken = await deviceTokenStorage.getDeviceToken();
        const deviceId = await deviceTokenStorage.getDeviceId();

        if (deviceToken && deviceId) {
            const authResult = await authService.deviceAuth(deviceToken, deviceId);
            if (authResult.accessToken) {
                logger.info('AuthWatchdog', 'Device token re-auth successful');
                // Re-validate to update user state
                await validateSession();
                return;
            }
        }
    } catch (deviceErr) {
        logger.warn('AuthWatchdog', 'Device token re-auth failed', {
            error: deviceErr instanceof Error ? deviceErr.message : 'Unknown',
        });
    }

    // All auth methods exhausted — redirect to login
    logger.warn('AuthWatchdog', 'All auth methods failed, redirecting to login');
    await logout();
    navigate('/login', { replace: true });
}, [isAuthenticated, validateSession, lastValidation, logout, navigate, location.pathname]);
```

Add import for authService at the top:
```typescript
import { authService } from '../../../shared/infrastructure/services/authService';
```

**Step 3: Add delay to online event handler**

In `useAuthWatchdog.ts`, update the online handler:

```typescript
const handleOnline = () => {
    if (isAuthenticated && location.pathname !== '/login') {
        logger.debug('AuthWatchdog', 'Network reconnected, validating session after delay');
        // Small delay — online event fires before connections are fully ready
        setTimeout(() => performValidation(), 3000);
    }
};
```

**Step 4: Commit**

```bash
git commit -m "fix: device auth handles network reconnection without false logout"
```

---

## Task 5: Link Label 500 + Whitelist Auto-Fix + Better Errors

**Files:**
- Modify: `server/src/shared/infrastructure/services/solumService.ts` (add whitelistLabel method)
- Modify: `server/src/shared/infrastructure/services/aimsGateway.ts` (error handling + whitelist retry)
- Modify: `server/src/features/labels/controller.ts` (better error mapping)
- Modify: `server/src/features/labels/service.ts` (error wrapping)
- Modify: `src/features/dashboard/DashboardPage.tsx` (error display)
- Modify: `src/locales/en/common.json` (error messages)
- Modify: `src/locales/he/common.json` (error messages)

**Step 1: Add whitelistLabel to solumService**

In `server/src/shared/infrastructure/services/solumService.ts`, add a new method:

```typescript
async whitelistLabel(
    config: SolumConfig,
    token: string,
    labelCode: string
): Promise<AimsApiResponse> {
    if (!config.storeCode) {
        throw new Error('Store code is required for whitelist');
    }

    const url = this.buildUrl(
        config,
        `/common/api/v2/common/whitelist?company=${config.companyName}&store=${config.storeCode}`
    );

    return this.withRetry('whitelistLabel', async () => {
        try {
            const response = await this.client.post(url, {
                labelList: [labelCode],
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Whitelist label failed: ${error.message}`);
        }
    });
}
```

**Step 2: Update aimsGateway.linkLabel with whitelist auto-fix and structured errors**

In `server/src/shared/infrastructure/services/aimsGateway.ts`, replace linkLabel:

```typescript
async linkLabel(
    storeId: string,
    labelCode: string,
    articleId: string,
    templateName?: string
): Promise<AimsApiResponse> {
    const { token, config } = await this.getTokenForStore(storeId);

    try {
        const result = await solumService.linkLabel(config, token, labelCode, articleId, templateName);

        // Check for AIMS-level error in response body
        if (result.responseCode && result.responseCode !== '200' && result.responseMessage !== 'SUCCESS') {
            throw new AimsOperationError(
                `AIMS rejected link: ${result.responseMessage || result.responseCode}`,
                result.responseCode,
                result.responseMessage
            );
        }

        return result;
    } catch (error: any) {
        const errorMsg = (error.message || error.responseMessage || '').toLowerCase();

        // Auto-whitelist if needed
        if (errorMsg.includes('whitelist')) {
            appLogger.info('AimsGateway', `Label ${labelCode} not whitelisted, auto-whitelisting...`);
            try {
                await solumService.whitelistLabel(config, token, labelCode);
                appLogger.info('AimsGateway', `Label ${labelCode} whitelisted successfully, retrying link`);
                return await solumService.linkLabel(config, token, labelCode, articleId, templateName);
            } catch (whitelistErr: any) {
                throw new AimsOperationError(
                    `Label not whitelisted and auto-whitelist failed: ${whitelistErr.message}`,
                    'WHITELIST_FAILED',
                    whitelistErr.message
                );
            }
        }

        // Auto-refresh token on 401/403
        if (error.message?.includes('401') || error.message?.includes('403')) {
            const storeConfig = await this.getStoreConfig(storeId);
            if (storeConfig) {
                this.invalidateToken(storeConfig.companyId);
                const newToken = await this.getToken(storeConfig.companyId);
                return await solumService.linkLabel(config, newToken, labelCode, articleId, templateName);
            }
        }

        // Log raw error for debugging
        appLogger.error('AimsGateway', 'linkLabel failed', {
            storeId,
            labelCode,
            articleId,
            error: error.message,
            responseCode: error.responseCode,
            responseMessage: error.responseMessage,
        });

        throw error;
    }
}
```

Add an `AimsOperationError` class (in `aimsGateway.ts` or a shared errors file):

```typescript
export class AimsOperationError extends Error {
    public responseCode: string;
    public responseMessage: string;

    constructor(message: string, responseCode: string, responseMessage: string) {
        super(message);
        this.name = 'AimsOperationError';
        this.responseCode = responseCode;
        this.responseMessage = responseMessage;
    }
}
```

**Step 3: Update labels controller error mapping**

In `server/src/features/labels/controller.ts`, update `mapServiceError`:

```typescript
function mapServiceError(error: unknown): Error {
    if (error === 'FORBIDDEN') {
        return forbidden('Access denied to this store');
    }
    if (error === 'AIMS_NOT_CONFIGURED') {
        return badRequest('AIMS not configured for this store');
    }
    if (error instanceof AimsOperationError) {
        // Map AIMS errors to descriptive HTTP errors
        const msg = error.responseMessage?.toLowerCase() || '';
        if (msg.includes('not found') || msg.includes('no label')) {
            return Object.assign(new Error(`Label not found: ${error.message}`), { status: 404 });
        }
        if (msg.includes('already') || msg.includes('duplicate')) {
            return Object.assign(new Error(`Label already linked: ${error.message}`), { status: 409 });
        }
        if (msg.includes('whitelist')) {
            return Object.assign(new Error(`Label whitelist error: ${error.message}`), { status: 400 });
        }
        return Object.assign(new Error(`AIMS error: ${error.message}`), { status: 502 });
    }
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
}
```

Add import at top:
```typescript
import { AimsOperationError } from '../../shared/infrastructure/services/aimsGateway.js';
```

**Step 4: Update dashboard error display**

In `src/features/dashboard/DashboardPage.tsx`, update `handleLinkLabel` to show errors:

```typescript
const handleLinkLabel = useCallback(async (labelCode: string, articleId: string, templateName?: string) => {
    if (!activeStoreId) return;
    try {
        await labelsApi.link(activeStoreId, labelCode, articleId, templateName);
    } catch (error: unknown) {
        const message = error instanceof Error
            ? error.message
            : (error as any)?.response?.data?.message || t('labels.linkFailed');
        // Show error via snackbar/notification
        throw new Error(message); // Re-throw so LinkLabelDialog can display it
    }
}, [activeStoreId, t]);
```

**Step 5: Add translation keys**

In `src/locales/en/common.json`, add under `labels`:
```json
"linkFailed": "Failed to link label",
"linkFailedWhitelist": "Label not whitelisted. Auto-whitelist failed.",
"linkFailedNotFound": "Label not found in AIMS",
"linkFailedAlreadyLinked": "Label is already linked to another article",
"linkFailedAims": "AIMS service error. Please try again."
```

Add matching Hebrew translations in `src/locales/he/common.json`.

**Step 6: Commit**

```bash
git commit -m "fix: link label 500 error with whitelist auto-fix and better error messages"
```

---

## Task 6: Roles & Permissions Redesign — Database Migration

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/<timestamp>_role_redesign/migration.sql`

**Step 1: Add Role model and update enums in Prisma schema**

In `server/prisma/schema.prisma`, add the `Role` model and `RoleScope` enum. Update `UserStore` to reference `Role`. Clean up `CompanyRole` enum.

```prisma
enum RoleScope {
  SYSTEM
  COMPANY
}

model Role {
  id          String    @id @default(uuid())
  name        String
  description String?
  scope       RoleScope @default(SYSTEM)
  companyId   String?
  company     Company?  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  permissions Json      @default("{}")
  isDefault   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  userStores  UserStore[]

  @@unique([name, companyId])
  @@index([companyId])
  @@index([scope])
}
```

Update `CompanyRole` enum — rename values:
```prisma
enum CompanyRole {
  COMPANY_ADMIN
  COMPANY_MANAGER
  COMPANY_VIEWER
}
```

Update `UserStore` model — replace `role StoreRole` with `roleId String` FK:
```prisma
model UserStore {
  id        String   @id @default(uuid())
  userId    String
  storeId   String
  roleId    String
  role      Role     @relation(fields: [roleId], references: [id])
  features  Json     @default("[\"dashboard\"]")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@unique([userId, storeId])
  @@index([storeId])
  @@index([roleId])
}
```

Add `roles` relation to `Company`:
```prisma
model Company {
  // ... existing fields
  roles         Role[]
}
```

Remove the `StoreRole` enum after migration handles data.

**Step 2: Write the migration SQL**

The migration must:
1. Create `Role` table
2. Seed default system roles (Admin, Manager, Employee, Viewer) with permissions JSON
3. Add `roleId` column to `UserStore`
4. Populate `roleId` by mapping old `StoreRole` enum values to new Role records
5. Make `roleId` NOT NULL after population
6. Remove old `role` column from `UserStore`
7. Migrate `CompanyRole` enum values (SUPER_USER→COMPANY_ADMIN, STORE_ADMIN→COMPANY_ADMIN, STORE_VIEWER→COMPANY_VIEWER, VIEWER→COMPANY_VIEWER)
8. Drop `StoreRole` enum

Run: `cd server && npx prisma migrate dev --name role_redesign`

**Step 3: Verify migration**

```bash
cd server && npx prisma migrate status
cd server && npx prisma studio  # Visual check
```

**Step 4: Commit**

```bash
git commit -m "feat: add Role model and migrate from StoreRole enum to role-based permissions"
```

---

## Task 7: Roles & Permissions — Server Feature Module

**Files:**
- Create: `server/src/features/roles/routes.ts`
- Create: `server/src/features/roles/controller.ts`
- Create: `server/src/features/roles/service.ts`
- Create: `server/src/features/roles/types.ts`
- Modify: `server/src/shared/middleware/auth.ts` (replace hardcoded matrix)

**Step 1: Create roles types with Zod schemas**

`server/src/features/roles/types.ts`:

```typescript
import { z } from 'zod';

export const AVAILABLE_RESOURCES = [
    'spaces', 'people', 'conference', 'settings', 'users',
    'audit', 'sync', 'labels', 'stores', 'companies', 'aims-management',
] as const;

export const AVAILABLE_ACTIONS = [
    'view', 'create', 'edit', 'delete',
    'import', 'assign', 'toggle', 'trigger', 'manage', 'link', 'unlink',
] as const;

export type Resource = typeof AVAILABLE_RESOURCES[number];
export type Action = typeof AVAILABLE_ACTIONS[number];
export type PermissionsMap = Partial<Record<Resource, Action[]>>;

export const permissionsSchema = z.record(
    z.enum(AVAILABLE_RESOURCES),
    z.array(z.enum(AVAILABLE_ACTIONS))
);

export const createRoleSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    companyId: z.string().uuid().optional(),  // null = system role (platform admin only)
    permissions: permissionsSchema,
});

export const updateRoleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    permissions: permissionsSchema.optional(),
});

export const roleIdParamSchema = z.object({
    id: z.string().uuid(),
});
```

**Step 2: Create roles service**

`server/src/features/roles/service.ts`:

Service with methods:
- `list(companyId?: string)` — returns system roles + company roles
- `getById(id: string)` — single role
- `create(data, userContext)` — platform admin creates system, company admin creates company
- `update(id, data, userContext)` — update permissions (can't edit default system roles' names)
- `delete(id, userContext)` — only custom roles
- `getPermissionsMatrix()` — returns available resources × actions for UI
- `getRolePermissions(roleId)` — cached, used by auth middleware

**Step 3: Create roles controller**

`server/src/features/roles/controller.ts`:

Standard Express controller pattern following existing codebase conventions.

**Step 4: Create roles routes**

`server/src/features/roles/routes.ts`:

```typescript
import { Router } from 'express';
import { rolesController } from './controller.js';
import { authenticate, requirePermission } from '../../shared/middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', rolesController.list);
router.get('/permissions-matrix', rolesController.getPermissionsMatrix);
router.get('/:id', rolesController.getById);
router.post('/', requirePermission('users', 'manage'), rolesController.create);
router.patch('/:id', requirePermission('users', 'manage'), rolesController.update);
router.delete('/:id', requirePermission('users', 'manage'), rolesController.delete);

export default router;
```

Register in main router (likely `server/src/routes/index.ts` or `server/src/server.ts`).

**Step 5: Update auth.ts middleware**

In `server/src/shared/middleware/auth.ts`:

- Remove the hardcoded `STORE_ROLE_PERMISSIONS` constant
- Add a role permissions cache (same LRU pattern, 60s TTL)
- `requirePermission(resource, action)` now:
  1. Gets user's store roles via `req.user.stores[].roleId`
  2. Looks up each role's permissions from cache/DB
  3. Checks if any role grants the required action on the resource

```typescript
// Role permissions cache
const ROLE_CACHE_TTL_MS = 60_000;
const rolePermissionsCache = new Map<string, { permissions: PermissionsMap; expiresAt: number }>();

async function getRolePermissions(roleId: string): Promise<PermissionsMap> {
    const cached = rolePermissionsCache.get(roleId);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.permissions;
    }

    const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: { permissions: true },
    });

    const permissions = (role?.permissions || {}) as PermissionsMap;
    rolePermissionsCache.set(roleId, {
        permissions,
        expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
    });
    return permissions;
}

export function invalidateRoleCache(roleId?: string): void {
    if (roleId) {
        rolePermissionsCache.delete(roleId);
    } else {
        rolePermissionsCache.clear();
    }
}
```

Update `UserContext` interface: stores now have `roleId` instead of `role: StoreRole`.

Update `authenticate` middleware: build stores array with `roleId` from `userStores`.

**Step 6: Update users service**

In `server/src/features/users/service.ts`:
- Store assignment now accepts `roleId` instead of `role: StoreRole`
- Default roleId resolved from company role mapping (COMPANY_ADMIN → system "Admin" role, etc.)
- Fix the 400 bug by using roleId-based validation

In `server/src/features/users/types.ts`:
- Update `storeRefSchema` to use `roleId: z.string().uuid()` instead of `role: z.enum([...])`
- Update `assignUserToStoreSchema` similarly
- Update `createUserSchema` companyRole to use new `CompanyRole` enum values

**Step 7: Commit**

```bash
git commit -m "feat: add roles feature module with DB-backed permissions"
```

---

## Task 8: Roles & Permissions — Client Role Management UI

**Files:**
- Create: `src/features/settings/presentation/RolesTab.tsx`
- Create: `src/features/settings/presentation/RoleDialog.tsx`
- Create: `src/features/roles/infrastructure/rolesApi.ts`
- Create: `src/features/roles/infrastructure/rolesStore.ts`
- Create: `src/features/roles/domain/types.ts`
- Modify: `src/features/settings/presentation/SettingsDialog.tsx` (add Roles tab)
- Modify: `src/features/settings/presentation/StoreAssignment.tsx` (use role dropdown)
- Modify: `src/features/auth/application/permissionHelpers.ts` (use role-based checks)
- Modify: `src/features/auth/application/useAuthContext.ts` (use role-based checks)
- Modify: `src/locales/en/common.json` (role-related translations)
- Modify: `src/locales/he/common.json` (role-related translations)

**Step 1: Create roles domain types**

`src/features/roles/domain/types.ts`:

```typescript
export type Resource = 'spaces' | 'people' | 'conference' | 'settings' | 'users' |
    'audit' | 'sync' | 'labels' | 'stores' | 'companies' | 'aims-management';

export type Action = 'view' | 'create' | 'edit' | 'delete' |
    'import' | 'assign' | 'toggle' | 'trigger' | 'manage' | 'link' | 'unlink';

export type PermissionsMap = Partial<Record<Resource, Action[]>>;

export interface Role {
    id: string;
    name: string;
    description?: string;
    scope: 'SYSTEM' | 'COMPANY';
    companyId?: string;
    permissions: PermissionsMap;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}
```

**Step 2: Create roles API service**

`src/features/roles/infrastructure/rolesApi.ts`:

Standard axios calls for CRUD endpoints: list, getById, create, update, delete, getPermissionsMatrix.

**Step 3: Create roles Zustand store**

`src/features/roles/infrastructure/rolesStore.ts`:

State: `roles: Role[]`, `loading: boolean`, `error: string | null`
Actions: `fetchRoles()`, `createRole()`, `updateRole()`, `deleteRole()`

**Step 4: Create RolesTab component**

`src/features/settings/presentation/RolesTab.tsx`:

- List of roles with chips showing scope (System/Company)
- System default roles shown but non-deletable
- "Add Role" button (for platform admin or company admin)
- Each role row: name, description, scope, edit/delete buttons
- Click edit → opens RoleDialog

**Step 5: Create RoleDialog component**

`src/features/settings/presentation/RoleDialog.tsx`:

- Role name and description fields
- Scope selector (System/Company) — only platform admin can create system roles
- Permission matrix: MUI Table with resources as rows, actions as columns
- Checkboxes at intersections
- Feature-specific actions shown per resource (e.g., sync only shows "view" and "trigger")
- Save/Cancel buttons

**Step 6: Update StoreAssignment to use role dropdown**

In `src/features/settings/presentation/StoreAssignment.tsx`:

Replace the `StoreRole` enum select with a dropdown of available roles (from rolesStore). The dropdown shows role names, stores roleId.

**Step 7: Update permission helpers**

In `src/features/auth/application/permissionHelpers.ts`:

- Remove hardcoded role-to-permission mappings
- Add `hasPermission(user, storeId, resource, action)` that checks user's role permissions
- User object now carries `roleId` per store instead of `role: StoreRole`

In `src/features/auth/application/useAuthContext.ts`:

- Update to use role-based permission checks
- `canAccessFeature(feature)` now checks role permissions for 'view' action on the feature resource

**Step 8: Add Roles tab to SettingsDialog**

In `src/features/settings/presentation/SettingsDialog.tsx`:

Add a new tab "Roles" (visible to platform admin and company admin) that renders `RolesTab`.

**Step 9: Add translations**

Add role-related keys to both `en/common.json` and `he/common.json`:
- `settings.roles.title`, `settings.roles.add`, `settings.roles.edit`, `settings.roles.delete`
- `settings.roles.name`, `settings.roles.description`, `settings.roles.scope`
- `settings.roles.permissions`, `settings.roles.systemRole`, `settings.roles.companyRole`
- `settings.roles.cannotDeleteDefault`, `settings.roles.confirmDelete`
- Resource and action names for the permission matrix

**Step 10: Commit**

```bash
git commit -m "feat: add role management UI with permission matrix"
```

---

## Task 9: Integration Testing & Cleanup

**Files:**
- Modify: Various test files
- Modify: `CHANGELOG.md`

**Step 1: Run all existing unit tests**

```bash
npm run test:unit
cd server && npx vitest run
```

Fix any failures caused by the role migration (updated types, removed enums, etc.).

**Step 2: Run E2E tests**

```bash
npm run test:e2e
```

Fix any failures. Key areas to check:
- Login flow (role changes in user context)
- Settings dialog (new Roles tab)
- Store assignment in user management
- Label linking from dashboard

**Step 3: Update CHANGELOG.md**

Add under `[Unreleased]`:

```markdown
### Added
- Role management system with custom roles and granular permissions
- Roles tab in Settings for platform and company admins
- Permission matrix UI for configuring role access per feature
- Auto-whitelist for AIMS labels during link operation
- Better error messages for label operations

### Changed
- People mode totalSpaces is now per-store instead of per-company
- Device auth handles network reconnection gracefully (no false logouts)
- Roles are now database-backed instead of hardcoded enums

### Fixed
- CI/CD orphan container warnings removed
- App header/subheader settings persist across refresh
- Store assignment 400 error when assigning STORE_MANAGER role
- Link label 500 error in production
- npm updated to latest stable in CI and production
```

**Step 4: Commit**

```bash
git commit -m "chore: fix tests, update changelog for seven production fixes"
```

---

## Execution Order Summary

| Task | Issue | Scope | Dependencies |
|------|-------|-------|-------------|
| 1 | CI/CD cleanup | Workflow file only | None |
| 2 | Header persistence | Client settings store + server | None |
| 3 | Spaces per store | Client + possibly server settings | None |
| 4 | Device auth | Client auth only | None |
| 5 | Link label 500 | Server AIMS + client error display | None |
| 6 | DB migration | Prisma schema + migration | None |
| 7 | Server roles module | Server feature + middleware | Task 6 |
| 8 | Client roles UI | Client components + stores | Task 7 |
| 9 | Testing & cleanup | Tests + changelog | All above |

Tasks 1-5 are independent and can be executed in parallel.
Tasks 6-8 are sequential (DB → server → client).
Task 9 is final verification.
