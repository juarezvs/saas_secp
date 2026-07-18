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
    .max(30, "A sigla deve ter no máximo 30 caracteres.")
    .transform((valor) => valor.toUpperCase()),
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome do órgão.")
    .max(200, "O nome deve ter no máximo 200 caracteres."),
  codigoExternoSarh: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (valor) => !valor || Number.isInteger(Number(valor)),
      "Informe um código SARH numérico.",
    ),
  fusoHorario: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (valor) => !valor || fusoHorarioValido(valor),
      "Informe um fuso horário válido.",
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
    .max(120, "A cidade deve ter no máximo 120 caracteres.")
    .optional()
    .or(z.literal("")),
  municipioIbge: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((valor) => !valor || /^\d{7}$/.test(valor), {
      message: "Informe o código IBGE com 7 dígitos.",
    }),
  ativo: z.coerce.boolean().default(true),
});

export type OrgaoInput = z.infer<typeof orgaoSchema>;

export type OrgaoFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<OrgaoInput>;
};
