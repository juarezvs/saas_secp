-- Amplia a modelagem de jornadas para portarias parametrizaveis por seccional
-- e vinculos historicos por periodo, sem alterar dados ja apurados.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'FIXA_SEMANAL';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'FLEXIVEL';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'CARGA_DIARIA';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'CARGA_SEMANAL';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'CARGA_MENSAL';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'ESCALA_CICLICA';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'ESCALA_VARIAVEL';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'TURNO_FIXO';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'TURNO_REVEZAMENTO';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'NOTURNA';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'PARCIAL';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'PLANTAO_EVENTUAL';
ALTER TYPE "TipoJornada" ADD VALUE IF NOT EXISTS 'SEM_CONTROLE_CONVENCIONAL';

ALTER TYPE "TipoEscala" ADD VALUE IF NOT EXISTS 'CICLICA';
ALTER TYPE "TipoEscala" ADD VALUE IF NOT EXISTS 'PLANEJADA';
ALTER TYPE "TipoEscala" ADD VALUE IF NOT EXISTS 'TURNO_FIXO';
ALTER TYPE "TipoEscala" ADD VALUE IF NOT EXISTS 'TURNO_ALTERNANTE';

ALTER TABLE "jornadas"
  ADD COLUMN IF NOT EXISTS "orgao_id" UUID,
  ADD COLUMN IF NOT EXISTS "carga_semanal_minutos" INTEGER,
  ADD COLUMN IF NOT EXISTS "carga_mensal_minutos" INTEGER,
  ADD COLUMN IF NOT EXISTS "carga_minima_diaria_minutos" INTEGER,
  ADD COLUMN IF NOT EXISTS "carga_maxima_diaria_minutos" INTEGER,
  ADD COLUMN IF NOT EXISTS "controla_horario" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "permite_flexibilidade" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "permite_banco_horas" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "permite_hora_extra" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "nucleo_obrigatorio_inicio" VARCHAR(5),
  ADD COLUMN IF NOT EXISTS "nucleo_obrigatorio_fim" VARCHAR(5),
  ADD COLUMN IF NOT EXISTS "permanencia_maxima_minutos" INTEGER,
  ADD COLUMN IF NOT EXISTS "horario_limite_virada" VARCHAR(5),
  ADD COLUMN IF NOT EXISTS "cruza_meia_noite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "fundamento_normativo" VARCHAR(250),
  ADD COLUMN IF NOT EXISTS "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "vigencia_inicio" DATE,
  ADD COLUMN IF NOT EXISTS "vigencia_fim" DATE,
  ADD COLUMN IF NOT EXISTS "situacao" VARCHAR(30) NOT NULL DEFAULT 'ATIVA';

CREATE TABLE IF NOT EXISTS "jornadas_dias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jornada_id" UUID NOT NULL,
    "dia_semana" "DiaSemana",
    "ordem_no_ciclo" INTEGER,
    "tipo_dia" VARCHAR(30) NOT NULL DEFAULT 'TRABALHO',
    "carga_prevista_minutos" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jornadas_dias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "jornadas_faixas_horarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jornada_id" UUID NOT NULL,
    "jornada_dia_id" UUID,
    "tipo" VARCHAR(30) NOT NULL DEFAULT 'TRABALHO',
    "hora_inicio" VARCHAR(5) NOT NULL,
    "hora_fim" VARCHAR(5) NOT NULL,
    "cruza_meia_noite" BOOLEAN NOT NULL DEFAULT false,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jornadas_faixas_horarios_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "escalas"
  ADD COLUMN IF NOT EXISTS "quantidade_dias_ciclo" INTEGER,
  ADD COLUMN IF NOT EXISTS "data_ancoragem" DATE,
  ADD COLUMN IF NOT EXISTS "primeiro_dia_trabalho" DATE,
  ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(80);

