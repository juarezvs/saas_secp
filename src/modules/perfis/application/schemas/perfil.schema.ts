import { z } from "zod";

export const perfilSchema = z
  .object({
  codigo: z
    .string()
    .trim()
    .min(2, "Informe um código com pelo menos 2 caracteres.")
    .max(80, "O código deve ter no máximo 80 caracteres.")
    .regex(
      /^[A-Z0-9_]+$/,
      "Use apenas letras maiúsculas, números e underscore. Exemplo: GESTOR_UNIDADE."
    ),
  nome: z
    .string()
    .trim()
    .min(3, "Informe um nome com pelo menos 3 caracteres.")
    .max(120, "O nome deve ter no máximo 120 caracteres."),
  descricao: z
    .string()
    .trim()
    .max(1000, "A descrição deve ter no máximo 1000 caracteres.")
    .optional()
    .or(z.literal("")),
  ativo: z.coerce.boolean().default(true),
  administrativo: z.coerce.boolean().default(false),
  excecao: z.coerce.boolean().default(false),
  perfilDestinoExcecaoId: z
    .string()
    .uuid("Selecione um perfil destino valido.")
    .optional()
    .or(z.literal("")),
  permissoes: z.array(z.string().uuid()).default([]),
  })
  .superRefine((dados, ctx) => {
    if (dados.excecao && !dados.perfilDestinoExcecaoId) {
      ctx.addIssue({
        code: "custom",
        path: ["perfilDestinoExcecaoId"],
        message: "Selecione o perfil que recebera as permissoes desta excecao.",
      });
    }
  });

export type PerfilInput = z.infer<typeof perfilSchema>;

export type PerfilFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: {
    codigo?: string;
    nome?: string;
    descricao?: string;
    ativo?: boolean;
    administrativo?: boolean;
    excecao?: boolean;
    perfilDestinoExcecaoId?: string | null;
    permissoes?: string[];
  };
};
