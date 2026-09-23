import { prisma } from "@/shared/infrastructure/database/prisma";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { listarIdsUnidadesSubordinadasNaData } from "@/modules/minha-equipe/infrastructure/repositories/minha-equipe.repository";
import type { Prisma } from "@/generated/prisma/client";

export const PERMISSOES_ACOMPANHAMENTO_ESTAGIO = {
  consultar: "acompanhamento-estagio:consultar:proprio",
  preencher: "acompanhamento-estagio:preencher:proprio",
  exportar: "acompanhamento-estagio:exportar:proprio",
  supervisionar: "acompanhamento-estagio:supervisionar:subordinados",
  consultarSeccional: "acompanhamento-estagio:consultar:seccional",
  exportarSeccional: "acompanhamento-estagio:exportar:seccional",
} as const;

export type LinhaAcompanhamentoEstagio = {
  dataIso: string;
  dataLabel: string;
  dia: number;
  marcacoes: string[];
  minutosRegistrados: number;
  horasLabel: string;
  atividades: string;
  possuiMarcacao: boolean;
  futuro: boolean;
  editavel: boolean;
};

export type DadosAcompanhamentoEstagio = {
  modo: "ESTAGIARIO" | "SUPERVISOR" | "CONSULTA";
  servidor: {
    id: string;
    matricula: string;
    nome: string;
    orgao: string;
    lotacao: string;
    curso: string;
    supervisor: string;
  };
  competencia: {
    ano: number;
    mes: number;
    input: string;
    label: string;
    encerrada: boolean;
  };
  acompanhamento: {
    id: string | null;
    status: StatusAcompanhamentoEstagioView;
    curso: string;
    supervisor: string;
    fechadoEm: string | null;
    assinatura: AssinaturaEstagio | null;
    supervisorAssinadoEm: string | null;
    assinaturaSupervisor: AssinaturaEstagio | null;
    devolucaoJustificativa: string | null;
  };
  linhas: LinhaAcompanhamentoEstagio[];
  competenciasAnteriores: CompetenciaAnteriorEstagio[];
};

export type StatusAcompanhamentoEstagioView =
  | "ABERTO"
  | "AGUARDANDO_SUPERVISOR"
  | "DEVOLVIDO"
  | "FECHADO";

export type AssinaturaEstagio = {
  usuarioId: string;
  matricula: string;
  nome: string;
  assinadoEm: string;
};

export type CompetenciaAnteriorEstagio = {
  id: string;
  competencia: string;
  status: StatusAcompanhamentoEstagioView;
  assinadoEstagiarioEm: string | null;
  assinadoSupervisorEm: string | null;
  supervisorAssinante: string | null;
};

export type ItemConsultaAcompanhamentoEstagio = {
  servidorId: string;
  matricula: string;
  nome: string;
  orgao: string;
  lotacao: string;
  status: StatusAcompanhamentoEstagioView;
  totalHoras: string;
  possuiAcompanhamento: boolean;
  assinadoEstagiario: boolean;
  assinadoSupervisor: boolean;
};

export function normalizarCompetenciaEstagio(params: {
  competencia?: string | null;
  anoReferencia?: string | number | null;
  mesReferencia?: string | number | null;
}) {
  const hoje = new Date();
  const matchCompetencia = params.competencia?.match(/^(\d{4})-(\d{2})$/);
  const anoCompetencia = matchCompetencia ? Number(matchCompetencia[1]) : null;
  const mesCompetencia = matchCompetencia ? Number(matchCompetencia[2]) : null;
  const anoParam = params.anoReferencia ? Number(params.anoReferencia) : null;
  const mesParam = params.mesReferencia ? Number(params.mesReferencia) : null;

  const ano =
    anoCompetencia && Number.isInteger(anoCompetencia)
      ? anoCompetencia
      : anoParam && Number.isInteger(anoParam)
        ? anoParam
        : hoje.getFullYear();
  const mes =
    mesCompetencia &&
    Number.isInteger(mesCompetencia) &&
    mesCompetencia >= 1 &&
    mesCompetencia <= 12
      ? mesCompetencia
      : mesParam && Number.isInteger(mesParam) && mesParam >= 1 && mesParam <= 12
        ? mesParam
        : hoje.getMonth() + 1;

  return { ano, mes };
}

