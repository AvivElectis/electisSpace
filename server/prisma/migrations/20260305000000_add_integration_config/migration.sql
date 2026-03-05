-- CreateTable
CREATE TABLE IF NOT EXISTS "integration_configs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "company_id" TEXT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "credentials" TEXT NOT NULL,
    "credentials_iv" VARCHAR(64) NOT NULL,
    "credentials_tag" VARCHAR(64) NOT NULL,
    "sync_interval_minutes" INTEGER NOT NULL DEFAULT 1440,
    "last_sync_at" TIMESTAMP(3),
    "last_sync_status" VARCHAR(50),
    "last_sync_error" TEXT,
    "last_sync_stats" JSONB,
    "sync_token" TEXT,
    "field_mapping" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "integration_configs_company_id_provider_type_key" ON "integration_configs"("company_id", "provider", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "integration_configs_company_id_idx" ON "integration_configs"("company_id");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
