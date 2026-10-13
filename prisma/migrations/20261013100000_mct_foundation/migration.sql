CREATE TYPE "MctModoOperacao" AS ENUM ('LEGACY', 'SHADOW', 'MCT');
CREATE TYPE "MctEstadoPublicacao" AS ENUM ('RASCUNHO', 'PUBLICADA', 'INATIVA');
CREATE TYPE "MctStatusExecucao" AS ENUM ('INICIADA', 'CONCLUIDA', 'CONCLUIDA_COM_PENDENCIAS', 'ERRO');
CREATE TYPE "MctDimensaoRubrica" AS ENUM ('TEMPORAL', 'JURIDICA_ADMINISTRATIVA', 'DESTINACAO', 'INCIDENCIA');

CREATE TABLE "mct_politicas_versoes" (
  "id" UUID NOT NULL, "orgao_id" UUID NOT NULL, "codigo" VARCHAR(80) NOT NULL,
  "nome" VARCHAR(160) NOT NULL, "descricao" TEXT, "versao" INTEGER NOT NULL,
  "estado" "MctEstadoPublicacao" NOT NULL DEFAULT 'RASCUNHO',
  "vigencia_inicio" DATE NOT NULL, "vigencia_fim" DATE, "configuracao" JSONB NOT NULL,
  "regras" JSONB NOT NULL, "fundamento_normativo" TEXT, "hash_conteudo" VARCHAR(64) NOT NULL,
  "criada_por_usuario_id" UUID, "publicada_por_usuario_id" UUID, "publicada_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mct_politicas_versoes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mct_rubricas_versoes" (
  "id" UUID NOT NULL, "orgao_id" UUID, "codigo" VARCHAR(80) NOT NULL,
  "nome" VARCHAR(160) NOT NULL, "descricao" TEXT NOT NULL,
  "dimensao" "MctDimensaoRubrica" NOT NULL, "natureza" VARCHAR(80) NOT NULL,
  "unidade" VARCHAR(40) NOT NULL, "versao" INTEGER NOT NULL,
  "estado" "MctEstadoPublicacao" NOT NULL DEFAULT 'RASCUNHO',
  "vigencia_inicio" DATE NOT NULL, "vigencia_fim" DATE, "definicao" JSONB NOT NULL,
  "fundamento_normativo" TEXT, "hash_conteudo" VARCHAR(64) NOT NULL,
  "criada_por_usuario_id" UUID, "publicada_por_usuario_id" UUID, "publicada_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mct_rubricas_versoes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mct_execucoes" (
  "id" UUID NOT NULL, "orgao_id" UUID NOT NULL, "servidor_id" UUID NOT NULL,
  "data_referencia" DATE NOT NULL, "competencia" VARCHAR(7) NOT NULL,
  "modo" "MctModoOperacao" NOT NULL DEFAULT 'SHADOW',
  "status" "MctStatusExecucao" NOT NULL DEFAULT 'INICIADA',
  "politica_versao_id" UUID NOT NULL, "versao_motor" VARCHAR(40) NOT NULL,
  "hash_entrada" VARCHAR(64) NOT NULL, "entrada_snapshot" JSONB NOT NULL,
  "resultado_jornada" JSONB, "resultado_conformidade" JSONB, "memoria_calculo" JSONB,
  "mensagem_erro" TEXT, "iniciada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizada_em" TIMESTAMP(3), "duracao_ms" INTEGER,
  CONSTRAINT "mct_execucoes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mct_eventos_entrada" (
  "id" UUID NOT NULL, "execucao_id" UUID NOT NULL, "evento_id_origem" VARCHAR(120),
  "tipo" VARCHAR(40) NOT NULL, "fonte" VARCHAR(80) NOT NULL, "ocorrido_em" TIMESTAMP(3) NOT NULL,
  "duplicado_de" VARCHAR(120), "payload" JSONB,
  CONSTRAINT "mct_eventos_entrada_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mct_segmentos" (
  "id" UUID NOT NULL, "execucao_id" UUID NOT NULL, "indice" INTEGER NOT NULL,
  "inicio" TIMESTAMP(3) NOT NULL, "fim" TIMESTAMP(3) NOT NULL, "minutos" INTEGER NOT NULL,
  "marcadores" JSONB NOT NULL, "metadados" JSONB,
  CONSTRAINT "mct_segmentos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mct_fatos_conformidade" (
  "id" UUID NOT NULL, "execucao_id" UUID NOT NULL, "codigo" VARCHAR(100) NOT NULL,
  "categoria" VARCHAR(40) NOT NULL, "minutos" INTEGER, "descricao" TEXT NOT NULL, "metadados" JSONB,
  CONSTRAINT "mct_fatos_conformidade_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mct_rubricas_aplicadas" (
  "id" UUID NOT NULL, "execucao_id" UUID NOT NULL, "rubrica_versao_id" UUID NOT NULL,
  "segmento_id" UUID, "quantidade" INTEGER NOT NULL, "status" VARCHAR(40) NOT NULL,
  "destinacao" VARCHAR(80), "base_incidencia" JSONB, "explicacao" TEXT,
  CONSTRAINT "mct_rubricas_aplicadas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mct_politicas_versoes_orgao_id_estado_idx" ON "mct_politicas_versoes"("orgao_id", "estado");
CREATE INDEX "mct_politicas_versoes_vigencia_idx" ON "mct_politicas_versoes"("vigencia_inicio", "vigencia_fim");
CREATE UNIQUE INDEX "mct_politicas_versoes_codigo_key" ON "mct_politicas_versoes"("orgao_id", "codigo", "versao");
CREATE INDEX "mct_rubricas_versoes_orgao_id_estado_idx" ON "mct_rubricas_versoes"("orgao_id", "estado");
CREATE INDEX "mct_rubricas_versoes_dimensao_idx" ON "mct_rubricas_versoes"("dimensao");
CREATE INDEX "mct_rubricas_versoes_vigencia_idx" ON "mct_rubricas_versoes"("vigencia_inicio", "vigencia_fim");
CREATE UNIQUE INDEX "mct_rubricas_versoes_codigo_key" ON "mct_rubricas_versoes"("orgao_id", "codigo", "versao");
CREATE INDEX "mct_execucoes_orgao_data_idx" ON "mct_execucoes"("orgao_id", "data_referencia");
CREATE INDEX "mct_execucoes_servidor_data_idx" ON "mct_execucoes"("servidor_id", "data_referencia");
CREATE INDEX "mct_execucoes_competencia_status_idx" ON "mct_execucoes"("competencia", "status");
CREATE INDEX "mct_execucoes_politica_versao_id_idx" ON "mct_execucoes"("politica_versao_id");
CREATE UNIQUE INDEX "mct_execucoes_idempotencia_key" ON "mct_execucoes"("orgao_id", "servidor_id", "data_referencia", "politica_versao_id", "hash_entrada", "modo");
CREATE INDEX "mct_eventos_entrada_execucao_data_idx" ON "mct_eventos_entrada"("execucao_id", "ocorrido_em");
CREATE INDEX "mct_eventos_entrada_origem_idx" ON "mct_eventos_entrada"("evento_id_origem");
CREATE UNIQUE INDEX "mct_segmentos_execucao_indice_key" ON "mct_segmentos"("execucao_id", "indice");
CREATE INDEX "mct_segmentos_execucao_inicio_idx" ON "mct_segmentos"("execucao_id", "inicio");
CREATE INDEX "mct_fatos_execucao_categoria_idx" ON "mct_fatos_conformidade"("execucao_id", "categoria");
CREATE INDEX "mct_fatos_codigo_idx" ON "mct_fatos_conformidade"("codigo");
CREATE INDEX "mct_rubricas_aplicadas_execucao_idx" ON "mct_rubricas_aplicadas"("execucao_id");
CREATE INDEX "mct_rubricas_aplicadas_rubrica_idx" ON "mct_rubricas_aplicadas"("rubrica_versao_id");
CREATE INDEX "mct_rubricas_aplicadas_segmento_idx" ON "mct_rubricas_aplicadas"("segmento_id");

ALTER TABLE "mct_execucoes" ADD CONSTRAINT "mct_execucoes_politica_fkey" FOREIGN KEY ("politica_versao_id") REFERENCES "mct_politicas_versoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mct_eventos_entrada" ADD CONSTRAINT "mct_eventos_execucao_fkey" FOREIGN KEY ("execucao_id") REFERENCES "mct_execucoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mct_segmentos" ADD CONSTRAINT "mct_segmentos_execucao_fkey" FOREIGN KEY ("execucao_id") REFERENCES "mct_execucoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mct_fatos_conformidade" ADD CONSTRAINT "mct_fatos_execucao_fkey" FOREIGN KEY ("execucao_id") REFERENCES "mct_execucoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mct_rubricas_aplicadas" ADD CONSTRAINT "mct_rubricas_execucao_fkey" FOREIGN KEY ("execucao_id") REFERENCES "mct_execucoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mct_rubricas_aplicadas" ADD CONSTRAINT "mct_rubricas_versao_fkey" FOREIGN KEY ("rubrica_versao_id") REFERENCES "mct_rubricas_versoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mct_rubricas_aplicadas" ADD CONSTRAINT "mct_rubricas_segmento_fkey" FOREIGN KEY ("segmento_id") REFERENCES "mct_segmentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
