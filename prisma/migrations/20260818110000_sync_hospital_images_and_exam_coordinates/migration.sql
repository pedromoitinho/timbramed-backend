-- Sincroniza colunas/tabelas que ja existem no schema.prisma (e no banco de producao)
-- mas nunca tiveram migration versionada. Tudo idempotente.

ALTER TABLE "hospitais"
  ADD COLUMN IF NOT EXISTS "relatorio_imagem" TEXT,
  ADD COLUMN IF NOT EXISTS "assinatura_imagem" TEXT,
  ADD COLUMN IF NOT EXISTS "exame_imagem" TEXT;

CREATE TABLE IF NOT EXISTS "coordenadas_exame" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "nome_x_cm" DECIMAL(8,2) NOT NULL,
    "nome_y_cm" DECIMAL(8,2) NOT NULL,
    "endereco_x_cm" DECIMAL(8,2) NOT NULL,
    "endereco_y_cm" DECIMAL(8,2) NOT NULL,
    "identidade_x_cm" DECIMAL(8,2) NOT NULL,
    "identidade_y_cm" DECIMAL(8,2) NOT NULL,
    "motivo_x_cm" DECIMAL(8,2) NOT NULL,
    "motivo_y_cm" DECIMAL(8,2) NOT NULL,
    "exame_solicitado_x_cm" DECIMAL(8,2) NOT NULL,
    "exame_solicitado_y_cm" DECIMAL(8,2) NOT NULL,
    "codigo_x_cm" DECIMAL(8,2) NOT NULL,
    "codigo_y_cm" DECIMAL(8,2) NOT NULL,
    "paciente_x_cm" DECIMAL(8,2) NOT NULL,
    "paciente_y_cm" DECIMAL(8,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coordenadas_exame_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coordenadas_exame_hospital_id_key" ON "coordenadas_exame"("hospital_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coordenadas_exame_hospital_id_fkey'
  ) THEN
    ALTER TABLE "coordenadas_exame"
      ADD CONSTRAINT "coordenadas_exame_hospital_id_fkey"
      FOREIGN KEY ("hospital_id") REFERENCES "hospitais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
