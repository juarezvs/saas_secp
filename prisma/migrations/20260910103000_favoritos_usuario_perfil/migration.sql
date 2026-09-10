CREATE TABLE "usuarios_perfis_favoritos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "usuario_id" UUID NOT NULL,
  "perfil_id" UUID NOT NULL,
  "item_catalogo" VARCHAR(160) NOT NULL,
  "titulo" VARCHAR(120),
  "descricao" TEXT,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usuarios_perfis_favoritos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_perfis_favoritos_usuario_perfil_item_key"
  ON "usuarios_perfis_favoritos"("usuario_id", "perfil_id", "item_catalogo");

CREATE INDEX "usuarios_perfis_favoritos_usuario_perfil_ordem_idx"
  ON "usuarios_perfis_favoritos"("usuario_id", "perfil_id", "ordem");

CREATE INDEX "usuarios_perfis_favoritos_perfil_id_idx"
  ON "usuarios_perfis_favoritos"("perfil_id");

ALTER TABLE "usuarios_perfis_favoritos"
  ADD CONSTRAINT "usuarios_perfis_favoritos_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "usuarios_perfis_favoritos"
  ADD CONSTRAINT "usuarios_perfis_favoritos_perfil_id_fkey"
  FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
