-- Phase 21: Company Work Configuration + Store Address
-- All fields are nullable — no breaking changes

-- Company: work week configuration
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "work_week_start" INTEGER DEFAULT 0;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "work_week_end" INTEGER DEFAULT 4;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "working_days" JSONB;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "working_hours_start" VARCHAR(5);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "working_hours_end" VARCHAR(5);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "default_timezone" VARCHAR(50);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "default_locale" VARCHAR(10);

-- Store: structured address
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "address_line1" VARCHAR(255);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "address_line2" VARCHAR(255);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "city" VARCHAR(100);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "state" VARCHAR(100);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "postal_code" VARCHAR(20);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "country" VARCHAR(2);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- Store: capacity
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "total_desks" INTEGER;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "max_occupancy" INTEGER;

-- Store: operating hours (overrides company defaults)
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "working_days" JSONB;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "working_hours_start" VARCHAR(5);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "working_hours_end" VARCHAR(5);
