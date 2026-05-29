import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { loginSchema } from "@/modules/auth/application/schemas/login.schema";
import { autenticarUsuarioPorCredenciais } from "@/modules/auth/application/services/autenticar-usuario.service";
import type { UsuarioAutenticado } from "@/modules/auth/domain/entities/usuario-autenticado";

type PerfilSessao = UsuarioAutenticado["perfis"][number];

function isRecord(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

function isStringArray(valor: unknown): valor is string[] {
  return (
    Array.isArray(valor) && valor.every((item) => typeof item === "string")
  );
}

function isPerfilSessao(valor: unknown): valor is PerfilSessao {
  if (!isRecord(valor)) {
    return false;
  }

  return (
    typeof valor.id === "string" &&
    typeof valor.codigo === "string" &&
    typeof valor.nome === "string" &&
    isStringArray(valor.permissoes)
  );
}

function normalizarPerfisSessao(valor: unknown): PerfilSessao[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.filter(isPerfilSessao);
}

function normalizarPerfilAtivoSessao(valor: unknown): PerfilSessao | null {
  return isPerfilSessao(valor) ? valor : null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  providers: [
    Credentials({
      name: "Matrícula e senha",
      credentials: {
        matricula: {
          label: "Matrícula",
          type: "text",
        },
        senha: {
          label: "Senha",
          type: "password",
        },
      },

      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const usuario = await autenticarUsuarioPorCredenciais(parsed.data);

        if (!usuario) {
          return null;
        }

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          matricula: usuario.matricula,
          tipo: usuario.tipo,
          perfis: usuario.perfis,
          perfilAtivo: usuario.perfilAtivo,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const usuario = user as unknown as UsuarioAutenticado & {
          name?: string | null;
        };

        token.id = usuario.id;
        token.matricula = usuario.matricula;
        token.nome = usuario.nome ?? usuario.name ?? "";
        token.tipo = usuario.tipo;
        token.perfis = usuario.perfis;
        token.perfilAtivo = usuario.perfilAtivo;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = String(token.id);
      session.user.matricula = String(token.matricula);
      session.user.nome = String(token.nome);
      session.user.tipo = String(token.tipo);
      session.user.perfis = normalizarPerfisSessao(token.perfis);
      session.user.perfilAtivo = normalizarPerfilAtivoSessao(token.perfilAtivo);

      return session;
    },
  },
});
