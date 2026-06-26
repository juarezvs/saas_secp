CREATE TYPE "AbrangenciaCalendarioInstitucional" AS ENUM ('NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'ORGAO', 'UNIDADE');

ALTER TABLE "unidades_organizacionais"
  ADD COLUMN "uf" CHAR(2),
  ADD COLUMN "municipio" VARCHAR(120),
  ADD COLUMN "municipio_ibge" VARCHAR(7);

ALTER TABLE "calendarios_institucionais"
  ADD COLUMN "abrangencia" "AbrangenciaCalendarioInstitucional" NOT NULL DEFAULT 'NACIONAL',
  ADD COLUMN "uf" CHAR(2),
  ADD COLUMN "municipio" VARCHAR(120),
  ADD COLUMN "municipio_ibge" VARCHAR(7),
  ADD COLUMN "orgao_id" UUID,
  ADD COLUMN "unidade_id" UUID;

DROP INDEX IF EXISTS "calendarios_institucionais_data_referencia_key";

ALTER TABLE "calendarios_institucionais"
  ADD CONSTRAINT "calendarios_institucionais_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "calendarios_institucionais_unidade_id_fkey"
  FOREIGN KEY ("unidade_id") REFERENCES "unidades_organizacionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "unidades_organizacionais_uf_idx" ON "unidades_organizacionais"("uf");
CREATE INDEX "unidades_organizacionais_municipio_ibge_idx" ON "unidades_organizacionais"("municipio_ibge");

CREATE INDEX "calendarios_institucionais_abrangencia_idx" ON "calendarios_institucionais"("abrangencia");
CREATE INDEX "calendarios_institucionais_uf_idx" ON "calendarios_institucionais"("uf");
CREATE INDEX "calendarios_institucionais_municipio_ibge_idx" ON "calendarios_institucionais"("municipio_ibge");
CREATE INDEX "calendarios_institucionais_orgao_id_idx" ON "calendarios_institucionais"("orgao_id");
CREATE INDEX "calendarios_institucionais_unidade_id_idx" ON "calendarios_institucionais"("unidade_id");
