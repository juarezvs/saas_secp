export type OvertimePaymentDestination = "PECUNIA" | "BANCO_DE_HORAS" | "A_DEFINIR";

export type OvertimeDayType =
  | "DIA_UTIL"
  | "SABADO"
  | "DOMINGO"
  | "FERIADO_NACIONAL"
  | "FERIADO_ESTADUAL"
  | "FERIADO_MUNICIPAL"
  | "FERIADO_REGIMENTAL"
  | "PONTO_FACULTATIVO"
  | "RECESSO"
  | "FOLGA_DE_ESCALA";

export type OvertimeDateSelectionMode =
  | "DATAS_ESPECIFICAS"
  | "TODOS_SABADOS"
  | "TODOS_DOMINGOS"
  | "SABADOS_DOMINGOS"
  | "DIAS_UTEIS"
  | "DIA_SEMANA"
  | "INTERVALO_RECORRENTE";

export type OvertimeWeekday =
  | "DOMINGO"
  | "SEGUNDA"
  | "TERCA"
  | "QUARTA"
  | "QUINTA"
  | "SEXTA"
  | "SABADO";

export type OvertimePolicyLimitSnapshot = {
  dailyLimitMinutesByDayType: Partial<Record<OvertimeDayType, number>>;
  monthlyLimitMinutes?: number;
  annualLimitMinutes?: number;
  normativeBasis?: string;
  allowSubmissionWithWarnings?: boolean;
};

export type OvertimeRequestedDayInput = {
  date: string;
  requestedMinutes: number;
  requestedStartTime?: string;
  requestedEndTime?: string;
  dayType?: OvertimeDayType;
  ratePercent?: string;
};

export type OvertimeValidationSeverity = "error" | "warning";

export type OvertimeValidationIssue = {
  code: string;
  severity: OvertimeValidationSeverity;
  message: string;
  date?: string;
  allowedMinutes?: number;
  requestedMinutes?: number;
  normativeBasis?: string;
};

export type OvertimeDateSelection = {
  mode: OvertimeDateSelectionMode;
  periodStart: string;
  periodEnd: string;
  explicitDates?: string[];
  weekday?: OvertimeWeekday;
  intervalDays?: number;
};

export type StatusAutorizacaoHoraExtra =
  | "RASCUNHO"
  | "REGISTRADA_NO_SECP"
  | "VIGENTE"
  | "EM_EXECUCAO"
  | "AGUARDANDO_CONFERENCIA"
  | "EM_CONFERENCIA"
  | "PENDENTE_AJUSTE"
  | "ATESTADA"
  | "CALCULADA"
  | "PRONTA_PARA_FOLHA"
  | "ENVIADA_PARA_FOLHA"
  | "PAGA"
  | "CANCELADA";

export type StatusServidorAutorizacaoHoraExtra =
  | "AUTORIZADO"
  | "SEM_EXECUCAO"
  | "EXECUCAO_EM_ANDAMENTO"
  | "PENDENTE_CONFERENCIA"
  | "PENDENTE_DECISAO_GESTOR"
  | "REGULAR"
  | "COM_DIVERGENCIA"
  | "ATESTADO"
  | "CALCULADO"
  | "PRONTO_PARA_FOLHA"
  | "PROCESSADO_EM_FOLHA"
  | "CANCELADO";
