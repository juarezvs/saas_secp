"use client";

import { useSession } from "next-auth/react";
import {
  usuarioPossuiAlgumaPermissaoNoPerfil,
  usuarioPossuiPermissaoNoPerfil,
  usuarioPossuiTodasPermissoesNoPerfil,
} from "../../application/services/permissao-utils";

type GuardPermissaoProps = {
  permissao?: string;
  algumaPermissao?: string[];
  todasPermissoes?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export function GuardPermissao({
  permissao,
  algumaPermissao,
  todasPermissoes,
  fallback = null,
  children,
}: GuardPermissaoProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  const perfilAtivo = session?.user.perfilAtivo;
  const permissoesUsuario = perfilAtivo?.permissoes ?? [];

  if (
    permissao &&
    !usuarioPossuiPermissaoNoPerfil(
      perfilAtivo?.codigo,
      permissoesUsuario,
      permissao,
    )
  ) {
    return <>{fallback}</>;
  }

  if (
    algumaPermissao &&
    !usuarioPossuiAlgumaPermissaoNoPerfil(
      perfilAtivo?.codigo,
      permissoesUsuario,
      algumaPermissao,
    )
  ) {
    return <>{fallback}</>;
  }

  if (
    todasPermissoes &&
    !usuarioPossuiTodasPermissoesNoPerfil(
      perfilAtivo?.codigo,
      permissoesUsuario,
      todasPermissoes,
    )
  ) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
