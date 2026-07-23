export type SituacaoPrazoRegulatorio =
  | "NO_PRAZO"
  | "VENCE_HOJE"
  | "VENCIDO"
  | "CONCLUIDO_NO_PRAZO"
  | "CONCLUIDO_EM_ATRASO";

export type PrazoRegulatorio = {
  dataLimite: Date;
  dataConclusao: Date | null;
  situacao: SituacaoPrazoRegulatorio;
  diasRestantes: number;
  diasAtraso: number;
};

type CalcularPrazoParams = {
  anoReferencia: number;
  mesReferencia: number;
  concluidoEm?: Date | null;
  hoje?: Date;
  diaLimiteMesSeguinte?: number;
};

const formatadorDataPtBr = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

function normalizarData(valor: Date) {
  return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
}

function diferencaEmDias(inicio: Date, fim: Date) {
  const milissegundosPorDia = 24 * 60 * 60 * 1000;
  return Math.round(
    (normalizarData(fim).getTime() - normalizarData(inicio).getTime()) /
      milissegundosPorDia,
  );
}

function ehDiaUtil(data: Date) {
  const diaSemana = data.getDay();
  return diaSemana !== 0 && diaSemana !== 6;
}

function obterDiaUtilDoMes(params: {
  ano: number;
  mes: number;
  ordem: number;
}) {
  let dia = new Date(params.ano, params.mes - 1, 1);
  let uteisEncontrados = 0;

  while (true) {
    if (ehDiaUtil(dia)) {
      uteisEncontrados += 1;
      if (uteisEncontrados === params.ordem) {
        return normalizarData(dia);
      }
    }

    dia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1);
  }
}

function ajustarParaDiaUtilSeguinte(data: Date) {
  let ajustada = normalizarData(data);

  while (!ehDiaUtil(ajustada)) {
    ajustada = new Date(
      ajustada.getFullYear(),
      ajustada.getMonth(),
      ajustada.getDate() + 1,
    );
  }

  return ajustada;
}

async function ehDiaUtilComCalendario(data: Date) {
  const { classificarDiaInstitucional } = await import(
    "../../../calendario-institucional/application/services/classificar-dia-institucional.service"
  );
  const classificacao = await classificarDiaInstitucional(data);
  return classificacao.contaComoDiaUtil;
}

async function obterDiaUtilDoMesComCalendario(params: {
  ano: number;
  mes: number;
  ordem: number;
}) {
  let dia = new Date(params.ano, params.mes - 1, 1);
  let uteisEncontrados = 0;

  while (true) {
    if (await ehDiaUtilComCalendario(dia)) {
      uteisEncontrados += 1;

      if (uteisEncontrados === params.ordem) {
        return normalizarData(dia);
      }
    }

    dia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1);
  }
}

async function ajustarParaDiaUtilSeguinteComCalendario(data: Date) {
  let ajustada = normalizarData(data);

  while (!(await ehDiaUtilComCalendario(ajustada))) {
    ajustada = new Date(
      ajustada.getFullYear(),
      ajustada.getMonth(),
      ajustada.getDate() + 1,
    );
  }

  return ajustada;
}

function proximoMes(anoReferencia: number, mesReferencia: number) {
  if (mesReferencia === 12) {
    return {
      ano: anoReferencia + 1,
      mes: 1,
    };
  }

  return {
    ano: anoReferencia,
    mes: mesReferencia + 1,
  };
}

function calcularPrazo(params: {
  dataLimite: Date;
  concluidoEm?: Date | null;
  hoje?: Date;
}): PrazoRegulatorio {
  const dataLimite = normalizarData(params.dataLimite);
  const dataConclusao = params.concluidoEm
    ? normalizarData(params.concluidoEm)
    : null;
  const hoje = normalizarData(params.hoje ?? new Date());

  if (dataConclusao) {
    const diasAtraso = Math.max(0, diferencaEmDias(dataLimite, dataConclusao));

    return {
      dataLimite,
      dataConclusao,
      situacao:
        diasAtraso > 0 ? "CONCLUIDO_EM_ATRASO" : "CONCLUIDO_NO_PRAZO",
      diasRestantes: 0,
      diasAtraso,
    };
  }

  const diferencaHoje = diferencaEmDias(hoje, dataLimite);

  if (diferencaHoje > 0) {
    return {
      dataLimite,
      dataConclusao: null,
      situacao: "NO_PRAZO",
      diasRestantes: diferencaHoje,
      diasAtraso: 0,
    };
  }

  if (diferencaHoje === 0) {
    return {
      dataLimite,
      dataConclusao: null,
      situacao: "VENCE_HOJE",
      diasRestantes: 0,
      diasAtraso: 0,
    };
  }

  return {
    dataLimite,
    dataConclusao: null,
    situacao: "VENCIDO",
    diasRestantes: 0,
    diasAtraso: Math.abs(diferencaHoje),
  };
}

