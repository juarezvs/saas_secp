-- CreateTable
CREATE TABLE "documentos_autenticacao" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "crc" VARCHAR(12) NOT NULL,
    "tipo_documento" VARCHAR(80) NOT NULL,
    "entidade" VARCHAR(120) NOT NULL,
    "entidade_id" VARCHAR(120) NOT NULL,
    "titulo" VARCHAR(220) NOT NULL,
    "competencia" VARCHAR(20),
    "orgao" VARCHAR(120),
    "unidade" VARCHAR(180),
    "servidor_nome" VARCHAR(200),
    "servidor_matricula" VARCHAR(50),
    "hash_documento" VARCHAR(128) NOT NULL,
    "dados_resumo" JSONB,
    "assinaturas" JSONB,
    "criado_por_usuario_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_autenticacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documentos_autenticacao_codigo_key" ON "documentos_autenticacao"("codigo");

-- CreateIndex
CREATE INDEX "documentos_autenticacao_codigo_idx" ON "documentos_autenticacao"("codigo");

-- CreateIndex
CREATE INDEX "documentos_autenticacao_crc_idx" ON "documentos_autenticacao"("crc");

-- CreateIndex
CREATE INDEX "documentos_autenticacao_tipo_documento_idx" ON "documentos_autenticacao"("tipo_documento");

-- CreateIndex
CREATE INDEX "documentos_autenticacao_entidade_entidade_id_idx" ON "documentos_autenticacao"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "documentos_autenticacao_criado_em_idx" ON "documentos_autenticacao"("criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_autenticacao_tipo_documento_entidade_entidade_id_key" ON "documentos_autenticacao"("tipo_documento", "entidade", "entidade_id", "competencia");

-- AddForeignKey
ALTER TABLE "documentos_autenticacao" ADD CONSTRAINT "documentos_autenticacao_criado_por_usuario_id_fkey" FOREIGN KEY ("criado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
