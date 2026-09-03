type MarcacaoExistente = {
  tipo: string;
  dataHora: Date;
};

export type ResultadoClassificacaoMarcacao = {
  tipo: "ENTRADA" | "SAIDA_INTERVALO" | "RETORNO_INTERVALO" | "SAIDA" | "MANUAL";
  ordem: number;
  descricao: string;
  exigeReconhecimentoFacial: boolean;
};

type ClassificarProximaMarcacaoParams = {
  marcacoesDoDia: MarcacaoExistente[];
  exigeIntervalo: boolean;
};

export const LIMITE_MARCACOES_DIARIAS = 6;

export const TIPOS_CONTABILIZADOS_LIMITE_DIARIO = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA",
  "MANUAL",
] as const;

export function contarMarcacoesDiarias(marcacoesDoDia: MarcacaoExistente[]) {
  return marcacoesDoDia.filter((marcacao) =>
    TIPOS_CONTABILIZADOS_LIMITE_DIARIO.includes(
      marcacao.tipo as (typeof TIPOS_CONTABILIZADOS_LIMITE_DIARIO)[number],
    ),
  ).length;
}

function classificacaoMarcacaoAdicional(
  quantidade: number,
): ResultadoClassificacaoMarcacao {
  const ordem = quantidade + 1;
  const direcao = ordem % 2 === 1 ? "Entrada" : "Saida";

  return {
    tipo: "MANUAL",
    ordem,
    descricao: `${direcao} adicional`,
    exigeReconhecimentoFacial: false,
  };
}

export function classificarProximaMarcacao({
  marcacoesDoDia,
  exigeIntervalo,
}: ClassificarProximaMarcacaoParams): ResultadoClassificacaoMarcacao {
  const marcacoesValidas = marcacoesDoDia
    .filter((marcacao) =>
      TIPOS_CONTABILIZADOS_LIMITE_DIARIO.includes(
        marcacao.tipo as (typeof TIPOS_CONTABILIZADOS_LIMITE_DIARIO)[number],
      ),
    )
    .sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());

  const quantidade = marcacoesValidas.length;

  if (quantidade >= LIMITE_MARCACOES_DIARIAS) {
    throw new Error(
      "Limite diario de 6 marcacoes atingido para este servidor.",
    );
  }

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
        descricao: "Saida",
        exigeReconhecimentoFacial: false,
      };
    }

    return classificacaoMarcacaoAdicional(quantidade);
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
      descricao: "Saida para intervalo",
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
      descricao: "Saida",
      exigeReconhecimentoFacial: false,
    };
  }

  return classificacaoMarcacaoAdicional(quantidade);
}

export function obterRotuloTipoMarcacao(tipo: string) {
  const rotulos: Record<string, string> = {
    ENTRADA: "Entrada",
    SAIDA_INTERVALO: "Saida para intervalo",
    RETORNO_INTERVALO: "Retorno do intervalo",
    SAIDA: "Saida",
    MANUAL: "Manual",
    AJUSTE: "Ajuste",
  };

  return rotulos[tipo] ?? tipo;
}
