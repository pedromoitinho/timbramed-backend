-- Posicao da data no relatorio (calibracao). Nula = data nao posicionada ainda.
ALTER TABLE "coordenadas"
  ADD COLUMN IF NOT EXISTS "data_x_cm" DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS "data_y_cm" DECIMAL(8,2);

-- Opcoes por relatorio: imprimir carimbo/assinatura e imprimir data.
ALTER TABLE "Relatorios_Fila"
  ADD COLUMN IF NOT EXISTS "com_carimbo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "com_data" BOOLEAN NOT NULL DEFAULT true;
