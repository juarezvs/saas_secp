import { prisma } from "@/shared/infrastructure/database/prisma";
import { atualizarResumoFechamentoService } from "./atualizar-resumo-fechamento.service";

export async function atualizarStatusFechamentoService(
  fechamentoId: string,
  params: { homologadoPorUsuarioId?: string | null } = {},
) {
  const homologacoes = await prisma.homologacaoServidorMes.findMany({
    where: {
      fechamentoId,
    },
    select: {
      status: true,
      homologadoEm: true,
      homologadoPorUsuarioId: true,
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
  const homologadoPorUsuarioId = todasHomologadas
    ? (params.homologadoPorUsuarioId ??
      homologacoes
        .filter((item) => item.homologadoPorUsuarioId)
        .sort(
          (a, b) =>
            (b.homologadoEm?.getTime() ?? 0) - (a.homologadoEm?.getTime() ?? 0),
        )[0]?.homologadoPorUsuarioId ??
      null)
    : null;

  await prisma.fechamentoMensalUnidade.update({
    where: {
      id: fechamentoId,
    },
    data: {
      status: novoStatus,
      homologadoEm: todasHomologadas ? new Date() : null,
      homologadoPorUsuarioId,
    },
  });

  await atualizarResumoFechamentoService(fechamentoId);
}
