UPDATE "calendarios_institucionais"
SET
  "abrangencia" = 'MUNICIPAL',
  "orgao_id" = NULL,
  "unidade_id" = NULL
WHERE "abrangencia" = 'NACIONAL'
  AND "uf" IS NOT NULL
  AND ("municipio" IS NOT NULL OR "municipio_ibge" IS NOT NULL);

UPDATE "calendarios_institucionais"
SET
  "abrangencia" = 'ESTADUAL',
  "orgao_id" = NULL,
  "unidade_id" = NULL
WHERE "abrangencia" = 'NACIONAL'
  AND "uf" IS NOT NULL
  AND "municipio" IS NULL
  AND "municipio_ibge" IS NULL;

UPDATE "calendarios_institucionais"
SET
  "abrangencia" = 'UNIDADE',
  "uf" = NULL,
  "municipio" = NULL,
  "municipio_ibge" = NULL,
  "orgao_id" = NULL
WHERE "abrangencia" = 'NACIONAL'
  AND "unidade_id" IS NOT NULL;
