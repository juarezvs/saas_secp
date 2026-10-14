CREATE TYPE "MctStatusConfiguracaoApuracao" AS ENUM (
  'RASCUNHO',
  'INCOMPLETA',
  'PRONTA_SIMULACAO',
  'EM_VALIDACAO',
  'ATIVA',
  'INCONSISTENTE'
);

CREATE TABLE "mct_configuracoes_apuracao" (
  "id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "jornada_id" UUID NOT NULL,
  "escala_id" UUID,
  "politica_versao_id" UUID,
  "modelo_codigo" VARCHAR(60) NOT NULL,
  "status" "MctStatusConfiguracaoApuracao" NOT NULL DEFAULT 'RASCUNHO',
  "configuracao_complementar" JSONB NOT NULL DEFAULT '{}',
  "vigencia_inicio" DATE NOT NULL,
  "vigencia_fim" DATE,
  "ativada_em" TIMESTAMP(3),
  "ativada_por_usuario_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mct_configuracoes_apuracao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mct_configuracoes_apuracao_orgao_id_status_idx"
  ON "mct_configuracoes_apuracao"("orgao_id", "status");
CREATE INDEX "mct_configuracoes_apuracao_jornada_id_vigencia_inicio_vigencia_fim_idx"
  ON "mct_configuracoes_apuracao"("jornada_id", "vigencia_inicio", "vigencia_fim");
CREATE INDEX "mct_configuracoes_apuracao_politica_versao_id_idx"
  ON "mct_configuracoes_apuracao"("politica_versao_id");

ALTER TABLE "mct_configuracoes_apuracao"
  ADD CONSTRAINT "mct_configuracoes_apuracao_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mct_configuracoes_apuracao"
  ADD CONSTRAINT "mct_configuracoes_apuracao_jornada_id_fkey"
  FOREIGN KEY ("jornada_id") REFERENCES "jornadas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mct_configuracoes_apuracao"
  ADD CONSTRAINT "mct_configuracoes_apuracao_escala_id_fkey"
  FOREIGN KEY ("escala_id") REFERENCES "escalas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mct_configuracoes_apuracao"
  ADD CONSTRAINT "mct_configuracoes_apuracao_politica_versao_id_fkey"
  FOREIGN KEY ("politica_versao_id") REFERENCES "mct_politicas_versoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
