-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y', 'LOYALTY_POINTS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable (matches Prisma schema exactly)
CREATE TABLE IF NOT EXISTS "rewards_campaigns" (
  "id"              TEXT NOT NULL,
  "store_id"        TEXT NOT NULL,
  "name"            VARCHAR(200) NOT NULL,
  "name_he"         VARCHAR(200),
  "description"     TEXT,
  "status"          "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "start_date"      TIMESTAMP(3),
  "end_date"        TIMESTAMP(3),
  "template_key"    VARCHAR(50),
  "discount_type"   "DiscountType",
  "discount_value"  DECIMAL(10, 2),
  "label_codes"     TEXT[] NOT NULL DEFAULT '{}',
  "priority"        INTEGER NOT NULL DEFAULT 0,
  "metadata"        JSONB NOT NULL DEFAULT '{}',
  "created_by"      TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rewards_campaigns_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rewards_campaigns"
  ADD CONSTRAINT "rewards_campaigns_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rewards_campaigns_store_id_idx" ON "rewards_campaigns"("store_id");
CREATE INDEX IF NOT EXISTS "rewards_campaigns_status_idx" ON "rewards_campaigns"("status");
