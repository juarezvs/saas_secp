ALTER TABLE "equipamentos_biometricos"
ADD COLUMN IF NOT EXISTS "orgao_id" UUID;

UPDATE "equipamentos_biometricos" e
SET "orgao_id" = u."orgao_id"
FROM "unidades_organizacionais" u
WHERE e."orgao_id" IS NULL
  AND e."unidade_id" = u."id";

UPDATE "equipamentos_biometricos" e
SET "orgao_id" = i."orgao_id"
FROM "integracoes_sistemas" i
WHERE e."orgao_id" IS NULL
  AND e."integracao_id" = i."id";

CREATE INDEX IF NOT EXISTS "equipamentos_biometricos_orgao_id_idx"
ON "equipamentos_biometricos"("orgao_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'equipamentos_biometricos_orgao_id_fkey'
  ) THEN
    ALTER TABLE "equipamentos_biometricos"
    ADD CONSTRAINT "equipamentos_biometricos_orgao_id_fkey"
    FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "usuarios"
SET "tipo" = CASE
  WHEN upper("matricula") LIKE '%ES' THEN 'ESTAGIARIO'::"TipoUsuario"
  WHEN upper("matricula") LIKE '%VO' THEN 'VOLUNTARIO'::"TipoUsuario"
  WHEN upper("matricula") LIKE '%PS' THEN 'PRESTADOR'::"TipoUsuario"
  ELSE "tipo"
END
WHERE upper("matricula") LIKE '%ES'
   OR upper("matricula") LIKE '%VO'
   OR upper("matricula") LIKE '%PS';
