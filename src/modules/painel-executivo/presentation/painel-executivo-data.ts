import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  FileWarning,
  Gauge,
  Hourglass,
  Laptop,
  LineChart,
  MonitorCog,
  PieChart,
  Scale,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export const PERMISSAO_PAINEL_EXECUTIVO = "painel-executivo:consultar:global";
export const PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS =
  "painel-executivo:equipamentos:global";

export const permissoesSubmenusPainelExecutivo = {
  indicadores: "painel-executivo:indicadores:global",
  pendenciasDePonto: "painel-executivo:pendencias-de-ponto:global",
  frequenciaEAssiduidade: "painel-executivo:frequencia-e-assiduidade:global",
  justificativasEOcorrencias:
    "painel-executivo:justificativas-e-ocorrencias:global",
  controleDeHomologacaoMensal:
    "painel-executivo:controle-de-homologacao-mensal:global",
  jornadaECargaHoraria: "painel-executivo:jornada-e-carga-horaria:global",
  teletrabalhoPresencialRegistroWeb:
    "painel-executivo:teletrabalho-presencial-registro-web:global",
  equipamentosDePonto: "painel-executivo:equipamentos-de-ponto:global",
  auditoriaEConformidade: "painel-executivo:auditoria-e-conformidade:global",
  indicadoresPorUnidadeEChefia:
    "painel-executivo:indicadores-por-unidade-e-chefia:global",
  alertasInteligentes: "painel-executivo:alertas-inteligentes:global",
  relatoriosExportaveis: "painel-executivo:relatorios-exportaveis:global",
  paineis: "painel-executivo:paineis:global",
  graficosImportantes: "painel-executivo:graficos-importantes:global",
  bancoDeHoras: "painel-executivo:banco-de-horas:global",
} as const;

export const PERMISSOES_SUBMENUS_PAINEL_EXECUTIVO = Object.values(
  permissoesSubmenusPainelExecutivo,
);

export type PainelExecutivoSecao = {
  slug: string;
  titulo: string;
  menuLabel: string;
  descricao: string;
  icon: LucideIcon;
  permissao?: string;
  indicadores: string[];
  acompanhamentos: string[];
  graficos: string[];
  alertas?: string[];
};

