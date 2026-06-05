CREATE TYPE "StatusRecessoForense" AS ENUM ('PLANEJADO', 'ABERTO', 'EM_CONVOCACAO', 'EM_EXECUCAO', 'FECHADO', 'CANCELADO');
CREATE TYPE "StatusConvocacaoRecesso" AS ENUM ('RASCUNHO', 'PUBLICADA', 'CANCELADA');
CREATE TYPE "EscolhaCompensacaoRecesso" AS ENUM ('PENDENTE', 'PECUNIA', 'FOLGA');
CREATE TYPE "StatusConvocadoRecesso" AS ENUM ('CONVOCADO', 'FECHADO', 'HOMOLOGADO', 'DEVOLVIDO', 'ACEITO_SECAD', 'CANCELADO');
CREATE TYPE "StatusEspelhoRecesso" AS ENUM ('RECESSO_FORENSE', 'CONVOCADO', 'PENDENTE', 'SEM_MARCACAO', 'FECHADO', 'HOMOLOGADO', 'ACEITO_SECAD');
CREATE TYPE "StatusHomologacaoRecesso" AS ENUM ('PENDENTE', 'HOMOLOGADO', 'DEVOLVIDO', 'ACEITO_SECAD', 'CANCELADO');

CREATE TABLE "recessos_forenses" (
  "id" UUID NOT NULL,
  "ano" INTEGER NOT NULL,
  "data_inicio" DATE NOT NULL,
  "data_fim" DATE NOT NULL,
  "status" "StatusRecessoForense" NOT NULL DEFAULT 'PLANEJADO',
  "observacao" TEXT,
  "criado_por_usuario_id" UUID,
  "fechado_por_usuario_id" UUID,
  "fechado_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recessos_forenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recessos_convocacoes" (
  "id" UUID NOT NULL,
  "recesso_id" UUID NOT NULL,
  "unidade_id" UUID,
  "chefia_responsavel_id" UUID,
  "criado_por_usuario_id" UUID,
  "numero_portaria" VARCHAR(120) NOT NULL,
  "data_portaria" DATE,
  "descricao" TEXT,
  "status" "StatusConvocacaoRecesso" NOT NULL DEFAULT 'RASCUNHO',
  "publicado_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recessos_convocacoes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recessos_convocados" (
  "id" UUID NOT NULL,
  "recesso_id" UUID NOT NULL,
  "convocacao_id" UUID NOT NULL,
  "servidor_id" UUID NOT NULL,
  "data_convocacao" DATE NOT NULL,
  "escolha" "EscolhaCompensacaoRecesso" NOT NULL DEFAULT 'PENDENTE',
  "status" "StatusConvocadoRecesso" NOT NULL DEFAULT 'CONVOCADO',
  "minutos_previstos" INTEGER NOT NULL DEFAULT 0,
  "minutos_trabalhados" INTEGER NOT NULL DEFAULT 0,
  "observacao" TEXT,
  "fechado_por_usuario_id" UUID,
  "fechado_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recessos_convocados_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recessos_espelhos" (
  "id" UUID NOT NULL,
  "recesso_id" UUID NOT NULL,
  "servidor_id" UUID NOT NULL,
  "convocado_id" UUID,
  "data_referencia" DATE NOT NULL,
  "status" "StatusEspelhoRecesso" NOT NULL DEFAULT 'RECESSO_FORENSE',
  "escolha" "EscolhaCompensacaoRecesso" NOT NULL DEFAULT 'PENDENTE',
  "marcacoes" JSONB,
  "minutos_trabalhados" INTEGER NOT NULL DEFAULT 0,
  "observacao" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recessos_espelhos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recessos_homologacoes" (
  "id" UUID NOT NULL,
  "recesso_id" UUID NOT NULL,
  "servidor_id" UUID NOT NULL,
  "mes_referencia" INTEGER NOT NULL,
  "status" "StatusHomologacaoRecesso" NOT NULL DEFAULT 'PENDENTE',
  "total_dias_convocados" INTEGER NOT NULL DEFAULT 0,
  "dias_pecunia" INTEGER NOT NULL DEFAULT 0,
  "dias_folga" INTEGER NOT NULL DEFAULT 0,
  "minutos_trabalhados" INTEGER NOT NULL DEFAULT 0,
  "observacao_servidor" TEXT,
  "observacao_chefia" TEXT,
  "observacao_secad" TEXT,
  "homologado_por_usuario_id" UUID,
  "homologado_em" TIMESTAMP(3),
  "aceito_secad_por_usuario_id" UUID,
  "aceito_secad_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recessos_homologacoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recessos_forenses_ano_key" ON "recessos_forenses"("ano");
CREATE INDEX "recessos_forenses_status_idx" ON "recessos_forenses"("status");
CREATE INDEX "recessos_forenses_data_inicio_data_fim_idx" ON "recessos_forenses"("data_inicio", "data_fim");
CREATE INDEX "recessos_convocacoes_recesso_id_idx" ON "recessos_convocacoes"("recesso_id");
CREATE INDEX "recessos_convocacoes_unidade_id_idx" ON "recessos_convocacoes"("unidade_id");
CREATE INDEX "recessos_convocacoes_chefia_responsavel_id_idx" ON "recessos_convocacoes"("chefia_responsavel_id");
CREATE INDEX "recessos_convocacoes_status_idx" ON "recessos_convocacoes"("status");
CREATE UNIQUE INDEX "recessos_convocados_convocacao_id_servidor_id_data_convocacao_key" ON "recessos_convocados"("convocacao_id", "servidor_id", "data_convocacao");
CREATE INDEX "recessos_convocados_recesso_id_idx" ON "recessos_convocados"("recesso_id");
CREATE INDEX "recessos_convocados_servidor_id_idx" ON "recessos_convocados"("servidor_id");
CREATE INDEX "recessos_convocados_data_convocacao_idx" ON "recessos_convocados"("data_convocacao");
CREATE INDEX "recessos_convocados_status_idx" ON "recessos_convocados"("status");
CREATE INDEX "recessos_convocados_escolha_idx" ON "recessos_convocados"("escolha");
CREATE UNIQUE INDEX "recessos_espelhos_recesso_id_servidor_id_data_referencia_key" ON "recessos_espelhos"("recesso_id", "servidor_id", "data_referencia");
CREATE INDEX "recessos_espelhos_servidor_id_idx" ON "recessos_espelhos"("servidor_id");
CREATE INDEX "recessos_espelhos_convocado_id_idx" ON "recessos_espelhos"("convocado_id");
CREATE INDEX "recessos_espelhos_data_referencia_idx" ON "recessos_espelhos"("data_referencia");
CREATE INDEX "recessos_espelhos_status_idx" ON "recessos_espelhos"("status");
CREATE UNIQUE INDEX "recessos_homologacoes_recesso_id_servidor_id_mes_referencia_key" ON "recessos_homologacoes"("recesso_id", "servidor_id", "mes_referencia");
CREATE INDEX "recessos_homologacoes_servidor_id_idx" ON "recessos_homologacoes"("servidor_id");
CREATE INDEX "recessos_homologacoes_status_idx" ON "recessos_homologacoes"("status");
CREATE INDEX "recessos_homologacoes_mes_referencia_idx" ON "recessos_homologacoes"("mes_referencia");

ALTER TABLE "recessos_forenses" ADD CONSTRAINT "recessos_forenses_criado_por_usuario_id_fkey" FOREIGN KEY ("criado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recessos_forenses" ADD CONSTRAINT "recessos_forenses_fechado_por_usuario_id_fkey" FOREIGN KEY ("fechado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recessos_convocacoes" ADD CONSTRAINT "recessos_convocacoes_recesso_id_fkey" FOREIGN KEY ("recesso_id") REFERENCES "recessos_forenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recessos_convocacoes" ADD CONSTRAINT "recessos_convocacoes_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recessos_convocacoes" ADD CONSTRAINT "recessos_convocacoes_chefia_responsavel_id_fkey" FOREIGN KEY ("chefia_responsavel_id") REFERENCES "servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recessos_convocacoes" ADD CONSTRAINT "recessos_convocacoes_criado_por_usuario_id_fkey" FOREIGN KEY ("criado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recessos_convocados" ADD CONSTRAINT "recessos_convocados_recesso_id_fkey" FOREIGN KEY ("recesso_id") REFERENCES "recessos_forenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recessos_convocados" ADD CONSTRAINT "recessos_convocados_convocacao_id_fkey" FOREIGN KEY ("convocacao_id") REFERENCES "recessos_convocacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recessos_convocados" ADD CONSTRAINT "recessos_convocados_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recessos_convocados" ADD CONSTRAINT "recessos_convocados_fechado_por_usuario_id_fkey" FOREIGN KEY ("fechado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recessos_espelhos" ADD CONSTRAINT "recessos_espelhos_recesso_id_fkey" FOREIGN KEY ("recesso_id") REFERENCES "recessos_forenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recessos_espelhos" ADD CONSTRAINT "recessos_espelhos_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recessos_espelhos" ADD CONSTRAINT "recessos_espelhos_convocado_id_fkey" FOREIGN KEY ("convocado_id") REFERENCES "recessos_convocados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recessos_homologacoes" ADD CONSTRAINT "recessos_homologacoes_recesso_id_fkey" FOREIGN KEY ("recesso_id") REFERENCES "recessos_forenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recessos_homologacoes" ADD CONSTRAINT "recessos_homologacoes_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recessos_homologacoes" ADD CONSTRAINT "recessos_homologacoes_homologado_por_usuario_id_fkey" FOREIGN KEY ("homologado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recessos_homologacoes" ADD CONSTRAINT "recessos_homologacoes_aceito_secad_por_usuario_id_fkey" FOREIGN KEY ("aceito_secad_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
