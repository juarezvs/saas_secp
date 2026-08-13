CREATE TYPE "ModalidadeAutorizacaoHoraExtra" AS ENUM (
  'PERIODO',
  'DATAS_ESPECIFICAS',
  'PERIODO_QUANTIDADE_GLOBAL',
  'PERIODO_LIMITE_TIPO_DIA'
);

CREATE TYPE "StatusAutorizacaoHoraExtra" AS ENUM (
  'RASCUNHO',
  'REGISTRADA_NO_SECP',
  'VIGENTE',
  'EM_EXECUCAO',
  'AGUARDANDO_CONFERENCIA',
  'EM_CONFERENCIA',
  'PENDENTE_AJUSTE',
  'ATESTADA',
  'CALCULADA',
  'PRONTA_PARA_FOLHA',
  'ENVIADA_PARA_FOLHA',
  'PAGA',
  'CANCELADA'
);

CREATE TYPE "StatusServidorAutorizacaoHoraExtra" AS ENUM (
  'AUTORIZADO',
  'SEM_EXECUCAO',
  'EXECUCAO_EM_ANDAMENTO',
  'PENDENTE_CONFERENCIA',
  'PENDENTE_DECISAO_GESTOR',
  'REGULAR',
  'COM_DIVERGENCIA',
  'ATESTADO',
  'CALCULADO',
  'PRONTO_PARA_FOLHA',
  'PROCESSADO_EM_FOLHA',
  'CANCELADO'
);

CREATE TYPE "CategoriaClassificacaoHoraExtra" AS ENUM (
  'COMPENSACAO_DEBITO',
  'EXCEDENTE_A_AUTORIZACAO',
  'FORA_FAIXA_PERMITIDA',
  'HORA_EXTRA_RECONHECIDA',
  'HORA_CREDITO',
  'NAO_AUTORIZADA'
);

CREATE TABLE "autorizacoes_horas_extras" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orgao_id" UUID NOT NULL,
  "unidade_id" UUID NOT NULL,
  "processo_sei" VARCHAR(80) NOT NULL,
  "documento_autorizacao" VARCHAR(160) NOT NULL,
  "mes_referencia" VARCHAR(7) NOT NULL,
  "data_autorizacao" DATE NOT NULL,
  "autoridade_autorizadora" VARCHAR(200),
  "observacoes" TEXT,
  "origem_documento" VARCHAR(200),
  "modalidade" "ModalidadeAutorizacaoHoraExtra" NOT NULL,
  "status" "StatusAutorizacaoHoraExtra" NOT NULL DEFAULT 'RASCUNHO',
  "versao" INTEGER NOT NULL DEFAULT 1,
  "conteudo_original_autorizado" JSONB,
  "registrada_por_usuario_id" UUID,
  "registrada_em" TIMESTAMP(3),
  "cancelada_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "autorizacoes_horas_extras_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "autorizacoes_horas_extras_servidores" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "autorizacao_id" UUID NOT NULL,
  "servidor_id" UUID NOT NULL,
  "unidade_id" UUID NOT NULL,
  "matricula_snapshot" VARCHAR(50) NOT NULL,
  "nome_snapshot" VARCHAR(200) NOT NULL,
  "unidade_snapshot" VARCHAR(250),
  "cargo_snapshot" VARCHAR(250),
  "periodo_inicio" DATE NOT NULL,
  "periodo_fim" DATE NOT NULL,
  "quantidade_maxima_minutos" INTEGER NOT NULL,
  "limites_por_tipo_dia" JSONB,
  "status" "StatusServidorAutorizacaoHoraExtra" NOT NULL DEFAULT 'AUTORIZADO',
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "autorizacoes_horas_extras_servidores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "autorizacoes_horas_extras_regras" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "servidor_autorizado_id" UUID NOT NULL,
  "data" DATE,
  "tipo_dia" "OvertimeDayType",
  "limite_minutos" INTEGER,
  "faixa_inicio" VARCHAR(5),
  "faixa_fim" VARCHAR(5),
  "metadados" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "autorizacoes_horas_extras_regras_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "horas_extras_execucoes_intervalos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "servidor_autorizado_id" UUID NOT NULL,
  "marcacao_origem_id" UUID,
  "data" DATE NOT NULL,
  "inicio" VARCHAR(5) NOT NULL,
  "fim" VARCHAR(5) NOT NULL,
  "minutos_trabalhados" INTEGER NOT NULL,
  "origem" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "horas_extras_execucoes_intervalos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "horas_extras_classificacoes_intervalos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "servidor_autorizado_id" UUID NOT NULL,
  "execucao_intervalo_id" UUID,
  "data" DATE NOT NULL,
  "inicio" VARCHAR(5) NOT NULL,
  "fim" VARCHAR(5) NOT NULL,
  "minutos" INTEGER NOT NULL,
  "categoria" "CategoriaClassificacaoHoraExtra" NOT NULL,
  "motivo" TEXT NOT NULL,
  "decisao_gestor_usuario_id" UUID,
  "decidida_em" TIMESTAMP(3),
  "justificativa" TEXT,
  "classificacao_anterior" "CategoriaClassificacaoHoraExtra",
  "metadados" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "horas_extras_classificacoes_intervalos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "horas_extras_atestos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "autorizacao_id" UUID NOT NULL,
  "gestor_usuario_id" UUID NOT NULL,
  "texto" TEXT NOT NULL,
  "snapshot" JSONB,
  "emitido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "documento_id" UUID,
  CONSTRAINT "horas_extras_atestos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "horas_extras_eventos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "autorizacao_id" UUID NOT NULL,
  "servidor_autorizado_id" UUID,
  "usuario_id" UUID,
  "acao" VARCHAR(120) NOT NULL,
  "dados_antes" JSONB,
  "dados_depois" JSONB,
  "justificativa" TEXT,
  "metadados" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "horas_extras_eventos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "autorizacoes_horas_extras_orgao_id_processo_sei_documento_autorizacao_versao_key"
  ON "autorizacoes_horas_extras"("orgao_id", "processo_sei", "documento_autorizacao", "versao");
