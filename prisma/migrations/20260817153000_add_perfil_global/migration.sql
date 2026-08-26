ALTER TABLE "perfis"
  ADD COLUMN IF NOT EXISTS "global" BOOLEAN NOT NULL DEFAULT false;

UPDATE "perfis"
SET "global" = true
WHERE "orgao_id" IS NULL;

CREATE INDEX IF NOT EXISTS "perfis_global_idx" ON "perfis"("global");
