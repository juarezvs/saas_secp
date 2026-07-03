import { Clock, ClipboardList, Hourglass } from "lucide-react";

import { minutosParaTexto } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { listarApuracoesDoServidorNoMes } from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import type {
  AlertaServidor,
  MetricaServidor,
} from "@/modules/dashboard/presentation/data/dashboard-servidor.config";

type CompetenciaAtual = {
  ano: number;
  mes: number;
};

function competenciaAtualNoFuso(fusoHorario: string): CompetenciaAtual {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return {
    ano: Number(partes.find((parte) => parte.type === "year")?.value),
    mes: Number(partes.find((parte) => parte.type === "month")?.value),
  };
}

function dataReferenciaHojeNoFuso(fusoHorario: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const ano = Number(partes.find((parte) => parte.type === "year")?.value);
  const mes = Number(partes.find((parte) => parte.type === "month")?.value);
  const dia = Number(partes.find((parte) => parte.type === "day")?.value);

  return new Date(Date.UTC(ano, mes - 1, dia));
}

function formatarSaldoBancoHoras(minutos: number) {
  if (minutos === 0) return "00:00";

  const texto = minutosParaTexto(minutos);
  return minutos > 0 ? `+${texto}` : texto;
}

function varianteBancoHoras(minutos: number): MetricaServidor["variante"] {
  if (minutos < 0) return "warning";
  return "success";
}

function montarDescricaoPendencias(total: number) {
  if (total === 0) return "Nada pendente";
  if (total === 1) return "Item aguardando regularização";
  return "Itens aguardando regularização";
}

function diferencaMinutos(inicio: Date, fim: Date) {
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / 60000));
}

function calcularTempoRealTrabalhado(
  marcacoes: Array<{ tipo: string; dataHora: Date }>,
) {
  const entrada = marcacoes.find((item) => item.tipo === "ENTRADA");
  const saidaFinal = marcacoes.find(
    (item) => item.tipo === "SAIDA" && (!entrada || item.dataHora > entrada.dataHora),
  );

  if (!entrada || saidaFinal) {
    return null;
  }

  const saidaIntervalo = marcacoes.find(
    (item) =>
      item.tipo === "SAIDA_INTERVALO" && item.dataHora > entrada.dataHora,
  );
  const retornoIntervalo = marcacoes.find(
    (item) =>
      item.tipo === "RETORNO_INTERVALO" &&
      saidaIntervalo &&
      item.dataHora > saidaIntervalo.dataHora,
  );

  if (saidaIntervalo && !retornoIntervalo) {
    return {
      inicioIso: saidaIntervalo.dataHora.toISOString(),
      minutosBase: diferencaMinutos(entrada.dataHora, saidaIntervalo.dataHora),
      emIntervalo: true,
    };
  }

  if (saidaIntervalo && retornoIntervalo) {
    return {
      inicioIso: retornoIntervalo.dataHora.toISOString(),
      minutosBase: diferencaMinutos(entrada.dataHora, saidaIntervalo.dataHora),
      emIntervalo: false,
    };
  }

  return {
    inicioIso: entrada.dataHora.toISOString(),
    minutosBase: 0,
    emIntervalo: false,
  };
}

