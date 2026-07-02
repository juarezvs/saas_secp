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
    titulo: "Indicadores do mes",
    menuLabel: "Indicadores",
    descricao:
      "Resumo executivo para acompanhar conformidade, envio, aprovacao e homologacao dos espelhos no mes corrente.",
    icon: Gauge,
    indicadores: [
      "Total de servidores ativos",
      "Servidores com ponto regular",
      "Servidores com pendencias",
      "Espelhos enviados",
      "Espelhos aprovados pela chefia",
      "Espelhos devolvidos ou indeferidos",
      "Espelhos homologados pelo RH",
      "Percentual de fechamento mensal",
    ],
    acompanhamentos: [
      "Situacao dos espelhos por etapa",
      "Unidades com maior volume de pendencias",
      "Evolucao diaria do fechamento mensal",
    ],
    graficos: [
      "Rosca de situacao dos espelhos: nao enviado, enviado, aprovado, devolvido e homologado",
      "Barras de pendencias por unidade ou setor",
      "Linha do tempo da evolucao diaria do fechamento",
    ],
  },
  {
    slug: "pendencias-de-ponto",
    titulo: "Pendencias de ponto",
    menuLabel: "Pendencias de ponto",
    descricao:
      "Painel operacional para localizar inconsistencias impeditivas do fechamento e priorizar atuacao do RH.",
    icon: FileWarning,
    indicadores: [
      "Falta de marcacao de entrada",
      "Falta de marcacao de saida",
      "Marcacoes impares",
      "Jornada inferior a prevista",
      "Jornada superior a prevista",
      "Ausencia sem justificativa",
      "Ponto sem espelho enviado",
      "Ponto aguardando chefia",
      "Ponto devolvido ao servidor",
    ],
    acompanhamentos: [
      "Ranking de unidades com mais pendencias",
      "Tipos de pendencia mais frequentes",
      "Dias do mes com maior concentracao de inconsistencias",
    ],
    graficos: [
      "Ranking de unidades com mais pendencias",
      "Ranking de tipos de pendencia",
      "Mapa de calor por dia do mes",
      "Tendencia de pendencias mes a mes",
    ],
  },
  {
    slug: "frequencia-e-assiduidade",
    titulo: "Frequencia e assiduidade",
    menuLabel: "Frequencia e assiduidade",
    descricao:
      "Visao gerencial de presenca, atrasos, saidas antecipadas, afastamentos e reincidencias.",
    icon: UsersRound,
    indicadores: [
      "Dias trabalhados",
      "Dias com ausencia justificada",
      "Dias com ausencia injustificada",
      "Atrasos recorrentes",
      "Saidas antecipadas",
      "Servidores com reincidencia",
      "Indice de assiduidade por unidade",
    ],
    acompanhamentos: [
      "Comportamento mensal de ausencias",
      "Comparativo por unidade",
      "Calendario mensal por situacao funcional",
    ],
    graficos: [
      "Linha mensal de ausencias",
      "Barras por unidade: atrasos, saidas antecipadas e faltas",
      "Ranking de reincidencia restrito ao RH e chefias",
      "Calendario mensal do servidor por cor de situacao",
    ],
  },
  {
    slug: "justificativas-e-ocorrencias",
    titulo: "Justificativas e ocorrencias",
    menuLabel: "Justificativas e ocorrencias",
    descricao:
      "Acompanhamento de solicitacoes, decisoes e motivos que mais geram intervencao no ponto.",
    icon: ClipboardCheck,
    indicadores: [
      "Justificativas abertas",
      "Justificativas deferidas",
      "Justificativas indeferidas",
      "Justificativas devolvidas",
      "Tempo medio de analise",
    ],
    acompanhamentos: [
      "Esquecimento de batida",
      "Servico externo",
      "Problema tecnico",
      "Afastamento",
      "Compensacao",
      "Autorizacao excepcional",
    ],
    graficos: [
      "Justificativas por tipo",
      "Volume de justificativas por unidade",
      "Evolucao mensal das justificativas",
      "Tempo medio de analise por chefia",
    ],
  },
  {
    slug: "controle-de-homologacao-mensal",
    titulo: "Controle de homologacao mensal",
    menuLabel: "Controle de homologacao mensal",
    descricao:
      "Fluxo de fechamento mensal com filtros por competencia, unidade, gestor, servidor, situacao, vinculo e localidade.",
    icon: CheckCircle2,
    indicadores: [
      "Servidores que ainda nao enviaram espelho",
      "Chefias com aprovacoes pendentes",
      "Espelhos devolvidos",
      "Espelhos aprovados aguardando RH",
      "Espelhos homologados",
    ],
    acompanhamentos: [
      "Cobrança direta de servidores pendentes",
      "Cobrança por unidade e chefia",
      "Fila de homologacao do RH",
    ],
    graficos: [
      "Funil de homologacao: servidor enviou, chefia aprovou, RH homologou",
      "Ranking de unidades atrasadas",
      "Percentual de homologacao por unidade",
      "Linha de evolucao do fechamento ate o prazo final",
    ],
  },
  {
    slug: "jornada-e-carga-horaria",
    titulo: "Jornada e carga horaria",
    menuLabel: "Jornada e carga horaria",
    descricao:
      "Painel de aderencia entre jornada prevista, jornada realizada, creditos, debitos e jornadas especiais.",
    icon: Clock3,
    indicadores: [
      "Jornada prevista",
      "Jornada realizada",
      "Diferenca diaria",
      "Diferenca mensal",
      "Servidores com jornada especial",
      "Servidores em teletrabalho",
      "Servidores com horario personalizado",
    ],
    acompanhamentos: [
      "Previsto x realizado por servidor",
      "Previsto x realizado por unidade",
      "Distribuicao de jornadas",
    ],
    graficos: [
      "Previsto x realizado por servidor",
      "Previsto x realizado por unidade",
      "Distribuicao de jornadas: 6h, 7h, 8h e especial",
      "Mapa de calor de horarios de entrada e saida",
      "Dispersao de horarios de entrada",
    ],
  },
  {
    slug: "teletrabalho-presencial-registro-web",
    titulo: "Teletrabalho, presencial e registro web",
    menuLabel: "Teletrabalho, trabalho presencial e registro web",
    descricao:
      "Monitoramento da origem das marcacoes e de usos excepcionais, remotos ou fora do padrao institucional.",
    icon: Laptop,
    indicadores: [
      "Marcacoes por relogio biometrico",
      "Marcacoes por web",
      "Marcacoes por reconhecimento facial",
      "Marcacoes importadas",
      "Marcacoes manuais",
      "Marcacoes fora da unidade",
    ],
    acompanhamentos: [
      "Uso de registro remoto/autorizado",
      "Marcacoes excepcionais por servidor",
      "Unidades com maior dependencia de registro web",
    ],
    graficos: [
      "Barras por origem da marcacao",
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
      "Painel tecnico de saude dos relogios, sincronizacoes, AFD, divergencias e falhas de comunicacao.",
    icon: MonitorCog,
    permissao: PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS,
    indicadores: [
      "Equipamentos ativos",
      "Equipamentos sem comunicacao",
      "Ultima sincronizacao",
      "Marcacoes recebidas por equipamento",
      "Divergencia de horario",
      "NSR inicial e final por periodo",
      "Falhas de importacao AFD",
    ],
    acompanhamentos: [
      "Status operacional por equipamento",
      "Integridade da coleta",
      "Unidades com equipamentos inativos",
    ],
    graficos: [
      "Status dos equipamentos: online, offline e instavel",
      "Volume de marcacoes por equipamento",
      "Linha de falhas de comunicacao",
      "Mapa das unidades com equipamentos inativos",
    ],
  },
  {
    slug: "auditoria-e-conformidade",
    titulo: "Auditoria e conformidade",
    menuLabel: "Auditoria e conformidade",
    descricao:
      "Trilha restrita para eventos sensiveis, alteracoes administrativas e rastreabilidade de decisoes.",
    icon: ShieldCheck,
    indicadores: [
      "Alteracao manual de ponto",
      "Exclusao logica ou cancelamento de marcacao",
      "Justificativa deferida pela chefia",
      "Homologacao pelo RH",
      "Reabertura de periodo homologado",
      "Alteracao de jornada",
      "Alteracao de lotacao ou chefia",
      "Alteracao de permissao de registro web ou facial",
    ],
    acompanhamentos: [
      "Quem fez",
      "Quando fez",
      "IP ou dispositivo",
      "Valor anterior e novo valor",
      "Justificativa e processo SEI vinculado",
    ],
    graficos: [
      "Alteracoes manuais por mes",
      "Usuarios administrativos com mais acoes no sistema",
      "Reaberturas de espelho por unidade",
      "Eventos criticos por tipo",
    ],
  },
  {
    slug: "indicadores-por-unidade-e-chefia",
    titulo: "Indicadores por unidade e chefia",
    menuLabel: "Indicadores por unidade e chefia",
    descricao:
      "Visao por unidade, chefia e hierarquia departamental para cobranca institucional e gestao imediata.",
    icon: Building2,
    indicadores: [
      "Servidores sob responsabilidade da chefia",
      "Pendencias da equipe",
      "Aprovacoes pendentes",
      "Tempo medio de aprovacao",
      "Espelhos devolvidos",
      "Percentual de regularidade da unidade",
    ],
    acompanhamentos: [
      "Visao RH por unidade",
      "Visao do gestor limitada a equipe subordinada",
      "Ranking institucional de regularidade",
    ],
    graficos: [
      "Ranking de unidades mais regulares",
      "Ranking de unidades com mais pendencias",
      "Tempo medio de aprovacao por chefia",
      "Percentual de espelhos homologados por unidade",
    ],
  },
  {
    slug: "alertas-inteligentes",
    titulo: "Alertas inteligentes",
    menuLabel: "Alertas inteligentes",
    descricao:
      "Lista priorizada de alertas para acao imediata no sistema, e-mail ou painel interno.",
    icon: AlertTriangle,
    indicadores: [
      "Servidor sem marcacao no dia",
      "Marcacao incompleta",
      "Espelho nao enviado",
      "Chefia nao aprovou",
      "Banco de horas negativo critico",
      "Banco de horas positivo excessivo",
      "Equipamento sem comunicacao",
      "Registro web fora do padrao",
      "Reabertura de periodo homologado",
      "Alteracao manual recorrente",
    ],
    acompanhamentos: [
      "Prazo de fechamento",
      "Criticidade administrativa",
      "Recorrencia por unidade",
    ],
    graficos: [
      "Alertas por criticidade",
      "Alertas por unidade",
      "Evolucao de alertas no mes",
    ],
    alertas: [
      "Banco de horas acima do limite definido",
      "Unidade com crescimento anormal de creditos",
      "Equipamento sem sincronizacao ha varias horas",
      "Registro manual recorrente",
    ],
  },
  {
    slug: "relatorios-exportaveis",
    titulo: "Relatorios exportaveis",
    menuLabel: "Relatorios exportaveis",
    descricao:
      "Catalogo executivo para exportar visoes analiticas, sinteticas, por servidor, unidade, mes consolidado e instrucao SEI.",
    icon: Download,
    indicadores: [
      "PDF",
      "Excel/XLSX",
      "CSV",
      "Relatorio analitico",
      "Relatorio sintetico",
      "Relatorio por servidor",
      "Relatorio por unidade",
      "Relatorio mensal consolidado",
      "Relatorio para processo SEI",
    ],
    acompanhamentos: [
      "Espelho de ponto mensal",
      "Pendencias por servidor",
      "Pendencias por unidade",
      "Banco de horas",
      "Justificativas",
      "Homologacao mensal",
      "Auditoria de alteracoes",
      "Equipamentos",
    ],
    graficos: [
      "Fila de relatorios disponiveis",
      "Exportacoes por tipo",
      "Relatorios mais usados pelo RH",
    ],
  },
  {
    slug: "paineis",
    titulo: "Paineis do RH",
    menuLabel: "Paineis",
    descricao:
      "Composicao ideal do painel do RH no SECP, dividido por blocos de fechamento mensal e controle institucional.",
    icon: PieChart,
    indicadores: [
      "Resumo do mes",
      "Homologacao",
      "Pendencias",
      "Banco de horas",
      "Justificativas",
      "Origem das marcacoes",
      "Auditoria",
      "Equipamentos",
    ],
    acompanhamentos: [
      "Servidores ativos, pontos regulares e pendencias",
      "Funil de envio, aprovacao e homologacao",
      "Pendencias por tipo, unidade, servidor e criticidade",
      "Maiores saldos positivos e negativos",
      "Justificativas abertas, deferidas, indeferidas e tempo medio",
    ],
    graficos: [
      "Funil de fechamento mensal",
      "Rankings por unidade",
      "Evolucao mensal",
      "Origem das marcacoes",
      "Status de equipamentos",
    ],
  },
  {
    slug: "graficos-importantes",
    titulo: "Graficos importantes",
    menuLabel: "Graficos importantes",
    descricao:
      "Fila de prioridades para iniciar o dashboard executivo com os graficos de maior impacto operacional.",
    icon: BarChart3,
    indicadores: [
      "Funil de homologacao mensal",
      "Pendencias por unidade",
      "Pendencias por tipo",
      "Banco de horas por servidor",
      "Evolucao mensal de pendencias",
      "Justificativas por situacao",
      "Tempo medio de aprovacao por chefia",
      "Origem das marcacoes",
      "Equipamentos offline ou com falha",
      "Eventos criticos de auditoria",
    ],
    acompanhamentos: [
      "Quem ainda nao enviou",
      "Quem aguarda chefia",
      "Quem foi devolvido",
      "Quem ja foi aprovado",
      "Quem ja foi homologado",
      "Unidades atrasadas",
      "Pendencias impeditivas",
    ],
    graficos: [
      "Nao enviado -> enviado -> aprovado -> homologado",
      "Unidades onde o RH precisa atuar",
      "Principais problemas do ponto",
      "Saldos positivos e negativos criticos",
      "Casos que exigem atuacao imediata do RH",
    ],
  },
  {
    slug: "banco-de-horas",
    titulo: "Banco de horas",
    menuLabel: "Banco de horas",
    descricao:
      "Visao preventiva de creditos, debitos, compensacoes e saldos criticos por servidor e unidade.",
    icon: Hourglass,
    indicadores: [
      "Saldo total positivo por servidor",
      "Saldo total negativo por servidor",
      "Servidores com saldo critico",
      "Creditos gerados no mes",
      "Debitos gerados no mes",
      "Horas compensadas no mes",
      "Saldo por unidade",
    ],
    acompanhamentos: [
      "Saldo negativo acima do limite",
      "Saldo positivo acumulado demais",
      "Banco de horas proximo do prazo de expiracao",
      "Unidade com crescimento anormal de creditos",
    ],
    graficos: [
      "Servidores com maiores saldos positivos",
      "Servidores com maiores saldos negativos",
      "Grafico empilhado por unidade: creditos, debitos e compensacoes",
      "Linha mensal da evolucao institucional do banco de horas",
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
