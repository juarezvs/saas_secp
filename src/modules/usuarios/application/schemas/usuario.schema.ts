import { z } from "zod";

export const tiposUsuario = [
  "SERVIDOR",
  "SISTEMA",
  "PESSOA_EXTERNA",
  "PRESTADOR",
  "ESTAGIARIO",
  "VOLUNTARIO",
] as const;

export const usuarioSchema = z.object({
  matricula: z
    .string()
    .trim()
    .min(2, "Informe uma matrícula/login com pelo menos 2 caracteres.")
    .max(50, "A matrícula/login deve ter no máximo 50 caracteres."),
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome do usuário.")
    .max(200, "O nome deve ter no máximo 200 caracteres."),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .optional()
    .or(z.literal("")),
  tipo: z.enum(tiposUsuario, {
    error: "Informe um tipo de usuário válido.",
  }),
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
  usuarioId: z.string().uuid("Usuário inválido."),
  perfilId: z.string().uuid("Informe o perfil."),
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
  };
};

export type VincularPerfilUsuarioFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: {
    usuarioId?: string;
    perfilId?: string;
  };
};
