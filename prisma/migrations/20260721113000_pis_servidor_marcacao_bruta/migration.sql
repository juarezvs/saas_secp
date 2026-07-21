ALTER TABLE "servidores"
  ADD COLUMN "pis" VARCHAR(20);

ALTER TABLE "marcacoes_brutas"
  ADD COLUMN "pis" VARCHAR(20);

CREATE UNIQUE INDEX "servidores_pis_key"
  ON "servidores"("pis");

CREATE INDEX "servidores_pis_idx"
  ON "servidores"("pis");

CREATE INDEX "marcacoes_brutas_pis_idx"
  ON "marcacoes_brutas"("pis");
