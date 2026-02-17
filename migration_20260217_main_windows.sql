-- =====================================================================
-- Migration: ClaudeEdits -> main_windows
-- Date: 2026-02-17
-- Commits: 609cca6, 818fdcd, 373694c, a924a1e
-- =====================================================================
--
-- Schema change: Add assigned_labels TEXT[] column to spaces and
-- conference_rooms tables. These track which AIMS labels are linked
-- to each space/conference room.
--
-- Safe to run on a live production database:
--   - IF NOT EXISTS pattern via DO block: idempotent, safe to re-run
--   - No table locks beyond a brief ALTER TABLE
--
-- After running this SQL, sync the Prisma client:
--   cd server && npx prisma generate
-- =====================================================================

-- Add assigned_labels to spaces (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'assigned_labels'
    ) THEN
        ALTER TABLE "spaces" ADD COLUMN "assigned_labels" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END
$$;

-- Add assigned_labels to conference_rooms (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conference_rooms' AND column_name = 'assigned_labels'
    ) THEN
        ALTER TABLE "conference_rooms" ADD COLUMN "assigned_labels" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END
$$;
