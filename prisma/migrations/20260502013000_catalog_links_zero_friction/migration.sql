ALTER TABLE "sintomas" ADD COLUMN IF NOT EXISTS "cid_id" TEXT;
ALTER TABLE "mensagens_predefinidas" ADD COLUMN IF NOT EXISTS "sintoma_id" TEXT;

UPDATE "sintomas" s
SET "cid_id" = c."id"
FROM "cids" c
WHERE s."hospital_id" = c."hospital_id"
  AND s."cid_id" IS NULL
  AND (
    s."cid" = c."codigo"
    OR LOWER(s."nome") = LOWER(c."codigo")
    OR (c."descricao" IS NOT NULL AND LOWER(s."nome") = LOWER(c."descricao"))
  );

UPDATE "mensagens_predefinidas" m
SET "sintoma_id" = s."id"
FROM "sintomas" s
WHERE m."hospital_id" = s."hospital_id"
  AND m."sintoma_id" IS NULL
  AND LOWER(m."titulo") = LOWER(s."nome");

DROP INDEX IF EXISTS "sintomas_cid_id_idx";
DROP INDEX IF EXISTS "mensagens_predefinidas_sintoma_id_idx";
CREATE INDEX "sintomas_cid_id_idx" ON "sintomas"("cid_id");
CREATE INDEX "mensagens_predefinidas_sintoma_id_idx" ON "mensagens_predefinidas"("sintoma_id");

ALTER TABLE "sintomas" ADD CONSTRAINT "sintomas_cid_id_fkey" FOREIGN KEY ("cid_id") REFERENCES "cids"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mensagens_predefinidas" ADD CONSTRAINT "mensagens_predefinidas_sintoma_id_fkey" FOREIGN KEY ("sintoma_id") REFERENCES "sintomas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cids" DROP COLUMN IF EXISTS "descricao";