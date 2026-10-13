ALTER TABLE "mct_politicas_versoes"
ADD COLUMN "origem" VARCHAR(20) NOT NULL DEFAULT 'SECP';

ALTER TABLE "mct_rubricas_versoes"
ADD COLUMN "origem" VARCHAR(20) NOT NULL DEFAULT 'SECP';

CREATE TABLE "mct_regras_versoes" (
  "id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "politica_versao_id" UUID NOT NULL,
  "codigo" VARCHAR(80) NOT NULL,
  "nome" VARCHAR(160) NOT NULL,
  "descricao" TEXT,
  "versao" INTEGER NOT NULL,
  "prioridade" INTEGER NOT NULL DEFAULT 100,
  "estado" "MctEstadoPublicacao" NOT NULL DEFAULT 'RASCUNHO',
  "condicao" JSONB NOT NULL,
  "origem" VARCHAR(20) NOT NULL DEFAULT 'SECP',
  "vigencia_inicio" DATE NOT NULL,
  "vigencia_fim" DATE,
  "fundamento_normativo" TEXT,
  "hash_conteudo" VARCHAR(64) NOT NULL,
  "criada_por_usuario_id" UUID,
  "publicada_por_usuario_id" UUID,
  "publicada_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mct_regras_versoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mct_regras_versoes_politica_versao_id_fkey"
    FOREIGN KEY ("politica_versao_id") REFERENCES "mct_politicas_versoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "mct_regras_efeitos" (
  "id" UUID NOT NULL,
  "regra_versao_id" UUID NOT NULL,
  "rubrica_versao_id" UUID NOT NULL,
  "escopo_temporal" VARCHAR(80) NOT NULL,
  "estrategia" VARCHAR(20) NOT NULL,
  "quantidade_minutos" INTEGER,
  "campo_quantidade" VARCHAR(80),
  CONSTRAINT "mct_regras_efeitos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mct_regras_efeitos_regra_versao_id_fkey"
    FOREIGN KEY ("regra_versao_id") REFERENCES "mct_regras_versoes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mct_regras_efeitos_rubrica_versao_id_fkey"
    FOREIGN KEY ("rubrica_versao_id") REFERENCES "mct_rubricas_versoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mct_regras_efeitos_quantidade_check"
    CHECK (("estrategia" = 'CONSTANTE' AND "quantidade_minutos" IS NOT NULL AND "campo_quantidade" IS NULL)
      OR ("estrategia" = 'CAMPO' AND "campo_quantidade" IS NOT NULL AND "quantidade_minutos" IS NULL))
);

CREATE UNIQUE INDEX "mct_regras_versoes_orgao_id_codigo_versao_key"
ON "mct_regras_versoes"("orgao_id", "codigo", "versao");
CREATE INDEX "mct_regras_versoes_orgao_id_estado_idx"
ON "mct_regras_versoes"("orgao_id", "estado");
CREATE INDEX "mct_regras_versoes_politica_versao_id_idx"
ON "mct_regras_versoes"("politica_versao_id");
CREATE INDEX "mct_regras_versoes_vigencia_inicio_vigencia_fim_idx"
ON "mct_regras_versoes"("vigencia_inicio", "vigencia_fim");
CREATE UNIQUE INDEX "mct_regras_efeitos_regra_rubrica_escopo_key"
ON "mct_regras_efeitos"("regra_versao_id", "rubrica_versao_id", "escopo_temporal");
CREATE INDEX "mct_regras_efeitos_rubrica_versao_id_idx"
ON "mct_regras_efeitos"("rubrica_versao_id");

-- Permissões são incluídas pela migração para atualizar instalações existentes.
INSERT INTO "permissoes" ("id", "codigo", "recurso", "acao", "escopo", "descricao", "criado_em")
SELECT gen_random_uuid(), recurso || ':' || acao || ':' || escopo, recurso, acao, escopo,
       CASE acao WHEN 'consultar' THEN 'Consultar ' ELSE 'Gerenciar ' END || descricao, CURRENT_TIMESTAMP
FROM (VALUES
  ('mct-rubricas', 'rubricas do MCT'),
  ('mct-politicas', 'políticas do MCT'),
  ('mct-regras', 'regras do MCT')
) AS recursos(recurso, descricao)
CROSS JOIN (VALUES ('consultar'), ('gerenciar')) AS acoes(acao)
CROSS JOIN (VALUES ('seccional'), ('global')) AS escopos(escopo)
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "perfis_permissoes" ("id", "perfil_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), perfil.id, permissao.id, CURRENT_TIMESTAMP
FROM "perfis" perfil
JOIN "permissoes" permissao ON
  (perfil."codigo" = 'MASTER' AND permissao."codigo" LIKE 'mct-%:%:global') OR
  (perfil."codigo" = 'ADMIN' AND permissao."codigo" LIKE 'mct-%:%:seccional')
ON CONFLICT ("perfil_id", "permissao_id") DO NOTHING;
