CREATE TYPE "TipoAutorizacaoBancoHoras" AS ENUM (
  'CREDITO',
  'COMPENSACAO_CREDITO',
  'COMPENSACAO_DEBITO'
);

CREATE TYPE "StatusAutorizacaoBancoHoras" AS ENUM (
  'AUTORIZADA',
  'UTILIZADA',
  'CANCELADA',
  'EXPIRADA'
);

CREATE TABLE "banco_horas_autorizacoes" (
  "id" UUID NOT NULL,
  "solicitacao_id" UUID NOT NULL,
  "servidor_id" UUID NOT NULL,
  "autorizado_por_usuario_id" UUID NOT NULL,
  "tipo" "TipoAutorizacaoBancoHoras" NOT NULL,
  "status" "StatusAutorizacaoBancoHoras" NOT NULL DEFAULT 'AUTORIZADA',
  "data_inicio" TIMESTAMP(3) NOT NULL,
  "data_fim" TIMESTAMP(3) NOT NULL,
  "minutos_autorizados" INTEGER NOT NULL,
  "justificativa" TEXT,
  "autorizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "banco_horas_autorizacoes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "banco_horas_movimentos"
ADD COLUMN "autorizacao_banco_horas_id" UUID;

CREATE UNIQUE INDEX "banco_horas_autorizacoes_solicitacao_id_key"
ON "banco_horas_autorizacoes"("solicitacao_id");

CREATE INDEX "banco_horas_autorizacoes_servidor_id_idx"
ON "banco_horas_autorizacoes"("servidor_id");

CREATE INDEX "banco_horas_autorizacoes_autorizado_por_usuario_id_idx"
ON "banco_horas_autorizacoes"("autorizado_por_usuario_id");

CREATE INDEX "banco_horas_autorizacoes_tipo_idx"
ON "banco_horas_autorizacoes"("tipo");

CREATE INDEX "banco_horas_autorizacoes_status_idx"
ON "banco_horas_autorizacoes"("status");

CREATE INDEX "banco_horas_autorizacoes_data_inicio_data_fim_idx"
ON "banco_horas_autorizacoes"("data_inicio", "data_fim");

CREATE INDEX "banco_horas_movimentos_autorizacao_banco_horas_id_idx"
ON "banco_horas_movimentos"("autorizacao_banco_horas_id");

ALTER TABLE "banco_horas_autorizacoes"
ADD CONSTRAINT "banco_horas_autorizacoes_solicitacao_id_fkey"
FOREIGN KEY ("solicitacao_id")
REFERENCES "solicitacoes"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "banco_horas_autorizacoes"
ADD CONSTRAINT "banco_horas_autorizacoes_servidor_id_fkey"
FOREIGN KEY ("servidor_id")
REFERENCES "servidores"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "banco_horas_autorizacoes"
ADD CONSTRAINT "banco_horas_autorizacoes_autorizado_por_usuario_id_fkey"
FOREIGN KEY ("autorizado_por_usuario_id")
REFERENCES "usuarios"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "banco_horas_movimentos"
ADD CONSTRAINT "banco_horas_movimentos_autorizacao_banco_horas_id_fkey"
FOREIGN KEY ("autorizacao_banco_horas_id")
REFERENCES "banco_horas_autorizacoes"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
