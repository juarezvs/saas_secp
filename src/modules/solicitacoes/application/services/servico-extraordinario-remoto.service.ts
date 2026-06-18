type MarcacaoServicoExtraordinario = {
  fonte?: string | null;
  metadados?: unknown;
};

function metadadosComoObjeto(metadados: unknown) {
  if (!metadados || typeof metadados !== "object" || Array.isArray(metadados)) {
    return null;
  }

  return metadados as Record<string, unknown>;
}

export function marcacaoPossuiRegistroBiometrico(
  marcacao: MarcacaoServicoExtraordinario,
) {
  if (
    marcacao.fonte === "BIOMETRIA_FACIAL" ||
    marcacao.fonte === "EQUIPAMENTO_BIOMETRICO" ||
    marcacao.fonte === "AFD"
  ) {
    return true;
  }

  const metadados = metadadosComoObjeto(marcacao.metadados);

  if (!metadados) {
    return false;
  }

  if (metadados.biometriaValidadaNestaEtapa === true) {
    return true;
  }

  if (metadados.origemBruta === "FACIAL_AUTORIZADO") {
    return true;
  }

  return false;
}

export function todasMarcacoesSaoBiometricas(
  marcacoes: MarcacaoServicoExtraordinario[],
) {
  return (
    marcacoes.length > 0 &&
    marcacoes.every((marcacao) => marcacaoPossuiRegistroBiometrico(marcacao))
  );
}
