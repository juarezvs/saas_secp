import { prisma } from "@/shared/infrastructure/database/prisma";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import {
  ehDispensaTeletrabalho,
  extrairRegimeTrabalhoRemoto,
} from "@/modules/solicitacoes/application/services/regime-trabalho-remoto.service";

export type SerieValor = {
  label: string;
  valor: number;
};

export type SerieDupla = {
  label: string;
  valor: number;
  valorSecundario: number;
};

export type SerieMensalIndicadores = {
  label: string;
  competencia: string;
  pontualidade: number;
  absenteismo: number;
  espelhosHomologados: number;
  pendencias: number;
  bancoHorasCritico: number;
  marcacoesManuaisWeb: number;
  inconsistencias: number;
};

export type PendenciasPontoUnidade = {
  unidadeId: string;
  unidade: string;
  batidaFaltante: number;
  justificativaPendente: number;
  aprovacaoGestor: number;
  homologacaoRH: number;
  inconsistenciaJornada: number;
  total: number;
};

export type PendenciaPontoDetalhe = {
  id: string;
  servidor: string;
  unidade: string;
  tipo: string;
  responsavelAtual: "Servidor" | "Gestor" | "RH";
  diasEmAberto: number;
  status: string;
  criticidade: "Baixa" | "Media" | "Alta" | "Critica";
  href: string;
};

export type PendenciasPontoResumo = {
  totalAbertas: number;
  servidoresAfetados: number;
  unidadeMaisCritica: string;
  vencidas: number;
  mediaDiasEmAberto: number;
  aguardandoGestor: number;
  aguardandoRh: number;
  porUnidade: PendenciasPontoUnidade[];
  detalhes: PendenciaPontoDetalhe[];
};

export type FrequenciaAssiduidadeMensal = {
  label: string;
  competencia: string;
  frequencia: number;
  assiduidade: number;
  ausenciasInconsistencias: number;
};

export type FrequenciaAssiduidadeUnidade = {
  unidadeId: string;
  unidade: string;
  frequencia: number;
  assiduidade: number;
  ausenciasInconsistencias: number;
  servidoresCriticos: number;
};

export type FrequenciaAssiduidadeServidor = {
  servidorId: string;
  servidor: string;
  unidade: string;
  frequencia: number;
  assiduidade: number;
  ausencias: number;
  pendencias: number;
  situacao: "Regular" | "Atencao" | "Critica";
  href: string;
};

export type FrequenciaAssiduidadeResumo = {
  frequenciaMedia: number;
  assiduidadeMedia: number;
  servidoresCriticos: number;
  ausenciasInjustificadas: number;
  jornadasIncompletas: number;
  unidadeMenorAssiduidade: string;
  variacaoMesAnterior: number;
  serieMensal: FrequenciaAssiduidadeMensal[];
  rankingUnidades: FrequenciaAssiduidadeUnidade[];
  detalhes: FrequenciaAssiduidadeServidor[];
};

export type JustificativasAssiduidadeMensal = {
  label: string;
  competencia: string;
  justificativasDeferidas: number;
  justificativasPendentes: number;
  justificativasIndeferidas: number;
  justificativasVencidas: number;
  ausenciasSemJustificativa: number;
  assiduidade: number;
};

export type JustificativasAssiduidadeUnidade = {
  unidadeId: string;
  unidade: string;
  pendentes: number;
  vencidas: number;
  semJustificativa: number;
  total: number;
};

export type JustificativasAssiduidadeDetalhe = {
  id: string;
  servidor: string;
  unidade: string;
  ocorrencia: string;
  justificativa: string;
  status: string;
  diasEmAnalise: number;
  impactoAssiduidade: "Baixo" | "Risco" | "Impacta";
  href: string;
};

export type JustificativasAssiduidadeResumo = {
  assiduidadeMedia: number;
  justificativasAbertas: number;
  justificativasVencidas: number;
  deferidasPercentual: number;
  indeferidasPercentual: number;
  ausenciasSemJustificativa: number;
  tempoMedioAnaliseDias: number;
  serieMensal: JustificativasAssiduidadeMensal[];
  rankingUnidades: JustificativasAssiduidadeUnidade[];
  detalhes: JustificativasAssiduidadeDetalhe[];
};

export type HomologacaoMensalUnidade = {
  unidadeId: string;
  unidade: string;
  esperados: number;
  enviados: number;
  homologados: number;
  pendenteServidor: number;
  pendenteChefia: number;
  pendenteRh: number;
  percentualHomologado: number;
  situacao: "Fechado" | "Regular" | "Atencao" | "Critico" | "Vencido";
};

export type HomologacaoMensalDetalhe = {
  id: string;
  unidade: string;
  servidor: string;
  status: string;
  responsavelAtual: "Servidor" | "Gestor" | "RH";
  pendencia: string;
  diasAtraso: number;
  href: string;
};

export type HomologacaoMensalResumo = {
  competencia: string;
  espelhosEsperados: number;
  espelhosEnviados: number;
  homologados: number;
  pendentesServidor: number;
  pendentesChefia: number;
  pendentesRh: number;
  unidadesFechadas: number;
  diasPrazoFinal: number;
  porUnidade: HomologacaoMensalUnidade[];
  detalhes: HomologacaoMensalDetalhe[];
  funil: SerieValor[];
};

export type JornadaCargaHorariaUnidade = {
  unidadeId: string;
  unidade: string;
  horasPrevistas: number;
  horasRealizadas: number;
  saldoHoras: number;
  aderencia: number;
  servidoresCriticos: number;
};

export type JornadaCargaHorariaServidor = {
  servidorId: string;
  servidor: string;
  unidade: string;
  horasPrevistas: number;
  horasRealizadas: number;
  saldoHoras: number;
  aderencia: number;
  situacao: "Regular" | "Atencao" | "Critico" | "Excesso";
  href: string;
};

export type JornadaCargaHorariaResumo = {
  cargaPrevistaHoras: number;
  cargaRealizadaHoras: number;
  saldoGeralHoras: number;
  aderencia: number;
  servidoresDeficit: number;
  servidoresExcesso: number;
  jornadasIncompletas: number;
  unidadeMaisCritica: string;
  porUnidade: JornadaCargaHorariaUnidade[];
  saldosPorUnidade: SerieValor[];
  detalhes: JornadaCargaHorariaServidor[];
};

export type TeletrabalhoRegistroWebMensal = {
  label: string;
  competencia: string;
  presencial: number;
  teletrabalho: number;
  percentualRegistroWeb: number;
};

export type TeletrabalhoRegistroWebUnidade = {
  unidadeId: string;
  unidade: string;
  presencial: number;
  teletrabalho: number;
  marcacoesTotal: number;
  marcacoesWeb: number;
  percentualWeb: number;
  alertas: number;
};

export type TeletrabalhoRegistroWebServidor = {
  servidorId: string;
  servidor: string;
  unidade: string;
  modalidade: "Presencial" | "Teletrabalho" | "Hibrido";
  origemPredominante: string;
  percentualWeb: number;
  autorizacao: "Teletrabalho deferido" | "Dispensa ativa" | "Sem autorizacao";
  situacao: "Regular" | "Atencao" | "Critica";
  href: string;
};

export type TeletrabalhoRegistroWebResumo = {
  servidoresPresenciais: number;
  servidoresTeletrabalho: number;
  percentualTeletrabalho: number;
  percentualBiometricoFacial: number;
  percentualRegistroWeb: number;
  registroWebSemVinculo: number;
  unidadesUsoWebElevado: number;
  servidoresAlerta: number;
  serieMensal: TeletrabalhoRegistroWebMensal[];
  rankingUnidades: TeletrabalhoRegistroWebUnidade[];
  detalhes: TeletrabalhoRegistroWebServidor[];
};

export type EquipamentosPontoUnidade = {
  unidadeId: string;
  unidade: string;
  online: number;
  atrasoComunicacao: number;
  offline: number;
  manutencao: number;
  semSincronizacaoRecente: number;
  total: number;
};

export type EquipamentoPontoDetalhe = {
  equipamentoId: string;
  equipamento: string;
  unidade: string;
  ip: string;
  tipo: string;
  ultimaComunicacao: string;
  tempoSemComunicarMinutos: number;
  ultimaSincronizacao: string;
  ultimaNsr: string;
  status: "Online" | "Atraso" | "Offline" | "Manutencao" | "Sem sincronizacao";
  marcacoesPendentes: number;
  falhasMes: number;
  href: string;
};

export type EquipamentosPontoResumo = {
  totalEquipamentos: number;
  online: number;
  offline: number;
  atrasoComunicacao: number;
  manutencao: number;
  semSincronizacaoRecente: number;
  ultimaColetaAfd: string;
  marcacoesPendentesImportacao: number;
  unidadeMaisCritica: string;
  porUnidade: EquipamentosPontoUnidade[];
  rankingFalhas: SerieValor[];
  detalhes: EquipamentoPontoDetalhe[];
};

export type AuditoriaConformidadeCriticidade =
  | "Baixa"
  | "Media"
  | "Alta"
  | "Critica";

export type AuditoriaConformidadeEvento = {
  id: string;
  dataHora: string;
  usuario: string;
  perfil: string;
  evento: string;
  entidade: string;
  criticidade: AuditoriaConformidadeCriticidade;
  justificativa: string;
  situacao: "Aberto" | "Em analise" | "Justificado" | "Saneado";
  href: string;
};

export type AuditoriaConformidadeTimeline = {
  label: string;
  criticos: number;
  altos: number;
};

export type AuditoriaConformidadeResumo = {
  indiceConformidade: number;
  achadosAbertos: number;
  achadosCriticos: number;
  alteracoesManuaisMes: number;
  registrosWebForaPadrao: number;
  espelhosReabertos: number;
  operacoesAposHomologacao: number;
  usuariosPermissaoSensivel: number;
  riscoPorDimensao: SerieValor[];
  timelineEventosCriticos: AuditoriaConformidadeTimeline[];
  detalhes: AuditoriaConformidadeEvento[];
};

export type IndicadoresUnidadeChefiaItem = {
  unidadeId: string;
  unidade: string;
  chefia: string;
  servidoresAtivos: number;
  homologacao: number;
  assiduidade: number;
  pontualidade: number;
  regularizacaoPendencias: number;
  conformidadeRegistros: number;
  pendenciasAbertas: number;
  pendenciasVencidas: number;
  ajustesManuais: number;
  registrosWeb: number;
  indiceGestao: number;
  situacao: "Excelente" | "Regular" | "Atencao" | "Critico";
  href: string;
};

export type IndicadoresUnidadeChefiaResumo = {
  melhorUnidade: string;
  unidadeAtencao: string;
  chefiasPendenciaCritica: number;
  mediaGeralConformidade: number;
  homologacaoMedia: number;
  assiduidadeMedia: number;
  pendenciasAbertas: number;
  ajustesManuaisMes: number;
  ranking: SerieValor[];
  matriz: IndicadoresUnidadeChefiaItem[];
  detalhes: IndicadoresUnidadeChefiaItem[];
};

export type AlertaInteligenteCriticidade =
  | "Baixa"
  | "Media"
  | "Alta"
  | "Critica";

export type AlertaInteligenteResponsavel =
  | "Servidor"
  | "Chefia"
  | "RH"
  | "NUTEC"
  | "Auditoria"
  | "Servidor/Chefia";

export type AlertaInteligenteItem = {
  id: string;
  tipo: string;
  categoria: string;
  criticidade: AlertaInteligenteCriticidade;
  pontuacaoRisco: number;
  unidade: string;
  servidor: string;
  responsavelAtual: AlertaInteligenteResponsavel;
  prazo: "Vencido" | "Hoje" | "3 dias" | "Sem prazo";
  impacto: string;
  acaoSugerida: string;
  explicacao: string;
  diasEmAberto: number;
  status: "Aberto" | "Em analise";
  href: string;
  bloqueiaHomologacao: boolean;
  recorrente: boolean;
};

export type AlertasInteligentesResumo = {
  alertasAtivos: number;
  alertasCriticos: number;
  vencidos: number;
  exigemChefia: number;
  exigemRh: number;
  exigemNutec: number;
  bloqueiamHomologacao: number;
  recorrentesMes: number;
  rankingCategorias: SerieValor[];
  timelineVencimentos: SerieValor[];
  fila: AlertaInteligenteItem[];
};

export type BancoHorasUnidade = {
  unidadeId: string;
  unidade: string;
  saldoHoras: number;
  creditoHoras: number;
  debitoHoras: number;
  servidoresCriticos: number;
};

export type BancoHorasServidor = {
  servidorId: string;
  servidor: string;
  unidade: string;
  saldoHoras: number;
  vencimento: string;
  situacao: "Regular" | "Atencao" | "Deficit critico" | "Excesso critico";
  href: string;
};

export type BancoHorasFaixa = {
  faixa: string;
  servidores: number;
  horasAcumuladas: number;
  situacao: string;
};

export type BancoHorasExtrato = {
  id: string;
  data: string;
  servidor: string;
  unidade: string;
  creditoHoras: number;
  debitoHoras: number;
  saldoAcumuladoHoras: number;
  origem: string;
  href: string;
};

export type BancoHorasResumo = {
  saldoGeralHoras: number;
  horasPositivasAcumuladas: number;
  horasNegativasAcumuladas: number;
  servidoresComCredito: number;
  servidoresComDeficit: number;
  servidoresCriticos: number;
  horasProximasVencimento: number;
  unidadeMaisCritica: string;
  porUnidade: BancoHorasUnidade[];
  faixasRisco: BancoHorasFaixa[];
  rankingServidoresCriticos: BancoHorasServidor[];
  extrato: BancoHorasExtrato[];
};

export type GraficoImportanteItem = {
  ordem: number;
  grafico: string;
  slug: string;
  nivel: "Gestao mensal" | "Controle operacional" | "Auditoria e conformidade";
  tipo: string;
  prioridade: "Maxima" | "Alta" | "Média-alta";
  criticidade: number;
  motivo: string;
  obrigatorio: boolean;
};

export type GraficosImportantesResumo = {
  rankingCriticidade: SerieValor[];
  pacoteMinimo: GraficoImportanteItem[];
  graficosApoio: GraficoImportanteItem[];
  ordemImplantacao: GraficoImportanteItem[];
  totalCritico: number;
  prioridadeMaxima: number;
  obrigatorios: number;
  areaMaisCritica: string;
};

export type RelatorioExportavelItem = {
  id: string;
  nome: string;
  finalidade: string;
  categoria: string;
  formatos: Array<"PDF" | "XLSX" | "CSV">;
  perfilAutorizado: string;
  filtros: string;
  padraoSei: boolean;
  hrefPdf?: string;
  hrefCsv?: string;
  hrefTela: string;
  exportacoesMes?: number;
};

export type RelatorioExportacaoHistorico = {
  id: string;
  dataHora: string;
  usuario: string;
  relatorio: string;
  filtros: string;
  formato: "PDF" | "XLSX" | "CSV" | "-";
  status: "Gerado" | "Erro" | "Em processamento";
  href: string;
};

export type RelatoriosExportaveisResumo = {
  relatoriosDisponiveis: number;
  exportacoesMes: number;
  pdfGerados: number;
  xlsxGerados: number;
  csvGerados: number;
  exportacoesSensiveis: number;
  exportacoesComErro: number;
  relatorioMaisUsado: string;
  rankingExportacoes: SerieValor[];
  catalogo: RelatorioExportavelItem[];
  historico: RelatorioExportacaoHistorico[];
};

export type PainelCentralItem = {
  ordem: number;
  painel: string;
  slug: string;
  grupo:
    | "Gestao mensal"
    | "Frequencia funcional"
    | "Controle operacional"
    | "Governanca"
    | "Inteligencia";
  finalidade: string;
  perfilAutorizado: string;
  prioridade: "Maxima" | "Alta" | "Média-alta";
  pontuacaoPrioridade: number;
  situacao: "Critico" | "Atencao" | "Monitorar" | "Regular";
  indicadorPrincipal: string;
  ultimaAtualizacao: string;
  href: string;
};

export type PaineisResumo = {
  totalPaineis: number;
  paineisCriticos: number;
  acoesPendentes: number;
  relatoriosDisponiveis: number;
  ultimaAtualizacao: string;
  perfisComAcesso: number;
  painelMaisPrioritario: string;
  rankingPrioridade: SerieValor[];
  catalogo: PainelCentralItem[];
  atalhos: Array<{
    label: string;
    href: string;
    detalhe: string;
  }>;
};

export type PainelExecutivoDados = {
  competencia: {
    ano: number;
    mes: number;
    valorInput: string;
    rotulo: string;
  };
  metricas: {
    servidoresAtivos: number;
    apuracoesCalculadas: number;
    regularidadePercentual: number;
    ocorrenciasAbertas: number;
    homologacoesPendentes: number;
    homologacoesHomologadas: number;
    saldoBancoHorasHoras: number;
    equipamentosOffline: number;
  };
  apuracaoPorResultado: SerieValor[];
  homologacaoPorStatus: SerieValor[];
  ocorrenciasPorTipo: SerieValor[];
  ocorrenciasPorUnidade: SerieValor[];
  evolucaoDiaria: SerieDupla[];
  bancoHorasPorTipo: SerieValor[];
  maioresSaldosBancoHoras: SerieValor[];
  solicitacoesPorStatus: SerieValor[];
  solicitacoesPorTipo: SerieValor[];
  marcacoesPorFonte: SerieValor[];
  equipamentosPorStatus: SerieValor[];
  eventosEquipamentoPorTipo: SerieValor[];
  indicadoresExecutivos: SerieMensalIndicadores[];
  pendenciasPonto: PendenciasPontoResumo;
  frequenciaAssiduidade: FrequenciaAssiduidadeResumo;
  justificativasAssiduidade: JustificativasAssiduidadeResumo;
  homologacaoMensal: HomologacaoMensalResumo;
  jornadaCargaHoraria: JornadaCargaHorariaResumo;
  teletrabalhoRegistroWeb: TeletrabalhoRegistroWebResumo;
  equipamentosPonto: EquipamentosPontoResumo;
  auditoriaConformidade: AuditoriaConformidadeResumo;
  indicadoresUnidadeChefia: IndicadoresUnidadeChefiaResumo;
  alertasInteligentes: AlertasInteligentesResumo;
  bancoHoras: BancoHorasResumo;
  graficosImportantes: GraficosImportantesResumo;
  relatoriosExportaveis: RelatoriosExportaveisResumo;
  paineis: PaineisResumo;
  escopo: {
    tipo: "global" | "seccional" | "hierarquia" | "proprio";
    descricao: string;
  };
};

const MESES = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const RESULTADOS_APURACAO: Record<string, string> = {
  REGULAR: "Regular",
  CREDITO: "Credito",
  DEBITO: "Debito",
  FALTA: "Falta",
  INCOMPLETA: "Incompleta",
  SEM_JORNADA: "Sem jornada",
  SEM_EXPEDIENTE: "Sem expediente",
};

const STATUS_HOMOLOGACAO: Record<string, string> = {
  PENDENTE: "Pendente",
  COM_PENDENCIAS: "Com pendencias",
  HOMOLOGADO: "Homologado",
  HOMOLOGADO_COM_RESSALVA: "Homologado com ressalva",
  DEVOLVIDO: "Devolvido",
};

const OCORRENCIAS: Record<string, string> = {
  MARCACAO_INCOMPLETA: "Marcacao incompleta",
  INTERVALO_INVALIDO: "Intervalo invalido",
  CREDITO: "Credito",
  DEBITO: "Debito",
  FALTA: "Falta",
  SEM_JORNADA: "Sem jornada",
  MARCACAO_DUPLICADA: "Marcacao duplicada",
  HORA_NAO_AUTORIZADA: "Hora nao autorizada",
};

const STATUS_SOLICITACAO: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  EM_ANALISE: "Em analise",
  DEFERIDA: "Deferida",
  INDEFERIDA: "Indeferida",
  CANCELADA: "Cancelada",
};

const TIPOS_SOLICITACAO: Record<string, string> = {
  AJUSTE_PONTO: "Ajuste de ponto",
  COMPENSACAO: "Compensacao",
  ABONO_JUSTIFICATIVA: "Abono/justificativa",
  ATIVIDADE_EXTERNA: "Atividade externa",
  VIAGEM_SERVICO: "Viagem a servico",
  CAPACITACAO: "Capacitacao",
  DISPENSA_PONTO: "Dispensa de ponto",
  HORA_CREDITO_PREVIA: "Hora credito previa",
  FOLGA_BANCO_HORAS: "Folga banco de horas",
};

const FONTES_MARCACAO: Record<string, string> = {
  WEB: "Web",
  BIOMETRIA_FACIAL: "Biometria facial",
  EQUIPAMENTO_BIOMETRICO: "Equipamento",
  AFD: "AFD",
  MANUAL_ADMINISTRATIVO: "Manual",
  IMPORTACAO: "Importacao",
};

const TIPOS_BANCO_HORAS: Record<string, string> = {
  CREDITO: "Credito",
  DEBITO: "Debito",
  COMPENSACAO_CREDITO: "Compensacao credito",
  COMPENSACAO_DEBITO: "Compensacao debito",
  HORAS_ACIMA_LIMITE: "Acima do limite",
  HORAS_NAO_AUTORIZADAS: "Nao autorizadas",
  AJUSTE_MANUAL: "Ajuste manual",
  ESTORNO: "Estorno",
};

const TIPOS_EVENTO_EQUIPAMENTO: Record<string, string> = {
  MARCACAO: "Marcacao",
  HEARTBEAT: "Heartbeat",
  SINCRONIZACAO: "Sincronizacao",
  ERRO: "Erro",
};

const TIPOS_PENDENCIA_OCORRENCIA: Record<string, string> = {
  MARCACAO_INCOMPLETA: "Batida faltante",
  INTERVALO_INVALIDO: "Inconsistencia de jornada",
  CREDITO: "Inconsistencia de jornada",
  DEBITO: "Inconsistencia de jornada",
  FALTA: "Batida faltante",
  SEM_JORNADA: "Inconsistencia de jornada",
  MARCACAO_DUPLICADA: "Inconsistencia de jornada",
  HORA_NAO_AUTORIZADA: "Inconsistencia de jornada",
};

function competenciaAtual() {
  const hoje = new Date();

  return {
    ano: hoje.getFullYear(),
    mes: hoje.getMonth() + 1,
  };
}

