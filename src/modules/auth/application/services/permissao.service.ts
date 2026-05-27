import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PermissaoNegadaError } from "@/shared/domain/errors/permissao-negada.error";

export type ResultadoPermissao = {
  permitido: boolean;
  usuarioId?: string;
  perfilAtivoId?: string;
  perfilAtivoCodigo?: string;
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

  const perfilAtivo = session.user.perfilAtivo;

  return {
    permitido: true,
    usuarioId: session.user.id,
    perfilAtivoId: perfilAtivo?.id,
    perfilAtivoCodigo: perfilAtivo?.codigo,
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

  return resultado.permissoes.includes(permissao);
}

export async function exigirPermissao(permissao: string) {
  const resultado = await obterPermissoesDaSessao();

  if (!resultado.permitido) {
    redirect("/login");
  }

  if (!resultado.permissoes.includes(permissao)) {
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

export function possuiPermissaoNaLista(
  permissoesUsuario: string[] | undefined,
  permissao: string,
) {
  return permissoesUsuario?.includes(permissao) ?? false;
}

export function possuiAlgumaPermissaoNaLista(
  permissoesUsuario: string[] | undefined,
  permissoes: string[],
) {
  if (!permissoesUsuario || permissoesUsuario.length === 0) {
    return false;
  }

  return permissoes.some((permissao) => permissoesUsuario.includes(permissao));
}

export function possuiTodasPermissoesNaLista(
  permissoesUsuario: string[] | undefined,
  permissoes: string[],
) {
  if (!permissoesUsuario || permissoesUsuario.length === 0) {
    return false;
  }

  return permissoes.every((permissao) => permissoesUsuario.includes(permissao));
}
