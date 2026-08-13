import { getToken } from "next-auth/jwt";

import { obterRedisCacheClient } from "@/lib/cache/redis-cache";
import { buscarUsuarioParaLoginPorMatricula } from "@/modules/auth/infrastructure/repositories/usuario-auth.repository";

import {
  classificarFuncionalidadeParaMetricas,
  obterObservabilidade,
} from "./metrics";

const ACTIVE_USER_PREFIX = "secp:observability:active-user:";
const ACTIVE_USER_TTL_SECONDS = Number(
  process.env.SECP_ACTIVE_USER_TTL_SECONDS ?? "900",
);

type ActiveUser = {
  usuario: string;
  orgao: string;
  lastSeen: string;
};

function limparLabel(value: string | null | undefined, fallback: string) {
  const normalizado = String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (normalizado || fallback).slice(0, 96);
}

function orgaoPreferencial(
  usuario: Awaited<ReturnType<typeof buscarUsuarioParaLoginPorMatricula>>,
) {
  const perfilAtivo = usuario?.perfilAtivo;
  const primeiroOrgaoPerfil = perfilAtivo?.orgaos?.[0]?.sigla;
  const primeiroOrgao = usuario?.perfis
    .flatMap((perfil) => perfil.orgaos ?? [])
    .find((orgao) => orgao.sigla)?.sigla;

  return limparLabel(primeiroOrgaoPerfil ?? primeiroOrgao, "GLOBAL");
}

async function contextoUsuario(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie:
      process.env.AUTH_URL?.startsWith("https://") ||
      process.env.NEXTAUTH_URL?.startsWith("https://") ||
      process.env.NODE_ENV === "production",
  });
  const matricula = limparLabel(String(token?.matricula ?? ""), "");

  if (!matricula) {
    return null;
  }

  const usuario = await buscarUsuarioParaLoginPorMatricula(matricula);
  const usuarioLabel = limparLabel(
    `${usuario?.matricula ?? matricula} - ${usuario?.nome ?? token?.nome ?? ""}`,
    matricula,
  );

  return {
    usuario: usuarioLabel,
    orgao: orgaoPreferencial(usuario),
  };
}

export async function registrarAtividadeUsuarioHttp(params: {
  request: Request;
  method: string;
  route: string;
  status: string;
}) {
  try {
    const contexto = await contextoUsuario(params.request);
    if (!contexto) {
      return;
    }

    const funcionalidade = classificarFuncionalidadeParaMetricas(params.route);
    const observabilidade = obterObservabilidade();

    observabilidade.httpRequestsByUserTotal.inc({
      usuario: contexto.usuario,
      orgao: contexto.orgao,
      funcionalidade,
      method: params.method,
      route: params.route,
      status: params.status,
    });

    await obterRedisCacheClient().set(
      `${ACTIVE_USER_PREFIX}${contexto.usuario}`,
      JSON.stringify({
        ...contexto,
        lastSeen: new Date().toISOString(),
      } satisfies ActiveUser),
      "EX",
      ACTIVE_USER_TTL_SECONDS,
    );
  } catch {
    return;
  }
}

export async function coletarMetricasUsuariosAtivos() {
  const observabilidade = obterObservabilidade();
  const porOrgao = new Map<string, number>();

  observabilidade.activeUsers.reset();
  observabilidade.activeUsersByOrgao.reset();

  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await obterRedisCacheClient().scan(
        cursor,
        "MATCH",
        `${ACTIVE_USER_PREFIX}*`,
        "COUNT",
        200,
      );
      cursor = nextCursor;

      if (keys.length === 0) {
        continue;
      }

      const values = await obterRedisCacheClient().mget(...keys);
      for (const value of values) {
        if (!value) continue;

        const activeUser = JSON.parse(value) as ActiveUser;
        observabilidade.activeUsers.set(
          { usuario: activeUser.usuario, orgao: activeUser.orgao },
          1,
        );
        porOrgao.set(activeUser.orgao, (porOrgao.get(activeUser.orgao) ?? 0) + 1);
      }
    } while (cursor !== "0");

    for (const [orgao, total] of porOrgao) {
      observabilidade.activeUsersByOrgao.set({ orgao }, total);
    }

    observabilidade.activeSessions.set(
      Array.from(porOrgao.values()).reduce((sum, total) => sum + total, 0),
    );
  } catch {
    observabilidade.activeSessions.set(0);
  }
}
