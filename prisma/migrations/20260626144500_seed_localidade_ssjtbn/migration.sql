UPDATE "unidades_organizacionais"
SET
  "uf" = 'AM',
  "municipio" = 'Tabatinga',
  "municipio_ibge" = '1304062'
WHERE "sigla" IN ('SSJTBN', 'SSJBTN')
  AND ("uf" IS NULL OR "municipio" IS NULL OR "municipio_ibge" IS NULL);
