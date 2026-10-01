-- Parametros de ferias por seccional e controle de ciencia/excecoes SECAP.
ALTER TABLE "regulamentacoes_ponto_orgaos"
  ADD COLUMN "ferias_antecedencia_primeiro_periodo_dias" INTEGER NOT NULL DEFAULT 45,
  ADD COLUMN "ferias_antecedencia_demais_periodos_dias_uteis" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "ferias_janela_ciencia_primeiro_periodo_dias" INTEGER NOT NULL DEFAULT 45,
  ADD COLUMN "ferias_exige_ciencia_primeiro_periodo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "ferias_aprovacao_automatica_secap" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "programacoes_ferias"
  ADD COLUMN "ciencia_adicional_ferias_texto" TEXT,
  ADD COLUMN "ciencia_adicional_ferias_em" TIMESTAMP(3);

CREATE TABLE "excecoes_secap_ferias_servidores" (
  "id" UUID NOT NULL,
  "servidor_id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "motivo" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_por_usuario_id" UUID,
  "encerrado_por_usuario_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "encerrado_em" TIMESTAMP(3),
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "excecoes_secap_ferias_servidores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "excecoes_secap_ferias_servidores_orgao_id_idx" ON "excecoes_secap_ferias_servidores"("orgao_id");
CREATE INDEX "excecoes_secap_ferias_servidores_servidor_id_idx" ON "excecoes_secap_ferias_servidores"("servidor_id");
CREATE INDEX "excecoes_secap_ferias_servidores_ativo_idx" ON "excecoes_secap_ferias_servidores"("ativo");

ALTER TABLE "excecoes_secap_ferias_servidores"
  ADD CONSTRAINT "excecoes_secap_ferias_servidores_servidor_id_fkey"
  FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "excecoes_secap_ferias_servidores"
  ADD CONSTRAINT "excecoes_secap_ferias_servidores_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "excecoes_secap_ferias_servidores"
  ADD CONSTRAINT "excecoes_secap_ferias_servidores_criado_por_usuario_id_fkey"
  FOREIGN KEY ("criado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "excecoes_secap_ferias_servidores"
  ADD CONSTRAINT "excecoes_secap_ferias_servidores_encerrado_por_usuario_id_fkey"
  FOREIGN KEY ("encerrado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
