-- AlterTable: Store - add locale column (idempotent)
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "locale" VARCHAR(10) NOT NULL DEFAULT 'en';
