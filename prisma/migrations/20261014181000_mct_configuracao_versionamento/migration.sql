ALTER TABLE "mct_configuracoes_apuracao"
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "configuracao_anterior_id" UUID;

ALTER TABLE "mct_configuracoes_apuracao"
  ADD CONSTRAINT "mct_configuracoes_apuracao_configuracao_anterior_id_fkey"
  FOREIGN KEY ("configuracao_anterior_id") REFERENCES "mct_configuracoes_apuracao"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "mct_configuracoes_apuracao_configuracao_anterior_id_idx"
  ON "mct_configuracoes_apuracao"("configuracao_anterior_id");
CREATE INDEX "mct_configuracoes_apuracao_jornada_id_escala_id_versao_idx"
  ON "mct_configuracoes_apuracao"("jornada_id", "escala_id", "versao");
