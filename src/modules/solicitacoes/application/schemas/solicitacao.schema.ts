import { z } from "zod";

export const tiposSolicitacao = [
  "AJUSTE_PONTO",
  "COMPENSACAO",
  "ABONO_JUSTIFICATIVA",
  "ATIVIDADE_EXTERNA",
  "VIAGEM_SERVICO",
  "CAPACITACAO",
  "DISPENSA_PONTO",
  "HORA_CREDITO_PREVIA",
] as const;

export const tiposMarcacaoAjuste = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA",
] as const;

export const criarSolicitacaoSchema = z
  .object({
    tipo: z.enum(tiposSolicitacao, {
      error: "Informe o tipo da solicitação.",
    }),
    titulo: z
      .string()
      .trim()
      .min(5, "Informe um título com pelo menos 5 caracteres.")
      .max(180, "O título deve ter no máximo 180 caracteres."),
    descricao: z
      .string()
      .trim()
      .min(10, "Descreva a solicitação com mais detalhes.")
      .max(3000, "A descrição deve ter no máximo 3000 caracteres."),
    dataReferencia: z.string().optional().or(z.literal("")),
    dataInicio: z.string().optional().or(z.literal("")),
    dataFim: z.string().optional().or(z.literal("")),

    tipoMarcacao: z.string().optional().or(z.literal("")),
    horaAjuste: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "AJUSTE_PONTO") {
      if (!data.dataReferencia) {
        ctx.addIssue({
          code: "custom",
          path: ["dataReferencia"],
          message: "Informe a data do ajuste.",
        });
      }

      if (!data.tipoMarcacao) {
        ctx.addIssue({
          code: "custom",
          path: ["tipoMarcacao"],
          message: "Informe o tipo de marcação a ajustar.",
        });
      }

      if (!data.horaAjuste) {
        ctx.addIssue({
          code: "custom",
          path: ["horaAjuste"],
          message: "Informe o horário solicitado.",
        });
      }
    }

    if (
      ["COMPENSACAO", "ATIVIDADE_EXTERNA", "VIAGEM_SERVICO", "CAPACITACAO"].includes(
        data.tipo
      )
    ) {
      if (!data.dataInicio) {
        ctx.addIssue({
          code: "custom",
          path: ["dataInicio"],
          message: "Informe a data/hora inicial.",
        });
      }

      if (!data.dataFim) {
        ctx.addIssue({
          code: "custom",
          path: ["dataFim"],
          message: "Informe a data/hora final.",
        });
      }
    }
  });

export const analisarSolicitacaoSchema = z.object({
  resultado: z.enum(["DEFERIR", "INDEFERIR"], {
    error: "Informe o resultado da análise.",
  }),
  justificativaAnalise: z
    .string()
    .trim()
    .min(5, "Informe a justificativa da análise.")
    .max(3000, "A justificativa deve ter no máximo 3000 caracteres."),
});

export type CriarSolicitacaoInput = z.infer<typeof criarSolicitacaoSchema>;
export type AnalisarSolicitacaoInput = z.infer<typeof analisarSolicitacaoSchema>;

export type CriarSolicitacaoFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<CriarSolicitacaoInput>;
};

export type AnalisarSolicitacaoFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<AnalisarSolicitacaoInput>;
};