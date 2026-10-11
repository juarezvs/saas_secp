-- Reorganiza os menus de SERVIDOR e CHEFIA sem alterar permissoes.
DELETE FROM "menus_itens_perfil"
WHERE "perfil_id" IN (SELECT "id" FROM "perfis" WHERE "codigo" IN ('SERVIDOR', 'CHEFIA'));

DELETE FROM "menus_grupos_perfil"
WHERE "perfil_id" IN (SELECT "id" FROM "perfis" WHERE "codigo" IN ('SERVIDOR', 'CHEFIA'));

WITH grupos(codigo, label, icone, ordem) AS (
  VALUES
    ('SERVIDOR', 'Meu Ponto', 'Fingerprint', 20),
    ('SERVIDOR', 'Solicitações e Frequência', 'ClipboardCheck', 30),
    ('SERVIDOR', 'Minha Vida Funcional', 'BriefcaseBusiness', 40),
    ('SERVIDOR', 'Consultas e Documentos', 'FileSearch', 50),
    ('CHEFIA', 'Meu Ponto', 'Fingerprint', 20),
    ('CHEFIA', 'Gestão da Equipe', 'UsersRound', 30),
    ('CHEFIA', 'Frequência e Banco de Horas', 'Clock3', 40),
    ('CHEFIA', 'Serviço Extraordinário', 'TimerReset', 50),
    ('CHEFIA', 'Recesso e Relatórios', 'FileBarChart', 60)
)
INSERT INTO "menus_grupos_perfil" ("id", "perfil_id", "label", "icone", "ordem", "ativo", "criado_em", "atualizado_em")
SELECT gen_random_uuid(), p."id", g.label, g.icone, g.ordem, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM grupos g JOIN "perfis" p ON p."codigo" = g.codigo;

INSERT INTO "menus_itens_perfil" ("id", "perfil_id", "grupo_id", "item_catalogo", "label", "ordem", "ativo", "criado_em", "atualizado_em")
SELECT gen_random_uuid(), p."id", NULL, '/dashboard',
  CASE p."codigo" WHEN 'CHEFIA' THEN 'Visão da equipe' ELSE 'Minha página inicial' END,
  10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfis" p WHERE p."codigo" IN ('SERVIDOR', 'CHEFIA');

WITH itens(codigo, grupo, item_catalogo, label, ordem) AS (
  VALUES
    ('SERVIDOR','Meu Ponto','/marcacoes/registrar','Registrar ponto',10),
    ('SERVIDOR','Meu Ponto','/marcacoes','Ponto de hoje',20),
    ('SERVIDOR','Meu Ponto','/historico-marcacoes','Histórico de marcações',30),
    ('SERVIDOR','Meu Ponto','/espelho-ponto','Meu espelho de ponto',40),
    ('SERVIDOR','Solicitações e Frequência','/solicitacoes','Solicitações de ajuste',10),
    ('SERVIDOR','Solicitações e Frequência','/banco-horas/solicitacoes','Solicitações de banco de horas',20),
    ('SERVIDOR','Solicitações e Frequência','/acompanhamento-estagio','Acompanhamento de estágio',30),
    ('SERVIDOR','Minha Vida Funcional','/meu-contracheque','Meu contracheque',10),
    ('SERVIDOR','Minha Vida Funcional','/meus-afastamentos','Meus afastamentos',20),
    ('SERVIDOR','Minha Vida Funcional','/minhas-ferias','Minhas férias',30),
    ('SERVIDOR','Minha Vida Funcional','/banco-horas','Meu banco de horas',40),
    ('SERVIDOR','Minha Vida Funcional','/horas-extras','Minhas horas extras',50),
    ('SERVIDOR','Consultas e Documentos','/recesso-forense','Recesso forense',10),
    ('SERVIDOR','Consultas e Documentos','/relatorios','Meus relatórios',20),
    ('SERVIDOR','Consultas e Documentos','/substituicoes-funcao/relatorio','Minhas substituições',30),
    ('CHEFIA','Meu Ponto','/marcacoes/registrar','Registrar ponto',10),
    ('CHEFIA','Meu Ponto','/marcacoes','Ponto de hoje',20),
    ('CHEFIA','Meu Ponto','/historico-marcacoes','Histórico de marcações',30),
    ('CHEFIA','Gestão da Equipe','/minha-equipe/presencas','Presenças e afastamentos',10),
    ('CHEFIA','Gestão da Equipe','/minha-equipe/ferias','Férias da equipe',20),
    ('CHEFIA','Gestão da Equipe','/solicitacoes','Solicitações da equipe',30),
    ('CHEFIA','Gestão da Equipe','/homologacao','Homologação de frequência',40),
    ('CHEFIA','Frequência e Banco de Horas','/espelho-ponto','Espelhos de ponto',10),
    ('CHEFIA','Frequência e Banco de Horas','/banco-horas/chefia','Banco de horas da equipe',20),
    ('CHEFIA','Frequência e Banco de Horas','/banco-horas','Meu banco de horas',30),
    ('CHEFIA','Frequência e Banco de Horas','/boletim-frequencia','Boletim de frequência',40),
    ('CHEFIA','Serviço Extraordinário','/gestao/horas-extras','Gestão de horas extras',10),
    ('CHEFIA','Serviço Extraordinário','/horas-extras/autorizacoes','Autorizações',20),
    ('CHEFIA','Serviço Extraordinário','/horas-extras','Minhas horas extras',30),
    ('CHEFIA','Recesso e Relatórios','/recesso-forense','Recesso da equipe',10),
    ('CHEFIA','Recesso e Relatórios','/relatorios','Relatórios da equipe',20),
    ('CHEFIA','Recesso e Relatórios','/substituicoes-funcao/relatorio','Relatório de substituições',30)
)
INSERT INTO "menus_itens_perfil" ("id", "perfil_id", "grupo_id", "item_catalogo", "label", "ordem", "ativo", "criado_em", "atualizado_em")
SELECT gen_random_uuid(), p."id", g."id", i.item_catalogo, i.label, i.ordem, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM itens i
JOIN "perfis" p ON p."codigo" = i.codigo
JOIN "menus_grupos_perfil" g ON g."perfil_id" = p."id" AND g."label" = i.grupo;
