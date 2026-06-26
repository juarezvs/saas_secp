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

function minutosLocais(data: Date, fusoHorario?: string | null) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fusoHorario ?? "America/Manaus",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);

  const horas = Number(partes.find((parte) => parte.type === "hour")?.value);
  const minutos = Number(
    partes.find((parte) => parte.type === "minute")?.value,
  );

  return horas * 60 + minutos;
}

export function resolverJanelaExpediente(
  jornada: JornadaExpediente,
  janelaInstitucional?: { inicio: string; fim: string } | null,
): JanelaExpediente {
  const diferenciada =
    jornada.horarioDiferenciadoPermitido &&
    jornada.horarioDiferenciadoAutorizado;

  if (!diferenciada) {
    const janela = combinarJanelas(EXPEDIENTE_PADRAO, janelaInstitucional);

    return {
      ...janela,
      diferenciada: false,
    };
  }

  const janela = combinarJanelas(
    {
      inicio:
        jornada.entradaMinimaDiferenciada ??
        EXPEDIENTE_DIFERENCIADO_LIMITE.inicio,
      fim:
        jornada.saidaMaximaDiferenciada ??
        EXPEDIENTE_DIFERENCIADO_LIMITE.fim,
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
): ExpedienteInstitucional {
  if (!diaInstitucional) {
    return {
      temExpedienteOrdinario: true,
      janelaPadrao: EXPEDIENTE_PADRAO,
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
      ? janelaInstitucional ?? EXPEDIENTE_PADRAO
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
  const inicioSegmento = minutosLocais(params.inicio, params.fusoHorario);
  const fimSegmento = minutosLocais(params.fim, params.fusoHorario);
  const inicioJanela = horaParaMinutos(params.janela.inicio);
  const fimJanela = horaParaMinutos(params.janela.fim);

  return Math.max(
    0,
    Math.min(fimSegmento, fimJanela) -
      Math.max(inicioSegmento, inicioJanela),
  );
}
