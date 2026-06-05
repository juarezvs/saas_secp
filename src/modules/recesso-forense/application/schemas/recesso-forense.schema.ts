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
      .min(2024, "Ano inicial invalido.")
      .max(2100, "Ano final invalido."),
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
  recessoId: z.string().uuid("Recesso invalido."),
  numeroPortaria: z
    .string()
    .trim()
    .min(2, "Informe o numero da portaria.")
    .max(120, "Numero de portaria muito longo."),
  dataPortaria: z.string().optional().or(z.literal("")),
  unidadeId: z.string().uuid().optional().or(z.literal("")),
  chefiaResponsavelId: z.string().uuid().optional().or(z.literal("")),
  descricao: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const convocadoRecessoSchema = z
  .object({
    recessoId: z.string().uuid("Recesso invalido."),
    convocacaoId: z.string().uuid("Convocacao invalida."),
    servidorId: z.string().uuid("Servidor invalido."),
    dataConvocacao: z.string().min(10, "Informe a data convocada."),
    minutosPrevistos: z.coerce
      .number()
      .int()
      .min(0, "Minutos previstos invalidos.")
      .max(1440, "Minutos previstos invalidos."),
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
    recessoId: z.string().uuid("Recesso invalido."),
    convocacaoId: z.string().uuid("Convocacao invalida."),
    servidorId: z.string().uuid("Servidor invalido."),
    minutosPrevistos: z.coerce
      .number()
      .int()
      .min(0, "Minutos previstos invalidos.")
      .max(1440, "Minutos previstos invalidos."),
    observacao: z.string().trim().max(1000).optional().or(z.literal("")),
    anoRecesso: z.coerce.number().int(),
    diasConvocados: z
      .array(
        z.object({
          dataConvocacao: z.string().min(10, "Data convocada invalida."),
          escolha: z.enum(["PECUNIA", "FOLGA"], {
            error: "Escolha pecunia ou folga.",
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
  convocadoId: z.string().uuid("Convocacao invalida."),
  escolha: z.enum(["PECUNIA", "FOLGA"], {
    error: "Escolha pecunia ou folga.",
  }),
});

export const fecharRecessoSchema = z.object({
  recessoId: z.string().uuid("Recesso invalido."),
  servidorId: z.string().uuid("Servidor invalido."),
  mesReferencia: z.coerce.number().int().refine((mes) => mes === 12 || mes === 1, {
    message: "Fechamento permitido apenas para dezembro ou janeiro.",
  }),
  observacaoServidor: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const homologarRecessoSchema = z.object({
  homologacaoId: z.string().uuid("Homologacao invalida."),
  observacaoChefia: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const devolverHomologacaoRecessoSchema = homologarRecessoSchema;

export const aceitarRecessoSecadSchema = z.object({
  homologacaoId: z.string().uuid("Homologacao invalida."),
  observacaoSecad: z.string().trim().max(2000).optional().or(z.literal("")),
});
