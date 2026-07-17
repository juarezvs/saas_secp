import { z } from "zod";

const decimalOpcional = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value.replace(",", ".") : undefined))
  .refine(
    (value) => value === undefined || /^\d+(\.\d{1,2})?$/.test(value),
    "Informe um valor monetario valido.",
  );

export const registrarDeliberacaoHorasExtrasSchema = z.object({
  requestId: z.string().uuid("Solicitacao invalida."),
  result: z.enum(["APPROVED", "PARTIALLY_APPROVED", "REJECTED", "RETURNED"]),
  approvedMinutes: z.coerce
    .number()
    .int("Informe minutos inteiros.")
    .min(0, "Informe valor maior ou igual a zero."),
  estimatedAmount: decimalOpcional,
  seiProcessReference: z.string().trim().optional(),
  justification: z
    .string()
    .trim()
    .min(5, "Informe justificativa com pelo menos 5 caracteres."),
});

export type RegistrarDeliberacaoHorasExtrasInput = z.infer<
  typeof registrarDeliberacaoHorasExtrasSchema
>;

export type RegistrarDeliberacaoHorasExtrasFormState = {
  sucesso: boolean;
  mensagem?: string;
  erros?: Record<string, string[]>;
  campos?: Partial<RegistrarDeliberacaoHorasExtrasInput>;
};
