import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Hourglass,
  Laptop,
  MinusCircle,
  MoreVertical,
  PartyPopper,
  Repeat2,
  Send,
  Zap,
  Wifi,
} from "lucide-react";

import { Card } from "@/components/ui";
import { minutosParaTexto } from "../../application/services/calcular-tempo.service";
import { autorizarHoraExtraBancoHorasAction } from "../../application/actions/autorizar-hora-extra-banco-horas.action";
import { ConfirmarAutorizacaoHoraExtraButton } from "./confirmar-autorizacao-hora-extra-button";
import { TempoAutorizadoInput } from "./tempo-autorizado-input";
import {
  classificarDiaEspelho,
  conferenciaEspelho,
  resumirEspelhoMensal,
  rotuloSolicitacaoEspelho,
  type ResumoEspelhoMensal,
  type SolicitacaoAplicadaEspelho,
} from "../../application/services/classificar-espelho-mensal.service";
import {
  descricaoMarcacao,
  marcacaoPossuiAjuste,
} from "../../application/services/espelho-marcacao-origem.service";
import { AfastamentoTipoIcone } from "@/modules/servidores/presentation/components/afastamento-tipo-icone";
import { SolicitacaoAjusteDiaDropdown } from "./solicitacao-ajuste-dia-dropdown";
import { EspelhoPontoTabelaInterativa } from "./espelho-ponto-tabela-interativa";
import {
  EspelhoPontoHistoricoAjustesInterativo,
  EspelhoPontoOcorrenciasInterativa,
} from "./espelho-ponto-ocorrencias-interativa";
import { EspelhoPontoSemanaChart } from "./espelho-ponto-semana-chart";

type ApuracaoMensalItem = {
  id: string;
  dataReferencia: Date | string;
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosIntervalo?: number;
  minutosCredito: number;
  minutosDebito: number;
  resultado: string;
  status: string;
  metadados?: unknown;
  contabilizarSaldos?: boolean;
  geradoParaCompetencia?: boolean;
  minutosDebitoApurado?: number;
  minutosDebitoCompensado?: number;
  minutosHoraExtraAutorizada?: number;
  minutosHoraExtraNaoAutorizada?: number;
  minutosBancoHoras?: number;
  ocorrencias?: {
    id?: string;
    tipo: string;
    descricao: string;
    minutos: number;
    detalhes?: unknown;
  }[];
};

type MarcacaoItem = {
  id: string;
  dataHora: Date | string;
  dataReferencia: Date | string;
  fusoHorario?: string | null;
  tipo: string;
  fonte?: string | null;
  status: string;
  metadados?: unknown;
};

type DiaInstitucionalEspelho = {
  tipo: string;
  descricao: string;
  contaComoDiaUtil: boolean;
  geraApuraçãoRegular: boolean;
};

type HomologacaoCompetenciaEspelho = {
  status: string;
  enviadoEm?: Date | string | null;
  enviadoPor?: string | null;
  homologadoEm?: Date | string | null;
  homologadoPor?: string | null;
  unidadeSigla?: string | null;
  chefiaResponsavel?: string | null;
};

function permiteAcoesAjusteEspelho(
  homologacao?: HomologacaoCompetenciaEspelho | null,
) {
  if (!homologacao) {
    return true;
  }

  return homologacao.status === "DEVOLVIDO";
}

type TipoHoraResumo = {
  id: string;
  label: string;
  quantidade: number;
  minutos: number;
  percentual: number;
  color: string;
  observacao?: string;
  observacaoTone?: "green" | "amber" | "red" | "neutral";
};

type OcorrenciaVisualizacao = {
  id: string;
  dataReferencia: Date | string;
  dia: string;
  tipo: "hora-extra" | "atraso" | "saida" | "falta" | "outra";
  tipoLabel: string;
  periodo: string;
  duracaoMinutos: number;
  situacao: string;
  justificativa: string;
  origem: string;
  observacoes: string;
  solicitacaoId?: string;
  solicitacaoNumero?: string;
  solicitacaoStatus?: string;
  hrefEditar?: string;
  hrefSolicitar?: string;
  podeExcluir?: boolean;
};

type SolicitacaoEspelho = {
  id: string;
  tipo: string;
  status: string;
  titulo: string;
  descricao: string;
  dataReferencia: Date | string | null;
  dataInicio: Date | string | null;
  dataFim: Date | string | null;
  criadoEm: Date | string;
  analisadaEm?: Date | string | null;
  justificativaAnalise?: string | null;
  usuarioSolicitante?: { nome?: string | null } | null;
  analisadaPor?: { nome?: string | null } | null;
  anexos?: {
    id: string;
    nomeOriginal: string;
    tamanhoBytes: number;
  }[];
  eventos?: {
    id: string;
    tipo: string;
    descricao: string;
    criadoEm: Date | string;
    usuario?: { nome?: string | null } | null;
  }[];
};

type OcorrenciasVisualizacaoResumo = {
  linhas: OcorrenciaVisualizacao[];
  semOcorrências: number;
  horasExtras: number;
  atrasos: number;
  saidas: number;
  faltas: number;
  outras: number;
};

function minutosCreditoExibivel(item: ApuracaoMensalItem) {
  return Math.max(
    0,
    item.minutosCredito - (item.minutosHoraExtraNaoAutorizada ?? 0),
  );
}

function montarDetalheJornadaPrevista(apuracoes: ApuracaoMensalItem[]) {
  const diasComJornada = apuracoes.filter(
    (item) =>
      item.contabilizarSaldos !== false && item.cargaPrevistaMinutos > 0,
  );

  if (diasComJornada.length === 0) {
    return "Sem jornada prevista no período";
  }

  const totalPrevisto = diasComJornada.reduce(
    (total, item) => total + item.cargaPrevistaMinutos,
    0,
  );
  const mediaDiaria = Math.round(totalPrevisto / diasComJornada.length);
  const cargasDistintas = new Set(
    diasComJornada.map((item) => item.cargaPrevistaMinutos),
  );
  const detalheCarga =
    cargasDistintas.size === 1
      ? `${minutosParaTexto(diasComJornada[0].cargaPrevistaMinutos)}/dia`
      : `média ${minutosParaTexto(mediaDiaria)}/dia`;

  return `${detalheCarga} - ${diasComJornada.length} dias com jornada`;
}

function percentualDoPrevisto(minutos: number, previsto: number) {
  if (previsto <= 0 || minutos <= 0) {
    return 0;
  }

  return Math.round((minutos / previsto) * 1000) / 10;
}

function contarDiasCom(
  apuracoes: ApuracaoMensalItem[],
  seletor: (item: ApuracaoMensalItem) => number | boolean,
) {
  return apuracoes.filter((item) => {
    const valor = seletor(item);

    return typeof valor === "number" ? valor > 0 : valor;
  }).length;
}

function tipoOcorrenciaNormalizado(tipo: string) {
  return tipo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function formatarNumeroSolicitacao(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function dataPrincipalSolicitacao(solicitacao: SolicitacaoEspelho) {
  return (
    solicitacao.dataReferencia ??
    solicitacao.dataInicio ??
    solicitacao.dataFim ??
    solicitacao.criadoEm
  );
}

function chaveDataSolicitacao(solicitacao: SolicitacaoEspelho) {
  return chaveDataReferenciaUtc(dataPrincipalSolicitacao(solicitacao));
}

function hrefNovaSolicitacao(params: {
  tipo: string;
  dataReferencia: Date | string;
  duracaoMinutos?: number;
}) {
  const query = new URLSearchParams({
    tipo: params.tipo,
    dataReferencia: chaveDataReferenciaUtc(params.dataReferencia),
  });
  const horasSolicitadas =
    params.duracaoMinutos && params.duracaoMinutos > 0
      ? minutosParaTexto(params.duracaoMinutos)
      : null;

  if (params.tipo === "HORA_CREDITO_PREVIA" && horasSolicitadas) {
    query.set("horasSolicitadas", String(horasSolicitadas));
    query.set("passo", "4");
  } else if (
    ["ABONO_JUSTIFICATIVA", "COMPENSACAO", "FOLGA_BANCO_HORAS"].includes(
      params.tipo,
    )
  ) {
    query.set("passo", "4");
  } else {
    query.set("passo", "3");
  }

  return `/solicitacoes/nova?${query.toString()}`;
}

function solicitacaoPodeSerEditadaNoEspelho(status?: string) {
  return Boolean(status && !["DEFERIDA", "INDEFERIDA"].includes(status));
}

function statusOcorrenciaDaSolicitacao(status: string) {
  const rotulos: Record<string, string> = {
    RASCUNHO: "Em análise",
    ENVIADA: "Em análise",
    EM_ANALISE: "Em análise",
    DEFERIDA: "Deferido",
    INDEFERIDA: "Indeferido",
    CANCELADA: "Cancelado",
  };

  return rotulos[status] ?? status;
}

function tipoOcorrenciaDaSolicitacao(
  solicitacao: SolicitacaoEspelho,
): Pick<OcorrenciaVisualizacao, "tipo" | "tipoLabel" | "periodo"> {
  if (solicitacao.tipo === "HORA_CREDITO_PREVIA") {
    return {
      tipo: "hora-extra",
      tipoLabel: "Hora extra",
      periodo: "Após jornada",
    };
  }

  if (solicitacao.tipo === "ABONO_JUSTIFICATIVA") {
    return {
      tipo: "falta",
      tipoLabel: "Justificativa",
      periodo: "Dia inteiro",
    };
  }

  if (solicitacao.tipo === "AJUSTE_PONTO") {
    return {
      tipo: "outra",
      tipoLabel: "Ajuste de marcação",
      periodo: "Entrada/Saída",
    };
  }

  if (
    solicitacao.tipo === "COMPENSACAO" ||
    solicitacao.tipo === "FOLGA_BANCO_HORAS"
  ) {
    return {
      tipo: "outra",
      tipoLabel: "Compensação",
      periodo: "Dia inteiro",
    };
  }

  return {
    tipo: "outra",
    tipoLabel: rotuloSolicitacaoEspelho(solicitacao.tipo),
    periodo: "Durante jornada",
  };
}

function minutosSolicitacao(solicitacao: SolicitacaoEspelho) {
  const inicio = solicitacao.dataInicio
    ? new Date(solicitacao.dataInicio)
    : null;
  const fim = solicitacao.dataFim ? new Date(solicitacao.dataFim) : null;

  if (
    inicio &&
    fim &&
    !Number.isNaN(inicio.getTime()) &&
    !Number.isNaN(fim.getTime())
  ) {
    return Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / 60000));
  }

  return 0;
}

function montarVisualizacaoOcorrencias(
  apuracoes: ApuracaoMensalItem[],
  solicitacoes: SolicitacaoEspelho[],
): OcorrenciasVisualizacaoResumo {
  const linhas: OcorrenciaVisualizacao[] = [];
  const diasComOcorrência = new Set<string>();
  const solicitacoesPorData = new Map<string, SolicitacaoEspelho[]>();
  const datasDaCompetencia = new Set(
    apuracoes.map((item) => chaveDataReferenciaUtc(item.dataReferencia)),
  );

  for (const solicitacao of solicitacoes) {
    const chave = chaveDataSolicitacao(solicitacao);

    if (!datasDaCompetencia.has(chave)) {
      continue;
    }

    const lista = solicitacoesPorData.get(chave) ?? [];
    lista.push(solicitacao);
    solicitacoesPorData.set(chave, lista);
  }

  for (const solicitacao of solicitacoes) {
    const dataReferencia = dataPrincipalSolicitacao(solicitacao);
    const data = chaveDataReferenciaUtc(dataReferencia);

    if (!datasDaCompetencia.has(data)) {
      continue;
    }

    const dia = formatarNomeDiaSemanaReferenciaUtc(dataReferencia);
    const tipo = tipoOcorrenciaDaSolicitacao(solicitacao);

    diasComOcorrência.add(data);
    linhas.push({
      id: `solicitacao-${solicitacao.id}`,
      dataReferencia,
      dia,
      ...tipo,
      duracaoMinutos: minutosSolicitacao(solicitacao),
      situacao: statusOcorrenciaDaSolicitacao(solicitacao.status),
      justificativa: solicitacao.descricao || solicitacao.titulo,
      origem: `Solicitação ${formatarNumeroSolicitacao(solicitacao.id)}`,
      observacoes:
        solicitacao.justificativaAnalise ??
        `Solicitação ${rotuloSolicitacaoEspelho(solicitacao.tipo)} vinculada ao espelho.`,
      solicitacaoId: solicitacao.id,
      solicitacaoNumero: formatarNumeroSolicitacao(solicitacao.id),
      solicitacaoStatus: solicitacao.status,
      hrefEditar: solicitacaoPodeSerEditadaNoEspelho(solicitacao.status)
        ? `/solicitacoes/${solicitacao.id}/editar`
        : undefined,
      podeExcluir: solicitacao.status === "ENVIADA",
    });
  }

  for (const item of apuracoes) {
    const data = chaveDataReferenciaUtc(item.dataReferencia);
    const dia = formatarNomeDiaSemanaReferenciaUtc(item.dataReferencia);
    const solicitacoesDia = solicitacoesPorData.get(data) ?? [];
    const registrar = (
      ocorrencia: Omit<OcorrenciaVisualizacao, "dataReferencia" | "dia">,
    ) => {
      diasComOcorrência.add(data);
      linhas.push({
        ...ocorrencia,
        dataReferencia: item.dataReferencia,
        dia,
      });
    };

    if ((item.minutosHoraExtraNaoAutorizada ?? 0) > 0) {
      const solicitacaoRelacionada = solicitacoesDia.find(
        (solicitacao) => solicitacao.tipo === "HORA_CREDITO_PREVIA",
      );

      registrar({
        id: `${item.id}-hora-extra`,
        tipo: "hora-extra",
        tipoLabel: "Hora extra",
        periodo: "Após jornada",
        duracaoMinutos: item.minutosHoraExtraNaoAutorizada ?? 0,
        situacao: solicitacaoRelacionada
          ? statusOcorrenciaDaSolicitacao(solicitacaoRelacionada.status)
          : "Não autorizada",
        justificativa:
          solicitacaoRelacionada?.descricao ??
          "Hora extra registrada fora de autorização prévia.",
        origem: solicitacaoRelacionada
          ? `Solicitação ${formatarNumeroSolicitacao(solicitacaoRelacionada.id)}`
          : "Marcação automática",
        observacoes: solicitacaoRelacionada
          ? "Há solicitação relacionada para deliberação."
          : "Pode solicitar autorização para análise e eventual composição do banco de horas.",
        solicitacaoId: solicitacaoRelacionada?.id,
        solicitacaoNumero: solicitacaoRelacionada
          ? formatarNumeroSolicitacao(solicitacaoRelacionada.id)
          : undefined,
        solicitacaoStatus: solicitacaoRelacionada?.status,
        hrefEditar: solicitacaoRelacionada
          ? solicitacaoPodeSerEditadaNoEspelho(solicitacaoRelacionada.status)
            ? `/solicitacoes/${solicitacaoRelacionada.id}/editar`
            : undefined
          : undefined,
        hrefSolicitar: solicitacaoRelacionada
          ? undefined
          : hrefNovaSolicitacao({
              tipo: "HORA_CREDITO_PREVIA",
              dataReferencia: item.dataReferencia,
              duracaoMinutos: item.minutosHoraExtraNaoAutorizada ?? 0,
            }),
        podeExcluir: solicitacaoRelacionada?.status === "ENVIADA",
      });
    }

    if (item.minutosDebito > 0) {
      const falta =
        item.cargaPrevistaMinutos > 0 &&
        item.minutosTrabalhados === 0 &&
        item.minutosDebito >= item.cargaPrevistaMinutos;
      const faltaParcial = !falta && item.minutosTrabalhados > 0;
      const tipoLabel = falta
        ? "Falta dia inteiro"
        : faltaParcial
          ? "Falta parcial"
          : "Atraso";
      const solicitacaoRelacionada = solicitacoesDia.find((solicitacao) =>
        ["ABONO_JUSTIFICATIVA", "AJUSTE_PONTO", "COMPENSACAO"].includes(
          solicitacao.tipo,
        ),
      );

      registrar({
        id: `${item.id}-${
          falta ? "falta" : faltaParcial ? "falta-parcial" : "atraso"
        }`,
        tipo: falta ? "falta" : "atraso",
        tipoLabel,
        periodo: falta
          ? "Dia inteiro"
          : faltaParcial
            ? "Durante jornada"
            : "Entrada",
        duracaoMinutos: item.minutosDebito,
        situacao: solicitacaoRelacionada
          ? statusOcorrenciaDaSolicitacao(solicitacaoRelacionada.status)
          : "Computado",
        justificativa:
          solicitacaoRelacionada?.descricao ??
          (falta
            ? "Ausência integral computada no espelho."
            : faltaParcial
              ? "Débito parcial computado no espelho."
              : "Atraso computado na apuração."),
        origem: solicitacaoRelacionada
          ? `Solicitação ${formatarNumeroSolicitacao(solicitacaoRelacionada.id)}`
          : "Apuração automática",
        observacoes: solicitacaoRelacionada
          ? "Há solicitação relacionada para deliberação."
          : "Pode criar uma solicitação para justificar ou ajustar esta ocorrência.",
        solicitacaoId: solicitacaoRelacionada?.id,
        solicitacaoNumero: solicitacaoRelacionada
          ? formatarNumeroSolicitacao(solicitacaoRelacionada.id)
          : undefined,
        solicitacaoStatus: solicitacaoRelacionada?.status,
        hrefEditar: solicitacaoRelacionada
          ? solicitacaoPodeSerEditadaNoEspelho(solicitacaoRelacionada.status)
            ? `/solicitacoes/${solicitacaoRelacionada.id}/editar`
            : undefined
          : undefined,
        hrefSolicitar: solicitacaoRelacionada
          ? undefined
          : hrefNovaSolicitacao({
              tipo: falta ? "ABONO_JUSTIFICATIVA" : "AJUSTE_PONTO",
              dataReferencia: item.dataReferencia,
              duracaoMinutos: item.minutosDebito,
            }),
        podeExcluir: solicitacaoRelacionada?.status === "ENVIADA",
      });
    }

    for (const ocorrencia of item.ocorrencias ?? []) {
      const tipo = tipoOcorrenciaNormalizado(ocorrencia.tipo);

      if (["CREDITO", "DEBITO", "HORA_NAO_AUTORIZADA"].includes(tipo)) {
        continue;
      }

      registrar({
        id: ocorrencia.id ?? `${item.id}-${tipo}-${linhas.length}`,
        tipo: tipo === "AFASTAMENTO" ? "falta" : "outra",
        tipoLabel:
          tipo === "AFASTAMENTO"
            ? "Falta"
            : ocorrencia.descricao || ocorrencia.tipo.replaceAll("_", " "),
        periodo: tipo === "AFASTAMENTO" ? "Dia inteiro" : "Durante jornada",
        duracaoMinutos: Math.max(0, ocorrencia.minutos ?? 0),
        situacao: tipo === "AFASTAMENTO" ? "Justificada" : "Em análise",
        justificativa: ocorrencia.descricao || "Ocorrência registrada.",
        origem: "Registro administrativo",
        observacoes: "Ocorrência vinculada ao dia da competência.",
      });
    }
  }

  return {
    linhas,
    semOcorrências: Math.max(0, apuracoes.length - diasComOcorrência.size),
    horasExtras: linhas.filter((item) => item.tipo === "hora-extra").length,
    atrasos: linhas.filter((item) => item.tipo === "atraso").length,
    saidas: linhas.filter((item) => item.tipo === "saida").length,
    faltas: linhas.filter((item) => item.tipo === "falta").length,
    outras: linhas.filter((item) => item.tipo === "outra").length,
  };
}

