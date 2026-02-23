-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'OFFLINE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: Store - add status fields (idempotent)
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "status_changed_at" TIMESTAMP(3);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "status_note" VARCHAR(500);

-- AlterTable: User - add suspension fields (idempotent)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_reason" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_by_id" TEXT;
