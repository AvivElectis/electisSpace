-- 1. Create RoleScope enum
CREATE TYPE "RoleScope" AS ENUM ('SYSTEM', 'COMPANY');

-- 2. Create roles table
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "scope" "RoleScope" NOT NULL DEFAULT 'SYSTEM',
    "company_id" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- 3. Seed default system roles
INSERT INTO "roles" ("id", "name", "description", "scope", "permissions", "is_default", "updated_at") VALUES
('role-admin', 'Admin', 'Full access to all features', 'SYSTEM',
 '{"spaces":["view","create","edit","delete"],"people":["view","create","edit","delete","import","assign"],"conference":["view","create","edit","delete","toggle"],"settings":["view","edit"],"users":["view","create","edit","delete"],"audit":["view"],"sync":["view","trigger"],"labels":["view","manage","link","unlink"],"stores":["view","edit","delete","manage"],"companies":["view"],"aims-management":["view","manage"]}',
 true, CURRENT_TIMESTAMP),
('role-manager', 'Manager', 'Manage spaces, people, conference, and labels', 'SYSTEM',
 '{"spaces":["view","create","edit","delete"],"people":["view","create","edit","delete","import","assign"],"conference":["view","create","edit","delete","toggle"],"settings":["view"],"sync":["view","trigger"],"labels":["view","manage","link","unlink"],"aims-management":["view"]}',
 true, CURRENT_TIMESTAMP),
('role-employee', 'Employee', 'View and update spaces, people, and conference', 'SYSTEM',
 '{"spaces":["view","edit"],"people":["view","edit"],"conference":["view","edit"],"sync":["view"],"labels":["view"]}',
 true, CURRENT_TIMESTAMP),
('role-viewer', 'Viewer', 'Read-only access to all features', 'SYSTEM',
 '{"spaces":["view"],"people":["view"],"conference":["view"],"sync":["view"],"labels":["view"]}',
 true, CURRENT_TIMESTAMP);

-- 4. Add role_id column to user_stores (nullable first)
ALTER TABLE "user_stores" ADD COLUMN "role_id" TEXT;

-- 5. Populate role_id from existing StoreRole enum
UPDATE "user_stores" SET "role_id" = 'role-admin' WHERE "role" = 'STORE_ADMIN';
UPDATE "user_stores" SET "role_id" = 'role-manager' WHERE "role" = 'STORE_MANAGER';
UPDATE "user_stores" SET "role_id" = 'role-employee' WHERE "role" = 'STORE_EMPLOYEE';
UPDATE "user_stores" SET "role_id" = 'role-viewer' WHERE "role" = 'STORE_VIEWER';

-- 5b. Safety net: assign default viewer role to any unmapped rows
UPDATE "user_stores" SET "role_id" = 'role-viewer' WHERE "role_id" IS NULL;

-- 6. Make role_id NOT NULL
ALTER TABLE "user_stores" ALTER COLUMN "role_id" SET NOT NULL;

-- 7. Drop old role column and enum
ALTER TABLE "user_stores" DROP COLUMN "role";
DROP TYPE "StoreRole";

-- 8. Add foreign key and indexes
ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_stores" ADD CONSTRAINT "user_stores_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "roles_company_id_idx" ON "roles"("company_id");
CREATE INDEX "roles_scope_idx" ON "roles"("scope");
CREATE UNIQUE INDEX "roles_name_company_id_key" ON "roles"("name", "company_id");
CREATE INDEX "user_stores_role_id_idx" ON "user_stores"("role_id");
