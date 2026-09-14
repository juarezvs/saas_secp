import { prisma } from "@/shared/infrastructure/database/prisma";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { listarIdsUnidadesSubordinadasNaData } from "@/modules/minha-equipe/infrastructure/repositories/minha-equipe.repository";
import {
  STATUS_PROGRAMACAO_FERIAS_ATIVAS,
  STATUS_PROGRAMACAO_FERIAS_MAPA,
  diasEntreDatasUtc,
} from "../../application/services/programacao-ferias-status.service";

const TOTAL_DIAS_FERIAS_EXERCICIO = 30;

export type ProgramacaoFeriasMapaItem = {
  id: string;
  origem: "SARH" | "SECP" | "PREVIA";
  servidorId: string;
  servidorNome: string;
  matricula: string;
  unidadeId: string | null;
  unidadeSigla: string;
  unidadeNome: string;
  dataInicio: Date;
  dataFim: Date;
  dias: number;
  exercicio: number | null;
  status: string;
  statusLabel: string;
};

export type ProgramacaoFeriasSaldo = {
  exercicio: number;
  diasDireito: number;
  diasSarh: number;
  diasSecp: number;
  diasDisponiveis: number;
};

export type PeriodoFeriasServidor = {
  id: string;
  origem: "SARH" | "SECP";
  dataInicio: Date;
  dataFim: Date;
  dias: number;
  exercicio: number;
  status: string;
};

export function filtroFeriasSarhServidor(servidorId: string) {
  return {
    servidorId,
    OR: [
      { categoria: { contains: "FERIAS", mode: "insensitive" as const } },
      { tipoDescricao: { contains: "FERIAS", mode: "insensitive" as const } },
      { origemTabela: { contains: "FERIAS", mode: "insensitive" as const } },
      {
        tipoAfastamento: {
          OR: [
            { categoria: { contains: "FERIAS", mode: "insensitive" as const } },
            { descricao: { contains: "FERIAS", mode: "insensitive" as const } },
          ],
        },
      },
    ],
  };
}

function filtroFeriasSarh() {
  return {
    OR: [
      { categoria: { contains: "FERIAS", mode: "insensitive" as const } },
      { tipoDescricao: { contains: "FERIAS", mode: "insensitive" as const } },
      { origemTabela: { contains: "FERIAS", mode: "insensitive" as const } },
      {
        tipoAfastamento: {
          OR: [
            { categoria: { contains: "FERIAS", mode: "insensitive" as const } },
            { descricao: { contains: "FERIAS", mode: "insensitive" as const } },
          ],
        },
      },
    ],
  };
}

function calcularDias(dias: number | null, dataInicio: Date, dataFim: Date | null) {
  if (typeof dias === "number" && Number.isFinite(dias) && dias > 0) {
    return dias;
  }

  return dataFim ? Math.max(0, diasEntreDatasUtc(dataInicio, dataFim)) : 0;
}

function primeiraLotacaoAtiva<T extends { lotacoes: Array<{ unidade: { id: string; sigla: string; nome: string } }> }>(
  servidor: T,
) {
  return servidor.lotacoes[0]?.unidade ?? null;
}

export async function buscarServidorFeriasPorUsuarioId(usuarioId: string) {
  return prisma.servidor.findFirst({
    where: { usuarioId, ativo: true },
    include: {
      usuario: true,
      orgao: true,
      lotacoes: {
        where: { status: "ATIVO" },
        include: { unidade: true },
        orderBy: [{ dataInicio: "desc" }],
      },
    },
  });
}

export async function listarProgramacoesFeriasServidor(servidorId: string) {
  return prisma.programacaoFerias.findMany({
    where: { servidorId },
    include: {
      eventos: {
        include: { usuario: true },
        orderBy: { criadoEm: "desc" },
      },
      analisadoPor: true,
      enviadoSarhPor: true,
      afastamentoSarh: true,
    },
    orderBy: [{ criadoEm: "desc" }],
  });
}

