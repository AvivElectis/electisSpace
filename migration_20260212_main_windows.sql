-- =====================================================================
-- Migration: v2.1.0 — Add performance indexes for Person table
-- Date: 2026-02-12
-- Branch: main_windows
-- =====================================================================
--
-- These indexes improve query performance for the people feature.
-- Safe to run on a live production database:
--   - CONCURRENTLY: no table locks, reads/writes continue normally
--   - IF NOT EXISTS: idempotent, safe to re-run
--
-- After running this SQL, sync the Prisma client metadata:
--   cd server && npx prisma db push
-- =====================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS "people_externalId_idx" ON "people" ("externalId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "people_virtualSpaceId_idx" ON "people" ("virtualSpaceId");
