CREATE TABLE "categorias_pessoas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orgao_id" UUID,
  "codigo" VARCHAR(80) NOT NULL,
  "nome" VARCHAR(120) NOT NULL,
  "descricao" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "sistema" BOOLEAN NOT NULL DEFAULT false,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "categorias_pessoas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categorias_pessoas_codigo_key" ON "categorias_pessoas"("codigo");
CREATE INDEX "categorias_pessoas_orgao_id_idx" ON "categorias_pessoas"("orgao_id");
CREATE INDEX "categorias_pessoas_ativo_idx" ON "categorias_pessoas"("ativo");

ALTER TABLE "categorias_pessoas"
  ADD CONSTRAINT "categorias_pessoas_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "servidores" ADD COLUMN "categoria_pessoa_id" UUID;
CREATE INDEX "servidores_categoria_pessoa_id_idx" ON "servidores"("categoria_pessoa_id");

ALTER TABLE "servidores"
  ADD CONSTRAINT "servidores_categoria_pessoa_id_fkey"
  FOREIGN KEY ("categoria_pessoa_id") REFERENCES "categorias_pessoas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "identificadores_ponto_servidores" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "servidor_id" UUID NOT NULL,
  "valor" VARCHAR(80) NOT NULL,
  "valor_normalizado" VARCHAR(80) NOT NULL,
  "principal" BOOLEAN NOT NULL DEFAULT false,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "identificadores_ponto_servidores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "identificadores_ponto_servidores_valor_normalizado_key" ON "identificadores_ponto_servidores"("valor_normalizado");
CREATE INDEX "identificadores_ponto_servidores_servidor_id_idx" ON "identificadores_ponto_servidores"("servidor_id");
CREATE INDEX "identificadores_ponto_servidores_ativo_idx" ON "identificadores_ponto_servidores"("ativo");

ALTER TABLE "identificadores_ponto_servidores"
  ADD CONSTRAINT "identificadores_ponto_servidores_servidor_id_fkey"
  FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "categorias_pessoas" ("codigo", "nome", "descricao", "sistema")
VALUES
  ('SERVIDOR', 'Servidor', 'Categoria padrao para servidores.', true),
  ('ESTAGIARIO', 'Estagiario', 'Categoria padrao para estagiarios.', true),
  ('VOLUNTARIO', 'Voluntario', 'Categoria padrao para voluntarios.', true),
  ('PRESTADOR', 'Prestador', 'Categoria padrao para prestadores.', true)
ON CONFLICT ("codigo") DO NOTHING;

UPDATE "servidores" s
SET "categoria_pessoa_id" = c."id"
FROM "usuarios" u
JOIN "categorias_pessoas" c ON c."orgao_id" IS NULL AND c."codigo" = u."tipo"::text
WHERE s."usuario_id" = u."id"
  AND s."categoria_pessoa_id" IS NULL
  AND u."tipo"::text IN ('SERVIDOR', 'ESTAGIARIO', 'VOLUNTARIO', 'PRESTADOR');

INSERT INTO "identificadores_ponto_servidores" ("servidor_id", "valor", "valor_normalizado", "principal")
SELECT s."id", s."matricula", upper(regexp_replace(btrim(s."matricula"), '[^[:alnum:]]', '', 'g')), true
FROM "servidores" s
WHERE btrim(s."matricula") <> ''
ON CONFLICT ("valor_normalizado") DO NOTHING;