export async function buscarProgramacaoFeriasPorId(id: string) {
  return prisma.programacaoFerias.findUnique({
    where: { id },
    include: {
      servidor: {
        include: {
          usuario: true,
          orgao: true,
          lotacoes: {
            where: { status: "ATIVO" },
            include: { unidade: true },
            orderBy: [{ dataInicio: "desc" }],
          },
        },
      },
      unidade: true,
      orgao: true,
      eventos: {
        include: { usuario: true },
        orderBy: { criadoEm: "desc" },
      },
      solicitadoPor: true,
      analisadoPor: true,
      enviadoSarhPor: true,
      afastamentoSarh: true,
    },
  });
}

export async function listarSaldosFeriasServidor(
  servidorId: string,
  anosExtras: number[] = [],
): Promise<ProgramacaoFeriasSaldo[]> {
  const [afastamentos, programacoes] = await Promise.all([
    prisma.afastamentoSarh.findMany({
      where: {
        ...filtroFeriasSarhServidor(servidorId),
        ativo: true,
      },
      select: {
        exercicio: true,
        dataInicio: true,
        dataFim: true,
        dias: true,
      },
    }),
    prisma.programacaoFerias.findMany({
      where: {
        servidorId,
        status: { in: [...STATUS_PROGRAMACAO_FERIAS_ATIVAS] },
      },
      select: {
        exercicio: true,
        dias: true,
      },
    }),
  ]);
  const exercicios = new Set<number>([
    new Date().getUTCFullYear(),
    new Date().getUTCFullYear() + 1,
    ...anosExtras,
  ]);

  for (const afastamento of afastamentos) {
    if (afastamento.exercicio) exercicios.add(afastamento.exercicio);
  }

  for (const programacao of programacoes) {
    exercicios.add(programacao.exercicio);
  }

  return Array.from(exercicios)
    .sort((a, b) => b - a)
    .map((exercicio) => {
      const diasSarh = afastamentos
        .filter((item) => item.exercicio === exercicio)
        .reduce(
          (total, item) =>
            total + calcularDias(item.dias, item.dataInicio, item.dataFim),
          0,
        );
      const diasSecp = programacoes
        .filter((item) => item.exercicio === exercicio)
        .reduce((total, item) => total + item.dias, 0);

      return {
        exercicio,
        diasDireito: TOTAL_DIAS_FERIAS_EXERCICIO,
        diasSarh,
        diasSecp,
        diasDisponiveis: Math.max(
          0,
          TOTAL_DIAS_FERIAS_EXERCICIO - diasSarh - diasSecp,
        ),
      };
    });
}

export async function buscarSaldoFeriasServidor(params: {
  servidorId: string;
  exercicio: number;
  ignorarProgramacaoId?: string | null;
}) {
  const [afastamentos, programacoes] = await Promise.all([
    prisma.afastamentoSarh.findMany({
      where: {
        ...filtroFeriasSarhServidor(params.servidorId),
        ativo: true,
        exercicio: params.exercicio,
      },
      select: { dataInicio: true, dataFim: true, dias: true },
    }),
    prisma.programacaoFerias.findMany({
      where: {
        servidorId: params.servidorId,
        exercicio: params.exercicio,
        id: params.ignorarProgramacaoId
          ? { not: params.ignorarProgramacaoId }
          : undefined,
        status: { in: [...STATUS_PROGRAMACAO_FERIAS_ATIVAS] },
      },
      select: { dias: true },
    }),
  ]);
  const diasSarh = afastamentos.reduce(
    (total, item) => total + calcularDias(item.dias, item.dataInicio, item.dataFim),
    0,
  );
  const diasSecp = programacoes.reduce((total, item) => total + item.dias, 0);

  return {
    exercicio: params.exercicio,
    diasDireito: TOTAL_DIAS_FERIAS_EXERCICIO,
    diasSarh,
    diasSecp,
    diasDisponiveis: Math.max(0, TOTAL_DIAS_FERIAS_EXERCICIO - diasSarh - diasSecp),
  };
}

