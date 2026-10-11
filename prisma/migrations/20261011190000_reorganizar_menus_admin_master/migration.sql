-- Reorganiza os menus dos perfis administrativos do sistema por responsabilidade.
DELETE FROM "menus_itens_perfil"
WHERE "perfil_id" IN (SELECT "id" FROM "perfis" WHERE "codigo" IN ('ADMIN', 'MASTER'));

DELETE FROM "menus_grupos_perfil"
WHERE "perfil_id" IN (SELECT "id" FROM "perfis" WHERE "codigo" IN ('ADMIN', 'MASTER'));

WITH grupos(codigo, label, icone, ordem) AS (
  VALUES
    ('ADMIN', 'Pessoas e Acessos', 'UsersRound', 20),
    ('ADMIN', 'Frequência e Ponto', 'Fingerprint', 30),
    ('ADMIN', 'Jornadas e Calendário', 'CalendarClock', 40),
    ('ADMIN', 'Banco de Horas e Horas Extras', 'Hourglass', 50),
    ('ADMIN', 'Cadastros Auxiliares', 'ListChecks', 60),
    ('ADMIN', 'Integrações e Equipamentos', 'PlugZap', 70),
    ('ADMIN', 'Relatórios e Controle', 'BarChart3', 80),
    ('ADMIN', 'Configuração da Seccional', 'Settings', 90),
    ('MASTER', 'Governança Global', 'ShieldCheck', 20),
    ('MASTER', 'Pessoas e Estrutura', 'UsersRound', 30),
    ('MASTER', 'Frequência e Apuração', 'Fingerprint', 40),
    ('MASTER', 'Jornadas e Calendário', 'CalendarClock', 50),
    ('MASTER', 'Banco de Horas e Horas Extras', 'Hourglass', 60),
    ('MASTER', 'Cadastros Auxiliares', 'ListChecks', 70),
    ('MASTER', 'Integrações e Infraestrutura', 'PlugZap', 80),
    ('MASTER', 'Controle e Auditoria', 'ShieldAlert', 90)
)
INSERT INTO "menus_grupos_perfil" ("id", "perfil_id", "label", "icone", "ordem", "ativo", "criado_em", "atualizado_em")
SELECT gen_random_uuid(), p."id", g.label, g.icone, g.ordem, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM grupos g
JOIN "perfis" p ON p."codigo" = g.codigo;

INSERT INTO "menus_itens_perfil" ("id", "perfil_id", "grupo_id", "item_catalogo", "label", "ordem", "ativo", "criado_em", "atualizado_em")
SELECT gen_random_uuid(), p."id", NULL, '/dashboard',
  CASE p."codigo" WHEN 'MASTER' THEN 'Visão global' ELSE 'Visão geral' END,
  10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfis" p WHERE p."codigo" IN ('ADMIN', 'MASTER');

