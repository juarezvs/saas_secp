ALTER TABLE "orgaos"
ADD COLUMN IF NOT EXISTS "fuso_horario" VARCHAR(80);

UPDATE "orgaos"
SET "fuso_horario" = 'America/Manaus'
WHERE "fuso_horario" IS NULL;

ALTER TABLE "unidades_organizacionais"
ALTER COLUMN "fuso_horario" DROP DEFAULT;

ALTER TABLE "unidades_organizacionais"
ALTER COLUMN "fuso_horario" DROP NOT NULL;

UPDATE "unidades_organizacionais"
SET "fuso_horario" = NULL
WHERE "fuso_horario" = 'America/Manaus';
