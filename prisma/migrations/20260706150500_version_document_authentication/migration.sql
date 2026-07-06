-- DropIndex
DROP INDEX IF EXISTS "documentos_autenticacao_tipo_documento_entidade_entidade_id_key";

-- CreateIndex
CREATE INDEX "documentos_autenticacao_tipo_entidade_competencia_idx" ON "documentos_autenticacao"("tipo_documento", "entidade", "entidade_id", "competencia");

-- CreateIndex
CREATE INDEX "documentos_autenticacao_hash_documento_idx" ON "documentos_autenticacao"("hash_documento");