export const paineisExecutivos: PainelExecutivoSecao[] = [
  {
    slug: "indicadores",
    titulo: "Indicadores do mês",
    menuLabel: "Indicadores",
    descricao:
      "Resumo executivo para acompanhar conformidade, envio, aprovação e homologação dos espelhos no mês corrente.",
    icon: Gauge,
    permissao: permissoesSubmenusPainelExecutivo.indicadores,
    indicadores: [
      "Total de servidores ativos",
      "Servidores com ponto regular",
      "Servidores com pendências",
      "Espelhos enviados",
      "Espelhos aprovados pela chefia",
      "Espelhos devolvidos ou indeferidos",
      "Espelhos homologados pelo RH",
      "Percentual de fechamento mensal",
    ],
    acompanhamentos: [
      "Situação dos espelhos por etapa",
      "Unidades com maior volume de pendências",
      "Evolução diária do fechamento mensal",
    ],
    graficos: [
      "Rosca de situação dos espelhos: não enviado, enviado, aprovado, devolvido e homologado",
      "Barras de pendências por unidade ou setor",
      "Linha do tempo da evolução diária do fechamento",
    ],
  },
  {
    slug: "pendencias-de-ponto",
    titulo: "Pendências de ponto",
    menuLabel: "Pendências de ponto",
    descricao:
      "Painel operacional para localizar inconsistências impeditivas do fechamento e priorizar atuação do RH.",
    icon: FileWarning,
    permissao: permissoesSubmenusPainelExecutivo.pendenciasDePonto,
    indicadores: [
      "Falta de marcação de entrada",
      "Falta de marcação de saída",
      "Marcações impares",
      "Jornada inferior a prevista",
      "Jornada superior a prevista",
      "Ausência sem justificativa",
      "Ponto sem espelho enviado",
      "Ponto aguardando chefia",
      "Ponto devolvido ao servidor",
    ],
    acompanhamentos: [
      "Ranking de unidades com mais pendências",
      "Tipos de pendência mais frequentes",
      "Dias do mês com maior concentração de inconsistências",
    ],
    graficos: [
      "Ranking de unidades com mais pendências",
      "Ranking de tipos de pendência",
      "Mapa de calor por dia do mês",
      "Tendencia de pendências mês a mês",
    ],
  },
  {
    slug: "frequencia-e-assiduidade",
    titulo: "Frequência e assiduidade",
    menuLabel: "Frequência e assiduidade",
    descricao:
      "Visão gerencial de presença, atrasos, saídas antecipadas, afastamentos e reincidências.",
    icon: UsersRound,
    permissao: permissoesSubmenusPainelExecutivo.frequenciaEAssiduidade,
    indicadores: [
      "Dias trabalhados",
      "Dias com ausência justificada",
      "Dias com ausência injustificada",
      "Atrasos recorrentes",
      "Saídas antecipadas",
      "Servidores com reincidência",
      "Índice de assiduidade por unidade",
    ],
    acompanhamentos: [
      "Comportamento mensal de ausências",
      "Comparativo por unidade",
      "Calendário mensal por situação funcional",
    ],
    graficos: [
      "Linha mensal de ausências",
      "Barras por unidade: atrasos, saídas antecipadas e faltas",
      "Ranking de reincidência restrito ao RH e chefias",
      "Calendário mensal do servidor por cor de situação",
    ],
  },
  {
    slug: "justificativas-e-ocorrencias",
    titulo: "Justificativas e ocorrências",
    menuLabel: "Justificativas e ocorrências",
    descricao:
      "Acompanhamento de solicitações, decisoes e motivos que mais geram intervencao no ponto.",
    icon: ClipboardCheck,
    permissao: permissoesSubmenusPainelExecutivo.justificativasEOcorrencias,
    indicadores: [
      "Justificativas abertas",
      "Justificativas deferidas",
      "Justificativas indeferidas",
      "Justificativas devolvidas",
      "Tempo médio de análise",
    ],
    acompanhamentos: [
      "Esquecimento de batida",
      "Serviço externo",
      "Problema técnico",
      "Afastamento",
      "Compensação",
      "Autorização excepcional",
    ],
    graficos: [
      "Justificativas por tipo",
      "Volume de justificativas por unidade",
      "Evolução mensal das justificativas",
      "Tempo médio de análise por chefia",
    ],
  },
  {
    slug: "controle-de-homologacao-mensal",
    titulo: "Controle de homologação mensal",
    menuLabel: "Controle de homologação mensal",
    descricao:
      "Fluxo de fechamento mensal com filtros por competência, unidade, gestor, servidor, situação, vínculo e localidade.",
    icon: CheckCircle2,
    permissao: permissoesSubmenusPainelExecutivo.controleDeHomologacaoMensal,
    indicadores: [
      "Servidores que ainda não enviaram espelho",
      "Chefias com aprovações pendentes",
      "Espelhos devolvidos",
      "Espelhos aprovados aguardando RH",
      "Espelhos homologados",
    ],
    acompanhamentos: [
      "Cobrança direta de servidores pendentes",
      "Cobrança por unidade e chefia",
      "Fila de homologação do RH",
    ],
    graficos: [
      "Funil de homologação: servidor enviou, chefia aprovou, RH homologou",
      "Ranking de unidades atrasadas",
      "Percentual de homologação por unidade",
      "Linha de evolução do fechamento até o prazo final",
    ],
  },
  {
    slug: "jornada-e-carga-horaria",
    titulo: "Jornada e carga horaria",
    menuLabel: "Jornada e carga horaria",
    descricao:
      "Painel de aderencia entre jornada prevista, jornada realizada, créditos, débitos e jornadas especiais.",
    icon: Clock3,
    permissao: permissoesSubmenusPainelExecutivo.jornadaECargaHoraria,
    indicadores: [
      "Jornada prevista",
      "Jornada realizada",
      "Diferenca diária",
      "Diferenca mensal",
      "Servidores com jornada especial",
      "Servidores em teletrabalho",
      "Servidores com horário personalizado",
    ],
    acompanhamentos: [
      "Previsto x realizado por servidor",
      "Previsto x realizado por unidade",
      "Distribuição de jornadas",
    ],
    graficos: [
      "Previsto x realizado por servidor",
      "Previsto x realizado por unidade",
      "Distribuição de jornadas: 6h, 7h, 8h e especial",
      "Mapa de calor de horários de entrada e saída",
      "Dispersao de horários de entrada",
    ],
  },
  {
    slug: "teletrabalho-presencial-registro-web",
    titulo: "Teletrabalho, presencial e registro web",
    menuLabel: "Teletrabalho, trabalho presencial e registro web",
    descricao:
      "Monitoramento da origem das marcações e de usos excepcionais, remotos ou fora do padrão institucional.",
    icon: Laptop,
    permissao: permissoesSubmenusPainelExecutivo.teletrabalhoPresencialRegistroWeb,
    indicadores: [
      "Marcações por relógio biometrico",
      "Marcações por web",
      "Marcações por reconhecimento facial",
      "Marcações importadas",
      "Marcações manuais",
      "Marcações fora da unidade",
    ],
    acompanhamentos: [
      "Uso de registro remoto/autorizado",
      "Marcações excepcionais por servidor",
      "Unidades com maior dependência de registro web",
    ],
    graficos: [
      "Barras por origem da marcação",
      "Mapa por unidade ou localidade",
      "Linha mensal de registros web",
      "Ranking de servidores com maior uso excepcional",
    ],
  },
  {
    slug: "equipamentos-de-ponto",
    titulo: "Equipamentos de ponto",
    menuLabel: "Equipamentos de ponto",
    descricao:
      "Painel técnico de saúde dos relógios, sincronizacoes, AFD, divergências e falhas de comunicação.",
    icon: MonitorCog,
    permissao: permissoesSubmenusPainelExecutivo.equipamentosDePonto,
    indicadores: [
      "Equipamentos ativos",
      "Equipamentos sem comunicação",
      "Última sincronização",
      "Marcações recebidas por equipamento",
      "Divergência de horário",
      "NSR inicial e final por período",
      "Falhas de importação AFD",
    ],
    acompanhamentos: [
      "Status operacional por equipamento",
      "Integridade da coleta",
      "Unidades com equipamentos inativos",
    ],
    graficos: [
      "Status dos equipamentos: online, offline e instável",
      "Volume de marcações por equipamento",
      "Linha de falhas de comunicação",
      "Mapa das unidades com equipamentos inativos",
    ],
  },
  {
    slug: "auditoria-e-conformidade",
    titulo: "Auditoria e conformidade",
    menuLabel: "Auditoria e conformidade",
    descricao:
      "Trilha restrita para eventos sensíveis, alterações administrativas e rastreabilidade de decisoes.",
    icon: ShieldCheck,
    permissao: permissoesSubmenusPainelExecutivo.auditoriaEConformidade,
    indicadores: [
      "Alteração manual de ponto",
      "Exclusão lógica ou cancelamento de marcação",
      "Justificativa deferida pela chefia",
      "Homologação pelo RH",
      "Reabertura de período homologado",
      "Alteração de jornada",
      "Alteração de lotação ou chefia",
      "Alteração de permissão de registro web ou facial",
    ],
    acompanhamentos: [
      "Quem fez",
      "Quando fez",
      "IP ou dispositivo",
      "Valor anterior e novo valor",
      "Justificativa e processo SEI vinculado",
    ],
    graficos: [
      "Alterações manuais por mês",
      "Usuarios administrativos com mais acoes no sistema",
      "Reaberturas de espelho por unidade",
      "Eventos críticos por tipo",
    ],
  },
  {
    slug: "indicadores-por-unidade-e-chefia",
    titulo: "Indicadores por unidade e chefia",
    menuLabel: "Indicadores por unidade e chefia",
    descricao:
      "Visão por unidade, chefia e hierarquia departamental para cobrança institucional e gestão imédiata.",
    icon: Building2,
    permissao: permissoesSubmenusPainelExecutivo.indicadoresPorUnidadeEChefia,
    indicadores: [
      "Servidores sob responsabilidade da chefia",
      "Pendências da equipe",
      "Aprovações pendentes",
      "Tempo médio de aprovação",
      "Espelhos devolvidos",
      "Percentual de regularidade da unidade",
    ],
    acompanhamentos: [
      "Visão RH por unidade",
      "Visão do gestor limitada a equipe subordinada",
      "Ranking institucional de regularidade",
    ],
    graficos: [
      "Ranking de unidades mais regulares",
      "Ranking de unidades com mais pendências",
      "Tempo médio de aprovação por chefia",
      "Percentual de espelhos homologados por unidade",
    ],
  },
  {
    slug: "alertas-inteligentes",
    titulo: "Alertas inteligentes",
    menuLabel: "Alertas inteligentes",
    descricao:
      "Lista priorizada de alertas para ação imédiata no sistema, e-mail ou painel interno.",
    icon: AlertTriangle,
    permissao: permissoesSubmenusPainelExecutivo.alertasInteligentes,
    indicadores: [
      "Servidor sem marcação no dia",
      "Marcação incompleta",
      "Espelho não enviado",
      "Chefia não aprovou",
      "Banco de horas negativo crítico",
      "Banco de horas positivo excessivo",
      "Equipamento sem comunicação",
      "Registro web fora do padrão",
      "Reabertura de período homologado",
      "Alteração manual recorrente",
    ],
    acompanhamentos: [
      "Prazo de fechamento",
      "Criticidade administrativa",
      "Recorrencia por unidade",
    ],
    graficos: [
      "Alertas por criticidade",
      "Alertas por unidade",
      "Evolução de alertas no mês",
    ],
    alertas: [
      "Banco de horas acima do limite definido",
      "Unidade com crescimento anormal de créditos",
      "Equipamento sem sincronização ha várias horas",
      "Registro manual recorrente",
    ],
  },
  {
    slug: "relatorios-exportaveis",
    titulo: "Relatórios exportáveis",
    menuLabel: "Relatórios exportáveis",
    descricao:
      "Catálogo executivo para exportar visoes analíticas, sintéticas, por servidor, unidade, mês consolidado e instrução SEI.",
    icon: Download,
    permissao: permissoesSubmenusPainelExecutivo.relatoriosExportaveis,
    indicadores: [
      "PDF",
      "Excel/XLSX",
      "CSV",
      "Relatorio analítico",
      "Relatorio sintético",
      "Relatorio por servidor",
      "Relatorio por unidade",
      "Relatorio mensal consolidado",
      "Relatorio para processo SEI",
    ],
    acompanhamentos: [
      "Espelho de ponto mensal",
      "Pendências por servidor",
      "Pendências por unidade",
      "Banco de horas",
      "Justificativas",
      "Homologação mensal",
      "Auditoria de alterações",
      "Equipamentos",
    ],
    graficos: [
      "Fila de relatórios disponíveis",
      "Exportações por tipo",
      "Relatórios mais usados pelo RH",
    ],
  },
  {
    slug: "paineis",
    titulo: "Painéis do RH",
    menuLabel: "Painéis",
    descricao:
      "Composição ideal do painel do RH no SECP, dividido por blocos de fechamento mensal e controle institucional.",
    icon: PieChart,
    permissao: permissoesSubmenusPainelExecutivo.paineis,
    indicadores: [
      "Resumo do mês",
      "Homologação",
      "Pendências",
      "Banco de horas",
      "Justificativas",
      "Origem das marcações",
      "Auditoria",
      "Equipamentos",
    ],
    acompanhamentos: [
      "Servidores ativos, pontos regulares e pendências",
      "Funil de envio, aprovação e homologação",
      "Pendências por tipo, unidade, servidor e criticidade",
      "Maiores saldos positivos e negativos",
      "Justificativas abertas, deferidas, indeferidas e tempo médio",
    ],
    graficos: [
      "Funil de fechamento mensal",
      "Rankings por unidade",
      "Evolução mensal",
      "Origem das marcações",
      "Status de equipamentos",
    ],
  },
  {
    slug: "graficos-importantes",
    titulo: "Gráficos importantes",
    menuLabel: "Gráficos importantes",
    descricao:
      "Fila de prioridades para iniciar o dashboard executivo com os gráficos de maior impacto operacional.",
    icon: BarChart3,
    permissao: permissoesSubmenusPainelExecutivo.graficosImportantes,
    indicadores: [
      "Funil de homologação mensal",
      "Pendências por unidade",
      "Pendências por tipo",
      "Banco de horas por servidor",
      "Evolução mensal de pendências",
      "Justificativas por situação",
      "Tempo médio de aprovação por chefia",
      "Origem das marcações",
      "Equipamentos offline ou com falha",
      "Eventos críticos de auditoria",
    ],
    acompanhamentos: [
      "Quem ainda não enviou",
      "Quem aguarda chefia",
      "Quem foi devolvido",
      "Quem já foi aprovado",
      "Quem já foi homologado",
      "Unidades atrasadas",
      "Pendências impeditivas",
    ],
    graficos: [
      "Não enviado -> enviado -> aprovado -> homologado",
      "Unidades onde o RH precisa atuar",
      "Principais problemas do ponto",
      "Saldos positivos e negativos críticos",
      "Casos que exigem atuação imédiata do RH",
    ],
  },
  {
    slug: "banco-de-horas",
    titulo: "Banco de horas",
    menuLabel: "Banco de horas",
    descricao:
      "Visão preventiva de créditos, débitos, compensações e saldos críticos por servidor e unidade.",
    icon: Hourglass,
    permissao: permissoesSubmenusPainelExecutivo.bancoDeHoras,
    indicadores: [
      "Saldo total positivo por servidor",
      "Saldo total negativo por servidor",
      "Servidores com saldo crítico",
      "Créditos gerados no mês",
      "Débitos gerados no mês",
      "Horas compensadas no mês",
      "Saldo por unidade",
    ],
    acompanhamentos: [
      "Saldo negativo acima do limite",
      "Saldo positivo acumulado demais",
      "Banco de horas próximo do prazo de expiração",
      "Unidade com crescimento anormal de créditos",
    ],
    graficos: [
      "Servidores com maiores saldos positivos",
      "Servidores com maiores saldos negativos",
      "Grafico empilhado por unidade: créditos, débitos e compensações",
      "Linha mensal da evolução institucional do banco de horas",
    ],
  },
];

export function buscarPainelExecutivoPorSlug(slug: string) {
  return paineisExecutivos.find((painel) => painel.slug === slug);
}

export const painelExecutivoInicial = paineisExecutivos[0];

export const painelExecutivoIconesResumo = [
  LineChart,
  Scale,
  ShieldCheck,
  Download,
];