export async function buscarResumoDashboardServidor(usuarioId: string): Promise<{
  metricas: MetricaServidor[];
  alertas: AlertaServidor[];
} | null> {
  const servidor = await prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    select: {
      id: true,
    },
  });

  if (!servidor) {
    return null;
  }

  const fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId: servidor.id,
  });
  const competencia = competenciaAtualNoFuso(fusoHorario);
  const dataHoje = dataReferenciaHojeNoFuso(fusoHorario);
  const inicioMes = new Date(Date.UTC(competencia.ano, competencia.mes - 1, 1));
  const fimMes = new Date(Date.UTC(competencia.ano, competencia.mes, 1));
  const [
    saldoBancoHoras,
    apuracaoHoje,
    ocorrenciasAbertas,
    solicitacoesPendentes,
    homologacaoMes,
    apuracoesMes,
    marcacoesHoje,
  ] = await Promise.all([
    prisma.bancoHorasSaldo.findUnique({
      where: {
        servidorId: servidor.id,
      },
      select: {
        saldoMinutos: true,
        creditosPendentesMinutos: true,
        debitosPendentesMinutos: true,
        horasAcimaLimiteMinutos: true,
        horasNaoAutorizadasMinutos: true,
      },
    }),
    prisma.apuracaoDiaria.findUnique({
      where: {
        servidorId_dataReferencia: {
          servidorId: servidor.id,
          dataReferencia: dataHoje,
        },
      },
      select: {
        cargaPrevistaMinutos: true,
        minutosTrabalhados: true,
        resultado: true,
        status: true,
      },
    }),
    prisma.ocorrenciaFrequencia.count({
      where: {
        servidorId: servidor.id,
        resolvida: false,
        apuracaoDiaria: {
          dataReferencia: {
            gte: inicioMes,
            lt: fimMes,
          },
        },
      },
    }),
    prisma.solicitacao.count({
      where: {
        servidorId: servidor.id,
        status: {
          in: ["ENVIADA", "EM_ANALISE"],
        },
        OR: [
          {
            dataReferencia: {
              gte: inicioMes,
              lt: fimMes,
            },
          },
          {
            criadoEm: {
              gte: inicioMes,
              lt: fimMes,
            },
          },
        ],
      },
    }),
    prisma.homologacaoServidorMes.findFirst({
      where: {
        servidorId: servidor.id,
        fechamento: {
          anoReferencia: competencia.ano,
          mesReferencia: competencia.mes,
        },
      },
      select: {
        status: true,
        pendencias: true,
      },
    }),
    listarApuracoesDoServidorNoMes({
      servidorId: servidor.id,
      ano: competencia.ano,
      mes: competencia.mes,
    }),
    prisma.marcacao.findMany({
      where: {
        servidorId: servidor.id,
        dataReferencia: dataHoje,
        status: {
          in: ["VALIDA", "AJUSTADA", "PENDENTE"],
        },
      },
      select: {
        tipo: true,
        dataHora: true,
      },
      orderBy: {
        dataHora: "asc",
      },
    }),
  ]);

  const pendenciasHomologacao = Array.isArray(homologacaoMes?.pendencias)
    ? homologacaoMes.pendencias.length
    : homologacaoMes?.status === "COM_PENDENCIAS" ||
        homologacaoMes?.status === "DEVOLVIDO"
      ? 1
      : 0;
  const totalPendencias =
    ocorrenciasAbertas + solicitacoesPendentes + pendenciasHomologacao;
  const jornadaHoje =
    apuracaoHoje?.cargaPrevistaMinutos ??
    apuracoesMes.find(
      (item) => item.dataReferencia.getTime() === dataHoje.getTime(),
    )?.cargaPrevistaMinutos ??
    0;
  const tempoRealTrabalhado = calcularTempoRealTrabalhado(marcacoesHoje);
  const trabalhadoHoje =
    tempoRealTrabalhado
      ? Math.max(
          0,
          tempoRealTrabalhado.minutosBase +
            (tempoRealTrabalhado.emIntervalo
              ? 0
              : Math.floor(
                  (Date.now() -
                    new Date(tempoRealTrabalhado.inicioIso).getTime()) /
                    60000,
                )),
        )
      : (
    apuracaoHoje?.minutosTrabalhados ??
    apuracoesMes.find(
      (item) => item.dataReferencia.getTime() === dataHoje.getTime(),
    )?.minutosTrabalhados ??
    0
  );
  const saldoMinutos = saldoBancoHoras?.saldoMinutos ?? 0;
  const pendenciasBancoHoras =
    (saldoBancoHoras?.creditosPendentesMinutos ?? 0) +
    (saldoBancoHoras?.debitosPendentesMinutos ?? 0) +
    (saldoBancoHoras?.horasAcimaLimiteMinutos ?? 0) +
    (saldoBancoHoras?.horasNaoAutorizadasMinutos ?? 0);
  const alertas: AlertaServidor[] = [];

  if (totalPendencias > 0) {
    alertas.push({
      tipo: "warning",
      titulo: "Pendências de frequência",
      descricao: `${totalPendencias} item(ns) precisam de regularização na competência atual.`,
      acao: { label: "Ver solicitações", href: "/solicitacoes" },
    });
  }

  if (pendenciasBancoHoras > 0 || saldoMinutos < 0) {
    alertas.push({
      tipo: "warning",
      titulo: "Banco de horas requer atencao",
      descricao:
        saldoMinutos < 0
          ? `Saldo atual negativo de ${formatarSaldoBancoHoras(saldoMinutos)}.`
          : "Há movimentos de banco de horas pendentes de validação.",
      acao: { label: "Analisar saldo", href: "/banco-horas" },
    });
  }

  if (
    homologacaoMes?.status &&
    !["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(homologacaoMes.status)
  ) {
    alertas.push({
      tipo: "info",
      titulo: "Homologação mensal",
      descricao: "Seu espelho da competência atual ainda não foi homologado.",
      acao: { label: "Ver espelho", href: "/espelho-ponto" },
    });
  }

  if (alertas.length === 0) {
    alertas.push({
      tipo: "success",
      titulo: "Frequencia sem alertas",
      descricao: "Não há pendências abertas para a competência atual.",
    });
  }

  return {
    metricas: [
      {
        titulo: "Jornada hoje",
        valor: minutosParaTexto(jornadaHoje),
        descricao: "Jornada prevista",
        icon: Clock,
        variante: "info",
      },
      {
        titulo: "Trabalhado hoje",
        valor: minutosParaTexto(trabalhadoHoje),
        descricao: tempoRealTrabalhado
          ? "Calculado em tempo real"
          : "Horas apuradas",
        icon: Clock,
        variante: trabalhadoHoje >= jornadaHoje && jornadaHoje > 0 ? "success" : "info",
        tempoReal:
          tempoRealTrabalhado && !tempoRealTrabalhado.emIntervalo
            ? {
                inicioIso: tempoRealTrabalhado.inicioIso,
                minutosBase: tempoRealTrabalhado.minutosBase,
              }
            : undefined,
      },
      {
        titulo: "Banco de horas",
        valor: formatarSaldoBancoHoras(saldoMinutos),
        descricao:
          pendenciasBancoHoras > 0
            ? "Com movimento pendente"
            : "Saldo atual",
        icon: Hourglass,
        variante: varianteBancoHoras(saldoMinutos),
      },
      {
        titulo: "Pendencias",
        valor: String(totalPendencias),
        descricao: montarDescricaoPendencias(totalPendencias),
        icon: ClipboardList,
        variante: totalPendencias > 0 ? "warning" : "success",
      },
    ],
    alertas: alertas.slice(0, 3),
  };
}
