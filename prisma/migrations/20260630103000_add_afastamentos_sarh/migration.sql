ALTER TYPE "TipoEndpointSarh" ADD VALUE IF NOT EXISTS 'TIPOS_AFASTAMENTO';
ALTER TYPE "TipoEndpointSarh" ADD VALUE IF NOT EXISTS 'AFASTAMENTOS';

ALTER TYPE "TipoRegistroSarh" ADD VALUE IF NOT EXISTS 'TIPO_AFASTAMENTO';
ALTER TYPE "TipoRegistroSarh" ADD VALUE IF NOT EXISTS 'AFASTAMENTO';

CREATE TABLE "tipos_afastamento_sarh" (
  "id" UUID NOT NULL,
  "codigo_externo_sarh" INTEGER NOT NULL,
  "descricao" VARCHAR(250) NOT NULL,
  "categoria" VARCHAR(80) NOT NULL,
  "remunerada" BOOLEAN,
  "aplicavel_servidor" BOOLEAN,
  "aplicavel_juiz" BOOLEAN,
  "data_inicio_vigencia" DATE,
  "data_fim_vigencia" DATE,
  "origem_sarh" BOOLEAN NOT NULL DEFAULT true,
  "payload_sarh" JSONB,
  "ultima_sincronizacao_sarh" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tipos_afastamento_sarh_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "afastamentos_sarh" (
  "id" UUID NOT NULL,
  "codigo_externo_sarh" VARCHAR(250) NOT NULL,
  "servidor_id" UUID,
  "tipo_afastamento_id" UUID,
  "categoria" VARCHAR(80) NOT NULL,
  "tipo_codigo" VARCHAR(80),
  "tipo_descricao" VARCHAR(250),
  "matricula" VARCHAR(50),
  "cpf" VARCHAR(11),
  "nome" VARCHAR(200),
  "data_inicio" DATE NOT NULL,
  "data_fim" DATE,
  "dias" INTEGER,
  "exercicio" INTEGER,
  "processo" VARCHAR(120),
  "observacao" TEXT,
  "origem_tabela" VARCHAR(120) NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "origem_sarh" BOOLEAN NOT NULL DEFAULT true,
  "payload_sarh" JSONB,
  "ultima_sincronizacao_sarh" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "afastamentos_sarh_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tipos_afastamento_sarh_codigo_externo_sarh_key"
  ON "tipos_afastamento_sarh"("codigo_externo_sarh");
CREATE INDEX "tipos_afastamento_sarh_categoria_idx"
  ON "tipos_afastamento_sarh"("categoria");
CREATE INDEX "tipos_afastamento_sarh_origem_sarh_idx"
  ON "tipos_afastamento_sarh"("origem_sarh");

CREATE UNIQUE INDEX "afastamentos_sarh_codigo_externo_sarh_key"
  ON "afastamentos_sarh"("codigo_externo_sarh");
CREATE INDEX "afastamentos_sarh_servidor_id_idx"
  ON "afastamentos_sarh"("servidor_id");
CREATE INDEX "afastamentos_sarh_tipo_afastamento_id_idx"
  ON "afastamentos_sarh"("tipo_afastamento_id");
CREATE INDEX "afastamentos_sarh_matricula_idx"
  ON "afastamentos_sarh"("matricula");
CREATE INDEX "afastamentos_sarh_cpf_idx"
  ON "afastamentos_sarh"("cpf");
CREATE INDEX "afastamentos_sarh_data_inicio_data_fim_idx"
  ON "afastamentos_sarh"("data_inicio", "data_fim");
CREATE INDEX "afastamentos_sarh_ativo_idx"
  ON "afastamentos_sarh"("ativo");

ALTER TABLE "afastamentos_sarh"
  ADD CONSTRAINT "afastamentos_sarh_servidor_id_fkey"
  FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "afastamentos_sarh"
  ADD CONSTRAINT "afastamentos_sarh_tipo_afastamento_id_fkey"
  FOREIGN KEY ("tipo_afastamento_id") REFERENCES "tipos_afastamento_sarh"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
