import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cookies } from "next/headers";

import { PERFIL_ATIVO_COOKIE } from "@/modules/auth/domain/constants/perfil-ativo-cookie";
import { loginSchema } from "@/modules/auth/application/schemas/login.schema";
import {
  PREFERENCIAS_ACESSIBILIDADE_PADRAO,
  normalizarPreferenciasAcessibilidade,
} from "@/modules/auth/application/services/preferencias-acessibilidade.service";
import { autenticarUsuarioPorCredenciais } from "@/modules/auth/application/services/autenticar-usuario.service";
import { escolherPerfilInicial } from "@/modules/auth/application/services/perfil-servidor-prioritario.service";
import { buscarUsuarioParaLoginPorMatricula } from "@/modules/auth/infrastructure/repositories/usuario-auth.repository";
import { enfileirarAtualizacaoSarhLogin } from "@/modules/integracoes/sarh/application/queues/sarh-login-sync-queue";
import type { UsuarioAutenticado } from "@/modules/auth/domain/entities/usuario-autenticado";

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

        Promise.all([
          import(
            "@/modules/integracoes/sarh/application/workers/sarh-login-sync-worker-runtime"
          ).then((mod) => mod.garantirSarhLoginSyncWorkerAutomatico()),
          enfileirarAtualizacaoSarhLogin({
            matricula: usuario.matricula,
            usuarioId: usuario.id,
          }),
        ]).catch((error) => {
          console.error(
            "[SARH LOGIN] Falha ao enfileirar atualização SARH:",
            error,
          );
        });

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          matricula: usuario.matricula,
          tipo: usuario.tipo,
          preferenciasAcessibilidade: usuario.preferenciasAcessibilidade,
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
      }

      return token;
    },

    async session({ session, token }) {
      const usuarioAtual = await buscarUsuarioParaLoginPorMatricula(
        String(token.matricula),
      );
      const perfis = usuarioAtual?.perfis ?? [];
      const perfilAtivoToken = usuarioAtual?.perfilAtivo ?? null;
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
