import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PermissaoNegadaError } from "@/shared/domain/errors/permissao-negada.error";
import { usuarioPossuiPermissaoNoPerfil } from "./permissao-utils";

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

  return usuarioPossuiPermissaoNoPerfil(
    resultado.perfilAtivoCodigo,
    resultado.permissoes,
    permissao,
  );
}

export async function exigirPermissao(permissao: string) {
  const resultado = await obterPermissoesDaSessao();

  if (!resultado.permitido) {
    redirect("/login");
  }

  if (
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
