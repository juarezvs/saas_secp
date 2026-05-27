"use client";

import { useSession } from "next-auth/react";
import {
  possuiAlgumaPermissaoNaLista,
  possuiPermissaoNaLista,
  possuiTodasPermissoesNaLista,
} from "../../application/services/permissao.service";

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

  const permissoesUsuario = session?.user.perfilAtivo?.permissoes ?? [];

  if (permissao && !possuiPermissaoNaLista(permissoesUsuario, permissao)) {
    return <>{fallback}</>;
  }

  if (
    algumaPermissao &&
    !possuiAlgumaPermissaoNaLista(permissoesUsuario, algumaPermissao)
  ) {
    return <>{fallback}</>;
  }

  if (
    todasPermissoes &&
    !possuiTodasPermissoesNaLista(permissoesUsuario, todasPermissoes)
  ) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
