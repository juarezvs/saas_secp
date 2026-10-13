CREATE TABLE "mct_comparacoes_legado" (
  "id" UUID NOT NULL,
  "execucao_id" UUID NOT NULL,
  "legado_snapshot" JSONB NOT NULL,
  "divergencias" JSONB NOT NULL,
  "total_divergencias" INTEGER NOT NULL,
  "possui_divergencia_critica" BOOLEAN NOT NULL DEFAULT false,
  "comparado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mct_comparacoes_legado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mct_comparacoes_legado_execucao_id_key"
  ON "mct_comparacoes_legado"("execucao_id");
CREATE INDEX "mct_comparacoes_legado_critica_idx"
  ON "mct_comparacoes_legado"("possui_divergencia_critica");
CREATE INDEX "mct_comparacoes_legado_comparado_em_idx"
  ON "mct_comparacoes_legado"("comparado_em");

ALTER TABLE "mct_comparacoes_legado"
  ADD CONSTRAINT "mct_comparacoes_legado_execucao_fkey"
  FOREIGN KEY ("execucao_id") REFERENCES "mct_execucoes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
