type MovimentoFifo = {
  id: string;
  tipo: string;
  status: string;
  dataReferencia: Date;
  expiraEm: Date | null;
  minutos: number;
  metadados?: unknown;
};

type MovimentoFifoAtualizavel = MovimentoFifo & {
  metadados?: unknown;
};

type TxBancoHorasFifo = {
  movimentoBancoHoras: {
    findMany(args: unknown): Promise<MovimentoFifoAtualizavel[]>;
    update(args: unknown): Promise<unknown>;
  };
};

function metadadosComoObjeto(metadados: unknown) {
  if (!metadados || typeof metadados !== "object" || Array.isArray(metadados)) {
    return {};
  }

  return metadados as Record<string, unknown>;
}

function situacaoLote(restante: number, original: number, expiraEm: Date | null) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (restante <= 0) {
    return "COMPENSADO";
  }

  if (expiraEm && expiraEm < hoje) {
    return restante < original ? "PARCIALMENTE_COMPENSADO_VENCIDO" : "VENCIDO";
  }

  return restante < original ? "PARCIALMENTE_COMPENSADO" : "VIGENTE";
}

function ordenarLotes(a: MovimentoFifo, b: MovimentoFifo) {
  const prazoA = a.expiraEm?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const prazoB = b.expiraEm?.getTime() ?? Number.MAX_SAFE_INTEGER;

  if (prazoA !== prazoB) {
    return prazoA - prazoB;
  }

  return a.dataReferencia.getTime() - b.dataReferencia.getTime();
}

export function calcularRastreamentoFifoBancoHoras(movimentos: MovimentoFifo[]) {
  const lotesCredito = movimentos
    .filter(
      (movimento) =>
        movimento.tipo === "CREDITO" &&
        ["PENDENTE", "VALIDADO"].includes(movimento.status),
    )
    .sort(ordenarLotes)
    .map((movimento) => ({
      movimento,
      original: movimento.minutos,
      utilizado: 0,
      restante: movimento.minutos,
    }));
  const lotesDebito = movimentos
    .filter(
      (movimento) =>
        movimento.tipo === "DEBITO" &&
        ["PENDENTE", "VALIDADO"].includes(movimento.status),
    )
    .sort(ordenarLotes)
    .map((movimento) => ({
      movimento,
      original: movimento.minutos,
      utilizado: 0,
      restante: movimento.minutos,
    }));
  const consumos = new Map<
    string,
    Array<{ movimentoOrigemId: string; minutos: number; tipoLote: "CREDITO" | "DEBITO" }>
  >();

  for (const movimento of movimentos.sort(ordenarLotes)) {
    const lotes =
      movimento.tipo === "COMPENSACAO_CREDITO"
        ? lotesCredito
        : movimento.tipo === "COMPENSACAO_DEBITO"
          ? lotesDebito
          : null;

    if (!lotes || !["PENDENTE", "VALIDADO"].includes(movimento.status)) {
      continue;
    }

    let restante = movimento.minutos;
    const alocacoes: Array<{
      movimentoOrigemId: string;
      minutos: number;
      tipoLote: "CREDITO" | "DEBITO";
    }> = [];

    for (const lote of lotes) {
      if (restante <= 0) {
        break;
      }

      if (lote.restante <= 0) {
        continue;
      }

      const minutos = Math.min(restante, lote.restante);
      lote.utilizado += minutos;
      lote.restante -= minutos;
      restante -= minutos;
      alocacoes.push({
        movimentoOrigemId: lote.movimento.id,
        minutos,
        tipoLote: lote.movimento.tipo as "CREDITO" | "DEBITO",
      });
    }

    consumos.set(movimento.id, alocacoes);
  }

  return {
    lotes: [...lotesCredito, ...lotesDebito].map((lote) => ({
      movimentoId: lote.movimento.id,
      tipo: lote.movimento.tipo as "CREDITO" | "DEBITO",
      minutosOriginais: lote.original,
      minutosUtilizados: lote.utilizado,
      minutosRestantes: lote.restante,
      situacao: situacaoLote(lote.restante, lote.original, lote.movimento.expiraEm),
    })),
    consumos,
  };
}

export async function atualizarRastreamentoFifoBancoHorasTx(params: {
  tx: TxBancoHorasFifo;
  servidorId: string;
}) {
  const movimentos = await params.tx.movimentoBancoHoras.findMany({
    where: {
      servidorId: params.servidorId,
      tipo: {
        in: ["CREDITO", "DEBITO", "COMPENSACAO_CREDITO", "COMPENSACAO_DEBITO"],
      },
      status: {
        in: ["PENDENTE", "VALIDADO"],
      },
    },
    orderBy: [{ expiraEm: "asc" }, { dataReferencia: "asc" }, { criadoEm: "asc" }],
  });
  const rastreamento = calcularRastreamentoFifoBancoHoras(movimentos);

  for (const lote of rastreamento.lotes) {
    const movimento = movimentos.find((item) => item.id === lote.movimentoId);

    if (!movimento) {
      continue;
    }

    await params.tx.movimentoBancoHoras.update({
      where: {
        id: lote.movimentoId,
      },
      data: {
        metadados: {
          ...metadadosComoObjeto(movimento.metadados),
          fifo: {
            minutosOriginais: lote.minutosOriginais,
            minutosUtilizados: lote.minutosUtilizados,
            minutosRestantes: lote.minutosRestantes,
            situacao: lote.situacao,
            atualizadoEm: new Date().toISOString(),
          },
        },
      },
    });
  }

  for (const [movimentoId, alocacoes] of rastreamento.consumos) {
    const movimento = movimentos.find((item) => item.id === movimentoId);

    if (!movimento) {
      continue;
    }

    await params.tx.movimentoBancoHoras.update({
      where: {
        id: movimentoId,
      },
      data: {
        metadados: {
          ...metadadosComoObjeto(movimento.metadados),
          fifo: {
            alocacoes,
            atualizadoEm: new Date().toISOString(),
          },
        },
      },
    });
  }

  return rastreamento;
}
