UPDATE "menus_grupos_perfil"
SET "label" = CASE "label"
  WHEN 'Frequencia e Banco de Horas' THEN 'Frequência e Banco de Horas'
  WHEN 'Servico Extraordinario' THEN 'Serviço Extraordinário'
  WHEN 'Gestao de Pessoas' THEN 'Gestão de Pessoas'
  WHEN 'Administracao' THEN 'Administração'
  WHEN 'Administra??o' THEN 'Administração'
  WHEN 'Integracoes e Auditoria' THEN 'Integrações e Auditoria'
  WHEN 'Credenciais e integra??es' THEN 'Credenciais e integrações'
  ELSE "label"
END
WHERE "label" IN (
  'Frequencia e Banco de Horas',
  'Servico Extraordinario',
  'Gestao de Pessoas',
  'Administracao',
  'Administra??o',
  'Integracoes e Auditoria',
  'Credenciais e integra??es'
);

UPDATE "menus_itens_perfil"
SET "label" = CASE "label"
  WHEN 'Capacita??o' THEN 'Capacitação'
  WHEN 'Hora cr?dito pr?via' THEN 'Hora crédito prévia'
  WHEN 'Solicitacoes de banco de horas' THEN 'Solicitações de banco de horas'
  WHEN 'Relatorios' THEN 'Relatórios'
  WHEN 'Minhas solicita??es' THEN 'Minhas solicitações'
  WHEN 'Gest?o' THEN 'Gestão'
  WHEN 'Gest?o de horas extras' THEN 'Gestão de horas extras'
  WHEN 'Homologa??o' THEN 'Homologação'
  WHEN 'Boletim de frequ?ncia' THEN 'Boletim de frequência'
  WHEN 'Meu cadastro/valida??o' THEN 'Meu cadastro/validação'
  WHEN 'Administra??o' THEN 'Administração'
  WHEN 'Libera??o de Rotinas' THEN 'Liberação de Rotinas'
  WHEN 'Libera??o de rotinas' THEN 'Liberação de rotinas'
  WHEN 'Perfis e permiss?es' THEN 'Perfis e permissões'
  WHEN 'Histórico de marca??es' THEN 'Histórico de marcações'
  WHEN 'Minhas f?rias' THEN 'Minhas férias'
  WHEN 'Programação de f?rias' THEN 'Programação de férias'
  WHEN 'Presentes, ausentes e licen?as' THEN 'Presentes, ausentes e licenças'
  WHEN 'Substitui??es de fun??o' THEN 'Substituições de função'
  WHEN 'Regulamenta??o do ponto' THEN 'Regulamentação do ponto'
  WHEN 'Procedimentos de frequ?ncia' THEN 'Procedimentos de frequência'
  WHEN 'Nada Consta de frequ?ncia' THEN 'Nada Consta de frequência'
  WHEN 'Credenciais e integra??es' THEN 'Credenciais e integrações'
  WHEN 'Integra??o SARH' THEN 'Integração SARH'
  ELSE "label"
END
WHERE "label" IN (
  'Capacita??o',
  'Hora cr?dito pr?via',
  'Solicitacoes de banco de horas',
  'Relatorios',
  'Minhas solicita??es',
  'Gest?o',
  'Gest?o de horas extras',
  'Homologa??o',
  'Boletim de frequ?ncia',
  'Meu cadastro/valida??o',
  'Administra??o',
  'Libera??o de Rotinas',
  'Libera??o de rotinas',
  'Perfis e permiss?es',
  'Histórico de marca??es',
  'Minhas f?rias',
  'Programação de f?rias',
  'Presentes, ausentes e licen?as',
  'Substitui??es de fun??o',
  'Regulamenta??o do ponto',
  'Procedimentos de frequ?ncia',
  'Nada Consta de frequ?ncia',
  'Credenciais e integra??es',
  'Integra??o SARH'
);
