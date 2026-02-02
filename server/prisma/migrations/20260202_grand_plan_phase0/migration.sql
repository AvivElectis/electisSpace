-- Grand Plan Phase 0: Schema Updates
-- This migration adds new fields and renames existing ones with data transformation

-- ======================
-- 1. Company Updates
-- ======================

-- Add new columns
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "location" VARCHAR(255);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Rename aims_company_code to code (keeping the same data)
ALTER TABLE "companies" RENAME COLUMN "aims_company_code" TO "code";

-- ======================
-- 2. Store Updates
-- ======================

-- Rename store_number to code
ALTER TABLE "stores" RENAME COLUMN "store_number" TO "code";

-- Add new sync fields
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "sync_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "last_aims_sync_at" TIMESTAMP(3);

-- Update the unique constraint
ALTER TABLE "stores" DROP CONSTRAINT IF EXISTS "stores_company_id_store_number_key";
ALTER TABLE "stores" ADD CONSTRAINT "stores_company_id_code_key" UNIQUE ("company_id", "code");

-- ======================
-- 3. User Updates
-- ======================

-- Add active context fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_company_id" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_store_id" VARCHAR(255);

-- ======================
-- 4. UserCompany Updates
-- ======================

-- Add allStoresAccess field
ALTER TABLE "user_companies" ADD COLUMN IF NOT EXISTS "all_stores_access" BOOLEAN NOT NULL DEFAULT false;
