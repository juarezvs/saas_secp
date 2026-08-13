CREATE TABLE "marcacoes_faciais_evidencias" (
    "id" UUID NOT NULL,
    "marcacao_id" UUID NOT NULL,
    "content_type" VARCHAR(80) NOT NULL DEFAULT 'image/jpeg',
    "imagem" BYTEA NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "hash_sha256" VARCHAR(64) NOT NULL,
    "autorizacao_biometrica_id" UUID,
    "amostra_biometrica_id" UUID,
    "qualidade" DOUBLE PRECISION,
    "similaridade" DOUBLE PRECISION,
    "distancia" DOUBLE PRECISION,
    "metadados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marcacoes_faciais_evidencias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marcacoes_faciais_evidencias_marcacao_id_key" ON "marcacoes_faciais_evidencias"("marcacao_id");
CREATE INDEX "marcacoes_faciais_evidencias_marcacao_id_idx" ON "marcacoes_faciais_evidencias"("marcacao_id");
CREATE INDEX "marcacoes_faciais_evidencias_criado_em_idx" ON "marcacoes_faciais_evidencias"("criado_em");

ALTER TABLE "marcacoes_faciais_evidencias"
ADD CONSTRAINT "marcacoes_faciais_evidencias_marcacao_id_fkey"
FOREIGN KEY ("marcacao_id") REFERENCES "marcacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