export function competenciaParaInputEstagio(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function formatarMinutosEstagio(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

export function calcularMinutosPorMarcacoes(
  marcacoes: { dataHora: Date }[],
) {
  const ordenadas = [...marcacoes].sort(
    (a, b) => a.dataHora.getTime() - b.dataHora.getTime(),
  );
  let total = 0;

  for (let indice = 0; indice + 1 < ordenadas.length; indice += 2) {
    const entrada = ordenadas[indice].dataHora.getTime();
    const saida = ordenadas[indice + 1].dataHora.getTime();

    if (saida > entrada) {
      total += Math.round((saida - entrada) / 60000);
    }
  }

  return total;
}

export function isoData(data: Date) {
  return data.toISOString().slice(0, 10);
}

export function dataReferenciaUtc(dataIso: string) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

export function hojeIsoNoFuso(fusoHorario = "America/Manaus") {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  const dia = partes.find((parte) => parte.type === "day")?.value;

  return `${ano}-${mes}-${dia}`;
}

export function competenciaEncerrada(params: {
  ano: number;
  mes: number;
  fusoHorario?: string;
}) {
  const ultimoDia = new Date(Date.UTC(params.ano, params.mes, 0))
    .toISOString()
    .slice(0, 10);

  return hojeIsoNoFuso(params.fusoHorario) > ultimoDia;
}

const includeServidorEstagio = {
  usuario: true,
  orgao: true,
  cargo: true,
  categoriaPessoa: true,
  lotacoes: {
    where: {
      status: "ATIVO" as const,
    },
    include: {
      unidade: true,
      cargo: true,
    },
    orderBy: {
      dataInicio: "desc" as const,
    },
  },
};

type ServidorEstagio = Prisma.ServidorGetPayload<{
  include: typeof includeServidorEstagio;
}>;

export async function buscarServidorEstagiarioDoUsuario(usuarioId: string) {
  const servidor = await prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    include: includeServidorEstagio,
  });

  return validarServidorEstagiario(servidor);
}

export async function buscarServidorEstagiarioPorId(servidorId: string) {
  const servidor = await prisma.servidor.findFirst({
    where: {
      id: servidorId,
      ativo: true,
    },
    include: includeServidorEstagio,
  });

  return validarServidorEstagiario(servidor);
}

function validarServidorEstagiario(servidor: ServidorEstagio | null) {
  if (!servidor) {
    return null;
  }

  const categoria = servidor.categoriaPessoa?.codigo?.toUpperCase();
  const tipo = servidor.usuario.tipo.toUpperCase();

  if (tipo !== "ESTAGIARIO" && categoria !== "ESTAGIARIO") {
    return null;
  }

  return servidor;
}

export async function carregarAcompanhamentoEstagio(params: {
  usuarioId: string;
  ano: number;
  mes: number;
}) {
  const servidor = await buscarServidorEstagiarioDoUsuario(params.usuarioId);

  if (!servidor) {
    return null;
  }

  const inicio = new Date(Date.UTC(params.ano, params.mes - 1, 1));
  const fim = new Date(Date.UTC(params.ano, params.mes, 1));

  const [acompanhamento, marcacoes] = await Promise.all([
    prisma.acompanhamentoEstagioMensal.findUnique({
      where: {
        servidorId_anoReferencia_mesReferencia: {
          servidorId: servidor.id,
          anoReferencia: params.ano,
          mesReferencia: params.mes,
        },
      },
      include: {
        dias: true,
      },
    }),
    prisma.marcacao.findMany({
      where: {
        servidorId: servidor.id,
        dataReferencia: {
          gte: inicio,
          lt: fim,
        },
        status: {
          in: ["VALIDA", "AJUSTADA", "PENDENTE"],
        },
      },
      orderBy: {
        dataHora: "asc",
      },
    }),
  ]);
  const [supervisaoVigente, competenciasAnteriores] = await Promise.all([
    buscarSupervisaoEstagioVigente({
      estagiarioServidorId: servidor.id,
      dataReferencia: new Date(Date.UTC(params.ano, params.mes, 0)),
    }),
    listarCompetenciasAnterioresEstagio({
      servidorId: servidor.id,
      ano: params.ano,
      mes: params.mes,
    }),
  ]);

  const diasPorData = new Map(
    acompanhamento?.dias.map((dia) => [isoData(dia.dataReferencia), dia]) ?? [],
  );
  const marcacoesPorData = new Map<string, typeof marcacoes>();

  for (const marcacao of marcacoes) {
    const chave = isoData(marcacao.dataReferencia);
    const lista = marcacoesPorData.get(chave) ?? [];
    lista.push(marcacao);
    marcacoesPorData.set(chave, lista);
  }

  const hojeIso = hojeIsoNoFuso();
  const formatadorData = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
  const formatadorHora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  });
  const linhas: LinhaAcompanhamentoEstagio[] = Array.from(
    marcacoesPorData.entries(),
  ).map(([dataIso, marcacoesDia]) => {
    const registro = diasPorData.get(dataIso);
    const data = dataReferenciaUtc(dataIso);
    const minutos = calcularMinutosPorMarcacoes(marcacoesDia);
    const futuro = dataIso > hojeIso;
    const editavel =
      !futuro &&
      (!acompanhamento ||
        acompanhamento.status === "ABERTO" ||
        acompanhamento.status === "DEVOLVIDO");

    return {
      dataIso,
      dataLabel: formatadorData.format(data),
      dia: data.getUTCDate(),
      marcacoes: marcacoesDia.map((marcacao) =>
        formatadorHora.format(marcacao.dataHora),
      ),
      minutosRegistrados: registro?.minutosRegistrados ?? minutos,
      horasLabel: formatarMinutosEstagio(registro?.minutosRegistrados ?? minutos),
      atividades: registro?.atividades ?? "",
      possuiMarcacao: true,
      futuro,
      editavel,
    };
  });

  linhas.sort((a, b) => a.dataIso.localeCompare(b.dataIso));

  const lotacao = servidor.lotacoes[0];
  const curso =
    acompanhamento?.curso ?? supervisaoVigente?.curso ?? servidor.cargo?.descricao ?? "";
  const supervisor =
    acompanhamento?.supervisor ??
    (supervisaoVigente
      ? nomeServidor(supervisaoVigente.supervisorServidor) ||
        supervisaoVigente.supervisorServidor.usuario.nome
      : "");

  return {
    modo: "ESTAGIARIO",
    servidor: {
      id: servidor.id,
      matricula: servidor.matricula,
      nome: nomeServidor(servidor) || servidor.usuario.nome,
      orgao: servidor.orgao.sigla,
      lotacao: lotacao?.unidade?.sigla ?? lotacao?.unidade?.nome ?? "-",
      curso,
      supervisor,
    },
    competencia: {
      ano: params.ano,
      mes: params.mes,
      input: competenciaParaInputEstagio(params.ano, params.mes),
      label: new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(inicio),
      encerrada: competenciaEncerrada({ ano: params.ano, mes: params.mes }),
    },
    acompanhamento: {
      id: acompanhamento?.id ?? null,
      status: acompanhamento?.status ?? "ABERTO",
      curso,
      supervisor,
      fechadoEm: acompanhamento?.fechadoEm?.toISOString() ?? null,
      assinatura: normalizarAssinatura(acompanhamento?.assinatura),
      supervisorAssinadoEm:
        acompanhamento?.supervisorAssinadoEm?.toISOString() ?? null,
      assinaturaSupervisor: normalizarAssinatura(
        acompanhamento?.assinaturaSupervisor,
      ),
      devolucaoJustificativa: acompanhamento?.devolucaoJustificativa ?? null,
    },
    linhas,
    competenciasAnteriores,
  } satisfies DadosAcompanhamentoEstagio;
}

