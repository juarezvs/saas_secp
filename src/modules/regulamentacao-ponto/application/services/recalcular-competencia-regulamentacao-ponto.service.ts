import { PeriodoHomologadoError } from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import { recalcularMesServidorService } from "@/modules/recalculo/application/services/recalcular-mes-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import type { RecalcularRegulamentacaoPontoProgresso } from "../queues/recalcular-regulamentacao-ponto-queue";

type RecalcularCompetenciaRegulamentacaoPontoParams = {
  orgaoId: string;
  anoReferencia: number;
  mesReferencia: number;
  usuarioIdAuditoria?: string | null;
  atualizarProgresso?: (
    progresso: RecalcularRegulamentacaoPontoProgresso,
  ) => Promise<void>;
};

async function publicarProgresso(
  params: RecalcularCompetenciaRegulamentacaoPontoParams,
  progresso: RecalcularRegulamentacaoPontoProgresso,
) {
  await params.atualizarProgresso?.(progresso);
}

export async function recalcularCompetenciaRegulamentacaoPontoService(
  params: RecalcularCompetenciaRegulamentacaoPontoParams,
) {
  const servidores = await prisma.servidor.findMany({
    where: {
      orgaoId: params.orgaoId,
      ativo: true,
    },
    select: {
      id: true,
    },
    orderBy: {
      matricula: "asc",
    },
  });

  const totalServidores = servidores.length;
  let servidoresProcessados = 0;
  let servidoresRecalculados = 0;
  let servidoresIgnorados = 0;

  await publicarProgresso(params, {
    percentual: totalServidores > 0 ? 1 : 100,
    etapa: "Iniciando recalculo da competencia",
    servidoresProcessados,
    totalServidores,
    servidoresIgnorados,
  });

  for (const servidor of servidores) {
    try {
      await recalcularMesServidorService({
        servidorId: servidor.id,
        anoReferencia: params.anoReferencia,
        mesReferencia: params.mesReferencia,
        usuarioIdAuditoria: params.usuarioIdAuditoria ?? undefined,
        origem: "ALTERACAO_REGULAMENTACAO_PONTO_ORGAO",
      });
      servidoresRecalculados += 1;
    } catch (error) {
      if (error instanceof PeriodoHomologadoError) {
        servidoresIgnorados += 1;
      } else {
        throw error;
      }
    } finally {
      servidoresProcessados += 1;
      const percentual =
        totalServidores > 0
          ? Math.round((servidoresProcessados / totalServidores) * 100)
          : 100;

      await publicarProgresso(params, {
        percentual,
        etapa: "Recalculando servidores do orgao",
        servidoresProcessados,
        totalServidores,
        servidoresIgnorados,
      });
    }
  }

  return {
    totalServidores,
    servidoresProcessados,
    servidoresRecalculados,
    servidoresIgnorados,
  };
}
