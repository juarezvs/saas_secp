import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  definirCacheJson,
  obterCacheJson,
  removerCache,
} from "@/lib/cache/redis-cache";
import { normalizarPreferenciasAcessibilidade } from "../../application/services/preferencias-acessibilidade.service";
import { aplicarExcecoesRegistroPontoAoPerfilServidor } from "../../application/services/perfil-excecao-registro-ponto.service";
import { escolherPerfilInicial } from "../../application/services/perfil-servidor-prioritario.service";
import { filtrarPermissoesLiberadas } from "@/modules/rotinas/application/services/liberacao-rotinas.service";
import { expandirPermissoesCompatibilidade } from "../../application/services/permissao-utils";
import { perfilEhAdministradorSistema } from "../../domain/constants/perfis-sistema";
import type {
  PerfilSessao,
  UsuarioAutenticado,
} from "../../domain/entities/usuario-autenticado";

export async function buscarUsuarioParaLoginPorMatricula(
  matricula: string,
): Promise<
  | (UsuarioAutenticado & {
      senhaHash: string | null;
      orgaoId: string | null;
    })
  | null
> {
  const matriculaNormalizada = matricula.trim().toUpperCase();
  const cacheKey = `secp:auth:usuario:${matriculaNormalizada}`;
  const ttl = Number(process.env.AUTH_SESSION_CACHE_TTL_SECONDS ?? "60");
  const cached =
    ttl > 0
      ? await obterCacheJson<
          Awaited<ReturnType<typeof buscarUsuarioParaLoginPorMatricula>>
        >(cacheKey)
      : null;

  if (cached) {
    return cached;
  }

  const usuario = await prisma.usuario.findFirst({
    where: {
      matricula: {
        equals: matricula,
        mode: "insensitive",
      },
    },
    include: {
      perfis: {
        where: {
          ativo: true,
        },
        include: {
          orgao: {
            select: {
              id: true,
              sigla: true,
              nome: true,
            },
          },
          perfil: {
            include: {
              orgao: {
                select: {
                  id: true,
                  sigla: true,
                  nome: true,
                },
              },
              permissoes: {
                include: {
                  permissao: true,
                },
              },
            },
          },
        },
      },
      servidor: {
        select: {
          orgaoId: true,
        },
      },
    },
  });

  if (!usuario || !usuario.ativo) {
    return null;
  }

  const perfisAgrupados = new Map<string, PerfilSessao>();
  const orgaoIdsVinculadosPorPerfil = new Map<string, Set<string>>();

  for (const usuarioPerfil of usuario.perfis.filter(
    (item) => item.perfil.ativo,
  )) {
    const existente = perfisAgrupados.get(usuarioPerfil.perfil.id);
    const perfilSistemaGlobal = perfilEhAdministradorSistema(
      usuarioPerfil.perfil,
    );
    const permissoes = usuarioPerfil.perfil.permissoes.map(
      (perfilPermissao) => perfilPermissao.permissao.codigo,
    );
    const orgaoPerfil = usuarioPerfil.orgao ?? usuarioPerfil.perfil.orgao;
    const orgaoIdVinculado =
      usuarioPerfil.orgaoId ?? usuarioPerfil.perfil.orgaoId;

    if (orgaoIdVinculado) {
      const orgaoIds =
        orgaoIdsVinculadosPorPerfil.get(usuarioPerfil.perfil.id) ??
        new Set<string>();
      orgaoIds.add(orgaoIdVinculado);
      orgaoIdsVinculadosPorPerfil.set(usuarioPerfil.perfil.id, orgaoIds);
    }

    if (!existente) {
      perfisAgrupados.set(usuarioPerfil.perfil.id, {
        id: usuarioPerfil.perfil.id,
        codigo: usuarioPerfil.perfil.codigo,
        nome: usuarioPerfil.perfil.nome,
        permissoes,
        administrativo: usuarioPerfil.perfil.administrativo,
        excecao: usuarioPerfil.perfil.excecao,
        perfilDestinoExcecaoId: usuarioPerfil.perfil.perfilDestinoExcecaoId,
        escopoGlobal: perfilSistemaGlobal,
        orgaos: orgaoPerfil ? [orgaoPerfil] : [],
      });
      continue;
    }

    existente.escopoGlobal ||= perfilSistemaGlobal;

    if (
      orgaoPerfil &&
      !existente.orgaos?.some((orgao) => orgao.id === orgaoPerfil.id)
    ) {
      existente.orgaos = [...(existente.orgaos ?? []), orgaoPerfil];
    }
  }

  const perfisBase: PerfilSessao[] = Array.from(perfisAgrupados.values());
  const orgaoIdsVinculados = Array.from(
    new Set(
      Array.from(orgaoIdsVinculadosPorPerfil.values()).flatMap((orgaoIds) =>
        Array.from(orgaoIds),
      ),
    ),
  );
  const orgaosVinculados = orgaoIdsVinculados.length
    ? await prisma.orgao.findMany({
        where: {
          id: {
            in: orgaoIdsVinculados,
          },
          ativo: true,
        },
        select: {
          id: true,
          sigla: true,
          nome: true,
        },
      })
    : [];
  const orgaosVinculadosPorId = new Map(
    orgaosVinculados.map((orgao) => [orgao.id, orgao]),
  );

  for (const perfil of perfisBase) {
    const orgaoIds = orgaoIdsVinculadosPorPerfil.get(perfil.id);

    if (!orgaoIds?.size) {
      continue;
    }

    for (const orgaoId of orgaoIds) {
      const orgao = orgaosVinculadosPorId.get(orgaoId);

      if (
        orgao &&
        !perfil.orgaos?.some((orgaoAtual) => orgaoAtual.id === orgao.id)
      ) {
        perfil.orgaos = [...(perfil.orgaos ?? []), orgao];
      }
    }
  }

  const deveExpandirPermissoes = perfisBase.some((perfil) =>
    perfilEhAdministradorSistema(perfil),
  );

  const todasPermissoes = deveExpandirPermissoes
    ? await prisma.permissao.findMany({
        select: {
          codigo: true,
        },
        orderBy: {
          codigo: "asc",
        },
      })
    : [];

  const codigosTodasPermissoes = todasPermissoes.map(
    (permissao) => permissao.codigo,
  );

  const perfisComPermissoesExpandidas: PerfilSessao[] = perfisBase.map(
    (perfil) =>
      perfilEhAdministradorSistema(perfil)
        ? {
            ...perfil,
            permissoes: codigosTodasPermissoes,
          }
        : perfil,
  );

  const perfisComExcecoes = aplicarExcecoesRegistroPontoAoPerfilServidor(
    perfisComPermissoesExpandidas,
  );
  const perfis = await Promise.all(
    perfisComExcecoes.map(async (perfil) => ({
      ...perfil,
      permissoes: expandirPermissoesCompatibilidade(
        await filtrarPermissoesLiberadas(perfil.permissoes),
      ),
    })),
  );

  const perfilAtivo = escolherPerfilInicial({
    tipoUsuario: usuario.tipo,
    perfis,
  });

  const resultado = {
    id: usuario.id,
    matricula: usuario.matricula,
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo,
    preferenciasAcessibilidade: normalizarPreferenciasAcessibilidade(
      usuario.preferenciasAcessibilidade,
    ),
    senhaHash: usuario.senhaHash,
    orgaoId: usuario.servidor?.orgaoId ?? null,
    perfis,
    perfilAtivo,
  };

  if (ttl > 0) {
    await definirCacheJson(
      cacheKey,
      resultado,
      Math.min(Math.max(ttl, 30), 120),
    );
  }

  return resultado;
}

export async function invalidarCacheUsuarioAuthPorMatricula(matricula: string) {
  const matriculaNormalizada = matricula.trim().toUpperCase();

  if (!matriculaNormalizada) {
    return;
  }

  await removerCache(`secp:auth:usuario:${matriculaNormalizada}`);
}

export async function invalidarCacheUsuarioAuthPorId(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { matricula: true },
  });

  if (usuario?.matricula) {
    await invalidarCacheUsuarioAuthPorMatricula(usuario.matricula);
  }
}
