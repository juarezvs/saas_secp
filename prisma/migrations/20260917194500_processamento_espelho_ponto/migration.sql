CREATE TYPE "StatusProcessamentoEspelhoPonto" AS ENUM ('PENDENTE', 'PROCESSANDO', 'ATUALIZADO', 'FALHA');

CREATE TABLE "processamentos_espelho_ponto" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "ano_referencia" INTEGER NOT NULL,
    "mes_referencia" INTEGER NOT NULL,
    "status" "StatusProcessamentoEspelhoPonto" NOT NULL DEFAULT 'PENDENTE',
    "motivo" VARCHAR(120) NOT NULL,
    "job_id" VARCHAR(180),
    "solicitado_por_id" UUID,
    "solicitado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciado_em" TIMESTAMP(3),
    "concluido_em" TIMESTAMP(3),
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processamentos_espelho_ponto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "processamentos_espelho_ponto_servidor_id_ano_referencia_mes_referencia_key"
ON "processamentos_espelho_ponto"("servidor_id", "ano_referencia", "mes_referencia");
CREATE INDEX "processamentos_espelho_ponto_status_solicitado_em_idx"
ON "processamentos_espelho_ponto"("status", "solicitado_em");
CREATE INDEX "processamentos_espelho_ponto_job_id_idx"
ON "processamentos_espelho_ponto"("job_id");

ALTER TABLE "processamentos_espelho_ponto"
ADD CONSTRAINT "processamentos_espelho_ponto_servidor_id_fkey"
FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
