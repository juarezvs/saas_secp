import { z } from "zod";

export const analisarHorasExtrasChefiaSchema = z.object({
  requestId: z.string().uuid("Solicitacao invalida."),
  action: z.enum(["RETURN", "REJECT", "FORWARD_BUDGET"]),
  reason: z.string().trim().min(5, "Informe uma justificativa com pelo menos 5 caracteres."),
});

export type AnalisarHorasExtrasChefiaInput = z.infer<
  typeof analisarHorasExtrasChefiaSchema
>;

export type AnalisarHorasExtrasChefiaFormState = {
  sucesso: boolean;
  mensagem?: string;
  erros?: Record<string, string[]>;
  campos?: Partial<AnalisarHorasExtrasChefiaInput>;
};

