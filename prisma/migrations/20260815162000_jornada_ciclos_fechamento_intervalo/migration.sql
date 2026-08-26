ALTER TABLE "jornadas_dias"
ADD COLUMN IF NOT EXISTS "fechamento_ciclo" VARCHAR(6),
ADD COLUMN IF NOT EXISTS "intervalo_livre" BOOLEAN NOT NULL DEFAULT false;
