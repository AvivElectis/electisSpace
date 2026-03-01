# Implementation Plan: 5-Task Feature Branch

## Context

This plan covers 5 tasks for the electisSpace ESL management app. The current Dev branch is far behind main, so we create a fresh branch from `origin/main` (commit `4302569`). The SphereLoader.tsx file (untracked on disk) needs to be recreated since the original was corrupted during the branch switch — we'll rebuild it as a proper canvas-based bouncing sphere animation with the PNG extracted to an asset file.

**Branch:** `feature/5-tasks-sphere-roles-spaces-docs-settings` (already created from origin/main)

**Order:** Task 1 → Task 4 → Task 2 → Task 3 → Task 5
**Rationale:** T1 is pure client, quick win. T4 is docs-only, no risk. T2 (roles) must precede T5 (settings redesign). T3 (spaces) must precede T5 since it changes mode controls. T5 is the capstone that reorganizes UI.

---

## Task 1: SphereLoader — Fix & Implement as App Loading Screen

### Problem
A `SphereLoader.tsx` was added with a ~97KB base64 PNG embedded inline (218 lines but 82K tokens). The file got corrupted during branch switch. Need to recreate it properly and use it as the loading animation everywhere.

### Plan

1. **Create sphere texture asset**: Save the sphere PNG to `src/assets/sphere-texture.png` (decode from base64 or create a new sphere graphic)
2. **Create `src/shared/presentation/components/SphereLoader.tsx`**:
   - Import PNG from `@/assets/sphere-texture.png`
   - Canvas-based animation: bouncing sphere with rotation, wall squish, floor shadow, animated "LOADING" text
   - Props: `width?: number`, `height?: number`, `message?: string`
   - Proper `requestAnimationFrame` cleanup on unmount
   - `memo()` wrapped, accessible `aria-label`
3. **Create `src/shared/presentation/components/AppLoadingScreen.tsx`**:
   - Full-viewport centered container with theme background
   - Renders SphereLoader centered
   - Used for initial app load and route transitions
4. **Update `src/shared/presentation/components/LoadingFallback.tsx`**: Replace skeleton content with AppLoadingScreen
5. **Update `src/shared/presentation/components/RouteLoadingFallback.tsx`** (if exists): Use AppLoadingScreen
6. **Update `SettingsDialog.tsx` line 49-55**: Replace `TabLoadingFallback` CircularProgress with small SphereLoader
7. **Delete** `src/components/icons/SphereLoader.tsx` (corrupted file)
8. **Update translations**: Add `loading.message` key to both `en/common.json` and `he/common.json`

### Files
| File | Action |
|------|--------|
| `src/assets/sphere-texture.png` | CREATE |
| `src/shared/presentation/components/SphereLoader.tsx` | CREATE |
| `src/shared/presentation/components/AppLoadingScreen.tsx` | CREATE |
| `src/shared/presentation/components/LoadingFallback.tsx` | MODIFY |
| `src/shared/presentation/components/RouteLoadingFallback.tsx` | MODIFY |
| `src/features/settings/presentation/SettingsDialog.tsx` | MODIFY (TabLoadingFallback) |
| `src/components/icons/SphereLoader.tsx` | DELETE |
| `src/locales/en/common.json` | MODIFY |
| `src/locales/he/common.json` | MODIFY |

### Verify
- `npm run dev` → navigate between routes, see sphere animation during lazy load
- Initial app load shows sphere
- Settings tab switching shows sphere
- Mobile viewport: sphere scales properly

---

## Task 2: User Roles — App Admins Can Change App Roles

### Problem
Currently only PLATFORM_ADMIN can change global roles via ElevateUserDialog. Company admins can manage company/store roles but cannot change app-level roles at all. The requirements are:
- **App Admin (PLATFORM_ADMIN)**: Can change ANY user's app role freely, including making others admins
- **Company Admin**: Can change app roles ONLY for users under them, and ONLY to non-admin roles (employee/viewer)
- **APP_VIEWER users**: Can ONLY be assigned store viewer or company viewer roles

