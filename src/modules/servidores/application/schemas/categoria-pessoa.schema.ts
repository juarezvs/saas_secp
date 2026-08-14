import { z } from "zod";

export const categoriaPessoaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(2, "Informe um codigo com pelo menos 2 caracteres.")
    .max(80, "O codigo deve ter no maximo 80 caracteres.")
    .transform((valor) =>
      valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toUpperCase(),
    ),
  nome: z
    .string()
    .trim()
    .min(2, "Informe o nome da categoria.")
    .max(120, "O nome deve ter no maximo 120 caracteres."),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
  ativo: z.coerce.boolean().default(true),
});

export type CategoriaPessoaInput = z.infer<typeof categoriaPessoaSchema>;

export type CategoriaPessoaFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<CategoriaPessoaInput>;
};
