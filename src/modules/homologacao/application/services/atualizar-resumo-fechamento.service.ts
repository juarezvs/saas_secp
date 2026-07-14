import { prisma } from "@/shared/infrastructure/database/prisma";

type HomologacaoResumoItem = {
  status: string;
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosCredito: number;
  minutosDebito: number;
  faltas: number;
};

export function calcularResumoFechamento(homologacoes: HomologacaoResumoItem[]) {
  return homologacoes.reduce(
    (acc, item) => {
      acc.totalServidores += 1;
      acc.totalCargaPrevistaMinutos += item.cargaPrevistaMinutos;
      acc.totalMinutosTrabalhados += item.minutosTrabalhados;
      acc.totalMinutosCredito += item.minutosCredito;
      acc.totalMinutosDebito += item.minutosDebito;
      acc.totalFaltas += item.faltas;

      if (item.status === "PENDENTE") acc.totalPendentes += 1;
      if (item.status === "COM_PENDENCIAS") acc.totalComPendencias += 1;
      if (item.status === "HOMOLOGADO") acc.totalHomologados += 1;
      if (item.status === "HOMOLOGADO_COM_RESSALVA") {
        acc.totalHomologadosComRessalva += 1;
      }
      if (item.status === "DEVOLVIDO") acc.totalDevolvidos += 1;

      return acc;
    },
    {
      totalServidores: 0,
      totalPendentes: 0,
      totalComPendencias: 0,
      totalHomologados: 0,
      totalHomologadosComRessalva: 0,
      totalDevolvidos: 0,
      totalCargaPrevistaMinutos: 0,
      totalMinutosTrabalhados: 0,
      totalMinutosCredito: 0,
      totalMinutosDebito: 0,
      totalFaltas: 0,
    },
  );
}

export async function atualizarResumoFechamentoService(fechamentoId: string) {
  const homologacoes = await prisma.homologacaoServidorMes.findMany({
    where: {
      fechamentoId,
    },
    select: {
      status: true,
      cargaPrevistaMinutos: true,
      minutosTrabalhados: true,
      minutosCredito: true,
      minutosDebito: true,
      faltas: true,
    },
  });

  const resumo = calcularResumoFechamento(homologacoes);

  return prisma.fechamentoMensalUnidade.update({
    where: {
      id: fechamentoId,
    },
    data: resumo,
  });
}