export function calcularPrazoHomologacaoCompetencia(
  params: CalcularPrazoParams,
) {
  const referenciaSeguinte = proximoMes(
    params.anoReferencia,
    params.mesReferencia,
  );
  const dataLimite = params.diaLimiteMesSeguinte
    ? ajustarParaDiaUtilSeguinte(
        new Date(
          referenciaSeguinte.ano,
          referenciaSeguinte.mes - 1,
          params.diaLimiteMesSeguinte,
        ),
      )
    : obterDiaUtilDoMes({
        ano: referenciaSeguinte.ano,
        mes: referenciaSeguinte.mes,
        ordem: 2,
      });

  return calcularPrazo({
    dataLimite,
    concluidoEm: params.concluidoEm,
    hoje: params.hoje,
  });
}

export function calcularPrazoEncaminhamentoBoletimCompetencia(
  params: CalcularPrazoParams,
) {
  const referenciaSeguinte = proximoMes(
    params.anoReferencia,
    params.mesReferencia,
  );
  const dataBase = new Date(
    referenciaSeguinte.ano,
    referenciaSeguinte.mes - 1,
    params.diaLimiteMesSeguinte ?? 10,
  );

  return calcularPrazo({
    dataLimite: ajustarParaDiaUtilSeguinte(dataBase),
    concluidoEm: params.concluidoEm,
    hoje: params.hoje,
  });
}

export async function calcularPrazoHomologacaoCompetenciaComCalendario(
  params: CalcularPrazoParams,
) {
  const referenciaSeguinte = proximoMes(
    params.anoReferencia,
    params.mesReferencia,
  );
  const dataLimite = params.diaLimiteMesSeguinte
    ? await ajustarParaDiaUtilSeguinteComCalendario(
        new Date(
          referenciaSeguinte.ano,
          referenciaSeguinte.mes - 1,
          params.diaLimiteMesSeguinte,
        ),
      )
    : await obterDiaUtilDoMesComCalendario({
        ano: referenciaSeguinte.ano,
        mes: referenciaSeguinte.mes,
        ordem: 2,
      });

  return calcularPrazo({
    dataLimite,
    concluidoEm: params.concluidoEm,
    hoje: params.hoje,
  });
}

export async function calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario(
  params: CalcularPrazoParams,
) {
  const referenciaSeguinte = proximoMes(
    params.anoReferencia,
    params.mesReferencia,
  );
  const dataBase = new Date(
    referenciaSeguinte.ano,
    referenciaSeguinte.mes - 1,
    params.diaLimiteMesSeguinte ?? 10,
  );

  return calcularPrazo({
    dataLimite: await ajustarParaDiaUtilSeguinteComCalendario(dataBase),
    concluidoEm: params.concluidoEm,
    hoje: params.hoje,
  });
}

export function formatarDataPrazoRegulatorio(data: Date) {
  return formatadorDataPtBr.format(data);
}

export function rotuloSituacaoPrazoRegulatorio(
  situacao: SituacaoPrazoRegulatorio,
) {
  const rotulos: Record<SituacaoPrazoRegulatorio, string> = {
    NO_PRAZO: "No prazo",
    VENCE_HOJE: "Vence hoje",
    VENCIDO: "Vencido",
    CONCLUIDO_NO_PRAZO: "Concluido no prazo",
    CONCLUIDO_EM_ATRASO: "Concluido em atraso",
  };

  return rotulos[situacao];
}

export function classeSituacaoPrazoRegulatorio(
  situacao: SituacaoPrazoRegulatorio,
) {
  if (situacao === "CONCLUIDO_NO_PRAZO") {
    return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
  }

  if (situacao === "NO_PRAZO") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  }

  if (situacao === "VENCE_HOJE" || situacao === "CONCLUIDO_EM_ATRASO") {
    return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
  }

  return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
}

export function descreverPrazoRegulatorio(prazo: PrazoRegulatorio) {
  if (prazo.situacao === "CONCLUIDO_NO_PRAZO") {
    return "Fluxo concluido dentro do prazo regulamentar.";
  }

  if (prazo.situacao === "CONCLUIDO_EM_ATRASO") {
    return `Fluxo concluido com ${prazo.diasAtraso} dia(s) de atraso.`;
  }

  if (prazo.situacao === "VENCE_HOJE") {
    return "Prazo final na data de hoje.";
  }

  if (prazo.situacao === "NO_PRAZO") {
    return `Restam ${prazo.diasRestantes} dia(s) para o prazo final.`;
  }

  return `Prazo vencido ha ${prazo.diasAtraso} dia(s).`;
}
