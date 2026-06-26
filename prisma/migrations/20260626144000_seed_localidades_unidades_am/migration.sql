UPDATE "unidades_organizacionais"
SET
  "uf" = 'AM',
  "municipio" = 'Manaus',
  "municipio_ibge" = '1302603'
WHERE "sigla" = 'SJAM'
  AND ("uf" IS NULL OR "municipio" IS NULL OR "municipio_ibge" IS NULL);

UPDATE "unidades_organizacionais"
SET
  "uf" = 'AM',
  "municipio" = 'Tabatinga',
  "municipio_ibge" = '1304062'
WHERE "sigla" = 'SSJBTN'
  AND ("uf" IS NULL OR "municipio" IS NULL OR "municipio_ibge" IS NULL);
