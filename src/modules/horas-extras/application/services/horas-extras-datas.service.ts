import type {
  OvertimeDateSelection,
  OvertimeDayType,
  OvertimeWeekday,
} from "../../domain/horas-extras.types";
import type { ClassificacaoDiaInstitucional } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";

const WEEKDAY_BY_INDEX: OvertimeWeekday[] = [
  "DOMINGO",
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
];

export function parseIsoDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Data invalida: ${value}`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data invalida: ${value}`);
  }

  return date;
}

export function formatIsoDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getWeekday(dateIso: string): OvertimeWeekday {
  return WEEKDAY_BY_INDEX[parseIsoDateOnly(dateIso).getUTCDay()];
}

export function inferOvertimeDayType(dateIso: string): OvertimeDayType {
  const weekday = getWeekday(dateIso);

  if (weekday === "SABADO") {
    return "SABADO";
  }

  if (weekday === "DOMINGO") {
    return "DOMINGO";
  }

  return "DIA_UTIL";
}

export function mapClassificacaoInstitucionalParaOvertimeDayType(
  classificacao: ClassificacaoDiaInstitucional,
): OvertimeDayType {
  if (classificacao.tipo === "RECESSO_FORENSE") {
    return "RECESSO";
  }

  if (classificacao.tipo === "PONTO_FACULTATIVO") {
    return "PONTO_FACULTATIVO";
  }

  if (classificacao.tipo === "FERIADO") {
    if (classificacao.abrangencia === "NACIONAL") {
      return "FERIADO_NACIONAL";
    }

    if (classificacao.abrangencia === "ESTADUAL") {
      return "FERIADO_ESTADUAL";
    }

    if (classificacao.abrangencia === "MUNICIPAL") {
      return "FERIADO_MUNICIPAL";
    }

    return "FERIADO_REGIMENTAL";
  }

  if (classificacao.tipo === "SABADO") {
    return "SABADO";
  }

  if (classificacao.tipo === "DOMINGO") {
    return "DOMINGO";
  }

  return "DIA_UTIL";
}

export function expandOvertimeDateSelection(selection: OvertimeDateSelection) {
  const start = parseIsoDateOnly(selection.periodStart);
  const end = parseIsoDateOnly(selection.periodEnd);

  if (start.getTime() > end.getTime()) {
    return [];
  }

  const dates: string[] = [];

  if (selection.mode === "DATAS_ESPECIFICAS") {
    return Array.from(
      new Set(
        (selection.explicitDates ?? []).filter((date) => {
          const parsed = parseIsoDateOnly(date);
          return parsed.getTime() >= start.getTime() && parsed.getTime() <= end.getTime();
        }),
      ),
    ).sort();
  }

  for (let current = start, index = 0; current.getTime() <= end.getTime(); current = addDays(current, 1), index += 1) {
    const dateIso = formatIsoDateOnly(current);
    const weekday = getWeekday(dateIso);
    const matches =
      selection.mode === "TODOS_SABADOS"
        ? weekday === "SABADO"
        : selection.mode === "TODOS_DOMINGOS"
          ? weekday === "DOMINGO"
          : selection.mode === "SABADOS_DOMINGOS"
            ? weekday === "SABADO" || weekday === "DOMINGO"
            : selection.mode === "DIAS_UTEIS"
              ? !["SABADO", "DOMINGO"].includes(weekday)
              : selection.mode === "DIA_SEMANA"
                ? weekday === selection.weekday
                : selection.mode === "INTERVALO_RECORRENTE"
                  ? index % Math.max(selection.intervalDays ?? 1, 1) === 0
                  : false;

    if (matches) {
      dates.push(dateIso);
    }
  }

  return dates;
}
