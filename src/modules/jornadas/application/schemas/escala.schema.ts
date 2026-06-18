import { z } from "zod";

export const tiposEscala = ["SEMANAL", "REVEZAMENTO", "INDIVIDUAL"] as const;

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
  diaSemana: z.enum(diasSemana),
  trabalha: z.coerce.boolean().default(false),
  horarioEntrada: z.string().optional().or(z.literal("")),
  horarioSaida: z.string().optional().or(z.literal("")),
  intervaloInicio: z.string().optional().or(z.literal("")),
  intervaloFim: z.string().optional().or(z.literal("")),
  cargaPrevistaMinutos: z.coerce.number().int().min(0).max(720),
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
    ativo: z.coerce.boolean().default(true),
    dias: z.array(escalaDiaSchema).length(7),
  })
  .superRefine((data, ctx) => {
    if (!data.dias.some((dia) => dia.trabalha)) {
      ctx.addIssue({
        code: "custom",
        path: ["dias"],
        message: "Informe pelo menos um dia trabalhado na escala.",
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
