import { z } from "zod";

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
  orgaoId: z.string().uuid("Informe o órgão."),
  unidadePaiId: z
    .string()
    .uuid("Unidade superior inválida.")
    .optional()
    .or(z.literal("")),

  codigo: z
    .string()
    .trim()
    .min(2, "Informe um código com pelo menos 2 caracteres.")
    .max(80, "O código deve ter no máximo 80 caracteres.")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Use apenas letras maiúsculas, números, hífen ou underscore.",
    ),

  sigla: z
    .string()
    .trim()
    .min(2, "Informe uma sigla com pelo menos 2 caracteres.")
    .max(50, "A sigla deve ter no máximo 50 caracteres."),

  nome: z
    .string()
    .trim()
    .min(3, "Informe um nome com pelo menos 3 caracteres.")
    .max(250, "O nome deve ter no máximo 250 caracteres."),

  tipo: z.enum(tiposUnidadeOrganizacional, {
    error: "Informe um tipo de unidade válido.",
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
    ativo?: boolean;
  };
};
