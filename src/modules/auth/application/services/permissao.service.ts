import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PermissaoNegadaError } from "@/shared/domain/errors/permissao-negada.error";
import { buscarUsuarioParaLoginPorMatricula } from "../../infrastructure/repositories/usuario-auth.repository";
import { escolherPerfilInicial } from "./perfil-servidor-prioritario.service";
import {
  possuiPermissaoNaLista,
  usuarioPossuiPermissaoNoPerfil,
} from "./permissao-utils";

export {
  possuiAlgumaPermissaoNaLista,
  possuiPermissaoNaLista,
  possuiTodasPermissoesNaLista,
  usuarioPossuiAlgumaPermissaoNoPerfil,
  usuarioPossuiPermissaoNoPerfil,
  usuarioPossuiTodasPermissoesNoPerfil,
} from "./permissao-utils";

export type ResultadoPermissao = {
  permitido: boolean;
  usuarioId?: string;
  usuarioMatricula?: string;
  usuarioNome?: string;
  perfilAtivoId?: string;
  perfilAtivoNome?: string;
  perfilAtivoCodigo?: string;
  perfilAtivoEscopoGlobal?: boolean;
  orgaoSiglas?: string[];
  orgaoIds?: string[];
  permissoes: string[];
};

export async function obterPermissoesDaSessao(): Promise<ResultadoPermissao> {
  const session = await auth();

  if (!session?.user) {
    return {
      permitido: false,
      permissoes: [],
    };
  }

  const usuario = await buscarUsuarioParaLoginPorMatricula(
    session.user.matricula,
  );

  if (!usuario) {
    return {
      permitido: false,
      permissoes: [],
    };
  }

  const perfilPreferido =
    usuario.perfis.find(
      (perfil) => perfil.codigo === session.user.perfilAtivo?.codigo,
    ) ??
    usuario.perfilAtivo;
  const perfilAtivo = escolherPerfilInicial({
    tipoUsuario: usuario.tipo,
    perfis: usuario.perfis,
    perfilPreferido,
  });

  return {
    permitido: true,
    usuarioId: usuario.id,
    usuarioMatricula: usuario.matricula,
    usuarioNome: usuario.nome,
    perfilAtivoId: perfilAtivo?.id,
    perfilAtivoNome: perfilAtivo?.nome,
    perfilAtivoCodigo: perfilAtivo?.codigo,
    perfilAtivoEscopoGlobal: perfilAtivo?.escopoGlobal ?? false,
    orgaoSiglas: perfilAtivo?.orgaos?.map((orgao) => orgao.sigla) ?? [],
    orgaoIds: perfilAtivo?.orgaos?.map((orgao) => orgao.id) ?? [],
    permissoes: perfilAtivo?.permissoes ?? [],
  };
}

export async function usuarioPossuiPermissao(
  permissao: string,
): Promise<boolean> {
  const resultado = await obterPermissoesDaSessao();

  if (!resultado.permitido) {
    return false;
  }

  return (
    possuiPermissaoNaLista(resultado.permissoes, permissao) &&
    usuarioPossuiPermissaoNoPerfil(
      resultado.perfilAtivoCodigo,
      resultado.permissoes,
      permissao,
    )
  );
}

export async function exigirPermissao(permissao: string) {
  const resultado = await obterPermissoesDaSessao();

  if (!resultado.permitido) {
    redirect("/login");
  }

  if (
    !possuiPermissaoNaLista(resultado.permissoes, permissao) ||
    !usuarioPossuiPermissaoNoPerfil(
      resultado.perfilAtivoCodigo,
      resultado.permissoes,
      permissao,
    )
  ) {
    throw new PermissaoNegadaError(permissao);
  }

  return resultado;
}

export async function exigirPermissaoOuRedirecionar(permissao: string) {
  try {
    return await exigirPermissao(permissao);
  } catch (error) {
    if (error instanceof PermissaoNegadaError) {
      redirect(
        `/acesso-negado?permissao=${encodeURIComponent(
          error.permissaoNecessaria ?? permissao,
        )}`,
      );
    }

    throw error;
  }
}

export async function exigirUmaDasPermissoesOuRedirecionar(
  permissoes: string[],
) {
  if (permissoes.length === 0) {
    redirect(
      `/acesso-negado?permissao=${encodeURIComponent(
        "Nenhuma permissão informada",
      )}`,
    );
  }

  const permissoesNegadas: string[] = [];

  for (const permissao of permissoes) {
    try {
      return await exigirPermissao(permissao);
    } catch (error) {
      if (error instanceof PermissaoNegadaError) {
        permissoesNegadas.push(error.permissaoNecessaria ?? permissao);
        continue;
      }

      throw error;
    }
  }

  redirect(
    `/acesso-negado?permissao=${encodeURIComponent(
      permissoesNegadas.join(" ou "),
    )}`,
  );
}
