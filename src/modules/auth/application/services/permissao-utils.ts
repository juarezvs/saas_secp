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
      permissoes.add(`${base}:unidade`);

      if (
        base === "teams:aprovacoes:analisar" ||
        base === "teams:homologacao:analisar"
      ) {
        permissoes.add(base);
      }
    }

    if (permissao.endsWith(":seccional")) {
      const base = permissao.replace(/:seccional$/, "");
      permissoes.add(`${base}:global`);

      if (base === "biometriafacial:cadastrar") {
        permissoes.add("biometriafacial:cadastrar:terceiros");
      }

      if (base === "biometriafacial:recadastrar") {
        permissoes.add("biometriafacial:recadastrar:terceiros");
      }

      if (base === "recesso:aceitar") {
        permissoes.add("recesso:aceitar:secad");
      }

      if (base === "recesso:relatorio") {
        permissoes.add("recesso:relatorio:secap");
        permissoes.add("recesso:relatorio:sepag");
      }
    }

    if (permissao.endsWith(":global")) {
      const base = permissao.replace(/:global$/, "");

      if (base === "biometriafacial:visualizar") {
        permissoes.add("biometriafacial:visualizar:auditoria");
      }

      if (base === "recesso:convocacao") {
        permissoes.add("recesso:convocacao:gerenciar");
      }

      if (base === "integracoes:receber-webhook") {
        permissoes.add("integracoes:receber-webhook:sistema");
      }
    }

    if (permissao.endsWith(":proprio")) {
      const base = permissao.replace(/:proprio$/, "");

      if (
        base === "teams:bot:usar" ||
        base === "teams:notificacoes:receber" ||
        base === "teams:ponto:registrar" ||
        base === "teams:banco-horas:consultar" ||
        base === "teams:solicitacoes:criar"
      ) {
        permissoes.add(base);
      }
    }
  }

  return Array.from(permissoes);
}
