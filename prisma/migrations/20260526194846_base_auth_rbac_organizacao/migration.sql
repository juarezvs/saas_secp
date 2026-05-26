-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('SERVIDOR', 'PESSOA_EXTERNA', 'SISTEMA');

-- CreateEnum
CREATE TYPE "StatusRegistro" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "TipoUnidadeOrganizacional" AS ENUM ('ORGAO', 'SECAO_JUDICIARIA', 'SUBSECAO_JUDICIARIA', 'UNIDADE_AVANCADA_ATENDIMENTO', 'NUCLEO', 'SECAO', 'SECRETARIA', 'VARA', 'GABINETE', 'TURMA_RECURSAL', 'CENTRO_CONCILIACAO', 'DEPARTAMENTO', 'SUBDEPARTAMENTO', 'OUTRA');

-- CreateEnum
CREATE TYPE "TipoVinculoServidor" AS ENUM ('EFETIVO', 'CEDIDO', 'REQUISITADO', 'REDISTRIBUIDO', 'REMOVIDO', 'EXERCICIO_PROVISORIO');

-- CreateEnum
CREATE TYPE "TipoLotacao" AS ENUM ('TITULAR', 'PROVISORIA', 'SUBSTITUICAO');

-- CreateEnum
CREATE TYPE "PapelGestao" AS ENUM ('GESTOR_TITULAR', 'GESTOR_SUBSTITUTO', 'DELEGADO_CHEFIA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "matricula" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "email" VARCHAR(200),
    "senha_hash" VARCHAR(255),
    "tipo" "TipoUsuario" NOT NULL DEFAULT 'SERVIDOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(80) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissoes" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(160) NOT NULL,
    "recurso" VARCHAR(80) NOT NULL,
    "acao" VARCHAR(80) NOT NULL,
    "escopo" VARCHAR(80) NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_perfis" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_perfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis_permissoes" (
    "id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "permissao_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfis_permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orgaos" (
    "id" UUID NOT NULL,
    "sigla" VARCHAR(30) NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orgaos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_organizacionais" (
    "id" UUID NOT NULL,
    "orgao_id" UUID NOT NULL,
    "unidade_pai_id" UUID,
    "codigo" VARCHAR(80) NOT NULL,
    "sigla" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(250) NOT NULL,
    "tipo" "TipoUnidadeOrganizacional" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_organizacionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servidores" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "orgao_id" UUID NOT NULL,
    "matricula" VARCHAR(50) NOT NULL,
    "nome_funcional" VARCHAR(200),
    "vinculo" "TipoVinculoServidor" NOT NULL DEFAULT 'EFETIVO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servidores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotacoes" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "unidade_id" UUID NOT NULL,
    "tipo" "TipoLotacao" NOT NULL DEFAULT 'TITULAR',
    "status" "StatusRegistro" NOT NULL DEFAULT 'ATIVO',
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gestores_unidades" (
    "id" UUID NOT NULL,
    "unidade_id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "papel" "PapelGestao" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gestores_unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_eventos" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "entidade" VARCHAR(120) NOT NULL,
    "entidade_id" VARCHAR(120),
    "acao" VARCHAR(120) NOT NULL,
    "dados_antes" JSONB,
    "dados_depois" JSONB,
    "metadados" JSONB,
    "ip" VARCHAR(80),
    "user_agent" TEXT,
    "hash_anterior" VARCHAR(128),
    "hash_atual" VARCHAR(128),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_matricula_key" ON "usuarios"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_codigo_key" ON "perfis"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_codigo_key" ON "permissoes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_recurso_acao_escopo_key" ON "permissoes"("recurso", "acao", "escopo");

-- CreateIndex
CREATE INDEX "usuarios_perfis_usuario_id_idx" ON "usuarios_perfis"("usuario_id");

-- CreateIndex
CREATE INDEX "usuarios_perfis_perfil_id_idx" ON "usuarios_perfis"("perfil_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_perfis_usuario_id_perfil_id_key" ON "usuarios_perfis"("usuario_id", "perfil_id");

-- CreateIndex
CREATE INDEX "perfis_permissoes_perfil_id_idx" ON "perfis_permissoes"("perfil_id");

-- CreateIndex
CREATE INDEX "perfis_permissoes_permissao_id_idx" ON "perfis_permissoes"("permissao_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_permissoes_perfil_id_permissao_id_key" ON "perfis_permissoes"("perfil_id", "permissao_id");

-- CreateIndex
CREATE UNIQUE INDEX "orgaos_sigla_key" ON "orgaos"("sigla");

-- CreateIndex
CREATE INDEX "unidades_organizacionais_orgao_id_idx" ON "unidades_organizacionais"("orgao_id");

-- CreateIndex
CREATE INDEX "unidades_organizacionais_unidade_pai_id_idx" ON "unidades_organizacionais"("unidade_pai_id");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_organizacionais_orgao_id_codigo_key" ON "unidades_organizacionais"("orgao_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "servidores_usuario_id_key" ON "servidores"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "servidores_matricula_key" ON "servidores"("matricula");

-- CreateIndex
CREATE INDEX "servidores_orgao_id_idx" ON "servidores"("orgao_id");

-- CreateIndex
CREATE INDEX "lotacoes_servidor_id_idx" ON "lotacoes"("servidor_id");

-- CreateIndex
CREATE INDEX "lotacoes_unidade_id_idx" ON "lotacoes"("unidade_id");

-- CreateIndex
CREATE INDEX "lotacoes_status_idx" ON "lotacoes"("status");

-- CreateIndex
CREATE INDEX "gestores_unidades_unidade_id_idx" ON "gestores_unidades"("unidade_id");

-- CreateIndex
CREATE INDEX "gestores_unidades_servidor_id_idx" ON "gestores_unidades"("servidor_id");

-- CreateIndex
CREATE INDEX "gestores_unidades_papel_idx" ON "gestores_unidades"("papel");

-- CreateIndex
CREATE INDEX "auditoria_eventos_usuario_id_idx" ON "auditoria_eventos"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_eventos_entidade_idx" ON "auditoria_eventos"("entidade");

-- CreateIndex
CREATE INDEX "auditoria_eventos_entidade_id_idx" ON "auditoria_eventos"("entidade_id");

-- CreateIndex
CREATE INDEX "auditoria_eventos_acao_idx" ON "auditoria_eventos"("acao");

-- CreateIndex
CREATE INDEX "auditoria_eventos_criado_em_idx" ON "auditoria_eventos"("criado_em");

-- AddForeignKey
ALTER TABLE "usuarios_perfis" ADD CONSTRAINT "usuarios_perfis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_perfis" ADD CONSTRAINT "usuarios_perfis_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis_permissoes" ADD CONSTRAINT "perfis_permissoes_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis_permissoes" ADD CONSTRAINT "perfis_permissoes_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_organizacionais" ADD CONSTRAINT "unidades_organizacionais_orgao_id_fkey" FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_organizacionais" ADD CONSTRAINT "unidades_organizacionais_unidade_pai_id_fkey" FOREIGN KEY ("unidade_pai_id") REFERENCES "unidades_organizacionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servidores" ADD CONSTRAINT "servidores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servidores" ADD CONSTRAINT "servidores_orgao_id_fkey" FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotacoes" ADD CONSTRAINT "lotacoes_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotacoes" ADD CONSTRAINT "lotacoes_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gestores_unidades" ADD CONSTRAINT "gestores_unidades_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gestores_unidades" ADD CONSTRAINT "gestores_unidades_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_eventos" ADD CONSTRAINT "auditoria_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