export function normalizarCompetencia(competencia?: string | null) {
  const match = competencia?.match(/^(\d{4})-(\d{2})$/);
  const atual = competenciaAtual();

  if (!match) {
    return atual;
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return atual;
  }

  return { ano, mes };
}

function criarPeriodo(competencia?: string | null) {
  const { ano, mes } = normalizarCompetencia(competencia);
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 1);
  const diasNoMes = new Date(ano, mes, 0).getDate();

  return {
    ano,
    mes,
    inicio,
    fim,
    diasNoMes,
    valorInput: `${ano}-${String(mes).padStart(2, "0")}`,
    rotulo: `${MESES[mes - 1]}/${ano}`,
  };
}

function serieComZeros(chaves: Record<string, string>) {
  return Object.values(chaves).map((label) => ({ label, valor: 0 }));
}

function mapearGroupBy(
  grupos: Array<{ _count?: number; _sum?: { minutos?: number | null } }>,
  labels: Record<string, string>,
  campo: "tipo" | "status" | "resultado" | "fonte" | "tipoEvento",
  modo: "count" | "minutos" = "count",
) {
  const valores = new Map<string, number>();

  for (const grupo of grupos) {
    const chave = String((grupo as Record<string, unknown>)[campo] ?? "");
    const label = labels[chave] ?? chave;
    const valor = modo === "minutos" ? (grupo._sum?.minutos ?? 0) : (grupo._count ?? 0);

    valores.set(label, (valores.get(label) ?? 0) + valor);
  }

  const base = serieComZeros(labels).map((item) => ({
    ...item,
    valor: valores.get(item.label) ?? item.valor,
  }));
  const extras = Array.from(valores.entries())
    .filter(([label]) => !base.some((item) => item.label === label))
    .map(([label, valor]) => ({ label, valor }));

  return [...base, ...extras].filter((item) => item.valor > 0);
}

function limitarRanking(itens: SerieValor[], limite = 6) {
  return [...itens].sort((a, b) => b.valor - a.valor).slice(0, limite);
}

function minutosParaHoras(minutos: number) {
  return Math.round((minutos / 60) * 10) / 10;
}

function diferencaDias(inicio: Date, fim: Date) {
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / msPorDia));
}

function criticidadePorDias(dias: number): PendenciaPontoDetalhe["criticidade"] {
  if (dias >= 10) return "Critica";
  if (dias >= 6) return "Alta";
  if (dias >= 3) return "Media";
  return "Baixa";
}

function criarPendenciaUnidade(unidadeId: string, unidade: string): PendenciasPontoUnidade {
  return {
    unidadeId,
    unidade,
    batidaFaltante: 0,
    justificativaPendente: 0,
    aprovacaoGestor: 0,
    homologacaoRH: 0,
    inconsistenciaJornada: 0,
    total: 0,
  };
}

function incrementarPendenciaUnidade(
  mapa: Map<string, PendenciasPontoUnidade>,
  unidadeId: string,
  unidade: string,
  campo: keyof Omit<PendenciasPontoUnidade, "unidadeId" | "unidade" | "total">,
) {
  const atual =
    mapa.get(unidadeId) ?? criarPendenciaUnidade(unidadeId, unidade);

  atual[campo] += 1;
  atual.total += 1;
  mapa.set(unidadeId, atual);
}

function resultadoEhFrequenciaValida(resultado: string) {
  return ["REGULAR", "CREDITO"].includes(resultado);
}

function resultadoEhProblemaFrequencia(resultado: string) {
  return ["FALTA", "DEBITO", "INCOMPLETA"].includes(resultado);
}

function resultadoEhProblemaAssiduidade(resultado: string) {
  return ["FALTA", "INCOMPLETA"].includes(resultado);
}

function tipoSolicitacaoEhJustificativa(tipo: string) {
  return [
    "AJUSTE_PONTO",
    "ABONO_JUSTIFICATIVA",
    "ATIVIDADE_EXTERNA",
    "VIAGEM_SERVICO",
    "CAPACITACAO",
    "COMPENSACAO",
  ].includes(tipo);
}

function situacaoHomologacao(percentual: number, prazoVencido: boolean) {
  if (percentual >= 100) return "Fechado" as const;
  if (prazoVencido) return "Vencido" as const;
  if (percentual >= 90) return "Regular" as const;
  if (percentual >= 70) return "Atencao" as const;
  return "Critico" as const;
}

function responsavelHomologacao(status: string): HomologacaoMensalDetalhe["responsavelAtual"] {
  if (["COM_PENDENCIAS", "DEVOLVIDO"].includes(status)) return "Servidor";
  if (status === "PENDENTE") return "Gestor";
  return "RH";
}

function pendenciaHomologacao(status: string) {
  const pendencias: Record<string, string> = {
    PENDENTE: "Aguardando aprovacao da chefia",
    COM_PENDENCIAS: "Pendencias de frequencia abertas",
    DEVOLVIDO: "Espelho devolvido ao servidor",
    HOMOLOGADO_COM_RESSALVA: "Homologado com ressalva",
  };

  return pendencias[status] ?? "Aguardando tratamento";
}

function classificarAderencia(aderencia: number): JornadaCargaHorariaServidor["situacao"] {
  if (aderencia > 105) return "Excesso";
  if (aderencia >= 98) return "Regular";
  if (aderencia >= 95) return "Atencao";
  return "Critico";
}

function normalizarTextoPainel(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function textoIndicaTeletrabalho(...valores: unknown[]) {
  const texto = normalizarTextoPainel(valores.join(" "));

  return texto.includes("TELETRABALHO") || texto.includes("TRABALHO REMOTO");
}

function dataSobrepoePeriodo(params: {
  inicio?: Date | null;
  fim?: Date | null;
  periodo: Pick<ReturnType<typeof criarPeriodo>, "inicio" | "fim">;
}) {
  const inicio = params.inicio ?? params.periodo.inicio;
  const fim = params.fim ?? params.periodo.fim;

  return inicio < params.periodo.fim && fim >= params.periodo.inicio;
}

function classificarSituacaoTeletrabalho(params: {
  percentualWeb: number;
  autorizado: boolean;
  problemasJornada: number;
}): TeletrabalhoRegistroWebServidor["situacao"] {
  if (!params.autorizado && params.percentualWeb > 0) return "Critica";
  if (params.percentualWeb >= 40 || params.problemasJornada > 0) return "Atencao";
  return "Regular";
}

function modalidadeTeletrabalho(regime: unknown): TeletrabalhoRegistroWebServidor["modalidade"] {
  const regimeRemoto = extrairRegimeTrabalhoRemoto(regime);

  if (regimeRemoto?.tipo === "HIBRIDO") return "Hibrido";
  if (regimeRemoto) return "Teletrabalho";
  return "Presencial";
}

function minutosDesde(data: Date | null | undefined, referencia: Date) {
  if (!data) return Number.POSITIVE_INFINITY;

  return Math.max(0, Math.floor((referencia.getTime() - data.getTime()) / 60000));
}

function formatarDataHoraPainel(data: Date | null | undefined) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function classificarStatusEquipamento(params: {
  ativo: boolean;
  ultimoHeartbeatEm?: Date | null;
  ultimaSincronizacaoEm?: Date | null;
  referencia: Date;
}): EquipamentoPontoDetalhe["status"] {
  if (!params.ativo) return "Manutencao";

  const minutosSemComunicar = minutosDesde(
    params.ultimoHeartbeatEm,
    params.referencia,
  );

  if (minutosSemComunicar > 60) return "Offline";
  if (minutosSemComunicar > 15) return "Atraso";

  const minutosSemSincronizar = minutosDesde(
    params.ultimaSincronizacaoEm,
    params.referencia,
  );

  if (minutosSemSincronizar > 60) return "Sem sincronizacao";
  return "Online";
}

function incrementarStatusEquipamento(
  unidade: EquipamentosPontoUnidade,
  status: EquipamentoPontoDetalhe["status"],
) {
  if (status === "Online") unidade.online += 1;
  if (status === "Atraso") unidade.atrasoComunicacao += 1;
  if (status === "Offline") unidade.offline += 1;
  if (status === "Manutencao") unidade.manutencao += 1;
  if (status === "Sem sincronizacao") unidade.semSincronizacaoRecente += 1;
  unidade.total += 1;
}

function extrairTextoJson(valor: unknown, chaves: string[]) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return "";
  }

  const dados = valor as Record<string, unknown>;
  const formatarValor = (item: unknown): string => {
    if (item === null || item === undefined) return "";
    if (item instanceof Date) return formatarDataHoraPainel(item);
    if (typeof item !== "object") return String(item);
    if (Array.isArray(item)) return item.map(formatarValor).filter(Boolean).join(", ");

    return Object.entries(item as Record<string, unknown>)
      .filter(([, valorItem]) => valorItem !== null && valorItem !== undefined)
      .map(([chave, valorItem]) => `${chave}: ${formatarValor(valorItem)}`)
      .join(", ");
  };

  return chaves
    .map((chave) => dados[chave])
    .filter((item) => item !== null && item !== undefined)
    .map(formatarValor)
    .filter(Boolean)
    .join(" ");
}

function criticidadeEventoAuditoria(params: {
  entidade: string;
  acao: string;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
}): AuditoriaConformidadeCriticidade {
  const texto = normalizarTextoPainel(`${params.entidade} ${params.acao}`);

  if (
    texto.includes("REABERT") ||
    texto.includes("EXCL") ||
    texto.includes("PERMISSAO") ||
    texto.includes("PERFIL") ||
    texto.includes("HOMOLOGADO") ||
    texto.includes("POS FECHAMENTO") ||
    texto.includes("APOS FECHAMENTO")
  ) {
    return "Critica";
  }

  if (
    texto.includes("MARCACAO") ||
    texto.includes("BANCO") ||
    texto.includes("JORNADA") ||
    texto.includes("BIOMETRIA") ||
    texto.includes("AFD")
  ) {
    return "Alta";
  }

  if (params.dadosAntes || params.dadosDepois) {
    return "Media";
  }

  return "Baixa";
}

function pesoCriticidade(criticidade: AuditoriaConformidadeCriticidade) {
  const pesos = {
    Baixa: 1,
    Media: 2,
    Alta: 4,
    Critica: 8,
  };

  return pesos[criticidade];
}

function perfilAuditoria(usuario?: {
  tipo?: string | null;
  perfis?: Array<{ ativo: boolean; perfil: { codigo: string; nome: string } }>;
} | null) {
  const perfilAtivo = usuario?.perfis?.find((item) => item.ativo)?.perfil;

  return perfilAtivo?.nome ?? perfilAtivo?.codigo ?? usuario?.tipo ?? "-";
}

function situacaoIndiceGestao(
  indice: number,
): IndicadoresUnidadeChefiaItem["situacao"] {
  if (indice >= 95) return "Excelente";
  if (indice >= 85) return "Regular";
  if (indice >= 70) return "Atencao";
  return "Critico";
}

function pesoCriticidadeAlerta(criticidade: AlertaInteligenteCriticidade) {
  const pesos = {
    Baixa: 10,
    Media: 22,
    Alta: 32,
    Critica: 40,
  };

  return pesos[criticidade];
}

function prazoAlerta(diasEmAberto: number): AlertaInteligenteItem["prazo"] {
  if (diasEmAberto >= 5) return "Vencido";
  if (diasEmAberto >= 4) return "Hoje";
  if (diasEmAberto >= 2) return "3 dias";
  return "Sem prazo";
}

function pontuarAlerta(params: {
  criticidade: AlertaInteligenteCriticidade;
  bloqueiaHomologacao: boolean;
  diasEmAberto: number;
  recorrente: boolean;
  afetados: number;
}) {
  const criticidade = pesoCriticidadeAlerta(params.criticidade);
  const impacto = params.bloqueiaHomologacao ? 25 : params.criticidade === "Critica" ? 22 : 12;
  const tempo = Math.min(15, params.diasEmAberto * 3);
  const recorrencia = params.recorrente ? 10 : 0;
  const afetados = Math.min(10, params.afetados);

  return Math.min(100, Math.round(criticidade + impacto + tempo + recorrencia + afetados));
}

function classificarBancoHoras(saldoHoras: number): BancoHorasServidor["situacao"] {
  if (saldoHoras < -10) return "Deficit critico";
  if (saldoHoras > 20) return "Excesso critico";
  if (saldoHoras < -4 || saldoHoras > 10) return "Atencao";
  return "Regular";
}

function faixaBancoHoras(saldoHoras: number) {
  if (saldoHoras > 20) return "Credito critico";
  if (saldoHoras > 4) return "Credito moderado";
  if (saldoHoras < -10) return "Deficit critico";
  if (saldoHoras < -4) return "Deficit moderado";
  return "Saldo regular";
}

async function listarIdsUnidadesSubordinadasNaData(params: {
  usuarioId: string;
  data: Date;
}) {
  const gestores = await prisma.gestorUnidade.findMany({
    where: {
      ativo: true,
      dataInicio: { lte: params.data },
      OR: [{ dataFim: null }, { dataFim: { gte: params.data } }],
      servidor: {
        usuarioId: params.usuarioId,
        ativo: true,
      },
    },
    select: { unidadeId: true },
  });

  const visitadas = new Set(gestores.map((gestor) => gestor.unidadeId));
  let fronteira = Array.from(visitadas);

  while (fronteira.length > 0) {
    const filhas = await prisma.unidadeOrganizacional.findMany({
      where: {
        ativo: true,
        unidadePaiId: { in: fronteira },
      },
      select: { id: true },
    });

    const novas = filhas
      .map((unidade) => unidade.id)
      .filter((id) => !visitadas.has(id));

    for (const id of novas) {
      visitadas.add(id);
    }

    fronteira = novas;
  }

  return Array.from(visitadas);
}

async function listarServidorIdsPorUnidades(params: {
  unidadeIds: string[];
  data: Date;
}) {
  if (params.unidadeIds.length === 0) {
    return [];
  }

  const servidores = await prisma.servidor.findMany({
    where: {
      ativo: true,
      usuario: { ativo: true },
      lotacoes: {
        some: {
          status: "ATIVO",
          unidadeId: { in: params.unidadeIds },
          dataInicio: { lte: params.data },
          OR: [{ dataFim: null }, { dataFim: { gte: params.data } }],
        },
      },
    },
    select: { id: true },
  });

  return servidores.map((servidor) => servidor.id);
}

async function resolverEscopoPainel(params: {
  usuarioId?: string;
  perfilAtivoCodigo?: string;
  perfilAtivoEscopoGlobal?: boolean;
  orgaoIds?: string[];
  dataReferencia: Date;
}) {
  const perfilCodigo = params.perfilAtivoCodigo?.toUpperCase() ?? "";
  const perfisGlobais = new Set(["MASTER"]);
  const perfisSeccionais = new Set(["ADMIN", "SECAP", "DIREF"]);
  const orgaoIds = params.orgaoIds ?? [];

  if (params.perfilAtivoEscopoGlobal || perfisGlobais.has(perfilCodigo)) {
    return {
      tipo: "global" as const,
      descricao: "Todas as seccionais",
      servidorIds: undefined as string[] | undefined,
      unidadeIds: undefined as string[] | undefined,
    };
  }

  if (perfisSeccionais.has(perfilCodigo) && orgaoIds.length > 0) {
    const unidades = await prisma.unidadeOrganizacional.findMany({
      where: {
        ativo: true,
        orgaoId: { in: orgaoIds },
      },
      select: { id: true },
    });
    const unidadeIds = unidades.map((unidade) => unidade.id);
    const servidorIds = await listarServidorIdsPorUnidades({
      unidadeIds,
      data: params.dataReferencia,
    });

    return {
      tipo: "seccional" as const,
      descricao:
        perfilCodigo === "SECAP"
          ? "SECAP/NUCGP da seccional vinculada"
          : "Seccional vinculada ao perfil ativo",
      servidorIds,
      unidadeIds,
    };
  }

  if (params.usuarioId) {
    const unidadeIds = await listarIdsUnidadesSubordinadasNaData({
      usuarioId: params.usuarioId,
      data: params.dataReferencia,
    });

    if (unidadeIds.length > 0) {
      const servidorIds = await listarServidorIdsPorUnidades({
        unidadeIds,
        data: params.dataReferencia,
      });

      return {
        tipo: "hierarquia" as const,
        descricao: "Hierarquia departamental vinculada ao usuario",
        servidorIds,
        unidadeIds,
      };
    }

    const servidor = await prisma.servidor.findUnique({
      where: { usuarioId: params.usuarioId },
      select: { id: true },
    });

    return {
      tipo: "proprio" as const,
      descricao: "Somente dados do proprio servidor",
      servidorIds: servidor ? [servidor.id] : [],
      unidadeIds: undefined as string[] | undefined,
    };
  }

  return {
    tipo: "proprio" as const,
    descricao: "Sem escopo de dados disponivel",
    servidorIds: [],
    unidadeIds: undefined as string[] | undefined,
  };
}

function percentual(parte: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((parte / total) * 1000) / 10;
}

function adicionarMeses(data: Date, meses: number) {
  return new Date(data.getFullYear(), data.getMonth() + meses, 1);
}

function criarPeriodoPorAnoMes(ano: number, mes: number) {
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 1);

  return {
    ano,
    mes,
    inicio,
    fim,
    valorInput: `${ano}-${String(mes).padStart(2, "0")}`,
    label: MESES[mes - 1].slice(0, 3),
  };
}

function periodosIndicadoresMensais(ano: number, mes: number) {
  const referencia = new Date(ano, mes - 1, 1);

  return Array.from({ length: 6 }, (_, index) => {
    const data = adicionarMeses(referencia, index - 5);

    return criarPeriodoPorAnoMes(data.getFullYear(), data.getMonth() + 1);
  });
}

