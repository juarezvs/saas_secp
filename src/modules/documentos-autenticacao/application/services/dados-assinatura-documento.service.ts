type ServidorDadosAssinatura = {
  funcaoAtualCategoriaSarh?: string | null;
  funcaoAtualCodigoSarh?: string | null;
  funcaoAtualDescricao?: string | null;
  cargo?: {
    descricao?: string | null;
  } | null;
  orgao?: {
    sigla?: string | null;
  } | null;
  lotacoes?: {
    cargo?: {
      descricao?: string | null;
    } | null;
    unidade?: {
      sigla?: string | null;
      orgao?: {
        sigla?: string | null;
      } | null;
    } | null;
  }[];
};

function texto(valor?: string | null) {
  return valor?.trim() || "";
}

function adicionarUnico(lista: string[], valor: string) {
  const normalizado = texto(valor);

  if (normalizado && !lista.includes(normalizado)) {
    lista.push(normalizado);
  }
}

function servidorOcupaFcOuCj(servidor?: ServidorDadosAssinatura | null) {
  const categoria = texto(servidor?.funcaoAtualCategoriaSarh).toUpperCase();
  const codigo = texto(servidor?.funcaoAtualCodigoSarh).toUpperCase();

  return categoria.startsWith("FC") || categoria.startsWith("CJ") ||
    codigo.startsWith("FC") || codigo.startsWith("CJ");
}

export function resolverSeccionalAssinatura(
  servidor?: ServidorDadosAssinatura | null,
) {
  return (
    texto(servidor?.orgao?.sigla) ||
    texto(servidor?.lotacoes?.[0]?.unidade?.orgao?.sigla) ||
    texto(servidor?.lotacoes?.[0]?.unidade?.sigla) ||
    "SECP"
  );
}

export function montarOpcoesCargoFuncaoAssinatura(
  servidor?: ServidorDadosAssinatura | null,
) {
  const opcoes: string[] = [];

  adicionarUnico(opcoes, texto(servidor?.cargo?.descricao));

  for (const lotacao of servidor?.lotacoes ?? []) {
    adicionarUnico(opcoes, texto(lotacao.cargo?.descricao));
  }

  if (servidorOcupaFcOuCj(servidor)) {
    const partes = [
      texto(servidor?.funcaoAtualCategoriaSarh) ||
        texto(servidor?.funcaoAtualCodigoSarh),
      texto(servidor?.funcaoAtualDescricao),
    ].filter(Boolean);

    adicionarUnico(opcoes, partes.join(" - "));
  }

  if (opcoes.length === 0) {
    opcoes.push("Não informado");
  }

  return opcoes;
}
