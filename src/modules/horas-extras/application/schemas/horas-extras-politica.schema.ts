import { z } from "zod";

export const configurarPoliticaHorasExtrasSchema = z.object({
  orgaoId: z.string().uuid("Informe o orgao."),
  scopeUnitId: z
    .string()
    .uuid("Informe uma seccional/unidade valida.")
    .optional()
    .or(z.literal("")),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data inicial."),
  maxDailyWeekdayMinutes: z.coerce.number().int().min(0),
  maxDailyWeekendHolidayMinutes: z.coerce.number().int().min(0),
  maxMonthlyMinutes: z.coerce.number().int().min(0),
  maxAnnualMinutes: z.coerce.number().int().min(0),
  divisorMinutes: z.coerce.number().int().min(1),
  rateDiaUtil: z.coerce.number().min(0),
  rateSabado: z.coerce.number().min(0),
  rateDomingo: z.coerce.number().min(0),
  rateFeriado: z.coerce.number().min(0),
  workflowConfig: z.string().optional(),
});

export type ConfigurarPoliticaHorasExtrasInput = z.infer<
  typeof configurarPoliticaHorasExtrasSchema
>;

export type ConfigurarPoliticaHorasExtrasFormState = {
  sucesso: boolean;
  mensagem?: string;
  erros?: Record<string, string[]>;
  campos?: Partial<ConfigurarPoliticaHorasExtrasInput>;
};
