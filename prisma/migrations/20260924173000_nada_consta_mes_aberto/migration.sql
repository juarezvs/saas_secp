ALTER TABLE "regulamentacoes_ponto_orgaos"
ADD COLUMN IF NOT EXISTS "nada_consta_considera_mes_aberto" BOOLEAN NOT NULL DEFAULT false;
