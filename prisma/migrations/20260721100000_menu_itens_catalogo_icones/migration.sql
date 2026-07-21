CREATE TABLE "menus_itens_catalogo_config" (
    "id" UUID NOT NULL,
    "item_catalogo" VARCHAR(160) NOT NULL,
    "icone" VARCHAR(80),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_itens_catalogo_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "menus_itens_catalogo_config_item_catalogo_key" ON "menus_itens_catalogo_config"("item_catalogo");
