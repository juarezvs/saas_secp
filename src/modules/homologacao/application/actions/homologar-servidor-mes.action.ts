"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { atualizarStatusFechamentoService } from "../services/atualizar-status-fechamento.service";
import { buscarHomologacaoServidorPorId } from "../../infrastructure/repositories/homologacao.repository";

export async function homologarServidorMesAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeHomologar =
    permissoes.includes("homologacao:gerenciar:chefia") ||
    permissoes.includes("homologacao:gerenciar:global");

  if (!podeHomologar) {
    return;
  }

  const homologacaoServidorId = String(
    formData.get("homologacaoServidorId") ?? "",
  );
  const status = String(formData.get("status") ?? "HOMOLOGADO");
  const observacaoChefia = String(
    formData.get("observacaoChefia") ?? "",
  ).trim();

  if (!homologacaoServidorId) {
    return;
  }

  const homologacaoAtual = await buscarHomologacaoServidorPorId(
    homologacaoServidorId,
  );

  if (!homologacaoAtual) {
    return;
  }

  if (
    !["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA", "DEVOLVIDO"].includes(status)
  ) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.homologacaoServidorMes.update({
      where: {
        id: homologacaoServidorId,
      },
      data: {
        status: status as never,
        observacaoChefia: observacaoChefia || null,
        homologadoPorUsuarioId: status === "DEVOLVIDO" ? null : session.user.id,
        homologadoEm: status === "DEVOLVIDO" ? null : new Date(),
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "HomologacaoServidorMes",
        entidadeId: homologacaoServidorId,
        acao:
          status === "DEVOLVIDO"
            ? "HOMOLOGACAO_SERVIDOR_DEVOLVIDA"
            : "HOMOLOGACAO_SERVIDOR_REALIZADA",
        dadosAntes: {
          status: homologacaoAtual.status,
          observacaoChefia: homologacaoAtual.observacaoChefia,
        },
        dadosDepois: {
          status,
          observacaoChefia,
          servidorId: homologacaoAtual.servidorId,
          fechamentoId: homologacaoAtual.fechamentoId,
        },
      },
    });
  });

  await atualizarStatusFechamentoService(homologacaoAtual.fechamentoId);

  revalidatePath(`/homologacao/${homologacaoAtual.fechamentoId}`);
  revalidatePath("/homologacao");
}
