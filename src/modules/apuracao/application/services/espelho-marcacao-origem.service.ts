export type MarcacaoOrigemEspelho = {
  tipo: string;
  fonte?: string | null;
  status: string;
  metadados?: unknown;
};

function metadadosMarcacaoComoObjeto(metadados: unknown) {
  if (!metadados || typeof metadados !== "object" || Array.isArray(metadados)) {
    return {};
  }

  return metadados as Record<string, unknown>;
}

export function marcacaoManualImportada(marcacao: MarcacaoOrigemEspelho) {
  const metadados = metadadosMarcacaoComoObjeto(marcacao.metadados);
  const origemBruta = metadados.origemBruta;

  return (
    marcacao.tipo === "MANUAL" &&
    (marcacao.fonte === "EQUIPAMENTO_BIOMETRICO" ||
      marcacao.fonte === "AFD" ||
      origemBruta === "EQUIPAMENTO_BIOMETRICO" ||
      origemBruta === "IMPORTACAO_AFD")
  );
}

export function marcacaoPossuiAjuste(marcacao: MarcacaoOrigemEspelho) {
  const metadados = metadadosMarcacaoComoObjeto(marcacao.metadados);

  return (
    marcacao.status === "AJUSTADA" ||
    marcacao.fonte === "MANUAL_ADMINISTRATIVO" ||
    marcacao.tipo === "AJUSTE" ||
    metadados.origem === "SOLICITACAO_DEFERIDA"
  );
}

export function descricaoMarcacao(marcacao: MarcacaoOrigemEspelho) {
  const partes = [marcacao.tipo, marcacao.status];

  if (marcacao.fonte) {
    partes.push(marcacao.fonte);
  }

  if (marcacaoManualImportada(marcacao)) {
    partes.push("marcação complementar importada");
  }

  if (marcacaoPossuiAjuste(marcacao)) {
    partes.push("ajuste aplicado");
  }

  return partes.join(" - ");
}
