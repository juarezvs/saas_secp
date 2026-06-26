import { z } from "zod";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";

export const tiposUnidadeOrganizacional = [
  "ORGAO",
  "SECAO_JUDICIARIA",
  "SUBSECAO_JUDICIARIA",
  "UNIDADE_AVANCADA_ATENDIMENTO",
  "NUCLEO",
  "SECAO",
  "SECRETARIA",
  "VARA",
  "GABINETE",
  "TURMA_RECURSAL",
  "CENTRO_CONCILIACAO",
  "DEPARTAMENTO",
  "SUBDEPARTAMENTO",
  "OUTRA",
] as const;

export const unidadeSchema = z.object({
  orgaoId: z.string().uuid("Informe o orgao."),
  unidadePaiId: z
    .string()
    .uuid("Unidade superior invalida.")
    .optional()
    .or(z.literal("")),

  codigo: z
    .string()
    .trim()
    .min(2, "Informe um codigo com pelo menos 2 caracteres.")
    .max(80, "O codigo deve ter no maximo 80 caracteres.")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Use apenas letras maiusculas, numeros, hifen ou underscore.",
    ),

  sigla: z
    .string()
    .trim()
    .min(2, "Informe uma sigla com pelo menos 2 caracteres.")
    .max(50, "A sigla deve ter no maximo 50 caracteres."),

  nome: z
    .string()
    .trim()
    .min(3, "Informe um nome com pelo menos 3 caracteres.")
    .max(250, "O nome deve ter no maximo 250 caracteres."),

  tipo: z.enum(tiposUnidadeOrganizacional, {
    error: "Informe um tipo de unidade valido.",
  }),

  fusoHorario: z
    .string()
    .trim()
    .max(80, "O fuso horario deve ter no maximo 80 caracteres.")
    .optional()
    .or(z.literal(""))
    .refine(
      (valor) => !valor || normalizarFusoHorario(valor) === valor,
      "Informe um fuso horario IANA valido.",
    ),

  uf: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .or(z.literal(""))
    .refine((valor) => !valor || /^[A-Z]{2}$/.test(valor), {
      message: "Informe a UF com duas letras.",
    }),

  municipio: z
    .string()
    .trim()
    .max(120, "O municipio deve ter no maximo 120 caracteres.")
    .optional()
    .or(z.literal("")),

  municipioIbge: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((valor) => !valor || /^\d{7}$/.test(valor), {
      message: "Informe o codigo IBGE com 7 digitos.",
    }),

  ativo: z.coerce.boolean().default(true),
});

export type UnidadeInput = z.infer<typeof unidadeSchema>;

export type UnidadeFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: {
    orgaoId?: string;
    unidadePaiId?: string;
    codigo?: string;
    sigla?: string;
    nome?: string;
    tipo?: string;
    fusoHorario?: string | null;
    uf?: string | null;
    municipio?: string | null;
    municipioIbge?: string | null;
    ativo?: boolean;
  };
};
