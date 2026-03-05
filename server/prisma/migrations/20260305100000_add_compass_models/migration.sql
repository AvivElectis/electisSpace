-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AreaType" AS ENUM ('WING', 'ZONE', 'DEPARTMENT', 'SECTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "CompanyUserRole" AS ENUM ('EMPLOYEE', 'MANAGER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "BookingStatus" AS ENUM ('BOOKED', 'CHECKED_IN', 'RELEASED', 'AUTO_RELEASED', 'CANCELLED', 'NO_SHOW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "BookingRuleType" AS ENUM ('MAX_DURATION', 'MAX_ADVANCE_BOOKING', 'MAX_CONCURRENT', 'CHECK_IN_WINDOW', 'AUTO_RELEASE', 'BLOCKED_TIMES');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "RuleApplyTo" AS ENUM ('ALL_BRANCHES', 'SELECTED_BRANCHES');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "CompassSpaceMode" AS ENUM ('AVAILABLE', 'EXCLUDED', 'PERMANENT', 'MAINTENANCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: Add compass fields to companies
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "compass_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "compass_config" JSONB;

-- AlterTable: Add compass fields to spaces
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "building_id" TEXT;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "floor_id" TEXT;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "area_id" TEXT;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "compass_mode" "CompassSpaceMode";
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "compass_capacity" INTEGER;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "compass_amenities" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "permanent_assignee_id" TEXT;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "map_x" DOUBLE PRECISION;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "map_y" DOUBLE PRECISION;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "map_rotation" DOUBLE PRECISION;

-- CreateTable: buildings
CREATE TABLE IF NOT EXISTS "buildings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: floors
CREATE TABLE IF NOT EXISTS "floors" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "prefix" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "range_start" VARCHAR(20),
    "range_end" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: areas