WITH itens(codigo, grupo, item_catalogo, label, ordem) AS (
  VALUES
    ('ADMIN','Pessoas e Acessos','/usuarios','Usuários da seccional',10),
    ('ADMIN','Pessoas e Acessos','/servidores','Servidores da seccional',20),
    ('ADMIN','Pessoas e Acessos','/chefias','Chefias e responsáveis',30),
    ('ADMIN','Pessoas e Acessos','/perfis','Perfis e permissões da seccional',40),
    ('ADMIN','Pessoas e Acessos','/orgaos','Órgãos e seccionais',50),
    ('ADMIN','Pessoas e Acessos','/unidades','Unidades organizacionais',60),
    ('ADMIN','Pessoas e Acessos','/administracao/substituicoes-automaticas','Substituições automáticas',70),
    ('ADMIN','Pessoas e Acessos','/administracao/substituicoes-funcao','Substituições de função',80),
    ('ADMIN','Pessoas e Acessos','/substituicoes-funcao/relatorio','Relatório de substituições',90),
    ('ADMIN','Frequência e Ponto','/marcacoes-brutas','Marcações recebidas',10),
    ('ADMIN','Frequência e Ponto','/manutencao/marcacoes','Manutenção de marcações',20),
    ('ADMIN','Frequência e Ponto','/afd','Arquivos AFD',30),
    ('ADMIN','Frequência e Ponto','/apuracao','Apuração e recálculo',40),
    ('ADMIN','Frequência e Ponto','/solicitacoes','Solicitações de ajuste',50),
    ('ADMIN','Frequência e Ponto','/homologacao','Homologação de frequência',60),
    ('ADMIN','Frequência e Ponto','/boletim-frequencia','Boletim de frequência',70),
    ('ADMIN','Jornadas e Calendário','/jornadas','Jornadas e horários',10),
    ('ADMIN','Jornadas e Calendário','/administracao/regulamentacao-ponto','Regulamentação do ponto',20),
    ('ADMIN','Jornadas e Calendário','/administracao/procedimentos-frequencia','Procedimentos de frequência',30),
    ('ADMIN','Jornadas e Calendário','/administracao/procedimentos-frequencia/nada-consta','Nada Consta de frequência',40),
    ('ADMIN','Jornadas e Calendário','/administracao/calendario','Calendário institucional',50),
    ('ADMIN','Jornadas e Calendário','/recesso-forense','Recesso forense',60),
    ('ADMIN','Jornadas e Calendário','/administracao/ferias/integracao-sarh','Férias no SARH',70),
    ('ADMIN','Banco de Horas e Horas Extras','/banco-horas','Consulta de banco de horas',10),
    ('ADMIN','Banco de Horas e Horas Extras','/administracao/banco-horas','Configuração do banco de horas',20),
    ('ADMIN','Banco de Horas e Horas Extras','/administracao/horas-extras','Configuração de horas extras',30),
    ('ADMIN','Banco de Horas e Horas Extras','/horas-extras/autorizacoes','Autorizações',40),
    ('ADMIN','Banco de Horas e Horas Extras','/orcamento/horas-extras','Orçamento',50),
    ('ADMIN','Banco de Horas e Horas Extras','/deliberacao/horas-extras','Deliberação',60),
    ('ADMIN','Banco de Horas e Horas Extras','/execucao/horas-extras','Execução',70),
    ('ADMIN','Banco de Horas e Horas Extras','/folha/horas-extras','Folha',80),
    ('ADMIN','Cadastros Auxiliares','/cadastros-auxiliares/tipos-feriados-suspensoes','Tipos de feriados e suspensões',10),
    ('ADMIN','Cadastros Auxiliares','/cadastros-auxiliares/estados-cidades','Estados e cidades',20),
    ('ADMIN','Cadastros Auxiliares','/cadastros-auxiliares/caracteristicas-pessoais','Características pessoais',30),
    ('ADMIN','Integrações e Equipamentos','/administracao/integracoes','Credenciais e integrações',10),
    ('ADMIN','Integrações e Equipamentos','/equipamentos','Equipamentos biométricos',20),
    ('ADMIN','Integrações e Equipamentos','/biometria','Biometria facial',30),
    ('ADMIN','Integrações e Equipamentos','/totem','Modo Totem',40),
    ('ADMIN','Integrações e Equipamentos','/administracao/workers','Saúde dos workers',50),
    ('ADMIN','Relatórios e Controle','/painel-executivo','Painel executivo',10),
    ('ADMIN','Relatórios e Controle','/relatorios','Relatórios gerenciais',20),
    ('ADMIN','Relatórios e Controle','/auditoria','Auditoria',30),
    ('ADMIN','Configuração da Seccional','/administracao','Central de administração',10),
    ('ADMIN','Configuração da Seccional','/administracao/liberacao-rotinas','Liberação de rotinas',20),
    ('ADMIN','Configuração da Seccional','/administracao/suporte','Suporte do login',30),
    ('ADMIN','Configuração da Seccional','/administracao/personalizar-menu','Personalizar menus',40),
    ('MASTER','Governança Global','/administracao','Administração global',10),
    ('MASTER','Governança Global','/administracao/configuracoes-globais','Configurações globais',20),
    ('MASTER','Governança Global','/perfis','Perfis e permissões globais',30),
    ('MASTER','Governança Global','/administracao/personalizar-menu','Personalizar menus',40),
    ('MASTER','Governança Global','/administracao/liberacao-rotinas','Liberação de rotinas',50),
    ('MASTER','Governança Global','/administracao/suporte','Suporte do login',60),
    ('MASTER','Pessoas e Estrutura','/usuarios','Usuários',10),
    ('MASTER','Pessoas e Estrutura','/servidores','Servidores',20),
    ('MASTER','Pessoas e Estrutura','/chefias','Chefias e responsáveis',30),
    ('MASTER','Pessoas e Estrutura','/orgaos','Órgãos e seccionais',40),
    ('MASTER','Pessoas e Estrutura','/unidades','Unidades organizacionais',50),
    ('MASTER','Pessoas e Estrutura','/administracao/substituicoes-automaticas','Substituições automáticas',60),
    ('MASTER','Pessoas e Estrutura','/administracao/substituicoes-funcao','Substituições de função',70),
    ('MASTER','Pessoas e Estrutura','/substituicoes-funcao/relatorio','Relatório de substituições',80),
    ('MASTER','Frequência e Apuração','/marcacoes-brutas','Marcações recebidas',10),
    ('MASTER','Frequência e Apuração','/manutencao/marcacoes','Manutenção de marcações',20),
    ('MASTER','Frequência e Apuração','/afd','Arquivos AFD',30),
    ('MASTER','Frequência e Apuração','/apuracao','Apuração e recálculo',40),
    ('MASTER','Frequência e Apuração','/solicitacoes','Solicitações de ajuste',50),
    ('MASTER','Frequência e Apuração','/homologacao','Homologação de frequência',60),
    ('MASTER','Frequência e Apuração','/boletim-frequencia','Boletim de frequência',70),
    ('MASTER','Jornadas e Calendário','/jornadas','Jornadas e horários',10),
    ('MASTER','Jornadas e Calendário','/administracao/regulamentacao-ponto','Regulamentação do ponto',20),
    ('MASTER','Jornadas e Calendário','/administracao/procedimentos-frequencia','Procedimentos de frequência',30),
    ('MASTER','Jornadas e Calendário','/administracao/procedimentos-frequencia/nada-consta','Nada Consta de frequência',40),
    ('MASTER','Jornadas e Calendário','/administracao/calendario','Calendário institucional',50),
    ('MASTER','Jornadas e Calendário','/recesso-forense','Recesso forense',60),
    ('MASTER','Jornadas e Calendário','/administracao/ferias/integracao-sarh','Férias no SARH',70),
    ('MASTER','Banco de Horas e Horas Extras','/banco-horas','Consulta de banco de horas',10),
    ('MASTER','Banco de Horas e Horas Extras','/administracao/banco-horas','Configuração do banco de horas',20),
    ('MASTER','Banco de Horas e Horas Extras','/administracao/horas-extras','Configuração de horas extras',30),
    ('MASTER','Banco de Horas e Horas Extras','/horas-extras/autorizacoes','Autorizações',40),
    ('MASTER','Banco de Horas e Horas Extras','/orcamento/horas-extras','Orçamento',50),
    ('MASTER','Banco de Horas e Horas Extras','/deliberacao/horas-extras','Deliberação',60),
    ('MASTER','Banco de Horas e Horas Extras','/execucao/horas-extras','Execução',70),
    ('MASTER','Banco de Horas e Horas Extras','/folha/horas-extras','Folha',80),
    ('MASTER','Cadastros Auxiliares','/cadastros-auxiliares/tipos-feriados-suspensoes','Tipos de feriados e suspensões',10),
    ('MASTER','Cadastros Auxiliares','/cadastros-auxiliares/estados-cidades','Estados e cidades',20),
    ('MASTER','Cadastros Auxiliares','/cadastros-auxiliares/caracteristicas-pessoais','Características pessoais',30),
    ('MASTER','Integrações e Infraestrutura','/administracao/integracoes','Credenciais e integrações',10),
    ('MASTER','Integrações e Infraestrutura','/administracao/integracoes/sarh','Integração SARH',20),
    ('MASTER','Integrações e Infraestrutura','/administracao/integracoes/ldap','Active Directory',30),
    ('MASTER','Integrações e Infraestrutura','/administracao/integracoes/teams','Microsoft Teams',40),
    ('MASTER','Integrações e Infraestrutura','/equipamentos','Equipamentos biométricos',50),
    ('MASTER','Integrações e Infraestrutura','/biometria','Biometria facial',60),
    ('MASTER','Integrações e Infraestrutura','/totem','Modo Totem',70),
    ('MASTER','Integrações e Infraestrutura','/administracao/workers','Saúde dos workers',80),
    ('MASTER','Integrações e Infraestrutura','/administracao/fusos-horarios','Fusos horários',90),
    ('MASTER','Controle e Auditoria','/painel-executivo','Painel executivo',10),
    ('MASTER','Controle e Auditoria','/relatorios','Relatórios gerenciais',20),
    ('MASTER','Controle e Auditoria','/auditoria','Auditoria',30)
)
INSERT INTO "menus_itens_perfil" ("id", "perfil_id", "grupo_id", "item_catalogo", "label", "ordem", "ativo", "criado_em", "atualizado_em")
SELECT gen_random_uuid(), p."id", g."id", i.item_catalogo, i.label, i.ordem, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM itens i
JOIN "perfis" p ON p."codigo" = i.codigo
JOIN "menus_grupos_perfil" g ON g."perfil_id" = p."id" AND g."label" = i.grupo;
