-- CreateTable
CREATE TABLE IF NOT EXISTS "sso_configs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "protocol" VARCHAR(10) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "force_sso" BOOLEAN NOT NULL DEFAULT false,
    "auto_provision" BOOLEAN NOT NULL DEFAULT false,
    "claim_mapping" JSONB,
    "idp_entity_id" VARCHAR(500),
    "sso_url" VARCHAR(500),
    "slo_url" VARCHAR(500),
    "x509_certificate" TEXT,
    "issuer" VARCHAR(500),
    "client_id" VARCHAR(255),
    "client_secret" TEXT,
    "discovery_url" VARCHAR(500),
    "scopes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sso_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sso_configs_domain_idx" ON "sso_configs"("domain");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sso_configs_company_id_domain_key" ON "sso_configs"("company_id", "domain");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sso_configs_company_id_fkey') THEN
        ALTER TABLE "sso_configs" ADD CONSTRAINT "sso_configs_company_id_fkey"
            FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
