import { prisma } from "@/shared/infrastructure/database/prisma";
import { calcularApuracaoDiaria } from "@/modules/apuracao/application/services/calcular-apuracao-diaria.service";
import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { verificarPeriodoHomologado } from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";

export type RecalcularDiaServidorParams = {
  servidorId: string;
  dataReferencia: Date;
  usuarioIdAuditoria?: string;
  origem?: string;
  ignorarBloqueioHomologacao?: boolean;
};

export async function recalcularDiaServidorService(
  params: RecalcularDiaServidorParams,
) {
  const {
    servidorId,
    dataReferencia,
    usuarioIdAuditoria,
    origem = "RECALCULO_SERVICO",
  } = params;

  const dataNormalizada = normalizarDataReferencia(dataReferencia);

  if (!params.ignorarBloqueioHomologacao) {
    await verificarPeriodoHomologado({
      servidorId,
      dataReferencia: dataNormalizada,
    });
  }

  const [marcacoes, jornadaServidor] = await Promise.all([
    prisma.marcacao.findMany({
      where: {
        servidorId,
        dataReferencia: dataNormalizada,
        status: {
          in: ["VALIDA", "PENDENTE", "AJUSTADA"],
        },
      },
      orderBy: {
        dataHora: "asc",
      },
    }),

    prisma.jornadaServidor.findFirst({
      where: {
        servidorId,
        ativo: true,
        dataInicio: {
          lte: dataNormalizada,
        },
        OR: [
          {
            dataFim: null,
          },
          {
            dataFim: {
              gte: dataNormalizada,
            },
          },
        ],
      },
      include: {
        jornada: true,
      },
      orderBy: {
        dataInicio: "desc",
      },
    }),
  ]);

  const calculo = calcularApuracaoDiaria({
    marcacoes,
    jornada: jornadaServidor
      ? {
          jornadaServidorId: jornadaServidor.id,
          cargaDiariaMinutos: jornadaServidor.jornada.cargaDiariaMinutos,
          exigeIntervalo: jornadaServidor.jornada.exigeIntervalo,
          intervaloMinimoMinutos:
            jornadaServidor.jornada.intervaloMinimoMinutos,
          intervaloMaximoMinutos:
            jornadaServidor.jornada.intervaloMaximoMinutos,
        }
      : null,
  });

  const apuracao = await prisma.$transaction(async (tx) => {
    const apuracaoAtualizada = await tx.apuracaoDiaria.upsert({
      where: {
        servidorId_dataReferencia: {
          servidorId,
          dataReferencia: dataNormalizada,
        },
      },
      update: {
        jornadaServidorId: jornadaServidor?.id ?? null,
        cargaPrevistaMinutos: calculo.cargaPrevistaMinutos,
        minutosTrabalhados: calculo.minutosTrabalhados,
        minutosIntervalo: calculo.minutosIntervalo,
        minutosCredito: calculo.minutosCredito,
        minutosDebito: calculo.minutosDebito,
        resultado: calculo.resultado,
        status: calculo.status,
        primeiraEntrada: calculo.primeiraEntrada,
        saidaIntervalo: calculo.saidaIntervalo,
        retornoIntervalo: calculo.retornoIntervalo,
        ultimaSaida: calculo.ultimaSaida,
        calculadaEm: new Date(),
        metadados: {
          origem,
          quantidadeMarcacoes: marcacoes.length,
        },
      },
      create: {
        servidorId,
        jornadaServidorId: jornadaServidor?.id ?? null,
        dataReferencia: dataNormalizada,
        cargaPrevistaMinutos: calculo.cargaPrevistaMinutos,
        minutosTrabalhados: calculo.minutosTrabalhados,
        minutosIntervalo: calculo.minutosIntervalo,
        minutosCredito: calculo.minutosCredito,
        minutosDebito: calculo.minutosDebito,
        resultado: calculo.resultado,
        status: calculo.status,
        primeiraEntrada: calculo.primeiraEntrada,
        saidaIntervalo: calculo.saidaIntervalo,
        retornoIntervalo: calculo.retornoIntervalo,
        ultimaSaida: calculo.ultimaSaida,
        calculadaEm: new Date(),
        metadados: {
          origem,
          quantidadeMarcacoes: marcacoes.length,
        },
      },
    });

    await tx.ocorrenciaFrequencia.deleteMany({
      where: {
        apuracaoDiariaId: apuracaoAtualizada.id,
      },
    });

    if (calculo.ocorrencias.length > 0) {
      await tx.ocorrenciaFrequencia.createMany({
        data: calculo.ocorrencias.map((ocorrencia) => ({
          apuracaoDiariaId: apuracaoAtualizada.id,
          servidorId,
          tipo: ocorrencia.tipo,
          descricao: ocorrencia.descricao,
          minutos: ocorrencia.minutos,
        })),
      });
    }

    if (usuarioIdAuditoria) {
      await tx.auditoriaEvento.create({
        data: {
          usuarioId: usuarioIdAuditoria,
          entidade: "ApuracaoDiaria",
          entidadeId: apuracaoAtualizada.id,
          acao: "APURACAO_DIARIA_RECALCULADA",
          dadosDepois: {
            servidorId,
            dataReferencia: dataNormalizada,
            resultado: calculo.resultado,
            status: calculo.status,
            minutosTrabalhados: calculo.minutosTrabalhados,
            minutosCredito: calculo.minutosCredito,
            minutosDebito: calculo.minutosDebito,
            origem,
          },
        },
      });
    }

    return apuracaoAtualizada;
  });

  return {
    apuracao,
    calculo,
  };
}
