ALTER TABLE "regulamentacoes_ponto_orgaos"
  ALTER COLUMN "horas_fora_expediente_inconsistente" SET DEFAULT false;

UPDATE "regulamentacoes_ponto_orgaos"
SET "horas_fora_expediente_inconsistente" = false
WHERE "horas_fora_expediente_inconsistente" = true;

ALTER TABLE "servidores"
  ADD COLUMN "horas_fora_expediente_inconsistente" boolean;
