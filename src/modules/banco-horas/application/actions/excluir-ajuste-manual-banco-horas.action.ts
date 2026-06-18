"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { usuarioPossuiPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { calcularSaldoBancoHoras } from "../services/calcular-banco-horas.service";

const excluirAjusteManualBancoHorasSchema = z.object({
  movimentoId: z.string().uuid(),
});

function anexarMetadadosEstorno(metadados: unknown, usuarioId: string) {
  const base =
    metadados && typeof metadados === "object" && !Array.isArray(metadados)
      ? (JSON.parse(JSON.stringify(metadados)) as Record<string, unknown>)
      : {};

  return {
    ...base,
    estornoAdministrativo: {
      usuarioId,
      estornadoEm: new Date().toISOString(),
      motivo: "Exclusao de lancamento administrativo equivocado.",
    },
  };
}

export async function excluirAjusteManualBancoHorasAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  if (
    !usuarioPossuiPermissaoNoPerfil(
      session.user.perfilAtivo?.codigo,
      session.user.perfilAtivo?.permissoes,
      "banco-horas:gerenciar:global",
    )
  ) {
    return;
  }

  const parsed = excluirAjusteManualBancoHorasSchema.safeParse({
    movimentoId: formData.get("movimentoId"),
  });

  if (!parsed.success) {
    return;
  }

  const movimentoAtual = await prisma.movimentoBancoHoras.findUnique({
    where: {
      id: parsed.data.movimentoId,
    },
  });

  if (
    !movimentoAtual ||
    movimentoAtual.origem !== "AJUSTE_ADMINISTRATIVO" ||
    ["ESTORNADO", "DESCONSIDERADO", "EXPIRADO"].includes(movimentoAtual.status)
  ) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const movimentoEstornado = await tx.movimentoBancoHoras.update({
      where: {
        id: movimentoAtual.id,
      },
      data: {
        status: "ESTORNADO",
        observacao: movimentoAtual.observacao
          ? `${movimentoAtual.observacao}\n\nLancamento excluido/estornado administrativamente.`
          : "Lancamento excluido/estornado administrativamente.",
        metadados: anexarMetadadosEstorno(
          movimentoAtual.metadados,
          session.user.id,
        ),
      },
    });

    const movimentos = await tx.movimentoBancoHoras.findMany({
      where: {
        servidorId: movimentoAtual.servidorId,
      },
      orderBy: {
        dataReferencia: "asc",
      },
    });
    const saldo = calcularSaldoBancoHoras(movimentos);

    await tx.bancoHorasSaldo.upsert({
      where: {
        servidorId: movimentoAtual.servidorId,
      },
      update: saldo,
      create: {
        servidorId: movimentoAtual.servidorId,
        ...saldo,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "MovimentoBancoHoras",
        entidadeId: movimentoAtual.id,
        acao: "BANCO_HORAS_AJUSTE_MANUAL_EXCLUIDO",
        dadosAntes: {
          id: movimentoAtual.id,
          servidorId: movimentoAtual.servidorId,
          tipo: movimentoAtual.tipo,
          origem: movimentoAtual.origem,
          status: movimentoAtual.status,
          dataReferencia: movimentoAtual.dataReferencia,
          minutos: movimentoAtual.minutos,
        },
        dadosDepois: {
          id: movimentoEstornado.id,
          status: movimentoEstornado.status,
          servidorId: movimentoEstornado.servidorId,
          saldo,
        },
      },
    });
  });

  revalidatePath("/banco-horas");
  revalidatePath("/homologacao");
}