export async function existeConflitoProgramacaoServidor(params: {
  servidorId: string;
  dataInicio: Date;
  dataFim: Date;
  ignorarProgramacaoId?: string | null;
}) {
  const [programacao, afastamento] = await Promise.all([
    prisma.programacaoFerias.findFirst({
      where: {
        servidorId: params.servidorId,
        id: params.ignorarProgramacaoId
          ? { not: params.ignorarProgramacaoId }
          : undefined,
        status: { in: [...STATUS_PROGRAMACAO_FERIAS_ATIVAS] },
        dataInicio: { lte: params.dataFim },
        dataFim: { gte: params.dataInicio },
      },
      select: { id: true },
    }),
    prisma.afastamentoSarh.findFirst({
      where: {
        ...filtroFeriasSarhServidor(params.servidorId),
        ativo: true,
        dataInicio: { lte: params.dataFim },
        OR: [{ dataFim: null }, { dataFim: { gte: params.dataInicio } }],
      },
      select: { id: true },
    }),
  ]);

  return Boolean(programacao || afastamento);
}

export async function listarPeriodosFeriasAtivosServidor(params: {
  servidorId: string;
  exercicio: number;
  ignorarProgramacaoId?: string | null;
}): Promise<PeriodoFeriasServidor[]> {
  const [afastamentos, programacoes] = await Promise.all([
    prisma.afastamentoSarh.findMany({
      where: {
        ...filtroFeriasSarhServidor(params.servidorId),
        ativo: true,
        exercicio: params.exercicio,
      },
      select: {
        id: true,
        dataInicio: true,
        dataFim: true,
        dias: true,
        exercicio: true,
      },
    }),
    prisma.programacaoFerias.findMany({
      where: {
        servidorId: params.servidorId,
        exercicio: params.exercicio,
        id: params.ignorarProgramacaoId
          ? { not: params.ignorarProgramacaoId }
          : undefined,
        status: { in: [...STATUS_PROGRAMACAO_FERIAS_ATIVAS] },
      },
      select: {
        id: true,
        dataInicio: true,
        dataFim: true,
        dias: true,
        exercicio: true,
        status: true,
      },
    }),
  ]);

  return [
    ...afastamentos.map((item): PeriodoFeriasServidor => ({
      id: item.id,
      origem: "SARH",
      dataInicio: item.dataInicio,
      dataFim: item.dataFim ?? item.dataInicio,
      dias: calcularDias(item.dias, item.dataInicio, item.dataFim),
      exercicio: item.exercicio ?? params.exercicio,
      status: "SARH",
    })),
    ...programacoes.map((item): PeriodoFeriasServidor => ({
      id: item.id,
      origem: "SECP",
      dataInicio: item.dataInicio,
      dataFim: item.dataFim,
      dias: item.dias,
      exercicio: item.exercicio,
      status: item.status,
    })),
  ].sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());
}

export async function somarDiasLicencaPropriaSaudeServidor(servidorId: string) {
  const afastamentos = await prisma.afastamentoSarh.findMany({
    where: {
      servidorId,
      ativo: true,
      OR: [
        { tipoCodigo: "15" },
        { tipoDescricao: { contains: "PROPRIA SAUDE", mode: "insensitive" } },
        { tipoDescricao: { contains: "PRÓPRIA SAUDE", mode: "insensitive" } },
        { tipoDescricao: { contains: "PROPRIA SAÚDE", mode: "insensitive" } },
        { tipoDescricao: { contains: "PRÓPRIA SAÚDE", mode: "insensitive" } },
        {
          tipoAfastamento: {
            OR: [
              { codigoExternoSarh: 15 },
              { descricao: { contains: "PROPRIA SAUDE", mode: "insensitive" } },
              { descricao: { contains: "PRÓPRIA SAUDE", mode: "insensitive" } },
              { descricao: { contains: "PROPRIA SAÚDE", mode: "insensitive" } },
              { descricao: { contains: "PRÓPRIA SAÚDE", mode: "insensitive" } },
            ],
          },
        },
      ],
    },
    select: { dataInicio: true, dataFim: true, dias: true },
  });

  return afastamentos.reduce(
    (total, item) => total + calcularDias(item.dias, item.dataInicio, item.dataFim),
    0,
  );
}

