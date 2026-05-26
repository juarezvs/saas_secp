import { prisma } from "@/shared/infrastructure/database/prisma";
import type {
  PerfilSessao,
  UsuarioAutenticado,
} from "../../domain/entities/usuario-autenticado";

export async function buscarUsuarioParaLoginPorMatricula(
  matricula: string
): Promise<
  | (UsuarioAutenticado & {
      senhaHash: string | null;
    })
  | null
> {
  const usuario = await prisma.usuario.findUnique({
    where: {
      matricula,
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
    },
  });

  if (!usuario || !usuario.ativo) {
    return null;
  }

  const perfis: PerfilSessao[] = usuario.perfis
    .filter((usuarioPerfil) => usuarioPerfil.perfil.ativo)
    .map((usuarioPerfil) => ({
      id: usuarioPerfil.perfil.id,
      codigo: usuarioPerfil.perfil.codigo,
      nome: usuarioPerfil.perfil.nome,
      permissoes: usuarioPerfil.perfil.permissoes.map(
        (perfilPermissao) => perfilPermissao.permissao.codigo
      ),
    }));

  const perfilAtivo = perfis[0] ?? null;

  return {
    id: usuario.id,
    matricula: usuario.matricula,
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo,
    senhaHash: usuario.senhaHash,
    perfis,
    perfilAtivo,
  };
}