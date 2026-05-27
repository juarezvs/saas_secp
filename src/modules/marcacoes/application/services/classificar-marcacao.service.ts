type MarcacaoExistente = {
  tipo: string;
  dataHora: Date;
};

export type ResultadoClassificacaoMarcacao = {
  tipo: "ENTRADA" | "SAIDA_INTERVALO" | "RETORNO_INTERVALO" | "SAIDA";
  ordem: number;
  descricao: string;
  exigeReconhecimentoFacial: boolean;
};

type ClassificarProximaMarcacaoParams = {
  marcacoesDoDia: MarcacaoExistente[];
  exigeIntervalo: boolean;
};

export function classificarProximaMarcacao({
  marcacoesDoDia,
  exigeIntervalo,
}: ClassificarProximaMarcacaoParams): ResultadoClassificacaoMarcacao {
  const marcacoesValidas = marcacoesDoDia
    .filter((marcacao) =>
      ["ENTRADA", "SAIDA_INTERVALO", "RETORNO_INTERVALO", "SAIDA"].includes(
        marcacao.tipo,
      ),
    )
    .sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());

  const quantidade = marcacoesValidas.length;

  if (!exigeIntervalo) {
    if (quantidade === 0) {
      return {
        tipo: "ENTRADA",
        ordem: 1,
        descricao: "Entrada",
        exigeReconhecimentoFacial: true,
      };
    }

    if (quantidade === 1) {
      return {
        tipo: "SAIDA",
        ordem: 2,
        descricao: "Saída",
        exigeReconhecimentoFacial: false,
      };
    }

    throw new Error(
      "As marcações ordinárias do dia já foram registradas para jornada sem intervalo.",
    );
  }

  if (quantidade === 0) {
    return {
      tipo: "ENTRADA",
      ordem: 1,
      descricao: "Entrada",
      exigeReconhecimentoFacial: true,
    };
  }

  if (quantidade === 1) {
    return {
      tipo: "SAIDA_INTERVALO",
      ordem: 2,
      descricao: "Saída para intervalo",
      exigeReconhecimentoFacial: false,
    };
  }

  if (quantidade === 2) {
    return {
      tipo: "RETORNO_INTERVALO",
      ordem: 3,
      descricao: "Retorno do intervalo",
      exigeReconhecimentoFacial: false,
    };
  }

  if (quantidade === 3) {
    return {
      tipo: "SAIDA",
      ordem: 4,
      descricao: "Saída",
      exigeReconhecimentoFacial: false,
    };
  }

  throw new Error(
    "As quatro marcações ordinárias do dia já foram registradas. Novos registros dependerão de solicitação ou autorização.",
  );
}

export function obterRotuloTipoMarcacao(tipo: string) {
  const rotulos: Record<string, string> = {
    ENTRADA: "Entrada",
    SAIDA_INTERVALO: "Saída para intervalo",
    RETORNO_INTERVALO: "Retorno do intervalo",
    SAIDA: "Saída",
    MANUAL: "Manual",
    AJUSTE: "Ajuste",
  };

  return rotulos[tipo] ?? tipo;
}
