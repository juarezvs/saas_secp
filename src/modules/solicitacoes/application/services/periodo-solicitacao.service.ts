import { normalizarDataReferencia } from "../../../apuracao/application/services/calcular-tempo.service";

export const TIPOS_SOLICITACAO_COM_EFEITO_APURACAO = [
  "ABONO_JUSTIFICATIVA",
  "ATIVIDADE_EXTERNA",
  "VIAGEM_SERVICO",
  "CAPACITACAO",
  "DISPENSA_PONTO",
  "HORA_CREDITO_PREVIA",
] as const;

export const TIPOS_SOLICITACAO_COM_RECALCULO_APOS_DEFERIMENTO = [
  "AJUSTE_PONTO",
  "COMPENSACAO",
  ...TIPOS_SOLICITACAO_COM_EFEITO_APURACAO,
] as const;

type PeriodoSolicitacao = {
  dataReferencia?: Date | null;
  dataInicio?: Date | null;
  dataFim?: Date | null;
};

function ajustarFimInclusivo(dataFim: Date | null | undefined) {
  if (!dataFim) {
    return null;
  }

  return new Date(dataFim.getTime() - 1);
}

function partesLocais(data: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
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

function chaveDataLocal(data: Date) {
  return normalizarDataReferencia(data).toISOString().slice(0, 10);
}

function minutosLocais(data: Date) {
  const partes = partesLocais(data);
  return partes.hora * 60 + partes.minuto;
}

export function listarDatasImpactadasSolicitacao(
  periodo: PeriodoSolicitacao,
) {
  if (periodo.dataReferencia) {
    return [normalizarDataReferencia(periodo.dataReferencia)];
  }

  const inicioBase = periodo.dataInicio ?? periodo.dataFim;
  const fimBase = ajustarFimInclusivo(periodo.dataFim ?? periodo.dataInicio);

  if (!inicioBase || !fimBase || fimBase < inicioBase) {
    return [];
  }

  const inicio = normalizarDataReferencia(inicioBase);
  const fim = normalizarDataReferencia(fimBase);
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
) {
  if (periodo.dataReferencia) {
    return chaveDataLocal(periodo.dataReferencia) === chaveDataLocal(dataReferencia)
      ? 24 * 60
      : 0;
  }

  const inicio = periodo.dataInicio;
  const fim = ajustarFimInclusivo(periodo.dataFim);

  if (!inicio || !fim || fim < inicio) {
    return 0;
  }

  const chaveDia = chaveDataLocal(dataReferencia);
  const chaveInicio = chaveDataLocal(inicio);
  const chaveFim = chaveDataLocal(fim);

  if (chaveDia < chaveInicio || chaveDia > chaveFim) {
    return 0;
  }

  const inicioNoDia = chaveDia === chaveInicio ? minutosLocais(inicio) : 0;
  const fimNoDia = chaveDia === chaveFim ? minutosLocais(fim) + 1 : 24 * 60;

  return Math.max(0, fimNoDia - inicioNoDia);
}