function montarTiposHoraResumo({
  apuracoes,
  totais,
  resumoFuncional,
}: {
  apuracoes: ApuracaoMensalItem[];
  totais: {
    previsto: number;
    trabalhado: number;
    credito: number;
    debito: number;
    horaExtraAutorizada: number;
    horaExtraNaoAutorizada: number;
    bancoHoras: number;
  };
  resumoFuncional: ResumoEspelhoMensal;
}): TipoHoraResumo[] {
  const base = Math.max(totais.previsto, 1);

  return [
    {
      id: "jornada-regular",
      label: "Jornada regular",
      quantidade: contarDiasCom(apuracoes, (item) => item.minutosTrabalhados),
      minutos: totais.trabalhado,
      percentual: percentualDoPrevisto(totais.trabalhado, base),
      color: "bg-blue-700",
      observacao: "-",
      observacaoTone: "neutral",
    },
    {
      id: "horas-extras-autorizadas",
      label: "Horas extras autorizadas",
      quantidade: contarDiasCom(
        apuracoes,
        (item) => item.minutosHoraExtraAutorizada ?? 0,
      ),
      minutos: totais.horaExtraAutorizada,
      percentual: percentualDoPrevisto(totais.horaExtraAutorizada, base),
      color: "bg-amber-400",
      observacao:
        totais.horaExtraAutorizada > 0
          ? `+${minutosParaTexto(totais.horaExtraAutorizada)}`
          : "-",
      observacaoTone: totais.horaExtraAutorizada > 0 ? "green" : "neutral",
    },
    {
      id: "banco-horas",
      label: "Banco de horas",
      quantidade: contarDiasCom(
        apuracoes,
        (item) => item.minutosBancoHoras ?? 0,
      ),
      minutos: Math.abs(totais.bancoHoras),
      percentual: percentualDoPrevisto(Math.abs(totais.bancoHoras), base),
      color: "bg-violet-500",
      observacao:
        totais.bancoHoras !== 0
          ? `Saldo atual: ${formatarSaldoBancoHoras(totais.bancoHoras)}`
          : "-",
      observacaoTone: totais.bancoHoras >= 0 ? "green" : "red",
    },
    {
      id: "horas-extras-nao-autorizadas",
      label: "Horas extras não autorizadas",
      quantidade: contarDiasCom(
        apuracoes,
        (item) => item.minutosHoraExtraNaoAutorizada ?? 0,
      ),
      minutos: totais.horaExtraNaoAutorizada,
      percentual: percentualDoPrevisto(totais.horaExtraNaoAutorizada, base),
      color: "bg-orange-500",
      observacao:
        totais.horaExtraNaoAutorizada > 0 ? "Aguardando autorização" : "-",
      observacaoTone: totais.horaExtraNaoAutorizada > 0 ? "amber" : "neutral",
    },
    {
      id: "credito",
      label: "Crédito",
      quantidade: contarDiasCom(apuracoes, minutosCreditoExibivel),
      minutos: totais.credito,
      percentual: percentualDoPrevisto(totais.credito, base),
      color: "bg-emerald-500",
      observacao:
        totais.credito > 0 ? `+${minutosParaTexto(totais.credito)}` : "-",
      observacaoTone: totais.credito > 0 ? "green" : "neutral",
    },
    {
      id: "debito",
      label: "Débito",
      quantidade: contarDiasCom(apuracoes, (item) => item.minutosDebito),
      minutos: totais.debito,
      percentual: percentualDoPrevisto(totais.debito, base),
      color: "bg-red-500",
      observacao:
        totais.debito > 0 ? `-${minutosParaTexto(totais.debito)}` : "-",
      observacaoTone: totais.debito > 0 ? "red" : "neutral",
    },
    {
      id: "ausencias",
      label: "Ausências",
      quantidade: resumoFuncional.ausencias,
      minutos: resumoFuncional.minutosAusencia,
      percentual: percentualDoPrevisto(resumoFuncional.minutosAusencia, base),
      color: "bg-slate-400",
      observacao: "-",
      observacaoTone: "neutral",
    },
    {
      id: "atividades-externas",
      label: "Atividades externas",
      quantidade: resumoFuncional.atividadesExternas,
      minutos: resumoFuncional.minutosAtividadeExterna,
      percentual: percentualDoPrevisto(
        resumoFuncional.minutosAtividadeExterna,
        base,
      ),
      color: "bg-sky-500",
      observacao: "-",
      observacaoTone: "neutral",
    },
    {
      id: "viagens",
      label: "Viagens",
      quantidade: resumoFuncional.viagensServico,
      minutos: resumoFuncional.minutosViagemServico,
      percentual: percentualDoPrevisto(
        resumoFuncional.minutosViagemServico,
        base,
      ),
      color: "bg-purple-400",
      observacao: "-",
      observacaoTone: "neutral",
    },
  ];
}

function contarSolicitacoesPorTipo(
  apuracoes: ApuracaoMensalItem[],
  tipo: string,
) {
  return apuracoes.reduce((total, item) => {
    const solicitacoes = classificarDiaEspelho(item).solicitacoesAplicadas;

    return (
      total +
      solicitacoes.filter((solicitacao) => solicitacao.tipo === tipo).length
    );
  }, 0);
}

