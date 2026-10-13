-- Disponibiliza o cadastro MCT também nos menus já personalizados.
INSERT INTO "menus_itens_perfil" (
  "id",
  "perfil_id",
  "grupo_id",
  "item_catalogo",
  "label",
  "ordem",
  "ativo",
  "criado_em",
  "atualizado_em"
)
SELECT
  gen_random_uuid(),
  perfil."id",
  grupo."id",
  '/cadastros-auxiliares/mct',
  'Rubricas, políticas e regras MCT',
  COALESCE((
    SELECT MIN(item."ordem") - 1
    FROM "menus_itens_perfil" item
    WHERE item."grupo_id" = grupo."id"
  ), 10),
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "perfis" perfil
JOIN "menus_grupos_perfil" grupo
  ON grupo."perfil_id" = perfil."id"
 AND grupo."label" = 'Cadastros Auxiliares'
WHERE perfil."codigo" IN ('ADMIN', 'MASTER')
  AND NOT EXISTS (
    SELECT 1
    FROM "menus_itens_perfil" existente
    WHERE existente."perfil_id" = perfil."id"
      AND existente."item_catalogo" = '/cadastros-auxiliares/mct'
  );
