import { normalizarDataReferencia } from "../../../apuracao/application/services/calcular-tempo.service";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";

export const TIPOS_SOLICITACAO_COM_EFEITO_APURACAO = [
  "ABONO_JUSTIFICATIVA",
  "ATIVIDADE_EXTERNA",
  "VIAGEM_SERVICO",
  "CAPACITACAO",
  "DISPENSA_PONTO",
  "HORA_CREDITO_PREVIA",
  "FOLGA_BANCO_HORAS",
] as const;

export const TIPOS_SOLICITACAO_COM_RECALCULO_APOS_DEFERIMENTO = [
  "AJUSTE_PONTO",
  "COMPENSACAO",
  ...TIPOS_SOLICITACAO_COM_EFEITO_APURACAO,
] as const;

export const TIPOS_SOLICITACAO_PERIODO_DIA_INTEIRO = [
  "COMPENSACAO",
  "ABONO_JUSTIFICATIVA",
  "VIAGEM_SERVICO",
  "FOLGA_BANCO_HORAS",
] as const;

type PeriodoSolicitacao = {
  dataReferencia?: Date | null;
  dataInicio?: Date | null;
  dataFim?: Date | null;
};

export function solicitacaoUsaPeriodoDiaInteiro(tipo: string) {
  return TIPOS_SOLICITACAO_PERIODO_DIA_INTEIRO.includes(
    tipo as (typeof TIPOS_SOLICITACAO_PERIODO_DIA_INTEIRO)[number],
  );
}

export function dataPeriodoSolicitacaoParaExibicao(
  tipo: string,
  data: Date | null | undefined,
  parte: "inicio" | "fim",
) {
  if (!data) {
    return null;
  }

  if (parte === "fim" && solicitacaoUsaPeriodoDiaInteiro(tipo)) {
    return ajustarFimInclusivo(data);
  }

  return data;
}

function ajustarFimInclusivo(dataFim: Date | null | undefined) {
  if (!dataFim) {
    return null;
  }

  return new Date(dataFim.getTime() - 1);
}

function partesLocais(data: Date, fusoHorario?: string | null) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario ? normalizarFusoHorario(fusoHorario) : "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);

  return {
    hora: Number(partes.find((parte) => parte.type === "hour")?.value),
    minuto: Number(partes.find((parte) => parte.type === "minute")?.value),
  };
}

function chaveDataLocal(data: Date, fusoHorario?: string | null) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario ? normalizarFusoHorario(fusoHorario) : "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);
  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  const dia = partes.find((parte) => parte.type === "day")?.value;

  return `${ano}-${mes}-${dia}`;
}

function chaveDataReferenciaUtc(data: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function minutosLocais(data: Date, fusoHorario?: string | null) {
  const partes = partesLocais(data, fusoHorario);
  return partes.hora * 60 + partes.minuto;
}

export function listarDatasImpactadasSolicitacao(
  periodo: PeriodoSolicitacao,
  fusoHorario?: string | null,
) {
  if (periodo.dataReferencia) {
    return [normalizarDataReferencia(periodo.dataReferencia)];
  }

  const inicioBase = periodo.dataInicio ?? periodo.dataFim;
  const fimBase = ajustarFimInclusivo(periodo.dataFim ?? periodo.dataInicio);

  if (!inicioBase || !fimBase || fimBase < inicioBase) {
    return [];
  }

  const inicio = new Date(`${chaveDataLocal(inicioBase, fusoHorario)}T00:00:00.000Z`);
  const fim = new Date(`${chaveDataLocal(fimBase, fusoHorario)}T00:00:00.000Z`);
  const datas: Date[] = [];
  const cursor = new Date(inicio);

  while (cursor <= fim) {
    datas.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return datas;
}

export function calcularMinutosCoberturaSolicitacaoNoDia(
  periodo: PeriodoSolicitacao,
  dataReferencia: Date,
  fusoHorario?: string | null,
) {
  if (periodo.dataReferencia) {
    return chaveDataLocal(periodo.dataReferencia, fusoHorario) ===
      chaveDataReferenciaUtc(dataReferencia)
      ? 24 * 60
      : 0;
  }

  const inicio = periodo.dataInicio;
  const fim = ajustarFimInclusivo(periodo.dataFim);

  if (!inicio || !fim || fim < inicio) {
    return 0;
  }

  const chaveDia = chaveDataReferenciaUtc(dataReferencia);
  const chaveInicio = chaveDataLocal(inicio, fusoHorario);
  const chaveFim = chaveDataLocal(fim, fusoHorario);

  if (chaveDia < chaveInicio || chaveDia > chaveFim) {
    return 0;
  }

  const inicioNoDia =
    chaveDia === chaveInicio ? minutosLocais(inicio, fusoHorario) : 0;
  const fimNoDia =
    chaveDia === chaveFim ? minutosLocais(fim, fusoHorario) + 1 : 24 * 60;

  return Math.max(0, fimNoDia - inicioNoDia);
}
