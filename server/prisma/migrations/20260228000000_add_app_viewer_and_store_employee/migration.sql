-- Add APP_VIEWER to GlobalRole enum (idempotent)
DO $$ BEGIN
  ALTER TYPE "GlobalRole" ADD VALUE IF NOT EXISTS 'APP_VIEWER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add STORE_EMPLOYEE to CompanyRole enum (idempotent)
DO $$ BEGIN
  ALTER TYPE "CompanyRole" ADD VALUE IF NOT EXISTS 'STORE_EMPLOYEE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update role-employee permissions to include create and assign capabilities
-- (existing row from 20260226000000_role_redesign had limited permissions)
UPDATE "roles"
SET "permissions" = '{"spaces":["view","create","edit"],"people":["view","create","edit","assign"],"conference":["view","create","edit"],"labels":["view","link","unlink"],"sync":["view"]}'::jsonb,
    "description" = 'Can view, create, and edit. No delete or admin access.',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'role-employee' AND "is_default" = true;
