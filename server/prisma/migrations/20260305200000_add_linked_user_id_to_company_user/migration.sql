-- Add ADMIN role to CompanyUserRole enum
ALTER TYPE "CompanyUserRole" ADD VALUE IF NOT EXISTS 'ADMIN';

-- Add linkedUserId column to company_users
ALTER TABLE "company_users" ADD COLUMN IF NOT EXISTS "linked_user_id" TEXT;

-- Add unique constraint on linked_user_id
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_linked_user_id_key" UNIQUE ("linked_user_id");

-- Add foreign key constraint
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
