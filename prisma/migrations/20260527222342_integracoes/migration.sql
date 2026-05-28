-- CreateEnum
CREATE TYPE "TipoIntegracao" AS ENUM ('SARH', 'SEI', 'EQUIPAMENTO_BIOMETRICO', 'LDAP', 'WEBHOOK', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusIntegracao" AS ENUM ('ATIVA', 'INATIVA', 'ERRO', 'NAO_CONFIGURADA');

-- CreateEnum
CREATE TYPE "DirecaoIntegracao" AS ENUM ('ENTRADA', 'SAIDA', 'BIDIRECIONAL');

-- CreateEnum
CREATE TYPE "StatusLogIntegracao" AS ENUM ('SUCESSO', 'ERRO', 'PENDENTE', 'IGNORADO');

-- CreateEnum
CREATE TYPE "TipoEventoEquipamento" AS ENUM ('MARCACAO', 'HEARTBEAT', 'SINCRONIZACAO', 'ERRO');

-- CreateTable
CREATE TABLE "integracoes_sistemas" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "tipo" "TipoIntegracao" NOT NULL,
    "status" "StatusIntegracao" NOT NULL DEFAULT 'NAO_CONFIGURADA',
    "direcao" "DirecaoIntegracao" NOT NULL DEFAULT 'BIDIRECIONAL',
    "base_url" TEXT,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "configuracao" JSONB,
    "ultimo_sucesso_em" TIMESTAMP(3),
    "ultimo_erro_em" TIMESTAMP(3),
    "ultimo_erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integracoes_sistemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracoes_logs" (
    "id" UUID NOT NULL,
    "integracao_id" UUID,
    "tipo" "TipoIntegracao" NOT NULL,
    "direcao" "DirecaoIntegracao" NOT NULL,
    "status" "StatusLogIntegracao" NOT NULL,
    "entidade" VARCHAR(120),
    "entidade_id" VARCHAR(120),
    "mensagem" TEXT,
    "erro" TEXT,
    "payload_entrada" JSONB,
    "payload_saida" JSONB,
    "metadados" JSONB,
    "iniciado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizado_em" TIMESTAMP(3),
    "duracao_ms" INTEGER,

    CONSTRAINT "integracoes_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipamentos_biometricos" (
    "id" UUID NOT NULL,
    "integracao_id" UUID,
    "unidade_id" UUID,
    "codigo" VARCHAR(80) NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "fabricante" VARCHAR(120),
    "modelo" VARCHAR(120),
    "numero_serie" VARCHAR(120),
    "localizacao" VARCHAR(200),
    "ip" VARCHAR(80),
    "porta" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_heartbeat_em" TIMESTAMP(3),
    "ultima_sincronizacao_em" TIMESTAMP(3),
    "configuracao" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipamentos_biometricos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipamentos_biometricos_eventos" (
    "id" UUID NOT NULL,
    "equipamento_id" UUID NOT NULL,
    "marcacao_id" UUID,
    "tipo_evento" "TipoEventoEquipamento" NOT NULL DEFAULT 'MARCACAO',
    "codigo_evento_externo" VARCHAR(120),
    "nsr" VARCHAR(120),
    "matricula" VARCHAR(80),
    "data_hora" TIMESTAMP(3),
    "recebido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "processado_em" TIMESTAMP(3),
    "erro" TEXT,
    "payload" JSONB,

    CONSTRAINT "equipamentos_biometricos_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integracoes_sistemas_tipo_idx" ON "integracoes_sistemas"("tipo");

-- CreateIndex
CREATE INDEX "integracoes_sistemas_status_idx" ON "integracoes_sistemas"("status");

-- CreateIndex
CREATE INDEX "integracoes_sistemas_ativo_idx" ON "integracoes_sistemas"("ativo");

-- CreateIndex
CREATE INDEX "integracoes_logs_integracao_id_idx" ON "integracoes_logs"("integracao_id");

-- CreateIndex
CREATE INDEX "integracoes_logs_tipo_idx" ON "integracoes_logs"("tipo");

-- CreateIndex
CREATE INDEX "integracoes_logs_status_idx" ON "integracoes_logs"("status");

-- CreateIndex
CREATE INDEX "integracoes_logs_entidade_idx" ON "integracoes_logs"("entidade");

-- CreateIndex
CREATE INDEX "integracoes_logs_entidade_id_idx" ON "integracoes_logs"("entidade_id");

-- CreateIndex
CREATE INDEX "integracoes_logs_iniciado_em_idx" ON "integracoes_logs"("iniciado_em");

-- CreateIndex
CREATE UNIQUE INDEX "equipamentos_biometricos_codigo_key" ON "equipamentos_biometricos"("codigo");

-- CreateIndex
CREATE INDEX "equipamentos_biometricos_integracao_id_idx" ON "equipamentos_biometricos"("integracao_id");

-- CreateIndex
CREATE INDEX "equipamentos_biometricos_unidade_id_idx" ON "equipamentos_biometricos"("unidade_id");

-- CreateIndex
CREATE INDEX "equipamentos_biometricos_ativo_idx" ON "equipamentos_biometricos"("ativo");

-- CreateIndex
CREATE INDEX "equipamentos_biometricos_eventos_equipamento_id_idx" ON "equipamentos_biometricos_eventos"("equipamento_id");

-- CreateIndex
CREATE INDEX "equipamentos_biometricos_eventos_marcacao_id_idx" ON "equipamentos_biometricos_eventos"("marcacao_id");

-- CreateIndex
CREATE INDEX "equipamentos_biometricos_eventos_matricula_idx" ON "equipamentos_biometricos_eventos"("matricula");

-- CreateIndex
CREATE INDEX "equipamentos_biometricos_eventos_data_hora_idx" ON "equipamentos_biometricos_eventos"("data_hora");

-- CreateIndex
CREATE INDEX "equipamentos_biometricos_eventos_processado_idx" ON "equipamentos_biometricos_eventos"("processado");

-- CreateIndex
CREATE UNIQUE INDEX "equipamentos_biometricos_eventos_equipamento_id_codigo_even_key" ON "equipamentos_biometricos_eventos"("equipamento_id", "codigo_evento_externo");

-- CreateIndex
CREATE UNIQUE INDEX "equipamentos_biometricos_eventos_equipamento_id_nsr_key" ON "equipamentos_biometricos_eventos"("equipamento_id", "nsr");

-- AddForeignKey
ALTER TABLE "integracoes_logs" ADD CONSTRAINT "integracoes_logs_integracao_id_fkey" FOREIGN KEY ("integracao_id") REFERENCES "integracoes_sistemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos_biometricos" ADD CONSTRAINT "equipamentos_biometricos_integracao_id_fkey" FOREIGN KEY ("integracao_id") REFERENCES "integracoes_sistemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos_biometricos" ADD CONSTRAINT "equipamentos_biometricos_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos_biometricos_eventos" ADD CONSTRAINT "equipamentos_biometricos_eventos_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos_biometricos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos_biometricos_eventos" ADD CONSTRAINT "equipamentos_biometricos_eventos_marcacao_id_fkey" FOREIGN KEY ("marcacao_id") REFERENCES "marcacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
