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
};

export type ExpedienteInstitucional = {
  temExpedienteOrdinario: boolean;
  janelaPadrao: typeof EXPEDIENTE_PADRAO | null;
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

function minutosLocais(data: Date) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Manaus",
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
): JanelaExpediente {
  const diferenciada =
    jornada.horarioDiferenciadoPermitido &&
    jornada.horarioDiferenciadoAutorizado;

  if (!diferenciada) {
    return {
      ...EXPEDIENTE_PADRAO,
      diferenciada: false,
    };
  }

  return {
    inicio:
      jornada.entradaMinimaDiferenciada ??
      EXPEDIENTE_DIFERENCIADO_LIMITE.inicio,
    fim:
      jornada.saidaMaximaDiferenciada ??
      EXPEDIENTE_DIFERENCIADO_LIMITE.fim,
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

  return {
    temExpedienteOrdinario,
    janelaPadrao: temExpedienteOrdinario ? EXPEDIENTE_PADRAO : null,
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
}) {
  const inicioSegmento = minutosLocais(params.inicio);
  const fimSegmento = minutosLocais(params.fim);
  const inicioJanela = horaParaMinutos(params.janela.inicio);
  const fimJanela = horaParaMinutos(params.janela.fim);

  return Math.max(
    0,
    Math.min(fimSegmento, fimJanela) -
      Math.max(inicioSegmento, inicioJanela),
  );
}
