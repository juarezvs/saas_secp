import { prisma } from "@/shared/infrastructure/database/prisma";

export async function atualizarStatusFechamentoService(fechamentoId: string) {
  const homologacoes = await prisma.homologacaoServidorMes.findMany({
    where: {
      fechamentoId,
    },
    select: {
      status: true,
    },
  });

  if (homologacoes.length === 0) {
    return;
  }

  const todasHomologadas = homologacoes.every((item) =>
    ["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(item.status),
  );

  const algumaHomologada = homologacoes.some((item) =>
    ["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(item.status),
  );

  const novoStatus = todasHomologadas
    ? "HOMOLOGADO"
    : algumaHomologada
      ? "HOMOLOGADO_PARCIAL"
      : "EM_HOMOLOGACAO";

  await prisma.fechamentoMensalUnidade.update({
    where: {
      id: fechamentoId,
    },
    data: {
      status: novoStatus,
      homologadoEm: todasHomologadas ? new Date() : null,
    },
  });
}
