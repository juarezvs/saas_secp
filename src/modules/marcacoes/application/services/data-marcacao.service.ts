import { FUSOS_HORARIOS_BRASIL_PADRAO } from "@/modules/fusos-horarios/domain/fusos-horarios-oficiais";

export const FUSO_HORARIO_PADRAO = "America/Manaus";
export const FUSOS_HORARIOS_OPCOES = FUSOS_HORARIOS_BRASIL_PADRAO.map(
  ({ valor, rotulo }) => ({ valor, rotulo }),
);

export function normalizarFusoHorario(fusoHorario?: string | null) {
  const fuso = fusoHorario?.trim();

  if (!fuso) {
    return FUSO_HORARIO_PADRAO;
  }

  try {
    Intl.DateTimeFormat("pt-BR", { timeZone: fuso }).format(new Date());
    return fuso;
  } catch {
    return FUSO_HORARIO_PADRAO;
  }
}

export function obterDataReferencia(
  dataHora: Date,
  fusoHorario?: string | null,
) {
  const timeZone = normalizarFusoHorario(fusoHorario);
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dataHora);
  const ano = Number(partes.find((parte) => parte.type === "year")?.value);
  const mes = Number(partes.find((parte) => parte.type === "month")?.value);
  const dia = Number(partes.find((parte) => parte.type === "day")?.value);

  return new Date(Date.UTC(ano, mes - 1, dia));
}

export function obterMinutosLocais(
  dataHora: Date,
  fusoHorario?: string | null,
) {
  const timeZone = normalizarFusoHorario(fusoHorario);
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(dataHora);
  const hora = Number(partes.find((parte) => parte.type === "hour")?.value);
  const minuto = Number(
    partes.find((parte) => parte.type === "minute")?.value,
  );

  return hora * 60 + minuto;
}

export function subtrairDiasDataReferencia(dataReferencia: Date, dias: number) {
  const data = new Date(dataReferencia);
  data.setUTCDate(data.getUTCDate() - dias);
  return data;
}

export function dataHoraLocalParaUtc(params: {
  dataReferencia: Date;
  hora: string;
  fusoHorario?: string | null;
}) {
  const timeZone = normalizarFusoHorario(params.fusoHorario);
  const dataIso = params.dataReferencia.toISOString().slice(0, 10);
  const [anoAlvo, mesAlvo, diaAlvo] = dataIso.split("-").map(Number);
  const [horaAlvo, minutoAlvo] = params.hora.split(":").map(Number);
  const localAlvoComoUtc = Date.UTC(
    anoAlvo,
    mesAlvo - 1,
    diaAlvo,
    horaAlvo,
    minutoAlvo,
    0,
  );
  let dataUtc = new Date(`${dataIso}T${params.hora}:00.000Z`);

  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(dataUtc);

    const valor = (tipo: string) =>
      Number(partes.find((parte) => parte.type === tipo)?.value);

    const localComoUtc = Date.UTC(
      valor("year"),
      valor("month") - 1,
      valor("day"),
      valor("hour"),
      valor("minute"),
      valor("second"),
    );
    const diferenca = localComoUtc - localAlvoComoUtc;

    if (diferenca === 0) {
      break;
    }

    dataUtc = new Date(dataUtc.getTime() - diferenca);
  }

  return dataUtc;
}

export function formatarDataHoraPtBr(data: Date, fusoHorario?: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: normalizarFusoHorario(fusoHorario),
  }).format(data);
}

export function formatarHoraPtBr(data: Date, fusoHorario?: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: normalizarFusoHorario(fusoHorario),
  }).format(data);
}
