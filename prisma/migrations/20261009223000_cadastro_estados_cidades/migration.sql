CREATE TABLE "estados" (
  "id" INTEGER NOT NULL,
  "sigla" CHAR(2) NOT NULL,
  "nome" VARCHAR(80) NOT NULL,
  "regiao_id" INTEGER,
  "regiao_sigla" VARCHAR(2),
  "regiao_nome" VARCHAR(40),
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "estados_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cidades" (
  "id" INTEGER NOT NULL,
  "estado_id" INTEGER NOT NULL,
  "nome" VARCHAR(120) NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cidades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "estados_sigla_key" ON "estados"("sigla");
CREATE INDEX "estados_nome_idx" ON "estados"("nome");
CREATE INDEX "estados_ativo_idx" ON "estados"("ativo");
CREATE INDEX "cidades_estado_id_nome_idx" ON "cidades"("estado_id", "nome");
CREATE INDEX "cidades_ativo_idx" ON "cidades"("ativo");

ALTER TABLE "cidades"
ADD CONSTRAINT "cidades_estado_id_fkey"
FOREIGN KEY ("estado_id") REFERENCES "estados"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissoes" ("id", "codigo", "recurso", "acao", "escopo", "descricao")
VALUES
  (gen_random_uuid(), 'localidade:consultar:seccional', 'localidade', 'consultar', 'seccional', 'Consultar estados e cidades.'),
  (gen_random_uuid(), 'localidade:cadastrar:seccional', 'localidade', 'cadastrar', 'seccional', 'Manter estados e cidades.'),
  (gen_random_uuid(), 'localidade:cadastrar:master', 'localidade', 'cadastrar', 'master', 'Manter e sincronizar estados e cidades em âmbito master.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "perfis_permissoes" ("id", "perfil_id", "permissao_id")
SELECT gen_random_uuid(), existente."perfil_id", nova."id"
FROM "perfis_permissoes" existente
JOIN "permissoes" atual ON atual."id" = existente."permissao_id"
JOIN "permissoes" nova ON nova."codigo" = 'localidade:cadastrar:master'
WHERE atual."codigo" = 'configuracoes:gerenciar:global'
ON CONFLICT ("perfil_id", "permissao_id") DO NOTHING;

INSERT INTO "perfis_permissoes" ("id", "perfil_id", "permissao_id")
SELECT gen_random_uuid(), existente."perfil_id", nova."id"
FROM "perfis_permissoes" existente
JOIN "permissoes" atual ON atual."id" = existente."permissao_id"
JOIN "permissoes" nova ON nova."codigo" = 'localidade:cadastrar:seccional'
WHERE atual."codigo" = 'configuracoes:gerenciar:seccional'
ON CONFLICT ("perfil_id", "permissao_id") DO NOTHING;

INSERT INTO "perfis_permissoes" ("id", "perfil_id", "permissao_id")
SELECT gen_random_uuid(), pp."perfil_id", consulta."id"
FROM "perfis_permissoes" pp
JOIN "permissoes" cadastro ON cadastro."id" = pp."permissao_id"
JOIN "permissoes" consulta ON consulta."codigo" = 'localidade:consultar:seccional'
WHERE cadastro."codigo" IN ('localidade:cadastrar:master', 'localidade:cadastrar:seccional')
ON CONFLICT ("perfil_id", "permissao_id") DO NOTHING;
