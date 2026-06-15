import { z } from "zod";

export const jornadaServidorSchema = z.object({
  servidorId: z.string().uuid("Servidor inválido."),
  jornadaId: z.string().uuid("Informe a jornada."),
  escalaId: z.string().uuid("Escala inválida.").optional().or(z.literal("")),
  dataInicio: z.string().min(1, "Informe a data de início."),
  dataFim: z.string().optional().or(z.literal("")),
  horarioDiferenciadoAutorizado: z.coerce.boolean().default(false),
  justificativa: z.string().trim().max(1000).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (
    data.horarioDiferenciadoAutorizado &&
    (!data.justificativa || data.justificativa.length < 10)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["justificativa"],
      message:
        "Informe a autorização ou justificativa formal do horário diferenciado.",
    });
  }
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
    horarioDiferenciadoAutorizado?: boolean;
    justificativa?: string;
  };
};
