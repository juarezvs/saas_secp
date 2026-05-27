import { z } from "zod";

export const tiposJornada = ["SETE_HORAS", "OITO_HORAS", "ESPECIAL"] as const;

function validarHoraHHMM(valor: string | undefined | null) {
  if (!valor) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

export const jornadaSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(2, "Informe um código.")
      .max(80, "O código deve ter no máximo 80 caracteres.")
      .regex(/^[A-Z0-9_]+$/, "Use letras maiúsculas, números e underscore."),
    nome: z
      .string()
      .trim()
      .min(3, "Informe o nome da jornada.")
      .max(150, "O nome deve ter no máximo 150 caracteres."),
    descricao: z.string().trim().max(1000).optional().or(z.literal("")),
    tipo: z.enum(tiposJornada, {
      error: "Informe o tipo de jornada.",
    }),
    cargaDiariaMinutos: z.coerce
      .number()
      .int()
      .min(60, "Carga mínima inválida.")
      .max(720, "Carga diária máxima inválida."),
    exigeIntervalo: z.coerce.boolean().default(false),
    intervaloMinimoMinutos: z.coerce.number().int().optional().nullable(),
    intervaloMaximoMinutos: z.coerce.number().int().optional().nullable(),
    horarioEntradaPadrao: z.string().optional().or(z.literal("")),
    horarioSaidaPadrao: z.string().optional().or(z.literal("")),
    horarioDiferenciadoPermitido: z.coerce.boolean().default(false),
    entradaMinimaDiferenciada: z.string().optional().or(z.literal("")),
    saidaMaximaDiferenciada: z.string().optional().or(z.literal("")),
    ativo: z.coerce.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const camposHora = [
      ["horarioEntradaPadrao", data.horarioEntradaPadrao],
      ["horarioSaidaPadrao", data.horarioSaidaPadrao],
      ["entradaMinimaDiferenciada", data.entradaMinimaDiferenciada],
      ["saidaMaximaDiferenciada", data.saidaMaximaDiferenciada],
    ] as const;

    for (const [campo, valor] of camposHora) {
      if (!validarHoraHHMM(valor)) {
        ctx.addIssue({
          code: "custom",
          path: [campo],
          message: "Informe a hora no formato HH:mm.",
        });
      }
    }

    if (data.tipo === "OITO_HORAS" && !data.exigeIntervalo) {
      ctx.addIssue({
        code: "custom",
        path: ["exigeIntervalo"],
        message: "Jornada de 8 horas deve exigir intervalo.",
      });
    }

    if (data.exigeIntervalo) {
      if (!data.intervaloMinimoMinutos || data.intervaloMinimoMinutos < 60) {
        ctx.addIssue({
          code: "custom",
          path: ["intervaloMinimoMinutos"],
          message: "O intervalo mínimo deve ser de pelo menos 60 minutos.",
        });
      }

      if (!data.intervaloMaximoMinutos || data.intervaloMaximoMinutos > 180) {
        ctx.addIssue({
          code: "custom",
          path: ["intervaloMaximoMinutos"],
          message: "O intervalo máximo não pode superar 180 minutos.",
        });
      }

      if (
        data.intervaloMinimoMinutos &&
        data.intervaloMaximoMinutos &&
        data.intervaloMaximoMinutos < data.intervaloMinimoMinutos
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["intervaloMaximoMinutos"],
          message: "O intervalo máximo não pode ser menor que o mínimo.",
        });
      }
    }
  });

export type JornadaInput = z.infer<typeof jornadaSchema>;

export type JornadaFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<JornadaInput>;
};