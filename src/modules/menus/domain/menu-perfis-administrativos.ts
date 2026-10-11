export type ItemMenuPerfilPadrao = {
  itemCatalogo: string;
  label?: string;
};

export type GrupoMenuPerfilPadrao = {
  chave: string;
  label: string;
  icone: string;
  ordem: number;
  itens: ItemMenuPerfilPadrao[];
};

export type MenuPerfilPadrao = {
  itensRaiz: ItemMenuPerfilPadrao[];
  grupos: GrupoMenuPerfilPadrao[];
};

const pessoasAdministrador: ItemMenuPerfilPadrao[] = [
  { itemCatalogo: "/usuarios", label: "Usuários da seccional" },
  { itemCatalogo: "/servidores", label: "Servidores da seccional" },
  { itemCatalogo: "/chefias", label: "Chefias e responsáveis" },
  { itemCatalogo: "/perfis", label: "Perfis e permissões da seccional" },
  { itemCatalogo: "/orgaos", label: "Órgãos e seccionais" },
  { itemCatalogo: "/unidades", label: "Unidades organizacionais" },
  {
    itemCatalogo: "/administracao/substituicoes-automaticas",
    label: "Substituições automáticas",
  },
  {
    itemCatalogo: "/administracao/substituicoes-funcao",
    label: "Substituições de função",
  },
  {
    itemCatalogo: "/substituicoes-funcao/relatorio",
    label: "Relatório de substituições",
  },
];

const pessoasMaster: ItemMenuPerfilPadrao[] = pessoasAdministrador
  .filter((item) => item.itemCatalogo !== "/perfis")
  .map((item) => {
    const labelsGlobais: Record<string, string> = {
      "/usuarios": "Usuários",
      "/servidores": "Servidores",
    };

    return {
      ...item,
      label: labelsGlobais[item.itemCatalogo] ?? item.label,
    };
  });

const frequencia: ItemMenuPerfilPadrao[] = [
  { itemCatalogo: "/marcacoes-brutas", label: "Marcações recebidas" },
  { itemCatalogo: "/manutencao/marcacoes", label: "Manutenção de marcações" },
  { itemCatalogo: "/afd", label: "Arquivos AFD" },
  { itemCatalogo: "/apuracao", label: "Apuração e recálculo" },
  { itemCatalogo: "/solicitacoes", label: "Solicitações de ajuste" },
  { itemCatalogo: "/homologacao", label: "Homologação de frequência" },
  { itemCatalogo: "/boletim-frequencia", label: "Boletim de frequência" },
];

const jornadasCalendario: ItemMenuPerfilPadrao[] = [
  { itemCatalogo: "/jornadas", label: "Jornadas e horários" },
  {
    itemCatalogo: "/administracao/regulamentacao-ponto",
    label: "Regulamentação do ponto",
  },
  {
    itemCatalogo: "/administracao/procedimentos-frequencia",
    label: "Procedimentos de frequência",
  },
  {
    itemCatalogo: "/administracao/procedimentos-frequencia/nada-consta",
    label: "Nada Consta de frequência",
  },
  {
    itemCatalogo: "/administracao/calendario",
    label: "Calendário institucional",
  },
  { itemCatalogo: "/recesso-forense", label: "Recesso forense" },
  {
    itemCatalogo: "/administracao/ferias/integracao-sarh",
    label: "Férias no SARH",
  },
];

const bancoHorasExtras: ItemMenuPerfilPadrao[] = [
  { itemCatalogo: "/banco-horas", label: "Consulta de banco de horas" },
  {
    itemCatalogo: "/administracao/banco-horas",
    label: "Configuração do banco de horas",
  },
  {
    itemCatalogo: "/administracao/horas-extras",
    label: "Configuração de horas extras",
  },
  { itemCatalogo: "/horas-extras/autorizacoes", label: "Autorizações" },
  { itemCatalogo: "/orcamento/horas-extras", label: "Orçamento" },
  { itemCatalogo: "/deliberacao/horas-extras", label: "Deliberação" },
  { itemCatalogo: "/execucao/horas-extras", label: "Execução" },
  { itemCatalogo: "/folha/horas-extras", label: "Folha" },
];

const cadastrosAuxiliares: ItemMenuPerfilPadrao[] = [
  {
    itemCatalogo: "/cadastros-auxiliares/tipos-feriados-suspensoes",
    label: "Tipos de feriados e suspensões",
  },
  {
    itemCatalogo: "/cadastros-auxiliares/estados-cidades",
    label: "Estados e cidades",
  },
  {
    itemCatalogo: "/cadastros-auxiliares/caracteristicas-pessoais",
    label: "Características pessoais",
  },
];

const controle: ItemMenuPerfilPadrao[] = [
  { itemCatalogo: "/painel-executivo", label: "Painel executivo" },
  { itemCatalogo: "/relatorios", label: "Relatórios gerenciais" },
  { itemCatalogo: "/auditoria", label: "Auditoria" },
];

export const MENUS_PERFIS_ADMINISTRATIVOS: Record<
  "ADMIN" | "MASTER",
  MenuPerfilPadrao
