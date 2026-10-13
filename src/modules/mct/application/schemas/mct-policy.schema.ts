import { z } from "zod";

const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const condicaoMctSchema: z.ZodType = z.lazy(() =>
  z.union([
    z.object({ campo: z.string().min(1), operador: z.enum(["EQ", "NE", "GT", "GTE", "LT", "LTE", "IN"]), valor: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]) }),
    z.object({ operador: z.enum(["E", "OU"]), condicoes: z.array(condicaoMctSchema).min(1) }),
    z.object({ operador: z.literal("NAO"), condicao: condicaoMctSchema }),
  ]),
);

const quantidadeRubricaMctSchema = z.discriminatedUnion("estrategia", [
  z.object({ estrategia: z.literal("CONSTANTE"), minutos: z.number().int().min(0) }),
  z.object({ estrategia: z.literal("CAMPO"), campo: z.string().min(1).max(120) }),
]);

export const regraClassificacaoMctSchema = z.object({
  id: z.string().min(1).max(120),
  prioridade: z.number().int(),
  condicao: condicaoMctSchema,
  efeitos: z
    .array(
      z.object({
        rubricaCodigo: z.string().regex(/^[A-Z]{3}-[A-Z0-9-]+$/),
        escopoTemporal: z.string().min(1).max(160),
        quantidade: quantidadeRubricaMctSchema,
      }),
    )
    .min(1),
});

export const politicaMctSchema = z
  .object({
    id: z.uuid(),
    codigo: z.string().min(1).max(80),
    orgaoId: z.uuid(),
    versao: z.number().int().positive(),
    estado: z.enum(["RASCUNHO", "PUBLICADA", "INATIVA"]),
    vigenciaInicio: z.coerce.date(),
    vigenciaFim: z.coerce.date().nullable().optional(),
    cargaExigivelMinutos: z.number().int().min(0),
    horarioReferenciaInicio: hhmmSchema.nullable().optional(),
    horarioReferenciaFim: hhmmSchema.nullable().optional(),
    intervaloMinimoMinutos: z.number().int().min(0).nullable().optional(),
    intervaloMaximoMinutos: z.number().int().min(0).nullable().optional(),
    flexibilidadeEntradaMinutos: z.number().int().min(0).default(0),
    flexibilidadeSaidaMinutos: z.number().int().min(0).default(0),
    permiteCompensacaoNoDia: z.boolean().default(false),
    regras: z.array(regraClassificacaoMctSchema).default([]),
  })
  .refine(
    (valor) => !valor.vigenciaFim || valor.vigenciaFim >= valor.vigenciaInicio,
    { message: "Vigencia final deve ser posterior ao inicio." },
  )
  .refine(
    (valor) =>
      valor.intervaloMinimoMinutos == null ||
      valor.intervaloMaximoMinutos == null ||
      valor.intervaloMaximoMinutos >= valor.intervaloMinimoMinutos,
    { message: "Intervalo maximo deve ser maior ou igual ao minimo." },
  );

export const rubricaMctSchema = z.object({
  id: z.uuid(),
  codigo: z.string().regex(/^[A-Z]{3}-[A-Z0-9-]+$/),
  orgaoId: z.uuid().nullable(),
  versao: z.number().int().positive(),
  nome: z.string().min(1).max(160),
  descricao: z.string().min(1),
  dimensao: z.enum(["TEMPORAL", "JURIDICA_ADMINISTRATIVA", "DESTINACAO", "INCIDENCIA"]),
  natureza: z.string().min(1).max(80),
  unidade: z.enum(["MINUTO", "QUANTIDADE", "BOOLEANO"]),
  vigenciaInicio: z.coerce.date(),
  vigenciaFim: z.coerce.date().nullable().optional(),
  grupoExclusividade: z.string().max(80).nullable().optional(),
  prioridade: z.number().int(),
  exigeAutorizacao: z.boolean(),
  exigeHomologacao: z.boolean(),
  efeitoBancoHoras: z.enum(["NENHUM", "CREDITO", "DEBITO", "COMPENSACAO"]),
  elegivelFolha: z.boolean(),
  fundamentoNormativo: z.string().nullable(),
  estado: z.enum(["RASCUNHO", "PUBLICADA", "INATIVA"]),
});

