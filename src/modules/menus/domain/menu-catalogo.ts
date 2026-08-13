export type MenuCatalogoItem = {
  id: string;
  label: string;
  href: string;
  permissoes?: string[];
};

export const MENU_CATALOGO: MenuCatalogoItem[] = [
  { id: "/dashboard", label: "Início", href: "/dashboard" },
  {
    id: "/marcacoes/registrar",
    label: "Registrar ponto",
    href: "/marcacoes/registrar",
    permissoes: [
      "marcacoes:registrar:proprio",
      "marcacoes:registrar-web:proprio",
    ],
  },
  {
    id: "/marcacoes",
    label: "Ponto de hoje",
    href: "/marcacoes",
    permissoes: [
      "marcacoes:consultar:proprio",
      "marcacoes:visualizar:proprio",
      "marcacoes:consultar:seccional",
      "marcacoes:consultar:global",
    ],
  },
  {
    id: "/historico-marcacoes",
    label: "Histórico de marcações",
    href: "/historico-marcacoes",
    permissoes: ["marcacoes:consultar:proprio", "marcacoes:visualizar:proprio"],
  },
  {
    id: "/marcacoes-brutas",
    label: "Marcações brutas",
    href: "/marcacoes-brutas",
    permissoes: [
      "marcacoes:gerenciar:seccional",
      "marcacoes:gerenciar:global",
      "afd:importar:seccional",
      "afd:importar:global",
    ],
  },
  {
    id: "/espelho-ponto",
    label: "Espelho de ponto",
    href: "/espelho-ponto",
    permissoes: [
      "espelho-ponto:visualizar:proprio",
      "apuracao:consultar:seccional",
      "apuracao:consultar:global",
    ],
  },
  {
    id: "/meu-contracheque",
    label: "Meu contracheque",
    href: "/meu-contracheque",
    permissoes: ["contracheque:consultar:proprio"],
  },
  {
    id: "/meus-afastamentos",
    label: "Meus afastamentos",
    href: "/meus-afastamentos",
    permissoes: ["afastamentos:consultar:proprio"],
  },
  {
    id: "/minhas-ferias",
    label: "Minhas férias",
    href: "/minhas-ferias",
    permissoes: [
      "programacao-ferias:consultar:proprio",
      "afastamentos:consultar:proprio",
    ],
  },
  {
    id: "/horas-extras",
    label: "Minhas horas extras",
    href: "/horas-extras",
    permissoes: [
      "horas-extras:visualizar:proprio",
      "horas-extras:solicitar:proprio",
    ],
  },
  {
    id: "/secap/horas-extras/autorizacoes",
    label: "Autorizações de horas extras",
    href: "/secap/horas-extras/autorizacoes",
    permissoes: [
      "horas-extras:cadastrar-autorizacao:seccional",
      "horas-extras:cadastrar-autorizacao:global",
      "horas-extras:visualizar-execucao:seccional",
      "horas-extras:visualizar-execucao:global",
    ],
  },
  {
    id: "/gestao/horas-extras",
    label: "Gestão de horas extras",
    href: "/gestao/horas-extras",
    permissoes: [
      "horas-extras:analisar:subordinados",
      "horas-extras:analisar:chefia",
    ],
  },
  {
    id: "/orcamento/horas-extras",
    label: "Orçamento de horas extras",
    href: "/orcamento/horas-extras",
    permissoes: [
      "horas-extras:responder-orcamento:seccional",
      "horas-extras:responder-orcamento:global",
    ],
  },
  {
    id: "/deliberacao/horas-extras",
    label: "Deliberação de horas extras",
    href: "/deliberacao/horas-extras",
    permissoes: [
      "horas-extras:deliberar:seccional",
      "horas-extras:deliberar:global",
    ],
  },
  {
    id: "/execucao/horas-extras",
    label: "Execução de horas extras",
    href: "/execucao/horas-extras",
    permissoes: [
      "horas-extras:visualizar-execucao:seccional",
      "horas-extras:visualizar-execucao:global",
    ],
  },
  {
    id: "/folha/horas-extras",
    label: "Folha de horas extras",
    href: "/folha/horas-extras",
    permissoes: [
      "horas-extras:visualizar-folha:seccional",
      "horas-extras:visualizar-folha:global",
      "horas-extras:gerar-lote:seccional",
      "horas-extras:gerar-lote:global",
    ],
  },
  {
    id: "/banco-horas",
    label: "Meu banco de horas",
    href: "/banco-horas",
    permissoes: [
      "banco-horas:visualizar:proprio",
      "banco-horas:consultar:proprio",
      "banco-horas:consultar:subordinados",
      "banco-horas:consultar:seccional",
      "banco-horas:consultar:global",
      "banco-horas:consultar:chefia",
    ],
  },
  {
    id: "/banco-horas/solicitacoes",
    label: "Solicitações de banco de horas",
    href: "/banco-horas/solicitacoes",
    permissoes: ["solicitacoes:criar:proprio"],
  },
  {
    id: "/banco-horas/chefia",
    label: "Banco de horas da chefia",
    href: "/banco-horas/chefia",
    permissoes: [
      "banco-horas:consultar:subordinados",
      "banco-horas:consultar:chefia",
    ],
  },
  {
    id: "/banco-horas/vencimentos",
    label: "Vencimentos",
    href: "/banco-horas/vencimentos",
    permissoes: [
      "banco-horas:consultar:proprio",
      "banco-horas:consultar:subordinados",
      "banco-horas:consultar:seccional",
      "banco-horas:consultar:global",
      "banco-horas:consultar:chefia",
    ],
  },
  {
    id: "/banco-horas/relatorios",
    label: "Relatórios de banco de horas",
    href: "/banco-horas/relatorios",
    permissoes: [
      "relatorios:consultar:proprio",
      "relatorios:consultar:seccional",
      "relatorios:consultar:global",
      "relatorios-gerenciais:consultar:subordinados",
      "relatorios-gerenciais:consultar:seccional",
      "relatorios-gerenciais:consultar:global",
      "relatorios-gerenciais:consultar:chefia",
    ],
  },
  {
    id: "/minha-equipe/ferias",
    label: "Programação de férias",
    href: "/minha-equipe/ferias",
    permissoes: [
      "programacao-ferias:consultar:subordinados",
      "programacao-ferias:consultar:seccional",
      "programacao-ferias:consultar:global",
    ],
  },
  {
    id: "/minha-equipe/presencas",
    label: "Presentes, ausentes e licenças",
    href: "/minha-equipe/presencas",
    permissoes: [
      "minha-equipe:consultar:subordinados",
      "minha-equipe:consultar:seccional",
      "minha-equipe:consultar:global",
      "minha-equipe:consultar:chefia",
    ],
  },
  {
    id: "/homologacao",
    label: "Homologação",
    href: "/homologacao",
    permissoes: [
      "homologacao:gerenciar:subordinados",
      "homologacao:consultar:seccional",
      "homologacao:gerenciar:seccional",
      "homologacao:consultar:global",
      "homologacao:gerenciar:global",
      "homologacao:gerenciar:chefia",
    ],
  },
  {
    id: "/solicitacoes",
    label: "Solicitações de ajuste",
    href: "/solicitacoes",
    permissoes: [
      "solicitacoes:criar:proprio",
      "solicitacoes:consultar:proprio",
      "solicitacoes:analisar:subordinados",
      "solicitacoes:consultar:seccional",
      "solicitacoes:consultar:global",
      "solicitacoes:analisar:chefia",
    ],
  },
  {
    id: "/recesso-forense",
    label: "Recesso forense",
    href: "/recesso-forense",
    permissoes: [
      "recesso:consultar:proprio",
      "recesso:consultar:seccional",
      "recesso:gerenciar:seccional",
      "recesso:homologar:subordinados",
      "recesso:aceitar:seccional",
      "recesso:consultar:global",
      "recesso:gerenciar:global",
      "recesso:homologar:chefia",
    ],
  },
  {
    id: "/relatorios",
    label: "Relatórios",
    href: "/relatorios",
    permissoes: [
      "relatorios:consultar:proprio",
      "relatorios:consultar:seccional",
      "relatorios:consultar:global",
      "relatorios-gerenciais:consultar:proprio",
      "relatorios-gerenciais:consultar:subordinados",
      "relatorios-gerenciais:consultar:seccional",
      "relatorios-gerenciais:consultar:global",
      "relatorios-gerenciais:consultar:chefia",
    ],
  },
  {
    id: "/boletim-frequencia",
    label: "Boletim de frequência",
    href: "/boletim-frequencia",
    permissoes: [
      "boletim-frequencia:gerar:subordinados",
      "boletim-frequencia:encaminhar:subordinados",
      "boletim-frequencia:receber:seccional",
      "boletim-frequencia:consultar:seccional",
      "boletim-frequencia:receber:global",
      "boletim-frequencia:consultar:global",
      "boletim-frequencia:gerar:chefia",
      "boletim-frequencia:encaminhar:chefia",
    ],
  },
  {
    id: "/painel-executivo",
    label: "Painel executivo",
    href: "/painel-executivo",
    permissoes: [
      "painel-executivo:consultar:seccional",
      "painel-executivo:consultar:global",
    ],
  },
  {
    id: "/biometria",
    label: "Biometria facial",
    href: "/biometria",
    permissoes: [
      "biometriafacial:cadastrar:proprio",
      "biometriafacial:cadastrar:seccional",
      "biometriafacial:recadastrar:seccional",
      "biometriafacial:visualizar:global",
      "biometriafacial:invalidar:global",
    ],
  },
  {
    id: "/totem",
    label: "Modo Totem",
    href: "/totem",
    permissoes: [
      "marcacoes:registrar-totem:seccional",
      "marcacoes:registrar-totem:global",
      "marcacoes:gerenciar:seccional",
      "marcacoes:gerenciar:global",
    ],
  },
  {
    id: "/administracao",
    label: "Administração",
    href: "/administracao",
    permissoes: [
      "configuracoes:gerenciar:seccional",
      "configuracoes:gerenciar:global",
    ],
  },
  {
    id: "/administracao/liberacao-rotinas",
    label: "Liberação de rotinas",
    href: "/administracao/liberacao-rotinas",
    permissoes: [
      "configuracoes:gerenciar:seccional",
      "configuracoes:gerenciar:global",
    ],
  },
  {
    id: "/perfis",
    label: "Perfis e permissões",
    href: "/perfis",
    permissoes: ["perfis:gerenciar:seccional", "perfis:gerenciar:global"],
  },
  {
    id: "/usuarios",
    label: "Usuários",
    href: "/usuarios",
    permissoes: [
      "usuarios:gerenciar:seccional",
      "usuarios:consultar:seccional",
      "usuarios:gerenciar:global",
      "usuarios:consultar:global",
    ],
  },
  {
    id: "/orgaos",
    label: "Órgãos",
    href: "/orgaos",
    permissoes: ["unidades:gerenciar:seccional", "unidades:gerenciar:global"],
  },
  {
    id: "/unidades",
    label: "Unidades",
    href: "/unidades",
    permissoes: ["unidades:gerenciar:seccional", "unidades:gerenciar:global"],
  },
  {
    id: "/servidores",
    label: "Servidores",
    href: "/servidores",
    permissoes: [
      "servidores:gerenciar:seccional",
      "servidores:consultar:seccional",
      "servidores:gerenciar:global",
      "servidores:consultar:global",
    ],
  },
  {
    id: "/estagiarios",
    label: "Estagiários",
    href: "/estagiarios",
    permissoes: [
      "servidores:gerenciar:seccional",
      "servidores:consultar:seccional",
      "servidores:gerenciar:global",
      "servidores:consultar:global",
    ],
  },
  {
    id: "/prestadores",
    label: "Prestadores",
    href: "/prestadores",
    permissoes: [
      "servidores:gerenciar:seccional",
      "servidores:consultar:seccional",
      "servidores:gerenciar:global",
      "servidores:consultar:global",
    ],
  },
  {
    id: "/voluntarios",
    label: "Voluntários",
    href: "/voluntarios",
    permissoes: [
      "servidores:gerenciar:seccional",
      "servidores:consultar:seccional",
      "servidores:gerenciar:global",
      "servidores:consultar:global",
    ],
  },
  {
    id: "/chefias",
    label: "Chefias",
    href: "/chefias",
    permissoes: ["chefias:gerenciar:seccional", "chefias:gerenciar:global"],
  },
  {
    id: "/administracao/substituicoes-funcao",
    label: "Substituições de função",
    href: "/administracao/substituicoes-funcao",
    permissoes: [
      "substituicoes-funcao:consultar:seccional",
      "substituicoes-funcao:gerenciar:seccional",
      "substituicoes-funcao:consultar:global",
      "substituicoes-funcao:gerenciar:global",
    ],
  },
  {
    id: "/substituicoes-funcao/relatorio",
    label: "Relatório de substituições",
    href: "/substituicoes-funcao/relatorio",
    permissoes: [
      "substituicoes-funcao:relatorio:proprio",
      "substituicoes-funcao:relatorio:subordinados",
      "substituicoes-funcao:relatorio:seccional",
      "substituicoes-funcao:relatorio:global",
    ],
  },
  {
    id: "/jornadas",
    label: "Jornadas",
    href: "/jornadas",
    permissoes: ["jornadas:gerenciar:seccional", "jornadas:gerenciar:global"],
  },
  {
    id: "/afd",
    label: "AFD",
    href: "/afd",
    permissoes: ["afd:importar:seccional", "afd:importar:global"],
  },
  {
    id: "/apuracao",
    label: "Apuração",
    href: "/apuracao",
    permissoes: [
      "apuracao:consultar:seccional",
      "apuracao:recalcular:seccional",
      "apuracao:consultar:global",
      "apuracao:recalcular:global",
    ],
  },
  {
    id: "/administracao/regulamentacao-ponto",
    label: "Regulamentação do ponto",
    href: "/administracao/regulamentacao-ponto",
    permissoes: [
      "regulamentacao-ponto:gerenciar:seccional",
      "regulamentacao-ponto:gerenciar:global",
    ],
  },
  {
    id: "/administracao/procedimentos-frequencia",
    label: "Procedimentos de frequência",
    href: "/administracao/procedimentos-frequencia",
    permissoes: [
      "procedimentos-frequencia:consultar:seccional",
      "procedimentos-frequencia:gerenciar:seccional",
      "procedimentos-frequencia:consultar:global",
      "procedimentos-frequencia:gerenciar:global",
    ],
  },
  {
    id: "/administracao/procedimentos-frequencia/nada-consta",
    label: "Nada Consta de frequência",
    href: "/administracao/procedimentos-frequencia/nada-consta",
    permissoes: [
      "procedimentos-frequencia:emitir-nada-consta:seccional",
      "procedimentos-frequencia:emitir-nada-consta:global",
    ],
  },
  {
    id: "/administracao/banco-horas",
    label: "Banco de horas",
    href: "/administracao/banco-horas",
    permissoes: [
      "banco-horas:gerenciar:seccional",
      "banco-horas:gerenciar:global",
    ],
  },
  {
    id: "/administracao/horas-extras",
    label: "Horas extras",
    href: "/administracao/horas-extras",
    permissoes: [
      "horas-extras:configurar-politica:seccional",
      "horas-extras:configurar-workflow:seccional",
      "horas-extras:configurar-responsaveis:seccional",
      "horas-extras:configurar-politica:global",
      "horas-extras:configurar-workflow:global",
      "horas-extras:configurar-responsaveis:global",
    ],
  },
  {
    id: "/administracao/calendario",
    label: "Calendário institucional",
    href: "/administracao/calendario",
    permissoes: [
      "configuracoes:gerenciar:seccional",
      "configuracoes:gerenciar:global",
    ],
  },
  {
    id: "/administracao/fusos-horarios",
    label: "Fusos horários",
    href: "/administracao/fusos-horarios",
    permissoes: ["fusos-horarios:gerenciar:global"],
  },
  {
    id: "/administracao/integracoes",
    label: "Credenciais e integrações",
    href: "/administracao/integracoes",
    permissoes: [
      "integracoes:consultar:seccional",
      "integracoes:gerenciar:seccional",
      "integracoes:consultar:global",
      "integracoes:gerenciar:global",
    ],
  },
  {
    id: "/administracao/integracoes/sarh",
    label: "Integração SARH",
    href: "/administracao/integracoes/sarh",
    permissoes: [
      "integracoes:consultar:seccional",
      "integracoes:gerenciar:seccional",
      "integracoes:consultar:global",
      "integracoes:gerenciar:global",
      "integracoes-sarh:consultar:global",
      "integracoes-sarh:configurar:global",
      "integracoes-sarh:executar:global",
    ],
  },
  {
    id: "/administracao/integracoes/ldap",
    label: "Active Directory",
    href: "/administracao/integracoes/ldap",
    permissoes: ["integracoes:gerenciar:global"],
  },
  {
    id: "/administracao/integracoes/teams",
    label: "Microsoft Teams",
    href: "/administracao/integracoes/teams",
    permissoes: [
      "integracoes-teams:visualizar:global",
      "integracoes-teams:configurar:global",
    ],
  },
  {
    id: "/administracao/workers",
    label: "Saúde dos workers",
    href: "/administracao/workers",
    permissoes: [
      "configuracoes:gerenciar:seccional",
      "integracoes:gerenciar:seccional",
      "configuracoes:gerenciar:global",
      "integracoes:gerenciar:global",
    ],
  },
  {
    id: "/equipamentos",
    label: "Equipamentos biométricos",
    href: "/equipamentos",
    permissoes: [
      "integracoes:consultar:seccional",
      "integracoes:gerenciar:seccional",
      "integracoes:consultar:global",
      "integracoes:gerenciar:global",
    ],
  },
  {
    id: "/auditoria",
    label: "Auditoria",
    href: "/auditoria",
    permissoes: [
      "auditoria:consultar:seccional",
      "auditoria:detalhar:seccional",
      "auditoria:consultar:global",
      "auditoria:detalhar:global",
    ],
  },
  {
    id: "/administracao/personalizar-menu",
    label: "Personalizar menu",
    href: "/administracao/personalizar-menu",
    permissoes: ["menus:personalizar:seccional", "menus:personalizar:global"],
  },
];

export function buscarItemCatalogoMenu(id: string) {
  return MENU_CATALOGO.find((item) => item.id === id);
}
