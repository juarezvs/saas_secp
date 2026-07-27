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
  "FOLGA_BANCO_HORAS",
] as const;

export const tiposMarcacaoAjuste = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA",
] as const;

export const tiposCompensacaoBancoHoras = [
  "UTILIZAR_CREDITO",
  "COMPENSAR_DEBITO",
] as const;

export const tiposRegimeTrabalhoRemoto = [
  "NAO_SE_APLICA",
  "TOTAL",
  "HIBRIDO",
] as const;

export const modalidadesCapacitacao = ["EXTERNA", "INTERNA"] as const;

export const diasSemanaRegimeHibrido = [
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
] as const;

export const criarSolicitacaoSchema = z
  .object({
    tipo: z.enum(tiposSolicitacao, {
      error: "Informe o tipo da solicitacao.",
    }),
    titulo: z
      .string()
      .trim()
      .min(5, "Informe um titulo com pelo menos 5 caracteres.")
      .max(180, "O titulo deve ter no maximo 180 caracteres."),
    descricao: z
      .string()
      .trim()
      .min(10, "Descreva a solicitacao com mais detalhes.")
      .max(3000, "A descricao deve ter no maximo 3000 caracteres."),
    dataReferencia: z.string().optional().or(z.literal("")),
    dataInicio: z.string().optional().or(z.literal("")),
    dataFim: z.string().optional().or(z.literal("")),

    tipoMarcacao: z.string().optional().or(z.literal("")),
    horaAjuste: z.string().optional().or(z.literal("")),
    tipoCompensacao: z
      .enum(tiposCompensacaoBancoHoras)
      .optional()
      .or(z.literal("")),
    horasSolicitadas: z.coerce
      .number()
      .positive("Informe uma quantidade de horas maior que zero.")
      .max(16, "A autorizacao nao pode exceder 16 horas.")
      .optional(),
    regimeTrabalhoRemotoTipo: z
      .enum(tiposRegimeTrabalhoRemoto)
      .default("NAO_SE_APLICA"),
    diasRemotos: z.array(z.enum(diasSemanaRegimeHibrido)).default([]),
    modalidadeCapacitacao: z
      .enum(modalidadesCapacitacao)
      .optional()
      .or(z.literal("")),
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
          message: "Informe o tipo de marcacao a ajustar.",
        });
      }

      if (!data.horaAjuste) {
        ctx.addIssue({
          code: "custom",
          path: ["horaAjuste"],
          message: "Informe o horario solicitado.",
        });
      }
    }

    if (
      [
        "COMPENSACAO",
        "HORA_CREDITO_PREVIA",
        "ABONO_JUSTIFICATIVA",
        "ATIVIDADE_EXTERNA",
        "VIAGEM_SERVICO",
        "CAPACITACAO",
        "DISPENSA_PONTO",
        "FOLGA_BANCO_HORAS",
      ].includes(data.tipo)
    ) {
      if (!data.dataInicio) {
        ctx.addIssue({
          code: "custom",
          path: ["dataInicio"],
          message: "Informe a data inicial.",
        });
      }

      if (!data.dataFim) {
        ctx.addIssue({
          code: "custom",
          path: ["dataFim"],
          message: "Informe a data final.",
        });
      }

      if (
        data.dataInicio &&
        data.dataFim &&
        (/^\d{4}-\d{2}-\d{2}$/.test(data.dataInicio) &&
        /^\d{4}-\d{2}-\d{2}$/.test(data.dataFim)
          ? new Date(data.dataFim) < new Date(data.dataInicio)
          : new Date(data.dataFim) <= new Date(data.dataInicio))
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["dataFim"],
          message: "A data final deve ser posterior a inicial.",
        });
      }
    }

    if (data.tipo === "HORA_CREDITO_PREVIA") {
      if (!data.horasSolicitadas) {
        ctx.addIssue({
          code: "custom",
          path: ["horasSolicitadas"],
          message: "Informe a quantidade de horas que depende de autorizacao.",
        });
      }
    }

    if (data.tipo === "COMPENSACAO" && !data.tipoCompensacao) {
      ctx.addIssue({
        code: "custom",
        path: ["tipoCompensacao"],
        message: "Informe a modalidade da compensacao.",
      });
    }

    if (data.tipo === "CAPACITACAO" && !data.modalidadeCapacitacao) {
      ctx.addIssue({
        code: "custom",
        path: ["modalidadeCapacitacao"],
        message: "Informe se a capacitacao e interna ou externa.",
      });
    }

    if (
      data.tipo === "DISPENSA_PONTO" &&
      data.regimeTrabalhoRemotoTipo === "HIBRIDO" &&
      data.diasRemotos.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["diasRemotos"],
        message: "Informe pelo menos um dia remoto para o regime hibrido.",
      });
    }
  });

export const analisarSolicitacaoSchema = z.object({
  resultado: z.enum(["DEFERIR", "INDEFERIR", "DEVOLVER_AJUSTES"], {
    error: "Informe o resultado da analise.",
  }),
  justificativaAnalise: z
    .string()
    .trim()
    .min(5, "Informe a justificativa da analise.")
    .max(3000, "A justificativa deve ter no maximo 3000 caracteres."),
});

export type CriarSolicitacaoInput = z.infer<typeof criarSolicitacaoSchema>;
export type AnalisarSolicitacaoInput = z.infer<
  typeof analisarSolicitacaoSchema
>;

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