CREATE INDEX "autorizacoes_horas_extras_orgao_id_idx" ON "autorizacoes_horas_extras"("orgao_id");
CREATE INDEX "autorizacoes_horas_extras_unidade_id_idx" ON "autorizacoes_horas_extras"("unidade_id");
CREATE INDEX "autorizacoes_horas_extras_mes_referencia_idx" ON "autorizacoes_horas_extras"("mes_referencia");
CREATE INDEX "autorizacoes_horas_extras_status_idx" ON "autorizacoes_horas_extras"("status");
CREATE INDEX "autorizacoes_horas_extras_registrada_por_usuario_id_idx" ON "autorizacoes_horas_extras"("registrada_por_usuario_id");
CREATE INDEX "autorizacoes_horas_extras_data_autorizacao_idx" ON "autorizacoes_horas_extras"("data_autorizacao");

CREATE UNIQUE INDEX "autorizacoes_horas_extras_servidores_autorizacao_id_servidor_id_key"
  ON "autorizacoes_horas_extras_servidores"("autorizacao_id", "servidor_id");
CREATE INDEX "autorizacoes_horas_extras_servidores_autorizacao_id_idx" ON "autorizacoes_horas_extras_servidores"("autorizacao_id");
CREATE INDEX "autorizacoes_horas_extras_servidores_servidor_id_idx" ON "autorizacoes_horas_extras_servidores"("servidor_id");
CREATE INDEX "autorizacoes_horas_extras_servidores_unidade_id_idx" ON "autorizacoes_horas_extras_servidores"("unidade_id");
CREATE INDEX "autorizacoes_horas_extras_servidores_periodo_inicio_periodo_fim_idx" ON "autorizacoes_horas_extras_servidores"("periodo_inicio", "periodo_fim");
CREATE INDEX "autorizacoes_horas_extras_servidores_status_idx" ON "autorizacoes_horas_extras_servidores"("status");

CREATE INDEX "autorizacoes_horas_extras_regras_servidor_autorizado_id_idx" ON "autorizacoes_horas_extras_regras"("servidor_autorizado_id");
CREATE INDEX "autorizacoes_horas_extras_regras_data_idx" ON "autorizacoes_horas_extras_regras"("data");
CREATE INDEX "autorizacoes_horas_extras_regras_tipo_dia_idx" ON "autorizacoes_horas_extras_regras"("tipo_dia");

CREATE INDEX "horas_extras_execucoes_intervalos_servidor_autorizado_id_idx" ON "horas_extras_execucoes_intervalos"("servidor_autorizado_id");
CREATE INDEX "horas_extras_execucoes_intervalos_marcacao_origem_id_idx" ON "horas_extras_execucoes_intervalos"("marcacao_origem_id");
CREATE INDEX "horas_extras_execucoes_intervalos_data_idx" ON "horas_extras_execucoes_intervalos"("data");

