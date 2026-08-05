import { PeriodoHomologadoError, verificarPeriodoHomologado } from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import { recalcularMesServidorService } from "@/modules/recalculo/application/services/recalcular-mes-servidor.service";
import { listarIdsDescendentesDaUnidade } from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { processarMarcacaoBrutaService } from "./processar-marcacao-bruta.service";

type EscopoReprocessamento =
  | {
      tipo: "SERVIDOR";
      servidorId: string;
    }
  | {
      tipo: "UNIDADE";
      unidadeId: string;
      incluirSubunidades: boolean;
    };

type Competencia = {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
};

function chaveCompetencia(competencia: Competencia) {
  return [
    competencia.servidorId,
    competencia.anoReferencia,
    competencia.mesReferencia,
  ].join(":");
}

function ehTexto(valor: string | null | undefined): valor is string {
  return Boolean(valor);
}

function competenciaDaData(servidorId: string, dataReferencia: Date) {
  return {
    servidorId,
    anoReferencia: dataReferencia.getUTCFullYear(),
    mesReferencia: dataReferencia.getUTCMonth() + 1,
  };
}

function intervaloBuscaCompetencia(ano: number, mes: number) {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));
  const inicioBusca = new Date(inicio);
  const fimBusca = new Date(fim);

  inicioBusca.setUTCDate(inicioBusca.getUTCDate() - 1);
  fimBusca.setUTCDate(fimBusca.getUTCDate() + 1);

  return { inicio, fim, inicioBusca, fimBusca };
}

function metadadosCancelamento(metadados: unknown, usuarioId?: string | null) {
  const base =
    typeof metadados === "object" && metadados !== null && !Array.isArray(metadados)
      ? metadados
      : {};

  return {
    ...base,
    canceladaPorReprocessamentoBruta: true,
    canceladaPorUsuarioId: usuarioId ?? null,
    canceladaEm: new Date().toISOString(),
  };
}

async function listarServidoresDoEscopo(params: {
  escopo: EscopoReprocessamento;
  inicio: Date;
  fim: Date;
}) {
  if (params.escopo.tipo === "SERVIDOR") {
    const servidor = await prisma.servidor.findFirst({
      where: {
        id: params.escopo.servidorId,
        ativo: true,
      },
      select: {
        id: true,
        matricula: true,
        cpf: true,
        pis: true,
      },
    });

    return servidor ? [servidor] : [];
  }

  const unidadesIds = params.escopo.incluirSubunidades
    ? [
        params.escopo.unidadeId,
        ...(await listarIdsDescendentesDaUnidade(params.escopo.unidadeId)),
      ]
    : [params.escopo.unidadeId];

  const lotacoes = await prisma.lotacao.findMany({
    where: {
      unidadeId: {
        in: unidadesIds,
      },
      status: "ATIVO",
      dataInicio: {
        lt: params.fim,
      },
      OR: [{ dataFim: null }, { dataFim: { gte: params.inicio } }],
      servidor: {
        ativo: true,
      },
    },
    select: {
      servidor: {
        select: {
          id: true,
          matricula: true,
          cpf: true,
          pis: true,
        },
      },
    },
  });

  const servidores = new Map<string, (typeof lotacoes)[number]["servidor"]>();

  for (const lotacao of lotacoes) {
    servidores.set(lotacao.servidor.id, lotacao.servidor);
  }

  return [...servidores.values()];
}

