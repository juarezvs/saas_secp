import { PeriodoHomologadoError } from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import { recalcularMesServidorService } from "@/modules/recalculo/application/services/recalcular-mes-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import type { ReprocessamentoGlobalProgresso } from "../queues/reprocessamento-global-queue";
import { associarMarcacoesBrutasPendentesService } from "./associar-marcacoes-brutas-pendentes.service";
import { processarMarcacaoBrutaService } from "./processar-marcacao-bruta.service";

type CompetenciaServidor = {
  servidorId: string;
  ano: number;
  mes: number;
};

type AtualizarProgresso = (
  progresso: ReprocessamentoGlobalProgresso,
) => Promise<void>;

export async function reprocessarTodosServidoresService(params: {
  usuarioId: string;
  atualizarProgresso: AtualizarProgresso;
}) {
  const associacao = await associarMarcacoesBrutasPendentesService();
  const totalPendentes = await prisma.marcacaoBruta.count({
    where: { processada: false },
  });

  let cursorId: string | undefined;
  let pendentesAnalisadas = 0;
  let processadas = 0;
  let erros = 0;
  let periodosHomologados = 0;
  const competenciasAfetadas = new Map<string, CompetenciaServidor>();

  await params.atualizarProgresso({
    percentual: 2,
    etapa: "Associando marcações brutas aos servidores",
    processadas,
    pendentesAnalisadas,
    competenciasRecalculadas: 0,
    totalCompetencias: 0,
    erros,
  });

  while (true) {
    const lote = await prisma.marcacaoBruta.findMany({
      where: {
        processada: false,
        ...(cursorId ? { id: { gt: cursorId } } : {}),
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 500,
    });

    if (lote.length === 0) break;

    for (const bruta of lote) {
      try {
        const resultado = await processarMarcacaoBrutaService({
          marcacaoBrutaId: bruta.id,
          usuarioIdAuditoria: params.usuarioId,
          recalcularImpactos: false,
        });

        if (resultado.sucesso) {
          processadas++;

          if (resultado.servidorId && resultado.dataReferencia) {
            const competencia = {
              servidorId: resultado.servidorId,
              ano: resultado.dataReferencia.getUTCFullYear(),
              mes: resultado.dataReferencia.getUTCMonth() + 1,
            };

            competenciasAfetadas.set(
              `${competencia.servidorId}:${competencia.ano}:${competencia.mes}`,
              competencia,
            );
          }
        }
      } catch (error) {
        if (error instanceof PeriodoHomologadoError) {
          periodosHomologados++;
        } else {
          erros++;
        }
      }

      pendentesAnalisadas++;
    }

    cursorId = lote.at(-1)?.id;
    const percentualPendencias =
      totalPendentes === 0
        ? 40
        : Math.min(
            40,
            5 + Math.round((pendentesAnalisadas / totalPendentes) * 35),
          );

    await params.atualizarProgresso({
      percentual: percentualPendencias,
      etapa: "Processando marcações brutas pendentes",
      processadas,
      pendentesAnalisadas,
      competenciasRecalculadas: 0,
      totalCompetencias: 0,
      erros,
    });
  }

  const competencias = [...competenciasAfetadas.values()].sort((a, b) =>
    a.servidorId.localeCompare(b.servidorId) || a.ano - b.ano || a.mes - b.mes,
  );

  let competenciasRecalculadas = 0;
  let competenciasAnalisadas = 0;

  for (const competencia of competencias) {
    try {
      await recalcularMesServidorService({
        servidorId: competencia.servidorId,
        anoReferencia: competencia.ano,
        mesReferencia: competencia.mes,
        usuarioIdAuditoria: params.usuarioId,
        origem: "REPROCESSAMENTO_GLOBAL_MARCACOES_BRUTAS",
      });
      competenciasRecalculadas++;
    } catch (error) {
      if (error instanceof PeriodoHomologadoError) {
        periodosHomologados++;
      } else {
        erros++;
      }
    }
    competenciasAnalisadas++;

    const percentual =
      competencias.length === 0
        ? 99
        : 40 + Math.round((competenciasAnalisadas / competencias.length) * 59);

    await params.atualizarProgresso({
      percentual: Math.min(percentual, 99),
      etapa: "Recalculando apurações e banco de horas",
      processadas,
      pendentesAnalisadas,
      competenciasRecalculadas,
      totalCompetencias: competencias.length,
      erros,
    });
  }

  const pendentesRestantes = await prisma.marcacaoBruta.count({
    where: { processada: false },
  });

  const resultado = {
    associadas: associacao.associadas,
    semServidorCorrespondente: associacao.semServidorCorrespondente,
    totalPendentes,
    pendentesAnalisadas,
    processadas,
    pendentesRestantes,
    competenciasRecalculadas,
    totalCompetencias: competencias.length,
    periodosHomologados,
    erros,
  };

  await params.atualizarProgresso({
    percentual: 100,
    etapa: "Reprocessamento global concluído",
    processadas,
    pendentesAnalisadas,
    competenciasRecalculadas,
    totalCompetencias: competencias.length,
    erros,
  });

  return resultado;
}
