CREATE TABLE "regulamentacoes_ponto_orgaos" (
    "id" UUID NOT NULL,
    "orgao_id" UUID NOT NULL,
    "numero_portaria" VARCHAR(120),
    "descricao" TEXT,
    "limite_credito_mensal_minutos" INTEGER NOT NULL DEFAULT 960,
    "meses_expiracao_compensacao" INTEGER NOT NULL DEFAULT 3,
    "tolerancia_credito_minutos" INTEGER NOT NULL DEFAULT 0,
    "tolerancia_debito_minutos" INTEGER NOT NULL DEFAULT 0,
    "jornada_7h_credito_minimo_minutos" INTEGER NOT NULL DEFAULT 480,
    "jornada_7h_intervalo_minimo_minutos" INTEGER NOT NULL DEFAULT 60,
    "exige_autorizacao_previa_credito" BOOLEAN NOT NULL DEFAULT true,
    "horas_fora_expediente_inconsistente" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulamentacoes_ponto_orgaos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "regulamentacoes_ponto_orgaos_orgao_id_key" ON "regulamentacoes_ponto_orgaos"("orgao_id");
CREATE INDEX "regulamentacoes_ponto_orgaos_orgao_id_idx" ON "regulamentacoes_ponto_orgaos"("orgao_id");
CREATE INDEX "regulamentacoes_ponto_orgaos_ativo_idx" ON "regulamentacoes_ponto_orgaos"("ativo");

ALTER TABLE "regulamentacoes_ponto_orgaos"
ADD CONSTRAINT "regulamentacoes_ponto_orgaos_orgao_id_fkey"
FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
