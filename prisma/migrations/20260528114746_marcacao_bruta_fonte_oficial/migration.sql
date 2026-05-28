-- CreateEnum
CREATE TYPE "OrigemMarcacaoBruta" AS ENUM ('EQUIPAMENTO_BIOMETRICO', 'IMPORTACAO_AFD', 'WEB_AUTORIZADO', 'FACIAL_AUTORIZADO');

-- CreateTable
CREATE TABLE "marcacoes_brutas" (
    "id" UUID NOT NULL,
    "cpf" VARCHAR(14),
    "matricula" VARCHAR(50),
    "data_hora" TIMESTAMP(3) NOT NULL,
    "equipamento_codigo" VARCHAR(80),
    "equipamento_id" UUID,
    "origem" "OrigemMarcacaoBruta" NOT NULL,
    "nsr" VARCHAR(120),
    "codigo_externo" VARCHAR(160),
    "hash_registro" VARCHAR(128) NOT NULL,
    "processada" BOOLEAN NOT NULL DEFAULT false,
    "processada_em" TIMESTAMP(3),
    "servidor_id" UUID,
    "marcacao_id" UUID,
    "payload_original" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marcacoes_brutas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marcacoes_brutas_hash_registro_key" ON "marcacoes_brutas"("hash_registro");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_cpf_idx" ON "marcacoes_brutas"("cpf");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_matricula_idx" ON "marcacoes_brutas"("matricula");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_data_hora_idx" ON "marcacoes_brutas"("data_hora");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_equipamento_codigo_idx" ON "marcacoes_brutas"("equipamento_codigo");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_servidor_id_idx" ON "marcacoes_brutas"("servidor_id");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_processada_idx" ON "marcacoes_brutas"("processada");

-- AddForeignKey
ALTER TABLE "marcacoes_brutas" ADD CONSTRAINT "marcacoes_brutas_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcacoes_brutas" ADD CONSTRAINT "marcacoes_brutas_marcacao_id_fkey" FOREIGN KEY ("marcacao_id") REFERENCES "marcacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
