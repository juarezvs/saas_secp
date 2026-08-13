"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function excluirRascunhoHorasExtrasAction(requestId: string) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "horas-extras:cancelar:proprio",
    "horas-extras:solicitar:proprio",
  ]);

  if (!permissao.usuarioId) {
    redirect("/horas-extras");
  }

  const rascunho = await prisma.overtimeRequest.findFirst({
    where: {
      id: requestId,
      requesterUserId: permissao.usuarioId,
      currentLifecycleStatus: "DRAFT",
    },
    select: {
      id: true,
      requestNumber: true,
      employeeId: true,
      orgaoId: true,
      organizationalUnitId: true,
      currentLifecycleStatus: true,
    },
  });

  if (!rascunho) {
    revalidatePath("/horas-extras");
    redirect("/horas-extras");
  }

  await prisma.$transaction(async (tx) => {
    await tx.overtimeRequest.delete({
      where: {
        id: rascunho.id,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "OvertimeRequest",
        entidadeId: rascunho.id,
        acao: "HORAS_EXTRAS_RASCUNHO_EXCLUIDO",
        dadosAntes: {
          id: rascunho.id,
          requestNumber: rascunho.requestNumber,
          employeeId: rascunho.employeeId,
          orgaoId: rascunho.orgaoId,
          organizationalUnitId: rascunho.organizationalUnitId,
          status: rascunho.currentLifecycleStatus,
        },
        metadados: {
          permissao: permissao.permissoes.includes(
            "horas-extras:cancelar:proprio",
          )
            ? "horas-extras:cancelar:proprio"
            : "horas-extras:solicitar:proprio",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });
  });

  revalidatePath("/horas-extras");
  redirect("/horas-extras");
}
