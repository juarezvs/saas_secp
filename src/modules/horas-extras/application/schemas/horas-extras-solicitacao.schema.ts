import { z } from "zod";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");
const horaMinuto = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe o tempo no formato HH:mm.");

export const criarSolicitacaoHorasExtrasSchema = z.object({
  requestId: z.string().uuid().optional().or(z.literal("")),
  periodStart: dateOnly,
  periodEnd: dateOnly,
  justification: z
    .string()
    .trim()
    .min(10, "Informe uma justificativa com pelo menos 10 caracteres."),
  activitiesDescription: z
    .string()
    .trim()
    .min(10, "Informe as atividades previstas."),
  paymentDestination: z.enum(["PECUNIA", "BANCO_DE_HORAS", "A_DEFINIR"]),
  days: z
    .array(
      z.object({
        date: dateOnly,
        requestedTime: horaMinuto,
        requestedMinutes: z
          .number()
          .int("Informe minutos inteiros.")
          .positive("Informe uma quantidade maior que zero."),
        paymentDestination: z.enum(["PECUNIA", "BANCO_DE_HORAS"]),
      }),
    )
    .min(1, "Informe ao menos uma data solicitada."),
  intent: z.enum(["draft", "submit"]),
});

export type CriarSolicitacaoHorasExtrasInput = z.infer<
  typeof criarSolicitacaoHorasExtrasSchema
>;

export type CriarSolicitacaoHorasExtrasFormState = {
  sucesso: boolean;
  mensagem?: string;
  erros?: Record<string, string[]>;
  campos?: Partial<CriarSolicitacaoHorasExtrasInput>;
};
