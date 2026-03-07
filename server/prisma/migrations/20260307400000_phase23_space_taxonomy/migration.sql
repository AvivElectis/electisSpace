-- Phase 23: Space Taxonomy — CompassSpaceType enum, Amenity, Neighborhood, SpaceAmenity

-- CreateEnum
CREATE TYPE "CompassSpaceType" AS ENUM ('DESK', 'MEETING_ROOM', 'PHONE_BOOTH', 'COLLABORATION_ZONE', 'PARKING', 'LOCKER', 'EVENT_SPACE');

-- CreateTable: amenities
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_he" VARCHAR(100),
    "icon" VARCHAR(50),
    "category" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable: space_amenities
CREATE TABLE "space_amenities" (
    "space_id" TEXT NOT NULL,
    "amenity_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "space_amenities_pkey" PRIMARY KEY ("space_id","amenity_id")
);

-- CreateTable: neighborhoods
CREATE TABLE "neighborhoods" (
    "id" TEXT NOT NULL,
    "floor_id" TEXT NOT NULL,
    "department_id" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7),
    "description" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

-- AlterTable: spaces — add compass_space_type, neighborhood_id, min/max capacity
ALTER TABLE "spaces" ADD COLUMN "compass_space_type" "CompassSpaceType";
ALTER TABLE "spaces" ADD COLUMN "neighborhood_id" TEXT;
ALTER TABLE "spaces" ADD COLUMN "min_capacity" INTEGER;
ALTER TABLE "spaces" ADD COLUMN "max_capacity" INTEGER;

-- CreateIndex: amenities
CREATE UNIQUE INDEX "amenities_company_id_name_key" ON "amenities"("company_id", "name");
CREATE INDEX "amenities_company_id_is_active_idx" ON "amenities"("company_id", "is_active");

-- CreateIndex: space_amenities
CREATE INDEX "space_amenities_amenity_id_idx" ON "space_amenities"("amenity_id");

-- CreateIndex: neighborhoods
CREATE INDEX "neighborhoods_floor_id_idx" ON "neighborhoods"("floor_id");

-- CreateIndex: spaces (new columns)
CREATE INDEX "spaces_neighborhood_id_idx" ON "spaces"("neighborhood_id");
CREATE INDEX "spaces_compass_space_type_idx" ON "spaces"("compass_space_type");

-- AddForeignKey: amenities → companies
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: space_amenities → spaces
ALTER TABLE "space_amenities" ADD CONSTRAINT "space_amenities_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: space_amenities → amenities
ALTER TABLE "space_amenities" ADD CONSTRAINT "space_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: neighborhoods → floors
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: neighborhoods → departments
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: spaces → neighborhoods
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
