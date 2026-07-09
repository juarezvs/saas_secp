ALTER TABLE "banco_horas_saldos"
  ADD COLUMN "saldo_inicial_credito_minutos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "saldo_inicial_debito_minutos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "competencia_inicio_controle" VARCHAR(7);

CREATE INDEX "banco_horas_saldos_competencia_inicio_controle_idx"
  ON "banco_horas_saldos"("competencia_inicio_controle");
