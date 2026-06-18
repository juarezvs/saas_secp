export type SolicitacaoAplicadaEspelho = {
  id: string;
  tipo: string;
  titulo: string;
  minutosCobertos: number;
  coberturaIntegral: boolean;
  trabalhoRemoto: boolean;
};

export type OcorrenciaEspelho = {
  tipo: string;
  descricao: string;
  minutos: number;
};

export type ItemEspelhoMensalClassificacao = {
  resultado: string;
  minutosDebito: number;
  metadados?: unknown;
  ocorrencias?: OcorrenciaEspelho[];
};

export type ClassificacaoDiaEspelho = {
  ausente: boolean;
  ausenciaParcial: boolean;
  atividadeExterna: boolean;
  viagemServico: boolean;
  solicitacoesAplicadas: SolicitacaoAplicadaEspelho[];
  ocorrencias: OcorrenciaEspelho[];
};

export type ResumoEspelhoMensal = {
  ausencias: number;
  minutosAusencia: number;
  atividadesExternas: number;
  minutosAtividadeExterna: number;
  viagensServico: number;
  minutosViagemServico: number;
};

export type ConferenciaEspelho = {
  rotulo: string;
  descricao: string;
  tom: "ok" | "alerta" | "neutro";
};

export function conferenciaEspelho(
  status: string,
  item?: ItemEspelhoMensalClassificacao,
): ConferenciaEspelho {
  if (status === "CALCULADA") {
    return {
      rotulo: "Calculada",
      descricao: "Apuracao diaria calculada sem pendencia impeditiva.",
      tom: "ok",
    };
  }

  if (status === "INCONSISTENTE") {
    const causas = item ? causasInconsistenciaEspelho(item) : [];

    return {
      rotulo: "Requer analise",
      descricao: formatarDescricaoConferencia(
        causas.length > 0
          ? causas
          : [
              "Apuracao diaria possui ocorrencia que exige conferencia antes da homologacao.",
            ],
      ),
      tom: "alerta",
    };
  }

  if (status === "PENDENTE") {
    return {
      rotulo: "Pendente",
      descricao: "Apuracao diaria ainda nao foi consolidada.",
      tom: "neutro",
    };
  }

  return {
    rotulo: status,
    descricao: "Situacao tecnica da apuracao diaria.",
    tom: "neutro",
  };
}

export function causasInconsistenciaEspelho(
  item: ItemEspelhoMensalClassificacao,
) {
  const causas = new Set<string>();

  for (const ocorrencia of item.ocorrencias ?? []) {
    causas.add(causaOcorrenciaEspelho(ocorrencia));
  }

  if (item.resultado === "FALTA") {
    causas.add("Jornada esperada, mas sem marcacoes: falta.");
  }

  if (item.resultado === "DEBITO" || item.minutosDebito > 0) {
    causas.add("Debito ou falta nao justificados integralmente.");
  }

  for (const solicitacao of extrairSolicitacoesAplicadasEspelho(
    item.metadados,
  )) {
    if (!solicitacao.coberturaIntegral && item.minutosDebito > 0) {
      causas.add(
        "Solicitacao deferida nao cobre totalmente a inconsistencia do dia.",
      );
    }
  }

  return Array.from(causas);
}

function causaOcorrenciaEspelho(ocorrencia: OcorrenciaEspelho) {
  const descricao = ocorrencia.descricao?.trim();
  const complemento = descricao ? ` ${descricao}` : "";

  if (
    ocorrencia.tipo === "MARCACAO_INCOMPLETA" &&
    descricao?.toUpperCase().includes("FREQUENCIA MANUAL OBRIGATORIA")
  ) {
    return `Dispensa/teletrabalho/regra especial ainda com exigencia pendente.${complemento}`;
  }

  const rotulos: Record<string, string> = {
    MARCACAO_INCOMPLETA:
      "Marcacoes incompletas, por exemplo entrada sem saida.",
    INTERVALO_INVALIDO:
      "Intervalo obrigatorio ausente ou fora dos limites.",
    HORA_NAO_AUTORIZADA:
      "Horas registradas fora da janela autorizada.",
    FALTA: "Jornada esperada, mas sem marcacoes: falta.",
    DEBITO: "Debito ou falta nao justificados integralmente.",
    SEM_JORNADA: "Servidor sem jornada configurada em dia util.",
  };

  const rotulo = rotulos[ocorrencia.tipo];

  if (rotulo) {
    return complemento ? `${rotulo}${complemento}` : rotulo;
  }

  return descricao
    ? `${ocorrencia.tipo}: ${descricao}`
    : `Ocorrencia ${ocorrencia.tipo} exige conferencia.`;
}

