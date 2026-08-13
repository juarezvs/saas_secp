import { z } from "zod";

export const tiposUsuario = [
  "SERVIDOR",
  "SISTEMA",
  "PESSOA_EXTERNA",
  "PRESTADOR",
  "ESTAGIARIO",
  "VOLUNTARIO",
] as const;

const tipoUsuarioSchema = z.preprocess((valor) => {
  if (typeof valor !== "string") {
    return valor;
  }

  const tipo = valor.trim().toUpperCase();
  return tipo === "SISTEMAS" ? "SISTEMA" : tipo;
}, z.enum(tiposUsuario, {
  error: "Informe um tipo de usuario valido.",
}));

export const usuarioSchema = z.object({
  matricula: z
    .string()
    .trim()
    .min(2, "Informe uma matricula/login com pelo menos 2 caracteres.")
    .max(50, "A matricula/login deve ter no maximo 50 caracteres."),
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome do usuario.")
    .max(200, "O nome deve ter no maximo 200 caracteres."),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail valido.")
    .optional()
    .or(z.literal("")),
  tipo: tipoUsuarioSchema,
  senha: z
    .string()
    .trim()
    .min(6, "A senha deve ter pelo menos 6 caracteres.")
    .optional()
    .or(z.literal("")),
  ativo: z.coerce.boolean().default(true),
  perfis: z.array(z.string().uuid()).default([]),
});

export const usuarioAtualizacaoSchema = usuarioSchema.extend({
  senha: z.string().trim().optional().or(z.literal("")),
});

export const vincularPerfilUsuarioSchema = z.object({
  usuarioId: z.string().uuid("Usuario invalido."),
  perfilId: z.string().uuid("Informe o perfil."),
  orgaoId: z
    .string()
    .uuid("Selecione uma seccional valida.")
    .optional()
    .or(z.literal("")),
});

export type UsuarioInput = z.infer<typeof usuarioSchema>;
export type UsuarioAtualizacaoInput = z.infer<typeof usuarioAtualizacaoSchema>;

export type UsuarioFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: {
    matricula?: string;
    nome?: string;
    email?: string;
    tipo?: string;
    senha?: string;
    ativo?: boolean;
    perfis?: string[];
    perfisEscopos?: Record<string, string>;
  };
};

export type VincularPerfilUsuarioFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: {
    usuarioId?: string;
    perfilId?: string;
    orgaoId?: string;
  };
};
