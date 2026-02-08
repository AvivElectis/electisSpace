-- AlterTable: Add content JSON column to people_lists
ALTER TABLE "people_lists" ADD COLUMN IF NOT EXISTS "content" JSONB NOT NULL DEFAULT '[]';

-- AddUniqueConstraint: Unique list name per store for people lists
ALTER TABLE "people_lists" ADD CONSTRAINT "people_lists_store_id_name_key" UNIQUE ("store_id", "name");

-- CreateTable: spaces_lists
CREATE TABLE "spaces_lists" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spaces_lists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spaces_lists_store_id_idx" ON "spaces_lists"("store_id");

-- CreateIndex (unique constraint)
CREATE UNIQUE INDEX "spaces_lists_store_id_name_key" ON "spaces_lists"("store_id", "name");

-- AddForeignKey
ALTER TABLE "spaces_lists" ADD CONSTRAINT "spaces_lists_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaces_lists" ADD CONSTRAINT "spaces_lists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