### Current State (on main)
- `ElevateUserDialog.tsx`: Radio group with PLATFORM_ADMIN/APP_VIEWER/USER — only accessible by platform admins
- Server `POST /users/:id/elevate`: Protected by `requireGlobalRole('PLATFORM_ADMIN')` middleware
- `service.ts elevate()`: Only allows PLATFORM_ADMIN callers
- `UserCompanySection.tsx` line 32-34: Filters out `role-admin` for non-platform-admins
- `UserStoreSection.tsx`: Role dropdown with all roles

### Plan

**Server changes:**

1. **`server/src/features/users/routes.ts`**: Change elevate route from `requireGlobalRole('PLATFORM_ADMIN')` to `authenticate` only — move permission check to service layer
2. **`server/src/features/users/service.ts`**:
   - `elevate()`: Allow company admins to set globalRole to `APP_VIEWER` or `USER` (not PLATFORM_ADMIN) for users in their companies
   - Add `validateRoleConstraints()`: If target is APP_VIEWER, block assignment of any store/company role above viewer
   - `updateUserCompany()`: Company admins can assign role-manager, role-employee, role-viewer (not role-admin)
   - `updateUserStore()`: If target user is APP_VIEWER, only allow role-viewer
3. **`server/src/features/users/types.ts`**: Update elevateUserSchema to accept `APP_VIEWER` and `USER` values from non-platform-admin callers

**Client changes:**

4. **`src/features/settings/presentation/ElevateUserDialog.tsx`**:
   - Accept `currentUserRole` prop to know caller's permissions
   - If caller is company admin: only show APP_VIEWER and USER options (not PLATFORM_ADMIN)
   - If caller is platform admin: show all three options
5. **`src/features/settings/presentation/UsersSettingsTab.tsx`**:
   - Show "Change Role" button for company admins (not just platform admins)
   - Filter which users can be managed based on company membership
6. **`src/features/auth/application/permissionHelpers.ts`**:
   - Add `canElevateUser(currentUser, targetUser)`: platform admin always, company admin for users in their companies
   - Add `getAllowedAppRoles(currentUser)`: filter options based on caller role
   - Add `getAllowedStoreRoles(currentUser, targetUser)`: if target is APP_VIEWER return only ['role-viewer']
   - Add `getAllowedCompanyRoles(currentUser, targetUser)`: if target is APP_VIEWER return only ['role-viewer']
7. **`src/features/settings/presentation/userDialog/UserCompanySection.tsx`**: Use `getAllowedCompanyRoles()` to filter dropdown
8. **`src/features/settings/presentation/userDialog/UserStoreSection.tsx`**: Use `getAllowedStoreRoles()` to filter dropdown

### Files
| File | Action |
|------|--------|
| `server/src/features/users/routes.ts` | MODIFY |
| `server/src/features/users/service.ts` | MODIFY |
| `server/src/features/users/types.ts` | MODIFY |
| `src/features/settings/presentation/ElevateUserDialog.tsx` | MODIFY |
| `src/features/settings/presentation/UsersSettingsTab.tsx` | MODIFY |
| `src/features/auth/application/permissionHelpers.ts` | MODIFY |
| `src/features/settings/presentation/userDialog/UserCompanySection.tsx` | MODIFY |
| `src/features/settings/presentation/userDialog/UserStoreSection.tsx` | MODIFY |
| `src/locales/en/common.json` | MODIFY (new keys) |
| `src/locales/he/common.json` | MODIFY (new keys) |

### Verify
- Docker rebuild → `docker compose -f server/docker-compose.dev.yml up --build`
- Login as PLATFORM_ADMIN → can elevate any user to any role including PLATFORM_ADMIN
- Login as COMPANY_ADMIN → can only set users to APP_VIEWER or USER, not PLATFORM_ADMIN
- Set user to APP_VIEWER → verify store/company role dropdowns only show viewer
- Login as regular user → no elevate button visible

