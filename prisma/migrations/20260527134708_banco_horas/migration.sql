-- CreateEnum
CREATE TYPE "TipoMovimentoBancoHoras" AS ENUM ('CREDITO', 'DEBITO', 'COMPENSACAO_CREDITO', 'COMPENSACAO_DEBITO', 'HORAS_ACIMA_LIMITE', 'HORAS_NAO_AUTORIZADAS', 'AJUSTE_MANUAL', 'ESTORNO');

-- CreateEnum
CREATE TYPE "OrigemMovimentoBancoHoras" AS ENUM ('APURACAO_DIARIA', 'SOLICITACAO', 'HOMOLOGACAO', 'AJUSTE_ADMINISTRATIVO', 'IMPORTACAO');

-- CreateEnum
CREATE TYPE "StatusMovimentoBancoHoras" AS ENUM ('PENDENTE', 'VALIDADO', 'DESCONSIDERADO', 'EXPIRADO', 'ESTORNADO');

-- CreateTable
CREATE TABLE "banco_horas_saldos" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "saldo_minutos" INTEGER NOT NULL DEFAULT 0,
    "creditos_validados_minutos" INTEGER NOT NULL DEFAULT 0,
    "debitos_validados_minutos" INTEGER NOT NULL DEFAULT 0,
    "creditos_pendentes_minutos" INTEGER NOT NULL DEFAULT 0,
    "debitos_pendentes_minutos" INTEGER NOT NULL DEFAULT 0,
    "horas_acima_limite_minutos" INTEGER NOT NULL DEFAULT 0,
    "horas_nao_autorizadas_minutos" INTEGER NOT NULL DEFAULT 0,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banco_horas_saldos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banco_horas_movimentos" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "apuracao_diaria_id" UUID,
    "tipo" "TipoMovimentoBancoHoras" NOT NULL,
    "origem" "OrigemMovimentoBancoHoras" NOT NULL DEFAULT 'APURACAO_DIARIA',
    "status" "StatusMovimentoBancoHoras" NOT NULL DEFAULT 'PENDENTE',
    "data_referencia" DATE NOT NULL,
    "mes_referencia" INTEGER NOT NULL,
    "ano_referencia" INTEGER NOT NULL,
    "minutos" INTEGER NOT NULL,
    "saldo_apos_movimento" INTEGER,
    "descricao" TEXT,
    "observacao" TEXT,
    "autorizado_por_usuario_id" UUID,
    "autorizado_em" TIMESTAMP(3),
    "expira_em" DATE,
    "metadados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banco_horas_movimentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banco_horas_saldos_servidor_id_key" ON "banco_horas_saldos"("servidor_id");

-- CreateIndex
CREATE INDEX "banco_horas_movimentos_servidor_id_idx" ON "banco_horas_movimentos"("servidor_id");

-- CreateIndex
CREATE INDEX "banco_horas_movimentos_apuracao_diaria_id_idx" ON "banco_horas_movimentos"("apuracao_diaria_id");

-- CreateIndex
CREATE INDEX "banco_horas_movimentos_data_referencia_idx" ON "banco_horas_movimentos"("data_referencia");

-- CreateIndex
CREATE INDEX "banco_horas_movimentos_mes_referencia_ano_referencia_idx" ON "banco_horas_movimentos"("mes_referencia", "ano_referencia");

-- CreateIndex
CREATE INDEX "banco_horas_movimentos_tipo_idx" ON "banco_horas_movimentos"("tipo");

-- CreateIndex
CREATE INDEX "banco_horas_movimentos_status_idx" ON "banco_horas_movimentos"("status");

-- AddForeignKey
ALTER TABLE "banco_horas_saldos" ADD CONSTRAINT "banco_horas_saldos_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banco_horas_movimentos" ADD CONSTRAINT "banco_horas_movimentos_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banco_horas_movimentos" ADD CONSTRAINT "banco_horas_movimentos_apuracao_diaria_id_fkey" FOREIGN KEY ("apuracao_diaria_id") REFERENCES "apuracoes_diarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banco_horas_movimentos" ADD CONSTRAINT "banco_horas_movimentos_autorizado_por_usuario_id_fkey" FOREIGN KEY ("autorizado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
