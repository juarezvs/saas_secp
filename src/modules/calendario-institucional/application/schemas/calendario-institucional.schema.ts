import { z } from "zod";

export const tiposCalendarioInstitucional = [
  "FERIADO",
  "PONTO_FACULTATIVO",
  "SUSPENSAO_EXPEDIENTE",
] as const;

function validarDataIso(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

export const calendarioInstitucionalSchema = z.object({
  dataReferencia: z
    .string()
    .trim()
    .refine(validarDataIso, "Informe a data no formato AAAA-MM-DD."),
  descricao: z
    .string()
    .trim()
    .min(3, "Informe a descrição do evento.")
    .max(200, "A descrição deve ter no máximo 200 caracteres."),
  tipo: z.enum(tiposCalendarioInstitucional, {
    error: "Informe o tipo do evento institucional.",
  }),
  contaComoDiaUtil: z.coerce.boolean().default(false),
  geraApuracaoRegular: z.coerce.boolean().default(false),
  observacao: z.string().trim().max(2000).optional().or(z.literal("")),
  ativo: z.coerce.boolean().default(true),
});

export type CalendarioInstitucionalInput = z.infer<
  typeof calendarioInstitucionalSchema
>;

export type CalendarioInstitucionalFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<CalendarioInstitucionalInput>;
};