---

## Task 3: Spaces Mode — Separate from People Mode + AIMS Bi-directional Sync

### Problem
Spaces mode needs full separation from people mode. When spaces mode is active, each space contains its own details (no assignedSpace indirection). Spaces should sync bi-directionally with AIMS — fetching from AIMS store and pushing changes back. Direct AIMS changes should also be detected.

### Current State
- Space model: `id, storeId, externalId, labelCode, templateName, data (JSON), syncStatus, lastSyncedAt`
- People mode: Person model with virtualSpaceId — separate model already
- `AimsPullSyncJob.ts`: Has mode awareness via `peopleManagerEnabled` setting
- `EditCompanyTabs.tsx` lines 135-170: Spaces/People toggle in Features tab
- Sync service: `server/src/features/sync/service.ts` — generic sync handling
- `aimsGateway.ts`: `pullArticles()`, `pushArticles()` — generic article operations

### Plan

**Server changes:**

1. **`server/src/features/spaces/syncService.ts`** (CREATE): Dedicated spaces sync service
   - `pullSpacesFromAims(storeId)`: Fetch articles → upsert as Spaces (externalId = articleId, data = article data)
   - `pushSpacesToAims(storeId)`: Get pending spaces → build articles → push via aimsGateway
   - `detectAimsChanges(storeId)`: Compare AIMS articles with local spaces, return diff
   - `fullSync(storeId)`: Push pending → pull from AIMS → resolve conflicts (AIMS wins)
   - Reuse: `aimsGateway.pullArticles()`, `aimsGateway.pushArticles()` from `server/src/shared/infrastructure/services/aimsGateway.ts`

2. **`server/src/features/spaces/routes.ts`** (MODIFY): Add sync endpoints
   - `POST /:storeId/spaces/sync/pull` — pull from AIMS
   - `POST /:storeId/spaces/sync/push` — push to AIMS
   - `POST /:storeId/spaces/sync/full` — bi-directional sync
   - `GET /:storeId/spaces/sync/status` — sync status

3. **`server/src/features/spaces/controller.ts`** (MODIFY): Add sync controller methods

4. **`server/src/shared/infrastructure/jobs/AimsPullSyncJob.ts`** (MODIFY):
   - When `!peopleManagerEnabled` (spaces mode): Call `spacesSyncService.fullSync()` instead of generic sync
   - Clean separation: spaces mode never touches Person model
   - When `peopleManagerEnabled` (people mode): Only reconcile people, never touch Space model

5. **`server/src/features/spaces/service.ts`** (MODIFY):
   - Mark spaces as `PENDING` on create/update for sync queue
   - Add `getSpacesSyncStatus()` method

**Client changes:**

6. **`src/features/space/presentation/SpacesSyncPanel.tsx`** (CREATE):
   - Sync status indicator (connected, last sync, pending count)
   - Pull/Push/Full Sync buttons
   - Auto-sync toggle for spaces mode

7. **`src/features/space/presentation/SpacesManagementView.tsx`** (MODIFY):
   - Add SpacesSyncPanel to toolbar
   - Ensure spaces UI works independently of people mode

8. **Client spaces API service** (MODIFY):
   - Add `syncPull()`, `syncPush()`, `syncFull()`, `syncStatus()` API calls

9. **Client spaces store** (MODIFY):
   - Add sync state: `syncStatus`, `lastSyncAt`, `pendingChanges`
   - Add sync actions: `pullFromAims()`, `pushToAims()`, `fullSync()`

### Files
| File | Action |
|------|--------|
| `server/src/features/spaces/syncService.ts` | CREATE |
| `server/src/features/spaces/routes.ts` | MODIFY |
| `server/src/features/spaces/controller.ts` | MODIFY |
| `server/src/shared/infrastructure/jobs/AimsPullSyncJob.ts` | MODIFY |
| `server/src/features/spaces/service.ts` | MODIFY |
| `src/features/space/presentation/SpacesSyncPanel.tsx` | CREATE |
| `src/features/space/presentation/SpacesManagementView.tsx` | MODIFY |
| Client spaces API service file | MODIFY |
| Client spaces store file | MODIFY |
| `src/locales/en/common.json` | MODIFY |
| `src/locales/he/common.json` | MODIFY |

