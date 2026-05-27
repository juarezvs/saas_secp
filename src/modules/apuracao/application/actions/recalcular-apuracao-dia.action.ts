"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { normalizarDataReferencia } from "../services/calcular-tempo.service";
import { calcularApuracaoDiaria } from "../services/calcular-apuracao-diaria.service";
import {
  buscarJornadaVigenteParaData,
  listarMarcacoesDoDia,
} from "../../infrastructure/repositories/apuracao.repository";

export async function recalcularApuracaoDiaAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeRecalcular =
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("apuracao:consultar:proprio");

  if (!podeRecalcular) {
    return;
  }

  const servidorId = String(formData.get("servidorId") ?? "");
  const data = String(formData.get("dataReferencia") ?? "");

  if (!servidorId || !data) {
    return;
  }

  const dataReferencia = normalizarDataReferencia(new Date(`${data}T00:00:00`));

  const [marcacoes, jornadaServidor] = await Promise.all([
    listarMarcacoesDoDia({
      servidorId,
      dataReferencia,
    }),
    buscarJornadaVigenteParaData({
      servidorId,
      dataReferencia,
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

  await prisma.$transaction(async (tx) => {
    const apuracao = await tx.apuracaoDiaria.upsert({
      where: {
        servidorId_dataReferencia: {
          servidorId,
          dataReferencia,
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
          origem: "RECALCULO_MANUAL",
        },
      },
      create: {
        servidorId,
        jornadaServidorId: jornadaServidor?.id ?? null,
        dataReferencia,
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
          origem: "RECALCULO_MANUAL",
        },
      },
    });

    await tx.ocorrenciaFrequencia.deleteMany({
      where: {
        apuracaoDiariaId: apuracao.id,
      },
    });

    if (calculo.ocorrencias.length > 0) {
      await tx.ocorrenciaFrequencia.createMany({
        data: calculo.ocorrencias.map((ocorrencia) => ({
          apuracaoDiariaId: apuracao.id,
          servidorId,
          tipo: ocorrencia.tipo,
          descricao: ocorrencia.descricao,
          minutos: ocorrencia.minutos,
        })),
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "ApuracaoDiaria",
        entidadeId: apuracao.id,
        acao: "APURACAO_DIARIA_RECALCULADA",
        dadosDepois: {
          servidorId,
          dataReferencia,
          resultado: calculo.resultado,
          status: calculo.status,
          minutosTrabalhados: calculo.minutosTrabalhados,
          minutosCredito: calculo.minutosCredito,
          minutosDebito: calculo.minutosDebito,
        },
      },
    });
  });

  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/marcacoes");
}