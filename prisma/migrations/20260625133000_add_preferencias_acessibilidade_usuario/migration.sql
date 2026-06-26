ALTER TABLE "usuarios"
ADD COLUMN IF NOT EXISTS "preferencias_acessibilidade" JSONB;
