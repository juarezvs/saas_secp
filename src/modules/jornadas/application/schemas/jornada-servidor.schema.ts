import { z } from "zod";

export const tiposVinculacaoJornadaServidor = [
  "PERMANENTE",
  "TEMPORARIA",
  "CARGO_CATEGORIA",
  "UNIDADE",
  "SECCIONAL",
  "PADRAO_ORGAO",
] as const;

export const jornadaServidorSchema = z
  .object({
    servidorId: z.string().uuid("Servidor invalido."),
    jornadaId: z.string().uuid("Informe a jornada."),
    escalaId: z.string().uuid("Escala invalida.").optional().or(z.literal("")),
    dataInicio: z.string().min(1, "Informe a data de inicio."),
    dataFim: z.string().optional().or(z.literal("")),
    tipoVinculacao: z
      .enum(tiposVinculacaoJornadaServidor)
      .default("PERMANENTE"),
    motivo: z.string().trim().max(250).optional().or(z.literal("")),
    fundamentoDocumental: z
      .string()
      .trim()
      .max(250)
      .optional()
      .or(z.literal("")),
    documentoSei: z.string().trim().max(80).optional().or(z.literal("")),
    autoridadeResponsavel: z
      .string()
      .trim()
      .max(150)
      .optional()
      .or(z.literal("")),
    horarioDiferenciadoAutorizado: z.coerce.boolean().default(false),
    justificativa: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (
      data.horarioDiferenciadoAutorizado &&
      (!data.justificativa || data.justificativa.length < 10)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["justificativa"],
        message:
          "Informe a autorizacao ou justificativa formal do horario diferenciado.",
      });
    }

    if (
      (data.tipoVinculacao === "TEMPORARIA" || data.dataFim) &&
      !data.fundamentoDocumental &&
      !data.documentoSei &&
      (!data.justificativa || data.justificativa.length < 10)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fundamentoDocumental"],
        message:
          "Informe o fundamento, documento SEI ou justificativa da vinculacao temporaria.",
      });
    }
  });

export type JornadaServidorInput = z.infer<typeof jornadaServidorSchema>;

export type JornadaServidorFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<Omit<JornadaServidorInput, "tipoVinculacao">> & {
    tipoVinculacao?: string;
  };
};
