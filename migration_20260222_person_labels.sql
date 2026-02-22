-- Migration: Add labelCode and assignedLabels columns to people table
-- Date: 2026-02-22
-- Purpose: Support per-person label tracking from AIMS article info sync

ALTER TABLE people ADD COLUMN IF NOT EXISTS label_code VARCHAR(50);
ALTER TABLE people ADD COLUMN IF NOT EXISTS assigned_labels TEXT[] DEFAULT '{}';
