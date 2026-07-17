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

export const registrarParecerOrcamentarioHorasExtrasSchema = z.object({
  requestId: z.string().uuid("Solicitacao invalida."),
  result: z.enum([
    "AVAILABLE",
    "PARTIALLY_AVAILABLE",
    "UNAVAILABLE",
    "NEEDS_INFORMATION",
  ]),
  estimatedAmount: decimalOpcional,
  availableAmount: decimalOpcional,
  reservedAmount: decimalOpcional,
  approvedMinutes: z.coerce
    .number()
    .int("Informe minutos inteiros.")
    .min(0, "Informe valor maior ou igual a zero.")
    .optional(),
  budgetActionCode: z.string().trim().optional(),
  budgetPlanCode: z.string().trim().optional(),
  commitmentReference: z.string().trim().optional(),
  seiProcessReference: z.string().trim().optional(),
  notes: z.string().trim().min(5, "Informe observacao com pelo menos 5 caracteres."),
});

export type RegistrarParecerOrcamentarioHorasExtrasInput = z.infer<
  typeof registrarParecerOrcamentarioHorasExtrasSchema
>;

export type RegistrarParecerOrcamentarioHorasExtrasFormState = {
  sucesso: boolean;
  mensagem?: string;
  erros?: Record<string, string[]>;
  campos?: Partial<RegistrarParecerOrcamentarioHorasExtrasInput>;
};

