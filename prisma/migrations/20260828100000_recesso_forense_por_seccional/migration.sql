ALTER TABLE "recessos_forenses"
  ADD COLUMN IF NOT EXISTS "orgao_id" UUID;

UPDATE "recessos_forenses" rf
SET "orgao_id" = origem."orgao_id"
FROM (
  SELECT
    cr."recesso_id",
    MIN(s."orgao_id"::text)::uuid AS "orgao_id",
    COUNT(DISTINCT s."orgao_id") AS "total_orgaos"
  FROM "recessos_convocados" cr
  JOIN "servidores" s ON s."id" = cr."servidor_id"
  WHERE s."orgao_id" IS NOT NULL
  GROUP BY cr."recesso_id"
) origem
WHERE rf."id" = origem."recesso_id"
  AND rf."orgao_id" IS NULL
  AND origem."total_orgaos" = 1;

ALTER TABLE "recessos_forenses"
  ADD CONSTRAINT "recessos_forenses_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "recessos_forenses_ano_key";

CREATE UNIQUE INDEX IF NOT EXISTS "recessos_forenses_ano_orgao_id_key"
  ON "recessos_forenses"("ano", "orgao_id");

CREATE INDEX IF NOT EXISTS "recessos_forenses_orgao_id_idx"
  ON "recessos_forenses"("orgao_id");
