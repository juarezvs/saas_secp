import { prisma } from "@/shared/infrastructure/database/prisma";
import { normalizarPreferenciasAcessibilidade } from "../../application/services/preferencias-acessibilidade.service";
import { aplicarExcecoesRegistroPontoAoPerfilServidor } from "../../application/services/perfil-excecao-registro-ponto.service";
import { escolherPerfilInicial } from "../../application/services/perfil-servidor-prioritario.service";
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

  const perfisBase: PerfilSessao[] = usuario.perfis
    .filter((usuarioPerfil) => usuarioPerfil.perfil.ativo)
    .map((usuarioPerfil) => ({
      id: usuarioPerfil.perfil.id,
      codigo: usuarioPerfil.perfil.codigo,
      nome: usuarioPerfil.perfil.nome,
      permissoes: usuarioPerfil.perfil.permissoes.map(
        (perfilPermissao) => perfilPermissao.permissao.codigo
      ),
    }));

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

  const perfis = aplicarExcecoesRegistroPontoAoPerfilServidor(
    perfisComPermissoesExpandidas,
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
