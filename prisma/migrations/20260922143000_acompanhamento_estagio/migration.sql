CREATE TYPE "StatusAcompanhamentoEstagio" AS ENUM ('ABERTO', 'FECHADO');

CREATE TABLE "acompanhamentos_estagio_mensais" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "ano_referencia" INTEGER NOT NULL,
    "mes_referencia" INTEGER NOT NULL,
    "status" "StatusAcompanhamentoEstagio" NOT NULL DEFAULT 'ABERTO',
    "curso" VARCHAR(180),
    "supervisor" VARCHAR(180),
    "observacao" TEXT,
    "fechado_por_id" UUID,
    "fechado_em" TIMESTAMP(3),
    "assinatura" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acompanhamentos_estagio_mensais_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "acompanhamentos_estagio_dias" (
    "id" UUID NOT NULL,
    "acompanhamento_id" UUID NOT NULL,
    "data_referencia" DATE NOT NULL,
    "atividades" TEXT NOT NULL,
    "minutos_registrados" INTEGER NOT NULL DEFAULT 0,
    "metadados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acompanhamentos_estagio_dias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "acompanhamentos_estagio_mensais_servidor_id_ano_referen_key" ON "acompanhamentos_estagio_mensais"("servidor_id", "ano_referencia", "mes_referencia");
CREATE INDEX "acompanhamentos_estagio_mensais_ano_referencia_mes_refere_idx" ON "acompanhamentos_estagio_mensais"("ano_referencia", "mes_referencia");
CREATE INDEX "acompanhamentos_estagio_mensais_status_idx" ON "acompanhamentos_estagio_mensais"("status");
CREATE INDEX "acompanhamentos_estagio_mensais_fechado_por_id_idx" ON "acompanhamentos_estagio_mensais"("fechado_por_id");

CREATE UNIQUE INDEX "acompanhamentos_estagio_dias_acompanhamento_id_data_r_key" ON "acompanhamentos_estagio_dias"("acompanhamento_id", "data_referencia");
CREATE INDEX "acompanhamentos_estagio_dias_data_referencia_idx" ON "acompanhamentos_estagio_dias"("data_referencia");

ALTER TABLE "acompanhamentos_estagio_mensais" ADD CONSTRAINT "acompanhamentos_estagio_mensais_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acompanhamentos_estagio_mensais" ADD CONSTRAINT "acompanhamentos_estagio_mensais_fechado_por_id_fkey" FOREIGN KEY ("fechado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "acompanhamentos_estagio_dias" ADD CONSTRAINT "acompanhamentos_estagio_dias_acompanhamento_id_fkey" FOREIGN KEY ("acompanhamento_id") REFERENCES "acompanhamentos_estagio_mensais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
