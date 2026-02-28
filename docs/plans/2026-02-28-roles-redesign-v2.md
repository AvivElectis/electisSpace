# Design: Roles & Permissions Redesign v2 — Single Source of Truth

**Date:** 2026-02-28
**Branch:** `feat/roles-permissions-refactor`
**Status:** Approved

---

## Problem

The current system has 3 disconnected role layers:

1. **GlobalRole** (enum): `PLATFORM_ADMIN`, `APP_VIEWER`, `null`
2. **CompanyRole** (enum): `SUPER_USER`, `COMPANY_ADMIN`, `STORE_ADMIN`, `STORE_EMPLOYEE`, `STORE_VIEWER`, `VIEWER`
3. **UserStore.roleId** (FK to Role table): `role-admin`, `role-manager`, `role-employee`, `role-viewer`

Company roles are a hardcoded enum while store roles are DB-backed — two sources of truth. The RolesTab UI shows a flat table mixing everything with no clear distinction between app-level and company/store-level roles.

## Solution: Two-Level Architecture

### Level 1: App Roles (GlobalRole enum — fixed)

| Role | GlobalRole Value | Description |
|------|------------------|-------------|
| App Admin | `PLATFORM_ADMIN` | Full unrestricted access to all companies/stores |
| App Viewer | `APP_VIEWER` | Read-only across everything — all CUD buttons disabled |
| Regular User | `null` | Access determined by company/store role assignments |

These are **not editable**. Assigned via the existing ElevateUserDialog.

### Level 2: Company/Store Roles (Role table — single source of truth)

The **same Role table** is used for both company-level and store-level assignments:

| Default Role | ID | Permissions |
|---|---|---|
| Admin | `role-admin` | Full CRUD on all features |
| Manager | `role-manager` | CRUD on spaces/people/conference/labels, view sync/settings |
| Employee | `role-employee` | View/create/edit on core features, no delete |
| Viewer | `role-viewer` | Read-only on all features |

Company admins can create **custom roles** (scope: COMPANY) with custom permission matrices.

---

## Database Changes

### 1. Add `roleId` to `UserCompany`

```prisma
model UserCompany {
  id              String   @id @default(uuid())
  userId          String
  companyId       String
  roleId          String          // NEW — FK to Role table (replaces `role` enum)
  role            Role     @relation(fields: [roleId], references: [id])
  allStoresAccess Boolean  @default(false)  // KEPT — determines scope, not permissions
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([userId, companyId])
  @@index([companyId])
  @@index([roleId])
}
```

### 2. Migration SQL (idempotent)

```sql
-- 1. Add roleId column (nullable first)
ALTER TABLE "user_companies" ADD COLUMN IF NOT EXISTS "role_id" TEXT;

-- 2. Map existing CompanyRole enum values to Role table entries
UPDATE "user_companies" SET "role_id" = 'role-admin'
  WHERE "role" IN ('SUPER_USER', 'COMPANY_ADMIN', 'STORE_ADMIN') AND "role_id" IS NULL;
UPDATE "user_companies" SET "role_id" = 'role-employee'
  WHERE "role" = 'STORE_EMPLOYEE' AND "role_id" IS NULL;
UPDATE "user_companies" SET "role_id" = 'role-viewer'
  WHERE "role" IN ('STORE_VIEWER', 'VIEWER') AND "role_id" IS NULL;

-- 3. Safety net — assign viewer to any unmapped
UPDATE "user_companies" SET "role_id" = 'role-viewer' WHERE "role_id" IS NULL;

-- 4. Make NOT NULL + add FK
ALTER TABLE "user_companies" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "user_companies_role_id_idx" ON "user_companies"("role_id");

-- 5. Preserve allStoresAccess for admin-mapped users
-- (already correct from enum mapping — SUPER_USER/COMPANY_ADMIN had allStoresAccess=true)

-- 6. Drop old role column and enum (after verification)
ALTER TABLE "user_companies" DROP COLUMN IF EXISTS "role";
-- NOTE: Do NOT drop CompanyRole enum yet — keep for rollback safety
-- DROP TYPE "CompanyRole"; -- defer to future cleanup migration
```

