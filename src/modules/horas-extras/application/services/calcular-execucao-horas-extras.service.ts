type DiaAutorizadoCalculo = {
  id: string;
  date: Date;
  approvedMinutes: number;
};

type ApuracaoDiaCalculo = {
  dataReferencia: Date;
  minutosCredito: number;
  status: string;
};

export type ResultadoExecucaoDiaHorasExtras = {
  authorizationDayId: string;
  date: Date;
  approvedMinutes: number;
  executedMinutes: number;
  pendingMinutes: number;
  excessMinutes: number;
  status: "SEM_APURACAO" | "PENDENTE" | "EXECUTADO" | "EXECUTADO_PARCIAL" | "EXCEDENTE";
};

function chaveData(data: Date) {
  return data.toISOString().slice(0, 10);
}

export function calcularExecucaoHorasExtras(params: {
  diasAutorizados: DiaAutorizadoCalculo[];
  apuracoes: ApuracaoDiaCalculo[];
}): ResultadoExecucaoDiaHorasExtras[] {
  const apuracoesPorData = new Map(
    params.apuracoes.map((apuracao) => [chaveData(apuracao.dataReferencia), apuracao]),
  );

  return params.diasAutorizados.map((dia) => {
    const apuracao = apuracoesPorData.get(chaveData(dia.date));

    if (!apuracao || apuracao.status !== "CALCULADA") {
      return {
        authorizationDayId: dia.id,
        date: dia.date,
        approvedMinutes: dia.approvedMinutes,
        executedMinutes: 0,
        pendingMinutes: dia.approvedMinutes,
        excessMinutes: 0,
        status: "SEM_APURACAO",
      };
    }

    const executedMinutes = Math.min(dia.approvedMinutes, apuracao.minutosCredito);
    const pendingMinutes = Math.max(0, dia.approvedMinutes - executedMinutes);
    const excessMinutes = Math.max(0, apuracao.minutosCredito - dia.approvedMinutes);
    const status =
      excessMinutes > 0
        ? "EXCEDENTE"
        : pendingMinutes === 0
          ? "EXECUTADO"
          : executedMinutes > 0
            ? "EXECUTADO_PARCIAL"
            : "PENDENTE";

    return {
      authorizationDayId: dia.id,
      date: dia.date,
      approvedMinutes: dia.approvedMinutes,
      executedMinutes,
      pendingMinutes,
      excessMinutes,
      status,
    };
  });
}

export function somarExecucaoHorasExtras(
  dias: ResultadoExecucaoDiaHorasExtras[],
) {
  return dias.reduce(
    (total, dia) => ({
      approvedMinutes: total.approvedMinutes + dia.approvedMinutes,
      executedMinutes: total.executedMinutes + dia.executedMinutes,
      pendingMinutes: total.pendingMinutes + dia.pendingMinutes,
      excessMinutes: total.excessMinutes + dia.excessMinutes,
    }),
    {
      approvedMinutes: 0,
      executedMinutes: 0,
      pendingMinutes: 0,
      excessMinutes: 0,
    },
  );
}
