CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEDICO');

CREATE TYPE "ReportStatus" AS ENUM ('PENDENTE', 'CONCLUIDO');

CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT,
    "senha_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEDICO',
    "hospital_atual_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hospitais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "largura_cm" DECIMAL(8,2) NOT NULL,
    "altura_cm" DECIMAL(8,2) NOT NULL,
    "fonte_arquivo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitais_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coordenadas" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "titulo_x_cm" DECIMAL(8,2) NOT NULL,
    "titulo_y_cm" DECIMAL(8,2) NOT NULL,
    "corpo_x_cm" DECIMAL(8,2) NOT NULL,
    "corpo_y_cm" DECIMAL(8,2) NOT NULL,
    "corpo_max_x_cm" DECIMAL(8,2) NOT NULL,
    "corpo_limite_inferior_y_cm" DECIMAL(8,2) NOT NULL,
    "cid_x_cm" DECIMAL(8,2) NOT NULL,
    "cid_y_cm" DECIMAL(8,2) NOT NULL,
    "encerramento_x_cm" DECIMAL(8,2) NOT NULL,
    "encerramento_y_cm" DECIMAL(8,2) NOT NULL,
    "carimbo_x_cm" DECIMAL(8,2) NOT NULL,
    "carimbo_y_cm" DECIMAL(8,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coordenadas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sintomas" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cid" TEXT,
    "mensagem_predeterminada" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sintomas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Relatorios_Fila" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "medico_id" TEXT,
    "sintoma_id" TEXT,
    "paciente_nome" TEXT NOT NULL,
    "sintoma_nome" TEXT,
    "mensagem_final" TEXT NOT NULL,
    "cid" TEXT,
    "data_relatorio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDENTE',
    "impresso_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relatorios_Fila_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_login_key" ON "usuarios"("login");

CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

CREATE UNIQUE INDEX "hospitais_nome_key" ON "hospitais"("nome");

CREATE UNIQUE INDEX "coordenadas_hospital_id_key" ON "coordenadas"("hospital_id");

CREATE UNIQUE INDEX "sintomas_hospital_id_nome_key" ON "sintomas"("hospital_id", "nome");

CREATE INDEX "Relatorios_Fila_hospital_id_status_idx" ON "Relatorios_Fila"("hospital_id", "status");

ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_hospital_atual_id_fkey" FOREIGN KEY ("hospital_atual_id") REFERENCES "hospitais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "coordenadas" ADD CONSTRAINT "coordenadas_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sintomas" ADD CONSTRAINT "sintomas_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Relatorios_Fila" ADD CONSTRAINT "Relatorios_Fila_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Relatorios_Fila" ADD CONSTRAINT "Relatorios_Fila_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Relatorios_Fila" ADD CONSTRAINT "Relatorios_Fila_sintoma_id_fkey" FOREIGN KEY ("sintoma_id") REFERENCES "sintomas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

