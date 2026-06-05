import { perfilEhAdministradorSistema } from "@/modules/auth/domain/constants/perfis-sistema";

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
  if (perfilEhAdministradorSistema({ codigo: perfilCodigo })) {
    return true;
  }

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
  if (perfilEhAdministradorSistema({ codigo: perfilCodigo })) {
    return true;
  }

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
  if (perfilEhAdministradorSistema({ codigo: perfilCodigo })) {
    return true;
  }

  return possuiTodasPermissoesNaLista(permissoesUsuario, permissoes);
}
