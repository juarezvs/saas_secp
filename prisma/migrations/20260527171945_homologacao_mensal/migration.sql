-- CreateEnum
CREATE TYPE "StatusFechamentoMensal" AS ENUM ('ABERTO', 'EM_HOMOLOGACAO', 'HOMOLOGADO', 'HOMOLOGADO_PARCIAL', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusHomologacaoServidor" AS ENUM ('PENDENTE', 'COM_PENDENCIAS', 'HOMOLOGADO', 'HOMOLOGADO_COM_RESSALVA', 'DEVOLVIDO');

-- CreateEnum
CREATE TYPE "TipoPendenciaHomologacao" AS ENUM ('APURACAO_INCONSISTENTE', 'MARCACAO_INCOMPLETA', 'SOLICITACAO_PENDENTE', 'BANCO_HORAS_PENDENTE', 'FALTA', 'DEBITO', 'SEM_APURACAO');

-- CreateTable
CREATE TABLE "fechamentos_mensais_unidades" (
    "id" UUID NOT NULL,
    "unidade_id" UUID NOT NULL,
    "gestor_responsavel_id" UUID,
    "ano_referencia" INTEGER NOT NULL,
    "mes_referencia" INTEGER NOT NULL,
    "status" "StatusFechamentoMensal" NOT NULL DEFAULT 'ABERTO',
    "aberto_por_usuario_id" UUID NOT NULL,
    "homologado_por_usuario_id" UUID,
    "aberto_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "homologado_em" TIMESTAMP(3),
    "observacao" TEXT,
    "metadados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "usuarioId" UUID,

    CONSTRAINT "fechamentos_mensais_unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homologacoes_servidores_meses" (
    "id" UUID NOT NULL,
    "fechamento_id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "status" "StatusHomologacaoServidor" NOT NULL DEFAULT 'PENDENTE',
    "carga_prevista_minutos" INTEGER NOT NULL DEFAULT 0,
    "minutos_trabalhados" INTEGER NOT NULL DEFAULT 0,
    "minutos_credito" INTEGER NOT NULL DEFAULT 0,
    "minutos_debito" INTEGER NOT NULL DEFAULT 0,
    "faltas" INTEGER NOT NULL DEFAULT 0,
    "saldo_banco_antes_minutos" INTEGER NOT NULL DEFAULT 0,
    "saldo_banco_depois_minutos" INTEGER,
    "pendencias" JSONB,
    "observacao_chefia" TEXT,
    "homologado_por_usuario_id" UUID,
    "homologado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homologacoes_servidores_meses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fechamentos_mensais_unidades_unidade_id_idx" ON "fechamentos_mensais_unidades"("unidade_id");

-- CreateIndex
CREATE INDEX "fechamentos_mensais_unidades_gestor_responsavel_id_idx" ON "fechamentos_mensais_unidades"("gestor_responsavel_id");

-- CreateIndex
CREATE INDEX "fechamentos_mensais_unidades_ano_referencia_mes_referencia_idx" ON "fechamentos_mensais_unidades"("ano_referencia", "mes_referencia");

-- CreateIndex
CREATE INDEX "fechamentos_mensais_unidades_status_idx" ON "fechamentos_mensais_unidades"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fechamentos_mensais_unidades_unidade_id_ano_referencia_mes__key" ON "fechamentos_mensais_unidades"("unidade_id", "ano_referencia", "mes_referencia");

-- CreateIndex
CREATE INDEX "homologacoes_servidores_meses_fechamento_id_idx" ON "homologacoes_servidores_meses"("fechamento_id");

-- CreateIndex
CREATE INDEX "homologacoes_servidores_meses_servidor_id_idx" ON "homologacoes_servidores_meses"("servidor_id");

-- CreateIndex
CREATE INDEX "homologacoes_servidores_meses_status_idx" ON "homologacoes_servidores_meses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "homologacoes_servidores_meses_fechamento_id_servidor_id_key" ON "homologacoes_servidores_meses"("fechamento_id", "servidor_id");

-- AddForeignKey
ALTER TABLE "fechamentos_mensais_unidades" ADD CONSTRAINT "fechamentos_mensais_unidades_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamentos_mensais_unidades" ADD CONSTRAINT "fechamentos_mensais_unidades_gestor_responsavel_id_fkey" FOREIGN KEY ("gestor_responsavel_id") REFERENCES "gestores_unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamentos_mensais_unidades" ADD CONSTRAINT "fechamentos_mensais_unidades_aberto_por_usuario_id_fkey" FOREIGN KEY ("aberto_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamentos_mensais_unidades" ADD CONSTRAINT "fechamentos_mensais_unidades_homologado_por_usuario_id_fkey" FOREIGN KEY ("homologado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamentos_mensais_unidades" ADD CONSTRAINT "fechamentos_mensais_unidades_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologacoes_servidores_meses" ADD CONSTRAINT "homologacoes_servidores_meses_fechamento_id_fkey" FOREIGN KEY ("fechamento_id") REFERENCES "fechamentos_mensais_unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologacoes_servidores_meses" ADD CONSTRAINT "homologacoes_servidores_meses_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologacoes_servidores_meses" ADD CONSTRAINT "homologacoes_servidores_meses_homologado_por_usuario_id_fkey" FOREIGN KEY ("homologado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
