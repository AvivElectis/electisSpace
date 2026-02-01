-- AlterTable
ALTER TABLE "user_stores" ADD COLUMN     "features" JSONB NOT NULL DEFAULT '["dashboard"]';
