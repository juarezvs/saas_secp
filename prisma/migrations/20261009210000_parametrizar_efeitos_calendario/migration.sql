ALTER TABLE "calendarios_institucionais"
ADD COLUMN "contabiliza_jornada_como_trabalhada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "exige_registro_ponto" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "gera_debito" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "gera_credito" BOOLEAN NOT NULL DEFAULT true;

UPDATE "calendarios_institucionais"
SET
  "contabiliza_jornada_como_trabalhada" = true,
  "exige_registro_ponto" = false,
  "gera_debito" = false,
  "gera_credito" = false
WHERE "tipo" = 'TELETRABALHO_INTEGRAL_EXTRAORDINARIO';
