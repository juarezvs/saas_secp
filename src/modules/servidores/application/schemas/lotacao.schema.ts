import { z } from "zod";

export const tiposLotacao = ["TITULAR", "PROVISORIA", "SUBSTITUICAO"] as const;

export const lotacaoSchema = z.object({
  servidorId: z.string().uuid("Servidor inválido."),
  unidadeId: z.string().uuid("Informe a unidade de lotação."),
  tipo: z.enum(tiposLotacao, {
    error: "Informe o tipo de lotação.",
  }),
  dataInicio: z.string().min(1, "Informe a data de início."),
  dataFim: z.string().optional().or(z.literal("")),
});

export type LotacaoInput = z.infer<typeof lotacaoSchema>;

export type LotacaoFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: {
    unidadeId?: string;
    tipo?: string;
    dataInicio?: string;
    dataFim?: string;
  };
};