async function calcularIndicadoresMensais(params: {
  servidoresAtivos: number;
  ano: number;
  mes: number;
  servidorIds?: string[];
}) {
  const { servidoresAtivos, ano, mes, servidorIds } = params;
  const periodos = periodosIndicadoresMensais(ano, mes);
  const toleranciaBancoCriticoMinutos = 600;
  const servidorWhere = servidorIds ? { servidorId: { in: servidorIds } } : {};

  return Promise.all(
    periodos.map(async (periodo): Promise<SerieMensalIndicadores> => {
      const [
        apuracoesPorResultado,
        homologacoesPorStatus,
        solicitacoesAbertas,
        marcacoesPorFonte,
        bancoHorasCritico,
      ] = await Promise.all([
        prisma.apuracaoDiaria.groupBy({
          by: ["resultado"],
          where: {
            ...servidorWhere,
            dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
          },
          _count: true,
        }),
        prisma.homologacaoServidorMes.groupBy({
          by: ["status"],
          where: {
            ...servidorWhere,
            fechamento: {
              anoReferencia: periodo.ano,
              mesReferencia: periodo.mes,
            },
          },
          _count: true,
        }),
        prisma.solicitacao.count({
          where: {
            ...servidorWhere,
            criadoEm: { gte: periodo.inicio, lt: periodo.fim },
            status: { in: ["ENVIADA", "EM_ANALISE"] },
          },
        }),
        prisma.marcacao.groupBy({
          by: ["fonte"],
          where: {
            ...servidorWhere,
            dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
            status: "VALIDA",
          },
          _count: true,
        }),
        prisma.bancoHorasSaldo.count({
          where: {
            ...(servidorIds ? { servidorId: { in: servidorIds } } : {}),
            OR: [
              { saldoMinutos: { gt: toleranciaBancoCriticoMinutos } },
              { saldoMinutos: { lt: -toleranciaBancoCriticoMinutos } },
              { horasAcimaLimiteMinutos: { gt: 0 } },
              { horasNaoAutorizadasMinutos: { gt: 0 } },
            ],
          },
        }),
      ]);

      const totalApuracoes = apuracoesPorResultado.reduce(
        (total, item) => total + item._count,
        0,
      );
      const apuracoesRegulares =
        apuracoesPorResultado.find((item) => item.resultado === "REGULAR")
          ?._count ?? 0;
      const faltas =
        apuracoesPorResultado.find((item) => item.resultado === "FALTA")?._count ??
        0;
      const inconsistentes = apuracoesPorResultado
        .filter((item) =>
          ["DEBITO", "FALTA", "INCOMPLETA"].includes(String(item.resultado)),
        )
        .reduce((total, item) => total + item._count, 0);

      const totalHomologacoes = homologacoesPorStatus.reduce(
        (total, item) => total + item._count,
        0,
      );
      const homologadas = homologacoesPorStatus
        .filter((item) =>
          ["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(String(item.status)),
        )
        .reduce((total, item) => total + item._count, 0);

      const totalMarcacoes = marcacoesPorFonte.reduce(
        (total, item) => total + item._count,
        0,
      );
      const marcacoesNaoBiometricas = marcacoesPorFonte
        .filter((item) =>
          ["WEB", "MANUAL_ADMINISTRATIVO"].includes(String(item.fonte)),
        )
        .reduce((total, item) => total + item._count, 0);

      return {
        label: periodo.label,
        competencia: periodo.valorInput,
        pontualidade: percentual(apuracoesRegulares, totalApuracoes),
        absenteismo: percentual(faltas, totalApuracoes),
        espelhosHomologados: percentual(homologadas, totalHomologacoes),
        pendencias: percentual(solicitacoesAbertas, servidoresAtivos),
        bancoHorasCritico: percentual(bancoHorasCritico, servidoresAtivos),
        marcacoesManuaisWeb: percentual(marcacoesNaoBiometricas, totalMarcacoes),
        inconsistencias: percentual(inconsistentes, totalApuracoes),
      };
    }),
  );
}

async function calcularPendenciasPonto(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
}): Promise<PendenciasPontoResumo> {
  const { periodo, servidorIds } = params;
  const agora = new Date();
  const servidorWhere = servidorIds ? { servidorId: { in: servidorIds } } : {};
  const mapaUnidades = new Map<string, PendenciasPontoUnidade>();
  const detalhes: PendenciaPontoDetalhe[] = [];
  const servidoresAfetados = new Set<string>();

  const [ocorrencias, solicitacoes, homologacoes] = await Promise.all([
    prisma.ocorrenciaFrequencia.findMany({
      where: {
        ...servidorWhere,
        resolvida: false,
        apuracaoDiaria: {
          dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
        },
      },
      include: {
        servidor: {
          include: {
            usuario: true,
            lotacoes: {
              where: {
                status: "ATIVO",
                dataInicio: { lt: periodo.fim },
                OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
              },
              include: { unidade: true },
              orderBy: { dataInicio: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.solicitacao.findMany({
      where: {
        ...servidorWhere,
        status: { in: ["ENVIADA", "EM_ANALISE"] },
        OR: [
          { criadoEm: { gte: periodo.inicio, lt: periodo.fim } },
          { dataReferencia: { gte: periodo.inicio, lt: periodo.fim } },
          { dataInicio: { lt: periodo.fim }, dataFim: { gte: periodo.inicio } },
        ],
      },
      include: {
        servidor: {
          include: {
            usuario: true,
            lotacoes: {
              where: {
                status: "ATIVO",
                dataInicio: { lt: periodo.fim },
                OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
              },
              include: { unidade: true },
              orderBy: { dataInicio: "desc" },
              take: 1,
            },
          },
        },
        unidade: true,
      },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.homologacaoServidorMes.findMany({
      where: {
        ...servidorWhere,
        status: { in: ["PENDENTE", "COM_PENDENCIAS", "DEVOLVIDO"] },
        fechamento: {
          anoReferencia: periodo.ano,
          mesReferencia: periodo.mes,
        },
      },
      include: {
        servidor: {
          include: {
            usuario: true,
            lotacoes: {
              where: {
                status: "ATIVO",
                dataInicio: { lt: periodo.fim },
                OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
              },
              include: { unidade: true },
              orderBy: { dataInicio: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  for (const ocorrencia of ocorrencias) {
    const lotacao = ocorrencia.servidor.lotacoes[0];
    const unidadeId = lotacao?.unidadeId ?? "sem-unidade";
    const unidade = lotacao?.unidade.sigla ?? "Sem unidade";
    const tipo = TIPOS_PENDENCIA_OCORRENCIA[String(ocorrencia.tipo)] ?? "Inconsistencia de jornada";
    const campo =
      tipo === "Batida faltante" ? "batidaFaltante" : "inconsistenciaJornada";
    const diasEmAberto = diferencaDias(ocorrencia.criadoEm, agora);

    servidoresAfetados.add(ocorrencia.servidorId);
    incrementarPendenciaUnidade(mapaUnidades, unidadeId, unidade, campo);
    detalhes.push({
      id: `ocorrencia-${ocorrencia.id}`,
      servidor: nomeServidor(ocorrencia.servidor) || ocorrencia.servidor.matricula,
      unidade,
      tipo,
      responsavelAtual: "Servidor",
      diasEmAberto,
      status: "Aberta",
      criticidade: criticidadePorDias(diasEmAberto),
      href: `/espelho-ponto?servidorId=${ocorrencia.servidorId}&competencia=${periodo.valorInput}`,
    });
  }

  for (const solicitacao of solicitacoes) {
    const lotacao = solicitacao.servidor.lotacoes[0];
    const unidadeId =
      solicitacao.unidadeId ?? lotacao?.unidadeId ?? "sem-unidade";
    const unidade =
      solicitacao.unidade?.sigla ?? lotacao?.unidade.sigla ?? "Sem unidade";
    const diasEmAberto = diferencaDias(solicitacao.criadoEm, agora);

    servidoresAfetados.add(solicitacao.servidorId);
    incrementarPendenciaUnidade(
      mapaUnidades,
      unidadeId,
      unidade,
      solicitacao.status === "EM_ANALISE"
        ? "aprovacaoGestor"
        : "justificativaPendente",
    );
    detalhes.push({
      id: `solicitacao-${solicitacao.id}`,
      servidor: nomeServidor(solicitacao.servidor) || solicitacao.servidor.matricula,
      unidade,
      tipo:
        solicitacao.status === "EM_ANALISE"
          ? "Aprovacao do gestor"
          : "Justificativa pendente",
      responsavelAtual: "Gestor",
      diasEmAberto,
      status: STATUS_SOLICITACAO[String(solicitacao.status)] ?? String(solicitacao.status),
      criticidade: criticidadePorDias(diasEmAberto),
      href: `/solicitacoes/${solicitacao.id}`,
    });
  }

  for (const homologacao of homologacoes) {
    const lotacao = homologacao.servidor.lotacoes[0];
    const unidadeId = lotacao?.unidadeId ?? "sem-unidade";
    const unidade = lotacao?.unidade.sigla ?? "Sem unidade";
    const diasEmAberto = diferencaDias(homologacao.criadoEm, agora);
    const aguardandoGestor = homologacao.status === "PENDENTE";

    servidoresAfetados.add(homologacao.servidorId);
    incrementarPendenciaUnidade(
      mapaUnidades,
      unidadeId,
      unidade,
      aguardandoGestor ? "aprovacaoGestor" : "homologacaoRH",
    );
    detalhes.push({
      id: `homologacao-${homologacao.id}`,
      servidor: nomeServidor(homologacao.servidor) || homologacao.servidor.matricula,
      unidade,
      tipo: aguardandoGestor ? "Aprovação do gestor" : "Homologação RH",
      responsavelAtual: aguardandoGestor ? "Gestor" : "RH",
      diasEmAberto,
      status:
        STATUS_HOMOLOGACAO[String(homologacao.status)] ??
        String(homologacao.status),
      criticidade: criticidadePorDias(diasEmAberto),
      href: `/homologacao/${homologacao.id}`,
    });
  }

  const detalhesOrdenados = detalhes.sort(
    (a, b) => b.diasEmAberto - a.diasEmAberto,
  );
  const totalAbertas = detalhes.length;
  const vencidas = detalhes.filter((item) => item.diasEmAberto >= 5).length;
  const mediaDiasEmAberto =
    totalAbertas > 0
      ? Math.round(
          (detalhes.reduce((total, item) => total + item.diasEmAberto, 0) /
            totalAbertas) *
            10,
        ) / 10
      : 0;
  const porUnidade = Array.from(mapaUnidades.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    totalAbertas,
    servidoresAfetados: servidoresAfetados.size,
    unidadeMaisCritica: porUnidade[0]?.unidade ?? "-",
    vencidas,
    mediaDiasEmAberto,
    aguardandoGestor: detalhes.filter(
      (item) => item.responsavelAtual === "Gestor",
    ).length,
    aguardandoRh: detalhes.filter((item) => item.responsavelAtual === "RH").length,
    porUnidade,
    detalhes: detalhesOrdenados.slice(0, 12),
  };
}

async function calcularSerieFrequenciaAssiduidadeMensal(params: {
  ano: number;
  mes: number;
  servidorIds?: string[];
}) {
  const periodos = periodosIndicadoresMensais(params.ano, params.mes);
  const servidorWhere = params.servidorIds
    ? { servidorId: { in: params.servidorIds } }
    : {};

  return Promise.all(
    periodos.map(async (periodo): Promise<FrequenciaAssiduidadeMensal> => {
      const apuracoes = await prisma.apuracaoDiaria.groupBy({
        by: ["resultado"],
        where: {
          ...servidorWhere,
          dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
          cargaPrevistaMinutos: { gt: 0 },
        },
        _count: true,
      });
      const total = apuracoes.reduce((soma, item) => soma + item._count, 0);
      const frequenciaValida = apuracoes
        .filter((item) => resultadoEhFrequenciaValida(String(item.resultado)))
        .reduce((soma, item) => soma + item._count, 0);
      const problemasAssiduidade = apuracoes
        .filter((item) => resultadoEhProblemaAssiduidade(String(item.resultado)))
        .reduce((soma, item) => soma + item._count, 0);
      const problemasFrequencia = apuracoes
        .filter((item) => resultadoEhProblemaFrequencia(String(item.resultado)))
        .reduce((soma, item) => soma + item._count, 0);

      return {
        label: periodo.label,
        competencia: periodo.valorInput,
        frequencia: percentual(frequenciaValida, total),
        assiduidade: percentual(total - problemasAssiduidade, total),
        ausenciasInconsistencias: percentual(problemasFrequencia, total),
      };
    }),
  );
}

async function calcularFrequenciaAssiduidade(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
}): Promise<FrequenciaAssiduidadeResumo> {
  const { periodo, servidorIds } = params;
  const servidorWhere = servidorIds ? { servidorId: { in: servidorIds } } : {};
  const [serieMensal, apuracoes, ocorrenciasAbertas] = await Promise.all([
    calcularSerieFrequenciaAssiduidadeMensal({
      ano: periodo.ano,
      mes: periodo.mes,
      servidorIds,
    }),
    prisma.apuracaoDiaria.findMany({
      where: {
        ...servidorWhere,
        dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
        cargaPrevistaMinutos: { gt: 0 },
      },
      include: {
        servidor: {
          include: {
            usuario: true,
            lotacoes: {
              where: {
                status: "ATIVO",
                dataInicio: { lt: periodo.fim },
                OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
              },
              include: { unidade: true },
              orderBy: { dataInicio: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.ocorrenciaFrequencia.findMany({
      where: {
        ...servidorWhere,
        resolvida: false,
        apuracaoDiaria: {
          dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
        },
      },
      select: { servidorId: true },
    }),
  ]);

  type Acumulado = {
    unidadeId: string;
    unidade: string;
    total: number;
    frequenciaValida: number;
    problemasAssiduidade: number;
    problemasFrequencia: number;
    servidores: Map<
      string,
      {
        servidorId: string;
        servidor: string;
        unidade: string;
        total: number;
        frequenciaValida: number;
        problemasAssiduidade: number;
        problemasFrequencia: number;
      }
    >;
  };

  const porUnidade = new Map<string, Acumulado>();
  const pendenciasPorServidor = new Map<string, number>();
  for (const ocorrencia of ocorrenciasAbertas) {
    pendenciasPorServidor.set(
      ocorrencia.servidorId,
      (pendenciasPorServidor.get(ocorrencia.servidorId) ?? 0) + 1,
    );
  }

  for (const apuracao of apuracoes) {
    const resultado = String(apuracao.resultado);
    const lotacao = apuracao.servidor.lotacoes[0];
    const unidadeId = lotacao?.unidadeId ?? "sem-unidade";
    const unidade = lotacao?.unidade.sigla ?? "Sem unidade";
    const acumulado =
      porUnidade.get(unidadeId) ??
      ({
        unidadeId,
        unidade,
        total: 0,
        frequenciaValida: 0,
        problemasAssiduidade: 0,
        problemasFrequencia: 0,
        servidores: new Map(),
      } satisfies Acumulado);
    const servidor =
      acumulado.servidores.get(apuracao.servidorId) ??
      {
        servidorId: apuracao.servidorId,
        servidor: nomeServidor(apuracao.servidor) || apuracao.servidor.matricula,
        unidade,
        total: 0,
        frequenciaValida: 0,
        problemasAssiduidade: 0,
        problemasFrequencia: 0,
      };

    acumulado.total += 1;
    servidor.total += 1;

    if (resultadoEhFrequenciaValida(resultado)) {
      acumulado.frequenciaValida += 1;
      servidor.frequenciaValida += 1;
    }

    if (resultadoEhProblemaAssiduidade(resultado)) {
      acumulado.problemasAssiduidade += 1;
      servidor.problemasAssiduidade += 1;
    }

    if (resultadoEhProblemaFrequencia(resultado)) {
      acumulado.problemasFrequencia += 1;
      servidor.problemasFrequencia += 1;
    }

    acumulado.servidores.set(apuracao.servidorId, servidor);
    porUnidade.set(unidadeId, acumulado);
  }

  const total = Array.from(porUnidade.values()).reduce(
    (soma, unidade) => soma + unidade.total,
    0,
  );
  const frequenciaValida = Array.from(porUnidade.values()).reduce(
    (soma, unidade) => soma + unidade.frequenciaValida,
    0,
  );
  const problemasAssiduidade = Array.from(porUnidade.values()).reduce(
    (soma, unidade) => soma + unidade.problemasAssiduidade,
    0,
  );
  const detalhes = Array.from(porUnidade.values())
    .flatMap((unidade) =>
      Array.from(unidade.servidores.values()).map((servidor) => {
        const frequencia = percentual(servidor.frequenciaValida, servidor.total);
        const assiduidade = percentual(
          servidor.total - servidor.problemasAssiduidade,
          servidor.total,
        );
        const pendencias = pendenciasPorServidor.get(servidor.servidorId) ?? 0;
        const situacao: FrequenciaAssiduidadeServidor["situacao"] =
          assiduidade < 85 || servidor.problemasFrequencia >= 3
            ? "Critica"
            : assiduidade < 95 || pendencias > 0
              ? "Atencao"
              : "Regular";

        return {
          servidorId: servidor.servidorId,
          servidor: servidor.servidor,
          unidade: servidor.unidade,
          frequencia,
          assiduidade,
          ausencias: servidor.problemasFrequencia,
          pendencias,
          situacao,
          href: `/espelho-ponto?servidorId=${servidor.servidorId}&competencia=${periodo.valorInput}`,
        };
      }),
    )
    .sort((a, b) => a.assiduidade - b.assiduidade || b.ausencias - a.ausencias);

  const rankingUnidades = Array.from(porUnidade.values())
    .map((unidade) => ({
      unidadeId: unidade.unidadeId,
      unidade: unidade.unidade,
      frequencia: percentual(unidade.frequenciaValida, unidade.total),
      assiduidade: percentual(
        unidade.total - unidade.problemasAssiduidade,
        unidade.total,
      ),
      ausenciasInconsistencias: percentual(
        unidade.problemasFrequencia,
        unidade.total,
      ),
      servidoresCriticos: Array.from(unidade.servidores.values()).filter(
        (servidor) =>
          percentual(servidor.total - servidor.problemasAssiduidade, servidor.total) <
            85 || servidor.problemasFrequencia >= 3,
      ).length,
    }))
    .sort((a, b) => a.assiduidade - b.assiduidade)
    .slice(0, 10);
  const frequenciaMedia = percentual(frequenciaValida, total);
  const assiduidadeMedia = percentual(total - problemasAssiduidade, total);
  const mesAtual = serieMensal[serieMensal.length - 1];
  const mesAnterior = serieMensal.length > 1 ? serieMensal[serieMensal.length - 2] : mesAtual;

  return {
    frequenciaMedia,
    assiduidadeMedia,
    servidoresCriticos: detalhes.filter((item) => item.situacao === "Critica")
      .length,
    ausenciasInjustificadas: apuracoes.filter(
      (item) => item.resultado === "FALTA",
    ).length,
    jornadasIncompletas: apuracoes.filter(
      (item) => item.resultado === "INCOMPLETA" || item.resultado === "DEBITO",
    ).length,
    unidadeMenorAssiduidade: rankingUnidades[0]?.unidade ?? "-",
    variacaoMesAnterior: Math.round(
      ((mesAtual?.assiduidade ?? 0) - (mesAnterior?.assiduidade ?? 0)) * 10,
    ) / 10,
    serieMensal,
    rankingUnidades,
    detalhes: detalhes.slice(0, 12),
  };
}

async function calcularJustificativasAssiduidade(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
}): Promise<JustificativasAssiduidadeResumo> {
  const { periodo, servidorIds } = params;
  const servidorWhere = servidorIds ? { servidorId: { in: servidorIds } } : {};
  const periodos = periodosIndicadoresMensais(periodo.ano, periodo.mes);
  const limiteVencimentoDias = 5;

  const serieMensal = await Promise.all(
    periodos.map(async (mes): Promise<JustificativasAssiduidadeMensal> => {
      const [solicitacoes, apuracoes, ocorrenciasSemJustificativa] =
        await Promise.all([
          prisma.solicitacao.findMany({
            where: {
              ...servidorWhere,
              criadoEm: { gte: mes.inicio, lt: mes.fim },
            },
            select: { status: true, tipo: true, criadoEm: true },
          }),
          prisma.apuracaoDiaria.groupBy({
            by: ["resultado"],
            where: {
              ...servidorWhere,
              dataReferencia: { gte: mes.inicio, lt: mes.fim },
              cargaPrevistaMinutos: { gt: 0 },
            },
            _count: true,
          }),
          prisma.ocorrenciaFrequencia.count({
            where: {
              ...servidorWhere,
              resolvida: false,
              tipo: { in: ["FALTA", "MARCACAO_INCOMPLETA"] },
              apuracaoDiaria: {
                dataReferencia: { gte: mes.inicio, lt: mes.fim },
              },
            },
          }),
        ]);
      const justificativas = solicitacoes.filter((item) =>
        tipoSolicitacaoEhJustificativa(String(item.tipo)),
      );
      const totalApuracoes = apuracoes.reduce((total, item) => total + item._count, 0);
      const problemasAssiduidade = apuracoes
        .filter((item) => resultadoEhProblemaAssiduidade(String(item.resultado)))
        .reduce((total, item) => total + item._count, 0);
      const pendentes = justificativas.filter((item) =>
        ["ENVIADA", "EM_ANALISE"].includes(String(item.status)),
      );

      return {
        label: mes.label,
        competencia: mes.valorInput,
        justificativasDeferidas: justificativas.filter(
          (item) => item.status === "DEFERIDA",
        ).length,
        justificativasPendentes: pendentes.length,
        justificativasIndeferidas: justificativas.filter(
          (item) => item.status === "INDEFERIDA",
        ).length,
        justificativasVencidas: pendentes.filter(
          (item) => diferencaDias(item.criadoEm, mes.fim) >= limiteVencimentoDias,
        ).length,
        ausenciasSemJustificativa: ocorrenciasSemJustificativa,
        assiduidade: percentual(totalApuracoes - problemasAssiduidade, totalApuracoes),
      };
    }),
  );

  const [solicitacoesPeriodo, ocorrenciasSemJustificativa, apuracoesPeriodo] =
    await Promise.all([
      prisma.solicitacao.findMany({
        where: {
          ...servidorWhere,
          criadoEm: { gte: periodo.inicio, lt: periodo.fim },
        },
        include: {
          servidor: {
            include: {
              usuario: true,
              lotacoes: {
                where: {
                  status: "ATIVO",
                  dataInicio: { lt: periodo.fim },
                  OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
                },
                include: { unidade: true },
                orderBy: { dataInicio: "desc" },
                take: 1,
              },
            },
          },
          unidade: true,
        },
        orderBy: { criadoEm: "asc" },
      }),
      prisma.ocorrenciaFrequencia.findMany({
        where: {
          ...servidorWhere,
          resolvida: false,
          tipo: { in: ["FALTA", "MARCACAO_INCOMPLETA"] },
          apuracaoDiaria: {
            dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
          },
        },
        include: {
          servidor: {
            include: {
              usuario: true,
              lotacoes: {
                where: {
                  status: "ATIVO",
                  dataInicio: { lt: periodo.fim },
                  OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
                },
                include: { unidade: true },
                orderBy: { dataInicio: "desc" },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.apuracaoDiaria.groupBy({
        by: ["resultado"],
        where: {
          ...servidorWhere,
          dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
          cargaPrevistaMinutos: { gt: 0 },
        },
        _count: true,
      }),
    ]);

  const justificativas = solicitacoesPeriodo.filter((item) =>
    tipoSolicitacaoEhJustificativa(String(item.tipo)),
  );
  const justificativasAbertas = justificativas.filter((item) =>
    ["ENVIADA", "EM_ANALISE"].includes(String(item.status)),
  );
  const justificativasDecididas = justificativas.filter((item) =>
    ["DEFERIDA", "INDEFERIDA"].includes(String(item.status)),
  );
  const totalApuracoes = apuracoesPeriodo.reduce((total, item) => total + item._count, 0);
  const problemasAssiduidade = apuracoesPeriodo
    .filter((item) => resultadoEhProblemaAssiduidade(String(item.resultado)))
    .reduce((total, item) => total + item._count, 0);
  const mapaUnidades = new Map<string, JustificativasAssiduidadeUnidade>();
  const detalhes: JustificativasAssiduidadeDetalhe[] = [];
  const agora = new Date();

  function acumularUnidade(
    unidadeId: string,
    unidade: string,
    campo: keyof Omit<JustificativasAssiduidadeUnidade, "unidadeId" | "unidade" | "total">,
  ) {
    const atual =
      mapaUnidades.get(unidadeId) ?? {
        unidadeId,
        unidade,
        pendentes: 0,
        vencidas: 0,
        semJustificativa: 0,
        total: 0,
      };

    atual[campo] += 1;
    atual.total += 1;
    mapaUnidades.set(unidadeId, atual);
  }

  for (const solicitacao of justificativas) {
    const lotacao = solicitacao.servidor.lotacoes[0];
    const unidadeId =
      solicitacao.unidadeId ?? lotacao?.unidadeId ?? "sem-unidade";
    const unidade =
      solicitacao.unidade?.sigla ?? lotacao?.unidade.sigla ?? "Sem unidade";
    const dias = diferencaDias(solicitacao.criadoEm, agora);
    const aberta = ["ENVIADA", "EM_ANALISE"].includes(String(solicitacao.status));
    const vencida = aberta && dias >= limiteVencimentoDias;

    if (aberta) acumularUnidade(unidadeId, unidade, "pendentes");
    if (vencida) acumularUnidade(unidadeId, unidade, "vencidas");

    detalhes.push({
      id: `solicitacao-${solicitacao.id}`,
      servidor: nomeServidor(solicitacao.servidor) || solicitacao.servidor.matricula,
      unidade,
      ocorrencia: "Solicitacao de justificativa",
      justificativa: TIPOS_SOLICITACAO[String(solicitacao.tipo)] ?? String(solicitacao.tipo),
      status: STATUS_SOLICITACAO[String(solicitacao.status)] ?? String(solicitacao.status),
      diasEmAnalise: dias,
      impactoAssiduidade:
        solicitacao.status === "INDEFERIDA" ? "Impacta" : aberta ? "Risco" : "Baixo",
      href: `/solicitacoes/${solicitacao.id}`,
    });
  }

  for (const ocorrencia of ocorrenciasSemJustificativa) {
    const lotacao = ocorrencia.servidor.lotacoes[0];
    const unidadeId = lotacao?.unidadeId ?? "sem-unidade";
    const unidade = lotacao?.unidade.sigla ?? "Sem unidade";
    const dias = diferencaDias(ocorrencia.criadoEm, agora);

    acumularUnidade(unidadeId, unidade, "semJustificativa");
    detalhes.push({
      id: `ocorrencia-${ocorrencia.id}`,
      servidor: nomeServidor(ocorrencia.servidor) || ocorrencia.servidor.matricula,
      unidade,
      ocorrencia: TIPOS_PENDENCIA_OCORRENCIA[String(ocorrencia.tipo)] ?? "Ausencia sem justificativa",
      justificativa: "Nao registrada",
      status: "Sem justificativa",
      diasEmAnalise: dias,
      impactoAssiduidade: "Impacta",
      href: `/espelho-ponto?servidorId=${ocorrencia.servidorId}&competencia=${periodo.valorInput}`,
    });
  }

  const tempoAnalise = justificativasDecididas.map((item) =>
    diferencaDias(item.criadoEm, item.analisadaEm ?? item.atualizadoEm),
  );

  return {
    assiduidadeMedia: percentual(totalApuracoes - problemasAssiduidade, totalApuracoes),
    justificativasAbertas: justificativasAbertas.length,
    justificativasVencidas: justificativasAbertas.filter(
      (item) => diferencaDias(item.criadoEm, agora) >= limiteVencimentoDias,
    ).length,
    deferidasPercentual: percentual(
      justificativas.filter((item) => item.status === "DEFERIDA").length,
      justificativasDecididas.length,
    ),
    indeferidasPercentual: percentual(
      justificativas.filter((item) => item.status === "INDEFERIDA").length,
      justificativasDecididas.length,
    ),
    ausenciasSemJustificativa: ocorrenciasSemJustificativa.length,
    tempoMedioAnaliseDias:
      tempoAnalise.length > 0
        ? Math.round(
            (tempoAnalise.reduce((total, dias) => total + dias, 0) /
              tempoAnalise.length) *
              10,
          ) / 10
        : 0,
    serieMensal,
    rankingUnidades: Array.from(mapaUnidades.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    detalhes: detalhes
      .sort((a, b) => b.diasEmAnalise - a.diasEmAnalise)
      .slice(0, 12),
  };
}

async function calcularHomologacaoMensal(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
}): Promise<HomologacaoMensalResumo> {
  const { periodo, servidorIds } = params;
  const servidorIdWhere = servidorIds ? { id: { in: servidorIds } } : {};
  const servidorWhere = servidorIds ? { servidorId: { in: servidorIds } } : {};
  const hoje = new Date();
  const prazoFinal = new Date(periodo.ano, periodo.mes, 5);
  const diasPrazoFinal = Math.max(0, Math.ceil((prazoFinal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
  const prazoVencido = hoje > prazoFinal;

  const [servidoresEsperados, homologacoes] = await Promise.all([
    prisma.servidor.findMany({
      where: {
        ...servidorIdWhere,
        ativo: true,
        usuario: { ativo: true },
        lotacoes: {
          some: {
            status: "ATIVO",
            dataInicio: { lt: periodo.fim },
            OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
          },
        },
      },
      include: {
        usuario: true,
        lotacoes: {
          where: {
            status: "ATIVO",
            dataInicio: { lt: periodo.fim },
            OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
          },
          include: { unidade: true },
          orderBy: { dataInicio: "desc" },
          take: 1,
        },
      },
    }),
    prisma.homologacaoServidorMes.findMany({
      where: {
        ...servidorWhere,
        fechamento: {
          anoReferencia: periodo.ano,
          mesReferencia: periodo.mes,
        },
      },
      include: {
        servidor: {
          include: {
            usuario: true,
            lotacoes: {
              where: {
                status: "ATIVO",
                dataInicio: { lt: periodo.fim },
                OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
              },
              include: { unidade: true },
              orderBy: { dataInicio: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  const homologacaoPorServidor = new Map(
    homologacoes.map((homologacao) => [homologacao.servidorId, homologacao]),
  );
  const unidades = new Map<string, HomologacaoMensalUnidade>();
  const detalhes: HomologacaoMensalDetalhe[] = [];

  for (const servidor of servidoresEsperados) {
    const lotacao = servidor.lotacoes[0];
    const unidadeId = lotacao?.unidadeId ?? "sem-unidade";
    const unidade = lotacao?.unidade.sigla ?? "Sem unidade";
    const atual =
      unidades.get(unidadeId) ?? {
        unidadeId,
        unidade,
        esperados: 0,
        enviados: 0,
        homologados: 0,
        pendenteServidor: 0,
        pendenteChefia: 0,
        pendenteRh: 0,
        percentualHomologado: 0,
        situacao: "Critico",
      };
    const homologacao = homologacaoPorServidor.get(servidor.id);
    const status = String(homologacao?.status ?? "NAO_ENVIADO");

    atual.esperados += 1;

    if (homologacao) {
      atual.enviados += 1;
    }

    if (["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(status)) {
      atual.homologados += 1;
    } else if (["COM_PENDENCIAS", "DEVOLVIDO", "NAO_ENVIADO"].includes(status)) {
      atual.pendenteServidor += 1;
    } else if (status === "PENDENTE") {
      atual.pendenteChefia += 1;
    } else {
      atual.pendenteRh += 1;
    }

    if (!["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(status)) {
      detalhes.push({
        id: homologacao?.id ?? `nao-enviado-${servidor.id}`,
        unidade,
        servidor: nomeServidor(servidor) || servidor.matricula,
        status:
          status === "NAO_ENVIADO"
            ? "Nao enviado"
            : STATUS_HOMOLOGACAO[status] ?? status,
        responsavelAtual:
          status === "NAO_ENVIADO" ? "Servidor" : responsavelHomologacao(status),
        pendencia:
          status === "NAO_ENVIADO"
            ? "Espelho ainda nao enviado"
            : pendenciaHomologacao(status),
        diasAtraso: homologacao
          ? diferencaDias(homologacao.criadoEm, hoje)
          : diferencaDias(periodo.inicio, hoje),
        href: homologacao
          ? `/homologacao/${homologacao.id}`
          : `/espelho-ponto?servidorId=${servidor.id}&competencia=${periodo.valorInput}`,
      });
    }

    unidades.set(unidadeId, atual);
  }

  const porUnidade = Array.from(unidades.values()).map((unidade) => {
    const percentualHomologado = percentual(unidade.homologados, unidade.esperados);

    return {
      ...unidade,
      percentualHomologado,
      situacao: situacaoHomologacao(percentualHomologado, prazoVencido),
    };
  });
  const espelhosEsperados = porUnidade.reduce(
    (total, unidade) => total + unidade.esperados,
    0,
  );
  const espelhosEnviados = porUnidade.reduce(
    (total, unidade) => total + unidade.enviados,
    0,
  );
  const homologados = porUnidade.reduce(
    (total, unidade) => total + unidade.homologados,
    0,
  );
  const pendentesServidor = porUnidade.reduce(
    (total, unidade) => total + unidade.pendenteServidor,
    0,
  );
  const pendentesChefia = porUnidade.reduce(
    (total, unidade) => total + unidade.pendenteChefia,
    0,
  );
  const pendentesRh = porUnidade.reduce(
    (total, unidade) => total + unidade.pendenteRh,
    0,
  );

  return {
    competencia: periodo.rotulo,
    espelhosEsperados,
    espelhosEnviados,
    homologados,
    pendentesServidor,
    pendentesChefia,
    pendentesRh,
    unidadesFechadas: porUnidade.filter((unidade) => unidade.percentualHomologado >= 100).length,
    diasPrazoFinal,
    porUnidade: porUnidade
      .sort((a, b) => a.percentualHomologado - b.percentualHomologado)
      .slice(0, 10),
    detalhes: detalhes.sort((a, b) => b.diasAtraso - a.diasAtraso).slice(0, 12),
    funil: [
      { label: "Esperados", valor: espelhosEsperados },
      { label: "Enviados", valor: espelhosEnviados },
      { label: "Pend. chefia", valor: pendentesChefia },
      { label: "Pend. RH", valor: pendentesRh },
      { label: "Homologados", valor: homologados },
    ],
  };
}

async function calcularJornadaCargaHoraria(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
}): Promise<JornadaCargaHorariaResumo> {
  const { periodo, servidorIds } = params;
  const servidorWhere = servidorIds ? { servidorId: { in: servidorIds } } : {};
  const apuracoes = await prisma.apuracaoDiaria.findMany({
    where: {
      ...servidorWhere,
      dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
      cargaPrevistaMinutos: { gt: 0 },
    },
    include: {
      servidor: {
        include: {
          usuario: true,
          lotacoes: {
            where: {
              status: "ATIVO",
              dataInicio: { lt: periodo.fim },
              OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
            },
            include: { unidade: true },
            orderBy: { dataInicio: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  type AcumuladoUnidade = {
    unidadeId: string;
    unidade: string;
    prevista: number;
    realizada: number;
    incompletas: number;
    servidores: Map<
      string,
      {
        servidorId: string;
        servidor: string;
        unidade: string;
        prevista: number;
        realizada: number;
        incompletas: number;
      }
    >;
  };

  const unidades = new Map<string, AcumuladoUnidade>();

  for (const apuracao of apuracoes) {
    const lotacao = apuracao.servidor.lotacoes[0];
    const unidadeId = lotacao?.unidadeId ?? "sem-unidade";
    const unidade = lotacao?.unidade.sigla ?? "Sem unidade";
    const realizada = Math.max(0, apuracao.minutosTrabalhados);
    const atual =
      unidades.get(unidadeId) ??
      ({
        unidadeId,
        unidade,
        prevista: 0,
        realizada: 0,
        incompletas: 0,
        servidores: new Map(),
      } satisfies AcumuladoUnidade);
    const servidor =
      atual.servidores.get(apuracao.servidorId) ??
      {
        servidorId: apuracao.servidorId,
        servidor: nomeServidor(apuracao.servidor) || apuracao.servidor.matricula,
        unidade,
        prevista: 0,
        realizada: 0,
        incompletas: 0,
      };

    atual.prevista += apuracao.cargaPrevistaMinutos;
    atual.realizada += realizada;
    servidor.prevista += apuracao.cargaPrevistaMinutos;
    servidor.realizada += realizada;

    if (["INCOMPLETA", "DEBITO"].includes(String(apuracao.resultado))) {
      atual.incompletas += 1;
      servidor.incompletas += 1;
    }

    atual.servidores.set(apuracao.servidorId, servidor);
    unidades.set(unidadeId, atual);
  }

  const detalhes = Array.from(unidades.values())
    .flatMap((unidade) =>
      Array.from(unidade.servidores.values()).map((servidor) => {
        const horasPrevistas = minutosParaHoras(servidor.prevista);
        const horasRealizadas = minutosParaHoras(servidor.realizada);
        const saldoHoras = Math.round((horasRealizadas - horasPrevistas) * 10) / 10;
        const aderencia = percentual(servidor.realizada, servidor.prevista);

        return {
          servidorId: servidor.servidorId,
          servidor: servidor.servidor,
          unidade: servidor.unidade,
          horasPrevistas,
          horasRealizadas,
          saldoHoras,
          aderencia,
          situacao: classificarAderencia(aderencia),
          href: `/espelho-ponto?servidorId=${servidor.servidorId}&competencia=${periodo.valorInput}`,
        };
      }),
    )
    .sort(
      (a, b) =>
        Math.abs(b.saldoHoras) - Math.abs(a.saldoHoras) ||
        a.aderencia - b.aderencia,
    );
  const porUnidade = Array.from(unidades.values())
    .map((unidade) => {
      const horasPrevistas = minutosParaHoras(unidade.prevista);
      const horasRealizadas = minutosParaHoras(unidade.realizada);
      const saldoHoras = Math.round((horasRealizadas - horasPrevistas) * 10) / 10;
      const aderencia = percentual(unidade.realizada, unidade.prevista);
      const servidoresCriticos = Array.from(unidade.servidores.values()).filter(
        (servidor) =>
          ["Critico", "Excesso"].includes(
            classificarAderencia(percentual(servidor.realizada, servidor.prevista)),
          ),
      ).length;

      return {
        unidadeId: unidade.unidadeId,
        unidade: unidade.unidade,
        horasPrevistas,
        horasRealizadas,
        saldoHoras,
        aderencia,
        servidoresCriticos,
      };
    })
    .sort(
      (a, b) =>
        Math.abs(b.saldoHoras) - Math.abs(a.saldoHoras) ||
        a.aderencia - b.aderencia,
    )
    .slice(0, 10);
  const cargaPrevistaMinutos = Array.from(unidades.values()).reduce(
    (total, unidade) => total + unidade.prevista,
    0,
  );
  const cargaRealizadaMinutos = Array.from(unidades.values()).reduce(
    (total, unidade) => total + unidade.realizada,
    0,
  );
  const cargaPrevistaHoras = minutosParaHoras(cargaPrevistaMinutos);
  const cargaRealizadaHoras = minutosParaHoras(cargaRealizadaMinutos);
  const saldoGeralHoras =
    Math.round((cargaRealizadaHoras - cargaPrevistaHoras) * 10) / 10;

  return {
    cargaPrevistaHoras,
    cargaRealizadaHoras,
    saldoGeralHoras,
    aderencia: percentual(cargaRealizadaMinutos, cargaPrevistaMinutos),
    servidoresDeficit: detalhes.filter((item) => item.situacao === "Critico")
      .length,
    servidoresExcesso: detalhes.filter((item) => item.situacao === "Excesso")
      .length,
    jornadasIncompletas: Array.from(unidades.values()).reduce(
      (total, unidade) => total + unidade.incompletas,
      0,
    ),
    unidadeMaisCritica: porUnidade[0]?.unidade ?? "-",
    porUnidade,
    saldosPorUnidade: porUnidade.map((unidade) => ({
      label: unidade.unidade,
      valor: unidade.saldoHoras,
    })),
    detalhes: detalhes.slice(0, 12),
  };
}

async function listarServidoresAtivosComLotacao(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
}) {
  return prisma.servidor.findMany({
    where: {
      ...(params.servidorIds ? { id: { in: params.servidorIds } } : {}),
      ativo: true,
      usuario: { ativo: true },
    },
    include: {
      usuario: true,
      lotacoes: {
        where: {
          status: "ATIVO",
          dataInicio: { lt: params.periodo.fim },
          OR: [{ dataFim: null }, { dataFim: { gte: params.periodo.inicio } }],
        },
        include: { unidade: true },
        orderBy: { dataInicio: "desc" },
        take: 1,
      },
    },
  });
}

async function mapearTeletrabalhoAutorizado(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
}) {
  const servidorWhere = params.servidorIds
    ? { servidorId: { in: params.servidorIds } }
    : {};
  const [solicitacoes, dispensas] = await Promise.all([
    prisma.solicitacao.findMany({
      where: {
        ...servidorWhere,
        tipo: "DISPENSA_PONTO",
        status: "DEFERIDA",
        OR: [{ dataInicio: null }, { dataInicio: { lt: params.periodo.fim } }],
        AND: [{ OR: [{ dataFim: null }, { dataFim: { gte: params.periodo.inicio } }] }],
      },
      select: {
        servidorId: true,
        titulo: true,
        descricao: true,
        dadosSolicitados: true,
        dataInicio: true,
        dataFim: true,
      },
    }),
    prisma.dispensaPontoServidor.findMany({
      where: {
        ...servidorWhere,
        status: "ATIVO",
        dataInicio: { lt: params.periodo.fim },
        OR: [{ dataFim: null }, { dataFim: { gte: params.periodo.inicio } }],
      },
      select: {
        servidorId: true,
        motivo: true,
        observacao: true,
        atoAutorizativo: true,
        dataInicio: true,
        dataFim: true,
      },
    }),
  ]);

  const autorizados = new Map<
    string,
    {
      autorizacao: TeletrabalhoRegistroWebServidor["autorizacao"];
      modalidade: TeletrabalhoRegistroWebServidor["modalidade"];
    }
  >();

  for (const solicitacao of solicitacoes) {
    if (
      dataSobrepoePeriodo({
        inicio: solicitacao.dataInicio,
        fim: solicitacao.dataFim,
        periodo: params.periodo,
      }) &&
      ehDispensaTeletrabalho({
        tipoSolicitacao: "DISPENSA_PONTO",
        titulo: solicitacao.titulo,
        descricao: solicitacao.descricao,
        dadosSolicitados: solicitacao.dadosSolicitados,
      })
    ) {
      autorizados.set(solicitacao.servidorId, {
        autorizacao: "Teletrabalho deferido",
        modalidade: modalidadeTeletrabalho(solicitacao.dadosSolicitados),
      });
    }
  }

  for (const dispensa of dispensas) {
    if (
      !autorizados.has(dispensa.servidorId) &&
      textoIndicaTeletrabalho(
        dispensa.motivo,
        dispensa.observacao,
        dispensa.atoAutorizativo,
      )
    ) {
      autorizados.set(dispensa.servidorId, {
        autorizacao: "Dispensa ativa",
        modalidade: "Teletrabalho",
      });
    }
  }

  return autorizados;
}

async function calcularSerieTeletrabalhoRegistroWebMensal(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
}) {
  const periodos = periodosIndicadoresMensais(params.periodo.ano, params.periodo.mes);

  return Promise.all(
    periodos.map(async (periodo): Promise<TeletrabalhoRegistroWebMensal> => {
      const periodoMensal = criarPeriodo(periodo.valorInput);
      const [servidores, autorizados, marcacoesPorFonte] = await Promise.all([
        listarServidoresAtivosComLotacao({
          periodo: periodoMensal,
          servidorIds: params.servidorIds,
        }),
        mapearTeletrabalhoAutorizado({
          periodo: periodoMensal,
          servidorIds: params.servidorIds,
        }),
        prisma.marcacao.groupBy({
          by: ["fonte"],
          where: {
            ...(params.servidorIds
              ? { servidorId: { in: params.servidorIds } }
              : {}),
            dataReferencia: { gte: periodoMensal.inicio, lt: periodoMensal.fim },
            status: "VALIDA",
          },
          _count: true,
        }),
      ]);
      const totalMarcacoes = marcacoesPorFonte.reduce(
        (total, item) => total + item._count,
        0,
      );
      const marcacoesWeb =
        marcacoesPorFonte.find((item) => item.fonte === "WEB")?._count ?? 0;
      const teletrabalho = servidores.filter((servidor) =>
        autorizados.has(servidor.id),
      ).length;

      return {
        label: periodo.label,
        competencia: periodo.valorInput,
        presencial: Math.max(0, servidores.length - teletrabalho),
        teletrabalho,
        percentualRegistroWeb: percentual(marcacoesWeb, totalMarcacoes),
      };
    }),
  );
}

async function calcularTeletrabalhoRegistroWeb(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
}): Promise<TeletrabalhoRegistroWebResumo> {
  const servidorWhere = params.servidorIds
    ? { servidorId: { in: params.servidorIds } }
    : {};
  const [
    servidores,
    autorizados,
    marcacoesPorServidorFonte,
    apuracoesProblematicas,
    serieMensal,
  ] = await Promise.all([
    listarServidoresAtivosComLotacao(params),
    mapearTeletrabalhoAutorizado(params),
    prisma.marcacao.groupBy({
      by: ["servidorId", "fonte"],
      where: {
        ...servidorWhere,
        dataReferencia: { gte: params.periodo.inicio, lt: params.periodo.fim },
        status: "VALIDA",
      },
      _count: true,
    }),
    prisma.apuracaoDiaria.groupBy({
      by: ["servidorId", "resultado"],
      where: {
        ...servidorWhere,
        dataReferencia: { gte: params.periodo.inicio, lt: params.periodo.fim },
        resultado: { in: ["INCOMPLETA", "DEBITO", "FALTA"] },
      },
      _count: true,
    }),
    calcularSerieTeletrabalhoRegistroWebMensal(params),
  ]);

  const fontesPorServidor = new Map<string, Map<string, number>>();
  let marcacoesTotal = 0;
  let marcacoesWeb = 0;
  let marcacoesBiometricoFacial = 0;

  for (const item of marcacoesPorServidorFonte) {
    const mapa =
      fontesPorServidor.get(item.servidorId) ?? new Map<string, number>();
    mapa.set(String(item.fonte), (mapa.get(String(item.fonte)) ?? 0) + item._count);
    fontesPorServidor.set(item.servidorId, mapa);
    marcacoesTotal += item._count;

    if (item.fonte === "WEB") {
      marcacoesWeb += item._count;
    }

    if (["BIOMETRIA_FACIAL", "EQUIPAMENTO_BIOMETRICO"].includes(String(item.fonte))) {
      marcacoesBiometricoFacial += item._count;
    }
  }

  const problemasPorServidor = new Map<string, number>();
  for (const apuracao of apuracoesProblematicas) {
    problemasPorServidor.set(
      apuracao.servidorId,
      (problemasPorServidor.get(apuracao.servidorId) ?? 0) + apuracao._count,
    );
  }

  const unidades = new Map<string, TeletrabalhoRegistroWebUnidade>();
  const detalhes: TeletrabalhoRegistroWebServidor[] = [];

  for (const servidor of servidores) {
    const lotacao = servidor.lotacoes[0];
    const unidadeId = lotacao?.unidadeId ?? "sem-unidade";
    const unidade = lotacao?.unidade.sigla ?? "Sem unidade";
    const autorizacao = autorizados.get(servidor.id);
    const fontes = fontesPorServidor.get(servidor.id) ?? new Map<string, number>();
    const totalServidor = Array.from(fontes.values()).reduce(
      (total, valor) => total + valor,
      0,
    );
    const webServidor = fontes.get("WEB") ?? 0;
    const percentualWeb = percentual(webServidor, totalServidor);
    const origemPredominante = Array.from(fontes.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    const situacao = classificarSituacaoTeletrabalho({
      percentualWeb,
      autorizado: Boolean(autorizacao),
      problemasJornada: problemasPorServidor.get(servidor.id) ?? 0,
    });
    const unidadeAtual =
      unidades.get(unidadeId) ??
      ({
        unidadeId,
        unidade,
        presencial: 0,
        teletrabalho: 0,
        marcacoesTotal: 0,
        marcacoesWeb: 0,
        percentualWeb: 0,
        alertas: 0,
      } satisfies TeletrabalhoRegistroWebUnidade);

    unidadeAtual.marcacoesTotal += totalServidor;
    unidadeAtual.marcacoesWeb += webServidor;
    if (autorizacao) {
      unidadeAtual.teletrabalho += 1;
    } else {
      unidadeAtual.presencial += 1;
    }
    if (situacao !== "Regular") {
      unidadeAtual.alertas += 1;
    }
    unidades.set(unidadeId, unidadeAtual);

    if (totalServidor > 0 || situacao !== "Regular") {
      detalhes.push({
        servidorId: servidor.id,
        servidor: nomeServidor(servidor) || servidor.matricula,
        unidade,
        modalidade: autorizacao?.modalidade ?? "Presencial",
        origemPredominante: origemPredominante
          ? (FONTES_MARCACAO[origemPredominante] ?? origemPredominante)
          : "-",
        percentualWeb,
        autorizacao: autorizacao?.autorizacao ?? "Sem autorizacao",
        situacao,
        href: `/espelho-ponto?servidorId=${servidor.id}&competencia=${params.periodo.valorInput}`,
      });
    }
  }

  const rankingUnidades = Array.from(unidades.values())
    .map((unidade) => ({
      ...unidade,
      percentualWeb: percentual(unidade.marcacoesWeb, unidade.marcacoesTotal),
    }))
    .sort(
      (a, b) =>
        b.percentualWeb - a.percentualWeb ||
        b.marcacoesWeb - a.marcacoesWeb ||
        b.alertas - a.alertas,
    )
    .slice(0, 10);
  const servidoresTeletrabalho = servidores.filter((servidor) =>
    autorizados.has(servidor.id),
  ).length;
  const servidoresPresenciais = Math.max(
    0,
    servidores.length - servidoresTeletrabalho,
  );
  const registroWebSemVinculo = servidores.filter((servidor) => {
    const fontes = fontesPorServidor.get(servidor.id);

    return !autorizados.has(servidor.id) && Boolean(fontes?.get("WEB"));
  }).length;
  const servidoresAlerta = detalhes.filter(
    (detalhe) => detalhe.situacao !== "Regular",
  ).length;

  return {
    servidoresPresenciais,
    servidoresTeletrabalho,
    percentualTeletrabalho: percentual(servidoresTeletrabalho, servidores.length),
    percentualBiometricoFacial: percentual(
      marcacoesBiometricoFacial,
      marcacoesTotal,
    ),
    percentualRegistroWeb: percentual(marcacoesWeb, marcacoesTotal),
    registroWebSemVinculo,
    unidadesUsoWebElevado: rankingUnidades.filter(
      (unidade) => unidade.percentualWeb >= 30,
    ).length,
    servidoresAlerta,
    serieMensal,
    rankingUnidades,
    detalhes: detalhes
      .sort(
        (a, b) =>
          b.percentualWeb - a.percentualWeb ||
          (a.situacao === "Critica" ? -1 : 1),
      )
      .slice(0, 12),
  };
}

async function calcularEquipamentosPonto(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  unidadeIds?: string[];
}): Promise<EquipamentosPontoResumo> {
  const equipamentoWhere = params.unidadeIds
    ? { unidadeId: { in: params.unidadeIds } }
    : {};
  const referencia = new Date();
  const [equipamentos, eventosErro, ultimaColetaAfd, pendentesPorEquipamento] =
    await Promise.all([
      prisma.equipamentoBiometrico.findMany({
        where: params.unidadeIds ? equipamentoWhere : undefined,
        include: {
          unidade: true,
          eventos: {
            orderBy: { recebidoEm: "desc" },
            take: 1,
            select: { nsr: true, recebidoEm: true },
          },
        },
      }),
      prisma.eventoEquipamentoBiometrico.groupBy({
        by: ["equipamentoId"],
        where: {
          ...(params.unidadeIds
            ? { equipamento: { unidadeId: { in: params.unidadeIds } } }
            : {}),
          tipoEvento: "ERRO",
          recebidoEm: { gte: params.periodo.inicio, lt: params.periodo.fim },
        },
        _count: true,
      }),
      prisma.arquivoAfd.findFirst({
        where: {
          status: { in: ["PROCESSADO", "PROCESSADO_COM_ERROS"] },
        },
        orderBy: [{ finalizadoEm: "desc" }, { criadoEm: "desc" }],
        select: { finalizadoEm: true, criadoEm: true },
      }),
      prisma.marcacaoBruta.groupBy({
        by: ["equipamentoId"],
        where: {
          equipamentoId: { not: null },
          processada: false,
        },
        _count: true,
      }),
    ]);

  const falhasPorEquipamento = new Map(
    eventosErro.map((evento) => [evento.equipamentoId, evento._count]),
  );
  const equipamentoIds = new Set(equipamentos.map((equipamento) => equipamento.id));
  const pendentesMap = new Map(
    pendentesPorEquipamento
      .filter((item) => item.equipamentoId && equipamentoIds.has(item.equipamentoId))
      .map((item) => [item.equipamentoId as string, item._count]),
  );
  const unidades = new Map<string, EquipamentosPontoUnidade>();
  const detalhes: EquipamentoPontoDetalhe[] = [];

  for (const equipamento of equipamentos) {
    const unidadeId = equipamento.unidadeId ?? "sem-unidade";
    const unidadeNome =
      equipamento.unidade?.sigla ??
      equipamento.unidade?.nome ??
      equipamento.localizacao ??
      "Sem unidade";
    const status = classificarStatusEquipamento({
      ativo: equipamento.ativo,
      ultimoHeartbeatEm: equipamento.ultimoHeartbeatEm,
      ultimaSincronizacaoEm: equipamento.ultimaSincronizacaoEm,
      referencia,
    });
    const unidade =
      unidades.get(unidadeId) ??
      ({
        unidadeId,
        unidade: unidadeNome,
        online: 0,
        atrasoComunicacao: 0,
        offline: 0,
        manutencao: 0,
        semSincronizacaoRecente: 0,
        total: 0,
      } satisfies EquipamentosPontoUnidade);

    incrementarStatusEquipamento(unidade, status);
    unidades.set(unidadeId, unidade);

    detalhes.push({
      equipamentoId: equipamento.id,
      equipamento: `${equipamento.codigo} - ${equipamento.nome}`,
      unidade: unidadeNome,
      ip: equipamento.ip ?? "-",
      tipo: [equipamento.fabricante, equipamento.modelo].filter(Boolean).join(" / ") || "Biometrico",
      ultimaComunicacao: formatarDataHoraPainel(equipamento.ultimoHeartbeatEm),
      tempoSemComunicarMinutos: Number.isFinite(
        minutosDesde(equipamento.ultimoHeartbeatEm, referencia),
      )
        ? minutosDesde(equipamento.ultimoHeartbeatEm, referencia)
        : 0,
      ultimaSincronizacao: formatarDataHoraPainel(
        equipamento.ultimaSincronizacaoEm,
      ),
      ultimaNsr: equipamento.eventos[0]?.nsr ?? "-",
      status,
      marcacoesPendentes: pendentesMap.get(equipamento.id) ?? 0,
      falhasMes: falhasPorEquipamento.get(equipamento.id) ?? 0,
      href: `/equipamentos/${equipamento.id}/editar`,
    });
  }

  const porUnidade = Array.from(unidades.values())
    .sort(
      (a, b) =>
        b.offline +
          b.atrasoComunicacao +
          b.semSincronizacaoRecente +
          b.manutencao -
          (a.offline +
            a.atrasoComunicacao +
            a.semSincronizacaoRecente +
            a.manutencao) ||
        b.total - a.total,
    )
    .slice(0, 10);
  const rankingFalhas = detalhes
    .filter((item) => item.falhasMes > 0)
    .sort((a, b) => b.falhasMes - a.falhasMes)
    .slice(0, 8)
    .map((item) => ({ label: item.equipamento, valor: item.falhasMes }));

  return {
    totalEquipamentos: equipamentos.length,
    online: detalhes.filter((item) => item.status === "Online").length,
    offline: detalhes.filter((item) => item.status === "Offline").length,
    atrasoComunicacao: detalhes.filter((item) => item.status === "Atraso")
      .length,
    manutencao: detalhes.filter((item) => item.status === "Manutencao").length,
    semSincronizacaoRecente: detalhes.filter(
      (item) => item.status === "Sem sincronizacao",
    ).length,
    ultimaColetaAfd: formatarDataHoraPainel(
      ultimaColetaAfd?.finalizadoEm ?? ultimaColetaAfd?.criadoEm,
    ),
    marcacoesPendentesImportacao: detalhes.reduce(
      (total, item) => total + item.marcacoesPendentes,
      0,
    ),
    unidadeMaisCritica: porUnidade[0]?.unidade ?? "-",
    porUnidade,
    rankingFalhas,
    detalhes: detalhes
      .sort(
        (a, b) =>
          b.marcacoesPendentes - a.marcacoesPendentes ||
          b.falhasMes - a.falhasMes ||
          b.tempoSemComunicarMinutos - a.tempoSemComunicarMinutos,
      )
      .slice(0, 12),
  };
}

async function calcularAuditoriaConformidade(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
  orgaoIds?: string[];
  servidoresAtivos: number;
  pendenciasPonto: PendenciasPontoResumo;
  justificativasAssiduidade: JustificativasAssiduidadeResumo;
  homologacaoMensal: HomologacaoMensalResumo;
  frequenciaAssiduidade: FrequenciaAssiduidadeResumo;
  teletrabalhoRegistroWeb: TeletrabalhoRegistroWebResumo;
  equipamentosPonto: EquipamentosPontoResumo;
}): Promise<AuditoriaConformidadeResumo> {
  const auditoriaEscopo =
    params.servidorIds && params.servidorIds.length > 0
      ? {
          OR: [
            { usuario: { servidor: { id: { in: params.servidorIds } } } },
            { entidadeId: { in: params.servidorIds } },
          ],
        }
      : params.orgaoIds && params.orgaoIds.length > 0
        ? {
            OR: [
              { usuario: { servidor: { orgaoId: { in: params.orgaoIds } } } },
              {
                usuario: {
                  perfis: { some: { orgaoId: { in: params.orgaoIds } } },
                },
              },
            ],
          }
        : {};
  const auditoriaWhere = {
    ...auditoriaEscopo,
    criadoEm: { gte: params.periodo.inicio, lt: params.periodo.fim },
  };
  const servidorWhere = params.servidorIds
    ? { servidorId: { in: params.servidorIds } }
    : {};
  const [eventos, alteracoesManuais, ajustesBanco, usuariosSensiveis] =
    await Promise.all([
      prisma.auditoriaEvento.findMany({
        where: auditoriaWhere,
        include: {
          usuario: {
            include: {
              perfis: {
                where: { ativo: true },
                include: { perfil: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { criadoEm: "desc" },
        take: 200,
      }),
      prisma.marcacao.count({
        where: {
          ...servidorWhere,
          fonte: "MANUAL_ADMINISTRATIVO",
          dataReferencia: { gte: params.periodo.inicio, lt: params.periodo.fim },
        },
      }),
      prisma.movimentoBancoHoras.count({
        where: {
          ...servidorWhere,
          tipo: "AJUSTE_MANUAL",
          anoReferencia: params.periodo.ano,
          mesReferencia: params.periodo.mes,
        },
      }),
      prisma.usuarioPerfil.count({
        where: {
          ativo: true,
          ...(params.orgaoIds && params.orgaoIds.length > 0
            ? { OR: [{ orgaoId: { in: params.orgaoIds } }, { orgaoId: null }] }
            : {}),
          ...(params.servidorIds && params.servidorIds.length > 0
            ? { usuario: { servidor: { id: { in: params.servidorIds } } } }
            : {}),
          perfil: {
            OR: [
              { codigo: { in: ["MASTER", "ADMIN", "SECAP", "DIREF", "AUDITOR"] } },
              {
                permissoes: {
                  some: {
                    permissao: {
                      OR: [
                        { recurso: { in: ["auditoria", "perfis", "usuarios"] } },
                        { acao: { in: ["excluir", "administrar", "homologar"] } },
                        { escopo: "global" },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      }),
    ]);

  const eventosClassificados = eventos.map((evento) => {
    const criticidade = criticidadeEventoAuditoria({
      entidade: evento.entidade,
      acao: evento.acao,
      dadosAntes: evento.dadosAntes,
      dadosDepois: evento.dadosDepois,
    });
    const justificativa =
      extrairTextoJson(evento.metadados, [
        "justificativa",
        "motivo",
        "observacao",
      ]) ||
      extrairTextoJson(evento.dadosDepois, [
        "justificativa",
        "motivo",
        "observacao",
      ]) ||
      "-";

    return {
      evento,
      criticidade,
      justificativa,
    };
  });
  const espelhosReabertos = eventos.filter((evento) =>
    normalizarTextoPainel(`${evento.entidade} ${evento.acao}`).includes("REABERT"),
  ).length;
  const operacoesAposHomologacao = eventos.filter((evento) => {
    const texto = normalizarTextoPainel(`${evento.entidade} ${evento.acao}`);

    return (
      texto.includes("APOS HOMOLOG") ||
      texto.includes("POS HOMOLOG") ||
      texto.includes("APOS FECHAMENTO") ||
      texto.includes("POS FECHAMENTO")
    );
  }).length;
  const logsIncompletos = eventos.filter(
    (evento) => !evento.usuarioId || !evento.hashAtual,
  ).length;
  const riscoPorDimensao = [
    {
      label: "Ajustes manuais",
      valor: alteracoesManuais + ajustesBanco,
    },
    {
      label: "Registro web fora do padrão",
      valor: params.teletrabalhoRegistroWeb.registroWebSemVinculo,
    },
    {
      label: "Justificativas vencidas",
      valor: params.justificativasAssiduidade.justificativasVencidas,
    },
    {
      label: "Homologação fora do prazo",
      valor:
        params.homologacaoMensal.pendentesServidor +
        params.homologacaoMensal.pendentesChefia +
        params.homologacaoMensal.pendentesRh,
    },
    {
      label: "Alterações apos fechamento",
      valor: operacoesAposHomologacao,
    },
    {
      label: "Permissoes sensíveis",
      valor: usuariosSensiveis,
    },
    {
      label: "Equipamentos sem sincronização",
      valor:
        params.equipamentosPonto.offline +
        params.equipamentosPonto.semSincronizacaoRecente,
    },
    {
      label: "Logs incompletos",
      valor: logsIncompletos,
    },
    {
      label: "Inconsistências de jornada",
      valor:
        params.frequenciaAssiduidade.ausenciasInjustificadas +
        params.frequenciaAssiduidade.jornadasIncompletas,
    },
    {
      label: "Reabertura de espelho",
      valor: espelhosReabertos,
    },
  ].sort((a, b) => b.valor - a.valor);
  const achadosAbertos = riscoPorDimensao.reduce(
    (total, item) => total + item.valor,
    0,
  );
  const eventosCriticos = eventosClassificados.filter(
    (item) => item.criticidade === "Critica",
  ).length;
  const achadosCriticos =
    eventosCriticos +
    espelhosReabertos +
    operacoesAposHomologacao +
    Math.min(usuariosSensiveis, 10);
  const pesoEventos = eventosClassificados.reduce(
    (total, item) => total + pesoCriticidade(item.criticidade),
    0,
  );
  const penalidade = Math.min(
    100,
    Math.round(
      ((achadosAbertos + pesoEventos) /
        Math.max(25, params.servidoresAtivos || 1)) *
        10,
    ),
  );
  const criticosPorDia = new Map<string, { criticos: number; altos: number }>();

  for (const item of eventosClassificados) {
    if (!["Critica", "Alta"].includes(item.criticidade)) continue;

    const dia = String(item.evento.criadoEm.getDate()).padStart(2, "0");
    const atual = criticosPorDia.get(dia) ?? { criticos: 0, altos: 0 };

    if (item.criticidade === "Critica") {
      atual.criticos += 1;
    } else {
      atual.altos += 1;
    }

    criticosPorDia.set(dia, atual);
  }

  return {
    indiceConformidade: Math.max(0, 100 - penalidade),
    achadosAbertos,
    achadosCriticos,
    alteracoesManuaisMes: alteracoesManuais + ajustesBanco,
    registrosWebForaPadrao:
      params.teletrabalhoRegistroWeb.registroWebSemVinculo,
    espelhosReabertos,
    operacoesAposHomologacao,
    usuariosPermissaoSensivel: usuariosSensiveis,
    riscoPorDimensao: riscoPorDimensao.slice(0, 10),
    timelineEventosCriticos: Array.from({ length: params.periodo.diasNoMes }, (_, index) => {
      const label = String(index + 1).padStart(2, "0");
      const valores = criticosPorDia.get(label) ?? { criticos: 0, altos: 0 };

      return { label, ...valores };
    }),
    detalhes: eventosClassificados
      .filter((item) => ["Critica", "Alta", "Media"].includes(item.criticidade))
      .slice(0, 12)
      .map((item) => ({
        id: item.evento.id,
        dataHora: formatarDataHoraPainel(item.evento.criadoEm),
        usuario: item.evento.usuario?.nome ?? "Sistema",
        perfil: perfilAuditoria(item.evento.usuario),
        evento: item.evento.acao,
        entidade: item.evento.entidade,
        criticidade: item.criticidade,
        justificativa: item.justificativa,
        situacao: item.justificativa === "-" ? "Aberto" : "Justificado",
        href: `/auditoria/${item.evento.id}`,
      })),
  };
}

async function calcularIndicadoresUnidadeChefia(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
  unidadeIds?: string[];
}): Promise<IndicadoresUnidadeChefiaResumo> {
  const servidorWhere = params.servidorIds
    ? { servidorId: { in: params.servidorIds } }
    : {};
  const servidores = await listarServidoresAtivosComLotacao({
    periodo: params.periodo,
    servidorIds: params.servidorIds,
  });
  const unidadeIds = Array.from(
    new Set(
      servidores
        .map((servidor) => servidor.lotacoes[0]?.unidadeId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const [
    gestores,
    apuracoes,
    homologacoes,
    ocorrenciasAbertas,
    solicitacoesAbertas,
    marcacoesFonte,
    ajustesBanco,
  ] = await Promise.all([
    prisma.gestorUnidade.findMany({
      where: {
        ativo: true,
        unidadeId: { in: params.unidadeIds ?? unidadeIds },
        dataInicio: { lt: params.periodo.fim },
        OR: [{ dataFim: null }, { dataFim: { gte: params.periodo.inicio } }],
      },
      include: {
        servidor: { include: { usuario: true } },
      },
      orderBy: [{ papel: "asc" }, { dataInicio: "desc" }],
    }),
    prisma.apuracaoDiaria.findMany({
      where: {
        ...servidorWhere,
        dataReferencia: { gte: params.periodo.inicio, lt: params.periodo.fim },
        cargaPrevistaMinutos: { gt: 0 },
      },
      select: { servidorId: true, resultado: true },
    }),
    prisma.homologacaoServidorMes.findMany({
      where: {
        ...servidorWhere,
        fechamento: {
          anoReferencia: params.periodo.ano,
          mesReferencia: params.periodo.mes,
        },
      },
      select: { servidorId: true, status: true },
    }),
    prisma.ocorrenciaFrequencia.groupBy({
      by: ["servidorId"],
      where: {
        ...servidorWhere,
        resolvida: false,
        apuracaoDiaria: {
          dataReferencia: { gte: params.periodo.inicio, lt: params.periodo.fim },
        },
      },
      _count: true,
    }),
    prisma.solicitacao.groupBy({
      by: ["servidorId"],
      where: {
        ...servidorWhere,
        status: { in: ["ENVIADA", "EM_ANALISE"] },
        OR: [
          { criadoEm: { gte: params.periodo.inicio, lt: params.periodo.fim } },
          {
            dataReferencia: {
              gte: params.periodo.inicio,
              lt: params.periodo.fim,
            },
          },
        ],
      },
      _count: true,
    }),
    prisma.marcacao.groupBy({
      by: ["servidorId", "fonte"],
      where: {
        ...servidorWhere,
        dataReferencia: { gte: params.periodo.inicio, lt: params.periodo.fim },
        status: "VALIDA",
      },
      _count: true,
    }),
    prisma.movimentoBancoHoras.groupBy({
      by: ["servidorId"],
      where: {
        ...servidorWhere,
        tipo: "AJUSTE_MANUAL",
        anoReferencia: params.periodo.ano,
        mesReferencia: params.periodo.mes,
      },
      _count: true,
    }),
  ]);

  type Acumulado = {
    unidadeId: string;
    unidade: string;
    chefia: string;
    servidores: Set<string>;
    apuracoes: number;
    pontuais: number;
    problemasAssiduidade: number;
    problemasFrequencia: number;
    homologados: number;
    pendencias: number;
    ajustesManuais: number;
    registrosWeb: number;
  };

  const gestorPorUnidade = new Map<string, string>();
  for (const gestor of gestores) {
    if (!gestorPorUnidade.has(gestor.unidadeId)) {
      gestorPorUnidade.set(
        gestor.unidadeId,
        nomeServidor(gestor.servidor) || gestor.servidor.matricula,
      );
    }
  }

  const unidadePorServidor = new Map<string, string>();
  const acumulados = new Map<string, Acumulado>();
  for (const servidor of servidores) {
    const lotacao = servidor.lotacoes[0];
    const unidadeId = lotacao?.unidadeId ?? "sem-unidade";
    const unidade = lotacao?.unidade.sigla ?? "Sem unidade";
    const atual =
      acumulados.get(unidadeId) ??
      ({
        unidadeId,
        unidade,
        chefia: gestorPorUnidade.get(unidadeId) ?? "Sem chefia ativa",
        servidores: new Set<string>(),
        apuracoes: 0,
        pontuais: 0,
        problemasAssiduidade: 0,
        problemasFrequencia: 0,
        homologados: 0,
        pendencias: 0,
        ajustesManuais: 0,
        registrosWeb: 0,
      } satisfies Acumulado);

    atual.servidores.add(servidor.id);
    acumulados.set(unidadeId, atual);
    unidadePorServidor.set(servidor.id, unidadeId);
  }

  for (const apuracao of apuracoes) {
    const unidadeId = unidadePorServidor.get(apuracao.servidorId);
    const atual = unidadeId ? acumulados.get(unidadeId) : undefined;
    const resultado = String(apuracao.resultado);

    if (!atual) continue;

    atual.apuracoes += 1;
    if (resultadoEhFrequenciaValida(resultado)) atual.pontuais += 1;
    if (resultadoEhProblemaAssiduidade(resultado)) {
      atual.problemasAssiduidade += 1;
    }
    if (resultadoEhProblemaFrequencia(resultado)) {
      atual.problemasFrequencia += 1;
    }
  }

  for (const homologacao of homologacoes) {
    const unidadeId = unidadePorServidor.get(homologacao.servidorId);
    const atual = unidadeId ? acumulados.get(unidadeId) : undefined;

    if (!atual) continue;

    if (String(homologacao.status).startsWith("HOMOLOGADO")) {
      atual.homologados += 1;
    } else {
      atual.pendencias += 1;
    }
  }

  for (const item of ocorrenciasAbertas) {
    const unidadeId = unidadePorServidor.get(item.servidorId);
    const atual = unidadeId ? acumulados.get(unidadeId) : undefined;

    if (atual) atual.pendencias += item._count;
  }

  for (const item of solicitacoesAbertas) {
    const unidadeId = unidadePorServidor.get(item.servidorId);
    const atual = unidadeId ? acumulados.get(unidadeId) : undefined;

    if (atual) atual.pendencias += item._count;
  }

  for (const item of marcacoesFonte) {
    const unidadeId = unidadePorServidor.get(item.servidorId);
    const atual = unidadeId ? acumulados.get(unidadeId) : undefined;

    if (!atual) continue;

    if (item.fonte === "WEB") atual.registrosWeb += item._count;
    if (item.fonte === "MANUAL_ADMINISTRATIVO") {
      atual.ajustesManuais += item._count;
    }
  }

  for (const item of ajustesBanco) {
    const unidadeId = unidadePorServidor.get(item.servidorId);
    const atual = unidadeId ? acumulados.get(unidadeId) : undefined;

    if (atual) atual.ajustesManuais += item._count;
  }

  const matriz = Array.from(acumulados.values())
    .map((item) => {
      const servidoresAtivos = item.servidores.size;
      const homologacao = percentual(item.homologados, servidoresAtivos);
      const assiduidade =
        item.apuracoes > 0
          ? Math.max(0, 100 - percentual(item.problemasAssiduidade, item.apuracoes))
          : 0;
      const pontualidade = percentual(item.pontuais, item.apuracoes);
      const regularizacaoPendencias = Math.max(
        0,
        100 - percentual(item.pendencias, Math.max(1, servidoresAtivos * 3)),
      );
      const conformidadeRegistros = Math.max(
        0,
        100 -
          percentual(
            item.ajustesManuais + item.registrosWeb + item.problemasFrequencia,
            Math.max(1, item.apuracoes + item.registrosWeb + item.ajustesManuais),
          ),
      );
      const indiceGestao =
        Math.round(
          (homologacao * 0.3 +
            assiduidade * 0.25 +
            pontualidade * 0.2 +
            regularizacaoPendencias * 0.15 +
            conformidadeRegistros * 0.1) *
            10,
        ) / 10;

      return {
        unidadeId: item.unidadeId,
        unidade: item.unidade,
        chefia: item.chefia,
        servidoresAtivos,
        homologacao,
        assiduidade,
        pontualidade,
        regularizacaoPendencias,
        conformidadeRegistros,
        pendenciasAbertas: item.pendencias,
        pendenciasVencidas: item.pendencias,
        ajustesManuais: item.ajustesManuais,
        registrosWeb: item.registrosWeb,
        indiceGestao,
        situacao: situacaoIndiceGestao(indiceGestao),
        href: `/painel-executivo/indicadores-por-unidade-e-chefia?competencia=${params.periodo.valorInput}&unidadeId=${item.unidadeId}`,
      };
    })
    .sort((a, b) => b.indiceGestao - a.indiceGestao);
  const media = (valores: number[]) =>
    valores.length
      ? Math.round(
          (valores.reduce((total, valor) => total + valor, 0) / valores.length) *
            10,
        ) / 10
      : 0;
  const piorUnidade = [...matriz].sort(
    (a, b) => a.indiceGestao - b.indiceGestao,
  )[0];

  return {
    melhorUnidade: matriz[0]?.unidade ?? "-",
    unidadeAtencao: piorUnidade?.unidade ?? "-",
    chefiasPendenciaCritica: matriz.filter(
      (item) => item.situacao === "Critico" || item.pendenciasAbertas >= 10,
    ).length,
    mediaGeralConformidade: media(matriz.map((item) => item.indiceGestao)),
    homologacaoMedia: media(matriz.map((item) => item.homologacao)),
    assiduidadeMedia: media(matriz.map((item) => item.assiduidade)),
    pendenciasAbertas: matriz.reduce(
      (total, item) => total + item.pendenciasAbertas,
      0,
    ),
    ajustesManuaisMes: matriz.reduce(
      (total, item) => total + item.ajustesManuais,
      0,
    ),
    ranking: matriz.slice(0, 10).map((item) => ({
      label: `${item.unidade} - ${item.chefia}`,
      valor: item.indiceGestao,
    })),
    matriz: matriz.slice(0, 12),
    detalhes: [...matriz]
      .sort(
        (a, b) =>
          a.indiceGestao - b.indiceGestao ||
          b.pendenciasAbertas - a.pendenciasAbertas,
      )
      .slice(0, 12),
  };
}

function calcularAlertasInteligentes(params: {
  homologacaoMensal: HomologacaoMensalResumo;
  pendenciasPonto: PendenciasPontoResumo;
  justificativasAssiduidade: JustificativasAssiduidadeResumo;
  frequenciaAssiduidade: FrequenciaAssiduidadeResumo;
  jornadaCargaHoraria: JornadaCargaHorariaResumo;
  teletrabalhoRegistroWeb: TeletrabalhoRegistroWebResumo;
  equipamentosPonto: EquipamentosPontoResumo;
  auditoriaConformidade: AuditoriaConformidadeResumo;
}): AlertasInteligentesResumo {
  const alertasBase: Array<Omit<AlertaInteligenteItem, "pontuacaoRisco" | "recorrente">> = [];

  for (const item of params.homologacaoMensal.detalhes) {
    alertasBase.push({
      id: `homologacao-${item.id}`,
      tipo: "Espelho não homologado",
      categoria: "Homologação",
      criticidade: item.diasAtraso > 0 ? "Critica" : "Alta",
      unidade: item.unidade,
      servidor: item.servidor,
      responsavelAtual:
        item.responsavelAtual === "Gestor" ? "Chefia" : item.responsavelAtual,
      prazo: prazoAlerta(item.diasAtraso),
      impacto: "bloqueia homologação",
      acaoSugerida: "Abrir homologação",
      explicacao: item.pendencia,
      diasEmAberto: item.diasAtraso,
      status: "Aberto",
      href: item.href,
      bloqueiaHomologacao: true,
    });
  }

  for (const item of params.pendenciasPonto.detalhes) {
    alertasBase.push({
      id: `pendencia-${item.id}`,
      tipo: item.tipo,
      categoria: "Pendência de ponto",
      criticidade:
        item.criticidade === "Critica"
          ? "Critica"
          : item.criticidade === "Alta"
            ? "Alta"
            : item.criticidade === "Media"
              ? "Media"
              : "Baixa",
      unidade: item.unidade,
      servidor: item.servidor,
      responsavelAtual:
        item.responsavelAtual === "Gestor" ? "Chefia" : item.responsavelAtual,
      prazo: prazoAlerta(item.diasEmAberto),
      impacto: "pode impedir fechamento",
      acaoSugerida: "Regularizar pendência",
      explicacao: `${item.status} ha ${item.diasEmAberto} dia(s)`,
      diasEmAberto: item.diasEmAberto,
      status: "Aberto",
      href: item.href,
      bloqueiaHomologacao: item.diasEmAberto >= 5,
    });
  }

  for (const item of params.justificativasAssiduidade.detalhes) {
    alertasBase.push({
      id: `justificativa-${item.id}`,
      tipo: item.status.toLowerCase().includes("venc")
        ? "Justificativa vencida"
        : "Justificativa pendente",
      categoria: "Assiduidade",
      criticidade: item.impactoAssiduidade === "Impacta" ? "Alta" : "Media",
      unidade: item.unidade,
      servidor: item.servidor,
      responsavelAtual: "Chefia",
      prazo: prazoAlerta(item.diasEmAnalise),
      impacto: "afeta assiduidade",
      acaoSugerida: "Analisar justificativa",
      explicacao: `${item.ocorrencia} aguardando analise`,
      diasEmAberto: item.diasEmAnalise,
      status: "Aberto",
      href: item.href,
      bloqueiaHomologacao: item.diasEmAnalise >= 5,
    });
  }

  for (const item of params.frequenciaAssiduidade.detalhes) {
    if (item.situacao === "Regular") continue;

    alertasBase.push({
      id: `assiduidade-${item.servidorId}`,
      tipo: item.ausencias > 0 ? "Ausência sem justificativa" : "Baixa assiduidade",
      categoria: "Assiduidade",
      criticidade: item.situacao === "Critica" ? "Critica" : "Alta",
      unidade: item.unidade,
      servidor: item.servidor,
      responsavelAtual: "Servidor/Chefia",
      prazo: item.ausencias > 0 ? "Vencido" : "3 dias",
      impacto: "reduz assiduidade",
      acaoSugerida: "Regularizar ponto",
      explicacao: `Assiduidade em ${item.assiduidade}%`,
      diasEmAberto: item.ausencias + item.pendencias,
      status: "Aberto",
      href: item.href,
      bloqueiaHomologacao: item.situacao === "Critica",
    });
  }

  for (const item of params.jornadaCargaHoraria.detalhes) {
    if (item.situacao === "Regular") continue;

    alertasBase.push({
      id: `jornada-${item.servidorId}`,
      tipo:
        item.situacao === "Excesso"
          ? "Excesso de jornada"
          : "Jornada incompleta recorrente",
      categoria: "Jornada",
      criticidade: item.situacao === "Critico" ? "Alta" : "Media",
      unidade: item.unidade,
      servidor: item.servidor,
      responsavelAtual: "Servidor/Chefia",
      prazo: "3 dias",
      impacto: "afeta carga horaria",
      acaoSugerida: "Revisar espelho de ponto",
      explicacao: `Saldo ${item.saldoHoras}h e aderencia ${item.aderencia}%`,
      diasEmAberto: Math.ceil(Math.abs(item.saldoHoras)),
      status: "Aberto",
      href: item.href,
      bloqueiaHomologacao: item.situacao === "Critico",
    });
  }

  for (const item of params.teletrabalhoRegistroWeb.detalhes) {
    if (item.situacao === "Regular") continue;

    alertasBase.push({
      id: `registro-web-${item.servidorId}`,
      tipo:
        item.autorizacao === "Sem autorizacao"
          ? "Registro web sem permissao"
          : "Web fora do padrao",
      categoria: "Registro web",
      criticidade: item.situacao === "Critica" ? "Alta" : "Media",
      unidade: item.unidade,
      servidor: item.servidor,
      responsavelAtual: "RH",
      prazo: "Hoje",
      impacto: "afeta conformidade",
      acaoSugerida: "Validar autorização",
      explicacao: `${item.percentualWeb}% das marcacoes por web`,
      diasEmAberto: Math.ceil(item.percentualWeb / 20),
      status: "Aberto",
      href: item.href,
      bloqueiaHomologacao: item.situacao === "Critica",
    });
  }

  for (const item of params.equipamentosPonto.detalhes) {
    if (item.status === "Online") continue;

    alertasBase.push({
      id: `equipamento-${item.equipamentoId}`,
      tipo:
        item.status === "Offline"
          ? "Equipamento offline"
          : item.status === "Sem sincronizacao"
            ? "AFD sem sincronizacao"
            : "Atraso de comunicacao",
      categoria: "Técnico",
      criticidade: item.status === "Offline" ? "Alta" : "Media",
      unidade: item.unidade,
      servidor: "-",
      responsavelAtual: "NUTEC",
      prazo: item.status === "Offline" ? "Hoje" : "3 dias",
      impacto: "risco de perda ou atraso de marcações",
      acaoSugerida: "Verificar comunicação",
      explicacao: `${item.equipamento} sem comunicacao/sincronizacao regular`,
      diasEmAberto: Math.ceil(item.tempoSemComunicarMinutos / 1440),
      status: "Aberto",
      href: item.href,
      bloqueiaHomologacao: item.marcacoesPendentes > 0,
    });
  }

  for (const item of params.auditoriaConformidade.detalhes) {
    if (!["Critica", "Alta"].includes(item.criticidade)) continue;

    alertasBase.push({
      id: `auditoria-${item.id}`,
      tipo: item.evento,
      categoria: "Conformidade",
      criticidade: item.criticidade === "Critica" ? "Critica" : "Alta",
      unidade: "-",
      servidor: item.usuario,
      responsavelAtual: "Auditoria",
      prazo: item.criticidade === "Critica" ? "Hoje" : "3 dias",
      impacto: "afeta trilha de auditoria",
      acaoSugerida: "Verificar origem",
      explicacao: `${item.entidade}: ${item.justificativa}`,
      diasEmAberto: 1,
      status: "Aberto",
      href: item.href,
      bloqueiaHomologacao: item.criticidade === "Critica",
    });
  }

  const contagemCategorias = new Map<string, number>();
  for (const alerta of alertasBase) {
    contagemCategorias.set(
      alerta.categoria,
      (contagemCategorias.get(alerta.categoria) ?? 0) + 1,
    );
  }

  const fila = alertasBase
    .map((alerta) => {
      const recorrente = (contagemCategorias.get(alerta.categoria) ?? 0) >= 3;

      return {
        ...alerta,
        recorrente,
        pontuacaoRisco: pontuarAlerta({
          criticidade: alerta.criticidade,
          bloqueiaHomologacao: alerta.bloqueiaHomologacao,
          diasEmAberto: alerta.diasEmAberto,
          recorrente,
          afetados: contagemCategorias.get(alerta.categoria) ?? 1,
        }),
      };
    })
    .sort((a, b) => b.pontuacaoRisco - a.pontuacaoRisco);
  const rankingCategorias = Array.from(contagemCategorias.entries())
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
  const timelineVencimentos: SerieValor[] = [
    { label: "Hoje", valor: fila.filter((item) => item.prazo === "Hoje").length },
    { label: "Amanha", valor: 0 },
    { label: "3 dias", valor: fila.filter((item) => item.prazo === "3 dias").length },
    { label: "Vencidos", valor: fila.filter((item) => item.prazo === "Vencido").length },
  ].filter((item) => item.valor > 0);

  return {
    alertasAtivos: fila.length,
    alertasCriticos: fila.filter((item) => item.criticidade === "Critica").length,
    vencidos: fila.filter((item) => item.prazo === "Vencido").length,
    exigemChefia: fila.filter((item) =>
      ["Chefia", "Servidor/Chefia"].includes(item.responsavelAtual),
    ).length,
    exigemRh: fila.filter((item) => item.responsavelAtual === "RH").length,
    exigemNutec: fila.filter((item) => item.responsavelAtual === "NUTEC").length,
    bloqueiamHomologacao: fila.filter((item) => item.bloqueiaHomologacao).length,
    recorrentesMes: fila.filter((item) => item.recorrente).length,
    rankingCategorias,
    timelineVencimentos,
    fila: fila.slice(0, 16),
  };
}

async function calcularBancoHoras(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
}): Promise<BancoHorasResumo> {
  const servidorWhere = params.servidorIds
    ? { servidorId: { in: params.servidorIds } }
    : {};
  const vencimentoLimite = new Date();
  vencimentoLimite.setDate(vencimentoLimite.getDate() + 30);
  const [saldos, movimentosVencendo, movimentosRecentes] = await Promise.all([
    prisma.bancoHorasSaldo.findMany({
      where: params.servidorIds
        ? { servidorId: { in: params.servidorIds } }
        : undefined,
      include: {
        servidor: {
          include: {
            usuario: true,
            lotacoes: {
              where: {
                status: "ATIVO",
                dataInicio: { lt: params.periodo.fim },
                OR: [{ dataFim: null }, { dataFim: { gte: params.periodo.inicio } }],
              },
              include: { unidade: true },
              orderBy: { dataInicio: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.movimentoBancoHoras.findMany({
      where: {
        ...servidorWhere,
        status: { in: ["PENDENTE", "VALIDADO"] },
        expiraEm: { gte: new Date(), lte: vencimentoLimite },
      },
      select: { servidorId: true, minutos: true, tipo: true, expiraEm: true },
    }),
    prisma.movimentoBancoHoras.findMany({
      where: {
        ...servidorWhere,
        anoReferencia: params.periodo.ano,
        mesReferencia: params.periodo.mes,
      },
      include: {
        servidor: {
          include: {
            usuario: true,
            lotacoes: {
              where: {
                status: "ATIVO",
                dataInicio: { lt: params.periodo.fim },
                OR: [{ dataFim: null }, { dataFim: { gte: params.periodo.inicio } }],
              },
              include: { unidade: true },
              orderBy: { dataInicio: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { dataReferencia: "desc" },
      take: 20,
    }),
  ]);

  const vencimentoPorServidor = new Map<string, Date>();
  let horasProximasVencimento = 0;
  for (const movimento of movimentosVencendo) {
    horasProximasVencimento += Math.abs(minutosParaHoras(movimento.minutos));
    if (
      movimento.expiraEm &&
      (!vencimentoPorServidor.has(movimento.servidorId) ||
        movimento.expiraEm < (vencimentoPorServidor.get(movimento.servidorId) as Date))
    ) {
      vencimentoPorServidor.set(movimento.servidorId, movimento.expiraEm);
    }
  }

  const unidades = new Map<string, BancoHorasUnidade>();
  const rankingServidores = saldos
    .map((saldo) => {
      const lotacao = saldo.servidor.lotacoes[0];
      const unidadeId = lotacao?.unidadeId ?? "sem-unidade";
      const unidade = lotacao?.unidade.sigla ?? "Sem unidade";
      const saldoHoras = minutosParaHoras(saldo.saldoMinutos);
      const atual =
        unidades.get(unidadeId) ??
        ({
          unidadeId,
          unidade,
          saldoHoras: 0,
          creditoHoras: 0,
          debitoHoras: 0,
          servidoresCriticos: 0,
        } satisfies BancoHorasUnidade);

      atual.saldoHoras = Math.round((atual.saldoHoras + saldoHoras) * 10) / 10;
      if (saldoHoras > 0) atual.creditoHoras += saldoHoras;
      if (saldoHoras < 0) atual.debitoHoras += saldoHoras;
      if (["Deficit critico", "Excesso critico"].includes(classificarBancoHoras(saldoHoras))) {
        atual.servidoresCriticos += 1;
      }
      unidades.set(unidadeId, atual);

      return {
        servidorId: saldo.servidorId,
        servidor: nomeServidor(saldo.servidor) || saldo.servidor.matricula,
        unidade,
        saldoHoras,
        vencimento: formatarDataHoraPainel(vencimentoPorServidor.get(saldo.servidorId)),
        situacao: classificarBancoHoras(saldoHoras),
        href: `/banco-horas?servidorId=${saldo.servidorId}`,
      };
    })
    .sort((a, b) => Math.abs(b.saldoHoras) - Math.abs(a.saldoHoras));
  const porUnidade = Array.from(unidades.values())
    .map((unidade) => ({
      ...unidade,
      creditoHoras: Math.round(unidade.creditoHoras * 10) / 10,
      debitoHoras: Math.round(unidade.debitoHoras * 10) / 10,
      saldoHoras: Math.round(unidade.saldoHoras * 10) / 10,
    }))
    .sort((a, b) => Math.abs(b.saldoHoras) - Math.abs(a.saldoHoras))
    .slice(0, 10);
  const faixasBase = new Map<string, BancoHorasFaixa>();
  for (const servidor of rankingServidores) {
    const faixa = faixaBancoHoras(servidor.saldoHoras);
    const atual =
      faixasBase.get(faixa) ??
      ({
        faixa,
        servidores: 0,
        horasAcumuladas: 0,
        situacao:
          faixa === "Saldo regular"
            ? "Regular"
            : faixa.includes("critico")
              ? "Critico"
              : "Regularizar",
      } satisfies BancoHorasFaixa);

    atual.servidores += 1;
    atual.horasAcumuladas =
      Math.round((atual.horasAcumuladas + servidor.saldoHoras) * 10) / 10;
    faixasBase.set(faixa, atual);
  }
  const extrato = movimentosRecentes.map((movimento) => {
    const lotacao = movimento.servidor.lotacoes[0];
    const credito = ["CREDITO", "COMPENSACAO_DEBITO", "HORAS_ACIMA_LIMITE"].includes(
      String(movimento.tipo),
    )
      ? minutosParaHoras(movimento.minutos)
      : 0;
    const debito = ["DEBITO", "COMPENSACAO_CREDITO", "HORAS_NAO_AUTORIZADAS"].includes(
      String(movimento.tipo),
    )
      ? -Math.abs(minutosParaHoras(movimento.minutos))
      : 0;

    return {
      id: movimento.id,
      data: formatarDataHoraPainel(movimento.dataReferencia),
      servidor: nomeServidor(movimento.servidor) || movimento.servidor.matricula,
      unidade: lotacao?.unidade.sigla ?? "Sem unidade",
      creditoHoras: credito,
      debitoHoras: debito,
      saldoAcumuladoHoras: minutosParaHoras(movimento.saldoAposMovimento ?? 0),
      origem: TIPOS_BANCO_HORAS[String(movimento.tipo)] ?? String(movimento.tipo),
      href: `/banco-horas?servidorId=${movimento.servidorId}`,
    };
  });
  const saldoGeralHoras = minutosParaHoras(
    saldos.reduce((total, saldo) => total + saldo.saldoMinutos, 0),
  );
  const horasPositivasAcumuladas = rankingServidores
    .filter((item) => item.saldoHoras > 0)
    .reduce((total, item) => total + item.saldoHoras, 0);
  const horasNegativasAcumuladas = rankingServidores
    .filter((item) => item.saldoHoras < 0)
    .reduce((total, item) => total + item.saldoHoras, 0);

  return {
    saldoGeralHoras,
    horasPositivasAcumuladas: Math.round(horasPositivasAcumuladas * 10) / 10,
    horasNegativasAcumuladas: Math.round(horasNegativasAcumuladas * 10) / 10,
    servidoresComCredito: rankingServidores.filter((item) => item.saldoHoras > 0)
      .length,
    servidoresComDeficit: rankingServidores.filter((item) => item.saldoHoras < 0)
      .length,
    servidoresCriticos: rankingServidores.filter((item) =>
      ["Deficit critico", "Excesso critico"].includes(item.situacao),
    ).length,
    horasProximasVencimento: Math.round(horasProximasVencimento * 10) / 10,
    unidadeMaisCritica: porUnidade[0]?.unidade ?? "-",
    porUnidade,
    faixasRisco: Array.from(faixasBase.values()),
    rankingServidoresCriticos: rankingServidores.slice(0, 12),
    extrato,
  };
}

function limitarCriticidade(valor: number) {
  return Math.max(0, Math.min(120, Math.round(valor)));
}

function calcularGraficosImportantes(params: {
  homologacaoMensal: HomologacaoMensalResumo;
  pendenciasPonto: PendenciasPontoResumo;
  bancoHoras: BancoHorasResumo;
  frequenciaAssiduidade: FrequenciaAssiduidadeResumo;
  jornadaCargaHoraria: JornadaCargaHorariaResumo;
  alertasInteligentes: AlertasInteligentesResumo;
  teletrabalhoRegistroWeb: TeletrabalhoRegistroWebResumo;
  equipamentosPonto: EquipamentosPontoResumo;
  indicadoresUnidadeChefia: IndicadoresUnidadeChefiaResumo;
  auditoriaConformidade: AuditoriaConformidadeResumo;
}): GraficosImportantesResumo {
  const pendentesHomologacao =
    params.homologacaoMensal.pendentesServidor +
    params.homologacaoMensal.pendentesChefia +
    params.homologacaoMensal.pendentesRh;
  const itens: GraficoImportanteItem[] = [
    {
      ordem: 1,
      grafico: "Homologacao mensal",
      slug: "controle-de-homologacao-mensal",
      nivel: "Gestao mensal",
      tipo: "Barra horizontal",
      prioridade: "Maxima",
      criticidade: limitarCriticidade(pendentesHomologacao * 2 + params.homologacaoMensal.detalhes.length * 4),
      motivo: "fecha o ciclo oficial do ponto",
      obrigatorio: true,
    },
    {
      ordem: 2,
      grafico: "Pendencias de ponto",
      slug: "pendencias-de-ponto",
      nivel: "Gestao mensal",
      tipo: "Barra horizontal empilhada",
      prioridade: "Maxima",
      criticidade: limitarCriticidade(params.pendenciasPonto.totalAbertas + params.pendenciasPonto.vencidas * 3),
      motivo: "mostra o que impede o fechamento",
      obrigatorio: true,
    },
    {
      ordem: 3,
      grafico: "Banco de horas",
      slug: "banco-de-horas",
      nivel: "Gestao mensal",
      tipo: "Barra horizontal divergente",
      prioridade: "Maxima",
      criticidade: limitarCriticidade(params.bancoHoras.servidoresCriticos * 8 + params.bancoHoras.horasProximasVencimento),
      motivo: "impacta compensacao e conformidade",
      obrigatorio: true,
    },
    {
      ordem: 4,
      grafico: "Frequencia e assiduidade",
      slug: "frequencia-e-assiduidade",
      nivel: "Gestao mensal",
      tipo: "Linha mensal",
      prioridade: "Alta",
      criticidade: limitarCriticidade(params.frequenciaAssiduidade.servidoresCriticos * 8 + params.frequenciaAssiduidade.ausenciasInjustificadas),
      motivo: "mede regularidade funcional",
      obrigatorio: true,
    },
    {
      ordem: 5,
      grafico: "Jornada e carga horaria",
      slug: "jornada-e-carga-horaria",
      nivel: "Controle operacional",
      tipo: "Barras comparativas",
      prioridade: "Alta",
      criticidade: limitarCriticidade(params.jornadaCargaHoraria.servidoresDeficit * 8 + params.jornadaCargaHoraria.servidoresExcesso * 5 + params.jornadaCargaHoraria.jornadasIncompletas),
      motivo: "controla cumprimento da jornada",
      obrigatorio: true,
    },
    {
      ordem: 6,
      grafico: "Alertas inteligentes",
      slug: "alertas-inteligentes",
      nivel: "Controle operacional",
      tipo: "Ranking horizontal",
      prioridade: "Alta",
      criticidade: limitarCriticidade(params.alertasInteligentes.alertasCriticos * 10 + params.alertasInteligentes.vencidos * 4 + params.alertasInteligentes.bloqueiamHomologacao * 3),
      motivo: "transforma dados em acao",
      obrigatorio: true,
    },
    {
      ordem: 7,
      grafico: "Registro web e teletrabalho",
      slug: "teletrabalho-presencial-registro-web",
      nivel: "Controle operacional",
      tipo: "Grafico combinado",
      prioridade: "Alta",
      criticidade: limitarCriticidade(params.teletrabalhoRegistroWeb.registroWebSemVinculo * 8 + params.teletrabalhoRegistroWeb.servidoresAlerta * 4),
      motivo: "controla riscos de modalidade",
      obrigatorio: false,
    },
    {
      ordem: 8,
      grafico: "Equipamentos de ponto",
      slug: "equipamentos-de-ponto",
      nivel: "Controle operacional",
      tipo: "Barra horizontal empilhada",
      prioridade: "Média-alta",
      criticidade: limitarCriticidade(params.equipamentosPonto.offline * 10 + params.equipamentosPonto.semSincronizacaoRecente * 6 + params.equipamentosPonto.marcacoesPendentesImportacao / 5),
      motivo: "evita pendencias por falha tecnica",
      obrigatorio: false,
    },
    {
      ordem: 9,
      grafico: "Indicadores por unidade e chefia",
      slug: "indicadores-por-unidade-e-chefia",
      nivel: "Gestao mensal",
      tipo: "Ranking + matriz",
      prioridade: "Alta",
      criticidade: limitarCriticidade(params.indicadoresUnidadeChefia.chefiasPendenciaCritica * 12 + Math.max(0, 90 - params.indicadoresUnidadeChefia.mediaGeralConformidade)),
      motivo: "apoia gestao executiva",
      obrigatorio: false,
    },
    {
      ordem: 10,
      grafico: "Auditoria e conformidade",
      slug: "auditoria-e-conformidade",
      nivel: "Auditoria e conformidade",
      tipo: "Barra por dimensao de risco",
      prioridade: "Alta",
      criticidade: limitarCriticidade(params.auditoriaConformidade.achadosCriticos * 10 + Math.max(0, 100 - params.auditoriaConformidade.indiceConformidade)),
      motivo: "fortalece rastreabilidade e controle",
      obrigatorio: false,
    },
  ];
  const ordenadosPorCriticidade = [...itens].sort(
    (a, b) => b.criticidade - a.criticidade || a.ordem - b.ordem,
  );

  return {
    rankingCriticidade: ordenadosPorCriticidade.map((item) => ({
      label: item.grafico,
      valor: item.criticidade,
    })),
    pacoteMinimo: itens.filter((item) => item.obrigatorio),
    graficosApoio: itens.filter((item) => !item.obrigatorio),
    ordemImplantacao: itens,
    totalCritico: itens.filter((item) => item.criticidade >= 85).length,
    prioridadeMaxima: itens.filter((item) => item.prioridade === "Maxima").length,
    obrigatorios: itens.filter((item) => item.obrigatorio).length,
    areaMaisCritica: ordenadosPorCriticidade[0]?.grafico ?? "-",
  };
}

function catalogoRelatoriosExportaveis(
  competencia: string,
): RelatorioExportavelItem[] {
  return [
    {
      id: "espelho-mensal",
      nome: "Espelho mensal de ponto",
      finalidade: "documento formal/SEI",
      categoria: "Ponto",
      formatos: ["PDF", "XLSX"],
      perfilAutorizado: "Servidor, gestor, RH",
      filtros: "competencia, servidor, unidade",
      padraoSei: true,
      hrefTela: `/espelho-ponto?competencia=${competencia}`,
    },
    {
      id: "banco-horas",
      nome: "Banco de horas",
      finalidade: "controle e compensação",
      categoria: "Banco de horas",
      formatos: ["PDF", "XLSX", "CSV"],
      perfilAutorizado: "Servidor, gestor, RH",
      filtros: "competencia, servidor, unidade",
      padraoSei: true,
      hrefTela: `/banco-horas?competencia=${competencia}`,
    },
    {
      id: "pendencias-ponto",
      nome: "Pendencias de ponto",
      finalidade: "saneamento mensal",
      categoria: "Ponto",
      formatos: ["PDF", "XLSX", "CSV"],
      perfilAutorizado: "Gestor, RH, DIREF",
      filtros: "competencia, unidade, tipo",
      padraoSei: false,
      hrefTela: `/painel-executivo/pendencias-de-ponto?competencia=${competencia}`,
    },
    {
      id: "homologacao-mensal",
      nome: "Homologacao mensal",
      finalidade: "fechamento da competência",
      categoria: "Homologação",
      formatos: ["PDF", "XLSX", "CSV"],
      perfilAutorizado: "Gestor, RH, DIREF",
      filtros: "competencia, unidade, status",
      padraoSei: true,
      hrefPdf: `/api/homologacao/export/pdf?competencia=${competencia}`,
      hrefCsv: `/api/homologacao/export?competencia=${competencia}`,
      hrefTela: `/homologacao?competencia=${competencia}`,
    },
    {
      id: "justificativas-ocorrencias",
      nome: "Justificativas e ocorrencias",
      finalidade: "análise chefia/RH",
      categoria: "Ocorrências",
      formatos: ["PDF", "XLSX", "CSV"],
      perfilAutorizado: "Gestor, RH",
      filtros: "competencia, unidade, status",
      padraoSei: true,
      hrefTela: `/painel-executivo/justificativas-e-ocorrencias?competencia=${competencia}`,
    },
    {
      id: "frequencia-assiduidade",
      nome: "Frequencia e assiduidade",
      finalidade: "gestão funcional",
      categoria: "Gestão",
      formatos: ["PDF", "XLSX", "CSV"],
      perfilAutorizado: "Gestor, RH, DIREF",
      filtros: "competencia, unidade, servidor",
      padraoSei: true,
      hrefTela: `/painel-executivo/frequencia-e-assiduidade?competencia=${competencia}`,
    },
    {
      id: "jornada-carga-horaria",
      nome: "Jornada e carga horaria",
      finalidade: "controle de jornada",
      categoria: "Jornada",
      formatos: ["PDF", "XLSX", "CSV"],
      perfilAutorizado: "Gestor, RH",
      filtros: "competencia, unidade, regime",
      padraoSei: false,
      hrefTela: `/painel-executivo/jornada-e-carga-horaria?competencia=${competencia}`,
    },
    {
      id: "teletrabalho-registro-web",
      nome: "Teletrabalho e registro web",
      finalidade: "conformidade",
      categoria: "Modalidade",
      formatos: ["PDF", "XLSX", "CSV"],
      perfilAutorizado: "RH, DIREF, auditoria",
      filtros: "competencia, unidade, modalidade",
      padraoSei: false,
      hrefTela: `/painel-executivo/teletrabalho-presencial-registro-web?competencia=${competencia}`,
    },
    {
      id: "equipamentos-ponto",
      nome: "Equipamentos de ponto",
      finalidade: "NUTEC/RH",
      categoria: "Técnico",
      formatos: ["PDF", "XLSX", "CSV"],
      perfilAutorizado: "NUTEC, RH, auditoria",
      filtros: "unidade, status, periodo",
      padraoSei: false,
      hrefTela: `/painel-executivo/equipamentos-de-ponto?competencia=${competencia}`,
    },
    {
      id: "auditoria-conformidade",
      nome: "Auditoria e conformidade",
      finalidade: "controle interno",
      categoria: "Auditoria",
      formatos: ["PDF", "XLSX", "CSV"],
      perfilAutorizado: "Auditoria, admin, DIREF",
      filtros: "periodo, usuario, entidade, acao",
      padraoSei: true,
      hrefPdf: `/api/auditoria/export/pdf?dataInicio=${competencia}-01`,
      hrefCsv: `/api/auditoria/export?dataInicio=${competencia}-01`,
      hrefTela: `/auditoria`,
    },
    {
      id: "indicadores-unidade-chefia",
      nome: "Indicadores por unidade e chefia",
      finalidade: "governanca",
      categoria: "Gestão",
      formatos: ["PDF", "XLSX", "CSV"],
      perfilAutorizado: "RH, DIREF",
      filtros: "competencia, unidade, chefia",
      padraoSei: false,
      hrefTela: `/painel-executivo/indicadores-por-unidade-e-chefia?competencia=${competencia}`,
    },
    {
      id: "alertas-inteligentes",
      nome: "Alertas inteligentes",
      finalidade: "gestão de risco",
      categoria: "Risco",
      formatos: ["PDF", "XLSX", "CSV"],
      perfilAutorizado: "Gestor, RH, NUTEC, auditoria",
      filtros: "competencia, criticidade, responsavel",
      padraoSei: false,
      hrefTela: `/painel-executivo/alertas-inteligentes?competencia=${competencia}`,
    },
  ];
}

function identificarFormatoExportacao(texto: string): RelatorioExportacaoHistorico["formato"] {
  const normalizado = normalizarTextoPainel(texto);

  if (normalizado.includes("PDF")) return "PDF";
  if (normalizado.includes("XLSX") || normalizado.includes("EXCEL")) return "XLSX";
  if (normalizado.includes("CSV")) return "CSV";
  return "-";
}

function identificarRelatorioExportado(
  texto: string,
  catalogo: RelatorioExportavelItem[],
) {
  const normalizado = normalizarTextoPainel(texto);

  return (
    catalogo.find((relatorio) =>
      normalizarTextoPainel(`${relatorio.nome} ${relatorio.id}`).split(" ").some(
        (parte) => parte.length > 5 && normalizado.includes(parte),
      ),
    )?.nome ?? "Outras exportacoes"
  );
}

async function calcularRelatoriosExportaveis(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  servidorIds?: string[];
  orgaoIds?: string[];
}): Promise<RelatoriosExportaveisResumo> {
  const catalogo = catalogoRelatoriosExportaveis(params.periodo.valorInput);
  const auditoriaEscopo =
    params.servidorIds && params.servidorIds.length > 0
      ? { usuario: { servidor: { id: { in: params.servidorIds } } } }
      : params.orgaoIds && params.orgaoIds.length > 0
        ? {
            OR: [
              { usuario: { servidor: { orgaoId: { in: params.orgaoIds } } } },
              { usuario: { perfis: { some: { orgaoId: { in: params.orgaoIds } } } } },
            ],
          }
        : {};
  const eventos = await prisma.auditoriaEvento.findMany({
    where: {
      ...auditoriaEscopo,
      criadoEm: { gte: params.periodo.inicio, lt: params.periodo.fim },
      OR: [
        { acao: { contains: "export", mode: "insensitive" } },
        { acao: { contains: "relatorio", mode: "insensitive" } },
        { entidade: { contains: "Export", mode: "insensitive" } },
      ],
    },
    include: { usuario: true },
    orderBy: { criadoEm: "desc" },
    take: 80,
  });
  const contagem = new Map<string, number>();
  const historico = eventos.map((evento) => {
    const texto = `${evento.entidade} ${evento.acao} ${JSON.stringify(evento.metadados ?? {})}`;
    const relatorio = identificarRelatorioExportado(texto, catalogo);
    const formato = identificarFormatoExportacao(texto);
    const status = normalizarTextoPainel(texto).includes("ERRO")
      ? "Erro"
      : "Gerado";

    contagem.set(relatorio, (contagem.get(relatorio) ?? 0) + 1);

    return {
      id: evento.id,
      dataHora: formatarDataHoraPainel(evento.criadoEm),
      usuario: evento.usuario?.nome ?? "Sistema",
      relatorio,
      filtros:
        extrairTextoJson(evento.metadados, ["filtros", "competencia", "unidadeId"]) ||
        "-",
      formato,
      status,
      href: `/auditoria/${evento.id}`,
    } satisfies RelatorioExportacaoHistorico;
  });
  const catalogoComUso = catalogo.map((relatorio) => ({
    ...relatorio,
    exportacoesMes: contagem.get(relatorio.nome) ?? 0,
  }));
  const rankingExportacoes = catalogoComUso
    .map((relatorio) => ({ label: relatorio.nome, valor: relatorio.exportacoesMes }))
    .sort((a, b) => b.valor - a.valor);

  return {
    relatoriosDisponiveis: catalogo.length,
    exportacoesMes: historico.length,
    pdfGerados: historico.filter((item) => item.formato === "PDF").length,
    xlsxGerados: historico.filter((item) => item.formato === "XLSX").length,
    csvGerados: historico.filter((item) => item.formato === "CSV").length,
    exportacoesSensiveis: historico.filter((item) =>
      ["Auditoria e conformidade", "Espelho mensal de ponto", "Banco de horas"].includes(
        item.relatorio,
      ),
    ).length,
    exportacoesComErro: historico.filter((item) => item.status === "Erro").length,
    relatorioMaisUsado:
      rankingExportacoes.find((item) => item.valor > 0)?.label ??
      "Sem exportacoes no mes",
    rankingExportacoes,
    catalogo: catalogoComUso,
    historico,
  };
}

function classificarSituacaoPainel(
  pontuacao: number,
): PainelCentralItem["situacao"] {
  if (pontuacao >= 85) return "Critico";
  if (pontuacao >= 70) return "Atencao";
  if (pontuacao >= 40) return "Monitorar";
  return "Regular";
}

function criarItemPainel(params: Omit<PainelCentralItem, "situacao" | "href"> & {
  competencia: string;
}): PainelCentralItem {
  const pontuacaoPrioridade = limitarCriticidade(params.pontuacaoPrioridade);

  return {
    ordem: params.ordem,
    painel: params.painel,
    slug: params.slug,
    grupo: params.grupo,
    finalidade: params.finalidade,
    perfilAutorizado: params.perfilAutorizado,
    prioridade: params.prioridade,
    pontuacaoPrioridade,
    situacao: classificarSituacaoPainel(pontuacaoPrioridade),
    indicadorPrincipal: params.indicadorPrincipal,
    ultimaAtualizacao: params.ultimaAtualizacao,
    href: `/painel-executivo/${params.slug}?competencia=${params.competencia}`,
  };
}

function calcularPaineisResumo(params: {
  periodo: ReturnType<typeof criarPeriodo>;
  indicadoresExecutivos: SerieMensalIndicadores[];
  pendenciasPonto: PendenciasPontoResumo;
  frequenciaAssiduidade: FrequenciaAssiduidadeResumo;
  justificativasAssiduidade: JustificativasAssiduidadeResumo;
  homologacaoMensal: HomologacaoMensalResumo;
  jornadaCargaHoraria: JornadaCargaHorariaResumo;
  teletrabalhoRegistroWeb: TeletrabalhoRegistroWebResumo;
  equipamentosPonto: EquipamentosPontoResumo;
  auditoriaConformidade: AuditoriaConformidadeResumo;
  indicadoresUnidadeChefia: IndicadoresUnidadeChefiaResumo;
  alertasInteligentes: AlertasInteligentesResumo;
  bancoHoras: BancoHorasResumo;
  relatoriosExportaveis: RelatoriosExportaveisResumo;
}): PaineisResumo {
  const pendentesHomologacao =
    params.homologacaoMensal.pendentesServidor +
    params.homologacaoMensal.pendentesChefia +
    params.homologacaoMensal.pendentesRh;
  const ultimoIndicador =
    params.indicadoresExecutivos[params.indicadoresExecutivos.length - 1];
  const ultimaAtualizacao = formatarDataHoraPainel(new Date());
  const competencia = params.periodo.valorInput;
  const baseCatalogo = [
    criarItemPainel({
      ordem: 1,
      painel: "Indicadores",
      slug: "indicadores",
      grupo: "Inteligencia",
      finalidade: "KPIs executivos e tendencia mensal dos principais indicadores.",
      perfilAutorizado: "DIREF, RH, gestor",
      prioridade: "Alta",
      pontuacaoPrioridade:
        params.alertasInteligentes.alertasAtivos * 3 +
        params.pendenciasPonto.vencidas * 4 +
        (ultimoIndicador?.inconsistencias ?? 0),
      indicadorPrincipal: `${params.alertasInteligentes.alertasAtivos} alerta(s) ativo(s)`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 2,
      painel: "Pendências de ponto",
      slug: "pendencias-de-ponto",
      grupo: "Gestao mensal",
      finalidade: "Gargalos que impedem o fechamento da frequência.",
      perfilAutorizado: "RH, gestor",
      prioridade: "Maxima",
      pontuacaoPrioridade:
        params.pendenciasPonto.totalAbertas + params.pendenciasPonto.vencidas * 3,
      indicadorPrincipal: `${params.pendenciasPonto.totalAbertas} pendencia(s) aberta(s)`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 3,
      painel: "Frequência e assiduidade",
      slug: "frequencia-e-assiduidade",
      grupo: "Frequencia funcional",
      finalidade: "Evolução de comparecimento, assiduidade e ocorrências.",
      perfilAutorizado: "RH, gestor",
      prioridade: "Alta",
      pontuacaoPrioridade:
        params.frequenciaAssiduidade.servidoresCriticos * 8 +
        params.frequenciaAssiduidade.ausenciasInjustificadas,
      indicadorPrincipal: `${params.frequenciaAssiduidade.assiduidadeMedia}% de assiduidade`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 4,
      painel: "Justificativa e assiduidade",
      slug: "justificativas-e-ocorrencias",
      grupo: "Frequencia funcional",
      finalidade: "Pendências de justificativa que impactam a assiduidade.",
      perfilAutorizado: "RH, gestor",
      prioridade: "Alta",
      pontuacaoPrioridade:
        params.justificativasAssiduidade.justificativasVencidas * 8 +
        params.justificativasAssiduidade.justificativasAbertas,
      indicadorPrincipal: `${params.justificativasAssiduidade.justificativasAbertas} justificativa(s) aberta(s)`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 5,
      painel: "Controle de homologação mensal",
      slug: "controle-de-homologacao-mensal",
      grupo: "Gestao mensal",
      finalidade: "Fechamento mensal dos espelhos por unidade e responsavel.",
      perfilAutorizado: "RH, chefia, DIREF",
      prioridade: "Maxima",
      pontuacaoPrioridade:
        pendentesHomologacao + params.homologacaoMensal.detalhes.length * 4,
      indicadorPrincipal: `${pendentesHomologacao} espelho(s) pendente(s)`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 6,
      painel: "Jornada e carga horaria",
      slug: "jornada-e-carga-horaria",
      grupo: "Frequencia funcional",
      finalidade: "Carga prevista, realizada, saldos e aderencia a jornada.",
      perfilAutorizado: "RH, gestor",
      prioridade: "Alta",
      pontuacaoPrioridade:
        params.jornadaCargaHoraria.servidoresDeficit * 8 +
        params.jornadaCargaHoraria.servidoresExcesso * 5 +
        params.jornadaCargaHoraria.jornadasIncompletas,
      indicadorPrincipal: `${params.jornadaCargaHoraria.aderencia}% de aderencia`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 7,
      painel: "Teletrabalho, presencial e registro web",
      slug: "teletrabalho-presencial-registro-web",
      grupo: "Controle operacional",
      finalidade: "Conformidade entre modalidade de trabalho e origem do registro.",
      perfilAutorizado: "RH, auditoria",
      prioridade: "Alta",
      pontuacaoPrioridade:
        params.teletrabalhoRegistroWeb.registroWebSemVinculo * 8 +
        params.teletrabalhoRegistroWeb.servidoresAlerta * 4,
      indicadorPrincipal: `${params.teletrabalhoRegistroWeb.servidoresAlerta} servidor(es) em alerta`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 8,
      painel: "Equipamento de ponto",
      slug: "equipamentos-de-ponto",
      grupo: "Controle operacional",
      finalidade: "Saúde operacional dos equipamentos e risco de importação.",
      perfilAutorizado: "NUTEC, RH",
      prioridade: "Média-alta",
      pontuacaoPrioridade:
        params.equipamentosPonto.offline * 12 +
        params.equipamentosPonto.atrasoComunicacao * 6 +
        params.equipamentosPonto.semSincronizacaoRecente * 8 +
        params.equipamentosPonto.marcacoesPendentesImportacao / 5,
      indicadorPrincipal: `${params.equipamentosPonto.offline} equipamento(s) offline`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 9,
      painel: "Auditoria e conformidade",
      slug: "auditoria-e-conformidade",
      grupo: "Governanca",
      finalidade: "Riscos, rastreabilidade e eventos sensíveis do ponto.",
      perfilAutorizado: "Auditoria, RH, admin",
      prioridade: "Alta",
      pontuacaoPrioridade:
        params.auditoriaConformidade.achadosCriticos * 10 +
        Math.max(0, 100 - params.auditoriaConformidade.indiceConformidade),
      indicadorPrincipal: `${params.auditoriaConformidade.indiceConformidade}% de conformidade`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 10,
      painel: "Indicadores por unidade e chefia",
      slug: "indicadores-por-unidade-e-chefia",
      grupo: "Governanca",
      finalidade: "Comparativo executivo por unidade e chefia responsavel.",
      perfilAutorizado: "DIREF, RH",
      prioridade: "Alta",
      pontuacaoPrioridade:
        params.indicadoresUnidadeChefia.chefiasPendenciaCritica * 12 +
        Math.max(0, 90 - params.indicadoresUnidadeChefia.mediaGeralConformidade),
      indicadorPrincipal: `${params.indicadoresUnidadeChefia.mediaGeralConformidade}% de media geral`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 11,
      painel: "Alertas inteligentes",
      slug: "alertas-inteligentes",
      grupo: "Inteligencia",
      finalidade: "Fila priorizada de riscos e acoes recomendadas.",
      perfilAutorizado: "Perfis gestores",
      prioridade: "Maxima",
      pontuacaoPrioridade:
        params.alertasInteligentes.alertasCriticos * 10 +
        params.alertasInteligentes.vencidos * 5 +
        params.alertasInteligentes.bloqueiamHomologacao * 4,
      indicadorPrincipal: `${params.alertasInteligentes.alertasCriticos} alerta(s) critico(s)`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 12,
      painel: "Banco de horas",
      slug: "banco-de-horas",
      grupo: "Controle operacional",
      finalidade: "Saldos positivos, negativos, vencimentos e compensações.",
      perfilAutorizado: "RH, gestor",
      prioridade: "Maxima",
      pontuacaoPrioridade:
        params.bancoHoras.servidoresCriticos * 10 +
        params.bancoHoras.horasProximasVencimento,
      indicadorPrincipal: `${params.bancoHoras.servidoresCriticos} servidor(es) critico(s)`,
      ultimaAtualizacao,
      competencia,
    }),
    criarItemPainel({
      ordem: 13,
      painel: "Relatórios exportáveis",
      slug: "relatorios-exportaveis",
      grupo: "Gestao mensal",
      finalidade: "Catálogo, exportações auditadas e documentos oficiais.",
      perfilAutorizado: "RH, auditoria, gestor",
      prioridade: "Alta",
      pontuacaoPrioridade:
        params.relatoriosExportaveis.exportacoesComErro * 15 +
        params.relatoriosExportaveis.exportacoesSensiveis,
      indicadorPrincipal: `${params.relatoriosExportaveis.relatoriosDisponiveis} relatorio(s) disponivel(is)`,
      ultimaAtualizacao,
      competencia,
    }),
  ];
  const mediaTopTres =
    [...baseCatalogo]
      .sort((a, b) => b.pontuacaoPrioridade - a.pontuacaoPrioridade)
      .slice(0, 3)
      .reduce((total, item) => total + item.pontuacaoPrioridade, 0) / 3 || 0;
  const catalogo = [
    ...baseCatalogo,
    criarItemPainel({
      ordem: 14,
      painel: "Painéis",
      slug: "paineis",
      grupo: "Inteligencia",
      finalidade: "Central executiva de navegação e priorização dos painéis.",
      perfilAutorizado: "Todos os perfis",
      prioridade: "Alta",
      pontuacaoPrioridade: mediaTopTres,
      indicadorPrincipal: "central de navegação",
      ultimaAtualizacao,
      competencia,
    }),
  ];
  const ranking = [...catalogo].sort(
    (a, b) => b.pontuacaoPrioridade - a.pontuacaoPrioridade || a.ordem - b.ordem,
  );
  const acoesPendentes =
    params.pendenciasPonto.totalAbertas +
    params.alertasInteligentes.alertasAtivos +
    pendentesHomologacao +
    params.justificativasAssiduidade.justificativasAbertas;

  return {
    totalPaineis: catalogo.length,
    paineisCriticos: catalogo.filter((item) => item.situacao === "Critico").length,
    acoesPendentes,
    relatoriosDisponiveis: params.relatoriosExportaveis.relatoriosDisponiveis,
    ultimaAtualizacao,
    perfisComAcesso: 7,
    painelMaisPrioritario: ranking[0]?.painel ?? "-",
    rankingPrioridade: ranking.map((item) => ({
      label: item.painel,
      valor: item.pontuacaoPrioridade,
    })),
    catalogo,
    atalhos: [
      {
        label: "Homologar competência",
        href: `/painel-executivo/controle-de-homologacao-mensal?competencia=${competencia}`,
        detalhe: `${pendentesHomologacao} espelho(s) pendente(s)`,
      },
      {
        label: "Ver pendências",
        href: `/painel-executivo/pendencias-de-ponto?competencia=${competencia}`,
        detalhe: `${params.pendenciasPonto.totalAbertas} pendencia(s) aberta(s)`,
      },
      {
        label: "Analisar banco de horas",
        href: `/painel-executivo/banco-de-horas?competencia=${competencia}`,
        detalhe: `${params.bancoHoras.servidoresCriticos} servidor(es) critico(s)`,
      },
      {
        label: "Exportar relatórios",
        href: `/painel-executivo/relatorios-exportaveis?competencia=${competencia}`,
        detalhe: `${params.relatoriosExportaveis.relatoriosDisponiveis} modelo(s) disponivel(is)`,
      },
    ],
  };
}

export async function buscarDadosPainelExecutivo(params: {
  competencia?: string | null;
  usuarioId?: string;
  perfilAtivoCodigo?: string;
  perfilAtivoEscopoGlobal?: boolean;
  orgaoIds?: string[];
} = {}): Promise<PainelExecutivoDados> {
  const periodo = criarPeriodo(params.competencia);
  const heartbeatLimite = new Date();
  heartbeatLimite.setHours(heartbeatLimite.getHours() - 24);
  const escopo = await resolverEscopoPainel({
    usuarioId: params.usuarioId,
    perfilAtivoCodigo: params.perfilAtivoCodigo,
    perfilAtivoEscopoGlobal: params.perfilAtivoEscopoGlobal,
    orgaoIds: params.orgaoIds,
    dataReferencia: periodo.inicio,
  });
  const servidorWhere = escopo.servidorIds
    ? { servidorId: { in: escopo.servidorIds } }
    : {};
  const servidorIdWhere = escopo.servidorIds
    ? { id: { in: escopo.servidorIds } }
    : {};
  const unidadeWhere = escopo.unidadeIds
    ? { unidadeId: { in: escopo.unidadeIds } }
    : {};

  const [
    servidoresAtivos,
    apuracoesPorResultadoRaw,
    homologacaoPorStatusRaw,
    ocorrenciasPorTipoRaw,
    ocorrenciasAbertas,
    evolucaoRaw,
    ocorrenciasRaw,
    movimentosBancoRaw,
    saldoBancoTotalRaw,
    saldosBancoRaw,
    solicitacoesPorStatusRaw,
    solicitacoesPorTipoRaw,
    marcacoesPorFonteRaw,
    equipamentos,
    eventosEquipamentoRaw,
  ] = await Promise.all([
    prisma.servidor.count({
      where: {
        ...servidorIdWhere,
        ativo: true,
        usuario: { ativo: true },
      },
    }),
    prisma.apuracaoDiaria.groupBy({
      by: ["resultado"],
      where: {
        ...servidorWhere,
        dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
      },
      _count: true,
    }),
    prisma.homologacaoServidorMes.groupBy({
      by: ["status"],
      where: {
        ...servidorWhere,
        fechamento: {
          anoReferencia: periodo.ano,
          mesReferencia: periodo.mes,
        },
      },
      _count: true,
    }),
    prisma.ocorrenciaFrequencia.groupBy({
      by: ["tipo"],
      where: {
        ...servidorWhere,
        apuracaoDiaria: {
          dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
        },
      },
      _count: true,
    }),
    prisma.ocorrenciaFrequencia.count({
      where: {
        ...servidorWhere,
        resolvida: false,
        apuracaoDiaria: {
          dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
        },
      },
    }),
    prisma.apuracaoDiaria.groupBy({
      by: ["dataReferencia", "resultado"],
      where: {
        ...servidorWhere,
        dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
      },
      _count: true,
      orderBy: { dataReferencia: "asc" },
    }),
    prisma.ocorrenciaFrequencia.findMany({
      where: {
        ...servidorWhere,
        apuracaoDiaria: {
          dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
        },
      },
      select: {
        servidor: {
          select: {
            lotacoes: {
              where: {
                status: "ATIVO",
                dataInicio: { lt: periodo.fim },
                OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
              },
              select: { unidade: { select: { sigla: true, nome: true } } },
              orderBy: { dataInicio: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.movimentoBancoHoras.groupBy({
      by: ["tipo"],
      where: {
        ...servidorWhere,
        anoReferencia: periodo.ano,
        mesReferencia: periodo.mes,
      },
      _sum: { minutos: true },
      _count: true,
    }),
    prisma.bancoHorasSaldo.aggregate({
      where: escopo.servidorIds
        ? { servidorId: { in: escopo.servidorIds } }
        : undefined,
      _sum: { saldoMinutos: true },
    }),
    prisma.bancoHorasSaldo.findMany({
      where: escopo.servidorIds
        ? { servidorId: { in: escopo.servidorIds } }
        : undefined,
      orderBy: [{ saldoMinutos: "desc" }],
      take: 8,
      include: {
        servidor: {
          include: { usuario: true },
        },
      },
    }),
    prisma.solicitacao.groupBy({
      by: ["status"],
      where: {
        ...servidorWhere,
        criadoEm: { gte: periodo.inicio, lt: periodo.fim },
      },
      _count: true,
    }),
    prisma.solicitacao.groupBy({
      by: ["tipo"],
      where: {
        ...servidorWhere,
        criadoEm: { gte: periodo.inicio, lt: periodo.fim },
      },
      _count: true,
    }),
    prisma.marcacao.groupBy({
      by: ["fonte"],
      where: {
        ...servidorWhere,
        dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
        status: "VALIDA",
      },
      _count: true,
    }),
    prisma.equipamentoBiometrico.findMany({
      where: escopo.unidadeIds ? unidadeWhere : undefined,
      select: {
        ativo: true,
        ultimoHeartbeatEm: true,
      },
    }),
    prisma.eventoEquipamentoBiometrico.groupBy({
      by: ["tipoEvento"],
      where: {
        ...(escopo.unidadeIds
          ? { equipamento: { unidadeId: { in: escopo.unidadeIds } } }
          : {}),
        recebidoEm: { gte: periodo.inicio, lt: periodo.fim },
      },
      _count: true,
    }),
  ]);

  const apuracaoPorResultado = mapearGroupBy(
    apuracoesPorResultadoRaw,
    RESULTADOS_APURACAO,
    "resultado",
  );
  const homologacaoPorStatus = mapearGroupBy(
    homologacaoPorStatusRaw,
    STATUS_HOMOLOGACAO,
    "status",
  );
  const ocorrenciasPorTipo = limitarRanking(
    mapearGroupBy(ocorrenciasPorTipoRaw, OCORRENCIAS, "tipo"),
    8,
  );
  const bancoHorasPorTipo = limitarRanking(
    mapearGroupBy(movimentosBancoRaw, TIPOS_BANCO_HORAS, "tipo", "minutos").map(
      (item) => ({ ...item, valor: minutosParaHoras(item.valor) }),
    ),
    8,
  );

  const porUnidade = new Map<string, number>();
  for (const ocorrencia of ocorrenciasRaw) {
    const unidade = ocorrencia.servidor.lotacoes[0]?.unidade;
    const label = unidade?.sigla ?? unidade?.nome ?? "Sem unidade";
    porUnidade.set(label, (porUnidade.get(label) ?? 0) + 1);
  }

  const regularPorDia = new Map<number, number>();
  const pendenciasPorDia = new Map<number, number>();
  for (const item of evolucaoRaw) {
    const dia = item.dataReferencia.getDate();
    if (item.resultado === "REGULAR") {
      regularPorDia.set(dia, (regularPorDia.get(dia) ?? 0) + item._count);
    } else {
      pendenciasPorDia.set(dia, (pendenciasPorDia.get(dia) ?? 0) + item._count);
    }
  }

  const evolucaoDiaria = Array.from({ length: periodo.diasNoMes }, (_, index) => {
    const dia = index + 1;

    return {
      label: String(dia).padStart(2, "0"),
      valor: regularPorDia.get(dia) ?? 0,
      valorSecundario: pendenciasPorDia.get(dia) ?? 0,
    };
  });

  const homologacoesPendentes = homologacaoPorStatus
    .filter((item) => ["Pendente", "Com pendencias", "Devolvido"].includes(item.label))
    .reduce((total, item) => total + item.valor, 0);
  const homologacoesHomologadas = homologacaoPorStatus
    .filter((item) => item.label.startsWith("Homologado"))
    .reduce((total, item) => total + item.valor, 0);
  const totalApuracoes = apuracaoPorResultado.reduce(
    (total, item) => total + item.valor,
    0,
  );
  const apuracoesRegulares =
    apuracaoPorResultado.find((item) => item.label === "Regular")?.valor ?? 0;
  const regularidadePercentual =
    totalApuracoes > 0 ? Math.round((apuracoesRegulares / totalApuracoes) * 100) : 0;
  const indicadoresExecutivos = await calcularIndicadoresMensais({
    servidoresAtivos,
    ano: periodo.ano,
    mes: periodo.mes,
    servidorIds: escopo.servidorIds,
  });
  const pendenciasPonto = await calcularPendenciasPonto({
    periodo,
    servidorIds: escopo.servidorIds,
  });
  const frequenciaAssiduidade = await calcularFrequenciaAssiduidade({
    periodo,
    servidorIds: escopo.servidorIds,
  });
  const justificativasAssiduidade = await calcularJustificativasAssiduidade({
    periodo,
    servidorIds: escopo.servidorIds,
  });
  const homologacaoMensal = await calcularHomologacaoMensal({
    periodo,
    servidorIds: escopo.servidorIds,
  });
  const jornadaCargaHoraria = await calcularJornadaCargaHoraria({
    periodo,
    servidorIds: escopo.servidorIds,
  });
  const teletrabalhoRegistroWeb = await calcularTeletrabalhoRegistroWeb({
    periodo,
    servidorIds: escopo.servidorIds,
  });
  const equipamentosPonto = await calcularEquipamentosPonto({
    periodo,
    unidadeIds: escopo.unidadeIds,
  });
  const auditoriaConformidade = await calcularAuditoriaConformidade({
    periodo,
    servidorIds: escopo.servidorIds,
    orgaoIds: params.orgaoIds,
    servidoresAtivos,
    pendenciasPonto,
    justificativasAssiduidade,
    homologacaoMensal,
    frequenciaAssiduidade,
    teletrabalhoRegistroWeb,
    equipamentosPonto,
  });
  const indicadoresUnidadeChefia = await calcularIndicadoresUnidadeChefia({
    periodo,
    servidorIds: escopo.servidorIds,
    unidadeIds: escopo.unidadeIds,
  });
  const alertasInteligentes = calcularAlertasInteligentes({
    homologacaoMensal,
    pendenciasPonto,
    justificativasAssiduidade,
    frequenciaAssiduidade,
    jornadaCargaHoraria,
    teletrabalhoRegistroWeb,
    equipamentosPonto,
    auditoriaConformidade,
  });
  const bancoHoras = await calcularBancoHoras({
    periodo,
    servidorIds: escopo.servidorIds,
  });
  const graficosImportantes = calcularGraficosImportantes({
    homologacaoMensal,
    pendenciasPonto,
    bancoHoras,
    frequenciaAssiduidade,
    jornadaCargaHoraria,
    alertasInteligentes,
    teletrabalhoRegistroWeb,
    equipamentosPonto,
    indicadoresUnidadeChefia,
    auditoriaConformidade,
  });
  const relatoriosExportaveis = await calcularRelatoriosExportaveis({
    periodo,
    servidorIds: escopo.servidorIds,
    orgaoIds: params.orgaoIds,
  });
  const paineis = calcularPaineisResumo({
    periodo,
    indicadoresExecutivos,
    pendenciasPonto,
    frequenciaAssiduidade,
    justificativasAssiduidade,
    homologacaoMensal,
    jornadaCargaHoraria,
    teletrabalhoRegistroWeb,
    equipamentosPonto,
    auditoriaConformidade,
    indicadoresUnidadeChefia,
    alertasInteligentes,
    bancoHoras,
    relatoriosExportaveis,
  });

  const equipamentosPorStatus = [
    {
      label: "Online",
      valor: equipamentos.filter(
        (item) =>
          item.ativo &&
          item.ultimoHeartbeatEm &&
          item.ultimoHeartbeatEm >= heartbeatLimite,
      ).length,
    },
    {
      label: "Offline",
      valor: equipamentos.filter(
        (item) =>
          item.ativo &&
          (!item.ultimoHeartbeatEm || item.ultimoHeartbeatEm < heartbeatLimite),
      ).length,
    },
    {
      label: "Inativo",
      valor: equipamentos.filter((item) => !item.ativo).length,
    },
  ].filter((item) => item.valor > 0);

  return {
    competencia: {
      ano: periodo.ano,
      mes: periodo.mes,
      valorInput: periodo.valorInput,
      rotulo: periodo.rotulo,
    },
    metricas: {
      servidoresAtivos,
      apuracoesCalculadas: totalApuracoes,
      regularidadePercentual,
      ocorrenciasAbertas,
      homologacoesPendentes,
      homologacoesHomologadas,
      saldoBancoHorasHoras: minutosParaHoras(
        saldoBancoTotalRaw._sum.saldoMinutos ?? 0,
      ),
      equipamentosOffline:
        equipamentosPorStatus.find((item) => item.label === "Offline")?.valor ?? 0,
    },
    apuracaoPorResultado,
    homologacaoPorStatus,
    ocorrenciasPorTipo,
    ocorrenciasPorUnidade: limitarRanking(
      Array.from(porUnidade.entries()).map(([label, valor]) => ({ label, valor })),
    ),
    evolucaoDiaria,
    bancoHorasPorTipo,
    maioresSaldosBancoHoras: saldosBancoRaw.map((item) => ({
      label: nomeServidor(item.servidor) || item.servidor.matricula,
      valor: minutosParaHoras(item.saldoMinutos),
    })),
    solicitacoesPorStatus: mapearGroupBy(
      solicitacoesPorStatusRaw,
      STATUS_SOLICITACAO,
      "status",
    ),
    solicitacoesPorTipo: limitarRanking(
      mapearGroupBy(solicitacoesPorTipoRaw, TIPOS_SOLICITACAO, "tipo"),
      8,
    ),
    marcacoesPorFonte: mapearGroupBy(
      marcacoesPorFonteRaw,
      FONTES_MARCACAO,
      "fonte",
    ),
    equipamentosPorStatus,
    eventosEquipamentoPorTipo: mapearGroupBy(
      eventosEquipamentoRaw,
      TIPOS_EVENTO_EQUIPAMENTO,
      "tipoEvento",
    ),
    indicadoresExecutivos,
    pendenciasPonto,
    frequenciaAssiduidade,
    justificativasAssiduidade,
    homologacaoMensal,
    jornadaCargaHoraria,
    teletrabalhoRegistroWeb,
    equipamentosPonto,
    auditoriaConformidade,
    indicadoresUnidadeChefia,
    alertasInteligentes,
    bancoHoras,
    graficosImportantes,
    relatoriosExportaveis,
    paineis,
    escopo: {
      tipo: escopo.tipo,
      descricao: escopo.descricao,
    },
  };
}
