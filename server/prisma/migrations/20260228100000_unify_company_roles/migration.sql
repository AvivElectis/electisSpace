-- Unify company roles: replace CompanyRole enum with roleId FK to roles table
-- This makes company-level and store-level roles use the same Role table (single source of truth)

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

-- 4. Make role_id NOT NULL and add FK + index
ALTER TABLE "user_companies" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "user_companies_role_id_idx" ON "user_companies"("role_id");

-- 5. Drop the old role column
ALTER TABLE "user_companies" DROP COLUMN IF EXISTS "role";

-- 6. Drop CompanyRole enum (no longer used anywhere)
DROP TYPE IF EXISTS "CompanyRole";
