-- CreateEnum
CREATE TYPE "StatusSessaoCadastroFacial" AS ENUM (
  'INICIADA',
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'EXPIRADA',
  'REPROVADA',
  'CANCELADA'
);

-- AlterTable
ALTER TABLE "biometrias_faciais_servidores"
  ADD COLUMN "template_criptografado" TEXT,
  ADD COLUMN "template_iv" VARCHAR(64),
  ADD COLUMN "template_tag" VARCHAR(64),
  ADD COLUMN "template_hash" VARCHAR(128);

-- AlterTable
ALTER TABLE "biometrias_faciais_amostras"
  ADD COLUMN "template_hash" VARCHAR(128);

-- CreateTable
CREATE TABLE "biometrias_faciais_sessoes" (
  "id" UUID NOT NULL,
  "servidor_id" UUID NOT NULL,
  "usuario_id" UUID NOT NULL,
  "status" "StatusSessaoCadastroFacial" NOT NULL DEFAULT 'INICIADA',
  "nonce_hash" VARCHAR(128) NOT NULL,
  "sequencia_desafios" JSONB NOT NULL,
  "consentimento_em" TIMESTAMP(3),
  "expira_em" TIMESTAMP(3) NOT NULL,
  "concluida_em" TIMESTAMP(3),
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "score_liveness" DOUBLE PRECISION,
  "qualidade_media" DOUBLE PRECISION,
  "metadados_resultado" JSONB,
  "ip" VARCHAR(80),
  "user_agent" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "biometrias_faciais_sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "biometrias_faciais_sessoes_servidor_id_idx"
  ON "biometrias_faciais_sessoes"("servidor_id");

CREATE INDEX "biometrias_faciais_sessoes_usuario_id_idx"
  ON "biometrias_faciais_sessoes"("usuario_id");

CREATE INDEX "biometrias_faciais_sessoes_status_idx"
  ON "biometrias_faciais_sessoes"("status");

CREATE INDEX "biometrias_faciais_sessoes_expira_em_idx"
  ON "biometrias_faciais_sessoes"("expira_em");

-- AddForeignKey
ALTER TABLE "biometrias_faciais_sessoes"
  ADD CONSTRAINT "biometrias_faciais_sessoes_servidor_id_fkey"
  FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "biometrias_faciais_sessoes"
  ADD CONSTRAINT "biometrias_faciais_sessoes_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