function formatarDescricaoConferencia(causas: string[]) {
  return ["Causas da conferencia:", ...causas.map((causa) => `- ${causa}`)].join(
    "\n",
  );
}

export function extrairSolicitacoesAplicadasEspelho(
  metadados: unknown,
): SolicitacaoAplicadaEspelho[] {
  if (!metadados || typeof metadados !== "object") {
    return [];
  }

  const valor = (metadados as { solicitacoesAplicadas?: unknown })
    .solicitacoesAplicadas;

  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.flatMap((item): SolicitacaoAplicadaEspelho[] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const dados = item as Record<string, unknown>;

    if (
      typeof dados.id !== "string" ||
      typeof dados.tipo !== "string" ||
      typeof dados.titulo !== "string"
    ) {
      return [];
    }

    return [
      {
        id: dados.id,
        tipo: dados.tipo,
        titulo: dados.titulo,
        minutosCobertos:
          typeof dados.minutosCobertos === "number"
            ? dados.minutosCobertos
            : 0,
        coberturaIntegral: dados.coberturaIntegral === true,
        trabalhoRemoto: dados.trabalhoRemoto === true,
      },
    ];
  });
}

export function rotuloSolicitacaoEspelho(tipo: string) {
  const rotulos: Record<string, string> = {
    ABONO_JUSTIFICATIVA: "Abono/justificativa",
    ATIVIDADE_EXTERNA: "Atividade externa",
    VIAGEM_SERVICO: "Viagem a servico",
    CAPACITACAO: "Capacitacao",
    DISPENSA_PONTO: "Dispensa de ponto",
    HORA_CREDITO_PREVIA: "Hora-credito previa",
    COMPENSACAO: "Compensacao deferida",
  };

  return rotulos[tipo] ?? tipo;
}

export function classificarDiaEspelho(
  item: ItemEspelhoMensalClassificacao,
): ClassificacaoDiaEspelho {
  const solicitacoesAplicadas = extrairSolicitacoesAplicadasEspelho(
    item.metadados,
  );
  const ocorrencias = item.ocorrencias ?? [];
  const atividadeExterna = solicitacoesAplicadas.some(
    (solicitacao) => solicitacao.tipo === "ATIVIDADE_EXTERNA",
  );
  const viagemServico = solicitacoesAplicadas.some(
    (solicitacao) => solicitacao.tipo === "VIAGEM_SERVICO",
  );
  const ausente =
    item.resultado === "FALTA" ||
    ocorrencias.some((ocorrencia) => ocorrencia.tipo === "FALTA");
  const ausenciaParcial =
    item.resultado === "DEBITO" ||
    (item.minutosDebito > 0 && !ausente) ||
    ocorrencias.some((ocorrencia) => ocorrencia.tipo === "DEBITO");

  return {
    ausente,
    ausenciaParcial,
    atividadeExterna,
    viagemServico,
    solicitacoesAplicadas,
    ocorrencias,
  };
}

export function resumirEspelhoMensal(
  itens: ItemEspelhoMensalClassificacao[],
): ResumoEspelhoMensal {
  return itens.reduce<ResumoEspelhoMensal>(
    (acc, item) => {
      const classificacao = classificarDiaEspelho(item);

      if (classificacao.ausente || classificacao.ausenciaParcial) {
        acc.ausencias++;
        acc.minutosAusencia += item.minutosDebito;
      }

      for (const solicitacao of classificacao.solicitacoesAplicadas) {
        if (solicitacao.tipo === "ATIVIDADE_EXTERNA") {
          acc.atividadesExternas++;
          acc.minutosAtividadeExterna += solicitacao.minutosCobertos;
        }

        if (solicitacao.tipo === "VIAGEM_SERVICO") {
          acc.viagensServico++;
          acc.minutosViagemServico += solicitacao.minutosCobertos;
        }
      }

      return acc;
    },
    {
      ausencias: 0,
      minutosAusencia: 0,
      atividadesExternas: 0,
      minutosAtividadeExterna: 0,
      viagensServico: 0,
      minutosViagemServico: 0,
    },
  );
}
