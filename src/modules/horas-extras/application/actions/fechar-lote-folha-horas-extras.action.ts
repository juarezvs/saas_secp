"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function fecharLoteFolhaHorasExtrasAction(formData: FormData) {
  const batchId = String(formData.get("batchId") ?? "").trim();

  if (!batchId) {
    return;
  }

  const permissao = await exigirPermissao("horas-extras:fechar-lote:global");
  const lote = await prisma.overtimePayrollBatch.findUnique({
    where: {
      id: batchId,
    },
  });

  if (!lote) {
    return;
  }

  if (
    !permissao.perfilAtivoEscopoGlobal &&
    permissao.orgaoIds?.length &&
    !permissao.orgaoIds.includes(lote.orgaoId)
  ) {
    return;
  }

  if (!["PENDING_REVIEW", "READY_TO_CLOSE"].includes(lote.status)) {
    return;
  }

  const atualizado = await prisma.overtimePayrollBatch.update({
    where: {
      id: lote.id,
    },
    data: {
      status: "CLOSED",
      closedByUserId: permissao.usuarioId ?? null,
      closedAt: new Date(),
    },
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: permissao.usuarioId ?? null,
      entidade: "OvertimePayrollBatch",
      entidadeId: lote.id,
      acao: "HORAS_EXTRAS_LOTE_FOLHA_FECHADO",
      dadosAntes: {
        status: lote.status,
      },
      dadosDepois: {
        status: atualizado.status,
        closedAt: atualizado.closedAt,
      },
      metadados: {
        permissao: "horas-extras:fechar-lote:global",
        perfilAtivo: permissao.perfilAtivoCodigo,
      },
    },
  });

  revalidatePath("/folha/horas-extras");
  revalidatePath(`/folha/horas-extras/${lote.id}`);
  redirect(`/folha/horas-extras/${lote.id}`);
}
