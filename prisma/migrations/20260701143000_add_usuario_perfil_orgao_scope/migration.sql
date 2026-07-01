ALTER TABLE "usuarios_perfis" ADD COLUMN IF NOT EXISTS "orgao_id" UUID;

ALTER TABLE "usuarios_perfis" DROP CONSTRAINT IF EXISTS "usuarios_perfis_usuario_id_perfil_id_key";
DROP INDEX IF EXISTS "usuarios_perfis_usuario_id_perfil_id_key";

ALTER TABLE "usuarios_perfis"
  ADD CONSTRAINT "usuarios_perfis_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_perfis_usuario_id_perfil_id_global_key"
  ON "usuarios_perfis"("usuario_id", "perfil_id")
  WHERE "orgao_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_perfis_usuario_id_perfil_id_orgao_id_key"
  ON "usuarios_perfis"("usuario_id", "perfil_id", "orgao_id")
  WHERE "orgao_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "usuarios_perfis_orgao_id_idx"
  ON "usuarios_perfis"("orgao_id");
