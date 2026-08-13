import { z } from "zod";

const horarioSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horario HH:mm valido.");

const competenciaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Informe a competencia no formato AAAA-MM.");

const dataIsoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data no formato AAAA-MM-DD.");

export const regraAutorizacaoHoraExtraSecapSchema = z
  .object({
    data: dataIsoSchema.optional(),
    tipoDia: z
      .enum([
        "DIA_UTIL",
        "SABADO",
        "DOMINGO",
        "FERIADO_NACIONAL",
        "FERIADO_ESTADUAL",
        "FERIADO_MUNICIPAL",
        "FERIADO_REGIMENTAL",
        "PONTO_FACULTATIVO",
        "RECESSO",
        "FOLGA_DE_ESCALA",
      ])
      .optional(),
    limiteMinutos: z.coerce.number().int().positive().optional(),
    faixaInicio: horarioSchema.optional(),
    faixaFim: horarioSchema.optional(),
  })
  .refine((regra) => regra.data || regra.tipoDia || regra.limiteMinutos, {
    message: "Informe data, tipo de dia ou limite para a regra.",
  });

export const servidorAutorizacaoHoraExtraSecapSchema = z
  .object({
    servidorId: z.string().uuid(),
    unidadeId: z.string().uuid(),
    periodoInicio: dataIsoSchema,
    periodoFim: dataIsoSchema,
    quantidadeMaximaMinutos: z.coerce.number().int().positive(),
    limitesPorTipoDia: z
      .record(z.string(), z.coerce.number().int().nonnegative())
      .optional(),
    regras: z.array(regraAutorizacaoHoraExtraSecapSchema).default([]),
  })
  .refine((servidor) => servidor.periodoInicio <= servidor.periodoFim, {
    message: "O periodo inicial do servidor nao pode ser posterior ao final.",
    path: ["periodoInicio"],
  });

export const registrarAutorizacaoHoraExtraSecapSchema = z
  .object({
    orgaoId: z.string().uuid(),
    unidadeId: z.string().uuid(),
    processoSei: z.string().trim().min(1).max(80),
    documentoAutorizacao: z.string().trim().min(1).max(160),
    mesReferencia: competenciaSchema,
    dataAutorizacao: dataIsoSchema,
    autoridadeAutorizadora: z.string().trim().max(200).optional(),
    observacoes: z.string().trim().optional(),
    origemDocumento: z.string().trim().max(200).optional(),
    modalidade: z.enum([
      "PERIODO",
      "DATAS_ESPECIFICAS",
      "PERIODO_QUANTIDADE_GLOBAL",
      "PERIODO_LIMITE_TIPO_DIA",
    ]),
    confirmarRegistro: z.coerce.boolean().default(true),
    servidores: z.array(servidorAutorizacaoHoraExtraSecapSchema).min(1),
  })
  .refine(
    (autorizacao) =>
      autorizacao.servidores.every(
        (servidor) =>
          servidor.periodoInicio.slice(0, 7) <= autorizacao.mesReferencia &&
          servidor.periodoFim.slice(0, 7) >= autorizacao.mesReferencia,
      ),
    {
      message:
        "Ao menos parte do periodo autorizado de cada servidor deve alcançar o mes de referencia.",
      path: ["servidores"],
    },
  );

export type RegistrarAutorizacaoHoraExtraSecapInput = z.infer<
  typeof registrarAutorizacaoHoraExtraSecapSchema
>;

export type RegistrarAutorizacaoHoraExtraSecapFormState = {
  sucesso: boolean;
  mensagem: string;
  autorizacaoId?: string;
  erros?: Record<string, string[] | undefined>;
  campos?: Partial<RegistrarAutorizacaoHoraExtraSecapInput>;
};
