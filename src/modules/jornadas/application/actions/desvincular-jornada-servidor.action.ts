"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

function hojeUtc() {
  const agora = new Date();
  return new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
  );
}

export async function desvincularJornadaServidorAction(formData: FormData) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "servidores:gerenciar:global",
  );
  const jornadaServidorId = String(formData.get("jornadaServidorId") ?? "");
  const servidorId = String(formData.get("servidorId") ?? "");

  if (!jornadaServidorId || !servidorId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const vinculo = await tx.jornadaServidor.findUnique({
      where: {
        id: jornadaServidorId,
      },
      include: {
        _count: {
          select: {
            marcacoes: true,
            apuracaoDiarias: true,
          },
        },
      },
    });

    if (!vinculo || vinculo.servidorId !== servidorId) {
      return;
    }

    const dadosAntes = {
      id: vinculo.id,
      servidorId: vinculo.servidorId,
      jornadaId: vinculo.jornadaId,
      escalaId: vinculo.escalaId,
      dataInicio: vinculo.dataInicio,
      dataFim: vinculo.dataFim,
      ativo: vinculo.ativo,
      status: vinculo.status,
    };
    const podeExcluir =
      vinculo._count.marcacoes === 0 && vinculo._count.apuracaoDiarias === 0;

    if (podeExcluir) {
      await tx.jornadaServidor.delete({
        where: {
          id: vinculo.id,
        },
      });
    } else {
      await tx.jornadaServidor.update({
        where: {
          id: vinculo.id,
        },
        data: {
          ativo: false,
          status: "DESVINCULADA",
          dataFim: vinculo.dataFim ?? hojeUtc(),
        },
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "JornadaServidor",
        entidadeId: vinculo.id,
        acao: podeExcluir
          ? "JORNADA_SERVIDOR_EXCLUIDA"
          : "JORNADA_SERVIDOR_DESVINCULADA",
        dadosAntes,
        dadosDepois: podeExcluir
          ? Prisma.JsonNull
          : {
              ...dadosAntes,
              ativo: false,
              status: "DESVINCULADA",
              dataFim: vinculo.dataFim ?? hojeUtc(),
            },
      },
    });
  });

  revalidatePath("/jornadas");
  revalidatePath("/jornadas/atribuicoes");
  revalidatePath("/servidores");
  revalidatePath(`/servidores/${servidorId}`);
}
