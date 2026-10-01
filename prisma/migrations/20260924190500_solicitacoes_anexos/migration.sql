CREATE TABLE "solicitacoes_anexos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "criado_por_usuario_id" UUID NOT NULL,
    "descricao" VARCHAR(240) NOT NULL,
    "nome_original" VARCHAR(255) NOT NULL,
    "nome_arquivo" VARCHAR(255) NOT NULL,
    "caminho_arquivo" TEXT NOT NULL,
    "content_type" VARCHAR(120) NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "hash_sha256" VARCHAR(64) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacoes_anexos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "solicitacoes_anexos_solicitacao_id_idx" ON "solicitacoes_anexos"("solicitacao_id");
CREATE INDEX "solicitacoes_anexos_criado_por_usuario_id_idx" ON "solicitacoes_anexos"("criado_por_usuario_id");

ALTER TABLE "solicitacoes_anexos"
ADD CONSTRAINT "solicitacoes_anexos_solicitacao_id_fkey"
FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
