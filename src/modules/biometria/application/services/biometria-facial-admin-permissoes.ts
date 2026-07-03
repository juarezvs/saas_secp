import { auth } from "@/auth";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";

export type SessaoBiometriaAdmin = NonNullable<Awaited<ReturnType<typeof auth>>>;

export async function exigirPermissaoBiometriaFacialAdmin(
  permissoes: string[],
) {
  const session = await auth();

  if (!session?.user) {
    return {
      autorizado: false as const,
      status: 401,
      message: "Sua sessão expirou. Faça login novamente.",
      session: null,
    };
  }

  const autorizado = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    session.user.perfilAtivo?.permissoes,
    permissoes,
  );

  if (!autorizado) {
    return {
      autorizado: false as const,
      status: 403,
      message: "Você não possui permissão para executar esta ação.",
      session: null,
    };
  }

  return {
    autorizado: true as const,
    session,
  };
}

export function respostaErroBiometriaAdmin(
  code: string,
  message: string,
  status: number,
) {
  return Response.json(
    {
      success: false,
      code,
      message,
    },
    { status },
  );
}
