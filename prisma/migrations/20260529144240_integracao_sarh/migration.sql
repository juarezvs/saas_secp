/*
  Warnings:

  - A unique constraint covering the columns `[codigo_externo_sarh]` on the table `orgaos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orgao_id,codigo_externo_sarh]` on the table `unidades_organizacionais` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TipoExecucaoIntegracaoSarh" AS ENUM ('CARGA_INICIAL', 'SINCRONIZACAO_COMPLETA', 'SINCRONIZACAO_INCREMENTAL', 'REPROCESSAMENTO', 'SIMULACAO');

-- CreateEnum
CREATE TYPE "StatusExecucaoIntegracaoSarh" AS ENUM ('AGENDADA', 'EM_EXECUCAO', 'CONCLUIDA', 'CONCLUIDA_COM_ERROS', 'FALHOU', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoEndpointSarh" AS ENUM ('EMPRESAS', 'LOTACOES', 'CARGOS', 'SERVIDORES', 'LOTACOES_SERVIDORES');

-- CreateEnum
CREATE TYPE "TipoRegistroSarh" AS ENUM ('EMPRESA', 'LOTACAO', 'CARGO', 'SERVIDOR', 'LOTACAO_SERVIDOR');

-- CreateEnum
CREATE TYPE "OperacaoRegistroSarh" AS ENUM ('CRIAR', 'ATUALIZAR', 'INATIVAR', 'IGNORAR', 'CONFLITO', 'ERRO');

-- CreateEnum
CREATE TYPE "StatusRegistroIntegracaoSarh" AS ENUM ('PENDENTE', 'PROCESSADO', 'IGNORADO', 'ERRO', 'CONFLITO');

-- CreateEnum
CREATE TYPE "StatusConflitoSarh" AS ENUM ('PENDENTE', 'RESOLVIDO_APLICAR_SARH', 'RESOLVIDO_MANTER_SECP', 'IGNORADO');

-- AlterTable
ALTER TABLE "lotacoes" ADD COLUMN     "cargo_id" UUID,
ADD COLUMN     "codigo_cargo_sarh" INTEGER,
ADD COLUMN     "codigo_lotacao_sarh" INTEGER,
ADD COLUMN     "origem_sarh" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payload_sarh" JSONB,
ADD COLUMN     "sincronizado_sarh_em" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orgaos" ADD COLUMN     "codigo_externo_sarh" INTEGER,
ADD COLUMN     "data_fim_sarh" DATE,
ADD COLUMN     "data_inicio_sarh" DATE,
ADD COLUMN     "payload_sarh" JSONB,
ADD COLUMN     "ultima_sincronizacao_sarh" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "servidores" ADD COLUMN     "cargo_id" UUID,
ADD COLUMN     "codigo_lotacao_pai_sarh" INTEGER,
ADD COLUMN     "codigo_lotacao_sarh" INTEGER,
ADD COLUMN     "data_nascimento" DATE,
ADD COLUMN     "nome_completo_sarh" VARCHAR(200),
ADD COLUMN     "nome_social_sarh" VARCHAR(200),
ADD COLUMN     "origem_sarh" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payload_sarh" JSONB,
ADD COLUMN     "ultima_sincronizacao_sarh" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "unidades_organizacionais" ADD COLUMN     "categoria_sarh" VARCHAR(120),
ADD COLUMN     "codigo_externo_pai_sarh" INTEGER,
ADD COLUMN     "codigo_externo_sarh" INTEGER,
ADD COLUMN     "data_fim_sarh" DATE,
ADD COLUMN     "data_inicio_sarh" DATE,
ADD COLUMN     "email_sarh" VARCHAR(200),
ADD COLUMN     "origem_sarh" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payload_sarh" JSONB,
ADD COLUMN     "tipo_sarh_id" INTEGER,
ADD COLUMN     "tipo_sarh_nome" VARCHAR(120),
ADD COLUMN     "ultima_sincronizacao_sarh" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "cargos" (
    "id" UUID NOT NULL,
    "codigo_externo_sarh" INTEGER NOT NULL,
    "descricao" VARCHAR(250) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "origem_sarh" BOOLEAN NOT NULL DEFAULT true,
    "payload_sarh" JSONB,
    "ultima_sincronizacao_sarh" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapeamentos_externos" (
    "id" UUID NOT NULL,
    "integracao_id" UUID,
    "sistema" "TipoIntegracao" NOT NULL,
    "tipo_registro" "TipoRegistroSarh" NOT NULL,
    "codigo_externo" VARCHAR(120) NOT NULL,
    "entidade_interna" VARCHAR(120) NOT NULL,
    "entidade_interna_id" VARCHAR(120) NOT NULL,
    "hash_atual" VARCHAR(128),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "metadados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mapeamentos_externos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracoes_sarh_execucoes" (
    "id" UUID NOT NULL,
    "integracao_id" UUID NOT NULL,
    "iniciado_por_usuario_id" UUID,
    "tipo" "TipoExecucaoIntegracaoSarh" NOT NULL,
    "status" "StatusExecucaoIntegracaoSarh" NOT NULL DEFAULT 'AGENDADA',
    "modo_simulacao" BOOLEAN NOT NULL DEFAULT false,
    "total_recebidos" INTEGER NOT NULL DEFAULT 0,
    "total_criados" INTEGER NOT NULL DEFAULT 0,
    "total_atualizados" INTEGER NOT NULL DEFAULT 0,
    "total_inativados" INTEGER NOT NULL DEFAULT 0,
    "total_ignorados" INTEGER NOT NULL DEFAULT 0,
    "total_erros" INTEGER NOT NULL DEFAULT 0,
    "total_conflitos" INTEGER NOT NULL DEFAULT 0,
    "mensagem_erro" TEXT,
    "metadados" JSONB,
    "iniciado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizado_em" TIMESTAMP(3),
    "duracao_ms" INTEGER,

    CONSTRAINT "integracoes_sarh_execucoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_brutos_sarh" (
    "id" UUID NOT NULL,
    "execucao_id" UUID NOT NULL,
    "endpoint" "TipoEndpointSarh" NOT NULL,
    "tipo_registro" "TipoRegistroSarh" NOT NULL,
    "chave_externa" VARCHAR(120) NOT NULL,
    "hash_registro" VARCHAR(128) NOT NULL,
    "payload" JSONB NOT NULL,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_brutos_sarh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracoes_sarh_itens" (
    "id" UUID NOT NULL,
    "execucao_id" UUID NOT NULL,
    "registro_bruto_id" UUID,
    "endpoint" "TipoEndpointSarh" NOT NULL,
    "tipo_registro" "TipoRegistroSarh" NOT NULL,
    "chave_externa" VARCHAR(120) NOT NULL,
    "operacao" "OperacaoRegistroSarh" NOT NULL,
    "status" "StatusRegistroIntegracaoSarh" NOT NULL DEFAULT 'PENDENTE',
    "entidade_interna" VARCHAR(120),
    "entidade_interna_id" VARCHAR(120),
    "mensagem" TEXT,
    "erro" TEXT,
    "dados_antes" JSONB,
    "dados_depois" JSONB,
    "metadados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integracoes_sarh_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracoes_sarh_conflitos" (
    "id" UUID NOT NULL,
    "execucao_id" UUID NOT NULL,
    "tipo_registro" "TipoRegistroSarh" NOT NULL,
    "chave_externa" VARCHAR(120) NOT NULL,
    "entidade_interna" VARCHAR(120),
    "entidade_interna_id" VARCHAR(120),
    "campo" VARCHAR(120) NOT NULL,
    "valor_sarh" JSONB,
    "valor_secp" JSONB,
    "status" "StatusConflitoSarh" NOT NULL DEFAULT 'PENDENTE',
    "resolvido_por_usuario_id" UUID,
    "resolvido_em" TIMESTAMP(3),
    "justificativa_resolucao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integracoes_sarh_conflitos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cargos_codigo_externo_sarh_key" ON "cargos"("codigo_externo_sarh");

-- CreateIndex
CREATE INDEX "cargos_ativo_idx" ON "cargos"("ativo");

-- CreateIndex
CREATE INDEX "cargos_origem_sarh_idx" ON "cargos"("origem_sarh");

-- CreateIndex
CREATE INDEX "mapeamentos_externos_integracao_id_idx" ON "mapeamentos_externos"("integracao_id");

-- CreateIndex
CREATE INDEX "mapeamentos_externos_entidade_interna_entidade_interna_id_idx" ON "mapeamentos_externos"("entidade_interna", "entidade_interna_id");

-- CreateIndex
CREATE INDEX "mapeamentos_externos_ativo_idx" ON "mapeamentos_externos"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "mapeamentos_externos_sistema_tipo_registro_codigo_externo_key" ON "mapeamentos_externos"("sistema", "tipo_registro", "codigo_externo");

-- CreateIndex
CREATE INDEX "integracoes_sarh_execucoes_integracao_id_idx" ON "integracoes_sarh_execucoes"("integracao_id");

-- CreateIndex
CREATE INDEX "integracoes_sarh_execucoes_iniciado_por_usuario_id_idx" ON "integracoes_sarh_execucoes"("iniciado_por_usuario_id");

-- CreateIndex
CREATE INDEX "integracoes_sarh_execucoes_tipo_idx" ON "integracoes_sarh_execucoes"("tipo");

-- CreateIndex
CREATE INDEX "integracoes_sarh_execucoes_status_idx" ON "integracoes_sarh_execucoes"("status");

-- CreateIndex
CREATE INDEX "integracoes_sarh_execucoes_iniciado_em_idx" ON "integracoes_sarh_execucoes"("iniciado_em");

-- CreateIndex
CREATE INDEX "registros_brutos_sarh_execucao_id_idx" ON "registros_brutos_sarh"("execucao_id");

-- CreateIndex
CREATE INDEX "registros_brutos_sarh_endpoint_idx" ON "registros_brutos_sarh"("endpoint");

-- CreateIndex
CREATE INDEX "registros_brutos_sarh_tipo_registro_chave_externa_idx" ON "registros_brutos_sarh"("tipo_registro", "chave_externa");

-- CreateIndex
CREATE INDEX "registros_brutos_sarh_hash_registro_idx" ON "registros_brutos_sarh"("hash_registro");

-- CreateIndex
CREATE UNIQUE INDEX "registros_brutos_sarh_tipo_registro_chave_externa_hash_regi_key" ON "registros_brutos_sarh"("tipo_registro", "chave_externa", "hash_registro");

-- CreateIndex
CREATE INDEX "integracoes_sarh_itens_execucao_id_idx" ON "integracoes_sarh_itens"("execucao_id");

-- CreateIndex
CREATE INDEX "integracoes_sarh_itens_registro_bruto_id_idx" ON "integracoes_sarh_itens"("registro_bruto_id");

-- CreateIndex
CREATE INDEX "integracoes_sarh_itens_endpoint_idx" ON "integracoes_sarh_itens"("endpoint");

-- CreateIndex
CREATE INDEX "integracoes_sarh_itens_tipo_registro_chave_externa_idx" ON "integracoes_sarh_itens"("tipo_registro", "chave_externa");

-- CreateIndex
CREATE INDEX "integracoes_sarh_itens_operacao_idx" ON "integracoes_sarh_itens"("operacao");

-- CreateIndex
CREATE INDEX "integracoes_sarh_itens_status_idx" ON "integracoes_sarh_itens"("status");

-- CreateIndex
CREATE INDEX "integracoes_sarh_conflitos_execucao_id_idx" ON "integracoes_sarh_conflitos"("execucao_id");

-- CreateIndex
CREATE INDEX "integracoes_sarh_conflitos_tipo_registro_chave_externa_idx" ON "integracoes_sarh_conflitos"("tipo_registro", "chave_externa");

-- CreateIndex
CREATE INDEX "integracoes_sarh_conflitos_entidade_interna_entidade_intern_idx" ON "integracoes_sarh_conflitos"("entidade_interna", "entidade_interna_id");

-- CreateIndex
CREATE INDEX "integracoes_sarh_conflitos_status_idx" ON "integracoes_sarh_conflitos"("status");

-- CreateIndex
CREATE INDEX "lotacoes_cargo_id_idx" ON "lotacoes"("cargo_id");

-- CreateIndex
CREATE INDEX "lotacoes_codigo_lotacao_sarh_idx" ON "lotacoes"("codigo_lotacao_sarh");

-- CreateIndex
CREATE INDEX "lotacoes_origem_sarh_idx" ON "lotacoes"("origem_sarh");

-- CreateIndex
CREATE UNIQUE INDEX "orgaos_codigo_externo_sarh_key" ON "orgaos"("codigo_externo_sarh");

-- CreateIndex
CREATE INDEX "servidores_cargo_id_idx" ON "servidores"("cargo_id");

-- CreateIndex
CREATE INDEX "servidores_codigo_lotacao_sarh_idx" ON "servidores"("codigo_lotacao_sarh");

-- CreateIndex
CREATE INDEX "servidores_origem_sarh_idx" ON "servidores"("origem_sarh");

-- CreateIndex
CREATE INDEX "unidades_organizacionais_codigo_externo_sarh_idx" ON "unidades_organizacionais"("codigo_externo_sarh");

-- CreateIndex
CREATE INDEX "unidades_organizacionais_codigo_externo_pai_sarh_idx" ON "unidades_organizacionais"("codigo_externo_pai_sarh");

-- CreateIndex
CREATE INDEX "unidades_organizacionais_origem_sarh_idx" ON "unidades_organizacionais"("origem_sarh");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_organizacionais_orgao_id_codigo_externo_sarh_key" ON "unidades_organizacionais"("orgao_id", "codigo_externo_sarh");

-- AddForeignKey
ALTER TABLE "servidores" ADD CONSTRAINT "servidores_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotacoes" ADD CONSTRAINT "lotacoes_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeamentos_externos" ADD CONSTRAINT "mapeamentos_externos_integracao_id_fkey" FOREIGN KEY ("integracao_id") REFERENCES "integracoes_sistemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoes_sarh_execucoes" ADD CONSTRAINT "integracoes_sarh_execucoes_integracao_id_fkey" FOREIGN KEY ("integracao_id") REFERENCES "integracoes_sistemas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoes_sarh_execucoes" ADD CONSTRAINT "integracoes_sarh_execucoes_iniciado_por_usuario_id_fkey" FOREIGN KEY ("iniciado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_brutos_sarh" ADD CONSTRAINT "registros_brutos_sarh_execucao_id_fkey" FOREIGN KEY ("execucao_id") REFERENCES "integracoes_sarh_execucoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoes_sarh_itens" ADD CONSTRAINT "integracoes_sarh_itens_execucao_id_fkey" FOREIGN KEY ("execucao_id") REFERENCES "integracoes_sarh_execucoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoes_sarh_itens" ADD CONSTRAINT "integracoes_sarh_itens_registro_bruto_id_fkey" FOREIGN KEY ("registro_bruto_id") REFERENCES "registros_brutos_sarh"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoes_sarh_conflitos" ADD CONSTRAINT "integracoes_sarh_conflitos_execucao_id_fkey" FOREIGN KEY ("execucao_id") REFERENCES "integracoes_sarh_execucoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoes_sarh_conflitos" ADD CONSTRAINT "integracoes_sarh_conflitos_resolvido_por_usuario_id_fkey" FOREIGN KEY ("resolvido_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