CREATE TABLE IF NOT EXISTS "areas" (
    "id" TEXT NOT NULL,
    "floor_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "AreaType" NOT NULL DEFAULT 'ZONE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable: floor_plans
CREATE TABLE IF NOT EXISTS "floor_plans" (
    "id" TEXT NOT NULL,
    "floor_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "image_width" INTEGER NOT NULL,
    "image_height" INTEGER NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: company_users
CREATE TABLE IF NOT EXISTS "company_users" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "building_id" TEXT,
    "floor_id" TEXT,
    "area_id" TEXT,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "display_name" VARCHAR(200) NOT NULL,
    "avatar_url" VARCHAR(500),
    "role" "CompanyUserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "external_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bookings
CREATE TABLE IF NOT EXISTS "bookings" (
    "id" TEXT NOT NULL,
    "company_user_id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "status" "BookingStatus" NOT NULL DEFAULT 'BOOKED',
    "checked_in_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "auto_released" BOOLEAN NOT NULL DEFAULT false,
    "booked_by" TEXT,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: booking_rules
CREATE TABLE IF NOT EXISTS "booking_rules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "rule_type" "BookingRuleType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "apply_to" "RuleApplyTo" NOT NULL DEFAULT 'ALL_BRANCHES',
    "target_branch_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_space_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: friendships
CREATE TABLE IF NOT EXISTS "friendships" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "addressee_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable: company_user_device_tokens
CREATE TABLE IF NOT EXISTS "company_user_device_tokens" (
    "id" TEXT NOT NULL,
    "company_user_id" TEXT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(255),
    "platform" VARCHAR(50),
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_user_device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable: company_user_verification_codes
CREATE TABLE IF NOT EXISTS "company_user_verification_codes" (
    "id" TEXT NOT NULL,
    "company_user_id" TEXT,
    "email" VARCHAR(255) NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_user_verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes: buildings
CREATE INDEX IF NOT EXISTS "buildings_company_id_idx" ON "buildings"("company_id");
CREATE INDEX IF NOT EXISTS "buildings_store_id_idx" ON "buildings"("store_id");
CREATE UNIQUE INDEX IF NOT EXISTS "buildings_company_id_store_id_code_key" ON "buildings"("company_id", "store_id", "code");

-- CreateIndexes: floors
CREATE INDEX IF NOT EXISTS "floors_building_id_idx" ON "floors"("building_id");
CREATE UNIQUE INDEX IF NOT EXISTS "floors_building_id_prefix_key" ON "floors"("building_id", "prefix");

-- CreateIndexes: areas
CREATE INDEX IF NOT EXISTS "areas_floor_id_idx" ON "areas"("floor_id");

-- CreateIndexes: floor_plans
CREATE INDEX IF NOT EXISTS "floor_plans_company_id_idx" ON "floor_plans"("company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "floor_plans_floor_id_branch_id_key" ON "floor_plans"("floor_id", "branch_id");

-- CreateIndexes: company_users
CREATE INDEX IF NOT EXISTS "company_users_company_id_idx" ON "company_users"("company_id");
CREATE INDEX IF NOT EXISTS "company_users_branch_id_idx" ON "company_users"("branch_id");
CREATE INDEX IF NOT EXISTS "company_users_external_id_idx" ON "company_users"("external_id");
CREATE UNIQUE INDEX IF NOT EXISTS "company_users_company_id_email_key" ON "company_users"("company_id", "email");

-- CreateIndexes: bookings
CREATE INDEX IF NOT EXISTS "bookings_space_id_start_time_end_time_idx" ON "bookings"("space_id", "start_time", "end_time");
CREATE INDEX IF NOT EXISTS "bookings_company_user_id_start_time_idx" ON "bookings"("company_user_id", "start_time");
CREATE INDEX IF NOT EXISTS "bookings_company_id_status_idx" ON "bookings"("company_id", "status");
CREATE INDEX IF NOT EXISTS "bookings_status_end_time_idx" ON "bookings"("status", "end_time");

-- CreateIndexes: booking_rules
CREATE INDEX IF NOT EXISTS "booking_rules_company_id_idx" ON "booking_rules"("company_id");

-- CreateIndexes: friendships
CREATE INDEX IF NOT EXISTS "friendships_addressee_id_idx" ON "friendships"("addressee_id");
CREATE INDEX IF NOT EXISTS "friendships_company_id_idx" ON "friendships"("company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_requester_id_addressee_id_key" ON "friendships"("requester_id", "addressee_id");

-- CreateIndexes: company_user_device_tokens
CREATE INDEX IF NOT EXISTS "company_user_device_tokens_token_hash_idx" ON "company_user_device_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "company_user_device_tokens_company_user_id_idx" ON "company_user_device_tokens"("company_user_id");

-- CreateIndexes: company_user_verification_codes
CREATE INDEX IF NOT EXISTS "company_user_verification_codes_email_consumed_idx" ON "company_user_verification_codes"("email", "consumed");
CREATE INDEX IF NOT EXISTS "company_user_verification_codes_company_user_id_idx" ON "company_user_verification_codes"("company_user_id");

-- CreateIndexes: spaces compass fields
CREATE INDEX IF NOT EXISTS "spaces_building_id_idx" ON "spaces"("building_id");
CREATE INDEX IF NOT EXISTS "spaces_floor_id_idx" ON "spaces"("floor_id");
CREATE INDEX IF NOT EXISTS "spaces_compass_mode_idx" ON "spaces"("compass_mode");

-- AddForeignKey: buildings
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: floors
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: areas
ALTER TABLE "areas" ADD CONSTRAINT "areas_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: floor_plans
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: company_users
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: bookings
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_company_user_id_fkey" FOREIGN KEY ("company_user_id") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: booking_rules
ALTER TABLE "booking_rules" ADD CONSTRAINT "booking_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: friendships
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: company_user_device_tokens
ALTER TABLE "company_user_device_tokens" ADD CONSTRAINT "company_user_device_tokens_company_user_id_fkey" FOREIGN KEY ("company_user_id") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: company_user_verification_codes
ALTER TABLE "company_user_verification_codes" ADD CONSTRAINT "company_user_verification_codes_company_user_id_fkey" FOREIGN KEY ("company_user_id") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: spaces compass relations
DO $$ BEGIN
    ALTER TABLE "spaces" ADD CONSTRAINT "spaces_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "spaces" ADD CONSTRAINT "spaces_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "spaces" ADD CONSTRAINT "spaces_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "spaces" ADD CONSTRAINT "spaces_permanent_assignee_id_fkey" FOREIGN KEY ("permanent_assignee_id") REFERENCES "company_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