CREATE INDEX "horas_extras_classificacoes_intervalos_servidor_autorizado_id_idx" ON "horas_extras_classificacoes_intervalos"("servidor_autorizado_id");
CREATE INDEX "horas_extras_classificacoes_intervalos_execucao_intervalo_id_idx" ON "horas_extras_classificacoes_intervalos"("execucao_intervalo_id");
CREATE INDEX "horas_extras_classificacoes_intervalos_decisao_gestor_usuario_id_idx" ON "horas_extras_classificacoes_intervalos"("decisao_gestor_usuario_id");
CREATE INDEX "horas_extras_classificacoes_intervalos_data_idx" ON "horas_extras_classificacoes_intervalos"("data");
CREATE INDEX "horas_extras_classificacoes_intervalos_categoria_idx" ON "horas_extras_classificacoes_intervalos"("categoria");

CREATE INDEX "horas_extras_atestos_autorizacao_id_idx" ON "horas_extras_atestos"("autorizacao_id");
CREATE INDEX "horas_extras_atestos_gestor_usuario_id_idx" ON "horas_extras_atestos"("gestor_usuario_id");
CREATE INDEX "horas_extras_atestos_emitido_em_idx" ON "horas_extras_atestos"("emitido_em");

CREATE INDEX "horas_extras_eventos_autorizacao_id_idx" ON "horas_extras_eventos"("autorizacao_id");
CREATE INDEX "horas_extras_eventos_servidor_autorizado_id_idx" ON "horas_extras_eventos"("servidor_autorizado_id");
CREATE INDEX "horas_extras_eventos_usuario_id_idx" ON "horas_extras_eventos"("usuario_id");
CREATE INDEX "horas_extras_eventos_acao_idx" ON "horas_extras_eventos"("acao");
CREATE INDEX "horas_extras_eventos_criado_em_idx" ON "horas_extras_eventos"("criado_em");

ALTER TABLE "autorizacoes_horas_extras"
  ADD CONSTRAINT "autorizacoes_horas_extras_orgao_id_fkey" FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "autorizacoes_horas_extras_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "autorizacoes_horas_extras_registrada_por_usuario_id_fkey" FOREIGN KEY ("registrada_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "autorizacoes_horas_extras_servidores"
  ADD CONSTRAINT "autorizacoes_horas_extras_servidores_autorizacao_id_fkey" FOREIGN KEY ("autorizacao_id") REFERENCES "autorizacoes_horas_extras"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "autorizacoes_horas_extras_servidores_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "autorizacoes_horas_extras_servidores_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "autorizacoes_horas_extras_regras"
  ADD CONSTRAINT "autorizacoes_horas_extras_regras_servidor_autorizado_id_fkey" FOREIGN KEY ("servidor_autorizado_id") REFERENCES "autorizacoes_horas_extras_servidores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "horas_extras_execucoes_intervalos"
  ADD CONSTRAINT "horas_extras_execucoes_intervalos_servidor_autorizado_id_fkey" FOREIGN KEY ("servidor_autorizado_id") REFERENCES "autorizacoes_horas_extras_servidores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "horas_extras_classificacoes_intervalos"
  ADD CONSTRAINT "horas_extras_classificacoes_intervalos_servidor_autorizado_id_fkey" FOREIGN KEY ("servidor_autorizado_id") REFERENCES "autorizacoes_horas_extras_servidores"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "horas_extras_classificacoes_intervalos_execucao_intervalo_id_fkey" FOREIGN KEY ("execucao_intervalo_id") REFERENCES "horas_extras_execucoes_intervalos"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "horas_extras_classificacoes_intervalos_decisao_gestor_usuario_id_fkey" FOREIGN KEY ("decisao_gestor_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "horas_extras_atestos"
  ADD CONSTRAINT "horas_extras_atestos_autorizacao_id_fkey" FOREIGN KEY ("autorizacao_id") REFERENCES "autorizacoes_horas_extras"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "horas_extras_atestos_gestor_usuario_id_fkey" FOREIGN KEY ("gestor_usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "horas_extras_eventos"
  ADD CONSTRAINT "horas_extras_eventos_autorizacao_id_fkey" FOREIGN KEY ("autorizacao_id") REFERENCES "autorizacoes_horas_extras"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "horas_extras_eventos_servidor_autorizado_id_fkey" FOREIGN KEY ("servidor_autorizado_id") REFERENCES "autorizacoes_horas_extras_servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "horas_extras_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
