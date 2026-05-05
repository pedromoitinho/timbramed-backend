ALTER TABLE "sintomas" ALTER COLUMN "mensagem_predeterminada" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "cids" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cids_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "mensagens_predefinidas" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mensagens_predefinidas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cids_hospital_id_codigo_key" ON "cids"("hospital_id", "codigo");
CREATE UNIQUE INDEX IF NOT EXISTS "mensagens_predefinidas_hospital_id_titulo_key" ON "mensagens_predefinidas"("hospital_id", "titulo");

ALTER TABLE "cids" ADD CONSTRAINT "cids_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mensagens_predefinidas" ADD CONSTRAINT "mensagens_predefinidas_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "cids" ("id", "hospital_id", "codigo", "descricao", "created_at", "updated_at")
SELECT CONCAT('cid_', md5(CONCAT("hospital_id", COALESCE("cid", '')))), "hospital_id", "cid", NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "sintomas"
WHERE "cid" IS NOT NULL AND TRIM("cid") <> ''
ON CONFLICT ("hospital_id", "codigo") DO NOTHING;

INSERT INTO "mensagens_predefinidas" ("id", "hospital_id", "titulo", "texto", "created_at", "updated_at")
SELECT CONCAT('msg_', md5(CONCAT("hospital_id", "nome"))), "hospital_id", "nome", "mensagem_predeterminada", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "sintomas"
WHERE "mensagem_predeterminada" IS NOT NULL AND TRIM("mensagem_predeterminada") <> ''
ON CONFLICT ("hospital_id", "titulo") DO NOTHING;

UPDATE "hospitais" SET "fonte_arquivo" = 'SourceSerif4.ttf';
UPDATE "usuarios" SET "role" = 'MEDICO' WHERE "role" = 'ADMIN';