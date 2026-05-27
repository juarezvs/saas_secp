"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { calcularSaldoBancoHoras } from "@/modules/banco-horas/application/services/calcular-banco-horas.service";

export async function validarMovimentosBancoHorasHomologacaoAction(
  formData: FormData,
) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeValidar =
    permissoes.includes("homologacao:gerenciar:chefia") ||
    permissoes.includes("homologacao:gerenciar:global");

  if (!podeValidar) {
    return;
  }

  const servidorId = String(formData.get("servidorId") ?? "");
  const fechamentoId = String(formData.get("fechamentoId") ?? "");
  const anoReferencia = Number(formData.get("anoReferencia") ?? 0);
  const mesReferencia = Number(formData.get("mesReferencia") ?? 0);

  if (!servidorId || !fechamentoId || !anoReferencia || !mesReferencia) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.movimentoBancoHoras.updateMany({
      where: {
        servidorId,
        anoReferencia,
        mesReferencia,
        status: "PENDENTE",
      },
      data: {
        status: "VALIDADO",
        autorizadoPorUsuarioId: session.user.id,
        autorizadoEm: new Date(),
      },
    });

    const movimentos = await tx.movimentoBancoHoras.findMany({
      where: {
        servidorId,
      },
      orderBy: {
        dataReferencia: "asc",
      },
    });

    const saldo = calcularSaldoBancoHoras(movimentos);

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

    await tx.homologacaoServidorMes.updateMany({
      where: {
        fechamentoId,
        servidorId,
      },
      data: {
        saldoBancoDepoisMinutos: saldo.saldoMinutos,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "MovimentoBancoHoras",
        entidadeId: servidorId,
        acao: "MOVIMENTOS_BANCO_HORAS_VALIDADOS_NA_HOMOLOGACAO",
        dadosDepois: {
          servidorId,
          anoReferencia,
          mesReferencia,
          fechamentoId,
          saldo,
        },
      },
    });
  });

  revalidatePath(`/homologacao/${fechamentoId}`);
  revalidatePath("/banco-horas");
}
