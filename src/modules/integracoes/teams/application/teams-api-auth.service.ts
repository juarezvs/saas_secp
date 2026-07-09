import { auth } from "@/auth";

export async function exigirPermissaoTeamsApi(permissao: string) {
  const session = await auth();
  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];

  if (!session?.user) {
    return { permitido: false as const, status: 401, usuarioId: null };
  }

  if (!permissoes.includes(permissao)) {
    return {
      permitido: false as const,
      status: 403,
      usuarioId: session.user.id,
    };
  }

  return { permitido: true as const, status: 200, usuarioId: session.user.id };
}
