export function possuiPermissaoNaLista(
  permissoesUsuario: string[] | undefined,
  permissao: string,
) {
  return permissoesUsuario?.includes(permissao) ?? false;
}

export function usuarioPossuiPermissaoNoPerfil(
  perfilCodigo: string | undefined | null,
  permissoesUsuario: string[] | undefined,
  permissao: string,
) {
  void perfilCodigo;
  return possuiPermissaoNaLista(permissoesUsuario, permissao);
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

export function usuarioPossuiAlgumaPermissaoNoPerfil(
  perfilCodigo: string | undefined | null,
  permissoesUsuario: string[] | undefined,
  permissoes: string[],
) {
  void perfilCodigo;
  return possuiAlgumaPermissaoNaLista(permissoesUsuario, permissoes);
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

export function usuarioPossuiTodasPermissoesNoPerfil(
  perfilCodigo: string | undefined | null,
  permissoesUsuario: string[] | undefined,
  permissoes: string[],
) {
  void perfilCodigo;
  return possuiTodasPermissoesNaLista(permissoesUsuario, permissoes);
}

export function expandirPermissoesCompatibilidade(
  permissoesUsuario: string[] | undefined,
) {
  const permissoes = new Set(permissoesUsuario ?? []);

  for (const permissao of permissoesUsuario ?? []) {
    if (permissao.endsWith(":subordinados")) {
      const base = permissao.replace(/:subordinados$/, "");
      permissoes.add(`${base}:chefia`);
    }

    if (permissao.endsWith(":seccional")) {
      const base = permissao.replace(/:seccional$/, "");
      permissoes.add(`${base}:global`);
    }
  }

  return Array.from(permissoes);
}