export async function existePeriodoPosteriorNaoUsufruido(params: {
  servidorId: string;
  exercicio: number;
  dataInicioReferencia: Date;
  ignorarProgramacaoId?: string | null;
}) {
  const hoje = new Date();
  const periodos = await listarPeriodosFeriasAtivosServidor({
    servidorId: params.servidorId,
    exercicio: params.exercicio,
    ignorarProgramacaoId: params.ignorarProgramacaoId,
  });

  return periodos.some(
    (periodo) =>
      periodo.dataInicio > params.dataInicioReferencia && periodo.dataFim >= hoje,
  );
}

export async function listarSolicitacoesFeriasChefia(params: {
  usuarioId: string;
  dataReferencia?: Date;
}) {
  const idsUnidades = await listarIdsUnidadesSubordinadasNaData({
    usuarioId: params.usuarioId,
    data: params.dataReferencia ?? new Date(),
  });

  if (idsUnidades.length === 0) return [];

  return prisma.programacaoFerias.findMany({
    where: {
      unidadeId: { in: idsUnidades },
      status: { in: ["ENVIADA", "EM_ANALISE", "DEVOLVIDA"] },
    },
    include: {
      servidor: { include: { usuario: true } },
      unidade: true,
      orgao: true,
    },
    orderBy: [{ criadoEm: "asc" }],
  });
}

export async function usuarioPodeAnalisarProgramacaoFerias(params: {
  usuarioId: string;
  programacaoId: string;
}) {
  const programacao = await prisma.programacaoFerias.findUnique({
    where: { id: params.programacaoId },
    select: { unidadeId: true },
  });

  if (!programacao?.unidadeId) return false;

  const idsUnidades = await listarIdsUnidadesSubordinadasNaData({
    usuarioId: params.usuarioId,
    data: new Date(),
  });

  return idsUnidades.includes(programacao.unidadeId);
}

export async function listarProgramacoesPendentesEnvioSarh(orgaoIds?: string[]) {
  return prisma.programacaoFerias.findMany({
    where: {
      status: {
        in: ["APROVADA_CHEFIA", "AGUARDANDO_ENVIO_SARH", "ERRO_ENVIO_SARH"],
      },
      ...(orgaoIds?.length ? { orgaoId: { in: orgaoIds } } : {}),
    },
    include: {
      servidor: { include: { usuario: true } },
      unidade: true,
      orgao: true,
      enviadoSarhPor: true,
    },
    orderBy: [{ analisadoEm: "asc" }, { criadoEm: "asc" }],
  });
}