ALTER TABLE "escalas_dias"
  ADD COLUMN IF NOT EXISTS "posicao_ciclo" INTEGER,
  ADD COLUMN IF NOT EXISTS "tipo_dia" VARCHAR(30) NOT NULL DEFAULT 'TRABALHO',
  ADD COLUMN IF NOT EXISTS "cruza_meia_noite" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "escalas_dias"
  ALTER COLUMN "dia_semana" DROP NOT NULL;

ALTER TABLE "jornadas_servidores"
  ADD COLUMN IF NOT EXISTS "tipo_vinculacao" VARCHAR(40) NOT NULL DEFAULT 'PERMANENTE',
  ADD COLUMN IF NOT EXISTS "motivo" VARCHAR(250),
  ADD COLUMN IF NOT EXISTS "fundamento_documental" VARCHAR(250),
  ADD COLUMN IF NOT EXISTS "documento_sei" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "autoridade_responsavel" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(30) NOT NULL DEFAULT 'ATIVO';

CREATE INDEX IF NOT EXISTS "jornadas_orgao_id_idx" ON "jornadas"("orgao_id");
CREATE INDEX IF NOT EXISTS "jornadas_tipo_idx" ON "jornadas"("tipo");
CREATE INDEX IF NOT EXISTS "jornadas_situacao_idx" ON "jornadas"("situacao");
CREATE INDEX IF NOT EXISTS "jornadas_dias_jornada_id_idx" ON "jornadas_dias"("jornada_id");
CREATE INDEX IF NOT EXISTS "jornadas_dias_jornada_id_dia_semana_idx" ON "jornadas_dias"("jornada_id", "dia_semana");
CREATE INDEX IF NOT EXISTS "jornadas_dias_jornada_id_ordem_no_ciclo_idx" ON "jornadas_dias"("jornada_id", "ordem_no_ciclo");
CREATE INDEX IF NOT EXISTS "jornadas_faixas_horarios_jornada_id_idx" ON "jornadas_faixas_horarios"("jornada_id");
CREATE INDEX IF NOT EXISTS "jornadas_faixas_horarios_jornada_dia_id_idx" ON "jornadas_faixas_horarios"("jornada_dia_id");
CREATE INDEX IF NOT EXISTS "escalas_dias_escala_id_posicao_ciclo_idx" ON "escalas_dias"("escala_id", "posicao_ciclo");
DROP INDEX IF EXISTS "escalas_dias_escala_id_dia_semana_key";
CREATE UNIQUE INDEX IF NOT EXISTS "escalas_dias_escala_id_dia_semana_sem_ciclo_key"
  ON "escalas_dias"("escala_id", "dia_semana")
  WHERE "posicao_ciclo" IS NULL AND "dia_semana" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "escalas_dias_escala_id_posicao_ciclo_key"
  ON "escalas_dias"("escala_id", "posicao_ciclo")
  WHERE "posicao_ciclo" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "jornadas_servidores_servidor_id_status_data_inicio_data_fim_idx"
  ON "jornadas_servidores"("servidor_id", "status", "data_inicio", "data_fim");

ALTER TABLE "jornadas_servidores"
  ADD CONSTRAINT "jornadas_servidores_sem_sobreposicao_ativa"
  EXCLUDE USING gist (
    "servidor_id" WITH =,
    daterange("data_inicio", COALESCE("data_fim" + 1, 'infinity'::date), '[)') WITH &&
  )
  WHERE ("ativo" = true AND "status" = 'ATIVO');

ALTER TABLE "jornadas"
  ADD CONSTRAINT "jornadas_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "jornadas_dias"
  ADD CONSTRAINT "jornadas_dias_jornada_id_fkey"
  FOREIGN KEY ("jornada_id") REFERENCES "jornadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jornadas_faixas_horarios"
  ADD CONSTRAINT "jornadas_faixas_horarios_jornada_id_fkey"
  FOREIGN KEY ("jornada_id") REFERENCES "jornadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jornadas_faixas_horarios"
  ADD CONSTRAINT "jornadas_faixas_horarios_jornada_dia_id_fkey"
  FOREIGN KEY ("jornada_dia_id") REFERENCES "jornadas_dias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
