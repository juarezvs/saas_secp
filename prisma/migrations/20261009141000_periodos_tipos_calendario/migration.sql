ALTER TYPE "TipoCalendarioInstitucional"
ADD VALUE IF NOT EXISTS 'TELETRABALHO_INTEGRAL_EXTRAORDINARIO';

CREATE TABLE "tipos_feriados_suspensoes" (
  "id" UUID NOT NULL,
  "codigo" "TipoCalendarioInstitucional" NOT NULL,
  "nome" VARCHAR(120) NOT NULL,
  "descricao" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tipos_feriados_suspensoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tipos_feriados_suspensoes_codigo_key"
ON "tipos_feriados_suspensoes"("codigo");

INSERT INTO "tipos_feriados_suspensoes" ("id", "codigo", "nome", "descricao")
VALUES
  (gen_random_uuid(), 'FERIADO', 'Feriado', 'Feriado institucional.'),
  (gen_random_uuid(), 'PONTO_FACULTATIVO', 'Ponto facultativo', 'Ponto facultativo institucional.'),
  (gen_random_uuid(), 'SUSPENSAO_EXPEDIENTE', 'Suspensão do expediente', 'Suspensão integral ou parcial do expediente.'),
  (gen_random_uuid(), 'TELETRABALHO_INTEGRAL_EXTRAORDINARIO', 'Teletrabalho integral extraordinário', 'Teletrabalho integral definido excepcionalmente para o período.')
ON CONFLICT ("codigo") DO NOTHING;

ALTER TABLE "calendarios_institucionais"
ADD COLUMN "data_fim" DATE,
ADD COLUMN "data_original_fim" DATE;

ALTER TABLE "calendarios_institucionais"
ADD CONSTRAINT "calendarios_institucionais_tipo_fkey"
FOREIGN KEY ("tipo") REFERENCES "tipos_feriados_suspensoes"("codigo")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissoes" ("id", "codigo", "recurso", "acao", "escopo", "descricao")
VALUES
  (gen_random_uuid(), 'tipoferiado:cadastrar:seccional', 'tipoferiado', 'cadastrar', 'seccional', 'Cadastrar tipos de feriados e suspensões na seccional.'),
  (gen_random_uuid(), 'tipoferiado:cadastrar:master', 'tipoferiado', 'cadastrar', 'master', 'Cadastrar tipos de feriados e suspensões em âmbito master.'),
  (gen_random_uuid(), 'tipoferiado:consultar:seccional', 'tipoferiado', 'consultar', 'seccional', 'Consultar tipos de feriados e suspensões.')
ON CONFLICT ("codigo") DO NOTHING;
