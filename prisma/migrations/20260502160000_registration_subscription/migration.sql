CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

ALTER TABLE "usuarios"
  ADD COLUMN IF NOT EXISTS "cpf" TEXT,
  ADD COLUMN IF NOT EXISTS "endereco" TEXT,
  ADD COLUMN IF NOT EXISTS "crm" TEXT,
  ADD COLUMN IF NOT EXISTS "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mercadopago_preapproval_id" TEXT,
  ADD COLUMN IF NOT EXISTS "mercadopago_init_point" TEXT,
  ADD COLUMN IF NOT EXISTS "subscription_started_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "subscription_canceled_at" TIMESTAMP(3);

UPDATE "usuarios"
SET "subscription_status" = 'ACTIVE',
    "subscription_started_at" = COALESCE("subscription_started_at", NOW())
WHERE "cpf" IS NULL AND "crm" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_cpf_key" ON "usuarios"("cpf");
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_crm_key" ON "usuarios"("crm");
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_mercadopago_preapproval_id_key" ON "usuarios"("mercadopago_preapproval_id");