> = {
  ADMIN: {
    itensRaiz: [{ itemCatalogo: "/dashboard", label: "Visão geral" }],
    grupos: [
      {
        chave: "pessoas",
        label: "Pessoas e Acessos",
        icone: "UsersRound",
        ordem: 20,
        itens: pessoasAdministrador,
      },
      {
        chave: "frequencia",
        label: "Frequência e Ponto",
        icone: "Fingerprint",
        ordem: 30,
        itens: frequencia,
      },
      {
        chave: "jornadas",
        label: "Jornadas e Calendário",
        icone: "CalendarClock",
        ordem: 40,
        itens: jornadasCalendario,
      },
      {
        chave: "banco",
        label: "Banco de Horas e Horas Extras",
        icone: "Hourglass",
        ordem: 50,
        itens: bancoHorasExtras,
      },
      {
        chave: "cadastros",
        label: "Cadastros Auxiliares",
        icone: "ListChecks",
        ordem: 60,
        itens: cadastrosAuxiliares,
      },
      {
        chave: "integracoes",
        label: "Integrações e Equipamentos",
        icone: "PlugZap",
        ordem: 70,
        itens: [
          {
            itemCatalogo: "/administracao/integracoes",
            label: "Credenciais e integrações",
          },
          { itemCatalogo: "/equipamentos", label: "Equipamentos biométricos" },
          { itemCatalogo: "/biometria", label: "Biometria facial" },
          { itemCatalogo: "/totem", label: "Modo Totem" },
          {
            itemCatalogo: "/administracao/workers",
            label: "Saúde dos workers",
          },
        ],
      },
      {
        chave: "controle",
        label: "Relatórios e Controle",
        icone: "BarChart3",
        ordem: 80,
        itens: controle,
      },
      {
        chave: "configuracao",
        label: "Configuração da Seccional",
        icone: "Settings",
        ordem: 90,
        itens: [
          { itemCatalogo: "/administracao", label: "Central de administração" },
          {
            itemCatalogo: "/administracao/liberacao-rotinas",
            label: "Liberação de rotinas",
          },
          { itemCatalogo: "/administracao/suporte", label: "Suporte do login" },
          {
            itemCatalogo: "/administracao/personalizar-menu",
            label: "Personalizar menus",
          },
        ],
      },
    ],
  },
  MASTER: {
    itensRaiz: [{ itemCatalogo: "/dashboard", label: "Visão global" }],
    grupos: [
      {
        chave: "governanca",
        label: "Governança Global",
        icone: "ShieldCheck",
        ordem: 20,
        itens: [
          { itemCatalogo: "/administracao", label: "Administração global" },
          {
            itemCatalogo: "/administracao/configuracoes-globais",
            label: "Configurações globais",
          },
          { itemCatalogo: "/perfis", label: "Perfis e permissões globais" },
          {
            itemCatalogo: "/administracao/personalizar-menu",
            label: "Personalizar menus",
          },
          {
            itemCatalogo: "/administracao/liberacao-rotinas",
            label: "Liberação de rotinas",
          },
          { itemCatalogo: "/administracao/suporte", label: "Suporte do login" },
        ],
      },
      {
        chave: "pessoas",
        label: "Pessoas e Estrutura",
        icone: "UsersRound",
        ordem: 30,
        itens: pessoasMaster,
      },
      {
        chave: "frequencia",
        label: "Frequência e Apuração",
        icone: "Fingerprint",
        ordem: 40,
        itens: frequencia,
      },
      {
        chave: "jornadas",
        label: "Jornadas e Calendário",
        icone: "CalendarClock",
        ordem: 50,
        itens: jornadasCalendario,
      },
      {
        chave: "banco",
        label: "Banco de Horas e Horas Extras",
        icone: "Hourglass",
        ordem: 60,
        itens: bancoHorasExtras,
      },
      {
        chave: "cadastros",
        label: "Cadastros Auxiliares",
        icone: "ListChecks",
        ordem: 70,
        itens: cadastrosAuxiliares,
      },
      {
        chave: "integracoes",
        label: "Integrações e Infraestrutura",
        icone: "PlugZap",
        ordem: 80,
        itens: [
          {
            itemCatalogo: "/administracao/integracoes",
            label: "Credenciais e integrações",
          },
          {
            itemCatalogo: "/administracao/integracoes/sarh",
            label: "Integração SARH",
          },
          {
            itemCatalogo: "/administracao/integracoes/ldap",
            label: "Active Directory",
          },
          {
            itemCatalogo: "/administracao/integracoes/teams",
            label: "Microsoft Teams",
          },
          { itemCatalogo: "/equipamentos", label: "Equipamentos biométricos" },
          { itemCatalogo: "/biometria", label: "Biometria facial" },
          { itemCatalogo: "/totem", label: "Modo Totem" },
          {
            itemCatalogo: "/administracao/workers",
            label: "Saúde dos workers",
          },
          {
            itemCatalogo: "/administracao/fusos-horarios",
            label: "Fusos horários",
          },
        ],
      },
      {
        chave: "controle",
        label: "Controle e Auditoria",
        icone: "ShieldAlert",
        ordem: 90,
        itens: controle,
      },
    ],
  },
};

export function menuPadraoPerfilAdministrativo(codigo?: string | null) {
  const normalizado = codigo?.trim().toUpperCase();

  return normalizado === "ADMIN" || normalizado === "MASTER"
    ? MENUS_PERFIS_ADMINISTRATIVOS[normalizado]
    : null;
}
