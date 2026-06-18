CREATE TABLE "dispensas_ponto_servidores" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "motivo" VARCHAR(250) NOT NULL,
    "ato_autorizativo" VARCHAR(120),
    "processo_sei" VARCHAR(120),
    "observacao" TEXT,
    "exige_frequencia_manual" BOOLEAN NOT NULL DEFAULT true,
    "status" "StatusRegistro" NOT NULL DEFAULT 'ATIVO',
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "criado_por_usuario_id" UUID,
    "encerrado_por_usuario_id" UUID,
    "encerrado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispensas_ponto_servidores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dispensas_ponto_servidores_servidor_id_idx" ON "dispensas_ponto_servidores"("servidor_id");
CREATE INDEX "dispensas_ponto_servidores_status_idx" ON "dispensas_ponto_servidores"("status");
CREATE INDEX "dispensas_ponto_servidores_data_inicio_data_fim_idx" ON "dispensas_ponto_servidores"("data_inicio", "data_fim");

ALTER TABLE "dispensas_ponto_servidores"
    ADD CONSTRAINT "dispensas_ponto_servidores_servidor_id_fkey"
    FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
