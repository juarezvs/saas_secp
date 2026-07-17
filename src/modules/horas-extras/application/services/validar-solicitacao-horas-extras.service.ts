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
  let totalRequestedMinutes = 0;

  if (start.getTime() > end.getTime()) {
    issues.push({
      code: "PERIODO_INVALIDO",
      severity: "error",
      message: "O período inicial não pode ser posterior ao período final.",
    });
  }

  for (const day of input.days) {
    totalRequestedMinutes += day.requestedMinutes;
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

    if (!Number.isInteger(day.requestedMinutes) || day.requestedMinutes <= 0) {
      issues.push({
        code: "QUANTIDADE_INVALIDA",
        severity: "error",
        message: "Informe uma quantidade de minutos maior que zero.",
        date: day.date,
        requestedMinutes: day.requestedMinutes,
      });
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

  if (
    input.policy.monthlyLimitMinutes !== undefined &&
    totalRequestedMinutes > input.policy.monthlyLimitMinutes
  ) {
    issues.push({
      code: "LIMITE_MENSAL_EXCEDIDO",
      severity: "error",
      message: "A quantidade total solicitada excede o limite mensal configurado.",
      allowedMinutes: input.policy.monthlyLimitMinutes,
      requestedMinutes: totalRequestedMinutes,
      normativeBasis: input.policy.normativeBasis,
    });
  }

  return issues;
}
