ALTER TYPE "TipoEndpointSarh" ADD VALUE IF NOT EXISTS 'SUBSTITUICOES';
ALTER TYPE "TipoRegistroSarh" ADD VALUE IF NOT EXISTS 'SUBSTITUICAO';

CREATE TYPE "OrigemSubstituicaoFuncao" AS ENUM (
  'SARH',
  'SECP',
  'IMPORTACAO'
);

CREATE TYPE "TipoSubstituicaoFuncao" AS ENUM (
  'AUTOMATICA',
  'EVENTUAL',
  'DESIGNADA',
  'INTERINA',
  'OUTRA'
);

CREATE TYPE "StatusSubstituicaoFuncao" AS ENUM (
  'ATIVA',
  'INATIVA',
  'SUSPENSA',
  'ENCERRADA'
);

CREATE TYPE "TipoDiaSubstituicaoFuncao" AS ENUM (
  'AFASTAMENTO_TITULAR',
  'FALTA_TITULAR',
  'FERIAS',
  'LICENCA',
  'DESIGNACAO_EVENTUAL',
  'AJUSTE_MANUAL',
  'OUTRO'
);

CREATE TYPE "StatusPagamentoSubstituicaoFuncao" AS ENUM (
  'RASCUNHO',
  'CALCULADO',
  'EM_ANALISE',
  'APROVADO',
  'REJEITADO',
  'ENVIADO_FOLHA',
  'PAGO',
  'CANCELADO'
);

