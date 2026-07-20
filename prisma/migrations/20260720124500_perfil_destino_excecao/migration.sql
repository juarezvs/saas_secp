ALTER TABLE "perfis"
  ADD COLUMN "perfil_destino_excecao_id" UUID;

UPDATE "perfis" AS excecao
SET "perfil_destino_excecao_id" = destino."id"
FROM "perfis" AS destino
WHERE excecao."codigo" IN (
  'EXCECAO_REGISTRO_WEB',
  'EXCECAO_REGISTRO_FACIAL'
)
AND destino."codigo" = 'SERVIDOR';

CREATE INDEX "perfis_perfil_destino_excecao_id_idx"
  ON "perfis"("perfil_destino_excecao_id");

ALTER TABLE "perfis"
  ADD CONSTRAINT "perfis_perfil_destino_excecao_id_fkey"
  FOREIGN KEY ("perfil_destino_excecao_id")
  REFERENCES "perfis"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
