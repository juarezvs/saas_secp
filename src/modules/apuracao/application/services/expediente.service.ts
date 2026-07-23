export const EXPEDIENTE_PADRAO = {
  inicio: "08:00",
  fim: "18:00",
} as const;

export const EXPEDIENTE_INTERNO_UNIDADE = {
  inicio: "08:00",
  fim: "16:00",
} as const;

export const EXPEDIENTE_EXTERNO_UNIDADE = {
  inicio: "08:00",
  fim: "15:00",
} as const;

export const JANELA_URGENCIAS_UNIDADE_JUDICIAL = {
  inicio: "15:01",
  fim: "18:00",
} as const;

export const EXPEDIENTE_DIFERENCIADO_LIMITE = {
  inicio: "06:00",
  fim: "19:00",
} as const;

type JornadaExpediente = {
  horarioDiferenciadoPermitido: boolean;
  horarioDiferenciadoAutorizado: boolean;
  entradaMinimaDiferenciada: string | null;
  saidaMaximaDiferenciada: string | null;
};

type RegulamentacaoExpediente = {
  expedientePadraoInicio: string;
  expedientePadraoFim: string;
  entradaMinimaPermitida: string;
  saidaMaximaPermitida: string;
};

export type JanelaExpediente = {
  inicio: string;
  fim: string;
  diferenciada: boolean;
};

type DiaInstitucionalExpediente = {
  tipo: string;
  descricao?: string | null;
  contaComoDiaUtil: boolean;
  geraApuracaoRegular: boolean;
  janelaInicio?: string | null;
  janelaFim?: string | null;
};

export type ExpedienteInstitucional = {
  temExpedienteOrdinario: boolean;
  janelaPadrao: { inicio: string; fim: string } | null;
  motivoSemExpediente: string | null;
};

type UnidadeExpediente = {
  id?: string | null;
  sigla?: string | null;
  nome?: string | null;
  tipo?: string | null;
};

export type ExpedienteUnidade = {
  unidadeId: string | null;
  sigla: string | null;
  tipo: string | null;
  regra: "INSTITUCIONAL_GERAL" | "INTERNO_EXTERNO";
  expedienteInterno: typeof EXPEDIENTE_PADRAO | typeof EXPEDIENTE_INTERNO_UNIDADE;
  expedienteExterno: typeof EXPEDIENTE_PADRAO | typeof EXPEDIENTE_EXTERNO_UNIDADE;
  coberturaUrgencias: {
    obrigatoria: boolean;
    inicio: typeof JANELA_URGENCIAS_UNIDADE_JUDICIAL.inicio | null;
    fim: typeof JANELA_URGENCIAS_UNIDADE_JUDICIAL.fim | null;
    fundamento: string | null;
  };
};

const TIPOS_COM_EXPEDIENTE_INTERNO_EXTERNO = new Set([
  "VARA",
  "GABINETE",
  "TURMA_RECURSAL",
  "CENTRO_CONCILIACAO",
  "NUCLEO",
  "SECAO",
  "SECRETARIA",
  "DEPARTAMENTO",
  "SUBDEPARTAMENTO",
]);

const TIPOS_UNIDADE_JUDICIAL_COM_COBERTURA_URGENCIAS = new Set([
  "VARA",
  "TURMA_RECURSAL",
]);