### Verify
- Docker rebuild
- Enable spaces mode in company features
- Pull from AIMS → spaces appear in app with correct data
- Edit a space → push to AIMS → verify article updated in AIMS
- Change article directly in AIMS → auto-sync detects and updates app
- Switch to people mode → spaces sync stops, people sync active
- No cross-contamination between modes

---

## Task 4: AIMS Documentation — User Manual Update

### Problem
No dedicated AIMS integration documentation exists in the user manual. The feature is complex (connection, credentials, field mapping, sync, auto-sync) and needs proper documentation.

### Plan

1. **`docs/app_book/features/AIMS_INTEGRATION.md`** (CREATE):
   - Overview: What AIMS is, role in the app
   - Connection Setup: Credentials, clusters, base URLs
   - Authentication Flow: Server-side token management
   - Article Format & Field Mapping: Schema, friendly names, mapping selectors
   - Synchronization: Pull, push, bi-directional, auto-sync
   - Working Modes: Spaces vs People vs Conference
   - Error Handling: Connection errors, sync failures, retry logic
   - Troubleshooting: Common issues and solutions

2. **`docs/app_book/features/SETTINGS.md`** (MODIFY):
   - Add cross-reference to AIMS_INTEGRATION.md
   - Update settings tab descriptions

3. **`docs/app_book/features/SYNC_SYSTEM.md`** (MODIFY if exists):
   - Link to AIMS integration details

### Files
| File | Action |
|------|--------|
| `docs/app_book/features/AIMS_INTEGRATION.md` | CREATE |
| `docs/app_book/features/SETTINGS.md` | MODIFY |
| Other docs cross-references | MODIFY as needed |

### Verify
- All file paths referenced in docs exist in codebase
- Cross-links work
- No code changes — no docker rebuild needed

---

## Task 5: Unify AIMS Settings + Redesign Company/Store Settings Dialogs

### Problem
AIMS settings are split across multiple places:
- **CompanyDialog > AIMS Config tab** (`EditCompanyTabs.tsx` lines 220-319): Credentials, cluster, base URL, connection test
- **SolumSettingsTab > Connection sub-tab** (lines 231-288): Auto-sync, conference mode, people mode
- **SolumSettingsTab > Field Mapping sub-tab** (lines 290-420): Mapping selectors, global fields, friendly names table, schema editor

All AIMS settings should be in a single dialog under company settings. Company and store settings dialogs need better mobile/tablet/PC layouts.

### Current Settings Structure (SettingsDialog.tsx)
- **General section** (baseTabs): App Settings, SoluM Settings, Logo, Security
- **Admin section** (adminTabs, visible to admins): Users, Companies, Roles
- **System section**: Logs

### Plan

**Step 5.1: Create unified `AIMSSettingsDialog.tsx`** (CREATE)
Single dialog combining ALL AIMS settings with accordion/stepper sections:
- **Section 1 — Connection**: Cluster select, base URL, username, password, test connection, status indicator (from `EditCompanyTabs.tsx` AIMS tab)
- **Section 2 — Sync Settings**: Auto-sync toggle + interval, conference mode (from `SolumSettingsTab` Connection sub-tab, `SolumSyncSettingsSection`)
- **Section 3 — Article Format**: Schema editor (from `SolumSchemaEditorSection`)
- **Section 4 — Field Mapping**: Unique ID selector, conference mapping, mapping info, global fields, friendly names table (from `SolumSettingsTab` Field Mapping sub-tab, `SolumMappingSelectors`, `SolumGlobalFieldsEditor`, `SolumFieldMappingTable`)
- Accepts `companyId` prop, loads/saves company-level settings
- Responsive: Accordion sections on mobile, side-nav on desktop

