ALTER TYPE "TipoSolicitacao" ADD VALUE IF NOT EXISTS 'EXCLUSAO_MARCACAO';

CREATE TABLE IF NOT EXISTS "mct_naturezas_rubricas" (
  "id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "codigo" VARCHAR(80) NOT NULL,
  "nome" VARCHAR(160) NOT NULL,
  "descricao" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "origem" VARCHAR(20) NOT NULL DEFAULT 'SECP',
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mct_naturezas_rubricas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mct_naturezas_rubricas_orgao_id_fkey" FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "mct_naturezas_rubricas_orgao_id_codigo_key" ON "mct_naturezas_rubricas"("orgao_id", "codigo");
CREATE INDEX IF NOT EXISTS "mct_naturezas_rubricas_orgao_id_ativo_idx" ON "mct_naturezas_rubricas"("orgao_id", "ativo");

INSERT INTO "mct_naturezas_rubricas" ("id", "orgao_id", "codigo", "nome", "descricao", "origem", "atualizado_em")
SELECT gen_random_uuid(), r."orgao_id", r."natureza", initcap(replace(r."natureza", '_', ' ')),
       'Natureza carregada a partir do catÃ¡logo inicial de rubricas MCT.', 'SECP', CURRENT_TIMESTAMP
FROM "mct_rubricas_versoes" r
WHERE r."orgao_id" IS NOT NULL
GROUP BY r."orgao_id", r."natureza"
ON CONFLICT ("orgao_id", "codigo") DO NOTHING;
