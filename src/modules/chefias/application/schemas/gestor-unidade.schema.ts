import { z } from "zod";

export const papeisGestao = [
  "GESTOR_TITULAR",
  "GESTOR_SUBSTITUTO",
  "DELEGADO_CHEFIA",
] as const;

export const gestorUnidadeSchema = z.object({
  unidadeId: z.string().uuid("Unidade inválida."),
  servidorId: z.string().uuid("Informe o servidor."),
  papel: z.enum(papeisGestao, {
    error: "Informe o papel de gestão.",
  }),
  dataInicio: z.string().min(1, "Informe a data de início."),
  dataFim: z.string().optional().or(z.literal("")),
  ativo: z.coerce.boolean().default(true),
});

export type GestorUnidadeInput = z.infer<typeof gestorUnidadeSchema>;

export type GestorUnidadeFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: {
    unidadeId?: string;
    servidorId?: string;
    papel?: string;
    dataInicio?: string;
    dataFim?: string;
    ativo?: boolean;
  };
};