**Step 5.2: Update `CompanyDialog.tsx` / `EditCompanyTabs.tsx`** (MODIFY)
- Remove AIMS Config tab content (moved to AIMSSettingsDialog)
- Add "Configure AIMS" button that opens AIMSSettingsDialog
- Keep Basic Info and Features tabs
- 2 tabs instead of 3

**Step 5.3: Update `CompaniesTab.tsx`** (MODIFY)
- Add "AIMS Settings" action button on each company card/row
- Opens AIMSSettingsDialog for that company
- Improve mobile card layout

**Step 5.4: Update `SolumSettingsTab.tsx`** (MODIFY)
- Remove most content (moved to AIMSSettingsDialog)
- Replace with a simple status card + "Open AIMS Settings" button
- Or remove the tab entirely from SettingsDialog and access AIMS via Companies tab
- Keep People Manager toggle here (it's a mode setting, not pure AIMS config) — or move to company Features tab

**Step 5.5: Redesign `StoresDialog.tsx`** (MODIFY)
- Better mobile layout: card view on mobile, table on desktop (follow CompaniesTab pattern)
- Improve store-specific settings layout
- Add store sync status indicator

**Step 5.6: Update `SettingsDialog.tsx`** (MODIFY)
- Remove or simplify SoluM Settings tab (content moved to AIMS dialog)
- Potentially rename remaining tabs for clarity
- Ensure responsive sidebar works well with fewer/different tabs

### Reuse existing sub-components
- `SolumCredentialsSection` → into AIMSSettingsDialog Section 1
- `SolumSyncSettingsSection` → into AIMSSettingsDialog Section 2
- `SolumSchemaEditorSection` → into AIMSSettingsDialog Section 3
- `SolumMappingSelectors`, `SolumGlobalFieldsEditor`, `SolumFieldMappingTable` → into AIMSSettingsDialog Section 4

### Files
| File | Action |
|------|--------|
| `src/features/settings/presentation/AIMSSettingsDialog.tsx` | CREATE |
| `src/features/settings/presentation/CompanyDialog.tsx` | MODIFY |
| `src/features/settings/presentation/companyDialog/EditCompanyTabs.tsx` | MODIFY |
| `src/features/settings/presentation/CompaniesTab.tsx` | MODIFY |
| `src/features/settings/presentation/SolumSettingsTab.tsx` | MODIFY (simplify/remove) |
| `src/features/settings/presentation/StoresDialog.tsx` | MODIFY |
| `src/features/settings/presentation/SettingsDialog.tsx` | MODIFY |
| `src/locales/en/common.json` | MODIFY |
| `src/locales/he/common.json` | MODIFY |

### Verify
- Open Company settings → "AIMS Settings" button → unified dialog with all 4 sections
- All AIMS config works from single dialog (test connection, field mapping, sync settings)
- Mobile: dialog is full-screen, sections are accordion
- Tablet: readable layout, no horizontal scroll
- Desktop: side-nav sections
- RTL (Hebrew): layout mirrors correctly
- Old SolumSettingsTab either removed or simplified

---

## Docker Health Check Protocol

After each task with server changes (Tasks 2, 3):

```bash
cd server
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up --build -d
docker compose -f docker-compose.dev.yml ps   # all "healthy"
docker logs electisspace-server-dev --tail 50  # no errors
curl http://localhost:3001/health               # 200 OK
```

For client-only tasks (Tasks 1, 4, 5):
```bash
npm run build   # verify no TypeScript errors
npm run dev     # visual verification
```

---

## Task Tracking

This `PLAN.md` file tracks progress. Update status below as tasks are completed.

### Status

| Task | Status | Commit |
|------|--------|--------|
| T1: SphereLoader | DONE | 174453b |
| T4: AIMS Docs | DONE | 02f6c20 |
| T2: User Roles | DONE | f662d8d |
| T3: Spaces Mode | DONE | bae88f2 |
| T5: Settings Unify | DONE | 11bb51a |
