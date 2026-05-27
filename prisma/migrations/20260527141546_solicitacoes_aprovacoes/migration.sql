/*
  Warnings:

  - You are about to drop the column `usuarioId` on the `marcacoes` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoSolicitacao" AS ENUM ('AJUSTE_PONTO', 'COMPENSACAO', 'ABONO_JUSTIFICATIVA', 'ATIVIDADE_EXTERNA', 'VIAGEM_SERVICO', 'CAPACITACAO', 'DISPENSA_PONTO', 'HORA_CREDITO_PREVIA');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('RASCUNHO', 'ENVIADA', 'EM_ANALISE', 'DEFERIDA', 'INDEFERIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoEventoSolicitacao" AS ENUM ('CRIADA', 'ENVIADA', 'EM_ANALISE', 'DEFERIDA', 'INDEFERIDA', 'CANCELADA', 'COMENTARIO', 'EFEITO_APLICADO');

-- CreateEnum
CREATE TYPE "ResultadoAnaliseSolicitacao" AS ENUM ('DEFERIR', 'INDEFERIR');

-- DropForeignKey
ALTER TABLE "marcacoes" DROP CONSTRAINT "marcacoes_usuarioId_fkey";

-- AlterTable
ALTER TABLE "marcacoes" DROP COLUMN "usuarioId";

-- CreateTable
CREATE TABLE "solicitacoes" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "usuario_solicitante_id" UUID NOT NULL,
    "unidade_id" UUID,
    "chefia_responsavel_id" UUID,
    "analisada_por_usuario_id" UUID,
    "tipo" "TipoSolicitacao" NOT NULL,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'ENVIADA',
    "titulo" VARCHAR(180) NOT NULL,
    "descricao" TEXT NOT NULL,
    "data_referencia" DATE,
    "data_inicio" TIMESTAMP(3),
    "data_fim" TIMESTAMP(3),
    "dados_solicitados" JSONB,
    "dados_resultado" JSONB,
    "justificativa_analise" TEXT,
    "analisada_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_eventos" (
    "id" UUID NOT NULL,
    "solicitacao_id" UUID NOT NULL,
    "usuario_id" UUID,
    "servidor_id" UUID,
    "tipo" "TipoEventoSolicitacao" NOT NULL,
    "descricao" TEXT NOT NULL,
    "metadados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacoes_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitacoes_servidor_id_idx" ON "solicitacoes"("servidor_id");

-- CreateIndex
CREATE INDEX "solicitacoes_usuario_solicitante_id_idx" ON "solicitacoes"("usuario_solicitante_id");

-- CreateIndex
CREATE INDEX "solicitacoes_unidade_id_idx" ON "solicitacoes"("unidade_id");

-- CreateIndex
CREATE INDEX "solicitacoes_chefia_responsavel_id_idx" ON "solicitacoes"("chefia_responsavel_id");

-- CreateIndex
CREATE INDEX "solicitacoes_analisada_por_usuario_id_idx" ON "solicitacoes"("analisada_por_usuario_id");

-- CreateIndex
CREATE INDEX "solicitacoes_tipo_idx" ON "solicitacoes"("tipo");

-- CreateIndex
CREATE INDEX "solicitacoes_status_idx" ON "solicitacoes"("status");

-- CreateIndex
CREATE INDEX "solicitacoes_data_referencia_idx" ON "solicitacoes"("data_referencia");

-- CreateIndex
CREATE INDEX "solicitacoes_eventos_solicitacao_id_idx" ON "solicitacoes_eventos"("solicitacao_id");

-- CreateIndex
CREATE INDEX "solicitacoes_eventos_usuario_id_idx" ON "solicitacoes_eventos"("usuario_id");

-- CreateIndex
CREATE INDEX "solicitacoes_eventos_servidor_id_idx" ON "solicitacoes_eventos"("servidor_id");

-- CreateIndex
CREATE INDEX "solicitacoes_eventos_tipo_idx" ON "solicitacoes_eventos"("tipo");

-- CreateIndex
CREATE INDEX "marcacoes_criada_por_usuario_id_idx" ON "marcacoes"("criada_por_usuario_id");

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_usuario_solicitante_id_fkey" FOREIGN KEY ("usuario_solicitante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_chefia_responsavel_id_fkey" FOREIGN KEY ("chefia_responsavel_id") REFERENCES "gestores_unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_analisada_por_usuario_id_fkey" FOREIGN KEY ("analisada_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_eventos" ADD CONSTRAINT "solicitacoes_eventos_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_eventos" ADD CONSTRAINT "solicitacoes_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_eventos" ADD CONSTRAINT "solicitacoes_eventos_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
