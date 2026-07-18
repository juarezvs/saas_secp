ALTER TABLE "orgaos"
  ADD COLUMN "uf" CHAR(2),
  ADD COLUMN "municipio" VARCHAR(120),
  ADD COLUMN "municipio_ibge" VARCHAR(7);

CREATE INDEX "orgaos_uf_idx" ON "orgaos"("uf");
CREATE INDEX "orgaos_municipio_ibge_idx" ON "orgaos"("municipio_ibge");

UPDATE "orgaos" o
SET
  "uf" = origem."uf",
  "municipio" = origem."municipio",
  "municipio_ibge" = origem."municipio_ibge"
FROM (
  SELECT DISTINCT ON (u."orgao_id")
    u."orgao_id",
    u."uf",
    u."municipio",
    u."municipio_ibge",
    CASE
      WHEN u."tipo" = 'ORGAO' THEN 1
      WHEN u."tipo" = 'SECAO_JUDICIARIA' THEN 2
      ELSE 3
    END AS prioridade
  FROM "unidades_organizacionais" u
  WHERE u."ativo" = true
    AND u."uf" IS NOT NULL
    AND u."municipio" IS NOT NULL
    AND u."tipo" IN ('ORGAO', 'SECAO_JUDICIARIA')
  ORDER BY u."orgao_id", prioridade, u."sigla"
) origem
WHERE o."id" = origem."orgao_id"
  AND o."uf" IS NULL
  AND o."municipio" IS NULL;