export async function montarMapaFeriasEquipe(params: {
  usuarioId: string;
  ano: number;
  unidadeIds?: string[];
  visualizarTodasEquipes?: boolean;
  preview?: {
    servidorId: string;
    dataInicio: Date;
    dataFim: Date;
    dias: number;
    exercicio: number;
    programacaoId?: string;
  };
}): Promise<ProgramacaoFeriasMapaItem[]> {
  const inicioAno = new Date(Date.UTC(params.ano, 0, 1));
  const inicioProximoAno = new Date(Date.UTC(params.ano + 1, 0, 1));
  const idsSubordinados = params.visualizarTodasEquipes
    ? []
    : await listarIdsUnidadesSubordinadasNaData({
        usuarioId: params.usuarioId,
        data: new Date(),
      });

  if (!params.visualizarTodasEquipes && idsSubordinados.length === 0) {
    return [];
  }

  const idsFiltro = params.unidadeIds?.length
    ? params.unidadeIds
    : params.visualizarTodasEquipes
      ? undefined
      : idsSubordinados;

  const lotacaoNoPeriodo = {
    status: "ATIVO" as const,
    ...(idsFiltro?.length ? { unidadeId: { in: idsFiltro } } : {}),
    dataInicio: { lt: inicioProximoAno },
    OR: [{ dataFim: null }, { dataFim: { gte: inicioAno } }],
  };
  const [afastamentos, programacoes, previewServidor] = await Promise.all([
    prisma.afastamentoSarh.findMany({
      where: {
        servidorId: { not: null },
        dataInicio: { lt: inicioProximoAno },
        AND: [
          { OR: [{ dataFim: null }, { dataFim: { gte: inicioAno } }] },
          filtroFeriasSarh(),
        ],
        servidor: {
          ativo: true,
          lotacoes: { some: lotacaoNoPeriodo },
        },
      },
      include: {
        servidor: {
          include: {
            usuario: true,
            lotacoes: {
              where: lotacaoNoPeriodo,
              include: { unidade: true },
              orderBy: [{ dataInicio: "desc" }],
            },
          },
        },
      },
    }),
    prisma.programacaoFerias.findMany({
      where: {
        dataInicio: { lt: inicioProximoAno },
        dataFim: { gte: inicioAno },
        status: { in: [...STATUS_PROGRAMACAO_FERIAS_MAPA] },
        ...(idsFiltro?.length ? { unidadeId: { in: idsFiltro } } : {}),
      },
      include: {
        servidor: {
          include: {
            usuario: true,
            lotacoes: {
              where: { status: "ATIVO" },
              include: { unidade: true },
              orderBy: [{ dataInicio: "desc" }],
            },
          },
        },
        unidade: true,
      },
    }),
    params.preview
      ? prisma.servidor.findUnique({
          where: { id: params.preview.servidorId },
          include: {
            usuario: true,
            lotacoes: {
              where: { status: "ATIVO" },
              include: { unidade: true },
              orderBy: [{ dataInicio: "desc" }],
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const itensSarh = afastamentos
    .map((afastamento): ProgramacaoFeriasMapaItem | null => {
      const servidor = afastamento.servidor;
      const unidade = servidor ? primeiraLotacaoAtiva(servidor) : null;
      if (!servidor || !unidade) return null;

      return {
        id: afastamento.id,
        origem: "SARH",
        servidorId: servidor.id,
        servidorNome: nomeServidor(servidor) || servidor.matricula,
        matricula: servidor.matricula,
        unidadeId: unidade.id,
        unidadeSigla: unidade.sigla,
        unidadeNome: unidade.nome,
        dataInicio: afastamento.dataInicio,
        dataFim: afastamento.dataFim ?? afastamento.dataInicio,
        dias: calcularDias(afastamento.dias, afastamento.dataInicio, afastamento.dataFim),
        exercicio: afastamento.exercicio,
        status: "SARH",
        statusLabel: "SARH",
      };
    })
    .filter((item): item is ProgramacaoFeriasMapaItem => Boolean(item));
  const itensSecp = programacoes.map((programacao): ProgramacaoFeriasMapaItem => {
    const unidade = programacao.unidade ?? primeiraLotacaoAtiva(programacao.servidor);

    return {
      id: programacao.id,
      origem: "SECP",
      servidorId: programacao.servidorId,
      servidorNome:
        nomeServidor(programacao.servidor) || programacao.servidor.matricula,
      matricula: programacao.servidor.matricula,
      unidadeId: unidade?.id ?? null,
      unidadeSigla: unidade?.sigla ?? "-",
      unidadeNome: unidade?.nome ?? "Sem unidade",
      dataInicio: programacao.dataInicio,
      dataFim: programacao.dataFim,
      dias: programacao.dias,
      exercicio: programacao.exercicio,
      status: programacao.status,
      statusLabel: "SECP",
    };
  });
  const itensSecpSemPreview = params.preview?.programacaoId
    ? itensSecp.filter((item) => item.id !== params.preview?.programacaoId)
    : itensSecp;
  const itemPreview =
    params.preview && previewServidor
      ? [
          {
            id: params.preview.programacaoId ?? "preview",
            origem: "PREVIA" as const,
            servidorId: previewServidor.id,
            servidorNome: nomeServidor(previewServidor) || previewServidor.matricula,
            matricula: previewServidor.matricula,
            unidadeId: primeiraLotacaoAtiva(previewServidor)?.id ?? null,
            unidadeSigla: primeiraLotacaoAtiva(previewServidor)?.sigla ?? "-",
            unidadeNome:
              primeiraLotacaoAtiva(previewServidor)?.nome ?? "Sem unidade",
            dataInicio: params.preview.dataInicio,
            dataFim: params.preview.dataFim,
            dias: params.preview.dias,
            exercicio: params.preview.exercicio,
            status: "PREVIA",
            statusLabel: "Previa da aprovacao",
          },
        ]
      : [];

  return [...itensSarh, ...itensSecpSemPreview, ...itemPreview].sort(
    (a, b) => a.dataInicio.getTime() - b.dataInicio.getTime(),
  );
}
