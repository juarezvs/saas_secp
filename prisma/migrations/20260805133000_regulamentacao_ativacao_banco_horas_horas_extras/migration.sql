ALTER TABLE "regulamentacoes_ponto_orgaos"
  ADD COLUMN IF NOT EXISTS "banco_horas_ativo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "banco_horas_competencia_inicio" VARCHAR(7),
  ADD COLUMN IF NOT EXISTS "horas_extras_ativo" BOOLEAN NOT NULL DEFAULT true;

