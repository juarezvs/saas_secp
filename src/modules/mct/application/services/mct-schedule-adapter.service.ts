import { prisma } from "@/shared/infrastructure/database/prisma";
import { resolverPrevisaoJornadaDia } from "@/modules/jornadas/application/services/resolver-previsao-jornada-dia.service";
import type { PlanoTemporalDia } from "../../domain/planejador-temporal";
import type { IntervaloTemporal } from "../../domain/tempo";

type JornadaComCalendario = NonNullable<
  Awaited<ReturnType<typeof carregarJornadaDoServidor>>
>;

export type ResultadoMctScheduleAdapter = {
  jornadaId: string;
  escalaId: string | null;
  fonte: "ESCALA" | "JORNADA_DIA" | "JORNADA_PADRAO";
  plano: PlanoTemporalDia;
  referencia: IntervaloTemporal | null;
  intervaloMinimoMinutos: number | null;
  intervaloMaximoMinutos: number | null;
  permiteCompensacaoNoDia: boolean;
  diagnosticos: string[];
};

async function carregarJornadaDoServidor(
  servidorId: string,
  dataReferencia: Date,
) {
  return prisma.jornadaServidor.findFirst({
    where: {
      servidorId,
      ativo: true,
      status: "ATIVO",
      dataInicio: { lte: dataReferencia },
      OR: [{ dataFim: null }, { dataFim: { gte: dataReferencia } }],
    },
    include: {
      jornada: { include: { dias: { include: { faixas: true } } } },
      escala: { include: { dias: true } },
    },
    orderBy: { dataInicio: "desc" },
  });
}

export async function adaptarJornadaServidorParaMct(params: {
  servidorId: string;
  dataReferencia: Date;
}): Promise<ResultadoMctScheduleAdapter> {
  const vinculacao = await carregarJornadaDoServidor(
    params.servidorId,
    params.dataReferencia,
  );
  if (!vinculacao) {
    throw new Error("Não há jornada vigente para o servidor na data informada.");
  }

  return adaptarJornadaCarregadaParaMct(vinculacao, params.dataReferencia);
}

export function adaptarJornadaCarregadaParaMct(
  vinculacao: JornadaComCalendario,
  dataReferencia: Date,
): ResultadoMctScheduleAdapter {
  const previsao = resolverPrevisaoJornadaDia({
    jornada: vinculacao.jornada,
    escala: vinculacao.escala,
    dataReferencia,
    dataAncoragemJornada: vinculacao.dataInicio,
  });
  const diagnosticos: string[] = [];
  if (previsao.trabalha && previsao.cargaPrevistaMinutos <= 0) {
    diagnosticos.push("Dia de trabalho sem carga prevista configurada.");
  }
  if (vinculacao.jornada.controlaHorario && previsao.trabalha && !previsao.janela) {
    diagnosticos.push("Jornada com controle de horário sem janela de referência.");
  }

  return {
    jornadaId: vinculacao.jornadaId,
    escalaId: vinculacao.escalaId,
    fonte: previsao.fonte,
    plano: {
      dataReferencia,
      trabalha: previsao.trabalha,
      jornadaPrevistaMinutos: previsao.cargaPrevistaMinutos,
      jornadaExigivelMinutos: previsao.cargaPrevistaMinutos,
      minutosReconhecidosComoExercicio: 0,
      posicaoCiclo: previsao.escalaPosicaoCiclo,
      codigoDiaCiclo:
        previsao.escalaPosicaoCiclo === null
          ? null
          : String(previsao.escalaPosicaoCiclo),
      ocorrenciasAplicadas: [],
    },
    referencia: previsao.janela
      ? {
          inicio: combinarDataHora(dataReferencia, previsao.janela.inicio),
          fim: combinarDataHora(
            dataReferencia,
            previsao.janela.fim,
            previsao.janela.cruzaMeiaNoite,
          ),
        }
      : null,
    intervaloMinimoMinutos: vinculacao.jornada.exigeIntervalo
      ? vinculacao.jornada.intervaloMinimoMinutos
      : null,
    intervaloMaximoMinutos: vinculacao.jornada.exigeIntervalo
      ? vinculacao.jornada.intervaloMaximoMinutos
      : null,
    permiteCompensacaoNoDia: vinculacao.jornada.permiteCompensacaoNoDia,
    diagnosticos,
  };
}

function combinarDataHora(data: Date, hora: string, diaSeguinte = false) {
  const [horas, minutos] = hora.split(":").map(Number);
  const instante = new Date(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate(), horas, minutos),
  );
  if (diaSeguinte) instante.setUTCDate(instante.getUTCDate() + 1);
  return instante;
}
