-- CreateEnum
CREATE TYPE "TipoMarcacao" AS ENUM ('ENTRADA', 'SAIDA_INTERVALO', 'RETORNO_INTERVALO', 'SAIDA', 'MANUAL', 'AJUSTE');

-- CreateEnum
CREATE TYPE "FonteMarcacao" AS ENUM ('WEB', 'BIOMETRIA_FACIAL', 'EQUIPAMENTO_BIOMETRICO', 'AFD', 'MANUAL_ADMINISTRATIVO', 'IMPORTACAO');

-- CreateEnum
CREATE TYPE "StatusMarcacao" AS ENUM ('VALIDA', 'PENDENTE', 'CANCELADA', 'AJUSTADA');

-- CreateTable
CREATE TABLE "marcacoes" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "jornada_servidor_id" UUID,
    "data_hora" TIMESTAMP(3) NOT NULL,
    "data_referencia" DATE NOT NULL,
    "tipo" "TipoMarcacao" NOT NULL,
    "fonte" "FonteMarcacao" NOT NULL DEFAULT 'WEB',
    "status" "StatusMarcacao" NOT NULL DEFAULT 'VALIDA',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "ip" VARCHAR(80),
    "user_agent" TEXT,
    "observacao" TEXT,
    "metadados" JSONB,
    "criada_por_usuario_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "usuarioId" UUID,

    CONSTRAINT "marcacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marcacoes_servidor_id_idx" ON "marcacoes"("servidor_id");

-- CreateIndex
CREATE INDEX "marcacoes_jornada_servidor_id_idx" ON "marcacoes"("jornada_servidor_id");

-- CreateIndex
CREATE INDEX "marcacoes_data_referencia_idx" ON "marcacoes"("data_referencia");

-- CreateIndex
CREATE INDEX "marcacoes_data_hora_idx" ON "marcacoes"("data_hora");

-- CreateIndex
CREATE INDEX "marcacoes_tipo_idx" ON "marcacoes"("tipo");

-- CreateIndex
CREATE INDEX "marcacoes_fonte_idx" ON "marcacoes"("fonte");

-- CreateIndex
CREATE INDEX "marcacoes_status_idx" ON "marcacoes"("status");

-- AddForeignKey
ALTER TABLE "marcacoes" ADD CONSTRAINT "marcacoes_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcacoes" ADD CONSTRAINT "marcacoes_jornada_servidor_id_fkey" FOREIGN KEY ("jornada_servidor_id") REFERENCES "jornadas_servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcacoes" ADD CONSTRAINT "marcacoes_criada_por_usuario_id_fkey" FOREIGN KEY ("criada_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcacoes" ADD CONSTRAINT "marcacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
