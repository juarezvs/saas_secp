import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";
import type { RepositorioComparacaoMct } from "../../application/services/executar-comparacao-shadow.service";

function json(valor: unknown) {
  return JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;
}

export const mctComparacaoPrismaRepository: RepositorioComparacaoMct = {
  async salvarComparacao({ execucaoId, legado, comparacao }) {
    await prisma.mctComparacaoLegado.upsert({
      where: { execucaoId },
      create: {
        execucaoId,
        legadoSnapshot: json(legado),
        divergencias: json(comparacao.divergencias),
        totalDivergencias: comparacao.totalDivergencias,
        possuiDivergenciaCritica: comparacao.possuiDivergenciaCritica,
      },
      update: {
        legadoSnapshot: json(legado),
        divergencias: json(comparacao.divergencias),
        totalDivergencias: comparacao.totalDivergencias,
        possuiDivergenciaCritica: comparacao.possuiDivergenciaCritica,
        comparadoEm: new Date(),
      },
    });
  },
};

