export function criarQueryStringAtualizada(
  searchParams: URLSearchParams,
  alteracoes: Record<string, string | number | null | undefined>,
) {
  const params = new URLSearchParams(searchParams.toString());

  for (const [chave, valor] of Object.entries(alteracoes)) {
    const valorNormalizado = String(valor ?? "").trim();

    if (valorNormalizado) {
      params.set(chave, valorNormalizado);
    } else {
      params.delete(chave);
    }
  }

  return params;
}

export function montarHrefComQuery(pathname: string, params: URLSearchParams) {
  const queryString = params.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}

