import { prisma } from "@/shared/infrastructure/database/prisma";
import { normalizarPreferenciasAcessibilidade } from "../../application/services/preferencias-acessibilidade.service";
import { aplicarExcecoesRegistroPontoAoPerfilServidor } from "../../application/services/perfil-excecao-registro-ponto.service";
import { escolherPerfilInicial } from "../../application/services/perfil-servidor-prioritario.service";
import { filtrarPermissoesLiberadas } from "@/modules/rotinas/application/services/liberacao-rotinas.service";
import { perfilEhAdministradorSistema } from "../../domain/constants/perfis-sistema";
import type {
  PerfilSessao,
  UsuarioAutenticado,
} from "../../domain/entities/usuario-autenticado";

export async function buscarUsuarioParaLoginPorMatricula(
  matricula: string
): Promise<
  | (UsuarioAutenticado & {
      senhaHash: string | null;
      orgaoId: string | null;
    })
  | null
> {
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

  for (const usuarioPerfil of usuario.perfis.filter(
    (item) => item.perfil.ativo,
  )) {
    const existente = perfisAgrupados.get(usuarioPerfil.perfil.id);
    const permissoes = usuarioPerfil.perfil.permissoes.map(
      (perfilPermissao) => perfilPermissao.permissao.codigo,
    );

    if (!existente) {
      perfisAgrupados.set(usuarioPerfil.perfil.id, {
        id: usuarioPerfil.perfil.id,
        codigo: usuarioPerfil.perfil.codigo,
        nome: usuarioPerfil.perfil.nome,
        permissoes,
        escopoGlobal: usuarioPerfil.orgaoId === null,
        orgaos: usuarioPerfil.orgao ? [usuarioPerfil.orgao] : [],
      });
      continue;
    }

    existente.escopoGlobal ||= usuarioPerfil.orgaoId === null;

    if (
      usuarioPerfil.orgao &&
      !existente.orgaos?.some((orgao) => orgao.id === usuarioPerfil.orgaoId)
    ) {
      existente.orgaos = [...(existente.orgaos ?? []), usuarioPerfil.orgao];
    }
  }

  const perfisBase: PerfilSessao[] = Array.from(perfisAgrupados.values());

  const deveExpandirPermissoes =
    perfisBase.some((perfil) => perfilEhAdministradorSistema(perfil));

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
      permissoes: await filtrarPermissoesLiberadas(perfil.permissoes),
    })),
  );

  const perfilAtivo = escolherPerfilInicial({
    tipoUsuario: usuario.tipo,
    perfis,
  });

  return {
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
}
