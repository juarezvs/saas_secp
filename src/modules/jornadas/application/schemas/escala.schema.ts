import { z } from "zod";

export const tiposEscala = [
  "SEMANAL",
  "REVEZAMENTO",
  "INDIVIDUAL",
  "CICLICA",
  "PLANEJADA",
  "TURNO_FIXO",
  "TURNO_ALTERNANTE",
] as const;

export const diasSemana = [
  "DOMINGO",
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
] as const;

export const escalaDiaSchema = z.object({
  diaSemana: z.enum(diasSemana).optional().or(z.literal("")),
  posicaoCiclo: z.coerce.number().int().min(1).optional().nullable(),
  tipoDia: z
    .enum(["TRABALHO", "FOLGA", "PLANTAO", "COMPENSADO", "SEM_EXPEDIENTE"])
    .default("TRABALHO"),
  trabalha: z.coerce.boolean().default(false),
  horarioEntrada: z.string().optional().or(z.literal("")),
  horarioSaida: z.string().optional().or(z.literal("")),
  intervaloInicio: z.string().optional().or(z.literal("")),
  intervaloFim: z.string().optional().or(z.literal("")),
  cargaPrevistaMinutos: z.coerce.number().int().min(0).max(720),
  cruzaMeiaNoite: z.coerce.boolean().default(false),
});

export const escalaSchema = z
  .object({
    jornadaId: z.string().uuid("Jornada invalida."),
    codigo: z
      .string()
      .trim()
      .min(2, "Informe um codigo.")
      .max(80, "O codigo deve ter no maximo 80 caracteres.")
      .regex(/^[A-Z0-9_]+$/, "Use letras maiusculas, numeros e underscore."),
    nome: z
      .string()
      .trim()
      .min(3, "Informe o nome da escala.")
      .max(150, "O nome deve ter no maximo 150 caracteres."),
    descricao: z.string().trim().max(1000).optional().or(z.literal("")),
    tipo: z.enum(tiposEscala, {
      error: "Informe o tipo da escala.",
    }),
    quantidadeDiasCiclo: z.coerce.number().int().min(1).max(90).optional().nullable(),
    dataAncoragem: z.string().optional().or(z.literal("")),
    primeiroDiaTrabalho: z.string().optional().or(z.literal("")),
    timezone: z.string().trim().max(80).optional().or(z.literal("")),
    ativo: z.coerce.boolean().default(true),
    dias: z.array(escalaDiaSchema).min(1).max(90),
  })
  .superRefine((data, ctx) => {
    if (!data.dias.some((dia) => dia.trabalha)) {
      ctx.addIssue({
        code: "custom",
        path: ["dias"],
        message: "Informe pelo menos um dia trabalhado na escala.",
      });
    }

    const escalaCiclica = ["CICLICA", "REVEZAMENTO", "TURNO_ALTERNANTE"].includes(
      data.tipo,
    );

    if (escalaCiclica && !data.quantidadeDiasCiclo) {
      ctx.addIssue({
        code: "custom",
        path: ["quantidadeDiasCiclo"],
        message: "Informe a quantidade de dias do ciclo.",
      });
    }

    if (escalaCiclica && !data.dataAncoragem && !data.primeiroDiaTrabalho) {
      ctx.addIssue({
        code: "custom",
        path: ["dataAncoragem"],
        message: "Informe a data de ancoragem do ciclo.",
      });
    }

    if (!escalaCiclica && data.dias.length !== 7) {
      ctx.addIssue({
        code: "custom",
        path: ["dias"],
        message: "Escala semanal deve conter os 7 dias da semana.",
      });
    }

    if (
      escalaCiclica &&
      data.quantidadeDiasCiclo &&
      data.dias.length !== data.quantidadeDiasCiclo
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dias"],
        message: "A quantidade de dias deve corresponder ao tamanho do ciclo.",
      });
    }
  });

export type EscalaInput = z.infer<typeof escalaSchema>;

export type EscalaFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<EscalaInput>;
};
