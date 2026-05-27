/*
  Warnings:

  - You are about to drop the column `usuarioId` on the `fechamentos_mensais_unidades` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusBoletimFrequencia" AS ENUM ('GERADO', 'ENCAMINHADO_SECAP', 'RECEBIDO_SECAP', 'CONFERIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoResumoBoletimServidor" AS ENUM ('REGULAR', 'COM_RESSALVA', 'COM_FALTA', 'COM_DEBITO', 'COM_CREDITO', 'COM_PENDENCIA');

-- DropForeignKey
ALTER TABLE "fechamentos_mensais_unidades" DROP CONSTRAINT "fechamentos_mensais_unidades_usuarioId_fkey";

-- AlterTable
ALTER TABLE "fechamentos_mensais_unidades" DROP COLUMN "usuarioId";

-- CreateTable
CREATE TABLE "boletins_frequencia" (
    "id" UUID NOT NULL,
    "fechamento_id" UUID NOT NULL,
    "unidade_id" UUID NOT NULL,
    "ano_referencia" INTEGER NOT NULL,
    "mes_referencia" INTEGER NOT NULL,
    "status" "StatusBoletimFrequencia" NOT NULL DEFAULT 'GERADO',
    "numero_sei" VARCHAR(80),
    "processo_sei" VARCHAR(80),
    "total_servidores" INTEGER NOT NULL DEFAULT 0,
    "total_homologados" INTEGER NOT NULL DEFAULT 0,
    "total_com_ressalva" INTEGER NOT NULL DEFAULT 0,
    "total_faltas" INTEGER NOT NULL DEFAULT 0,
    "total_carga_prevista_minutos" INTEGER NOT NULL DEFAULT 0,
    "total_trabalhado_minutos" INTEGER NOT NULL DEFAULT 0,
    "total_credito_minutos" INTEGER NOT NULL DEFAULT 0,
    "total_debito_minutos" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "metadados" JSONB,
    "gerado_por_usuario_id" UUID NOT NULL,
    "encaminhado_por_usuario_id" UUID,
    "recebido_por_usuario_id" UUID,
    "gerado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encaminhado_em" TIMESTAMP(3),
    "recebido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boletins_frequencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boletins_frequencia_servidores" (
    "id" UUID NOT NULL,
    "boletim_id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "homologacao_servidor_mes_id" UUID,
    "tipoResumo" "TipoResumoBoletimServidor" NOT NULL DEFAULT 'REGULAR',
    "carga_prevista_minutos" INTEGER NOT NULL DEFAULT 0,
    "minutos_trabalhados" INTEGER NOT NULL DEFAULT 0,
    "minutos_credito" INTEGER NOT NULL DEFAULT 0,
    "minutos_debito" INTEGER NOT NULL DEFAULT 0,
    "faltas" INTEGER NOT NULL DEFAULT 0,
    "saldo_banco_antes_minutos" INTEGER NOT NULL DEFAULT 0,
    "saldo_banco_depois_minutos" INTEGER,
    "observacao_chefia" TEXT,
    "ressalvas" JSONB,
    "ocorrencias" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boletins_frequencia_servidores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boletins_frequencia_fechamento_id_key" ON "boletins_frequencia"("fechamento_id");

-- CreateIndex
CREATE INDEX "boletins_frequencia_unidade_id_idx" ON "boletins_frequencia"("unidade_id");

-- CreateIndex
CREATE INDEX "boletins_frequencia_ano_referencia_mes_referencia_idx" ON "boletins_frequencia"("ano_referencia", "mes_referencia");

-- CreateIndex
CREATE INDEX "boletins_frequencia_status_idx" ON "boletins_frequencia"("status");

-- CreateIndex
CREATE INDEX "boletins_frequencia_gerado_por_usuario_id_idx" ON "boletins_frequencia"("gerado_por_usuario_id");

-- CreateIndex
CREATE INDEX "boletins_frequencia_encaminhado_por_usuario_id_idx" ON "boletins_frequencia"("encaminhado_por_usuario_id");

-- CreateIndex
CREATE INDEX "boletins_frequencia_recebido_por_usuario_id_idx" ON "boletins_frequencia"("recebido_por_usuario_id");

-- CreateIndex
CREATE INDEX "boletins_frequencia_servidores_boletim_id_idx" ON "boletins_frequencia_servidores"("boletim_id");

-- CreateIndex
CREATE INDEX "boletins_frequencia_servidores_servidor_id_idx" ON "boletins_frequencia_servidores"("servidor_id");

-- CreateIndex
CREATE INDEX "boletins_frequencia_servidores_tipoResumo_idx" ON "boletins_frequencia_servidores"("tipoResumo");

-- CreateIndex
CREATE UNIQUE INDEX "boletins_frequencia_servidores_boletim_id_servidor_id_key" ON "boletins_frequencia_servidores"("boletim_id", "servidor_id");

-- AddForeignKey
ALTER TABLE "boletins_frequencia" ADD CONSTRAINT "boletins_frequencia_fechamento_id_fkey" FOREIGN KEY ("fechamento_id") REFERENCES "fechamentos_mensais_unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletins_frequencia" ADD CONSTRAINT "boletins_frequencia_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletins_frequencia" ADD CONSTRAINT "boletins_frequencia_gerado_por_usuario_id_fkey" FOREIGN KEY ("gerado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletins_frequencia" ADD CONSTRAINT "boletins_frequencia_encaminhado_por_usuario_id_fkey" FOREIGN KEY ("encaminhado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletins_frequencia" ADD CONSTRAINT "boletins_frequencia_recebido_por_usuario_id_fkey" FOREIGN KEY ("recebido_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletins_frequencia_servidores" ADD CONSTRAINT "boletins_frequencia_servidores_boletim_id_fkey" FOREIGN KEY ("boletim_id") REFERENCES "boletins_frequencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletins_frequencia_servidores" ADD CONSTRAINT "boletins_frequencia_servidores_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletins_frequencia_servidores" ADD CONSTRAINT "boletins_frequencia_servidores_homologacao_servidor_mes_id_fkey" FOREIGN KEY ("homologacao_servidor_mes_id") REFERENCES "homologacoes_servidores_meses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