### 3. Update Role model relation

Add `userCompanies UserCompany[]` to the Role model (alongside existing `userStores`).

---

## UI Changes

### RolesTab Redesign

**Section 1 — App Roles** (read-only)

Three info cards (not a table) showing:
- Icon + Name + Description
- "Assigned via Users tab → Change App Role"
- No edit/delete buttons — these are system-defined

**Section 2 — Company/Store Roles** (editable)

The existing roles table, showing:
- System default roles (Admin, Manager, Employee, Viewer) — edit permissions only, can't rename/delete
- Company custom roles — full CRUD
- Scope badge (System / Company)
- Type badge (Default / Custom)
- "Add Custom Role" button

### EnhancedUserDialog Changes

**Company Assignment step:**
- Replace hardcoded `COMPANY_ROLES` dropdown with roles from Role table (same as store assignment)
- Add `allStoresAccess` toggle (visible for Admin/Manager roles)
- Label: "Company Role" → role dropdown from DB

**Store Assignment step:**
- Unchanged (already uses Role table)

### UsersSettingsTab Changes

- Role column already works via `roleIdToKey()` — will continue working
- The "Change App Role" button (Elevate) stays as-is

---

## Server Changes

### Auth Service (`mapUserToInfo`)

Update to read `roleId` from UserCompany instead of the `role` enum:
- `companies[].roleId` replaces `companies[].role`
- Keep computing `allStoresAccess` from the boolean field

### Users Service

- `createUser`: Accept `roleId` instead of `companyRole` enum
- `assignToCompany`: Accept `roleId` + `allStoresAccess`
- `updateUserCompany`: Accept `roleId` and/or `allStoresAccess`
- Remove `ALL_STORES_COMPANY_ROLES` constant — allStoresAccess is explicit

### Users Types

- `createUserSchema`: Replace `companyRole: z.enum([...])` with `companyRoleId: z.string().uuid().default('role-viewer')`
- `assignUserToCompanySchema`: Same change
- `updateUserCompanySchema`: Same change

### Auth Middleware

- `canManageCompany()`: Check if user's company roleId maps to admin permissions instead of checking enum
- Platform admin bypass unchanged

### Companies Service

- `createCompany()`: When auto-assigning platform admins, use `roleId: 'role-admin'` instead of `role: 'SUPER_USER'`

---

## Client Changes

### Auth Service Types

```typescript
interface Company {
  id: string;
  name: string;
  code: string;
  roleId: string;        // NEW — replaces `role: CompanyRole`
  allStoresAccess: boolean;
}
```

### Permission Helpers

- `isCompanyAdmin()`: Check if company roleId === 'role-admin' (instead of `role === 'COMPANY_ADMIN'`)
- `getHighestRole()`: Use roleId hierarchy instead of enum hierarchy
- Remove `COMPANY_ROLE_HIERARCHY` constant

### EnhancedUserDialog

- `UserCompanySection`: Replace hardcoded `COMPANY_ROLES` dropdown with DB-backed roles from `useRolesStore()`
- Add `allStoresAccess` toggle checkbox

---

## Backwards Compatibility

| Concern | Guarantee |
|---------|-----------|
| Existing users | CompanyRole enum values mapped to roleId in migration — no data loss |
| allStoresAccess | Boolean field preserved — not derived, not changed |
| Store assignments | Unchanged — already use roleId FK |
| Platform admins | Auto-assigned role-admin + allStoresAccess=true (same behavior) |
| Auth tokens | Updated to carry roleId instead of role enum — clients handle gracefully |
| CompanyRole enum | Kept in DB temporarily — can be dropped in future cleanup |
| API backwards compat | Server accepts both `companyRole` (legacy) and `companyRoleId` (new) during transition |

---

## Migration Safety

- All SQL is idempotent (`IF NOT EXISTS`, `WHERE role_id IS NULL`)
- CompanyRole enum NOT dropped — unused but harmless
- Rollback: revert code → old `role` column is gone, but roleId works with same Role table
- `pg_dump` backup runs automatically before migration in CI/CD