CREATE TABLE "funcoes_confianca_referencias" (
  "id" UUID NOT NULL,
  "orgao_id" UUID,
  "grupo" VARCHAR(30),
  "categoria" VARCHAR(30) NOT NULL,
  "codigo" VARCHAR(50) NOT NULL,
  "descricao" VARCHAR(250) NOT NULL,
  "codigo_folha_sarh" INTEGER,
  "codigo_nome_funcao_sarh" INTEGER,
  "codigo_funcao_lotacao_sarh" INTEGER,
  "valor_mensal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "data_inicio_vigencia" DATE,
  "data_fim_vigencia" DATE,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "origem" "OrigemSubstituicaoFuncao" NOT NULL DEFAULT 'SECP',
  "codigo_externo_sarh" VARCHAR(160),
  "payload_sarh" JSONB,
  "ultima_sincronizacao_sarh" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "funcoes_confianca_referencias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "substituicoes_funcao" (
  "id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "unidade_id" UUID,
  "titular_servidor_id" UUID NOT NULL,
  "substituto_servidor_id" UUID NOT NULL,
  "funcao_titular_id" UUID,
  "funcao_substituto_id" UUID,
  "tipo" "TipoSubstituicaoFuncao" NOT NULL DEFAULT 'AUTOMATICA',
  "status" "StatusSubstituicaoFuncao" NOT NULL DEFAULT 'ATIVA',
  "origem" "OrigemSubstituicaoFuncao" NOT NULL DEFAULT 'SECP',
  "data_inicio" DATE NOT NULL,
  "data_fim" DATE,
  "ato_designacao" VARCHAR(120),
  "data_ato_designacao" DATE,
  "data_publicacao_ato" DATE,
  "ato_dispensa" VARCHAR(120),
  "data_ato_dispensa" DATE,
  "data_publicacao_dispensa" DATE,
  "processo_sei" VARCHAR(120),
  "observacao" TEXT,
  "codigo_externo_sarh" VARCHAR(250),
  "codigo_funcao_titular_sarh" VARCHAR(120),
  "codigo_funcao_substituto_sarh" VARCHAR(120),
  "payload_sarh" JSONB,
  "ultima_sincronizacao_sarh" TIMESTAMP(3),
  "criado_por_usuario_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "substituicoes_funcao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pagamentos_substituicoes_funcao" (
  "id" UUID NOT NULL,
  "substituicao_id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "unidade_id" UUID,
  "titular_servidor_id" UUID NOT NULL,
  "substituto_servidor_id" UUID NOT NULL,
  "competencia" VARCHAR(7) NOT NULL,
  "data_inicio" DATE NOT NULL,
  "data_fim" DATE NOT NULL,
  "total_dias" INTEGER NOT NULL DEFAULT 0,
  "valor_funcao_titular" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "valor_funcao_substituto" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "diferenca_mensal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "divisor_mensal" INTEGER NOT NULL DEFAULT 30,
  "valor_dia" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "valor_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "StatusPagamentoSubstituicaoFuncao" NOT NULL DEFAULT 'RASCUNHO',
  "processo_sei" VARCHAR(120),
  "observacao" TEXT,
  "calculado_por_usuario_id" UUID,
  "calculado_em" TIMESTAMP(3),
  "aprovado_por_usuario_id" UUID,
  "aprovado_em" TIMESTAMP(3),
  "enviado_folha_em" TIMESTAMP(3),
  "pago_em" TIMESTAMP(3),
  "dados_calculo" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pagamentos_substituicoes_funcao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pagamentos_substituicoes_funcao_dias" (
  "id" UUID NOT NULL,
  "pagamento_id" UUID NOT NULL,
  "data_referencia" DATE NOT NULL,
  "tipo" "TipoDiaSubstituicaoFuncao" NOT NULL,
  "elegivel" BOOLEAN NOT NULL DEFAULT true,
  "motivo" TEXT,
  "valor_dia" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "afastamento_sarh_id" UUID,
  "apuracao_diaria_id" UUID,
  "dados_origem" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pagamentos_substituicoes_funcao_dias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "funcoes_confianca_referencias_codigo_externo_sarh_key"
  ON "funcoes_confianca_referencias"("codigo_externo_sarh");
CREATE UNIQUE INDEX "funcoes_confianca_referencias_orgao_categoria_codigo_inicio_key"
  ON "funcoes_confianca_referencias"("orgao_id", "categoria", "codigo", "data_inicio_vigencia");
CREATE INDEX "funcoes_confianca_referencias_orgao_id_idx"
  ON "funcoes_confianca_referencias"("orgao_id");
CREATE INDEX "funcoes_confianca_referencias_categoria_codigo_idx"
  ON "funcoes_confianca_referencias"("categoria", "codigo");
CREATE INDEX "funcoes_confianca_referencias_codigo_folha_sarh_idx"
  ON "funcoes_confianca_referencias"("codigo_folha_sarh");
CREATE INDEX "funcoes_confianca_referencias_codigo_funcao_lotacao_sarh_idx"
  ON "funcoes_confianca_referencias"("codigo_funcao_lotacao_sarh");
CREATE INDEX "funcoes_confianca_referencias_ativo_idx"
  ON "funcoes_confianca_referencias"("ativo");

CREATE UNIQUE INDEX "substituicoes_funcao_codigo_externo_sarh_key"
  ON "substituicoes_funcao"("codigo_externo_sarh");
CREATE INDEX "substituicoes_funcao_orgao_id_idx"
  ON "substituicoes_funcao"("orgao_id");
CREATE INDEX "substituicoes_funcao_unidade_id_idx"
  ON "substituicoes_funcao"("unidade_id");
CREATE INDEX "substituicoes_funcao_titular_servidor_id_idx"
  ON "substituicoes_funcao"("titular_servidor_id");
CREATE INDEX "substituicoes_funcao_substituto_servidor_id_idx"
  ON "substituicoes_funcao"("substituto_servidor_id");
CREATE INDEX "substituicoes_funcao_funcao_titular_id_idx"
  ON "substituicoes_funcao"("funcao_titular_id");
CREATE INDEX "substituicoes_funcao_funcao_substituto_id_idx"
  ON "substituicoes_funcao"("funcao_substituto_id");
CREATE INDEX "substituicoes_funcao_status_idx"
  ON "substituicoes_funcao"("status");
CREATE INDEX "substituicoes_funcao_origem_idx"
  ON "substituicoes_funcao"("origem");
CREATE INDEX "substituicoes_funcao_data_inicio_data_fim_idx"
  ON "substituicoes_funcao"("data_inicio", "data_fim");
CREATE INDEX "substituicoes_funcao_titular_status_periodo_idx"
  ON "substituicoes_funcao"("titular_servidor_id", "status", "data_inicio", "data_fim");
CREATE INDEX "substituicoes_funcao_substituto_status_periodo_idx"
  ON "substituicoes_funcao"("substituto_servidor_id", "status", "data_inicio", "data_fim");

CREATE UNIQUE INDEX "pagamentos_substituicoes_funcao_periodo_key"
  ON "pagamentos_substituicoes_funcao"("substituicao_id", "competencia", "data_inicio", "data_fim");
CREATE INDEX "pagamentos_substituicoes_funcao_orgao_id_idx"
  ON "pagamentos_substituicoes_funcao"("orgao_id");
CREATE INDEX "pagamentos_substituicoes_funcao_unidade_id_idx"
  ON "pagamentos_substituicoes_funcao"("unidade_id");
CREATE INDEX "pagamentos_substituicoes_funcao_titular_servidor_id_idx"
  ON "pagamentos_substituicoes_funcao"("titular_servidor_id");
CREATE INDEX "pagamentos_substituicoes_funcao_substituto_servidor_id_idx"
  ON "pagamentos_substituicoes_funcao"("substituto_servidor_id");
CREATE INDEX "pagamentos_substituicoes_funcao_competencia_idx"
  ON "pagamentos_substituicoes_funcao"("competencia");
CREATE INDEX "pagamentos_substituicoes_funcao_status_idx"
  ON "pagamentos_substituicoes_funcao"("status");
CREATE INDEX "pagamentos_substituicoes_funcao_data_inicio_data_fim_idx"
  ON "pagamentos_substituicoes_funcao"("data_inicio", "data_fim");

CREATE UNIQUE INDEX "pagamentos_substituicoes_funcao_dias_pagamento_data_key"
  ON "pagamentos_substituicoes_funcao_dias"("pagamento_id", "data_referencia");
CREATE INDEX "pagamentos_substituicoes_funcao_dias_data_referencia_idx"
  ON "pagamentos_substituicoes_funcao_dias"("data_referencia");
CREATE INDEX "pagamentos_substituicoes_funcao_dias_tipo_idx"
  ON "pagamentos_substituicoes_funcao_dias"("tipo");
CREATE INDEX "pagamentos_substituicoes_funcao_dias_afastamento_sarh_id_idx"
  ON "pagamentos_substituicoes_funcao_dias"("afastamento_sarh_id");
CREATE INDEX "pagamentos_substituicoes_funcao_dias_apuracao_diaria_id_idx"
  ON "pagamentos_substituicoes_funcao_dias"("apuracao_diaria_id");

ALTER TABLE "funcoes_confianca_referencias"
  ADD CONSTRAINT "funcoes_confianca_referencias_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "substituicoes_funcao"
  ADD CONSTRAINT "substituicoes_funcao_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "substituicoes_funcao"
  ADD CONSTRAINT "substituicoes_funcao_unidade_id_fkey"
  FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "substituicoes_funcao"
  ADD CONSTRAINT "substituicoes_funcao_titular_servidor_id_fkey"
  FOREIGN KEY ("titular_servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "substituicoes_funcao"
  ADD CONSTRAINT "substituicoes_funcao_substituto_servidor_id_fkey"
  FOREIGN KEY ("substituto_servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "substituicoes_funcao"
  ADD CONSTRAINT "substituicoes_funcao_funcao_titular_id_fkey"
  FOREIGN KEY ("funcao_titular_id") REFERENCES "funcoes_confianca_referencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "substituicoes_funcao"
  ADD CONSTRAINT "substituicoes_funcao_funcao_substituto_id_fkey"
  FOREIGN KEY ("funcao_substituto_id") REFERENCES "funcoes_confianca_referencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "substituicoes_funcao"
  ADD CONSTRAINT "substituicoes_funcao_criado_por_usuario_id_fkey"
  FOREIGN KEY ("criado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pagamentos_substituicoes_funcao"
  ADD CONSTRAINT "pagamentos_substituicoes_funcao_substituicao_id_fkey"
  FOREIGN KEY ("substituicao_id") REFERENCES "substituicoes_funcao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagamentos_substituicoes_funcao"
  ADD CONSTRAINT "pagamentos_substituicoes_funcao_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagamentos_substituicoes_funcao"
  ADD CONSTRAINT "pagamentos_substituicoes_funcao_unidade_id_fkey"
  FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pagamentos_substituicoes_funcao"
  ADD CONSTRAINT "pagamentos_substituicoes_funcao_titular_servidor_id_fkey"
  FOREIGN KEY ("titular_servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagamentos_substituicoes_funcao"
  ADD CONSTRAINT "pagamentos_substituicoes_funcao_substituto_servidor_id_fkey"
  FOREIGN KEY ("substituto_servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagamentos_substituicoes_funcao"
  ADD CONSTRAINT "pagamentos_substituicoes_funcao_calculado_por_usuario_id_fkey"
  FOREIGN KEY ("calculado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pagamentos_substituicoes_funcao"
  ADD CONSTRAINT "pagamentos_substituicoes_funcao_aprovado_por_usuario_id_fkey"
  FOREIGN KEY ("aprovado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pagamentos_substituicoes_funcao_dias"
  ADD CONSTRAINT "pagamentos_substituicoes_funcao_dias_pagamento_id_fkey"
  FOREIGN KEY ("pagamento_id") REFERENCES "pagamentos_substituicoes_funcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pagamentos_substituicoes_funcao_dias"
  ADD CONSTRAINT "pagamentos_substituicoes_funcao_dias_afastamento_sarh_id_fkey"
  FOREIGN KEY ("afastamento_sarh_id") REFERENCES "afastamentos_sarh"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pagamentos_substituicoes_funcao_dias"
  ADD CONSTRAINT "pagamentos_substituicoes_funcao_dias_apuracao_diaria_id_fkey"
  FOREIGN KEY ("apuracao_diaria_id") REFERENCES "apuracoes_diarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
