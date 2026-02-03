/*
  Warnings:

  - You are about to alter the column `code` on the `companies` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `VarChar(20)`.
  - You are about to alter the column `code` on the `stores` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `VarChar(10)`.

*/
-- AlterEnum
ALTER TYPE "CompanyRole" ADD VALUE 'SUPER_USER';

-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "code" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "stores" ALTER COLUMN "code" SET DATA TYPE VARCHAR(10);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" VARCHAR(500),
ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_activity" TIMESTAMP(3),
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "login_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "password_changed_at" TIMESTAMP(3),
ADD COLUMN     "password_reset_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" VARCHAR(50),
ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "active_company_id" SET DATA TYPE TEXT,
ALTER COLUMN "active_store_id" SET DATA TYPE TEXT;

-- RenameIndex
ALTER INDEX "companies_aims_company_code_key" RENAME TO "companies_code_key";
