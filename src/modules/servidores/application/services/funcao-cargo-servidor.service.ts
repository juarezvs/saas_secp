type ServidorFuncaoCargo = {
  funcaoAtualCategoriaSarh?: string | null;
  funcaoAtualDescricao?: string | null;
  cargo?: {
    descricao?: string | null;
  } | null;
  lotacoes?: {
    cargo?: {
      descricao?: string | null;
    } | null;
  }[];
};

export function descricaoFuncaoOuCargoServidor(
  servidor: ServidorFuncaoCargo | null | undefined,
) {
  if (!servidor) return "";

  return (
    descricaoNomeFuncaoServidor(servidor) ||
    descricaoCargoServidor(servidor) ||
    ""
  );
}

export function descricaoFuncaoServidor(
  servidor: ServidorFuncaoCargo | null | undefined,
) {
  if (!servidor) return "";

  const funcao = servidor.funcaoAtualDescricao?.trim();
  const categoria = servidor.funcaoAtualCategoriaSarh?.trim();

  if (funcao && categoria) {
    return `${categoria} - ${funcao}`;
  }

  if (funcao) return funcao;

  return "";
}

export function descricaoNomeFuncaoServidor(
  servidor: ServidorFuncaoCargo | null | undefined,
) {
  if (!servidor) return "";

  return servidor.funcaoAtualDescricao?.trim() ?? "";
}

export function descricaoCargoServidor(
  servidor: ServidorFuncaoCargo | null | undefined,
) {
  if (!servidor) return "";

  return (
    servidor.cargo?.descricao?.trim() ??
    servidor.lotacoes
      ?.find((lotacao) => lotacao.cargo?.descricao)
      ?.cargo?.descricao?.trim() ??
    ""
  );
}
