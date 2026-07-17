import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  calcularExecucaoHorasExtras,
  somarExecucaoHorasExtras,
} from "../../application/services/calcular-execucao-horas-extras.service";

type ListarAutorizacoesParams = {
  orgaoIds?: string[];
  escopoGlobal?: boolean;
  limite?: number;
};

function menorData(datas: Date[]) {
  return new Date(Math.min(...datas.map((data) => data.getTime())));
}

function maiorData(datas: Date[]) {
  return new Date(Math.max(...datas.map((data) => data.getTime())));
}

function chaveApuracao(servidorId: string, data: Date) {
  return `${servidorId}:${data.toISOString().slice(0, 10)}`;
}

export async function listarAutorizacoesHorasExtrasParaExecucao(
  params: ListarAutorizacoesParams,
) {
  const autorizacoes = await prisma.overtimeAuthorization.findMany({
    where: {
      status: "ACTIVE",
      ...(params.escopoGlobal
        ? {}
        : {
            orgaoId: {
              in: params.orgaoIds ?? [],
            },
          }),
    },
    include: {
      request: true,
      days: {
        orderBy: {
          date: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: params.limite ?? 100,
  });

  if (autorizacoes.length === 0) {
    return [];
  }

  const servidorIds = Array.from(
    new Set(autorizacoes.map((autorizacao) => autorizacao.employeeId)),
  );
  const datas = autorizacoes.flatMap((autorizacao) =>
    autorizacao.days.map((day) => day.date),
  );
  const inicio = menorData(datas);
  const fim = maiorData(datas);

  const [servidores, apuracoes] = await Promise.all([
    prisma.servidor.findMany({
      where: {
        id: {
          in: servidorIds,
        },
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
          take: 1,
        },
      },
    }),
    prisma.apuracaoDiaria.findMany({
      where: {
        servidorId: {
          in: servidorIds,
        },
        dataReferencia: {
          gte: inicio,
          lte: fim,
        },
      },
      select: {
        servidorId: true,
        dataReferencia: true,
        minutosCredito: true,
        status: true,
      },
    }),
  ]);

  const servidoresPorId = new Map(
    servidores.map((servidor) => [servidor.id, servidor]),
  );
  const apuracoesPorChave = new Map(
    apuracoes.map((apuracao) => [
      chaveApuracao(apuracao.servidorId, apuracao.dataReferencia),
      apuracao,
    ]),
  );

  return autorizacoes.map((autorizacao) => {
    const servidor = servidoresPorId.get(autorizacao.employeeId);
    const diasExecucao = calcularExecucaoHorasExtras({
      diasAutorizados: autorizacao.days,
      apuracoes: autorizacao.days
        .map((day) => apuracoesPorChave.get(chaveApuracao(autorizacao.employeeId, day.date)))
        .filter((apuracao): apuracao is NonNullable<typeof apuracao> =>
          Boolean(apuracao),
        ),
    });
    const totais = somarExecucaoHorasExtras(diasExecucao);

    return {
      authorization: autorizacao,
      servidor: servidor
        ? {
            id: servidor.id,
            matricula: servidor.matricula,
            nome:
              servidor.nomeFuncional?.trim() ||
              servidor.usuario?.nome?.trim() ||
              servidor.matricula,
            orgao: servidor.orgao?.sigla ?? servidor.orgao?.nome ?? null,
            unidade: servidor.lotacoes[0]?.unidade?.sigla ?? null,
          }
        : null,
      diasExecucao,
      totais,
    };
  });
}
