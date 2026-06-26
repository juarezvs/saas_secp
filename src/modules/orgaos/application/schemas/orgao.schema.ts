import { z } from "zod";

function fusoHorarioValido(valor: string) {
  try {
    Intl.DateTimeFormat("pt-BR", { timeZone: valor }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const orgaoSchema = z.object({
  sigla: z
    .string()
    .trim()
    .min(2, "Informe a sigla.")
    .max(30, "A sigla deve ter no maximo 30 caracteres.")
    .transform((valor) => valor.toUpperCase()),
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome do orgao.")
    .max(200, "O nome deve ter no maximo 200 caracteres."),
  codigoExternoSarh: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (valor) => !valor || Number.isInteger(Number(valor)),
      "Informe um codigo SARH numerico.",
    ),
  fusoHorario: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (valor) => !valor || fusoHorarioValido(valor),
      "Informe um fuso horario valido.",
    ),
  ativo: z.coerce.boolean().default(true),
});

export type OrgaoInput = z.infer<typeof orgaoSchema>;

export type OrgaoFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<OrgaoInput>;
};
