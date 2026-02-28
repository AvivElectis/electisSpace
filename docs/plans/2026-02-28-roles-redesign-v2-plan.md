# Roles & Permissions v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify company and store roles into a single Role table source of truth, with separate App Roles (fixed) and Company/Store Roles (DB-backed) UI sections.

**Architecture:** Add `roleId` FK to `UserCompany` (replacing `CompanyRole` enum), update all server endpoints to accept roleId instead of enum, update client UI to show two distinct role sections and use DB-backed role dropdowns for company assignment.

**Tech Stack:** Prisma 7, Express 4, Zustand 5, React 19, MUI 7, Zod, i18next

---

## Task 1: Database Migration — Add roleId to UserCompany

**Files:**
- Modify: `server/prisma/schema.prisma` (lines 157-176: UserCompany model, lines 178-185: CompanyRole enum)
- Create: `server/prisma/migrations/20260228100000_unify_company_roles/migration.sql`

**Step 1: Update Prisma schema — UserCompany model**

In `server/prisma/schema.prisma`, update the `UserCompany` model (lines 157-176). Add `roleId` field and `role` relation to Role. Keep the old `role CompanyRole` field temporarily (Prisma needs it until migration drops it).

```prisma
model UserCompany {
  id              String      @id @default(uuid())
  userId          String
  companyId       String
  roleId          String
  companyRole     Role        @relation(fields: [roleId], references: [id])
  allStoresAccess Boolean     @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([userId, companyId])
  @@index([companyId])
  @@index([roleId])
}
```

Remove the `CompanyRole` enum entirely (lines 178-185).

Add `userCompanies UserCompany[]` relation to the Role model (line ~235, alongside existing `userStores`).

**Step 2: Write the migration SQL**

Create `server/prisma/migrations/20260228100000_unify_company_roles/migration.sql`:

```sql
-- 1. Add role_id column to user_companies (nullable first)
ALTER TABLE "user_companies" ADD COLUMN IF NOT EXISTS "role_id" TEXT;

-- 2. Map existing CompanyRole enum values to Role table entries
UPDATE "user_companies" SET "role_id" = 'role-admin'
  WHERE "role" IN ('SUPER_USER', 'COMPANY_ADMIN', 'STORE_ADMIN') AND "role_id" IS NULL;
UPDATE "user_companies" SET "role_id" = 'role-employee'
  WHERE "role" = 'STORE_EMPLOYEE' AND "role_id" IS NULL;
UPDATE "user_companies" SET "role_id" = 'role-viewer'
  WHERE "role" IN ('STORE_VIEWER', 'VIEWER') AND "role_id" IS NULL;

-- 3. Safety net — assign viewer to any unmapped rows
UPDATE "user_companies" SET "role_id" = 'role-viewer' WHERE "role_id" IS NULL;

-- 4. Make role_id NOT NULL and add FK
ALTER TABLE "user_companies" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "user_companies_role_id_idx" ON "user_companies"("role_id");

-- 5. Drop the old role column
ALTER TABLE "user_companies" DROP COLUMN IF EXISTS "role";

-- 6. Drop CompanyRole enum
DROP TYPE IF EXISTS "CompanyRole";
```

**Step 3: Generate Prisma client**

Run: `cd server && npx prisma generate`
Expected: Prisma client regenerated without CompanyRole type

**Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/20260228100000_unify_company_roles/
git commit -m "feat: add roleId to UserCompany, drop CompanyRole enum"
```

---

## Task 2: Server — Update Auth Types and Service

**Files:**
- Modify: `server/src/features/auth/types.ts` (line 100-108: CompanyInfo, line 195-230: UserWithRelations)
- Modify: `server/src/features/auth/service.ts` (line 71-153: mapUserToInfo)

**Step 1: Update CompanyInfo interface**

In `server/src/features/auth/types.ts`, replace the `CompanyInfo` interface (lines 100-108):

```typescript
export interface CompanyInfo {
    id: string;
    name: string;
    code: string;
    roleId: string;            // replaces: role: CompanyRole
    allStoresAccess: boolean;
    companyFeatures?: CompanyFeatures;
    spaceType?: SpaceType;
}
```

Remove the `CompanyRole` import from `@prisma/client` at the top of the file if it's there. Remove the `GlobalRole` enum duplicate if one exists (the one from Prisma types should be used).

**Step 2: Update UserWithRelations type**

In the same file, update the `userCompanies` section of `UserWithRelations` (around lines 220-229) to use `roleId` instead of `role`:

```typescript
userCompanies: Array<{
    companyId: string;
    roleId: string;           // was: role: CompanyRole
    allStoresAccess: boolean;
    company: {
        name: string;
        code: string;
        settings: any;
    };
}>;
```

**Step 3: Update mapUserToInfo in auth service**

In `server/src/features/auth/service.ts`, update the companies mapping section (around lines 128-139) to use `roleId`:

```typescript
const companies: CompanyInfo[] = user.userCompanies.map(uc => ({
    id: uc.company ? uc.companyId : uc.companyId,
    name: uc.company?.name || '',
    code: uc.company?.code || '',
    roleId: uc.roleId,        // was: role: uc.role
    allStoresAccess: uc.allStoresAccess,
    companyFeatures: extractCompanyFeatures(uc.company?.settings),
    spaceType: extractSpaceType(uc.company?.settings),
}));
```

Also update the `allStoresAccess` expansion section (around lines 95-126) — where it checks `uc.role` for admin access, change to check `uc.roleId === 'role-admin'`:

Find the line that checks company role for implicit store expansion and update it to use roleId.

**Step 4: Update Prisma queries in auth service**

Any `findUnique`/`findFirst` queries that select `role` from `userCompanies` must select `roleId` instead.

**Step 5: Verify server compiles**

Run: `cd server && npx tsc --noEmit`
Expected: May have errors in other files referencing CompanyRole — those are fixed in subsequent tasks.

**Step 6: Commit**

```bash
git add server/src/features/auth/
git commit -m "feat: update auth types and service for roleId-based company roles"
```

---

## Task 3: Server — Update Users Service, Types, and Repository

**Files:**
- Modify: `server/src/features/users/types.ts` (lines 59-71, 92-107)
- Modify: `server/src/features/users/service.ts` (lines 40-45, 470-605, 732-782, 807-888)
- Modify: `server/src/features/users/repository.ts`

**Step 1: Update user schemas in types.ts**

Replace `companyRole` with `companyRoleId` in all schemas:

`createUserSchema` (lines 59-71):
```typescript
export const createUserSchema = z.object({
    email: z.string().email(),
    firstName: z.string().max(100).optional().nullable(),
    lastName: z.string().max(100).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    company: companyRefSchema,
    companyRoleId: z.string().default('role-viewer'),
    allStoresAccess: z.boolean().default(false),
    stores: z.array(storeRefSchema).optional(),
}).refine(
    (data) => data.allStoresAccess || (data.stores && data.stores.length > 0),
    { message: 'stores are required unless allStoresAccess is true' }
);
```

`assignUserToCompanySchema` (lines 100-103):
```typescript
export const assignUserToCompanySchema = z.object({
    company: companyRefSchema,
    companyRoleId: z.string().default('role-viewer'),
    allStoresAccess: z.boolean().default(false),
});
```

`updateUserCompanySchema` (lines 105-107):
```typescript
export const updateUserCompanySchema = z.object({
    companyRoleId: z.string().optional(),
    allStoresAccess: z.boolean().optional(),
});
```

Update `elevateUserSchema` (lines 92-98) — remove `COMPANY_ADMIN` option since company admin is now a roleId assignment:
```typescript
export const elevateUserSchema = z.object({
    globalRole: z.enum(['USER', 'APP_VIEWER', 'PLATFORM_ADMIN']),
});
```

Remove `ALL_STORES_COMPANY_ROLES` and the `CompanyRole` import.

**Step 2: Update users service**

Remove `derivesAllStoresAccess()` function (lines 40-45) and `ALL_STORES_ROLES` constant.

In `create()` (lines 470-605):
- Replace `data.companyRole` with `data.companyRoleId`
- Replace `derivesAllStoresAccess(role)` with `data.allStoresAccess`
- Update the `userCompanies.create` block to use `roleId` instead of `role`

In `assignToCompany()` (lines 807-863):
- Replace `data.companyRole` with `data.companyRoleId`
- Replace `derivesAllStoresAccess(assignRole)` with `data.allStoresAccess`
- Update `prisma.userCompany.create` to use `roleId` instead of `role`

In `updateUserCompany()` (lines 868-888):
- Replace `data.companyRole` references with `data.companyRoleId`
- Replace enum check with roleId check
- Update data passed to repository

In `elevate()` (lines 732-782):
- Remove the `COMPANY_ADMIN` branch (lines 744-749) — company admin is now roleId assignment
- When auto-assigning PLATFORM_ADMIN to all companies, use `roleId: 'role-admin'` instead of `role: 'SUPER_USER'`

**Step 3: Update repository**

Any repository methods that reference `role: CompanyRole` must use `roleId: string` instead.

**Step 4: Verify server compiles**

Run: `cd server && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add server/src/features/users/
git commit -m "feat: update users service to use roleId for company assignments"
```

---

## Task 4: Server — Update Companies Service and Remaining References

**Files:**
- Modify: `server/src/features/companies/service.ts` (lines 277-296)
- Modify: Any other files importing `CompanyRole` from `@prisma/client`

**Step 1: Update companies service**

In `server/src/features/companies/service.ts`, update the auto-assign PLATFORM_ADMIN block (lines 277-296) to use `roleId` instead of `role`:

```typescript
await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: admin.id, companyId: company.id } },
    create: {
        userId: admin.id,
        companyId: company.id,
        roleId: 'role-admin',       // was: role: 'SUPER_USER'
        allStoresAccess: true,
    },
    update: {
        roleId: 'role-admin',       // was: role: 'SUPER_USER'
        allStoresAccess: true,
    },
});
```

**Step 2: Find and fix all remaining CompanyRole references**

Run: `grep -r "CompanyRole" server/src/ --include="*.ts" -l`

For each file found, replace `CompanyRole` enum usage with `roleId` string.

Also check `server/src/shared/middleware/auth.ts` for any `CompanyRole` references in authorization checks.

**Step 3: Verify server compiles clean**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add server/src/
git commit -m "feat: remove all CompanyRole enum references from server"
```

