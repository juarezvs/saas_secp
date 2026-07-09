import { z } from "zod";

import {
  criarDataUtc,
  dataEstaNoPeriodoRecesso,
  obterPeriodoRecessoPorAno,
} from "../services/recesso-forense.service";

export type RecessoFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Record<string, string | number | null | undefined>;
};

export const recessoForenseSchema = z
  .object({
    ano: z.coerce
      .number()
      .int("Informe um ano valido.")
      .min(2024, "Ano inicial inválido.")
      .max(2100, "Ano final inválido."),
    observacao: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .transform((data) => {
    const periodo = obterPeriodoRecessoPorAno(data.ano);

    return {
      ...data,
      dataInicio: periodo.inicio,
      dataFim: periodo.fim,
    };
  });

export const convocacaoRecessoSchema = z.object({
  recessoId: z.string().uuid("Recesso inválido."),
  numeroPortaria: z
    .string()
    .trim()
    .min(2, "Informe o número da portaria.")
    .max(120, "Número de portaria muito longo."),
  dataPortaria: z.string().optional().or(z.literal("")),
  unidadeId: z.string().uuid().optional().or(z.literal("")),
  chefiaResponsavelId: z.string().uuid().optional().or(z.literal("")),
  descricao: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const atualizarConvocacaoRecessoSchema =
  convocacaoRecessoSchema.extend({
    convocacaoId: z.string().uuid("Convocação inválida."),
  });

export const convocadoRecessoSchema = z
  .object({
    recessoId: z.string().uuid("Recesso inválido."),
    convocacaoId: z.string().uuid("Convocação inválida."),
    servidorId: z.string().uuid("Servidor inválido."),
    dataConvocacao: z.string().min(10, "Informe a data convocada."),
    minutosPrevistos: z.coerce
      .number()
      .int()
      .min(0, "Minutos previstos inválidos.")
      .max(1440, "Minutos previstos inválidos."),
    observacao: z.string().trim().max(1000).optional().or(z.literal("")),
    anoRecesso: z.coerce.number().int(),
  })
  .superRefine((data, ctx) => {
    const dataConvocacao = criarDataUtc(data.dataConvocacao);

    if (!dataEstaNoPeriodoRecesso(dataConvocacao, data.anoRecesso)) {
      ctx.addIssue({
        code: "custom",
        path: ["dataConvocacao"],
        message: "A data deve estar entre 20/12 e 06/01 do recesso.",
      });
    }
  });

export const convocadoRecessoLoteSchema = z
  .object({
    recessoId: z.string().uuid("Recesso inválido."),
    convocacaoId: z.string().uuid("Convocação inválida."),
    servidorId: z.string().uuid("Servidor inválido."),
    minutosPrevistos: z.coerce
      .number()
      .int()
      .min(0, "Minutos previstos inválidos.")
      .max(1440, "Minutos previstos inválidos."),
    observacao: z.string().trim().max(1000).optional().or(z.literal("")),
    anoRecesso: z.coerce.number().int(),
    diasConvocados: z
      .array(
        z.object({
          dataConvocacao: z.string().min(10, "Data convocada inválida."),
          escolha: z.enum(["PECUNIA", "FOLGA"], {
            error: "Escolha pecúnia ou folga.",
          }),
        }),
      )
      .min(1, "Selecione ao menos uma data do recesso."),
  })
  .superRefine((data, ctx) => {
    data.diasConvocados.forEach((dia, index) => {
      const dataConvocacao = criarDataUtc(dia.dataConvocacao);

      if (!dataEstaNoPeriodoRecesso(dataConvocacao, data.anoRecesso)) {
        ctx.addIssue({
          code: "custom",
          path: ["diasConvocados", index, "dataConvocacao"],
          message: "A data deve estar entre 20/12 e 06/01 do recesso.",
        });
      }
    });
  });

export const escolhaRecessoSchema = z.object({
  convocadoId: z.string().uuid("Convocação inválida."),
  escolha: z.enum(["PECUNIA", "FOLGA"], {
    error: "Escolha pecúnia ou folga.",
  }),
});

export const fecharRecessoSchema = z.object({
  recessoId: z.string().uuid("Recesso inválido."),
  servidorId: z.string().uuid("Servidor inválido."),
  mesReferencia: z.coerce.number().int().refine((mes) => mes === 12 || mes === 1, {
    message: "Fechamento permitido apenas para dezembro ou janeiro.",
  }),
  observacaoServidor: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const homologarRecessoSchema = z.object({
  homologacaoId: z.string().uuid("Homologação inválida."),
  observacaoChefia: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const devolverHomologacaoRecessoSchema = homologarRecessoSchema;

export const aceitarRecessoSecadSchema = z.object({
  homologacaoId: z.string().uuid("Homologação inválida."),
  observacaoSecad: z.string().trim().max(2000).optional().or(z.literal("")),
});
