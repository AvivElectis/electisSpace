-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'OFFLINE', 'ARCHIVED');

-- AlterTable: Store - add status fields
ALTER TABLE "stores" ADD COLUMN "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "stores" ADD COLUMN "status_changed_at" TIMESTAMP(3);
ALTER TABLE "stores" ADD COLUMN "status_note" VARCHAR(500);

-- AlterTable: User - add suspension fields
ALTER TABLE "users" ADD COLUMN "suspended_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "suspended_reason" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN "suspended_by_id" TEXT;
ALTER TABLE "users" ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}';
