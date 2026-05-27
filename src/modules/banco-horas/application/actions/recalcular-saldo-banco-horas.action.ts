"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { calcularSaldoBancoHoras } from "../services/calcular-banco-horas.service";

export async function recalcularSaldoBancoHorasAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("banco-horas:gerenciar:global")) {
    return;
  }

  const servidorId = String(formData.get("servidorId") ?? "");

  if (!servidorId) {
    return;
  }

  const movimentos = await prisma.movimentoBancoHoras.findMany({
    where: {
      servidorId,
    },
    orderBy: {
      dataReferencia: "asc",
    },
  });

  const saldo = calcularSaldoBancoHoras(movimentos);

  await prisma.$transaction(async (tx) => {
    await tx.bancoHorasSaldo.upsert({
      where: {
        servidorId,
      },
      update: saldo,
      create: {
        servidorId,
        ...saldo,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "BancoHorasSaldo",
        entidadeId: servidorId,
        acao: "BANCO_HORAS_SALDO_RECALCULADO",
        dadosDepois: {
          servidorId,
          ...saldo,
        },
      },
    });
  });

  revalidatePath("/banco-horas");
}