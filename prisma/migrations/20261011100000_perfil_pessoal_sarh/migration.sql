CREATE TABLE "configuracoes_globais" (
    "id" VARCHAR(30) NOT NULL DEFAULT 'global',
    "dominios_email_institucionais" TEXT[] NOT NULL DEFAULT ARRAY['trf1.jus.br']::TEXT[],
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "configuracoes_globais_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dominios_caracteristicas_pessoais" (
    "id" UUID NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "codigo_sarh" VARCHAR(20) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "origem_sarh" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dominios_caracteristicas_pessoais_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dominios_caracteristicas_pessoais_tipo_codigo_sarh_key"
ON "dominios_caracteristicas_pessoais"("tipo", "codigo_sarh");

CREATE INDEX "dominios_caracteristicas_pessoais_tipo_ativo_ordem_idx"
ON "dominios_caracteristicas_pessoais"("tipo", "ativo", "ordem");

INSERT INTO "configuracoes_globais" ("id", "dominios_email_institucionais", "atualizado_em")
VALUES ('global', ARRAY['trf1.jus.br']::TEXT[], CURRENT_TIMESTAMP);

INSERT INTO "dominios_caracteristicas_pessoais"
    ("id", "tipo", "codigo_sarh", "nome", "ordem", "ativo", "origem_sarh", "atualizado_em")
VALUES
    (gen_random_uuid(), 'RACA', '1', 'Branca', 1, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'RACA', '2', 'Preta', 2, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'RACA', '3', 'Amarela', 3, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'RACA', '4', 'Parda', 4, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'RACA', '5', 'Indígena', 5, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'RACA', '6', 'Não informado', 6, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COR_CABELO', '1', 'Pretos', 1, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COR_CABELO', '2', 'Brancos', 2, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COR_CABELO', '3', 'Castanhos', 3, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COR_CABELO', '4', 'Loiros', 4, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COR_CABELO', '5', 'Ruivos', 5, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COR_CABELO', '6', 'Grisalhos', 6, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COR_OLHOS', '1', 'Pretos', 1, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COR_OLHOS', '2', 'Castanhos', 2, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COR_OLHOS', '3', 'Verdes', 3, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COR_OLHOS', '4', 'Azuis', 4, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COR_OLHOS', '5', 'Duas cores', 5, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIPO_SANGUINEO', '1', 'A+', 1, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIPO_SANGUINEO', '2', 'A-', 2, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIPO_SANGUINEO', '3', 'B+', 3, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIPO_SANGUINEO', '4', 'B-', 4, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIPO_SANGUINEO', '5', 'AB+', 5, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIPO_SANGUINEO', '6', 'AB-', 6, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIPO_SANGUINEO', '7', 'O+', 7, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIPO_SANGUINEO', '8', 'O-', 8, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'IDENTIDADE_GENERO', '1', 'Cisgênero', 1, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'IDENTIDADE_GENERO', '2', 'Transgênero', 2, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'IDENTIDADE_GENERO', '3', 'Transexual', 3, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'IDENTIDADE_GENERO', '4', 'Travesti', 4, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'IDENTIDADE_GENERO', '5', 'Gênero fluido', 5, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'IDENTIDADE_GENERO', '6', 'Agênero', 6, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'IDENTIDADE_GENERO', '7', 'Outra', 7, true, true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'IDENTIDADE_GENERO', '99', 'Não informado', 99, true, true, CURRENT_TIMESTAMP);
