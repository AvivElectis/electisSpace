-- AlterTable: Add assigned_labels array column to spaces
ALTER TABLE "spaces" ADD COLUMN "assigned_labels" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable: Add assigned_labels array column to conference_rooms
ALTER TABLE "conference_rooms" ADD COLUMN "assigned_labels" TEXT[] DEFAULT ARRAY[]::TEXT[];
