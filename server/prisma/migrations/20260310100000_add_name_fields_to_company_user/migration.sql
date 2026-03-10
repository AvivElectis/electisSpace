-- AlterTable: Add name fields to CompanyUser
ALTER TABLE "company_users" ADD COLUMN IF NOT EXISTS "first_name" VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE "company_users" ADD COLUMN IF NOT EXISTS "middle_name" VARCHAR(100);
ALTER TABLE "company_users" ADD COLUMN IF NOT EXISTS "last_name" VARCHAR(100);

-- Backfill: Set first_name from display_name for existing records
UPDATE "company_users" SET "first_name" = "display_name" WHERE "first_name" = '';
