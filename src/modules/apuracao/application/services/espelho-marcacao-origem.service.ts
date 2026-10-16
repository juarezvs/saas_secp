export type MarcacaoOrigemEspelho = {
  tipo: string;
  fonte?: string | null;
  status: string;
  metadados?: unknown;
  equipamentoOrigem?: EquipamentoOrigemEspelho | null;
};

export type EquipamentoOrigemEspelho = {
  nome: string;
  codigo: string;
  ip: string | null;
  porta: number | null;
  localizacao: string | null;
  fabricante: string | null;
  modelo: string | null;
  numeroSerie: string | null;
};

export function detalhesOrigemMarcacao(marcacao: MarcacaoOrigemEspelho) {
  const metadados = metadadosMarcacaoComoObjeto(marcacao.metadados);
  const equipamento = marcacao.equipamentoOrigem;
  const origem = metadados.origemBruta;
  const importadaAfd = marcacao.fonte === "AFD" || origem === "IMPORTACAO_AFD";
  let titulo = "Origem não informada";

  if (importadaAfd) titulo = "Importação de arquivo AFD";
  else if (marcacao.fonte === "EQUIPAMENTO_BIOMETRICO" || origem === "EQUIPAMENTO_BIOMETRICO") {
    // A fonte identifica o equipamento; o modelo é necessário para afirmar que é facial.
    titulo = /face|facial/i.test(equipamento?.modelo ?? "")
      ? "Reconhecimento facial via equipamento biométrico"
      : "Equipamento biométrico";
  } else if (origem === "TOTEM_FACIAL_SECP") titulo = "Reconhecimento facial via totem";
  else if (marcacao.fonte === "BIOMETRIA_FACIAL" || origem === "FACIAL_AUTORIZADO") titulo = "Reconhecimento facial via computador";
  else if (marcacao.fonte === "MANUAL_ADMINISTRATIVO") titulo = "Registro administrativo";
  else if (marcacao.fonte === "WEB" || origem === "WEB_AUTORIZADO") titulo = "Sistema web";
  else if (marcacao.fonte === "IMPORTACAO") titulo = "Importação de marcações";

  const campos: Array<[string, string]> = [];
  const adicionar = (rotulo: string, valor: unknown) => {
    if (typeof valor === "string" && valor.trim()) campos.push([rotulo, valor.trim()]);
    else if (typeof valor === "number" && Number.isFinite(valor)) campos.push([rotulo, String(valor)]);
  };
  if (equipamento) {
    adicionar("Equipamento", equipamento.nome);
    adicionar("Código", equipamento.codigo);
    adicionar("IP do equipamento", equipamento.ip);
    adicionar("Porta", equipamento.porta);
    adicionar("Localização", equipamento.localizacao);
    adicionar("Fabricante", equipamento.fabricante);
    adicionar("Modelo", equipamento.modelo);
    adicionar("Número de série", equipamento.numeroSerie);
  } else adicionar("Código do equipamento", metadados.equipamentoCodigo);
  adicionar("NSR / evento", metadados.nsr);
  const tipos: Record<string, string> = {
    ENTRADA: "Entrada",
    SAIDA: "Saída",
    SAIDA_INTERVALO: "Saída para intervalo",
    RETORNO_INTERVALO: "Retorno do intervalo",
    MANUAL: "Manual",
    AJUSTE: "Ajuste",
  };
  adicionar("Tipo", tipos[marcacao.tipo] ?? marcacao.tipo.replaceAll("_", " "));
  return { titulo, campos, ajustada: marcacaoPossuiAjuste(marcacao) };
}

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