---

## Task 5: Client — Update Auth Types and Permission Helpers

**Files:**
- Modify: `src/shared/infrastructure/services/authService.ts` (lines 45-53: Company interface)
- Modify: `src/features/auth/application/permissionHelpers.ts` (lines 41-48, 71-77, 363-390)

**Step 1: Update client Company interface**

In `src/shared/infrastructure/services/authService.ts`, update the `Company` interface (lines 45-53):

```typescript
export interface Company {
    id: string;
    name: string;
    code: string;
    roleId: string;                // replaces: role: string
    allStoresAccess: boolean;
    companyFeatures?: CompanyFeatures;
    spaceType?: SpaceType;
}
```

**Step 2: Update permission helpers**

In `src/features/auth/application/permissionHelpers.ts`:

Replace `COMPANY_ROLE_HIERARCHY` (lines 41-48) with a roleId-based version:
```typescript
const ROLE_HIERARCHY: Record<string, number> = {
    'role-admin': 4,
    'role-manager': 3,
    'role-employee': 2,
    'role-viewer': 1,
};
```

Update `isCompanyAdmin()` (lines 71-77):
```typescript
export function isCompanyAdmin(user: User | null, companyId: string): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;
    const company = user.companies.find(c => c.id === companyId);
    return company?.roleId === 'role-admin';
}
```

