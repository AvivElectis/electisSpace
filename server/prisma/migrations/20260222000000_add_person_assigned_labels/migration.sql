-- AlterTable: Add assigned_labels array column to people
ALTER TABLE "people" ADD COLUMN "assigned_labels" TEXT[] DEFAULT ARRAY[]::TEXT[];
