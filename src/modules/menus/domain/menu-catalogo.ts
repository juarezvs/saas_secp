export type MenuCatalogoItem = {
  id: string;
  label: string;
  href: string;
  permissoes?: string[];
};

export const MENU_CATALOGO: MenuCatalogoItem[] = [
  { id: "/dashboard", label: "Inicio", href: "/dashboard" },
  { id: "/marcacoes/registrar", label: "Registrar Ponto", href: "/marcacoes/registrar", permissoes: ["marcacoes:registrar:proprio", "marcacoes:registrar-web:proprio"] },
  { id: "/marcacoes", label: "Ponto de Hoje", href: "/marcacoes", permissoes: ["marcacoes:consultar:proprio", "marcacoes:visualizar:proprio", "marcacoes:consultar:seccional", "marcacoes:consultar:global"] },
  { id: "/historico-marcacoes", label: "Historico de Marcacoes", href: "/historico-marcacoes", permissoes: ["marcacoes:consultar:proprio", "marcacoes:visualizar:proprio"] },
  { id: "/marcacoes-brutas", label: "Marcacoes brutas", href: "/marcacoes-brutas", permissoes: ["marcacoes:gerenciar:seccional", "marcacoes:gerenciar:global", "afd:importar:seccional", "afd:importar:global"] },
  { id: "/espelho-ponto", label: "Espelho de ponto", href: "/espelho-ponto", permissoes: ["espelho-ponto:visualizar:proprio", "apuracao:consultar:seccional", "apuracao:consultar:global"] },
  { id: "/meu-contracheque", label: "Meu contracheque", href: "/meu-contracheque", permissoes: ["contracheque:consultar:proprio"] },
  { id: "/meus-afastamentos", label: "Meus afastamentos", href: "/meus-afastamentos", permissoes: ["afastamentos:consultar:proprio"] },
  { id: "/minhas-ferias", label: "Minhas ferias", href: "/minhas-ferias", permissoes: ["programacao-ferias:consultar:proprio", "afastamentos:consultar:proprio"] },
  { id: "/horas-extras", label: "Horas extras - Minhas solicitacoes", href: "/horas-extras", permissoes: ["horas-extras:visualizar:proprio", "horas-extras:solicitar:proprio"] },
  { id: "/gestao/horas-extras", label: "Horas extras - Gestao", href: "/gestao/horas-extras", permissoes: ["horas-extras:analisar:subordinados", "horas-extras:analisar:chefia"] },
  { id: "/orcamento/horas-extras", label: "Horas extras - Orcamento", href: "/orcamento/horas-extras", permissoes: ["horas-extras:responder-orcamento:seccional", "horas-extras:responder-orcamento:global"] },
  { id: "/deliberacao/horas-extras", label: "Horas extras - Deliberacao", href: "/deliberacao/horas-extras", permissoes: ["horas-extras:deliberar:seccional", "horas-extras:deliberar:global"] },
  { id: "/execucao/horas-extras", label: "Horas extras - Execucao", href: "/execucao/horas-extras", permissoes: ["horas-extras:visualizar-execucao:seccional", "horas-extras:visualizar-execucao:global"] },
  { id: "/folha/horas-extras", label: "Horas extras - Folha", href: "/folha/horas-extras", permissoes: ["horas-extras:visualizar-folha:seccional", "horas-extras:visualizar-folha:global", "horas-extras:gerar-lote:seccional", "horas-extras:gerar-lote:global"] },
  { id: "/banco-horas", label: "Meu banco", href: "/banco-horas", permissoes: ["banco-horas:visualizar:proprio", "banco-horas:consultar:proprio", "banco-horas:consultar:subordinados", "banco-horas:consultar:seccional", "banco-horas:consultar:global", "banco-horas:consultar:chefia"] },
  { id: "/banco-horas/solicitacoes", label: "Solicitacoes de banco de horas", href: "/banco-horas/solicitacoes", permissoes: ["solicitacoes:criar:proprio"] },
  { id: "/banco-horas/chefia", label: "Painel da chefia", href: "/banco-horas/chefia", permissoes: ["banco-horas:consultar:subordinados", "banco-horas:consultar:chefia"] },
  { id: "/banco-horas/vencimentos", label: "Vencimentos", href: "/banco-horas/vencimentos", permissoes: ["banco-horas:consultar:proprio", "banco-horas:consultar:subordinados", "banco-horas:consultar:seccional", "banco-horas:consultar:global", "banco-horas:consultar:chefia"] },
  { id: "/banco-horas/relatorios", label: "Relatorios de banco de horas", href: "/banco-horas/relatorios", permissoes: ["relatorios:consultar:proprio", "relatorios:consultar:seccional", "relatorios:consultar:global", "relatorios-gerenciais:consultar:subordinados", "relatorios-gerenciais:consultar:seccional", "relatorios-gerenciais:consultar:global", "relatorios-gerenciais:consultar:chefia"] },
  { id: "/minha-equipe/ferias", label: "Programacao de Ferias", href: "/minha-equipe/ferias", permissoes: ["programacao-ferias:consultar:subordinados", "programacao-ferias:consultar:seccional", "programacao-ferias:consultar:global"] },
  { id: "/minha-equipe/presencas", label: "Presentes/Ausentes/Licencas", href: "/minha-equipe/presencas", permissoes: ["minha-equipe:consultar:subordinados", "minha-equipe:consultar:seccional", "minha-equipe:consultar:global", "minha-equipe:consultar:chefia"] },
  { id: "/homologacao", label: "Homologacao", href: "/homologacao", permissoes: ["homologacao:gerenciar:subordinados", "homologacao:consultar:seccional", "homologacao:gerenciar:seccional", "homologacao:consultar:global", "homologacao:gerenciar:global", "homologacao:gerenciar:chefia"] },
  { id: "/solicitacoes", label: "Solicitacoes de ajuste", href: "/solicitacoes", permissoes: ["solicitacoes:criar:proprio", "solicitacoes:consultar:proprio", "solicitacoes:analisar:subordinados", "solicitacoes:consultar:seccional", "solicitacoes:consultar:global", "solicitacoes:analisar:chefia"] },
  { id: "/recesso-forense", label: "Recesso Forense", href: "/recesso-forense", permissoes: ["recesso:consultar:proprio", "recesso:consultar:seccional", "recesso:gerenciar:seccional", "recesso:homologar:subordinados", "recesso:aceitar:seccional", "recesso:consultar:global", "recesso:gerenciar:global", "recesso:homologar:chefia", "recesso:aceitar:secad"] },
  { id: "/relatorios", label: "Relatorios", href: "/relatorios", permissoes: ["relatorios:consultar:proprio", "relatorios:consultar:seccional", "relatorios:consultar:global", "relatorios-gerenciais:consultar:proprio", "relatorios-gerenciais:consultar:subordinados", "relatorios-gerenciais:consultar:seccional", "relatorios-gerenciais:consultar:global", "relatorios-gerenciais:consultar:chefia"] },
  { id: "/boletim-frequencia", label: "Boletim de frequencia", href: "/boletim-frequencia", permissoes: ["boletim-frequencia:gerar:subordinados", "boletim-frequencia:encaminhar:subordinados", "boletim-frequencia:receber:seccional", "boletim-frequencia:consultar:seccional", "boletim-frequencia:receber:global", "boletim-frequencia:consultar:global", "boletim-frequencia:gerar:chefia", "boletim-frequencia:encaminhar:chefia"] },
  { id: "/painel-executivo", label: "Painel executivo", href: "/painel-executivo", permissoes: ["painel-executivo:consultar:seccional", "painel-executivo:consultar:global"] },
  { id: "/biometria", label: "Biometria facial", href: "/biometria", permissoes: ["biometriafacial:cadastrar:proprio", "biometriafacial:cadastrar:seccional", "biometriafacial:recadastrar:seccional", "biometriafacial:visualizar:global", "biometriafacial:invalidar:global"] },
  { id: "/administracao", label: "Administracao", href: "/administracao", permissoes: ["configuracoes:gerenciar:seccional", "configuracoes:gerenciar:global"] },
  { id: "/administracao/liberacao-rotinas", label: "Liberacao de Rotinas", href: "/administracao/liberacao-rotinas", permissoes: ["configuracoes:gerenciar:seccional", "configuracoes:gerenciar:global"] },
  { id: "/perfis", label: "Perfis e permissoes", href: "/perfis", permissoes: ["perfis:gerenciar:seccional", "perfis:gerenciar:global"] },
  { id: "/usuarios", label: "Usuarios", href: "/usuarios", permissoes: ["usuarios:gerenciar:seccional", "usuarios:consultar:seccional", "usuarios:gerenciar:global", "usuarios:consultar:global"] },
  { id: "/orgaos", label: "Orgaos", href: "/orgaos", permissoes: ["unidades:gerenciar:seccional", "unidades:gerenciar:global"] },
  { id: "/unidades", label: "Unidades", href: "/unidades", permissoes: ["unidades:gerenciar:seccional", "unidades:gerenciar:global"] },
  { id: "/servidores", label: "Servidores", href: "/servidores", permissoes: ["servidores:gerenciar:seccional", "servidores:consultar:seccional", "servidores:gerenciar:global", "servidores:consultar:global"] },
  { id: "/estagiarios", label: "Estagiarios", href: "/estagiarios", permissoes: ["servidores:gerenciar:seccional", "servidores:consultar:seccional", "servidores:gerenciar:global", "servidores:consultar:global"] },
  { id: "/prestadores", label: "Prestadores", href: "/prestadores", permissoes: ["servidores:gerenciar:seccional", "servidores:consultar:seccional", "servidores:gerenciar:global", "servidores:consultar:global"] },
  { id: "/voluntarios", label: "Voluntarios", href: "/voluntarios", permissoes: ["servidores:gerenciar:seccional", "servidores:consultar:seccional", "servidores:gerenciar:global", "servidores:consultar:global"] },
  { id: "/chefias", label: "Chefias", href: "/chefias", permissoes: ["chefias:gerenciar:seccional", "chefias:gerenciar:global"] },
  { id: "/jornadas", label: "Jornadas", href: "/jornadas", permissoes: ["jornadas:gerenciar:seccional", "jornadas:gerenciar:global"] },
  { id: "/afd", label: "AFD", href: "/afd", permissoes: ["afd:importar:seccional", "afd:importar:global"] },
  { id: "/apuracao", label: "Apuracao", href: "/apuracao", permissoes: ["apuracao:consultar:seccional", "apuracao:recalcular:seccional", "apuracao:consultar:global", "apuracao:recalcular:global"] },
  { id: "/administracao/regulamentacao-ponto", label: "Regulamentacao do ponto", href: "/administracao/regulamentacao-ponto", permissoes: ["regulamentacao-ponto:gerenciar:seccional", "regulamentacao-ponto:gerenciar:global"] },
  { id: "/administracao/banco-horas", label: "Gerenciar banco de horas", href: "/administracao/banco-horas", permissoes: ["banco-horas:gerenciar:seccional", "banco-horas:gerenciar:global"] },
  { id: "/administracao/horas-extras", label: "Horas extras", href: "/administracao/horas-extras", permissoes: ["horas-extras:configurar-politica:seccional", "horas-extras:configurar-workflow:seccional", "horas-extras:configurar-responsaveis:seccional", "horas-extras:configurar-politica:global", "horas-extras:configurar-workflow:global", "horas-extras:configurar-responsaveis:global"] },
  { id: "/administracao/calendario", label: "Calendario institucional", href: "/administracao/calendario", permissoes: ["configuracoes:gerenciar:seccional", "configuracoes:gerenciar:global"] },
  { id: "/administracao/integracoes", label: "Credenciais e integracoes", href: "/administracao/integracoes", permissoes: ["integracoes:consultar:seccional", "integracoes:gerenciar:seccional", "integracoes:consultar:global", "integracoes:gerenciar:global"] },
  { id: "/administracao/workers", label: "Saude dos Workers", href: "/administracao/workers", permissoes: ["configuracoes:gerenciar:seccional", "integracoes:gerenciar:seccional", "configuracoes:gerenciar:global", "integracoes:gerenciar:global"] },
  { id: "/equipamentos", label: "Equipamentos biometricos", href: "/equipamentos", permissoes: ["integracoes:consultar:seccional", "integracoes:gerenciar:seccional", "integracoes:consultar:global", "integracoes:gerenciar:global"] },
  { id: "/auditoria", label: "Auditoria", href: "/auditoria", permissoes: ["auditoria:consultar:seccional", "auditoria:detalhar:seccional", "auditoria:consultar:global", "auditoria:detalhar:global"] },
  { id: "/administracao/personalizar-menu", label: "Personalizar Menu", href: "/administracao/personalizar-menu", permissoes: ["menus:personalizar:seccional", "menus:personalizar:global"] },
];

export function buscarItemCatalogoMenu(id: string) {
  return MENU_CATALOGO.find((item) => item.id === id);
}