export async function buscarSupervisaoEstagioVigente(params: {
  estagiarioServidorId: string;
  dataReferencia: Date;
}) {
  return prisma.estagioSupervisao.findFirst({
    where: {
      estagiarioServidorId: params.estagiarioServidorId,
      dataInicio: {
        lte: params.dataReferencia,
      },
      OR: [
        {
          dataFim: null,
        },
        {
          dataFim: {
            gte: params.dataReferencia,
          },
        },
      ],
    },
    include: {
      supervisorServidor: {
        include: {
          usuario: true,
          lotacoes: {
            where: {
              status: "ATIVO",
            },
            include: {
              unidade: true,
            },
            orderBy: {
              dataInicio: "desc",
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      dataInicio: "desc",
    },
  });
}

async function listarCompetenciasAnterioresEstagio(params: {
  servidorId: string;
  ano: number;
  mes: number;
}) {
  const registros = await prisma.acompanhamentoEstagioMensal.findMany({
    where: {
      servidorId: params.servidorId,
      NOT: {
        anoReferencia: params.ano,
        mesReferencia: params.mes,
      },
    },
    orderBy: [{ anoReferencia: "desc" }, { mesReferencia: "desc" }],
    take: 24,
  });

  return registros.map((registro): CompetenciaAnteriorEstagio => {
    const assinaturaSupervisor = normalizarAssinatura(
      registro.assinaturaSupervisor,
    );

    return {
      id: registro.id,
      competencia: competenciaParaInputEstagio(
        registro.anoReferencia,
        registro.mesReferencia,
      ),
      status: registro.status,
      assinadoEstagiarioEm: registro.fechadoEm?.toISOString() ?? null,
      assinadoSupervisorEm:
        registro.supervisorAssinadoEm?.toISOString() ??
        assinaturaSupervisor?.assinadoEm ??
        null,
      supervisorAssinante: assinaturaSupervisor?.nome ?? null,
    };
  });
}

export async function carregarAcompanhamentoEstagioPorServidor(params: {
  servidorId: string;
  ano: number;
  mes: number;
  modo: "SUPERVISOR" | "CONSULTA";
  usuarioId: string;
  orgaoIds?: string[];
}) {
  const servidor = await buscarServidorEstagiarioPorId(params.servidorId);

  if (!servidor?.usuarioId) {
    return null;
  }

  const autorizado =
    params.modo === "CONSULTA"
      ? servidor.orgaoId !== null &&
        (params.orgaoIds === undefined ||
          params.orgaoIds.length === 0 ||
          params.orgaoIds.includes(servidor.orgaoId))
      : await usuarioSupervisionaServidor({
          usuarioId: params.usuarioId,
          servidor,
          data: dataReferenciaUtc(
            `${params.ano}-${String(params.mes).padStart(2, "0")}-01`,
          ),
        });

  if (!autorizado) {
    return null;
  }

  const dados = await carregarAcompanhamentoEstagio({
    usuarioId: servidor.usuarioId,
    ano: params.ano,
    mes: params.mes,
  });

  return dados
    ? ({
        ...dados,
        modo: params.modo,
        linhas: dados.linhas.map((linha) => ({
          ...linha,
          editavel: false,
        })),
      } satisfies DadosAcompanhamentoEstagio)
    : null;
}

export async function listarAcompanhamentosEstagioConsulta(params: {
  ano: number;
  mes: number;
  busca?: string | null;
  orgaoIds?: string[];
  escopoGlobal?: boolean;
}) {
  const busca = params.busca?.trim();
  const and: Prisma.ServidorWhereInput[] = [
    {
      ativo: true,
    },
    {
      OR: [
        {
          usuario: {
            tipo: "ESTAGIARIO",
          },
        },
        {
          categoriaPessoa: {
            codigo: {
              equals: "ESTAGIARIO",
              mode: "insensitive",
            },
          },
        },
      ],
    },
  ];

  if (!params.escopoGlobal && params.orgaoIds && params.orgaoIds.length > 0) {
    and.push({
      orgaoId: {
        in: params.orgaoIds,
      },
    });
  }

  if (busca) {
    and.push({
      OR: [
        {
          matricula: {
            contains: busca,
            mode: "insensitive",
          },
        },
        {
          nomeFuncional: {
            contains: busca,
            mode: "insensitive",
          },
        },
        {
          nomeCompletoSarh: {
            contains: busca,
            mode: "insensitive",
          },
        },
        {
          usuario: {
            nome: {
              contains: busca,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  const servidores = await prisma.servidor.findMany({
    where: {
      AND: and,
    },
    include: {
      usuario: true,
      orgao: true,
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        include: {
          unidade: true,
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
      acompanhamentosEstagio: {
        where: {
          anoReferencia: params.ano,
          mesReferencia: params.mes,
        },
        include: {
          dias: true,
        },
      },
    },
    orderBy: {
      matricula: "asc",
    },
    take: 300,
  });

  return servidores.map((servidor): ItemConsultaAcompanhamentoEstagio => {
    const acompanhamento = servidor.acompanhamentosEstagio[0];
    const lotacao = servidor.lotacoes[0];
    const totalMinutos =
      acompanhamento?.dias.reduce(
        (total, dia) => total + dia.minutosRegistrados,
        0,
      ) ?? 0;

    return {
      servidorId: servidor.id,
      matricula: servidor.matricula,
      nome: nomeServidor(servidor) || servidor.usuario.nome,
      orgao: servidor.orgao.sigla,
      lotacao: lotacao?.unidade?.sigla ?? lotacao?.unidade?.nome ?? "-",
      status: acompanhamento?.status ?? "ABERTO",
      totalHoras: formatarMinutosEstagio(totalMinutos),
      possuiAcompanhamento: Boolean(acompanhamento),
      assinadoEstagiario: Boolean(acompanhamento?.assinatura),
      assinadoSupervisor: Boolean(acompanhamento?.assinaturaSupervisor),
    };
  });
}

async function usuarioSupervisionaServidor(params: {
  usuarioId: string;
  servidor: ServidorEstagio;
  data: Date;
}) {
  const supervisao = await buscarSupervisaoEstagioVigente({
    estagiarioServidorId: params.servidor.id,
    dataReferencia: params.data,
  });

  if (supervisao?.supervisorServidor.usuarioId === params.usuarioId) {
    return true;
  }

  const unidadeId = params.servidor.lotacoes[0]?.unidadeId;

  if (!unidadeId) {
    return false;
  }

  const unidades = await listarIdsUnidadesSubordinadasNaData({
    usuarioId: params.usuarioId,
    data: params.data,
  });

  return unidades.includes(unidadeId);
}

function normalizarAssinatura(valor: unknown): AssinaturaEstagio | null {
  if (!valor || typeof valor !== "object") {
    return null;
  }

  const assinatura = valor as Partial<AssinaturaEstagio>;

  if (
    typeof assinatura.usuarioId !== "string" ||
    typeof assinatura.matricula !== "string" ||
    typeof assinatura.nome !== "string" ||
    typeof assinatura.assinadoEm !== "string"
  ) {
    return null;
  }

  return assinatura as AssinaturaEstagio;
}
