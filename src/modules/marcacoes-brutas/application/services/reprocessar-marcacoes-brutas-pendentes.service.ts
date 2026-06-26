import { PeriodoHomologadoError } from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import { recalcularMesServidorService } from "@/modules/recalculo/application/services/recalcular-mes-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { listarMarcacoesBrutasPendentes } from "../../infrastructure/repositories/marcacao-bruta.repository";
import { associarMarcacoesBrutasPendentesService } from "./associar-marcacoes-brutas-pendentes.service";
import { processarMarcacaoBrutaService } from "./processar-marcacao-bruta.service";

function chaveCompetencia(params: {
  servidorId: string;
  dataReferencia: Date;
}) {
  return [
    params.servidorId,
    params.dataReferencia.getUTCFullYear(),
    params.dataReferencia.getUTCMonth() + 1,
  ].join(":");
}

export async function reprocessarMarcacoesBrutasPendentesService(params: {
  usuarioId?: string | null;
  limite?: number;
  cursorId?: string | null;
}) {
  // A consulta do lote só começa depois que toda associação possível terminou.
  const associacao = await associarMarcacoesBrutasPendentesService();
  const pendentes = await listarMarcacoesBrutasPendentes({
    limite: params.limite ?? 500,
    cursorId: params.cursorId,
  });

  let processadas = 0;
  let aindaPendentes = 0;
  let erros = 0;
  let semJornadaVigente = 0;
  let periodosHomologados = 0;
  const competenciasAfetadas = new Map<
    string,
    { servidorId: string; anoReferencia: number; mesReferencia: number }
  >();

  for (const bruta of pendentes) {
    try {
      const resultado = await processarMarcacaoBrutaService({
        marcacaoBrutaId: bruta.id,
        usuarioIdAuditoria: params.usuarioId ?? undefined,
        recalcularImpactos: false,
      });

      if (resultado.sucesso) {
        processadas++;
        if (resultado.servidorId && resultado.dataReferencia) {
          competenciasAfetadas.set(
            chaveCompetencia({
              servidorId: resultado.servidorId,
              dataReferencia: resultado.dataReferencia,
            }),
            {
              servidorId: resultado.servidorId,
              anoReferencia: resultado.dataReferencia.getUTCFullYear(),
              mesReferencia: resultado.dataReferencia.getUTCMonth() + 1,
            },
          );
        }
      } else {
        aindaPendentes++;
        if (resultado.mensagem.includes("sem jornada vigente")) {
          semJornadaVigente++;
        }
      }
    } catch (error) {
      if (error instanceof PeriodoHomologadoError) {
        periodosHomologados++;
        aindaPendentes++;
        continue;
      }
      erros++;
    }
  }

  const pendentesRestantes = await prisma.marcacaoBruta.count({
    where: { processada: false },
  });

  for (const competencia of competenciasAfetadas.values()) {
    try {
      await recalcularMesServidorService({
        ...competencia,
        usuarioIdAuditoria: params.usuarioId ?? undefined,
        origem: "REPROCESSAMENTO_MARCACOES_BRUTAS_PENDENTES",
      });
    } catch (error) {
      if (error instanceof PeriodoHomologadoError) {
        periodosHomologados++;
        continue;
      }

      erros++;
    }
  }

  const limite = params.limite ?? 500;

  return {
    total: pendentes.length,
    processadas,
    aindaPendentes,
    erros,
    associadas: associacao.associadas,
    semServidorCorrespondente: associacao.semServidorCorrespondente,
    semJornadaVigente,
    periodosHomologados,
    competenciasRecalculadas: competenciasAfetadas.size,
    pendentesRestantes,
    proximoCursor:
      pendentes.length === limite ? pendentes.at(-1)?.id ?? null : null,
  };
}
