import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import {
  buscarEventoCalendarioInstitucionalPorData,
  listarEventosCalendarioInstitucionalNoPeriodo,
} from "../../infrastructure/repositories/calendario-institucional.repository";
import { listarRecessosForensesNoPeriodo } from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

type EventoCalendarioInstitucionalLite = Awaited<
  ReturnType<typeof buscarEventoCalendarioInstitucionalPorData>
>;
type EventoCalendarioInstitucionalPeriodo = {
  id: string;
  dataReferencia: Date;
  descricao: string;
  tipo: "FERIADO" | "PONTO_FACULTATIVO" | "SUSPENSAO_EXPEDIENTE";
  contaComoDiaUtil: boolean;
  geraApuracaoRegular: boolean;
  janelaInicio?: string | null;
  janelaFim?: string | null;
  dataOriginal?: Date | null;
  dataSubstituida?: boolean;
  ativo: boolean;
  abrangencia?: string;
  uf?: string | null;
  municipio?: string | null;
  municipioIbge?: string | null;
  orgaoId?: string | null;
  unidadeId?: string | null;
};

type RecessoForenseLite = Awaited<
  ReturnType<typeof listarRecessosForensesNoPeriodo>
>[number];

export type TipoDiaInstitucional =
  | "UTIL"
  | "SABADO"
  | "DOMINGO"
  | "FERIADO"
  | "PONTO_FACULTATIVO"
  | "SUSPENSAO_EXPEDIENTE"
  | "RECESSO_FORENSE";

export type ClassificacaoDiaInstitucional = {
  dataReferencia: Date;
  tipo: TipoDiaInstitucional;
  descricao: string | null;
  fonte: "PADRAO" | "CALENDARIO_INSTITUCIONAL" | "RECESSO_FORENSE";
  contaComoDiaUtil: boolean;
  geraApuracaoRegular: boolean;
  janelaInicio?: string | null;
  janelaFim?: string | null;
  dataOriginal?: Date | null;
  dataSubstituida?: boolean;
  eventoCalendarioId?: string;
  recessoForenseId?: string;
};

export type CalendarioInstitucionalPrecarregado = {
  eventosPorData: Map<
    string,
    EventoCalendarioInstitucionalPeriodo | EventoCalendarioInstitucionalPeriodo[]
  >;
  recessos: RecessoForenseLite[];
};

type UnidadeComLocalidade = {
  id: string;
  orgaoId: string;
  uf?: string | null;
  municipio?: string | null;
  municipioIbge?: string | null;
  unidadePai?: UnidadeComLocalidade | null;
};

type LocalidadeServidor = {
  orgaoId: string | null;
  unidadeIds: string[];
  uf: string | null;
  municipio: string | null;
  municipioIbge: string | null;
};

function chaveData(data: Date) {
  return normalizarDataReferencia(data).toISOString().slice(0, 10);
}

function fimExclusivo(data: Date) {
  const resultado = normalizarDataReferencia(data);
  resultado.setUTCDate(resultado.getUTCDate() + 1);
  return resultado;
}

function classificarPorDiaSemana(
  dataReferencia: Date,
): ClassificacaoDiaInstitucional {
  const dataNormalizada = normalizarDataReferencia(dataReferencia);
  const diaSemana = dataNormalizada.getUTCDay();

  if (diaSemana === 0) {
    return {
      dataReferencia: dataNormalizada,
      tipo: "DOMINGO",
      descricao: "Domingo",
      fonte: "PADRAO",
      contaComoDiaUtil: false,
      geraApuracaoRegular: false,
    };
  }

  if (diaSemana === 6) {
    return {
      dataReferencia: dataNormalizada,
      tipo: "SABADO",
      descricao: "Sábado",
      fonte: "PADRAO",
      contaComoDiaUtil: false,
      geraApuracaoRegular: false,
    };
  }

  return {
    dataReferencia: dataNormalizada,
    tipo: "UTIL",
    descricao: "Dia útil regular",
    fonte: "PADRAO",
    contaComoDiaUtil: true,
    geraApuracaoRegular: true,
  };
}

function classificarPorEvento(
  dataReferencia: Date,
  evento: NonNullable<EventoCalendarioInstitucionalLite> | EventoCalendarioInstitucionalPeriodo,
): ClassificacaoDiaInstitucional {
  return {
    dataReferencia: normalizarDataReferencia(dataReferencia),
    tipo: evento.tipo,
    descricao: evento.descricao,
    fonte: "CALENDARIO_INSTITUCIONAL",
    contaComoDiaUtil: evento.contaComoDiaUtil,
    geraApuracaoRegular: evento.geraApuracaoRegular,
    janelaInicio: evento.janelaInicio,
    janelaFim: evento.janelaFim,
    dataOriginal: evento.dataOriginal,
    dataSubstituida: evento.dataSubstituida,
    eventoCalendarioId: evento.id,
  };
}

