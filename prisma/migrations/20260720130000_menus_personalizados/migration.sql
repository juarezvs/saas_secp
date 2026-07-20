-- CreateTable
CREATE TABLE "menus_grupos_perfil" (
    "id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "icone" VARCHAR(80),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_grupos_perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus_itens_perfil" (
    "id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "grupo_id" UUID,
    "item_catalogo" VARCHAR(160) NOT NULL,
    "label" VARCHAR(120),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_itens_perfil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menus_grupos_perfil_perfil_id_ordem_idx" ON "menus_grupos_perfil"("perfil_id", "ordem");

-- CreateIndex
CREATE INDEX "menus_itens_perfil_perfil_id_ordem_idx" ON "menus_itens_perfil"("perfil_id", "ordem");

-- CreateIndex
CREATE INDEX "menus_itens_perfil_grupo_id_ordem_idx" ON "menus_itens_perfil"("grupo_id", "ordem");

-- AddForeignKey
ALTER TABLE "menus_grupos_perfil" ADD CONSTRAINT "menus_grupos_perfil_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus_itens_perfil" ADD CONSTRAINT "menus_itens_perfil_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus_itens_perfil" ADD CONSTRAINT "menus_itens_perfil_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "menus_grupos_perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed permission for menu customization.
INSERT INTO "permissoes" ("id", "codigo", "recurso", "acao", "escopo", "descricao", "criado_em")
VALUES (gen_random_uuid(), 'menus:personalizar:global', 'menus', 'personalizar', 'global', 'Personalizar menus laterais por perfil.', CURRENT_TIMESTAMP)
ON CONFLICT ("codigo") DO NOTHING;
