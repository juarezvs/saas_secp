-- CreateEnum
CREATE TYPE "StatusProgramacaoFerias" AS ENUM (
  'ENVIADA',
  'EM_ANALISE',
  'DEVOLVIDA',
  'APROVADA_CHEFIA',
  'REPROVADA_CHEFIA',
  'AGUARDANDO_ENVIO_SARH',
  'ENVIANDO_SARH',
  'ENVIADA_SARH',
  'CONFIRMADA_SARH',
  'ERRO_ENVIO_SARH',
  'CANCELADA'
);

-- CreateEnum
CREATE TYPE "StatusIntegracaoProgramacaoFerias" AS ENUM (
  'NAO_APLICAVEL',
  'PENDENTE',
  'EM_PROCESSAMENTO',
  'ENVIADA',
  'CONFIRMADA',
  'ERRO'
);

-- CreateTable
CREATE TABLE "programacoes_ferias" (
  "id" UUID NOT NULL,
  "servidor_id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "unidade_id" UUID,
  "exercicio" INTEGER NOT NULL,
  "data_inicio" DATE NOT NULL,
  "data_fim" DATE NOT NULL,
  "dias" INTEGER NOT NULL,
  "status" "StatusProgramacaoFerias" NOT NULL DEFAULT 'ENVIADA',
  "integracao_status" "StatusIntegracaoProgramacaoFerias" NOT NULL DEFAULT 'NAO_APLICAVEL',
  "observacao_servidor" TEXT,
  "observacao_chefia" TEXT,
  "observacao_secap" TEXT,
  "solicitado_por_usuario_id" UUID NOT NULL,
  "solicitado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_por_usuario_id" UUID,
  "analisado_por_usuario_id" UUID,
  "analisado_em" TIMESTAMP(3),
  "enviado_sarh_por_usuario_id" UUID,
  "enviado_sarh_em" TIMESTAMP(3),
  "confirmado_sarh_em" TIMESTAMP(3),
  "integracao_protocolo" VARCHAR(120),
  "integracao_payload" JSONB,
  "integracao_retorno" JSONB,
  "integracao_erro" TEXT,
  "afastamento_sarh_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "programacoes_ferias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programacoes_ferias_eventos" (
  "id" UUID NOT NULL,
  "programacao_id" UUID NOT NULL,
  "usuario_id" UUID,
  "status_anterior" "StatusProgramacaoFerias",
  "status_novo" "StatusProgramacaoFerias" NOT NULL,
  "descricao" TEXT NOT NULL,
  "metadados" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "programacoes_ferias_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "programacoes_ferias_afastamento_sarh_id_key" ON "programacoes_ferias"("afastamento_sarh_id");

-- CreateIndex
CREATE INDEX "programacoes_ferias_servidor_id_status_idx" ON "programacoes_ferias"("servidor_id", "status");

-- CreateIndex
CREATE INDEX "programacoes_ferias_orgao_id_status_idx" ON "programacoes_ferias"("orgao_id", "status");

-- CreateIndex
CREATE INDEX "programacoes_ferias_unidade_id_status_idx" ON "programacoes_ferias"("unidade_id", "status");

-- CreateIndex
CREATE INDEX "programacoes_ferias_exercicio_idx" ON "programacoes_ferias"("exercicio");

-- CreateIndex
CREATE INDEX "programacoes_ferias_data_inicio_data_fim_idx" ON "programacoes_ferias"("data_inicio", "data_fim");

-- CreateIndex
CREATE INDEX "programacoes_ferias_integracao_status_idx" ON "programacoes_ferias"("integracao_status");

-- CreateIndex
CREATE INDEX "programacoes_ferias_eventos_programacao_id_criado_em_idx" ON "programacoes_ferias_eventos"("programacao_id", "criado_em");

-- CreateIndex
CREATE INDEX "programacoes_ferias_eventos_usuario_id_idx" ON "programacoes_ferias_eventos"("usuario_id");

-- CreateIndex
CREATE INDEX "programacoes_ferias_eventos_status_novo_idx" ON "programacoes_ferias_eventos"("status_novo");

-- AddForeignKey
ALTER TABLE "programacoes_ferias" ADD CONSTRAINT "programacoes_ferias_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacoes_ferias" ADD CONSTRAINT "programacoes_ferias_orgao_id_fkey" FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacoes_ferias" ADD CONSTRAINT "programacoes_ferias_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacoes_ferias" ADD CONSTRAINT "programacoes_ferias_solicitado_por_usuario_id_fkey" FOREIGN KEY ("solicitado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacoes_ferias" ADD CONSTRAINT "programacoes_ferias_atualizado_por_usuario_id_fkey" FOREIGN KEY ("atualizado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacoes_ferias" ADD CONSTRAINT "programacoes_ferias_analisado_por_usuario_id_fkey" FOREIGN KEY ("analisado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacoes_ferias" ADD CONSTRAINT "programacoes_ferias_enviado_sarh_por_usuario_id_fkey" FOREIGN KEY ("enviado_sarh_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacoes_ferias" ADD CONSTRAINT "programacoes_ferias_afastamento_sarh_id_fkey" FOREIGN KEY ("afastamento_sarh_id") REFERENCES "afastamentos_sarh"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacoes_ferias_eventos" ADD CONSTRAINT "programacoes_ferias_eventos_programacao_id_fkey" FOREIGN KEY ("programacao_id") REFERENCES "programacoes_ferias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacoes_ferias_eventos" ADD CONSTRAINT "programacoes_ferias_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
