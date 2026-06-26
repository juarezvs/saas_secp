import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cookies } from "next/headers";

import { PERFIL_ATIVO_COOKIE } from "@/modules/auth/domain/constants/perfil-ativo-cookie";
import { loginSchema } from "@/modules/auth/application/schemas/login.schema";
import {
  PREFERENCIAS_ACESSIBILIDADE_PADRAO,
  normalizarPreferenciasAcessibilidade,
} from "@/modules/auth/application/services/preferencias-acessibilidade.service";
import { aplicarExcecoesRegistroPontoAoPerfilServidor } from "@/modules/auth/application/services/perfil-excecao-registro-ponto.service";
import { autenticarUsuarioPorCredenciais } from "@/modules/auth/application/services/autenticar-usuario.service";
import { escolherPerfilInicial } from "@/modules/auth/application/services/perfil-servidor-prioritario.service";
import { buscarUsuarioParaLoginPorMatricula } from "@/modules/auth/infrastructure/repositories/usuario-auth.repository";
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

  return aplicarExcecoesRegistroPontoAoPerfilServidor(
    valor.filter(isPerfilSessao),
  );
}

function normalizarPerfilAtivoSessao(valor: unknown): PerfilSessao | null {
  return isPerfilSessao(valor) ? valor : null;
}

async function obterCodigoPerfilAtivoCookie() {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(PERFIL_ATIVO_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
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
          preferenciasAcessibilidade: usuario.preferenciasAcessibilidade,
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
        token.preferenciasAcessibilidade = usuario.preferenciasAcessibilidade;
        token.perfis = usuario.perfis;
        token.perfilAtivo = usuario.perfilAtivo;
      }

      return token;
    },

    async session({ session, token }) {
      const usuarioAtual = await buscarUsuarioParaLoginPorMatricula(
        String(token.matricula),
      );
      const perfis = usuarioAtual
        ? usuarioAtual.perfis
        : normalizarPerfisSessao(token.perfis);
      const perfilAtivoToken = usuarioAtual
        ? usuarioAtual.perfilAtivo
        : normalizarPerfilAtivoSessao(token.perfilAtivo);
      const perfilAtivoCookie = await obterCodigoPerfilAtivoCookie();
      const perfilAtivoTokenVisivel = perfilAtivoToken
        ? (perfis.find((perfil) => perfil.codigo === perfilAtivoToken.codigo) ??
          null)
        : null;
      const perfilAtivoPreferido =
        perfis.find((perfil) => perfil.codigo === perfilAtivoCookie) ??
        perfilAtivoTokenVisivel;
      const perfilAtivo = escolherPerfilInicial({
        tipoUsuario: usuarioAtual?.tipo ?? String(token.tipo),
        perfis,
        perfilPreferido: perfilAtivoPreferido,
      });

      session.user.id = usuarioAtual?.id ?? String(token.id);
      session.user.matricula = usuarioAtual?.matricula ?? String(token.matricula);
      session.user.nome = usuarioAtual?.nome ?? String(token.nome);
      session.user.tipo = usuarioAtual?.tipo ?? String(token.tipo);
      session.user.preferenciasAcessibilidade =
        usuarioAtual?.preferenciasAcessibilidade ??
        normalizarPreferenciasAcessibilidade(
          token.preferenciasAcessibilidade ??
            PREFERENCIAS_ACESSIBILIDADE_PADRAO,
        );
      session.user.perfis = perfis;
      session.user.perfilAtivo = perfilAtivo;

      return session;
    },
  },
});