function normalizarTextoLocalidade(valor?: string | null) {
  return valor
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase() || null;
}

function resolverLocalidadeUnidade(unidade?: UnidadeComLocalidade | null) {
  let atual = unidade ?? null;
  const unidadeIds: string[] = [];
  const visitadas = new Set<string>();
  let uf: string | null = null;
  let municipio: string | null = null;
  let municipioIbge: string | null = null;

  while (atual && !visitadas.has(atual.id)) {
    visitadas.add(atual.id);
    unidadeIds.push(atual.id);
    uf ??= atual.uf?.trim().toUpperCase() || null;
    municipio ??= normalizarTextoLocalidade(atual.municipio);
    municipioIbge ??= atual.municipioIbge?.trim() || null;
    atual = atual.unidadePai ?? null;
  }

  return {
    unidadeIds,
    uf,
    municipio,
    municipioIbge,
  };
}

async function resolverLocalidadeServidor(params: {
  servidorId?: string | null;
  dataReferencia: Date;
}): Promise<LocalidadeServidor | null> {
  if (!params.servidorId) {
    return null;
  }

  const dataReferencia = normalizarDataReferencia(params.dataReferencia);
  const servidor = await prisma.servidor.findUnique({
    where: {
      id: params.servidorId,
    },
    select: {
      orgaoId: true,
    },
  });
  const lotacao = await prisma.lotacao.findFirst({
    where: {
      servidorId: params.servidorId,
      status: "ATIVO",
      dataInicio: {
        lte: dataReferencia,
      },
      OR: [
        { dataFim: null },
        {
          dataFim: {
            gte: dataReferencia,
          },
        },
      ],
    },
    select: {
      unidade: {
        select: {
          id: true,
          orgaoId: true,
          uf: true,
          municipio: true,
          municipioIbge: true,
          unidadePai: {
            select: {
              id: true,
              orgaoId: true,
              uf: true,
              municipio: true,
              municipioIbge: true,
              unidadePai: {
                select: {
                  id: true,
                  orgaoId: true,
                  uf: true,
                  municipio: true,
                  municipioIbge: true,
                  unidadePai: {
                    select: {
                      id: true,
                      orgaoId: true,
                      uf: true,
                      municipio: true,
                      municipioIbge: true,
                      unidadePai: {
                        select: {
                          id: true,
                          orgaoId: true,
                          uf: true,
                          municipio: true,
                          municipioIbge: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      dataInicio: "desc",
    },
  });
  const localidade = resolverLocalidadeUnidade(lotacao?.unidade ?? null);

  return {
    orgaoId: servidor?.orgaoId ?? lotacao?.unidade.orgaoId ?? null,
    ...localidade,
  };
}

function eventoAplicavelAoServidor(
  evento: EventoCalendarioInstitucionalPeriodo,
  localidade: LocalidadeServidor | null,
) {
  const abrangencia = evento.abrangencia ?? "NACIONAL";

  if (abrangencia === "NACIONAL") {
    return true;
  }

  if (!localidade) {
    return false;
  }

  if (abrangencia === "ESTADUAL") {
    return Boolean(evento.uf && localidade.uf === evento.uf.trim().toUpperCase());
  }

  if (abrangencia === "MUNICIPAL") {
    const mesmoEstado = Boolean(
      evento.uf && localidade.uf === evento.uf.trim().toUpperCase(),
    );
    const mesmoIbge =
      evento.municipioIbge &&
      localidade.municipioIbge &&
      evento.municipioIbge.trim() === localidade.municipioIbge;
    const mesmoMunicipio =
      evento.municipio &&
      localidade.municipio &&
      normalizarTextoLocalidade(evento.municipio) === localidade.municipio;

    return mesmoEstado && Boolean(mesmoIbge || mesmoMunicipio);
  }

  if (abrangencia === "ORGAO") {
    return Boolean(evento.orgaoId && evento.orgaoId === localidade.orgaoId);
  }

  if (abrangencia === "UNIDADE") {
    return Boolean(
      evento.unidadeId && localidade.unidadeIds.includes(evento.unidadeId),
    );
  }

  return false;
}

const prioridadeAbrangencia: Record<string, number> = {
  NACIONAL: 1,
  ESTADUAL: 2,
  ORGAO: 3,
  MUNICIPAL: 4,
  UNIDADE: 5,
};

function classificarPorRecesso(
  dataReferencia: Date,
  recesso: RecessoForenseLite,
): ClassificacaoDiaInstitucional {
  return {
    dataReferencia: normalizarDataReferencia(dataReferencia),
    tipo: "RECESSO_FORENSE",
    descricao: `Recesso forense ${recesso.ano}`,
    fonte: "RECESSO_FORENSE",
    contaComoDiaUtil: false,
    geraApuracaoRegular: false,
    recessoForenseId: recesso.id,
  };
}

function encontrarRecesso(
  dataReferencia: Date,
  recessos: RecessoForenseLite[],
) {
  const dataNormalizada = normalizarDataReferencia(dataReferencia);

  return recessos.find(
    (recesso) =>
      normalizarDataReferencia(recesso.dataInicio) <= dataNormalizada &&
      normalizarDataReferencia(recesso.dataFim) >= dataNormalizada,
  );
}

async function carregarEventoDoDia(
  dataReferencia: Date,
  precarregado?: CalendarioInstitucionalPrecarregado,
  servidorId?: string | null,
) {
  const eventosPrecarregados = precarregado?.eventosPorData.get(
    chaveData(dataReferencia),
  );
  let eventos: EventoCalendarioInstitucionalPeriodo[] = [];

  if (precarregado) {
    eventos = Array.isArray(eventosPrecarregados)
      ? eventosPrecarregados
      : eventosPrecarregados
        ? [eventosPrecarregados]
        : [];
  } else {
    const eventosDoDia = await listarEventosCalendarioInstitucionalNoPeriodo(
      dataReferencia,
      fimExclusivo(dataReferencia),
    );

    if (Array.isArray(eventosDoDia)) {
      eventos = eventosDoDia;
    } else {
      const eventoNacional = await buscarEventoCalendarioInstitucionalPorData(
        dataReferencia,
      );
      eventos = eventoNacional ? [eventoNacional] : [];
    }
  }
  const ativos = eventos.filter((evento) => evento.ativo);

  if (ativos.length === 0) {
    return null;
  }

  const localidade = await resolverLocalidadeServidor({
    servidorId,
    dataReferencia,
  });

  return (
    ativos
      .filter((evento) => eventoAplicavelAoServidor(evento, localidade))
      .sort((a, b) => {
        const prioridadeA = prioridadeAbrangencia[a.abrangencia ?? "NACIONAL"] ?? 0;
        const prioridadeB = prioridadeAbrangencia[b.abrangencia ?? "NACIONAL"] ?? 0;

        return prioridadeB - prioridadeA;
      })[0] ?? null
  );
}

async function carregarRecessoDoDia(
  dataReferencia: Date,
  precarregado?: CalendarioInstitucionalPrecarregado,
) {
  if (precarregado) {
    return encontrarRecesso(dataReferencia, precarregado.recessos) ?? null;
  }

  const recessos = await listarRecessosForensesNoPeriodo(
    dataReferencia,
    fimExclusivo(dataReferencia),
  );

  return encontrarRecesso(dataReferencia, recessos) ?? null;
}

export async function carregarCalendarioInstitucionalPeriodo(params: {
  inicio: Date;
  fimExclusivo: Date;
}): Promise<CalendarioInstitucionalPrecarregado> {
  const [eventos, recessos] = await Promise.all([
    listarEventosCalendarioInstitucionalNoPeriodo(
      params.inicio,
      params.fimExclusivo,
    ),
    listarRecessosForensesNoPeriodo(params.inicio, params.fimExclusivo),
  ]);

  return {
    eventosPorData: eventos.reduce((mapa, evento) => {
      const chave = chaveData(evento.dataReferencia);
      const eventosData = mapa.get(chave) ?? [];
      eventosData.push(evento);
      mapa.set(chave, eventosData);
      return mapa;
    }, new Map<string, EventoCalendarioInstitucionalPeriodo[]>()),
    recessos,
  };
}

export async function classificarDiaInstitucional(
  dataReferencia: Date,
  precarregado?: CalendarioInstitucionalPrecarregado,
  servidorId?: string | null,
): Promise<ClassificacaoDiaInstitucional> {
  const recesso = await carregarRecessoDoDia(dataReferencia, precarregado);

  if (recesso) {
    return classificarPorRecesso(dataReferencia, recesso);
  }

  const evento = await carregarEventoDoDia(dataReferencia, precarregado, servidorId);

  if (evento) {
    return classificarPorEvento(dataReferencia, evento);
  }

  return classificarPorDiaSemana(dataReferencia);
}
