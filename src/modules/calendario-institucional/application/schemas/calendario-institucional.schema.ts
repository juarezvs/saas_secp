import { z } from "zod";

export const tiposCalendarioInstitucional = [
  "FERIADO",
  "PONTO_FACULTATIVO",
  "SUSPENSAO_EXPEDIENTE",
] as const;

const HORA_REGEX = /^\d{2}:\d{2}$/;

function validarDataIso(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function minutosHora(valor: string) {
  const [horas, minutos] = valor.split(":").map(Number);
  return horas * 60 + minutos;
}

function horaValida(valor: string) {
  if (!HORA_REGEX.test(valor)) {
    return false;
  }

  const [horas, minutos] = valor.split(":").map(Number);
  return horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59;
}

export const calendarioInstitucionalSchema = z
  .object({
    dataReferencia: z
      .string()
      .trim()
      .refine(validarDataIso, "Informe a data no formato AAAA-MM-DD."),
    descricao: z
      .string()
      .trim()
      .min(3, "Informe a descricao do evento.")
      .max(200, "A descricao deve ter no maximo 200 caracteres."),
    tipo: z.enum(tiposCalendarioInstitucional, {
      error: "Informe o tipo do evento institucional.",
    }),
    contaComoDiaUtil: z.coerce.boolean().default(false),
    geraApuracaoRegular: z.coerce.boolean().default(false),
    janelaInicio: z.string().trim().optional().or(z.literal("")),
    janelaFim: z.string().trim().optional().or(z.literal("")),
    dataOriginal: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (valor) => !valor || validarDataIso(valor),
        "Informe a data original no formato AAAA-MM-DD.",
      ),
    dataSubstituida: z.coerce.boolean().default(false),
    observacao: z.string().trim().max(2000).optional().or(z.literal("")),
    ativo: z.coerce.boolean().default(true),
  })
  .superRefine((dados, ctx) => {
    const temInicio = Boolean(dados.janelaInicio);
    const temFim = Boolean(dados.janelaFim);

    if (temInicio !== temFim) {
      ctx.addIssue({
        code: "custom",
        path: temInicio ? ["janelaFim"] : ["janelaInicio"],
        message: "Informe o inicio e o fim da janela especial.",
      });
    }

    if (dados.janelaInicio && !horaValida(dados.janelaInicio)) {
      ctx.addIssue({
        code: "custom",
        path: ["janelaInicio"],
        message: "Informe o horario inicial no formato HH:mm.",
      });
    }

    if (dados.janelaFim && !horaValida(dados.janelaFim)) {
      ctx.addIssue({
        code: "custom",
        path: ["janelaFim"],
        message: "Informe o horario final no formato HH:mm.",
      });
    }

    if (
      dados.janelaInicio &&
      dados.janelaFim &&
      horaValida(dados.janelaInicio) &&
      horaValida(dados.janelaFim) &&
      minutosHora(dados.janelaFim) <= minutosHora(dados.janelaInicio)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["janelaFim"],
        message: "O fim da janela deve ser posterior ao inicio.",
      });
    }

    if ((dados.janelaInicio || dados.janelaFim) && !dados.geraApuracaoRegular) {
      ctx.addIssue({
        code: "custom",
        path: ["geraApuracaoRegular"],
        message:
          "A janela especial exige apuracao regular ativa para o dia.",
      });
    }

    if (dados.dataSubstituida && !dados.dataOriginal) {
      ctx.addIssue({
        code: "custom",
        path: ["dataOriginal"],
        message: "Informe a data original do feriado ou ponto substituido.",
      });
    }
  });

export type CalendarioInstitucionalInput = z.infer<
  typeof calendarioInstitucionalSchema
>;

export type CalendarioInstitucionalFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<CalendarioInstitucionalInput>;
};
