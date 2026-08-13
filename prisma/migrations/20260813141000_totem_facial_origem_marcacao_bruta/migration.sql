ALTER TYPE "OrigemMarcacaoBruta" ADD VALUE IF NOT EXISTS 'TOTEM_FACIAL_SECP';

UPDATE "marcacoes"
SET "metadados" = jsonb_set(
  jsonb_set(
    COALESCE("marcacoes"."metadados", '{}'::jsonb),
    '{origemBruta}',
    '"TOTEM_FACIAL_SECP"'::jsonb,
    true
  ),
  '{origemRegistro}',
  '"TOTEM_FACIAL_SECP"'::jsonb,
  true
)
WHERE "id" IN (
  SELECT "marcacao_id"
  FROM "marcacoes_brutas"
  WHERE "origem" = 'FACIAL_AUTORIZADO'
    AND "equipamento_codigo" = 'TOTEM_FACIAL_SECP'
    AND "marcacao_id" IS NOT NULL
);

UPDATE "marcacoes_brutas"
SET "origem" = 'TOTEM_FACIAL_SECP'
WHERE "origem" = 'FACIAL_AUTORIZADO'
  AND "equipamento_codigo" = 'TOTEM_FACIAL_SECP';