function horaParaMinutos(hora: string) {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

function minutosParaHora(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(
    minutosRestantes,
  ).padStart(2, "0")}`;
}

function combinarJanelas(
  janelaBase: { inicio: string; fim: string },
  janelaInstitucional?: { inicio: string; fim: string } | null,
) {
  if (!janelaInstitucional) {
    return janelaBase;
  }

  const inicio = Math.max(
    horaParaMinutos(janelaBase.inicio),
    horaParaMinutos(janelaInstitucional.inicio),
  );
  const fim = Math.min(
    horaParaMinutos(janelaBase.fim),
    horaParaMinutos(janelaInstitucional.fim),
  );

  if (fim <= inicio) {
    return janelaInstitucional;
  }

  return {
    inicio: minutosParaHora(inicio),
    fim: minutosParaHora(fim),
  };
}

export function calcularDuracaoJanelaExpediente(
  janela?: { inicio: string; fim: string } | null,
) {
  if (!janela) {
    return null;
  }

  return Math.max(0, horaParaMinutos(janela.fim) - horaParaMinutos(janela.inicio));
}

export function calcularCargaPrevistaComJanela(
  cargaDiariaMinutos: number,
  janela?: { inicio: string; fim: string } | null,
) {
  const duracaoJanela = calcularDuracaoJanelaExpediente(janela);

  if (!duracaoJanela) {
    return cargaDiariaMinutos;
  }

  return Math.min(cargaDiariaMinutos, duracaoJanela);
}

function dataLocalAbsolutaEmMinutos(
  data: Date,
  fusoHorario?: string | null,
) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario ?? "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const valor = (tipo: string) =>
    Number(partes.find((parte) => parte.type === tipo)?.value);
  const diaLocal = Math.floor(
    Date.UTC(valor("year"), valor("month") - 1, valor("day")) / 86_400_000,
  );

  return diaLocal * 1_440 + valor("hour") * 60 + valor("minute");
}

export function resolverJanelaExpediente(
  jornada: JornadaExpediente,
  janelaInstitucional?: { inicio: string; fim: string } | null,
  regulamentacao?: RegulamentacaoExpediente | null,
): JanelaExpediente {
  const expedientePadrao = {
    inicio: regulamentacao?.expedientePadraoInicio ?? EXPEDIENTE_PADRAO.inicio,
    fim: regulamentacao?.expedientePadraoFim ?? EXPEDIENTE_PADRAO.fim,
  };
  const limiteDiferenciado = {
    inicio:
      regulamentacao?.entradaMinimaPermitida ??
      EXPEDIENTE_DIFERENCIADO_LIMITE.inicio,
    fim:
      regulamentacao?.saidaMaximaPermitida ??
      EXPEDIENTE_DIFERENCIADO_LIMITE.fim,
  };
  const diferenciada =
    jornada.horarioDiferenciadoPermitido &&
    jornada.horarioDiferenciadoAutorizado;

  if (!diferenciada) {
    const janela = combinarJanelas(expedientePadrao, janelaInstitucional);

    return {
      ...janela,
      diferenciada: false,
    };
  }

  const janela = combinarJanelas(
    {
      inicio:
        jornada.entradaMinimaDiferenciada ??
        limiteDiferenciado.inicio,
      fim:
        jornada.saidaMaximaDiferenciada ??
        limiteDiferenciado.fim,
    },
    janelaInstitucional,
  );

  return {
    ...janela,
    diferenciada: true,
  };
}

export function resolverExpedienteInstitucional(
  diaInstitucional?: DiaInstitucionalExpediente | null,
  regulamentacao?: RegulamentacaoExpediente | null,
): ExpedienteInstitucional {
  const expedientePadrao = {
    inicio: regulamentacao?.expedientePadraoInicio ?? EXPEDIENTE_PADRAO.inicio,
    fim: regulamentacao?.expedientePadraoFim ?? EXPEDIENTE_PADRAO.fim,
  };

  if (!diaInstitucional) {
    return {
      temExpedienteOrdinario: true,
      janelaPadrao: expedientePadrao,
      motivoSemExpediente: null,
    };
  }

  const temExpedienteOrdinario =
    diaInstitucional.contaComoDiaUtil &&
    diaInstitucional.geraApuracaoRegular;
  const janelaInstitucional =
    temExpedienteOrdinario &&
    diaInstitucional.janelaInicio &&
    diaInstitucional.janelaFim
      ? {
          inicio: diaInstitucional.janelaInicio,
          fim: diaInstitucional.janelaFim,
        }
      : null;

  return {
    temExpedienteOrdinario,
    janelaPadrao: temExpedienteOrdinario
      ? janelaInstitucional ?? expedientePadrao
      : null,
    motivoSemExpediente: temExpedienteOrdinario
      ? null
      : diaInstitucional.descricao ?? diaInstitucional.tipo,
  };
}

export function resolverExpedienteUnidade(
  unidade?: UnidadeExpediente | null,
): ExpedienteUnidade {
  const tipo = unidade?.tipo ?? null;
  const aplicaExpedienteInternoExterno = Boolean(
    tipo && TIPOS_COM_EXPEDIENTE_INTERNO_EXTERNO.has(tipo),
  );
  const exigeCoberturaUrgencias = Boolean(
    tipo && TIPOS_UNIDADE_JUDICIAL_COM_COBERTURA_URGENCIAS.has(tipo),
  );

  return {
    unidadeId: unidade?.id ?? null,
    sigla: unidade?.sigla ?? null,
    tipo,
    regra: aplicaExpedienteInternoExterno
      ? "INTERNO_EXTERNO"
      : "INSTITUCIONAL_GERAL",
    expedienteInterno: aplicaExpedienteInternoExterno
      ? EXPEDIENTE_INTERNO_UNIDADE
      : EXPEDIENTE_PADRAO,
    expedienteExterno: aplicaExpedienteInternoExterno
      ? EXPEDIENTE_EXTERNO_UNIDADE
      : EXPEDIENTE_PADRAO,
    coberturaUrgencias: {
      obrigatoria: exigeCoberturaUrgencias,
      inicio: exigeCoberturaUrgencias
        ? JANELA_URGENCIAS_UNIDADE_JUDICIAL.inicio
        : null,
      fim: exigeCoberturaUrgencias
        ? JANELA_URGENCIAS_UNIDADE_JUDICIAL.fim
        : null,
      fundamento: exigeCoberturaUrgencias
        ? "Art. 3, §3º - cobertura de urgências entre 15h01 e 18h."
        : null,
    },
  };
}

export function calcularMinutosNoExpediente(params: {
  inicio: Date;
  fim: Date;
  janela: JanelaExpediente;
  fusoHorario?: string | null;
}) {
  const inicioSegmento = dataLocalAbsolutaEmMinutos(
    params.inicio,
    params.fusoHorario,
  );
  const fimSegmento = dataLocalAbsolutaEmMinutos(
    params.fim,
    params.fusoHorario,
  );
  const inicioJanela = horaParaMinutos(params.janela.inicio);
  const fimJanela = horaParaMinutos(params.janela.fim);
  let total = 0;

  if (fimSegmento <= inicioSegmento) {
    return 0;
  }

  const diaInicio = Math.floor(inicioSegmento / 1_440);
  const diaFim = Math.floor((fimSegmento - 1) / 1_440);

  for (let dia = diaInicio; dia <= diaFim; dia += 1) {
    const baseDia = dia * 1_440;
    const inicioSobreposto = Math.max(inicioSegmento, baseDia + inicioJanela);
    const fimSobreposto = Math.min(fimSegmento, baseDia + fimJanela);
    total += Math.max(0, fimSobreposto - inicioSobreposto);
  }

  return total;
}
