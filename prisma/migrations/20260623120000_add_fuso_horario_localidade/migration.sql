ALTER TABLE "unidades_organizacionais"
ADD COLUMN IF NOT EXISTS "fuso_horario" VARCHAR(80) NOT NULL DEFAULT 'America/Manaus';

ALTER TABLE "marcacoes"
ADD COLUMN IF NOT EXISTS "fuso_horario" VARCHAR(80) NOT NULL DEFAULT 'America/Manaus';

WITH RECURSIVE unidades_tabatinga AS (
  SELECT
    "id",
    "codigo_externo_sarh"
  FROM "unidades_organizacionais"
  WHERE
    "nome" ILIKE '%TABATINGA%'
    OR "codigo" = 'SSJTBN'
    OR "sigla" = 'SSJTBN'

  UNION ALL

  SELECT
    filha."id",
    filha."codigo_externo_sarh"
  FROM "unidades_organizacionais" filha
  INNER JOIN unidades_tabatinga pai
    ON filha."codigo_externo_pai_sarh" = pai."codigo_externo_sarh"
  WHERE pai."codigo_externo_sarh" IS NOT NULL
)
UPDATE "unidades_organizacionais"
SET "fuso_horario" = 'America/Eirunepe'
WHERE "id" IN (SELECT "id" FROM unidades_tabatinga);

UPDATE "marcacoes" marcacao
SET "fuso_horario" = unidade."fuso_horario"
FROM "lotacoes" lotacao
INNER JOIN "unidades_organizacionais" unidade
  ON unidade."id" = lotacao."unidade_id"
WHERE
  marcacao."servidor_id" = lotacao."servidor_id"
  AND marcacao."data_referencia" >= lotacao."data_inicio"
  AND (
    lotacao."data_fim" IS NULL
    OR marcacao."data_referencia" <= lotacao."data_fim"
  )
  AND unidade."fuso_horario" <> 'America/Manaus';
