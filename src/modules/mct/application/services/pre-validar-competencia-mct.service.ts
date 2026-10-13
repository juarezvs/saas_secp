import type { AnaliseJornadaMctDto } from "../dtos/analise-jornada.dto";

export type PendenciaPreValidacaoMct = {
  tipo:
    | "DIA_NAO_PROCESSADO"
    | "MARCACAO_INCOMPLETA"
    | "CLASSIFICACAO_CONFLITANTE"
    | "RUBRICA_PENDENTE"
    | "EXCEDENTE_SEM_DESTINACAO"
    | "DIVERGENCIA_CRITICA";
  severidade: "INFORMATIVA" | "ATENCAO" | "CRITICA";
  descricao: string;
  datas: string[];
  quantidade: number;
};

type JornadaMct = Partial<{ excedentePendenteMinutos: number }>;

function objeto(valor: unknown) {
  return valor && typeof valor === "object"
    ? (valor as Record<string, unknown>)
    : {};
}

function adicionar(
  mapa: Map<string, PendenciaPreValidacaoMct>,
  pendencia: Omit<PendenciaPreValidacaoMct, "datas" | "quantidade">,
  data: string,
) {
  const atual = mapa.get(pendencia.tipo);
  if (atual) {
    atual.datas.push(data);
    atual.quantidade += 1;
    return;
  }
  mapa.set(pendencia.tipo, { ...pendencia, datas: [data], quantidade: 1 });
}

export function preValidarCompetenciaMct(params: {
  datasApuradas: string[];
  analises: Record<string, AnaliseJornadaMctDto>;
}) {
  const pendencias = new Map<string, PendenciaPreValidacaoMct>();

  for (const data of params.datasApuradas) {
    const analise = params.analises[data];
    if (!analise) {
      adicionar(
        pendencias,
        {
          tipo: "DIA_NAO_PROCESSADO",
          severidade: "INFORMATIVA",
          descricao: "Existem dias do espelho ainda sem execução MCT SHADOW.",
        },
        data,
      );
      continue;
    }

    if (
      analise.fatos.some((fato) =>
        [
          "MARCACAO_INCOMPLETA",
          "ENTRADA_SEM_SAIDA",
          "SAIDA_SEM_ENTRADA",
        ].includes(fato.codigo),
      )
    ) {
      adicionar(
        pendencias,
        {
          tipo: "MARCACAO_INCOMPLETA",
          severidade: "ATENCAO",
          descricao: "O MCT identificou marcações temporais incompletas.",
        },
        data,
      );
    }

    const memoria = objeto(analise.memoriaCalculo);
    if (
      Array.isArray(memoria.conflitosClassificacao) &&
      memoria.conflitosClassificacao.length > 0
    ) {
      adicionar(
        pendencias,
        {
          tipo: "CLASSIFICACAO_CONFLITANTE",
          severidade: "CRITICA",
          descricao: "Há conflitos de classificação que exigem resolução.",
        },
        data,
      );
    }

    if (analise.rubricas.some((rubrica) => rubrica.status !== "APLICADA")) {
      adicionar(
        pendencias,
        {
          tipo: "RUBRICA_PENDENTE",
          severidade: "ATENCAO",
          descricao: "Existem rubricas aguardando autorização ou homologação.",
        },
        data,
      );
    }

    const jornada = objeto(analise.resultadoJornada) as JornadaMct;
    if ((jornada.excedentePendenteMinutos ?? 0) > 0) {
      adicionar(
        pendencias,
        {
          tipo: "EXCEDENTE_SEM_DESTINACAO",
          severidade: "ATENCAO",
          descricao: "Existe excedente bruto ainda sem destinação reconhecida.",
        },
        data,
      );
    }

    if (analise.comparacaoLegado?.possuiDivergenciaCritica) {
      adicionar(
        pendencias,
        {
          tipo: "DIVERGENCIA_CRITICA",
          severidade: "CRITICA",
          descricao: "O resultado MCT diverge do legado em crédito ou débito.",
        },
        data,
      );
    }
  }

  const lista = [...pendencias.values()];
  return {
    modo: "SHADOW" as const,
    efeitoOficial: false as const,
    diasApurados: params.datasApuradas.length,
    diasAnalisados: params.datasApuradas.filter((data) => params.analises[data])
      .length,
    pendencias: lista,
    possuiPendenciaCritica: lista.some((item) => item.severidade === "CRITICA"),
  };
}

export type PreValidacaoCompetenciaMct = ReturnType<
  typeof preValidarCompetenciaMct
>;