Update `getHighestRole()` (lines 363-390) — replace all `c.role === 'COMPANY_ADMIN'` / `c.role === 'SUPER_USER'` checks with `c.roleId === 'role-admin'`:
```typescript
export function getHighestRole(user: User | null): string {
    if (!user) return 'Guest';
    if (isPlatformAdmin(user)) return 'App Admin';
    if (isAppViewer(user)) return 'App Viewer';

    const hasCompanyAdmin = user.companies.some(c => c.roleId === 'role-admin');
    if (hasCompanyAdmin) return 'Admin';

    const hasCompanyManager = user.companies.some(c => c.roleId === 'role-manager');
    if (hasCompanyManager) return 'Manager';

    // Check store-level roles
    const hasStoreAdmin = user.stores.some(s => s.roleId === 'role-admin');
    if (hasStoreAdmin) return 'Admin';

    const hasStoreManager = user.stores.some(s => s.roleId === 'role-manager');
    if (hasStoreManager) return 'Manager';

    const hasStoreEmployee = user.stores.some(s => s.roleId === 'role-employee');
    if (hasStoreEmployee) return 'Employee';

    return 'Viewer';
}
```

**Step 3: Verify client compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/shared/infrastructure/services/authService.ts src/features/auth/application/permissionHelpers.ts
git commit -m "feat: update client auth types and helpers for roleId-based company roles"
```

---

## Task 6: Client — Update UserCompanySection and Dialog Types

**Files:**
- Modify: `src/features/settings/presentation/userDialog/types.ts`
- Modify: `src/features/settings/presentation/userDialog/UserCompanySection.tsx`
- Modify: `src/features/settings/presentation/userDialog/useUserDialogState.ts`

**Step 1: Update dialog types**

In `src/features/settings/presentation/userDialog/types.ts`, remove `COMPANY_ROLES` constant and `CompanyRole` type. Update `UserData`:

```typescript
/**
 * Shared types for EnhancedUserDialog components
 */
import type { StoreAssignmentData } from '../StoreAssignment';

export interface UserData {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone?: string | null;
    globalRole: 'PLATFORM_ADMIN' | 'APP_VIEWER' | null;
    isActive: boolean;
    lastLogin?: string | null;
    lastActivity?: string | null;
    loginCount?: number;
    createdAt?: string;
    companies?: Array<{
        company: { id: string; name: string; code: string };
        roleId: string;                // was: role: ServerCompanyRole
        allStoresAccess: boolean;
    }>;
    stores?: Array<{
        store: { id: string; name: string; code: string; companyId: string };
        roleId: string;
        features: string[];
    }>;
}

export const CREATE_STEPS = ['basicInfo', 'companyAssignment', 'storeAssignment'] as const;

export type { StoreAssignmentData };
```

**Step 2: Rewrite UserCompanySection**

Replace `src/features/settings/presentation/userDialog/UserCompanySection.tsx` to use DB-backed roles:

```tsx
import {
    Box, Divider, FormControl, InputLabel, Select, MenuItem,
    Typography, FormControlLabel, Checkbox,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CompanySelector } from '../CompanySelector';
import { useRolesStore } from '@features/roles/infrastructure/rolesStore';
import type { Company } from '@shared/infrastructure/services/companyService';

interface Props {
    selectedCompanyId: string;
    isCreatingCompany: boolean;
    newCompanyData: { code: string; name: string; location?: string };
    companyRoleId: string;
    allStoresAccess: boolean;
    isPlatformAdmin: boolean;
    accessibleCompanyId: string | null;
    isEdit: boolean;
    isEditing: boolean;
    onCompanyChange: (companyId: string, company?: Company) => void;
    onCreateModeChange: (creating: boolean) => void;
    onNewCompanyDataChange: (data: { code: string; name: string; location?: string }) => void;
    onCompanyRoleIdChange: (roleId: string) => void;
    onAllStoresAccessChange: (value: boolean) => void;
}

