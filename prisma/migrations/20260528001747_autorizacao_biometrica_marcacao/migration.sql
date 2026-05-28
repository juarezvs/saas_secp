-- CreateEnum
CREATE TYPE "StatusAutorizacaoBiometrica" AS ENUM ('PENDENTE', 'UTILIZADA', 'EXPIRADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "biometrias_autorizacoes_marcacao" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "amostra_id" UUID,
    "token_hash" VARCHAR(128) NOT NULL,
    "status" "StatusAutorizacaoBiometrica" NOT NULL DEFAULT 'PENDENTE',
    "expira_em" TIMESTAMP(3) NOT NULL,
    "utilizada_em" TIMESTAMP(3),
    "marcacao_id" UUID,
    "origem" VARCHAR(120),
    "metadados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometrias_autorizacoes_marcacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "biometrias_autorizacoes_marcacao_servidor_id_idx" ON "biometrias_autorizacoes_marcacao"("servidor_id");

-- CreateIndex
CREATE INDEX "biometrias_autorizacoes_marcacao_amostra_id_idx" ON "biometrias_autorizacoes_marcacao"("amostra_id");

-- CreateIndex
CREATE INDEX "biometrias_autorizacoes_marcacao_status_idx" ON "biometrias_autorizacoes_marcacao"("status");

-- CreateIndex
CREATE INDEX "biometrias_autorizacoes_marcacao_expira_em_idx" ON "biometrias_autorizacoes_marcacao"("expira_em");

-- AddForeignKey
ALTER TABLE "biometrias_autorizacoes_marcacao" ADD CONSTRAINT "biometrias_autorizacoes_marcacao_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometrias_autorizacoes_marcacao" ADD CONSTRAINT "biometrias_autorizacoes_marcacao_amostra_id_fkey" FOREIGN KEY ("amostra_id") REFERENCES "biometrias_faciais_amostras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
