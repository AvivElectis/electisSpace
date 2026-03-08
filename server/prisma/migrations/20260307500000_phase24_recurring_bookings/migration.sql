-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BookingType" AS ENUM ('HOT_DESK', 'MEETING', 'ADMIN_RESERVE', 'PERMANENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: Add recurrence fields
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_type" "BookingType" NOT NULL DEFAULT 'HOT_DESK';
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "recurrence_rule" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "recurrence_group_id" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "is_recurrence" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "parent_booking_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_recurrenceGroupId_idx" ON "bookings"("recurrence_group_id");
