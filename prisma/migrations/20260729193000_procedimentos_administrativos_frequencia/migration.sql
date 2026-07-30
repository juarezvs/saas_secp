CREATE TYPE "TipoProcedimentoAdministrativoFrequencia" AS ENUM (
  'JORNADA_DIARIA',
  'HORA_EXTRA',
  'COMPENSACAO_SALDO',
  'ALTERACAO_TEMPORARIA_JORNADA',
  'AFASTAMENTO_INFORMATIVO',
  'JORNADA_ESPECIAL',
  'AJUSTE_BANCO_ABERTO',
  'AJUSTE_BANCO_FECHADO',
  'TRABALHO_REMOTO',
  'CONVERSAO_HORAS_NAO_AUTORIZADAS',
  'NADA_CONSTA',
  'OUTRO'
);

CREATE TYPE "StatusProcedimentoAdministrativoFrequencia" AS ENUM (
  'RASCUNHO',
  'EM_ANALISE',
  'AUTORIZADO',
  'APLICADO',
  'INDEFERIDO',
  'CANCELADO'
);

CREATE TABLE "procedimentos_administrativos_frequencia" (
  "id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "codigo" VARCHAR(80) NOT NULL,
  "nome" VARCHAR(180) NOT NULL,
  "categoria" "TipoProcedimentoAdministrativoFrequencia" NOT NULL,
  "objetivo_final" TEXT NOT NULL,
  "descricao" TEXT,
  "fundamento_normativo" TEXT,
  "requer_processo_sei" BOOLEAN NOT NULL DEFAULT true,
  "requer_ciencia_gestor" BOOLEAN NOT NULL DEFAULT false,
  "requer_autoridade" BOOLEAN NOT NULL DEFAULT false,
  "requer_anexo" BOOLEAN NOT NULL DEFAULT false,
  "permite_banco_aberto" BOOLEAN NOT NULL DEFAULT true,
  "permite_banco_fechado" BOOLEAN NOT NULL DEFAULT false,
  "preserva_historico_original" BOOLEAN NOT NULL DEFAULT true,
  "permite_recalculo" BOOLEAN NOT NULL DEFAULT true,
  "permite_lancamento_competencia_posterior" BOOLEAN NOT NULL DEFAULT false,
  "meses_retroatividade_livre" INTEGER NOT NULL DEFAULT 6,
  "permissao_executar" VARCHAR(160),
  "permissao_autorizar" VARCHAR(160),
  "efeitos_esperados" JSONB,
  "checklist" JSONB,
  "parametros" JSONB,
  "ordem" INTEGER NOT NULL DEFAULT 100,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "procedimentos_administrativos_frequencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "procedimentos_administrativos_frequencia_execucoes" (
  "id" UUID NOT NULL,
  "procedimento_id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "servidor_id" UUID,
  "usuario_responsavel_id" UUID,
  "autorizado_por_usuario_id" UUID,
  "status" "StatusProcedimentoAdministrativoFrequencia" NOT NULL DEFAULT 'RASCUNHO',
  "data_inicio" DATE,
  "data_fim" DATE,
  "competencia_lancamento" VARCHAR(7),
  "processo_sei" VARCHAR(120),
  "documento_sei" VARCHAR(120),
  "autoridade" VARCHAR(180),
  "titulo" VARCHAR(180) NOT NULL,
  "justificativa" TEXT NOT NULL,
  "resultado" TEXT,
  "impacto_minutos" INTEGER,
  "dados_entrada" JSONB,
  "dados_resultado" JSONB,
  "autorizado_em" TIMESTAMP(3),
  "aplicado_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "procedimentos_administrativos_frequencia_execucoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "procedimentos_administrativos_frequencia_orgao_id_codigo_key"
  ON "procedimentos_administrativos_frequencia"("orgao_id", "codigo");
CREATE INDEX "procedimentos_administrativos_frequencia_orgao_id_idx"
  ON "procedimentos_administrativos_frequencia"("orgao_id");
CREATE INDEX "procedimentos_administrativos_frequencia_categoria_idx"
  ON "procedimentos_administrativos_frequencia"("categoria");
CREATE INDEX "procedimentos_administrativos_frequencia_ativo_idx"
  ON "procedimentos_administrativos_frequencia"("ativo");

CREATE INDEX "procedimentos_administrativos_frequencia_execucoes_procedimento_id_idx"
  ON "procedimentos_administrativos_frequencia_execucoes"("procedimento_id");
CREATE INDEX "procedimentos_administrativos_frequencia_execucoes_orgao_id_idx"
  ON "procedimentos_administrativos_frequencia_execucoes"("orgao_id");
CREATE INDEX "procedimentos_administrativos_frequencia_execucoes_servidor_id_idx"
  ON "procedimentos_administrativos_frequencia_execucoes"("servidor_id");
CREATE INDEX "procedimentos_administrativos_frequencia_execucoes_usuario_responsavel_id_idx"
  ON "procedimentos_administrativos_frequencia_execucoes"("usuario_responsavel_id");
CREATE INDEX "procedimentos_administrativos_frequencia_execucoes_autorizado_por_usuario_id_idx"
  ON "procedimentos_administrativos_frequencia_execucoes"("autorizado_por_usuario_id");
CREATE INDEX "procedimentos_administrativos_frequencia_execucoes_status_idx"
  ON "procedimentos_administrativos_frequencia_execucoes"("status");
CREATE INDEX "procedimentos_administrativos_frequencia_execucoes_data_inicio_data_fim_idx"
  ON "procedimentos_administrativos_frequencia_execucoes"("data_inicio", "data_fim");

ALTER TABLE "procedimentos_administrativos_frequencia"
  ADD CONSTRAINT "proc_freq_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "procedimentos_administrativos_frequencia_execucoes"
  ADD CONSTRAINT "proc_freq_exec_procedimento_id_fkey"
  FOREIGN KEY ("procedimento_id") REFERENCES "procedimentos_administrativos_frequencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "procedimentos_administrativos_frequencia_execucoes"
  ADD CONSTRAINT "proc_freq_exec_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "procedimentos_administrativos_frequencia_execucoes"
  ADD CONSTRAINT "proc_freq_exec_servidor_id_fkey"
  FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "procedimentos_administrativos_frequencia_execucoes"
  ADD CONSTRAINT "proc_freq_exec_usuario_responsavel_id_fkey"
  FOREIGN KEY ("usuario_responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "procedimentos_administrativos_frequencia_execucoes"
  ADD CONSTRAINT "proc_freq_exec_autorizado_por_usuario_id_fkey"
  FOREIGN KEY ("autorizado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
