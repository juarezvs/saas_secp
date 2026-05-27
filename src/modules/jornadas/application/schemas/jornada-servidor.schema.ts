import { z } from "zod";

export const jornadaServidorSchema = z.object({
  servidorId: z.string().uuid("Servidor inválido."),
  jornadaId: z.string().uuid("Informe a jornada."),
  escalaId: z.string().uuid("Escala inválida.").optional().or(z.literal("")),
  dataInicio: z.string().min(1, "Informe a data de início."),
  dataFim: z.string().optional().or(z.literal("")),
  justificativa: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type JornadaServidorInput = z.infer<typeof jornadaServidorSchema>;

export type JornadaServidorFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: {
    servidorId?: string;
    jornadaId?: string;
    escalaId?: string;
    dataInicio?: string;
    dataFim?: string;
    justificativa?: string;
  };
};