ALTER TABLE "usuarios"
  ADD COLUMN IF NOT EXISTS "pending_email" TEXT,
  ADD COLUMN IF NOT EXISTS "email_change_token_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "email_change_token_expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mercadopago_card_last_four" TEXT,
  ADD COLUMN IF NOT EXISTS "mercadopago_payment_method_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_email_change_token_hash_key" ON "usuarios"("email_change_token_hash");
