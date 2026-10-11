WITH perfil_master AS (
  SELECT "id"
  FROM "perfis"
  WHERE UPPER("codigo") = 'MASTER'
), grupo_inserido AS (
  INSERT INTO "menus_grupos_perfil" (
    "id", "perfil_id", "label", "icone", "ordem", "ativo", "criado_em", "atualizado_em"
  )
  SELECT
    gen_random_uuid(),
    perfil_master."id",
    'Cadastros Auxiliares',
    'ListChecks',
    COALESCE((
      SELECT MAX("ordem") + 1
      FROM "menus_grupos_perfil"
      WHERE "perfil_id" = perfil_master."id"
    ), 0),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM perfil_master
  WHERE NOT EXISTS (
    SELECT 1
    FROM "menus_grupos_perfil"
    WHERE "perfil_id" = perfil_master."id"
      AND LOWER("label") = LOWER('Cadastros Auxiliares')
  )
  RETURNING "id", "perfil_id"
), grupo_destino AS (
  SELECT "id", "perfil_id" FROM grupo_inserido
  UNION ALL
  SELECT grupo."id", grupo."perfil_id"
  FROM "menus_grupos_perfil" grupo
  JOIN perfil_master ON perfil_master."id" = grupo."perfil_id"
  WHERE LOWER(grupo."label") = LOWER('Cadastros Auxiliares')
  LIMIT 1
)
INSERT INTO "menus_itens_perfil" (
  "id", "perfil_id", "grupo_id", "item_catalogo", "label", "ordem", "ativo", "criado_em", "atualizado_em"
)
SELECT
  gen_random_uuid(),
  grupo_destino."perfil_id",
  grupo_destino."id",
  item."item_catalogo",
  item."label",
  item."ordem",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM grupo_destino
CROSS JOIN (
  VALUES
    ('/cadastros-auxiliares/tipos-feriados-suspensoes', 'Tipos de Feriados/Suspensões', 0),
    ('/cadastros-auxiliares/estados-cidades', 'Estados/Cidades', 1)
) AS item("item_catalogo", "label", "ordem")
WHERE NOT EXISTS (
  SELECT 1
  FROM "menus_itens_perfil" existente
  WHERE existente."perfil_id" = grupo_destino."perfil_id"
    AND existente."item_catalogo" = item."item_catalogo"
);