export function UserCompanySection({
    selectedCompanyId, isCreatingCompany, newCompanyData, companyRoleId,
    allStoresAccess, isPlatformAdmin, accessibleCompanyId,
    isEdit, isEditing,
    onCompanyChange, onCreateModeChange, onNewCompanyDataChange,
    onCompanyRoleIdChange, onAllStoresAccessChange,
}: Props) {
    const { t } = useTranslation();
    const { roles } = useRolesStore();

    return (
        <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {t('settings.users.companyAssignment')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <CompanySelector
                    value={selectedCompanyId}
                    onChange={onCompanyChange}
                    isCreatingNew={isCreatingCompany}
                    onCreateModeChange={onCreateModeChange}
                    newCompanyData={newCompanyData}
                    onNewCompanyDataChange={onNewCompanyDataChange}
                    allowCreate={isPlatformAdmin}
                    disabled={(isEdit && !isEditing) || (!isPlatformAdmin && !!accessibleCompanyId)}
                />

                <Divider sx={{ my: 1 }} />

                <FormControl fullWidth size="small" disabled={isEdit && !isEditing}>
                    <InputLabel>{t('settings.users.companyRole')}</InputLabel>
                    <Select
                        value={companyRoleId}
                        label={t('settings.users.companyRole')}
                        onChange={(e) => onCompanyRoleIdChange(e.target.value)}
                    >
                        {roles.map(role => (
                            <MenuItem key={role.id} value={role.id}>
                                <Box>
                                    <Typography variant="body1">
                                        {t(`roles.${role.name.toLowerCase()}`, role.name)}
                                    </Typography>
                                    {role.description && (
                                        <Typography variant="caption" color="text.secondary">
                                            {t(`roles.${role.name.toLowerCase()}_desc`, role.description)}
                                        </Typography>
                                    )}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={allStoresAccess}
                            onChange={(e) => onAllStoresAccessChange(e.target.checked)}
                            disabled={isEdit && !isEditing}
                        />
                    }
                    label={t('settings.users.allStoresAccess', 'Access all stores in this company')}
                />
            </Box>
        </Box>
    );
}
```

**Step 3: Update useUserDialogState**

In `useUserDialogState.ts`, update state and submit logic:
- Replace `companyRole` state with `companyRoleId` (default: `'role-viewer'`)
- Add `allStoresAccess` state (default: `false`)
- Update submit payload to send `companyRoleId` and `allStoresAccess` instead of `companyRole`
- When loading existing user data, read `roleId` from companies array instead of `role`

**Step 4: Update EnhancedUserDialog**

Update prop passing from `EnhancedUserDialog.tsx` to `UserCompanySection` to match new interface. Also ensure `useRolesStore().fetchRoles()` is called when dialog opens.

**Step 5: Verify client compiles**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add src/features/settings/presentation/userDialog/
git commit -m "feat: replace hardcoded company roles with DB-backed role dropdown"
```

---

## Task 7: Client — Redesign RolesTab with Two Sections

**Files:**
- Modify: `src/features/settings/presentation/RolesTab.tsx`
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

**Step 1: Add translation keys**

In `src/locales/en/common.json`, add under `settings.roles`:
```json
"appRoles": "App Roles",
"appRolesDesc": "Global roles assigned to users via the Users tab",
"companyStoreRoles": "Company & Store Roles",
"companyStoreRolesDesc": "Roles assigned when adding users to companies or stores",
"assignedVia": "Assigned via Users tab → Change App Role"
```

Add matching Hebrew keys in `src/locales/he/common.json`:
```json
"appRoles": "תפקידי אפליקציה",
"appRolesDesc": "תפקידים גלובליים המוקצים למשתמשים דרך לשונית המשתמשים",
"companyStoreRoles": "תפקידי חברה וחנות",
"companyStoreRolesDesc": "תפקידים המוקצים בעת הוספת משתמשים לחברות או חנויות",
"assignedVia": "מוקצה דרך לשונית משתמשים ← שנה תפקיד אפליקציה"
```

Also add the `allStoresAccess` key:
- EN: `"allStoresAccess": "Access all stores in this company"`
- HE: `"allStoresAccess": "גישה לכל החנויות בחברה זו"`

**Step 2: Redesign RolesTab**

Rewrite `src/features/settings/presentation/RolesTab.tsx` with two sections:

**Section 1 — App Roles:** Three read-only info cards in a row (or column on mobile):
- App Admin (AdminPanelSettingsIcon, secondary color) — full access description
- App Viewer (VisibilityIcon, info color) — read-only description
- Regular User (PersonIcon, default color) — access-via-assignments description
- Each card shows: icon, name, description, "Assigned via Users tab → Change App Role" note

**Section 2 — Company/Store Roles:** The existing roles table with the existing "Add Custom Role" button, unchanged from current implementation. Just moved under a section header.

**Step 3: Verify client compiles and visually check**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/features/settings/presentation/RolesTab.tsx src/locales/
git commit -m "feat: redesign RolesTab with app roles cards and company/store roles table"
```

---

## Task 8: Server — Apply Migration to Docker Dev + Rebuild

**Step 1: Apply migration to dev database**

```bash
docker exec electisspace-dev-postgres psql -U postgres -d electisspace_dev -f - < server/prisma/migrations/20260228100000_unify_company_roles/migration.sql
```

Or use:
```bash
cd server && DATABASE_URL="postgresql://postgres:postgres_dev@localhost:5433/electisspace_dev?schema=public" npx prisma migrate deploy
```

**Step 2: Rebuild and restart Docker dev server**

```bash
cd /c/React/electisSpace && docker compose -f docker-compose.dev.yml build --no-cache server migrate
docker compose -f docker-compose.dev.yml up -d server
```

**Step 3: Verify server starts and API works**

```bash
docker logs electisspace-dev-api --tail 20
```
Expected: Server starts without errors, health check passes.

**Step 4: Verify data migrated correctly**

```bash
docker exec electisspace-dev-postgres psql -U postgres -d electisspace_dev -c "SELECT uc.user_id, u.email, uc.role_id, uc.all_stores_access FROM user_companies uc JOIN users u ON u.id = uc.user_id;"
```
Expected: All users have role_id values (no NULLs), old `role` column is gone.

---

## Task 9: Feature-Level Permission Enforcement (Phase 4)

**Files:**
- Modify: Feature pages that have CUD buttons (SpacesManagementView, PeopleManagerView, ConferenceRoomsPage, LabelsPage, etc.)

**Step 1: Add disabled state for App Viewer**

In each feature page that has Add/Edit/Delete buttons, import `isAppViewer` and `canPerformAction` from `permissionHelpers.ts`, and disable buttons when the user lacks permissions:

```typescript
import { isAppViewer, canPerformAction } from '@features/auth/application/permissionHelpers';

// In component:
const readOnly = isAppViewer(user);
const canCreate = canPerformAction(user, activeStoreId, 'spaces', 'create');
const canEdit = canPerformAction(user, activeStoreId, 'spaces', 'edit');
const canDelete = canPerformAction(user, activeStoreId, 'spaces', 'delete');
```

Use `disabled` prop on MUI buttons — do NOT hide them (viewers should see what exists).

**Step 2: Test with App Viewer user**

Set a test user to APP_VIEWER via ElevateUserDialog, login as them, verify all add/edit/delete buttons are disabled.

**Step 3: Commit**

```bash
git add src/features/
git commit -m "feat: disable CUD buttons based on role permissions"
```

---

## Execution Order Summary

| Task | Scope | Dependencies |
|------|-------|-------------|
| 1 | DB migration (schema + SQL) | None |
| 2 | Server auth types + service | Task 1 |
| 3 | Server users types + service | Task 1 |
| 4 | Server companies + remaining refs | Tasks 2, 3 |
| 5 | Client auth types + helpers | Task 2 (API contract) |
| 6 | Client user dialog (company role dropdown) | Task 5 |
| 7 | Client RolesTab redesign (two sections) | Task 5 |
| 8 | Docker dev migration + rebuild | Tasks 1-4 |
| 9 | Feature-level permission enforcement | Tasks 5-7 |

Tasks 2+3 can run in parallel. Tasks 5+6+7 can run in parallel after 4.