export async function reprocessarMarcacoesBrutasEscopoService(params: {
  usuarioId?: string | null;
  anoReferencia: number;
  mesReferencia: number;
  escopo: EscopoReprocessamento;
}) {
  const { inicio, fim, inicioBusca, fimBusca } = intervaloBuscaCompetencia(
    params.anoReferencia,
    params.mesReferencia,
  );
  const servidores = await listarServidoresDoEscopo({
    escopo: params.escopo,
    inicio,
    fim,
  });

  if (servidores.length === 0) {
    return {
      servidoresAfetados: 0,
      brutasEncontradas: 0,
      reprocessadas: 0,
      jaPendentes: 0,
      periodosHomologados: 0,
      erros: 0,
      competenciasRecalculadas: 0,
    };
  }

  const servidorIds = servidores.map((servidor) => servidor.id);
  const matriculas = servidores
    .map((servidor) => servidor.matricula)
    .filter(ehTexto);
  const cpfs = servidores.map((servidor) => servidor.cpf).filter(ehTexto);
  const pises = servidores.map((servidor) => servidor.pis).filter(ehTexto);
  const brutas = await prisma.marcacaoBruta.findMany({
    where: {
      dataHora: {
        gte: inicioBusca,
        lt: fimBusca,
      },
      OR: [
        { servidorId: { in: servidorIds } },
        ...(matriculas.length > 0 ? [{ matricula: { in: matriculas } }] : []),
        ...(cpfs.length > 0 ? [{ cpf: { in: cpfs } }] : []),
        ...(pises.length > 0
          ? [{ pis: { in: pises } }, { cpf: { in: pises } }]
          : []),
      ],
    },
    select: {
      id: true,
      processada: true,
      marcacaoId: true,
    },
    orderBy: {
      dataHora: "asc",
    },
  });

  let reprocessadas = 0;
  let jaPendentes = 0;
  let periodosHomologados = 0;
  let erros = 0;
  const competenciasAfetadas = new Map<string, Competencia>();

  for (const bruta of brutas) {
    const marcacaoAnterior = bruta.marcacaoId
      ? await prisma.marcacao.findUnique({
          where: { id: bruta.marcacaoId },
          select: {
            id: true,
            servidorId: true,
            dataReferencia: true,
            status: true,
            observacao: true,
            metadados: true,
          },
        })
      : null;

    if (marcacaoAnterior) {
      try {
        await verificarPeriodoHomologado({
          servidorId: marcacaoAnterior.servidorId,
          dataReferencia: marcacaoAnterior.dataReferencia,
        });
      } catch (error) {
        if (error instanceof PeriodoHomologadoError) {
          periodosHomologados++;
          continue;
        }

        erros++;
        continue;
      }
    } else if (!bruta.processada) {
      jaPendentes++;
    }

    try {
      if (marcacaoAnterior) {
        competenciasAfetadas.set(
          chaveCompetencia(
            competenciaDaData(
              marcacaoAnterior.servidorId,
              marcacaoAnterior.dataReferencia,
            ),
          ),
          competenciaDaData(
            marcacaoAnterior.servidorId,
            marcacaoAnterior.dataReferencia,
          ),
        );
      }

      await prisma.$transaction(async (tx) => {
        if (marcacaoAnterior) {
          await tx.marcacao.update({
            where: { id: marcacaoAnterior.id },
            data: {
              status: "CANCELADA",
              observacao: marcacaoAnterior.observacao
                ? `${marcacaoAnterior.observacao}\nCancelada para reprocessamento da marcação bruta.`
                : "Cancelada para reprocessamento da marcação bruta.",
              metadados: metadadosCancelamento(
                marcacaoAnterior.metadados,
                params.usuarioId,
              ),
            },
          });
        }

        await tx.marcacaoBruta.update({
          where: { id: bruta.id },
          data: {
            processada: false,
            processadaEm: null,
            marcacaoId: null,
          },
        });
      });

      const resultado = await processarMarcacaoBrutaService({
        marcacaoBrutaId: bruta.id,
        usuarioIdAuditoria: params.usuarioId ?? undefined,
        recalcularImpactos: false,
      });

      if (resultado.sucesso) {
        reprocessadas++;

        if (resultado.servidorId && resultado.dataReferencia) {
          const competencia = competenciaDaData(
            resultado.servidorId,
            resultado.dataReferencia,
          );
          competenciasAfetadas.set(chaveCompetencia(competencia), competencia);
        }
      } else {
        if (marcacaoAnterior) {
          await prisma.$transaction([
            prisma.marcacao.update({
              where: { id: marcacaoAnterior.id },
              data: {
                status: marcacaoAnterior.status,
                observacao: marcacaoAnterior.observacao,
                metadados: marcacaoAnterior.metadados ?? undefined,
              },
            }),
            prisma.marcacaoBruta.update({
              where: { id: bruta.id },
              data: {
                processada: true,
                marcacaoId: marcacaoAnterior.id,
              },
            }),
          ]);
        }
        erros++;
      }
    } catch (error) {
      if (marcacaoAnterior) {
        await prisma.$transaction([
          prisma.marcacao.update({
            where: { id: marcacaoAnterior.id },
            data: {
              status: marcacaoAnterior.status,
              observacao: marcacaoAnterior.observacao,
              metadados: marcacaoAnterior.metadados ?? undefined,
            },
          }),
          prisma.marcacaoBruta.update({
            where: { id: bruta.id },
            data: {
              processada: true,
              marcacaoId: marcacaoAnterior.id,
            },
          }),
        ]);
      }

      if (error instanceof PeriodoHomologadoError) {
        periodosHomologados++;
      } else {
        erros++;
      }
    }
  }

  let competenciasRecalculadas = 0;

  for (const competencia of competenciasAfetadas.values()) {
    try {
      await recalcularMesServidorService({
        servidorId: competencia.servidorId,
        anoReferencia: competencia.anoReferencia,
        mesReferencia: competencia.mesReferencia,
        usuarioIdAuditoria: params.usuarioId ?? undefined,
        origem: "REPROCESSAMENTO_MARCACOES_BRUTAS_ESCOPO",
      });
      competenciasRecalculadas++;
    } catch (error) {
      if (error instanceof PeriodoHomologadoError) {
        periodosHomologados++;
      } else {
        erros++;
      }
    }
  }

  return {
    servidoresAfetados: servidores.length,
    brutasEncontradas: brutas.length,
    reprocessadas,
    jaPendentes,
    periodosHomologados,
    erros,
    competenciasRecalculadas,
  };
}
