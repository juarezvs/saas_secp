INSERT INTO "perfis_permissoes" ("id", "perfil_id", "permissao_id")
SELECT gen_random_uuid(), existente."perfil_id", nova."id"
FROM "perfis_permissoes" existente
JOIN "permissoes" atual ON atual."id" = existente."permissao_id"
JOIN "permissoes" nova ON nova."codigo" = 'tipoferiado:cadastrar:master'
WHERE atual."codigo" = 'configuracoes:gerenciar:global'
ON CONFLICT ("perfil_id", "permissao_id") DO NOTHING;

INSERT INTO "perfis_permissoes" ("id", "perfil_id", "permissao_id")
SELECT gen_random_uuid(), existente."perfil_id", nova."id"
FROM "perfis_permissoes" existente
JOIN "permissoes" atual ON atual."id" = existente."permissao_id"
JOIN "permissoes" nova ON nova."codigo" = 'tipoferiado:cadastrar:seccional'
WHERE atual."codigo" = 'configuracoes:gerenciar:seccional'
ON CONFLICT ("perfil_id", "permissao_id") DO NOTHING;

INSERT INTO "perfis_permissoes" ("id", "perfil_id", "permissao_id")
SELECT gen_random_uuid(), pp."perfil_id", consulta."id"
FROM "perfis_permissoes" pp
JOIN "permissoes" cadastro ON cadastro."id" = pp."permissao_id"
JOIN "permissoes" consulta
  ON consulta."codigo" = 'tipoferiado:consultar:seccional'
WHERE cadastro."codigo" IN (
  'tipoferiado:cadastrar:master',
  'tipoferiado:cadastrar:seccional'
)
ON CONFLICT ("perfil_id", "permissao_id") DO NOTHING;