export function EspelhoPontoMensal({
  apuracoes,
  marcacoes,
  solicitacoes,
  acoesBancoHoras,
  acaoHomologacao,
  destaque,
  homologacaoCompetencia,
  modoCompactoPessoaExterna = false,
  periodoLabel,
}: {
  apuracoes: ApuracaoMensalItem[];
  marcacoes: MarcacaoItem[];
  solicitacoes?: SolicitacaoEspelho[];
  controles?: ReactNode;
  destaque?: {
    dataReferencia?: string | null;
    ocorrenciaId?: string | null;
  };
  modoCompactoPessoaExterna?: boolean;
  acoesBancoHoras?: {
    habilitadas: boolean;
    bancoHorasAtivo?: boolean;
    servidorId: string;
    anoReferencia: number;
    mesReferencia: number;
  };
  acaoHomologacao?: ReactNode;
  homologacaoCompetencia?: HomologacaoCompetenciaEspelho | null;
  periodoLabel?: string;
}) {
  const marcacoesPorDia = agruparMarcacoesPorDia(marcacoes);
  const quantidadeColunasMarcações = calcularQuantidadeColunasMarcações(
    apuracoes,
    marcacoesPorDia,
  );
  const rotulosColunasMarcações = rotulosColunasTempo(
    quantidadeColunasMarcações,
  );

  const totais = apuracoes.reduce(
    (acc, item) => {
      acc.previsto += item.cargaPrevistaMinutos;

      if (item.contabilizarSaldos !== false) {
        acc.trabalhado += item.minutosTrabalhados;
        acc.credito += minutosCreditoExibivel(item);
        acc.debito += item.minutosDebito;
        acc.horaExtraAutorizada += item.minutosHoraExtraAutorizada ?? 0;
        acc.horaExtraNaoAutorizada += item.minutosHoraExtraNaoAutorizada ?? 0;
        acc.bancoHoras += item.minutosBancoHoras ?? 0;
      }

      return acc;
    },
    {
      previsto: 0,
      trabalhado: 0,
      credito: 0,
      debito: 0,
      horaExtraAutorizada: 0,
      horaExtraNaoAutorizada: 0,
      bancoHoras: 0,
    },
  );
  const apuracoesContabilizadas = apuracoes.filter(
    (item) => item.contabilizarSaldos !== false,
  );
  const resumoFuncional = resumirEspelhoMensal(apuracoesContabilizadas);
  const percentualJornada =
    totais.previsto > 0
      ? Math.min(100, Math.round((totais.trabalhado / totais.previsto) * 100))
      : 0;
  const diferencaJornada = totais.trabalhado - totais.previsto;
  const minutosFaltantes = Math.max(0, totais.previsto - totais.trabalhado);
  const totalRegistros = apuracoes.length;
  const detalheJornadaPrevista = montarDetalheJornadaPrevista(apuracoes);
  const tiposHora = montarTiposHoraResumo({
    apuracoes: apuracoesContabilizadas,
    totais,
    resumoFuncional,
  });
  const totalRegistrosTipos = tiposHora.length;
  const quantidadeAjustes =
    tiposHora.find((item) => item.id === "credito")?.quantidade ?? 0;
  const quantidadeAusências = resumoFuncional.ausencias;
  const quantidadeCompensacoes = contarSolicitacoesPorTipo(
    apuracoesContabilizadas,
    "COMPENSACAO",
  );
  const visualizacaoOcorrencias = montarVisualizacaoOcorrencias(
    apuracoesContabilizadas,
    solicitacoes ?? [],
  );
  const semanasSelecionaveis = montarSemanasSelecionaveis(
    apuracoesContabilizadas,
  );
  const indiceSemanaInicial = indiceSemanaReferencia(semanasSelecionaveis);
  const semanaSelecionada =
    semanasSelecionaveis[indiceSemanaInicial] ?? semanasSelecionaveis[0] ?? [];
  const totaisSemana = somarTotaisApuracao(semanaSelecionada);
  const percentualJornadaSemana =
    totaisSemana.previsto > 0
      ? Math.min(
          100,
          Math.round((totaisSemana.trabalhado / totaisSemana.previsto) * 100),
        )
      : 0;
  const podeSolicitarAjuste = permiteAcoesAjusteEspelho(homologacaoCompetencia);

  return (
    <section className="space-y-1.5 text-[var(--card-foreground)]">
      <div className="hidden">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            Visão consolidada da competência
          </p>
          <h2 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-slate-50">
            Espelho de ponto
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Consolidação preliminar das apurações diárias calculadas.
          </p>
        </div>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Resumo
          label="Previsto"
          value={minutosParaTexto(totais.previsto)}
          detalhe={detalheJornadaPrevista}
        />
        <Resumo
          label="Trabalhado"
          value={minutosParaTexto(totais.trabalhado)}
          detalhe={`${percentualJornada}% da jornada`}
          destaque="credito"
        />
        <Resumo
          label="Crédito"
          value={minutosParaTexto(totais.credito)}
          detalhe="Saldo positivo apurado"
          destaque="credito"
        />
        <Resumo
          label="Débito"
          value={minutosParaTexto(totais.debito)}
          detalhe="Horas em atraso"
          destaque="debito"
        />
        <Resumo
          label="Horas extras"
          value={minutosParaTexto(
            totais.horaExtraAutorizada + totais.horaExtraNaoAutorizada,
          )}
          detalhe={`${minutosParaTexto(totais.horaExtraAutorizada)} autorizadas · ${minutosParaTexto(
            totais.horaExtraNaoAutorizada,
          )} nao autorizadas`}
          destaque="credito"
        />
        <Resumo
          label="Hora extra não autorizada"
          value={minutosParaTexto(totais.horaExtraNaoAutorizada)}
          destaque={totais.horaExtraNaoAutorizada > 0 ? "debito" : undefined}
        />
        <Resumo
          label="Banco de horas"
          value={formatarSaldoBancoHoras(totais.bancoHoras)}
          destaque={
            totais.bancoHoras > 0
              ? "credito"
              : totais.bancoHoras < 0
                ? "debito"
                : undefined
          }
        />
        <Resumo
          label="Ausências"
          value={String(resumoFuncional.ausencias)}
          detalhe={minutosParaTexto(resumoFuncional.minutosAusencia)}
          destaque={resumoFuncional.ausencias > 0 ? "debito" : undefined}
        />
        <Resumo
          label="Ativ. externas"
          value={String(resumoFuncional.atividadesExternas)}
          detalhe={minutosParaTexto(resumoFuncional.minutosAtividadeExterna)}
          destaque={
            resumoFuncional.atividadesExternas > 0 ? "neutro" : undefined
          }
        />
      </div>

      <CardSituacaoCompetencia
        acaoHomologacao={acaoHomologacao}
        homologacao={homologacaoCompetencia}
        periodoLabel={periodoLabel}
      />

      <div id="espelho-painel-dias" className="grid gap-1.5 xl:grid-cols-2">
        <Card className="p-2.5">
          <div className="mb-1.5">
            <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">
              Distribuição da jornada
            </h3>
            <p className="text-xs text-slate-500">
              Visualização rápida do saldo da competência.
              <span className="ml-3 inline-flex flex-wrap items-center gap-2 align-middle">
                <LegendaCompacta color="bg-blue-700" label="Trabalhadas" />
                <LegendaCompacta color="bg-amber-400" label="Horas extras" />
                <LegendaCompacta color="bg-slate-300" label="Faltantes" />
              </span>
            </p>
          </div>
          <StackedBar
            items={[
              {
                label: "Trabalhadas",
                minutes: totais.trabalhado,
                className: "bg-blue-700",
              },
              {
                label: "Horas extras",
                minutes:
                  totais.horaExtraAutorizada + totais.horaExtraNaoAutorizada,
                className: "bg-amber-400",
              },
              {
                label: "Faltantes",
                minutes: minutosFaltantes,
                className: "bg-slate-200 dark:bg-slate-700",
              },
            ]}
            total={Math.max(totais.previsto, totais.trabalhado)}
            mostrarLegenda={false}
          />
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-1.5 text-xs md:grid-cols-4 dark:border-slate-800">
            <ResumoInline
              label="Total previsto"
              value={minutosParaTexto(totais.previsto)}
              tone="blue"
            />
            <ResumoInline
              label="Total trabalhado"
              value={minutosParaTexto(totais.trabalhado)}
              tone="blue"
            />
            <ResumoInline
              label="Horas extras"
              value={minutosParaTexto(
                totais.horaExtraAutorizada + totais.horaExtraNaoAutorizada,
              )}
              tone="amber"
            />
            <ResumoInline
              label="Diferença"
              value={formatarSaldoBancoHoras(diferencaJornada)}
              tone={diferencaJornada < 0 ? "red" : "green"}
            />
          </div>
        </Card>

        <Card className="p-2.5">
          <div className="mb-1">
            <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">
              Radar da competência
            </h3>
            <p className="text-xs text-slate-500">
              Principais indicadores do mês.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RadialScore value={percentualJornada} />
            <div className="grid flex-1 gap-1 text-xs">
              <LegendLine
                color="bg-emerald-500"
                label="Trabalhado"
                value={minutosParaTexto(totais.trabalhado)}
              />
              <LegendLine
                color="bg-amber-400"
                label="Horas extras"
                value={minutosParaTexto(
                  totais.horaExtraAutorizada + totais.horaExtraNaoAutorizada,
                )}
              />
              <LegendLine
                color="bg-slate-300"
                label="Faltantes"
                value={minutosParaTexto(minutosFaltantes)}
              />
            </div>
          </div>
        </Card>

        <Card
          hidden
          className="border-emerald-100 bg-emerald-50/70 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/20"
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
            <div className="flex gap-2">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-100">
                  Situação da competência
                </p>
                <h3 className="text-lg font-bold leading-tight text-emerald-700 dark:text-emerald-300">
                  Em andamento
                </h3>
                {periodoLabel ? (
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                    Período: {periodoLabel}
                  </p>
                ) : null}
                <div className="mt-1.5">
                  {acaoHomologacao ?? (
                    <button
                      type="button"
                      className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-[11px] font-bold text-white shadow-sm"
                    >
                      <Send className="size-3.5" aria-hidden="true" />
                      Enviar para homologação
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="rounded-md bg-white/60 p-2 text-xs leading-4 text-emerald-950/80 dark:bg-emerald-950/20 dark:text-emerald-100/80">
              Revise o espelho antes de enviar para homologação. Após o envio,
              ajustes que alterem a competência podem ficar restritos.
            </p>
          </div>
        </Card>
      </div>

      {modoCompactoPessoaExterna ? (
        <EspelhoPontoMensalCompacto
          apuracoes={apuracoes}
          marcacoes={marcacoes}
          destaque={destaque}
        />
      ) : (
        <Card className="overflow-hidden">
          <EspelhoPontoTabelaInterativa
            totalRegistros={totalRegistros}
            semanas={semanasSelecionaveis.map((semana) => {
              const totaisDaSemana = somarTotaisApuracao(semana);
              const percentualDaSemana =
                totaisDaSemana.previsto > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (totaisDaSemana.trabalhado / totaisDaSemana.previsto) *
                          100,
                      ),
                    )
                  : 0;

              return {
                label: labelPeriodoSemana(semana),
                totalRegistros: semana.length,
                painel: (
                  <PainelSemana
                    apuracoes={semana}
                    totais={totaisDaSemana}
                    percentualJornada={percentualDaSemana}
                  />
                ),
                conteudo: (
                  <TabelaSemana
                    apuracoes={semana}
                    marcacoesPorDia={marcacoesPorDia}
                    quantidadeColunasMarcações={quantidadeColunasMarcações}
                    rotulosColunasMarcações={rotulosColunasMarcações}
                    destaque={destaque}
                    podeSolicitarAjuste={podeSolicitarAjuste}
                  />
                ),
              };
            })}
            semanaInicial={indiceSemanaInicial}
            painelSemana={
              <PainelSemana
                apuracoes={semanaSelecionada}
                totais={totaisSemana}
                percentualJornada={percentualJornadaSemana}
              />
            }
            painelTotais={
              <PainelTotaisPorTipo
                tipos={tiposHora}
                totalPrevisto={totais.previsto}
                ajustes={quantidadeAjustes}
                justificativas={0}
                ausencias={quantidadeAusências}
                compensacoes={quantidadeCompensacoes}
              />
            }
            painelOcorrencias={
              <PainelOcorrencias resumo={visualizacaoOcorrencias} />
            }
            totaisPorTipo={<TabelaTotaisPorTipo tipos={tiposHora} />}
            ocorrencias={
              <EspelhoPontoOcorrenciasInterativa
                ocorrencias={visualizacaoOcorrencias.linhas}
              />
            }
            historicoAjustes={
              <EspelhoPontoHistoricoAjustesInterativo
                solicitacoes={solicitacoes ?? []}
              />
            }
            semana={
              <TabelaSemana
                apuracoes={semanaSelecionada}
                marcacoesPorDia={marcacoesPorDia}
                quantidadeColunasMarcações={quantidadeColunasMarcações}
                rotulosColunasMarcações={rotulosColunasMarcações}
                destaque={destaque}
                podeSolicitarAjuste={podeSolicitarAjuste}
              />
            }
            totalRegistrosSemana={semanaSelecionada.length}
            totalRegistrosTotais={totalRegistrosTipos}
            totalRegistrosOcorrencias={visualizacaoOcorrencias.linhas.length}
            totalRegistrosHistorico={(solicitacoes ?? []).length}
          >
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[1120px] table-fixed border-separate border-spacing-0 text-left text-[11px] xl:min-w-0 xl:text-[11px]">
                <colgroup>
                  <col className="w-8" />
                  <col className="w-[5.25rem]" />
                  <col className="w-[4.75rem]" />
                  {rotulosColunasMarcações.map((rotulo) => (
                    <col key={`col-${rotulo}`} className="w-[4.25rem]" />
                  ))}
                  <col className="w-[4.25rem]" />
                  <col className="w-[5rem]" />
                  <col className="w-[4rem]" />
                  <col className="w-[4rem]" />
                  <col className="w-[4rem]" />
                  <col className="w-[4rem]" />
                  <col className="w-[4.25rem]" />
                  <col className="w-[13rem]" />
                  <col className="w-8" />
                </colgroup>
                <thead className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] shadow-sm">
                  <tr className="bg-[var(--card)]">
                    <th
                      className="rounded-tl-xl border-b border-r px-1.5 py-2 text-center align-middle font-bold"
                      rowSpan={2}
                    >
                      Sit.
                    </th>
                    <th
                      className="whitespace-nowrap border-b border-r px-1.5 py-2 align-middle font-bold"
                      rowSpan={2}
                    >
                      DATA
                    </th>
                    <th
                      className="whitespace-nowrap border-b border-r px-1.5 py-2 align-middle font-bold"
                      rowSpan={2}
                    >
                      DIA DA SEMANA
                    </th>
                    <th
                      className="border-b border-l px-2 py-2 text-center"
                      colSpan={quantidadeColunasMarcações}
                    >
                      <span className="inline-flex rounded-full border bg-[var(--muted)] px-3 py-1 text-[10px] font-black tracking-wide text-foreground shadow-sm">
                        Marcações
                      </span>
                    </th>
                    <th
                      className="border-b border-l px-2 py-2 text-center"
                      colSpan={2}
                    >
                      <span className="inline-flex rounded-full border bg-[var(--muted)] px-3 py-1 text-[10px] font-black tracking-wide text-foreground shadow-sm">
                        Jornada
                      </span>
                    </th>
                    <th
                      className="border-b border-l px-2 py-2 text-center"
                      colSpan={3}
                    >
                      <span className="inline-flex rounded-full border bg-emerald-50 px-3 py-1 text-[10px] font-black tracking-wide text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                        Banco de Horas
                      </span>
                    </th>
                    <th
                      className="border-b border-l px-2 py-2 text-center"
                      colSpan={2}
                    >
                      <span className="inline-flex rounded-full border bg-amber-50 px-3 py-1 text-[10px] font-black tracking-wide text-amber-800 shadow-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                        Horas Extras
                      </span>
                    </th>
                    {false ? (
                      <th
                        className="rounded-tr-xl border-b border-l px-1.5 py-2 align-middle font-bold"
                        rowSpan={2}
                      >
                        Ação
                      </th>
                    ) : null}
                    <th
                      className="border-b border-l px-1.5 py-2 align-middle font-bold"
                      rowSpan={2}
                    >
                      Ocorrências
                    </th>
                    <th
                      className="rounded-tr-xl border-b border-l px-1.5 py-2 align-middle font-bold"
                      rowSpan={2}
                    >
                      <span className="sr-only">Acoes</span>
                    </th>
                  </tr>
                  <tr className="border-b bg-[var(--muted)]">
                    {rotulosColunasMarcações.map((rotulo) => (
                      <th
                        key={rotulo}
                        className="border-b px-1.5 py-2 font-bold text-foreground"
                      >
                        {rotulo}
                      </th>
                    ))}
                    <th className="whitespace-nowrap border-b border-l px-1.5 py-2 font-bold text-foreground">
                      Intervalo
                    </th>
                    <th className="whitespace-nowrap border-b px-1.5 py-2 font-bold text-foreground">
                      Trabalhado
                    </th>
                    <th className="whitespace-nowrap border-b border-l px-1.5 py-2 font-bold text-emerald-700 dark:text-emerald-300">
                      Crédito
                    </th>
                    <th className="whitespace-nowrap border-b px-1.5 py-2 font-bold text-red-700 dark:text-red-300">
                      Débito
                    </th>
                    <th className="whitespace-nowrap border-b px-1.5 py-2 font-bold text-foreground">
                      Saldo
                    </th>
                    <th className="whitespace-nowrap border-b border-l px-1.5 py-2 font-bold text-foreground">
                      Autorizadas
                    </th>
                    <th className="whitespace-nowrap border-b px-1.5 py-2 font-bold text-foreground">
                      Não autorizadas
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {apuracoes.map((item) => {
                    const chaveReferencia = chaveDataReferenciaUtc(
                      item.dataReferencia,
                    );
                    const marcaçõesDoDia =
                      marcacoesPorDia.get(chaveReferencia) ?? [];
                    const exigeIntervalo = extrairExigeIntervalo(
                      item.metadados,
                    );
                    const previsaoJornada = extrairPrevisaoJornadaDia(
                      item.metadados,
                    );
                    const horarios = distribuirMarcaçõesNasColunas(
                      marcaçõesDoDia,
                      exigeIntervalo,
                      quantidadeColunasMarcações,
                    );
                    const classificacao = classificarDiaEspelho(item);
                    const diaInstitucional = extrairDiaInstitucional(
                      item.metadados,
                    );
                    const solicitacoesAplicadas =
                      classificacao.solicitacoesAplicadas;
                    const justificativaAusênciaMesclada =
                      encontrarJustificativaAusênciaMesclada(
                        solicitacoesAplicadas,
                      );
                    const conferencia = conferenciaEspelho(item.status, item);
                    const possuiMarcacaoAjustada =
                      marcaçõesDoDia.some(marcacaoPossuiAjuste);
                    const afastamentoPrincipal = encontrarAfastamentoPrincipal(
                      item.ocorrencias,
                    );
                    const resumoAfastamento =
                      afastamentoPrincipal && marcaçõesDoDia.length === 0
                        ? resumirAfastamentoEspelho(
                            afastamentoPrincipal,
                            item.dataReferencia,
                          )
                        : null;
                    const textoResumoHorario = textoResumoHorarioPrevisto(
                      previsaoJornada,
                      marcaçõesDoDia.length,
                    );
                    const resumoMarcaçõesMescladas =
                      !resumoAfastamento &&
                      !textoResumoHorario &&
                      marcaçõesDoDia.length === 0
                        ? resumirMarcaçõesMescladas({
                            diaInstitucional,
                            previsaoJornada,
                            solicitacao: justificativaAusênciaMesclada,
                          })
                        : null;
                    const dicaSemaforo = montarDicaSemaforo({
                      item,
                      conferencia,
                      possuiMarcacaoAjustada,
                      solicitacoesAplicadas,
                    });
                    const diaDestacado = itemEhDestaque(item, destaque);
                    const idDia = `espelho-dia-${chaveReferencia}`;
                    const textoBuscaLinha = textoNormalizado(
                      [
                        formatarDataCompletaReferenciaUtc(item.dataReferencia),
                        formatarNomeDiaSemanaReferenciaUtc(item.dataReferencia),
                        ...horarios.map((horario) => horario?.valor ?? ""),
                        minutosParaTexto(item.minutosTrabalhados),
                        minutosParaTexto(item.minutosCredito),
                        minutosParaTexto(item.minutosDebito),
                        ...(item.ocorrencias ?? []).map(
                          (ocorrencia) =>
                            `${ocorrencia.tipo} ${ocorrencia.descricao}`,
                        ),
                        ...solicitacoesAplicadas.map(
                          (solicitacao) =>
                            `${solicitacao.tipo} ${solicitacao.titulo}`,
                        ),
                        diaInstitucional?.descricao ?? "",
                      ].join(" "),
                    );

                    return (
                      <tr
                        key={item.id}
                        id={idDia}
                        data-espelho-row
                        data-search={textoBuscaLinha}
                        className={classeLinhaEspelho(diaDestacado)}
                      >
                        <td className="px-1.5 py-0 text-center">
                          <IconeSemaforo
                            tom={conferencia.tom}
                            title={dicaSemaforo}
                            aria-label={dicaSemaforo}
                          />
                        </td>

                        <td className="whitespace-nowrap border-r px-1.5 py-0 font-medium">
                          {formatarDataCompletaReferenciaUtc(
                            item.dataReferencia,
                          )}
                        </td>

                        <td className="whitespace-nowrap border-r px-1.5 py-0 font-medium">
                          {formatarNomeDiaSemanaReferenciaUtc(
                            item.dataReferencia,
                          )}
                        </td>

                        {resumoAfastamento ? (
                          <td
                            colSpan={quantidadeColunasMarcações}
                            className="px-1.5 py-0 text-center text-[var(--muted-foreground)]"
                          >
                            -
                          </td>
                        ) : textoResumoHorario ? (
                          Array.from({
                            length: quantidadeColunasMarcações,
                          }).map((_, indice) => (
                            <td
                              key={`${item.id}-resumo-horario-${indice}`}
                              className="overflow-hidden px-1.5 py-0 text-center text-[var(--muted-foreground)]"
                            >
                              -
                            </td>
                          ))
                        ) : resumoMarcaçõesMescladas ? (
                          <td
                            colSpan={quantidadeColunasMarcações}
                            className="px-1.5 py-0 text-center text-[var(--muted-foreground)]"
                          >
                            -
                          </td>
                        ) : (
                          horarios.map((horario, indice) => (
                            <td
                              key={`${item.id}-horario-${indice}`}
                              className="whitespace-nowrap px-1.5 py-0 text-center font-mono"
                            >
                              {podeSolicitarAjuste ? (
                                <SolicitacaoAjusteDiaDropdown
                                  dataReferencia={chaveReferencia}
                                  className="px-0 font-mono hover:bg-transparent focus-visible:bg-transparent"
                                >
                                  {horario ? (
                                    <span
                                      className={`text-[10px] font-bold ${
                                        horario.ajustada
                                          ? "text-amber-800 dark:text-amber-300"
                                          : "text-blue-950 dark:text-slate-200"
                                      }`}
                                      title={horario.title}
                                    >
                                      {horario.valor}
                                      {horario.ajustada ? "*" : ""}
                                    </span>
                                  ) : (
                                    <span className="text-[var(--muted-foreground)]">
                                      -
                                    </span>
                                  )}
                                </SolicitacaoAjusteDiaDropdown>
                              ) : horario ? (
                                <span
                                  className={`text-[10px] font-bold ${
                                    horario.ajustada
                                      ? "text-amber-800 dark:text-amber-300"
                                      : "text-blue-950 dark:text-slate-200"
                                  }`}
                                  title={horario.title}
                                >
                                  {horario.valor}
                                  {horario.ajustada ? "*" : ""}
                                </span>
                              ) : (
                                <span className="text-[var(--muted-foreground)]">
                                  -
                                </span>
                              )}
                            </td>
                          ))
                        )}

                        <td className="whitespace-nowrap px-1.5 py-0 text-center">
                          {minutosParaTexto(item.minutosIntervalo ?? 0)}
                        </td>

                        <td className="whitespace-nowrap px-1.5 py-0 text-center">
                          {minutosParaTexto(item.minutosTrabalhados)}
                        </td>

                        <td className="whitespace-nowrap px-1.5 py-0 text-center">
                          <ValorTempo
                            tipo="credito"
                            minutos={minutosCreditoExibivel(item)}
                            estado={
                              (item.minutosHoraExtraNaoAutorizada ?? 0) > 0
                                ? "pendente"
                                : (item.minutosBancoHoras ?? 0) > 0
                                  ? "validado"
                                  : undefined
                            }
                            detalhe={
                              (item.minutosHoraExtraNaoAutorizada ?? 0) > 0
                                ? `Excedente apurado: ${minutosParaTexto(
                                    item.minutosCredito,
                                  )}. Hora extra não autorizada: ${minutosParaTexto(
                                    item.minutosHoraExtraNaoAutorizada ?? 0,
                                  )}.`
                                : (item.minutosBancoHoras ?? 0) > 0
                                  ? "Crédito computado no banco de horas."
                                  : undefined
                            }
                          />
                        </td>

                        <td className="whitespace-nowrap px-1.5 py-0 text-center">
                          <ValorTempo
                            tipo="debito"
                            minutos={item.minutosDebito}
                            detalhe={
                              item.minutosDebitoCompensado &&
                              item.minutosDebitoCompensado > 0
                                ? `Apurado: ${minutosParaTexto(
                                    item.minutosDebitoApurado ??
                                      item.minutosDebito,
                                  )}. Compensado: ${minutosParaTexto(
                                    item.minutosDebitoCompensado,
                                  )}.`
                                : undefined
                            }
                          />
                        </td>

                        <td className="whitespace-nowrap px-1.5 py-0 text-center">
                          <ValorSaldoBancoHoras
                            minutos={item.minutosBancoHoras ?? 0}
                          />
                        </td>

                        <td className="whitespace-nowrap px-1.5 py-0 text-center">
                          <ValorTempo
                            tipo="credito"
                            minutos={item.minutosHoraExtraAutorizada ?? 0}
                          />
                        </td>

                        <td className="whitespace-nowrap px-1.5 py-0 text-center">
                          <ValorTempo
                            tipo="debito"
                            minutos={item.minutosHoraExtraNaoAutorizada ?? 0}
                            detalhe={
                              (item.minutosHoraExtraNaoAutorizada ?? 0) > 0
                                ? "Horas excedentes sem autorização prévia. Não entram no banco de horas até autorização da chefia."
                                : undefined
                            }
                          />
                        </td>

                        <td className="overflow-hidden whitespace-nowrap px-2 py-0">
                          <OcorrênciaTabela
                            diaInstitucional={diaInstitucional}
                            ocorrencias={item.ocorrencias}
                            solicitacoes={solicitacoesAplicadas}
                            resumoAfastamento={resumoAfastamento}
                            resumoMarcações={resumoMarcaçõesMescladas}
                          />
                        </td>

                        <td className="px-1.5 py-0 text-right">
                          {acoesBancoHoras?.habilitadas &&
                          acoesBancoHoras.bancoHorasAtivo !== false &&
                          (item.minutosHoraExtraNaoAutorizada ?? 0) > 0 ? (
                            <AcoesBancoHorasDia
                              servidorId={acoesBancoHoras.servidorId}
                              anoReferencia={acoesBancoHoras.anoReferencia}
                              mesReferencia={acoesBancoHoras.mesReferencia}
                              dataReferencia={item.dataReferencia}
                              minutosNaoAutorizados={
                                item.minutosHoraExtraNaoAutorizada ?? 0
                              }
                            />
                          ) : podeSolicitarAjuste ? (
                            <SolicitacaoAjusteDiaDropdown
                              dataReferencia={chaveReferencia}
                              className="ml-auto size-8 px-0"
                            >
                              <MoreVertical
                                className="size-4"
                                aria-hidden="true"
                              />
                            </SolicitacaoAjusteDiaDropdown>
                          ) : (
                            <span className="block size-8" aria-hidden="true" />
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {apuracoes.length === 0 && (
                    <tr>
                      <td
                        colSpan={quantidadeColunasMarcações + 11}
                        className="px-5 py-8 text-center text-[var(--muted-foreground)]"
                      >
                        Nenhuma apuração calculada para o mês.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </EspelhoPontoTabelaInterativa>
        </Card>
      )}
    </section>
  );
}

function StackedBar({
  items,
  total,
  mostrarLegenda = true,
}: {
  items: { label: string; minutes: number; className: string }[];
  total: number;
  mostrarLegenda?: boolean;
}) {
  const base = Math.max(total, 1);

  return (
    <div>
      <div className="flex h-7 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        {items.map((item) => {
          const width = Math.max(0, (item.minutes / base) * 100);

          return (
            <div
              key={item.label}
              className={`${item.className} flex min-w-0 items-center justify-center text-[11px] font-bold text-white`}
              style={{ width: `${width}%` }}
              title={`${item.label}: ${minutosParaTexto(item.minutes)}`}
            >
              {width >= 12 ? minutosParaTexto(item.minutes) : null}
            </div>
          );
        })}
      </div>
      {mostrarLegenda ? (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
          {items.map((item) => (
            <LegendaCompacta
              key={item.label}
              color={item.className}
              label={item.label}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LegendaCompacta({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function rotuloStatusHomologacaoEspelho(status: string) {
  const rotulos: Record<string, string> = {
    PENDENTE: "Enviado para homologação",
    COM_PENDENCIAS: "Enviado com pendências",
    HOMOLOGADO: "Homologado",
    HOMOLOGADO_COM_RESSALVA: "Homologado com ressalva",
    DEVOLVIDO: "Devolvido pela chefia",
  };

  return rotulos[status] ?? status;
}

function formatarDataHoraSituacaoCompetencia(valor?: Date | string | null) {
  if (!valor) {
    return null;
  }

  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  }).format(data);
}

function tomSituacaoCompetencia(
  homologacao?: HomologacaoCompetenciaEspelho | null,
) {
  if (!homologacao) {
    return {
      card: "border-emerald-100 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20",
      icon: "bg-emerald-500 text-white",
      label: "text-emerald-950 dark:text-emerald-100",
      title: "text-emerald-700 dark:text-emerald-300",
      text: "text-emerald-800 dark:text-emerald-200",
      panel:
        "bg-white/60 text-emerald-950/80 dark:bg-emerald-950/20 dark:text-emerald-100/80",
      Icon: CheckCircle2,
    };
  }

  if (homologacao.status === "DEVOLVIDO") {
    return {
      card: "border-red-100 bg-red-50/70 dark:border-red-900 dark:bg-red-950/20",
      icon: "bg-red-500 text-white",
      label: "text-red-950 dark:text-red-100",
      title: "text-red-700 dark:text-red-300",
      text: "text-red-800 dark:text-red-200",
      panel:
        "bg-white/60 text-red-950/80 dark:bg-red-950/20 dark:text-red-100/80",
      Icon: AlertTriangle,
    };
  }

  if (["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(homologacao.status)) {
    return {
      card: "border-blue-100 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/20",
      icon: "bg-blue-600 text-white",
      label: "text-blue-950 dark:text-blue-100",
      title: "text-blue-700 dark:text-blue-300",
      text: "text-blue-800 dark:text-blue-200",
      panel:
        "bg-white/60 text-blue-950/80 dark:bg-blue-950/20 dark:text-blue-100/80",
      Icon: CheckCircle2,
    };
  }

  return {
    card: "border-amber-100 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20",
    icon: "bg-amber-500 text-white",
    label: "text-amber-950 dark:text-amber-100",
    title: "text-amber-700 dark:text-amber-300",
    text: "text-amber-800 dark:text-amber-200",
    panel:
      "bg-white/60 text-amber-950/80 dark:bg-amber-950/20 dark:text-amber-100/80",
    Icon: Send,
  };
}

function CardSituacaoCompetencia({
  acaoHomologacao,
  homologacao,
  periodoLabel,
}: {
  acaoHomologacao?: ReactNode;
  homologacao?: HomologacaoCompetenciaEspelho | null;
  periodoLabel?: string;
}) {
  const tom = tomSituacaoCompetencia(homologacao);
  const Icon = tom.Icon;
  const enviadoEm = formatarDataHoraSituacaoCompetencia(homologacao?.enviadoEm);
  const homologadoEm = formatarDataHoraSituacaoCompetencia(
    homologacao?.homologadoEm,
  );
  const titulo = homologacao
    ? rotuloStatusHomologacaoEspelho(homologacao.status)
    : "Em andamento";

  return (
    <Card className={`${tom.card} p-2.5`}>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
        <div className="flex gap-2">
          <span
            className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${tom.icon}`}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${tom.label}`}>
              Situação da competência
            </p>
            <h3 className={`text-lg font-bold leading-tight ${tom.title}`}>
              {titulo}
            </h3>
            {periodoLabel ? (
              <p className={`text-xs font-medium ${tom.text}`}>
                Período: {periodoLabel}
              </p>
            ) : null}
            {!homologacao ? (
              <div className="mt-1.5">
                {acaoHomologacao ?? (
                  <button
                    type="button"
                    className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-[11px] font-bold text-white shadow-sm"
                  >
                    <Send className="size-3.5" aria-hidden="true" />
                    Enviar para homologação
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
        <div className={`rounded-md p-2 text-xs leading-4 ${tom.panel}`}>
          {homologacao ? (
            <dl className="grid gap-1">
              {enviadoEm ? (
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold">Enviado em</dt>
                  <dd className="text-right">{enviadoEm}</dd>
                </div>
              ) : null}
              {homologacao.enviadoPor ? (
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold">Enviado por</dt>
                  <dd className="text-right">{homologacao.enviadoPor}</dd>
                </div>
              ) : null}
              {homologadoEm ? (
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold">Homologado em</dt>
                  <dd className="text-right">{homologadoEm}</dd>
                </div>
              ) : null}
              {homologacao.homologadoPor ? (
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold">Homologado por</dt>
                  <dd className="text-right">{homologacao.homologadoPor}</dd>
                </div>
              ) : null}
              {homologacao.unidadeSigla ? (
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold">Unidade</dt>
                  <dd className="text-right">{homologacao.unidadeSigla}</dd>
                </div>
              ) : null}
              {homologacao.chefiaResponsavel ? (
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold">Chefia</dt>
                  <dd className="text-right">{homologacao.chefiaResponsavel}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p>
              Revise o espelho antes de enviar para homologação. Após o envio,
              ajustes que alterem a competência podem ficar restritos.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

type TotaisApuracao = {
  previsto: number;
  trabalhado: number;
  credito: number;
  debito: number;
  horaExtraAutorizada: number;
  horaExtraNaoAutorizada: number;
  bancoHoras: number;
};

function somarTotaisApuracao(apuracoes: ApuracaoMensalItem[]): TotaisApuracao {
  return apuracoes.reduce<TotaisApuracao>(
    (acc, item) => {
      acc.previsto += item.cargaPrevistaMinutos;
      acc.trabalhado += item.minutosTrabalhados;
      acc.credito += minutosCreditoExibivel(item);
      acc.debito += item.minutosDebito;
      acc.horaExtraAutorizada += item.minutosHoraExtraAutorizada ?? 0;
      acc.horaExtraNaoAutorizada += item.minutosHoraExtraNaoAutorizada ?? 0;
      acc.bancoHoras += item.minutosBancoHoras ?? 0;
      return acc;
    },
    {
      previsto: 0,
      trabalhado: 0,
      credito: 0,
      debito: 0,
      horaExtraAutorizada: 0,
      horaExtraNaoAutorizada: 0,
      bancoHoras: 0,
    },
  );
}

function montarSemanasSelecionaveis(apuracoes: ApuracaoMensalItem[]) {
  const ordenadas = [...apuracoes].sort(
    (a, b) =>
      new Date(a.dataReferencia).getTime() -
      new Date(b.dataReferencia).getTime(),
  );
  const semanas: ApuracaoMensalItem[][] = [];

  for (let indice = 0; indice < ordenadas.length; indice += 7) {
    semanas.push(ordenadas.slice(indice, indice + 7));
  }

  return semanas;
}

function indiceSemanaReferencia(semanas: ApuracaoMensalItem[][]) {
  const hoje = chaveDataReferenciaUtc(new Date());
  const indice = semanas.findIndex((semana) =>
    semana.some((item) => chaveDataReferenciaUtc(item.dataReferencia) === hoje),
  );

  return indice >= 0 ? indice : 0;
}

function labelPeriodoSemana(apuracoes: ApuracaoMensalItem[]) {
  const primeira = apuracoes[0];
  const ultima = apuracoes[apuracoes.length - 1];

  if (!primeira || !ultima) {
    return "Semana sem dados";
  }

  return `${formatarDataCompletaReferenciaUtc(
    primeira.dataReferencia,
  )} a ${formatarDataCompletaReferenciaUtc(ultima.dataReferencia)}`;
}

function PainelSemana({
  apuracoes,
  totais,
  percentualJornada,
  acaoHomologacao,
}: {
  apuracoes: ApuracaoMensalItem[];
  totais: TotaisApuracao;
  percentualJornada: number;
  acaoHomologacao?: ReactNode;
}) {
  const dadosGraficoSemana = apuracoes.map((item) => ({
    dia: formatarNomeDiaSemanaReferenciaUtc(item.dataReferencia).slice(0, 3),
    data: formatarDataCompletaReferenciaUtc(item.dataReferencia).slice(0, 5),
    prevista: item.cargaPrevistaMinutos,
    trabalhada: item.minutosTrabalhados,
    extras:
      (item.minutosHoraExtraAutorizada ?? 0) +
      (item.minutosHoraExtraNaoAutorizada ?? 0),
    debito: item.minutosDebito,
  }));
  const ocorrencias = apuracoes.reduce(
    (acc, item) => {
      const classificacao = classificarDiaEspelho(item);
      const diaInstitucional = extrairDiaInstitucional(item.metadados);

      if (diaInstitucional && !diaInstitucional.geraApuraçãoRegular) {
        acc.feriados += 1;
      }

      acc.ajustes += classificacao.solicitacoesAplicadas.length;
      acc.justificativas += classificacao.solicitacoesAplicadas.filter(
        (solicitacao) => solicitacao.tipo === "ABONO_JUSTIFICATIVA",
      ).length;

      if (item.minutosDebito > 0) {
        acc.ausencias += 1;
      }

      return acc;
    },
    { feriados: 0, ajustes: 0, justificativas: 0, ausencias: 0 },
  );

  return (
    <div className="grid gap-2 border-b border-slate-100 p-2.5 xl:grid-cols-[1.35fr_0.78fr_0.72fr] dark:border-slate-800">
      <Card className="p-3">
        <div className="mb-3">
          <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">
            Resumo da semana
          </h3>
          <p className="text-xs text-slate-500">
            Comparativo entre a jornada prevista e as horas trabalhadas por dia.
          </p>
        </div>
        <EspelhoPontoSemanaChart data={dadosGraficoSemana} />
      </Card>

      <Card className="p-3">
        <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">
          Indicadores da semana
        </h3>
        <p className="text-xs text-slate-500">
          Principais indicadores do período.
        </p>
        <div className="mt-3 flex items-center gap-4">
          <RadialScore value={percentualJornada} />
          <div className="grid flex-1 gap-1 text-xs">
            <LegendLine
              color="bg-blue-700"
              label="Prevista"
              value={minutosParaTexto(totais.previsto)}
            />
            <LegendLine
              color="bg-emerald-500"
              label="Trabalhada"
              value={minutosParaTexto(totais.trabalhado)}
            />
            <LegendLine
              color="bg-amber-400"
              label="Horas extras"
              value={minutosParaTexto(
                totais.horaExtraAutorizada + totais.horaExtraNaoAutorizada,
              )}
            />
            <LegendLine
              color="bg-red-500"
              label="Débito"
              value={minutosParaTexto(totais.debito)}
            />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniIndicador
            icon={CalendarDays}
            label="Feriado"
            valor={ocorrencias.feriados}
          />
          <MiniIndicador
            icon={FileText}
            label="Ajustes"
            valor={ocorrencias.ajustes}
          />
          <MiniIndicador
            icon={AlertTriangle}
            label="Justificativas"
            valor={ocorrencias.justificativas}
          />
          <MiniIndicador
            icon={MinusCircle}
            label="Ausências"
            valor={ocorrencias.ausencias}
          />
        </div>
      </Card>

      <Card className="border-emerald-100 bg-emerald-50/80 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
              Situação da semana
            </p>
            <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              Em andamento
            </h3>
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
              Período de {labelPeriodoSemana(apuracoes)}
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-white/70 p-3 text-xs leading-5 text-emerald-950/80 dark:bg-emerald-950/30 dark:text-emerald-100/80">
          Revise o espelho antes de enviar para homologação. Após o envio, não
          será possível criar ajuste, justificativa ou compensação que altere
          esta semana.
        </p>
        <div className="hidden">
          {acaoHomologacao ?? (
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-xs font-black text-white shadow-sm"
            >
              <Send className="size-4" aria-hidden="true" />
              Assinar e enviar para homologação
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

function MiniIndicador({
  icon: Icon,
  label,
  valor,
}: {
  icon: LucideIcon;
  label: string;
  valor: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-700">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
        <p className="text-sm font-black text-slate-950 dark:text-slate-50">
          {valor}
        </p>
      </div>
    </div>
  );
}

function TabelaSemana({
  apuracoes,
  marcacoesPorDia,
  quantidadeColunasMarcações,
  rotulosColunasMarcações,
  destaque,
  podeSolicitarAjuste,
}: {
  apuracoes: ApuracaoMensalItem[];
  marcacoesPorDia: Map<string, MarcacaoItem[]>;
  quantidadeColunasMarcações: number;
  rotulosColunasMarcações: string[];
  destaque?: {
    dataReferencia?: string | null;
    ocorrenciaId?: string | null;
  };
  podeSolicitarAjuste: boolean;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[1120px] table-fixed border-separate border-spacing-0 text-left text-[11px] xl:min-w-0">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
          <tr>
            <th className="w-10 border-b px-2 py-2 text-center">Dia</th>
            <th className="w-28 border-b px-2 py-2">Data</th>
            {rotulosColunasMarcações.map((rotulo) => (
              <th key={rotulo} className="w-20 border-b px-2 py-2 text-center">
                {rotulo}
              </th>
            ))}
            <th className="w-20 border-b px-2 py-2 text-center">Prevista</th>
            <th className="w-24 border-b px-2 py-2 text-center">Trabalhada</th>
            <th className="w-20 border-b px-2 py-2 text-center text-emerald-700">
              Crédito
            </th>
            <th className="w-20 border-b px-2 py-2 text-center text-red-700">
              Débito
            </th>
            <th className="w-24 border-b px-2 py-2 text-center">Extras aut.</th>
            <th className="w-28 border-b px-2 py-2 text-center">
              Extras não aut.
            </th>
            <th className="w-24 border-b px-2 py-2 text-center">Saldo</th>
            <th className="w-44 border-b px-2 py-2">Ocorrências</th>
            <th className="w-9 border-b px-2 py-2">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {apuracoes.map((item) => {
            const chaveReferencia = chaveDataReferenciaUtc(item.dataReferencia);
            const marcaçõesDoDia = marcacoesPorDia.get(chaveReferencia) ?? [];
            const exigeIntervalo = extrairExigeIntervalo(item.metadados);
            const horarios = distribuirMarcaçõesNasColunas(
              marcaçõesDoDia,
              exigeIntervalo,
              quantidadeColunasMarcações,
            );
            const classificacao = classificarDiaEspelho(item);
            const diaInstitucional = extrairDiaInstitucional(item.metadados);
            const conferencia = conferenciaEspelho(item.status, item);
            const diaDestacado = itemEhDestaque(item, destaque);
            const textoBuscaLinha = textoNormalizado(
              [
                formatarDataCompletaReferenciaUtc(item.dataReferencia),
                formatarNomeDiaSemanaReferenciaUtc(item.dataReferencia),
                ...horarios.map((horario) => horario?.valor ?? ""),
                minutosParaTexto(item.cargaPrevistaMinutos),
                minutosParaTexto(item.minutosTrabalhados),
                minutosParaTexto(minutosCreditoExibivel(item)),
                minutosParaTexto(item.minutosDebito),
                ...(item.ocorrencias ?? []).map(
                  (ocorrencia) => `${ocorrencia.tipo} ${ocorrencia.descricao}`,
                ),
              ].join(" "),
            );

            return (
              <tr
                key={item.id}
                data-espelho-row
                data-search={textoBuscaLinha}
                className={classeLinhaEspelho(diaDestacado)}
              >
                <td className="border-b px-2 py-1 text-center">
                  <IconeSemaforo
                    tom={conferencia.tom}
                    title={conferencia.descricao}
                    aria-label={conferencia.rotulo}
                  />
                </td>
                <td className="border-b px-2 py-1">
                  <p className="font-bold">
                    {formatarNomeDiaSemanaReferenciaUtc(item.dataReferencia)}
                  </p>
                  <p className="text-slate-500">
                    {formatarDataCompletaReferenciaUtc(item.dataReferencia)}
                  </p>
                </td>
                {horarios.map((horario, indice) => (
                  <td
                    key={`${item.id}-semana-horario-${indice}`}
                    className="border-b px-2 py-1 text-center font-mono"
                  >
                    {horario ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-blue-950 dark:bg-slate-800 dark:text-slate-200">
                        {horario.valor}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                ))}
                <td className="border-b px-2 py-1 text-center">
                  {minutosParaTexto(item.cargaPrevistaMinutos)}
                </td>
                <td className="border-b px-2 py-1 text-center font-bold">
                  {minutosParaTexto(item.minutosTrabalhados)}
                </td>
                <td className="border-b px-2 py-1 text-center">
                  <ValorTempo
                    tipo="credito"
                    minutos={minutosCreditoExibivel(item)}
                  />
                </td>
                <td className="border-b px-2 py-1 text-center">
                  <ValorTempo tipo="debito" minutos={item.minutosDebito} />
                </td>
                <td className="border-b px-2 py-1 text-center">
                  <ValorTempo
                    tipo="credito"
                    minutos={item.minutosHoraExtraAutorizada ?? 0}
                  />
                </td>
                <td className="border-b px-2 py-1 text-center">
                  <ValorTempo
                    tipo="debito"
                    minutos={item.minutosHoraExtraNaoAutorizada ?? 0}
                  />
                </td>
                <td className="border-b px-2 py-1 text-center">
                  <ValorSaldoBancoHoras minutos={item.minutosBancoHoras ?? 0} />
                </td>
                <td className="border-b px-2 py-1">
                  <OcorrênciaTabela
                    diaInstitucional={diaInstitucional}
                    ocorrencias={item.ocorrencias}
                    solicitacoes={classificacao.solicitacoesAplicadas}
                  />
                </td>
                <td className="border-b px-2 py-1 text-right">
                  {podeSolicitarAjuste ? (
                    <SolicitacaoAjusteDiaDropdown
                      dataReferencia={chaveReferencia}
                      className="ml-auto size-8 px-0"
                    >
                      <MoreVertical className="size-4" aria-hidden="true" />
                    </SolicitacaoAjusteDiaDropdown>
                  ) : (
                    <span className="block size-8" aria-hidden="true" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PainelOcorrencias({
  resumo,
}: {
  resumo: OcorrenciasVisualizacaoResumo;
}) {
  const total = Math.max(resumo.linhas.length, 1);
  const cards = [
    {
      label: "Sem ocorrências",
      valor: resumo.semOcorrências,
      percentual: percentualDoPrevisto(resumo.semOcorrências, total),
      icon: CheckCircle2,
      className: "border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    {
      label: "Horas extras",
      valor: resumo.horasExtras,
      percentual: percentualDoPrevisto(resumo.horasExtras, total),
      icon: Zap,
      className: "border-amber-100 bg-amber-50 text-amber-700",
    },
    {
      label: "Atrasos",
      valor: resumo.atrasos,
      percentual: percentualDoPrevisto(resumo.atrasos, total),
      icon: Clock3,
      className: "border-red-100 bg-red-50 text-red-700",
    },
    {
      label: "Saidas antecipadas",
      valor: resumo.saidas,
      percentual: percentualDoPrevisto(resumo.saidas, total),
      icon: MinusCircle,
      className: "border-rose-100 bg-rose-50 text-rose-700",
    },
    {
      label: "Faltas",
      valor: resumo.faltas,
      percentual: percentualDoPrevisto(resumo.faltas, total),
      icon: CalendarDays,
      className: "border-blue-100 bg-blue-50 text-blue-700",
    },
    {
      label: "Outras ocorrências",
      valor: resumo.outras,
      percentual: percentualDoPrevisto(resumo.outras, total),
      icon: AlertTriangle,
      className: "border-violet-100 bg-violet-50 text-violet-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-2.5 md:grid-cols-3 xl:grid-cols-6 dark:border-slate-800">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className={`rounded-md border p-2 shadow-sm ${card.className}`}
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/70">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-black leading-none">{card.valor}</p>
                <p className="truncate text-[11px] font-semibold">
                  {card.label}
                </p>
              </div>
            </div>
            <p className="mt-1 text-center text-[10px] font-semibold">
              {formatarPercentual(card.percentual)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function corTipoOcorrencia(tipo: OcorrenciaVisualizacao["tipo"]) {
  if (tipo === "hora-extra") {
    return "bg-amber-50 text-orange-700";
  }

  if (tipo === "atraso") {
    return "bg-red-50 text-red-700";
  }

  if (tipo === "falta") {
    return "bg-blue-50 text-blue-700";
  }

  if (tipo === "saida") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-violet-50 text-violet-700";
}

function IconeTipoOcorrencia({
  tipo,
  className = "size-3.5",
}: {
  tipo: OcorrenciaVisualizacao["tipo"];
  className?: string;
}) {
  if (tipo === "hora-extra") {
    return <Zap className={className} aria-hidden="true" />;
  }

  if (tipo === "atraso") {
    return <Clock3 className={className} aria-hidden="true" />;
  }

  if (tipo === "falta") {
    return <CalendarDays className={className} aria-hidden="true" />;
  }

  if (tipo === "saida") {
    return <MinusCircle className={className} aria-hidden="true" />;
  }

  return <AlertTriangle className={className} aria-hidden="true" />;
}

function BadgeSituacaoOcorrencia({ situacao }: { situacao: string }) {
  const normalizada = tipoOcorrenciaNormalizado(situacao);
  const classe = normalizada.includes("NAO")
    ? "bg-red-50 text-red-700"
    : normalizada.includes("JUST")
      ? "bg-blue-50 text-blue-700"
      : normalizada.includes("ANALISE")
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${classe}`}
    >
      {situacao}
    </span>
  );
}

export function TabelaOcorrências({
  ocorrencias,
}: {
  ocorrencias: OcorrenciaVisualizacao[];
}) {
  const selecionada = ocorrencias[0] ?? null;

  return (
    <div className="grid min-h-[22rem] gap-0 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 overflow-x-auto">
        <div className="px-3 py-2">
          <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">
            Lista de ocorrências{" "}
            <span className="font-medium text-slate-500">
              ({ocorrencias.length} registros)
            </span>
          </h3>
        </div>
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 text-left text-[11px]">
          <colgroup>
            <col className="w-[6.5rem]" />
            <col className="w-[4rem]" />
            <col className="w-[8rem]" />
            <col className="w-[7rem]" />
            <col className="w-[5rem]" />
            <col className="w-[7rem]" />
            <col />
            <col className="w-[4rem]" />
          </colgroup>
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              <th className="border-b px-3 py-2 font-bold">Data</th>
              <th className="border-b px-3 py-2 font-bold">Dia</th>
              <th className="border-b px-3 py-2 font-bold">Tipo</th>
              <th className="border-b px-3 py-2 font-bold">Periodo</th>
              <th className="border-b px-3 py-2 font-bold">Duracao</th>
              <th className="border-b px-3 py-2 font-bold">Situacao</th>
              <th className="border-b px-3 py-2 font-bold">
                Justificativa / observacao
              </th>
              <th className="border-b px-3 py-2 text-right font-bold">Acao</th>
            </tr>
          </thead>
          <tbody>
            {ocorrencias.map((ocorrencia) => (
              <tr
                key={ocorrencia.id}
                data-espelho-row
                data-search={textoNormalizado(
                  [
                    formatarDataCompletaReferenciaUtc(
                      ocorrencia.dataReferencia,
                    ),
                    ocorrencia.dia,
                    ocorrencia.tipoLabel,
                    ocorrencia.periodo,
                    ocorrencia.situacao,
                    ocorrencia.justificativa,
                  ].join(" "),
                )}
                className="border-b odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-950 dark:even:bg-slate-900/40"
              >
                <td className="whitespace-nowrap px-3 py-1.5 font-medium">
                  {formatarDataCompletaReferenciaUtc(ocorrencia.dataReferencia)}
                </td>
                <td className="px-3 py-1.5">{ocorrencia.dia.slice(0, 3)}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${corTipoOcorrencia(
                      ocorrencia.tipo,
                    )}`}
                  >
                    <IconeTipoOcorrencia tipo={ocorrencia.tipo} />
                    {ocorrencia.tipoLabel}
                  </span>
                </td>
                <td className="px-3 py-1.5">{ocorrencia.periodo}</td>
                <td className="px-3 py-1.5 font-mono font-bold text-red-600">
                  {minutosParaTexto(ocorrencia.duracaoMinutos)}
                </td>
                <td className="px-3 py-1.5">
                  <BadgeSituacaoOcorrencia situacao={ocorrencia.situacao} />
                </td>
                <td className="truncate px-3 py-1.5">
                  {ocorrencia.justificativa}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 shadow-sm dark:border-slate-800 dark:text-slate-300"
                    aria-label="Ações da ocorrência"
                  >
                    <MoreVertical className="size-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {ocorrencias.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-8 text-center text-sm text-slate-500"
                >
                  Nenhuma ocorrência encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <aside className="border-l border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">
            Detalhes da ocorrência
          </h3>
          {selecionada ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${corTipoOcorrencia(
                selecionada.tipo,
              )}`}
            >
              <IconeTipoOcorrencia tipo={selecionada.tipo} />
              {selecionada.tipoLabel}
            </span>
          ) : null}
        </div>

        {selecionada ? (
          <div className="space-y-3 text-xs">
            <span
              className={`inline-flex size-11 items-center justify-center rounded-full ${corTipoOcorrencia(
                selecionada.tipo,
              )}`}
            >
              <IconeTipoOcorrencia tipo={selecionada.tipo} className="size-5" />
            </span>
            {[
              [
                "Data",
                `${formatarDataCompletaReferenciaUtc(selecionada.dataReferencia)} (${selecionada.dia})`,
              ],
              ["Periodo", selecionada.periodo],
              ["Duracao", minutosParaTexto(selecionada.duracaoMinutos)],
              ["Situacao", selecionada.situacao],
              ["Origem", selecionada.origem],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 border-b border-slate-100 pb-2 dark:border-slate-800"
              >
                <span className="font-semibold text-slate-500">{label}</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {value}
                </span>
              </div>
            ))}
            <div>
              <p className="mb-1 font-semibold text-slate-500">Justificativa</p>
              <p className="rounded-md bg-slate-50 p-2 leading-4 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {selecionada.justificativa}
              </p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-slate-500">Observacoes</p>
              <p className="leading-4 text-slate-700 dark:text-slate-200">
                {selecionada.observacoes}
              </p>
            </div>
            <div className="grid gap-2 pt-2">
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-md border border-blue-200 px-3 text-xs font-bold text-blue-700 dark:border-blue-900 dark:text-blue-300"
              >
                Editar
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-md bg-blue-700 px-3 text-xs font-bold text-white"
              >
                Solicitar autorização
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-bold text-red-700 dark:border-red-900 dark:text-red-300"
              >
                Excluir ocorrência
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Selecione uma ocorrência para visualizar os detalhes.
          </p>
        )}
      </aside>
    </div>
  );
}

function PainelTotaisPorTipo({
  tipos,
  totalPrevisto,
  ajustes,
  justificativas,
  ausencias,
  compensacoes,
}: {
  tipos: TipoHoraResumo[];
  totalPrevisto: number;
  ajustes: number;
  justificativas: number;
  ausencias: number;
  compensacoes: number;
}) {
  return (
    <div className="grid gap-1.5 border-b border-slate-100 p-2.5 xl:grid-cols-2 dark:border-slate-800">
      <Card className="p-2.5 shadow-none">
        <div className="mb-1.5">
          <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">
            Distribuição por tipo
          </h3>
          <p className="text-xs text-slate-500">
            Total de {minutosParaTexto(totalPrevisto)} no período selecionado
          </p>
        </div>
        <StackedBar
          items={tipos.map((tipo) => ({
            label: tipo.label,
            minutes: tipo.minutos,
            className: tipo.color,
          }))}
          total={Math.max(totalPrevisto, 1)}
          mostrarLegenda={false}
        />
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {tipos.map((tipo) => (
            <LegendLine
              key={tipo.id}
              color={tipo.color}
              label={tipo.label}
              value={minutosParaTexto(tipo.minutos)}
            />
          ))}
        </div>
      </Card>

      <Card className="p-2.5 shadow-none">
        <div className="mb-1.5">
          <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">
            Composição do período
          </h3>
          <p className="text-xs text-slate-500">
            Participação de cada tipo no total de horas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ComposicaoDonut tipos={tipos} totalPrevisto={totalPrevisto} />
          <div className="grid flex-1 gap-1 text-xs">
            {tipos.map((tipo) => (
              <LegendLine
                key={tipo.id}
                color={tipo.color}
                label={tipo.label}
                value={`${formatarPercentual(tipo.percentual)}`}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card
        hidden
        className="border-emerald-100 bg-emerald-50/70 p-2.5 shadow-none dark:border-emerald-900 dark:bg-emerald-950/20"
      >
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-100">
                Situação da competência
              </p>
              <h3 className="text-lg font-bold leading-tight text-emerald-700 dark:text-emerald-300">
                Em andamento
              </h3>
            </div>
          </div>
          <p className="rounded-md bg-white/60 p-2 text-xs leading-4 text-emerald-950/80 dark:bg-emerald-950/20 dark:text-emerald-100/80">
            Revise o espelho antes de enviar para homologação. Após o envio,
            ajustes que alterem a competência podem ficar restritos.
          </p>
          <button
            type="button"
            className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-[11px] font-bold text-white shadow-sm"
          >
            <Send className="size-3.5" aria-hidden="true" />
            Assinar e enviar para homologação
          </button>
        </div>
      </Card>

      <div className="xl:col-span-2">
        <div className="grid gap-1.5 md:grid-cols-4">
          <OcorrênciaTipoCard
            icon={FileText}
            label="Ajustes"
            value={ajustes}
            tone="blue"
          />
          <OcorrênciaTipoCard
            icon={AlertTriangle}
            label="Justificativas"
            value={justificativas}
            tone="amber"
          />
          <OcorrênciaTipoCard
            icon={MinusCircle}
            label="Ausências"
            value={ausencias}
            tone="red"
          />
          <OcorrênciaTipoCard
            icon={Repeat2}
            label="Compensações"
            value={compensacoes}
            tone="green"
          />
        </div>
      </div>
    </div>
  );
}

function ComposicaoDonut({
  tipos,
  totalPrevisto,
}: {
  tipos: TipoHoraResumo[];
  totalPrevisto: number;
}) {
  const segmentos = tipos
    .filter((tipo) => tipo.minutos > 0)
    .reduce(
      (acc, tipo) => {
        const inicio = acc.cursor;
        const tamanho = (tipo.minutos / Math.max(totalPrevisto, 1)) * 100;
        const fim = inicio + tamanho;

        return {
          cursor: fim,
          segmentos: [
            ...acc.segmentos,
            `${corHexTipo(tipo.color)} ${inicio}% ${fim}%`,
          ],
        };
      },
      { cursor: 0, segmentos: [] as string[] },
    ).segmentos;

  return (
    <div
      className="grid size-28 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${segmentos.join(", ") || "#e2e8f0 0 100%"})`,
      }}
    >
      <div className="grid size-[4.75rem] place-items-center rounded-full bg-white text-center shadow-inner dark:bg-slate-950">
        <div>
          <p className="text-lg font-black leading-none text-slate-950 dark:text-slate-50">
            {minutosParaTexto(totalPrevisto)}
          </p>
          <p className="mt-1 text-[10px] font-semibold leading-none text-slate-500">
            horas totais
          </p>
        </div>
      </div>
    </div>
  );
}

function OcorrênciaTipoCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "blue" | "amber" | "red" | "green";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
      : tone === "red"
        ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300"
        : tone === "green"
          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300";

  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <span
        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md ${toneClass}`}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-base font-black leading-none text-slate-950 dark:text-slate-50">
          {value}
        </p>
      </div>
    </div>
  );
}

function TabelaTotaisPorTipo({ tipos }: { tipos: TipoHoraResumo[] }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-0 text-left text-[11px] xl:min-w-0">
        <colgroup>
          <col className="w-[15rem]" />
          <col className="w-[9rem]" />
          <col className="w-[8rem]" />
          <col className="w-[18rem]" />
          <col className="w-[13rem]" />
        </colgroup>
        <thead className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] shadow-sm">
          <tr className="bg-[var(--muted)]">
            <th className="border-b px-3 py-2 font-bold">Tipo de hora</th>
            <th className="border-b px-3 py-2 text-center font-bold">
              Quantidade de registros
            </th>
            <th className="border-b px-3 py-2 text-center font-bold">
              Total de horas
            </th>
            <th className="border-b px-3 py-2 font-bold">Participação</th>
            <th className="border-b px-3 py-2 font-bold">Saldo / observação</th>
          </tr>
        </thead>
        <tbody>
          {tipos.map((tipo) => (
            <tr
              key={tipo.id}
              data-espelho-row
              data-search={textoNormalizado(
                `${tipo.label} ${tipo.observacao ?? ""} ${minutosParaTexto(
                  tipo.minutos,
                )}`,
              )}
              className="border-b last:border-b-0"
            >
              <td className="px-3 py-1.5">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                  <span className={`size-2.5 rounded-full ${tipo.color}`} />
                  {tipo.label}
                </span>
              </td>
              <td className="px-3 py-1.5 text-center font-bold text-slate-700 dark:text-slate-200">
                {tipo.quantidade}
              </td>
              <td className="px-3 py-1.5 text-center font-bold text-slate-950 dark:text-slate-50">
                {minutosParaTexto(tipo.minutos)}
              </td>
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <span
                      className={`block h-full rounded-full ${tipo.color}`}
                      style={{ width: `${Math.min(100, tipo.percentual)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-semibold text-slate-500">
                    {formatarPercentual(tipo.percentual)}
                  </span>
                </div>
              </td>
              <td className="px-3 py-1.5">
                <BadgeObservacaoTipo
                  label={tipo.observacao ?? "-"}
                  tone={tipo.observacaoTone ?? "neutral"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BadgeObservacaoTipo({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "amber" | "red" | "neutral";
}) {
  const classe =
    tone === "green"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : tone === "amber"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        : tone === "red"
          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
          : "text-slate-500";

  if (label === "-") {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${classe}`}
    >
      {label}
    </span>
  );
}

function formatarPercentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function corHexTipo(color: string) {
  const cores: Record<string, string> = {
    "bg-blue-700": "#1d4ed8",
    "bg-amber-400": "#fbbf24",
    "bg-violet-500": "#8b5cf6",
    "bg-orange-500": "#f97316",
    "bg-emerald-500": "#10b981",
    "bg-red-500": "#ef4444",
    "bg-slate-400": "#94a3b8",
    "bg-sky-500": "#0ea5e9",
    "bg-purple-400": "#c084fc",
  };

  return cores[color] ?? "#94a3b8";
}

function RadialScore({ value }: { value: number }) {
  const porcentagem = Math.max(0, Math.min(100, value));

  return (
    <div
      className="grid size-24 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#10b981 ${porcentagem}%, #e2e8f0 0)`,
      }}
    >
      <div className="grid size-[4.55rem] place-items-center rounded-full bg-white text-center shadow-inner dark:bg-slate-950">
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-xl font-black leading-none text-slate-950 dark:text-slate-50">
            {porcentagem}%
          </p>
          <p className="mt-1 text-[10px] font-semibold leading-none text-slate-500">
            da jornada
          </p>
        </div>
      </div>
    </div>
  );
}

function LegendLine({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <span className={`size-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <strong className="font-bold text-slate-950 dark:text-slate-50">
        {value}
      </strong>
    </div>
  );
}

function ResumoInline({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const toneClass =
    tone === "blue"
      ? "text-blue-700 dark:text-blue-300"
      : tone === "green"
        ? "text-emerald-700 dark:text-emerald-300"
        : tone === "amber"
          ? "text-amber-700 dark:text-amber-300"
          : tone === "red"
            ? "text-red-700 dark:text-red-300"
            : "text-slate-950 dark:text-slate-50";

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function OcorrênciaTabela({
  diaInstitucional,
  ocorrencias,
  solicitacoes,
  resumoAfastamento,
  resumoMarcações,
}: {
  diaInstitucional: DiaInstitucionalEspelho | null;
  ocorrencias: ApuracaoMensalItem["ocorrencias"];
  solicitacoes: SolicitacaoAplicadaEspelho[];
  resumoAfastamento?: ResumoAfastamentoEspelho | null;
  resumoMarcações?: ResumoMarcaçõesMescladas | null;
}) {
  const ocorrenciaPrincipal = ocorrencias?.find(
    (ocorrencia) =>
      !["CREDITO", "DEBITO", "HORA_NAO_AUTORIZADA"].includes(ocorrencia.tipo),
  );
  const solicitacaoPrincipal = solicitacoes.find((solicitacao) =>
    ["ATIVIDADE_EXTERNA", "VIAGEM_SERVICO", "COMPENSACAO"].includes(
      solicitacao.tipo,
    ),
  );
  const label =
    diaInstitucional && !ehFimDeSemanaInstitucional(diaInstitucional)
      ? rotuloDiaInstitucional(diaInstitucional)
      : solicitacaoPrincipal
        ? rotuloSolicitacaoEspelho(solicitacaoPrincipal.tipo)
        : ocorrenciaPrincipal
          ? ocorrenciaPrincipal.descricao ||
            ocorrenciaPrincipal.tipo.replaceAll("_", " ")
          : null;

  if (resumoAfastamento) {
    return <BadgeAfastamentoResumo resumo={resumoAfastamento} compacto />;
  }

  if (resumoMarcações) {
    return <BadgeResumoMarcaçõesMescladas resumo={resumoMarcações} compacto />;
  }

  if (!label) {
    return <span className="text-xs text-slate-500">-</span>;
  }

  return (
    <span className="inline-flex max-w-full truncate rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      {label}
    </span>
  );
}

function itemEhDestaque(
  item: ApuracaoMensalItem,
  destaque?: {
    dataReferencia?: string | null;
    ocorrenciaId?: string | null;
  },
) {
  if (!destaque?.dataReferencia && !destaque?.ocorrenciaId) {
    return false;
  }

  const mêsmaData =
    destaque.dataReferencia === chaveDataReferenciaUtc(item.dataReferencia);
  const mêsmaOcorrência = Boolean(
    destaque.ocorrenciaId &&
    (item.ocorrencias ?? []).some(
      (ocorrencia) => ocorrencia.id === destaque.ocorrenciaId,
    ),
  );

  return mêsmaData || mêsmaOcorrência;
}

function classeLinhaEspelho(destacada: boolean) {
  return [
    "scroll-mt-56 border-b last:border-b-0",
    destacada
      ? "bg-amber-50/90 outline outline-2 outline-amber-300 dark:bg-amber-950/30 dark:outline-amber-700"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function EspelhoPontoMensalCompacto({
  apuracoes,
  marcacoes,
  destaque,
}: {
  apuracoes: ApuracaoMensalItem[];
  marcacoes: MarcacaoItem[];
  destaque?: {
    dataReferencia?: string | null;
    ocorrenciaId?: string | null;
  };
}) {
  const marcacoesPorDia = agruparMarcacoesPorDia(marcacoes);

  return (
    <div className="max-w-full overflow-x-auto xl:overflow-x-clip">
      <table className="w-full min-w-[560px] table-fixed text-left text-[11px] xl:min-w-0 xl:text-xs">
        <colgroup>
          <col className="w-[5.75rem]" />
          <col className="w-[7rem]" />
          <col className="w-[3.15rem]" />
          <col className="w-[3.15rem]" />
          <col className="w-[3.15rem]" />
          <col className="w-[3.15rem]" />
          <col className="w-[4.35rem]" />
          <col className="w-[4.75rem]" />
          <col className="w-[4rem]" />
        </colgroup>
        <thead className="sticky top-[calc(4.5rem+51.5rem)] z-20 border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)] shadow-sm md:top-[calc(4.5rem+18.5rem)] xl:top-[calc(4.5rem+9.35rem)]">
          <tr>
            <th className="border-r px-1.5 py-2">DATA</th>
            <th className="border-r px-1.5 py-2">DIA DA SEMANA</th>
            <th className="px-1.5 py-2">1ª ENT.</th>
            <th className="px-1.5 py-2">1ª SAI.</th>
            <th className="px-1.5 py-2">2ª ENT.</th>
            <th className="px-1.5 py-2">2ª SAI.</th>
            <th className="px-1.5 py-2">INTERVALO</th>
            <th className="px-1.5 py-2">TRABALHADO</th>
            <th className="px-1.5 py-2">STATUS</th>
          </tr>
        </thead>

        <tbody>
          {apuracoes.map((item) => {
            const chaveReferencia = chaveDataReferenciaUtc(item.dataReferencia);
            const marcaçõesDoDia = marcacoesPorDia.get(chaveReferencia) ?? [];
            const exigeIntervalo = extrairExigeIntervalo(item.metadados);
            const horarios = distribuirMarcaçõesNasColunas(
              marcaçõesDoDia,
              exigeIntervalo,
            );
            const diaDestacado = itemEhDestaque(item, destaque);
            const idDia = `espelho-dia-${chaveReferencia}`;

            return (
              <tr
                key={item.id}
                id={idDia}
                className={classeLinhaEspelho(diaDestacado)}
              >
                <td className="whitespace-nowrap border-r px-1.5 py-3 font-medium">
                  {formatarDataCompletaReferenciaUtc(item.dataReferencia)}
                </td>

                <td className="whitespace-nowrap border-r px-1.5 py-3 font-medium">
                  {formatarNomeDiaSemanaReferenciaUtc(item.dataReferencia)}
                </td>

                {horarios.map((horario, indice) => (
                  <td
                    key={`${item.id}-horario-compacto-${indice}`}
                    className="whitespace-nowrap px-1.5 py-3 font-mono"
                  >
                    {horario ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          horario.ajustada
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-slate-100 text-blue-950 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                        title={horario.title}
                      >
                        {horario.valor}
                        {horario.ajustada ? "*" : ""}
                      </span>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">-</span>
                    )}
                  </td>
                ))}

                <td className="px-1.5 py-3">
                  {minutosParaTexto(item.minutosIntervalo ?? 0)}
                </td>
                <td className="px-1.5 py-3">
                  {minutosParaTexto(item.minutosTrabalhados)}
                </td>
                <td className="px-1.5 py-3">
                  <StatusResultado item={item} />
                </td>
              </tr>
            );
          })}

          {apuracoes.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-5 py-10 text-center text-[var(--muted-foreground)]"
              >
                Nenhuma apuração calculada para o mês.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type ResumoAfastamentoEspelho = {
  tipo: "FERIAS" | "AFASTAMENTO";
  rotuloTipo: string;
  rotuloSituacao: string;
  rotuloCompleto: string;
  classe: "ok" | "alerta" | "erro" | "neutro";
  title?: string;
};

type ResumoMarcaçõesMescladas = {
  rotuloStatus: string;
  rotuloDescricao: string;
  classe: "ok" | "alerta" | "erro" | "neutro";
  title?: string;
  iconeLazer?: boolean;
  iconeTrabalhoRemoto?: boolean;
};

function BadgeAfastamentoResumo({
  resumo,
  compacto = false,
}: {
  resumo: ResumoAfastamentoEspelho;
  compacto?: boolean;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-md border font-semibold leading-tight ${
        compacto ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1.5 text-[11px]"
      } ${classesBadgeResumoAfastamento(resumo.classe)}`}
      title={resumo.title}
    >
      <AfastamentoTipoIcone
        descricao={resumo.rotuloCompleto}
        className={`mr-1.5 shrink-0 ${compacto ? "size-3" : "size-4"}`}
      />
      {resumo.rotuloCompleto}
    </span>
  );
}

function BadgeResumoMarcaçõesMescladas({
  resumo,
  compacto = false,
}: {
  resumo: ResumoMarcaçõesMescladas;
  compacto?: boolean;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-md border font-semibold leading-tight ${
        compacto ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1.5 text-[11px]"
      } ${classesBadgeResumo(resumo.classe)}`}
      title={resumo.title}
    >
      {resumo.iconeLazer && (
        <PartyPopper
          className={`mr-1.5 shrink-0 ${compacto ? "size-3" : "size-4"}`}
          aria-hidden="true"
        />
      )}
      {resumo.iconeTrabalhoRemoto && (
        <Laptop
          className={`mr-1.5 shrink-0 ${compacto ? "size-3" : "size-4"}`}
          aria-hidden="true"
        />
      )}
      {resumo.rotuloDescricao}
      {resumo.iconeTrabalhoRemoto && (
        <Wifi
          className={`ml-1.5 shrink-0 ${compacto ? "size-3" : "size-4"}`}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

function StatusResultado({ item }: { item: ApuracaoMensalItem }) {
  if (item.resultado === "INCOMPLETA") {
    return null;
  }

  const rotulo =
    item.cargaPrevistaMinutos === 0 &&
    item.minutosTrabalhados === 0 &&
    item.minutosCredito === 0 &&
    item.minutosDebito === 0
      ? "Folga"
      : ["CREDITO", "DEBITO"].includes(item.resultado)
        ? "Regular"
        : rotuloResultadoEspelho(item.resultado);
  const tipo =
    item.resultado === "REGULAR" ||
    item.resultado === "CREDITO" ||
    item.resultado === "DEBITO"
      ? "ok"
      : item.resultado === "INCOMPLETA"
        ? "alerta"
        : item.resultado === "FALTA"
          ? "erro"
          : "neutro";

  return (
    <span
      className={`inline-flex max-w-full rounded-full border px-1.5 py-1 text-[11px] font-semibold ${
        tipo === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          : tipo === "alerta"
            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
            : tipo === "erro"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
      }`}
    >
      {rotulo}
    </span>
  );
}

function encontrarJustificativaAusênciaMesclada(
  solicitacoes: SolicitacaoAplicadaEspelho[],
) {
  const tiposJustificamAusência = new Set([
    "ABONO_JUSTIFICATIVA",
    "ATIVIDADE_EXTERNA",
    "VIAGEM_SERVICO",
    "CAPACITACAO",
    "COMPENSACAO",
    "FOLGA_BANCO_HORAS",
  ]);

  return (
    solicitacoes.find(
      (solicitacao) =>
        solicitacao.coberturaIntegral &&
        !solicitacao.trabalhoRemoto &&
        tiposJustificamAusência.has(solicitacao.tipo),
    ) ?? null
  );
}

function corrigirGrafiaHint(texto: string) {
  return texto
    .replaceAll("Conferencia", "Conferência")
    .replaceAll("Marcações", "Marcações")
    .replaceAll("marcações", "marcações")
    .replaceAll("Credito", "Crédito")
    .replaceAll("Debito", "Débito")
    .replaceAll("Ausência", "Ausência")
    .replaceAll("Nao", "Não")
    .replaceAll(" nao ", " não ")
    .replaceAll("autorização", "autorização")
    .replaceAll("horario", "horário")
    .replaceAll("padrao", "padrão")
    .replaceAll("saida", "saída")
    .replaceAll("Saida", "Saída")
    .replaceAll("competência", "competência")
    .replaceAll("Há", "Há")
    .replaceAll("padrão", "padrão")
    .replaceAll("autorização", "autorização")
    .replaceAll("horário", "horário")
    .replaceAll("Conferência", "Conferência")
    .replaceAll("não", "não")
    .replaceAll("saída", "saída")
    .replaceAll("Crédito", "Crédito")
    .replaceAll("Débito", "Débito");
}

function ehFimDeSemanaInstitucional(dia: DiaInstitucionalEspelho | null) {
  return dia?.tipo === "SABADO" || dia?.tipo === "DOMINGO";
}

function ehDiaInstitucionalLazer(dia: DiaInstitucionalEspelho | null) {
  return dia?.tipo === "FERIADO" || dia?.tipo === "PONTO_FACULTATIVO";
}

function extrairDiaInstitucional(
  metadados: unknown,
): DiaInstitucionalEspelho | null {
  if (!metadados || typeof metadados !== "object") {
    return null;
  }

  const dados = metadados as {
    tipoDiaInstitucional?: unknown;
    descricaoDiaInstitucional?: unknown;
    contaComoDiaUtil?: unknown;
    geraApuraçãoRegular?: unknown;
  };

  if (
    typeof dados.tipoDiaInstitucional !== "string" ||
    dados.tipoDiaInstitucional === "UTIL"
  ) {
    return null;
  }

  return {
    tipo: dados.tipoDiaInstitucional,
    descricao:
      typeof dados.descricaoDiaInstitucional === "string" &&
      dados.descricaoDiaInstitucional.trim().length > 0
        ? dados.descricaoDiaInstitucional
        : rotuloTipoDiaInstitucional(dados.tipoDiaInstitucional),
    contaComoDiaUtil: dados.contaComoDiaUtil === true,
    geraApuraçãoRegular: dados.geraApuraçãoRegular === true,
  };
}

function rotuloResultadoEspelho(resultado: string) {
  const rotulos: Record<string, string> = {
    REGULAR: "Regular",
    CREDITO: "Crédito",
    DEBITO: "Débito",
    FALTA: "Falta",
    INCOMPLETA: "Marcações incompletas",
    SEM_JORNADA: "Sem jornada",
    SEM_EXPEDIENTE: "Sem expediente",
    PENDENTE: "Pendente",
  };

  return rotulos[resultado] ?? resultado.replaceAll("_", " ");
}

function encontrarAfastamentoPrincipal(
  ocorrencias: ApuracaoMensalItem["ocorrencias"],
) {
  return (ocorrencias ?? []).find(
    (ocorrencia) => ocorrencia.tipo === "AFASTAMENTO",
  );
}

function resumirMarcaçõesMescladas({
  diaInstitucional,
  previsaoJornada,
  solicitacao,
}: {
  diaInstitucional: DiaInstitucionalEspelho | null;
  previsaoJornada?: ReturnType<typeof extrairPrevisaoJornadaDia> | null;
  solicitacao: SolicitacaoAplicadaEspelho | null;
}): ResumoMarcaçõesMescladas | null {
  if (diaInstitucional) {
    if (ehFimDeSemanaInstitucional(diaInstitucional)) {
      return {
        rotuloStatus: "Regular",
        rotuloDescricao: "Descanso previsto na jornada",
        classe: "neutro",
        title: diaInstitucional.descricao,
      };
    }

    if (diaInstitucional.tipo === "FERIADO") {
      return {
        rotuloStatus: "Regular",
        rotuloDescricao: rotuloDiaInstitucional(diaInstitucional),
        classe: "neutro",
        title: diaInstitucional.descricao,
        iconeLazer: true,
      };
    }

    if (diaInstitucional.tipo === "PONTO_FACULTATIVO") {
      return {
        rotuloStatus: "Regular",
        rotuloDescricao: rotuloDiaInstitucional(diaInstitucional),
        classe: "neutro",
        title: diaInstitucional.descricao,
        iconeLazer: true,
      };
    }

    return {
      rotuloStatus: "Regular",
      rotuloDescricao: rotuloDiaInstitucional(diaInstitucional),
      classe: diaInstitucional.geraApuraçãoRegular ? "alerta" : "neutro",
      title: diaInstitucional.descricao,
      iconeLazer: ehDiaInstitucionalLazer(diaInstitucional),
    };
  }

  if (previsaoJornada?.tipoDia === "FOLGA") {
    return {
      rotuloStatus: "Regular",
      rotuloDescricao: "Descanso previsto na jornada",
      classe: "neutro",
      title: "Dia sem expediente por descanso previsto na jornada.",
    };
  }

  if (previsaoJornada?.tipoDia === "HOME_OFFICE") {
    return {
      rotuloStatus: "Regular",
      rotuloDescricao: "home office",
      classe: "neutro",
      title: "Dia previsto como home office no horário híbrido.",
      iconeTrabalhoRemoto: true,
    };
  }

  if (previsaoJornada?.tipoDia === "TELETRABALHO") {
    return {
      rotuloStatus: "Regular",
      rotuloDescricao: "teletrabalho",
      classe: "neutro",
      title: "Dia previsto como teletrabalho.",
      iconeTrabalhoRemoto: true,
    };
  }

  if (!solicitacao) {
    return null;
  }

  if (["COMPENSACAO", "FOLGA_BANCO_HORAS"].includes(solicitacao.tipo)) {
    return {
      rotuloStatus: "Regular",
      rotuloDescricao: "Folga por compensação",
      classe: "ok",
      title: solicitacao.titulo,
    };
  }

  if (solicitacao.tipo === "ABONO_JUSTIFICATIVA") {
    return {
      rotuloStatus: "Regular",
      rotuloDescricao: "Folga autorizada",
      classe: "ok",
      title: solicitacao.titulo,
    };
  }

  return {
    rotuloStatus: "Regular",
    rotuloDescricao: rotuloSolicitacaoEspelho(solicitacao.tipo),
    classe: "ok",
    title: solicitacao.titulo,
  };
}

function resumirAfastamentoEspelho(
  ocorrencia: {
    tipo: string;
    descricao?: string | null;
    detalhes?: unknown;
  },
  dataReferencia: Date | string | null,
): ResumoAfastamentoEspelho {
  const detalhes = detalhesAfastamentoComoObjeto(ocorrencia.detalhes);
  const rotuloBase = rotuloAfastamentoEspelho(ocorrencia.descricao);
  const ehFerias =
    detalhes?.ehFerias === true ||
    textoContemFerias(rotuloBase) ||
    textoContemFerias(String(detalhes?.categoria ?? "")) ||
    textoContemFerias(String(detalhes?.tipoDescricao ?? ""));

  if (!ehFerias) {
    return {
      tipo: "AFASTAMENTO",
      rotuloTipo: "Afastamento",
      rotuloSituacao: rotuloBase,
      rotuloCompleto: rotuloBase,
      classe: "neutro",
      title: rotuloBase,
    };
  }

  const situacao = classificarSituacaoFeriasEspelho({
    detalhes,
    dataReferencia,
  });
  const rotuloCompleto =
    situacao.rotulo === "Em férias"
      ? situacao.rotulo
      : `Férias ${situacao.rotulo}`;

  return {
    tipo: "FERIAS",
    rotuloTipo: "Férias",
    rotuloSituacao: situacao.rotulo,
    rotuloCompleto,
    classe: situacao.classe,
    title: montarTitleFerias(detalhes, rotuloCompleto),
  };
}

function detalhesAfastamentoComoObjeto(valor: unknown) {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function textoNormalizado(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
}

function textoContemFerias(valor: string) {
  return textoNormalizado(valor).includes("FERIAS");
}

function dataReferenciaUtc(valor: Date | string | null | undefined) {
  if (!valor) {
    return null;
  }

  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

function hojeUtc() {
  const hoje = new Date();
  return Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
}

function classificarSituacaoFeriasEspelho({
  detalhes,
  dataReferencia,
}: {
  detalhes: Record<string, unknown> | null;
  dataReferencia: Date | string | null;
}) {
  const textoSituacao = textoNormalizado(
    [
      detalhes?.tipoCodigo,
      detalhes?.tipoDescricao,
      detalhes?.categoria,
      detalhes?.observacao,
      detalhes?.origemTabela,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (textoSituacao.includes("CANCEL") || textoSituacao.includes("ANUL")) {
    return { rotulo: "canceladas", classe: "erro" as const };
  }

  if (
    textoSituacao.includes("INTERROMP") ||
    textoSituacao.includes("SUSPENS")
  ) {
    return { rotulo: "interrompidas", classe: "alerta" as const };
  }

  if (
    textoSituacao.includes("ADIAD") ||
    textoSituacao.includes("REMARC") ||
    textoSituacao.includes("ALTER")
  ) {
    return { rotulo: "adiadas", classe: "alerta" as const };
  }

  const referencia = dataReferenciaUtc(
    dataReferencia ?? (detalhes?.dataReferencia as string | null),
  );
  const inicio = dataReferenciaUtc(detalhes?.dataInicio as string | null);
  const fim = dataReferenciaUtc(detalhes?.dataFim as string | null);
  const hoje = hojeUtc();

  if (referencia !== null) {
    if (referencia > hoje) {
      return { rotulo: "programadas", classe: "neutro" as const };
    }

    if (
      referencia === hoje &&
      inicio !== null &&
      inicio <= hoje &&
      (fim === null || hoje <= fim)
    ) {
      return { rotulo: "Em férias", classe: "neutro" as const };
    }

    if (referencia < hoje) {
      return { rotulo: "gozadas", classe: "ok" as const };
    }
  }

  return { rotulo: "programadas", classe: "neutro" as const };
}

function montarTitleFerias(
  detalhes: Record<string, unknown> | null,
  rotulo: string,
) {
  const inicio = detalhes?.dataInicio
    ? formatarDataReferenciaUtc(String(detalhes.dataInicio))
    : null;
  const fim = detalhes?.dataFim
    ? formatarDataReferenciaUtc(String(detalhes.dataFim))
    : null;
  const periodo = inicio && fim ? ` (${inicio} a ${fim})` : "";

  return `${rotulo}${periodo}`;
}

function classesBadgeResumoAfastamento(
  classe: ResumoAfastamentoEspelho["classe"],
) {
  return classesBadgeResumo(classe);
}

function classesBadgeResumo(classe: "ok" | "alerta" | "erro" | "neutro") {
  if (classe === "erro") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300";
  }

  if (classe === "alerta") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300";
  }

  if (classe === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300";
  }

  return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300";
}

function rotuloAfastamentoEspelho(descricao?: string | null) {
  const texto = descricao?.trim();

  if (!texto) {
    return "Afastamento";
  }

  return texto
    .replace(/^Afastamento SARH:\s*/i, "")
    .replace(/\s*Processo\/SEI:.*$/i, "")
    .replace(/\.$/, "")
    .trim();
}

function rotuloTipoDiaInstitucional(tipo: string) {
  const rotulos: Record<string, string> = {
    SABADO: "Sábado",
    DOMINGO: "Domingo",
    FERIADO: "Feriado institucional",
    PONTO_FACULTATIVO: "Ponto facultativo",
    SUSPENSAO_EXPEDIENTE: "Suspensão de expediente",
    RECESSO_FORENSE: "Recesso forense",
  };

  return rotulos[tipo] ?? tipo.replaceAll("_", " ");
}

function formatarTextoEventoInstitucional(texto: string | null | undefined) {
  const normalizado = texto?.trim();

  if (!normalizado) return "";

  const minusculo = normalizado.toLocaleLowerCase("pt-BR");

  return `${minusculo.charAt(0).toLocaleUpperCase("pt-BR")}${minusculo.slice(1)}`;
}

function formatarDescricaoEventoInstitucional(
  texto: string | null | undefined,
) {
  return texto?.trim().toLocaleLowerCase("pt-BR") ?? "";
}

function rotuloDiaInstitucional(dia: DiaInstitucionalEspelho) {
  if (dia.tipo === "FERIADO" && dia.descricao !== "Feriado institucional") {
    return `Feriado: ${formatarDescricaoEventoInstitucional(dia.descricao)}`;
  }

  if (
    dia.tipo === "PONTO_FACULTATIVO" &&
    dia.descricao !== "Ponto facultativo"
  ) {
    return `Ponto facultativo: ${formatarDescricaoEventoInstitucional(dia.descricao)}`;
  }

  if (dia.tipo === "SUSPENSAO_EXPEDIENTE") {
    return dia.descricao && dia.descricao !== "Suspensão de expediente"
      ? `Suspensão: ${formatarDescricaoEventoInstitucional(dia.descricao)}`
      : "Suspensão de expediente";
  }

  if (dia.tipo === "RECESSO_FORENSE") {
    return formatarTextoEventoInstitucional(dia.descricao);
  }

  return rotuloTipoDiaInstitucional(dia.tipo);
}

function montarDicaSemaforo({
  item,
  conferencia,
  possuiMarcacaoAjustada,
  solicitacoesAplicadas,
}: {
  item: ApuracaoMensalItem;
  conferencia: ReturnType<typeof conferenciaEspelho>;
  possuiMarcacaoAjustada: boolean;
  solicitacoesAplicadas: SolicitacaoAplicadaEspelho[];
}) {
  const linhas = [
    `Resultado: ${rotuloResultadoEspelho(item.resultado)}`,
    `Conferência: ${conferencia.rotulo}`,
    conferencia.descricao,
  ];

  if (possuiMarcacaoAjustada) {
    linhas.push("Ajuste aplicado.");
  }

  for (const solicitacao of solicitacoesAplicadas) {
    const cobertura = solicitacao.coberturaIntegral
      ? "cobertura integral"
      : minutosParaTexto(solicitacao.minutosCobertos);
    const titulo = solicitacao.trabalhoRemoto
      ? "Trabalho remoto deferido"
      : `${rotuloSolicitacaoEspelho(solicitacao.tipo)}: ${solicitacao.titulo}`;

    linhas.push(`${titulo} (${cobertura}).`);
  }

  return linhas.filter(Boolean).map(corrigirGrafiaHint).join("\n");
}

function IconeSemaforo({
  tom,
  title,
  "aria-label": ariaLabel,
}: {
  tom: "ok" | "alerta" | "neutro";
  title: string;
  "aria-label": string;
}) {
  if (tom === "ok") {
    return (
      <span className="inline-flex" aria-label={ariaLabel} title={title}>
        <CheckCircle2
          className="size-5 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
      </span>
    );
  }

  if (tom === "alerta") {
    return (
      <span className="inline-flex" aria-label={ariaLabel} title={title}>
        <AlertTriangle
          className="size-5 text-red-600 dark:text-red-400"
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex" aria-label={ariaLabel} title={title}>
      <Clock3
        className="size-5 text-amber-600 dark:text-amber-300"
        aria-hidden="true"
      />
    </span>
  );
}

function metadadosComoObjeto(valor: unknown) {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function extrairExigeIntervalo(metadados: unknown) {
  const dados = metadadosComoObjeto(metadados);
  const jornadaSnapshot = metadadosComoObjeto(
    dados.jornadaSnapshotApuração ?? dados.jornadaVigente,
  );
  const jornada = metadadosComoObjeto(jornadaSnapshot.jornada);

  return jornada.exigeIntervalo === false ? false : true;
}

function Resumo({
  label,
  value,
  destaque,
  detalhe,
}: {
  label: string;
  value: string;
  detalhe?: string;
  destaque?: "credito" | "debito" | "neutro";
}) {
  const labelNormalizado = textoNormalizado(label);

  if (
    labelNormalizado.includes("AUSENCIA") ||
    labelNormalizado.includes("ATIV") ||
    labelNormalizado.includes("VIAGEM") ||
    labelNormalizado.includes("HORA EXTRA NAO")
  ) {
    return null;
  }

  const ehPrevisto = labelNormalizado.includes("PREVISTO");
  const ehTrabalhado = labelNormalizado.includes("TRABALHADO");
  const ehCredito = labelNormalizado.includes("CREDITO");
  const ehDebito = labelNormalizado.includes("DEBITO");
  const ehHoraExtra = labelNormalizado.includes("HORA EXTRA");
  const ehBanco = labelNormalizado.includes("BANCO");
  const Icone = ehPrevisto
    ? CalendarDays
    : ehTrabalhado
      ? Clock3
      : ehCredito
        ? Database
        : ehDebito
          ? Database
          : ehHoraExtra
            ? Zap
            : ehBanco
              ? Hourglass
              : CalendarDays;
  const labelExibicao = ehPrevisto
    ? "Jornada prevista"
    : ehHoraExtra
      ? "Horas extras"
      : label;
  const detalheExibicao =
    detalhe ?? (ehPrevisto ? null : ehBanco ? "Saldo atual" : null);
  const estilo = ehDebito
    ? {
        bolha: "bg-red-50 text-red-600",
        valor: "text-red-600",
        barra: "bg-red-500",
      }
    : ehHoraExtra
      ? {
          bolha: "bg-amber-50 text-amber-500",
          valor: "text-amber-600",
          barra: "bg-amber-400",
        }
      : ehBanco
        ? {
            bolha: "bg-violet-50 text-violet-600",
            valor: "text-violet-700",
            barra: "bg-violet-500",
          }
        : destaque === "credito" || ehTrabalhado
          ? {
              bolha: "bg-emerald-50 text-emerald-600",
              valor: "text-slate-950 dark:text-slate-50",
              barra: "bg-emerald-500",
            }
          : {
              bolha: "bg-blue-50 text-blue-600",
              valor: "text-slate-950 dark:text-slate-50",
              barra: "bg-blue-600",
            };

  return (
    <div className="min-h-[52px] rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-1.5">
        <span
          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md ${estilo.bolha}`}
        >
          <Icone className="size-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold leading-3 text-slate-600 dark:text-slate-300">
            {labelExibicao}
          </p>
          <p
            className={`mt-0.5 text-[17px] font-black leading-none ${estilo.valor}`}
          >
            {value}
          </p>
          {ehTrabalhado ? (
            <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span
                className={`block h-full rounded-full ${estilo.barra}`}
                style={{
                  width: `${Math.min(
                    100,
                    Number.parseInt(detalheExibicao ?? "0", 10) || 0,
                  )}%`,
                }}
              />
            </div>
          ) : null}
          {detalheExibicao ? (
            <p className="mt-0.5 truncate text-[10px] font-medium leading-3 text-slate-500 dark:text-slate-400">
              {detalheExibicao}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ValorTempo({
  minutos,
  tipo,
  detalhe,
  estado,
}: {
  minutos: number;
  tipo: "credito" | "debito";
  detalhe?: string;
  estado?: "pendente" | "validado";
}) {
  const temValor = minutos > 0;

  return (
    <span
      className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        !temValor
          ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
          : estado === "pendente"
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            : estado === "validado"
              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
              : tipo === "credito"
                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      }`}
      title={detalhe}
    >
      {minutosParaTexto(minutos)}
    </span>
  );
}

function ValorSaldoBancoHoras({ minutos }: { minutos: number }) {
  const tipo = minutos >= 0 ? "credito" : "debito";
  const valor =
    minutos === 0 ? minutosParaTexto(0) : formatarSaldoBancoHoras(minutos);

  return (
    <span
      className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        minutos === 0
          ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
          : tipo === "credito"
            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      }`}
    >
      {valor}
    </span>
  );
}

function AcoesBancoHorasDia({
  servidorId,
  anoReferencia,
  mesReferencia,
  dataReferencia,
  minutosNaoAutorizados,
}: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  dataReferencia: Date | string;
  minutosNaoAutorizados: number;
}) {
  if (minutosNaoAutorizados <= 0) {
    return <span className="text-xs text-[var(--muted-foreground)]">-</span>;
  }

  return (
    <form
      action={autorizarHoraExtraBancoHorasAction}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="servidorId" value={servidorId} />
      <input type="hidden" name="anoReferencia" value={anoReferencia} />
      <input type="hidden" name="mesReferencia" value={mesReferencia} />
      <input
        type="hidden"
        name="dataReferencia"
        value={chaveDataReferenciaUtc(dataReferencia)}
      />
      <input
        type="hidden"
        name="minutosMaximos"
        value={minutosNaoAutorizados}
      />
      <TempoAutorizadoInput
        key={`${servidorId}-${chaveDataReferenciaUtc(
          dataReferencia,
        )}-${minutosNaoAutorizados}`}
        name="tempoAutorizado"
        minutos={minutosNaoAutorizados}
        minutosMaximos={minutosNaoAutorizados}
        className="h-8 w-20 rounded-md border bg-[var(--background)] px-2 text-xs font-semibold tabular-nums"
        ariaLabel="Tempo a autorizar no formato horas e minutos"
        title={`Informe o tempo no formato HH:MM, até ${minutosParaTexto(
          minutosNaoAutorizados,
        )}.`}
      />
      <ConfirmarAutorizacaoHoraExtraButton />
    </form>
  );
}

function formatarSaldoBancoHoras(minutos: number) {
  if (minutos === 0) {
    return minutosParaTexto(0);
  }

  return `${minutos > 0 ? "+" : "-"}${minutosParaTexto(Math.abs(minutos))}`;
}

function agruparMarcacoesPorDia(marcacoes: MarcacaoItem[]) {
  const mapa = new Map<string, MarcacaoItem[]>();

  for (const marcacao of marcacoes) {
    const chave = chaveDataReferenciaUtc(marcacao.dataReferencia);
    const atual = mapa.get(chave) ?? [];
    atual.push(marcacao);
    mapa.set(chave, atual);
  }

  return mapa;
}

function distribuirMarcaçõesNasColunas(
  marcacoes: MarcacaoItem[],
  exigeIntervalo = true,
  quantidadeColunas = 4,
) {
  const horarios: Array<{
    valor: string;
    ajustada: boolean;
    title: string;
  } | null> = Array.from({ length: quantidadeColunas }, () => null);
  const indicePorTipo: Record<string, number> = exigeIntervalo
    ? {
        ENTRADA: 0,
        SAIDA_INTERVALO: 1,
        RETORNO_INTERVALO: 2,
        SAIDA: 3,
      }
    : {
        ENTRADA: 0,
        SAIDA: 1,
        SAIDA_INTERVALO: 1,
        RETORNO_INTERVALO: 2,
      };
  const restantes: MarcacaoItem[] = [];

  for (const marcacao of marcacoes) {
    const indice = indicePorTipo[marcacao.tipo];

    if (indice === undefined || horarios[indice]) {
      restantes.push(marcacao);
      continue;
    }

    horarios[indice] = formatarMarcacaoTabela(marcacao);
  }

  for (const marcacao of restantes) {
    const indiceLivre = horarios.findIndex((horario) => !horario);

    if (indiceLivre < 0) {
      break;
    }

    horarios[indiceLivre] = formatarMarcacaoTabela(marcacao);
  }

  return horarios;
}

function rotulosColunasTempo(quantidadeColunas: number) {
  const rotulos = [
    "1ª Ent.",
    "1ª Sai.",
    "2ª Ent.",
    "2ª Sai.",
    "3ª Ent.",
    "3ª Sai.",
  ];

  return rotulos.slice(0, Math.max(2, Math.min(6, quantidadeColunas)));
}

function extrairPrevisaoJornadaDia(metadados: unknown) {
  const previsao = metadadosComoObjeto(metadados).previsaoJornadaDia;

  if (!previsao || typeof previsao !== "object" || Array.isArray(previsao)) {
    return null;
  }

  const dados = previsao as {
    tipoDia?: unknown;
    trabalha?: unknown;
    faixas?: unknown;
  };

  return {
    tipoDia: typeof dados.tipoDia === "string" ? dados.tipoDia : null,
    trabalha: typeof dados.trabalha === "boolean" ? dados.trabalha : null,
    faixas: Array.isArray(dados.faixas) ? dados.faixas : [],
  };
}

function textoResumoHorarioPrevisto(
  previsao: ReturnType<typeof extrairPrevisaoJornadaDia>,
  quantidadeMarcações: number,
) {
  if (!previsao || quantidadeMarcações > 0) return null;

  return null;
}

function quantidadeColunasPrevistas(item: ApuracaoMensalItem) {
  const previsao = extrairPrevisaoJornadaDia(item.metadados);
  const quantidadeFaixas = previsao?.faixas.length ?? 0;

  if (quantidadeFaixas <= 0) return 4;

  return Math.max(2, Math.min(6, quantidadeFaixas * 2));
}

function calcularQuantidadeColunasMarcações(
  apuracoes: ApuracaoMensalItem[],
  marcacoesPorDia: Map<string, MarcacaoItem[]>,
) {
  const maiorPrevisao = apuracoes.reduce(
    (maior, item) => Math.max(maior, quantidadeColunasPrevistas(item)),
    4,
  );
  const maiorMarcações = Array.from(marcacoesPorDia.values()).reduce(
    (maior, marcaçõesDia) => Math.max(maior, marcaçõesDia.length),
    0,
  );

  return Math.min(6, Math.max(4, maiorPrevisao, maiorMarcações));
}

function formatarMarcacaoTabela(marcacao: MarcacaoItem) {
  return {
    valor: formatarHoraLocal(marcacao.dataHora, marcacao.fusoHorario),
    ajustada: marcacaoPossuiAjuste(marcacao),
    title: descricaoMarcacao(marcacao),
  };
}

function chaveDataReferenciaUtc(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function formatarDataReferenciaUtc(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(data);
  const diaSemana = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(data)
    .replace(".", "")
    .slice(0, 3);

  return `${dataFormatada} - ${diaSemana}`;
}

function formatarDataCompletaReferenciaUtc(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
}

function formatarNomeDiaSemanaReferenciaUtc(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  const diaSemana = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(data);

  return diaSemana.charAt(0).toLocaleUpperCase("pt-BR") + diaSemana.slice(1);
}

function formatarHoraLocal(valor: Date | string, fusoHorario?: string | null) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fusoHorario ?? "America/Manaus",
  }).format(data);
}
