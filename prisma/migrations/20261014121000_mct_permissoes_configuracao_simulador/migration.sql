INSERT INTO "permissoes" ("id", "codigo", "recurso", "acao", "escopo", "descricao", "criado_em")
SELECT gen_random_uuid(), dados.codigo, dados.recurso, dados.acao, dados.escopo, dados.descricao, CURRENT_TIMESTAMP
FROM (VALUES
  ('mct-configuracao:consultar:seccional', 'mct-configuracao', 'consultar', 'seccional', 'Consultar configurações de apuração MCT da seccional.'),
  ('mct-configuracao:gerenciar:seccional', 'mct-configuracao', 'gerenciar', 'seccional', 'Gerenciar configurações de apuração MCT da seccional.'),
  ('mct-configuracao:consultar:global', 'mct-configuracao', 'consultar', 'global', 'Consultar configurações de apuração MCT globais.'),
  ('mct-configuracao:gerenciar:global', 'mct-configuracao', 'gerenciar', 'global', 'Gerenciar configurações de apuração MCT globais.'),
  ('mct-simulador:usar:seccional', 'mct-simulador', 'usar', 'seccional', 'Usar o simulador MCT na seccional.'),
  ('mct-simulador:usar:global', 'mct-simulador', 'usar', 'global', 'Usar o simulador MCT globalmente.')
) AS dados(codigo, recurso, acao, escopo, descricao)
WHERE NOT EXISTS (SELECT 1 FROM "permissoes" p WHERE p."codigo" = dados.codigo);

INSERT INTO "perfis_permissoes" ("id", "perfil_id", "permissao_id")
SELECT gen_random_uuid(), perfil."id", permissao."id"
FROM "perfis" perfil
JOIN "permissoes" permissao ON (
  (perfil."codigo" = 'MASTER' AND permissao."codigo" IN (
    'mct-configuracao:consultar:global', 'mct-configuracao:gerenciar:global', 'mct-simulador:usar:global'
  )) OR
  (perfil."codigo" = 'ADMIN' AND permissao."codigo" IN (
    'mct-configuracao:consultar:seccional', 'mct-configuracao:gerenciar:seccional', 'mct-simulador:usar:seccional'
  ))
)
WHERE NOT EXISTS (
  SELECT 1 FROM "perfis_permissoes" pp
  WHERE pp."perfil_id" = perfil."id" AND pp."permissao_id" = permissao."id"
);
