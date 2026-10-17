import type {
  OvertimePolicyLimitSnapshot,
  OvertimeRequestedDayInput,
  OvertimeValidationIssue,
} from "../../domain/horas-extras.types";
import { inferOvertimeDayType, parseIsoDateOnly } from "./horas-extras-datas.service";

function minutesFromTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function validateOvertimeRequestedDays(input: {
  periodStart: string;
  periodEnd: string;
  days: OvertimeRequestedDayInput[];
  policy: OvertimePolicyLimitSnapshot;
}): OvertimeValidationIssue[] {
  const issues: OvertimeValidationIssue[] = [];
  const seenDates = new Set<string>();
  const start = parseIsoDateOnly(input.periodStart);
  const end = parseIsoDateOnly(input.periodEnd);
  const minutesByMonth = new Map<string, number>();
  const minutesByYear = new Map<string, number>();

  if (start.getTime() > end.getTime()) {
    issues.push({
      code: "PERIODO_INVALIDO",
      severity: "error",
      message: "O período inicial não pode ser posterior ao período final.",
    });
  }

  for (const day of input.days) {
    let date: Date | null = null;

    try {
      date = parseIsoDateOnly(day.date);
    } catch {
      issues.push({
        code: "DATA_INVALIDA",
        severity: "error",
        message: "Informe uma data válida para a hora extra solicitada.",
        date: day.date,
      });
    }

    if (seenDates.has(day.date)) {
      issues.push({
        code: "DATA_DUPLICADA",
        severity: "error",
        message: "A data foi informada mais de uma vez.",
        date: day.date,
      });
    }

    seenDates.add(day.date);

    if (
      date &&
      (date.getTime() < start.getTime() || date.getTime() > end.getTime())
    ) {
      issues.push({
        code: "DATA_FORA_PERIODO",
        severity: "error",
        message: "A data selecionada está fora do período da solicitação.",
        date: day.date,
      });
    }

    if (!Number.isSafeInteger(day.requestedMinutes) || day.requestedMinutes <= 0) {
      issues.push({
        code: "QUANTIDADE_INVALIDA",
        severity: "error",
        message: "Informe uma quantidade de minutos maior que zero.",
        date: day.date,
        requestedMinutes: day.requestedMinutes,
      });
    }

    if (date && Number.isSafeInteger(day.requestedMinutes) && day.requestedMinutes > 0) {
      const month = day.date.slice(0, 7);
      const year = day.date.slice(0, 4);
      minutesByMonth.set(month, (minutesByMonth.get(month) ?? 0) + day.requestedMinutes);
      minutesByYear.set(year, (minutesByYear.get(year) ?? 0) + day.requestedMinutes);
    }

    if (day.requestedStartTime && day.requestedEndTime) {
      const startMinutes = minutesFromTime(day.requestedStartTime);
      const endMinutes = minutesFromTime(day.requestedEndTime);

      if (
        startMinutes === null ||
        endMinutes === null ||
        endMinutes <= startMinutes
      ) {
        issues.push({
          code: "HORARIO_INVALIDO",
          severity: "error",
          message: "O horário final deve ser posterior ao horário inicial.",
          date: day.date,
        });
      }
    }

    const dayType = day.dayType ?? (date ? inferOvertimeDayType(day.date) : null);
    const dailyLimit = dayType
      ? input.policy.dailyLimitMinutesByDayType[dayType]
      : undefined;

    if (
      dayType &&
      dailyLimit !== undefined &&
      day.requestedMinutes > dailyLimit
    ) {
      issues.push({
        code: "LIMITE_DIARIO_EXCEDIDO",
        severity: "error",
        message: "A quantidade solicitada excede o limite diário configurado.",
        date: day.date,
        allowedMinutes: dailyLimit,
        requestedMinutes: day.requestedMinutes,
        normativeBasis: input.policy.normativeBasis,
      });
    }
  }

  // O caso de uso ainda deve agregar o histórico de outras autorizações.
  for (const [month, minutes] of minutesByMonth) {
    if (input.policy.monthlyLimitMinutes !== undefined && minutes > input.policy.monthlyLimitMinutes) {
      issues.push({
        code: "LIMITE_MENSAL_EXCEDIDO",
        severity: "error",
        message: `A quantidade solicitada em ${month} excede o limite mensal configurado.`,
        date: `${month}-01`,
        allowedMinutes: input.policy.monthlyLimitMinutes,
        requestedMinutes: minutes,
        normativeBasis: input.policy.normativeBasis,
      });
    }
  }

  for (const [year, minutes] of minutesByYear) {
    if (input.policy.annualLimitMinutes !== undefined && minutes > input.policy.annualLimitMinutes) {
      issues.push({
        code: "LIMITE_ANUAL_EXCEDIDO",
        severity: "error",
        message: `A quantidade solicitada em ${year} excede o limite anual configurado.`,
        date: `${year}-01-01`,
        allowedMinutes: input.policy.annualLimitMinutes,
        requestedMinutes: minutes,
        normativeBasis: input.policy.normativeBasis,
      });
    }
  }

  return issues;
}
