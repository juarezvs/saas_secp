"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { atualizarStatusFechamentoService } from "../services/atualizar-status-fechamento.service";
import { buscarHomologacaoServidorPorId } from "../../infrastructure/repositories/homologacao.repository";

export async function homologarServidorMesAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];
  const perfilChefiaAtivo =
    session.user.perfilAtivo?.codigo?.toUpperCase() === "CHEFIA";
  const podeHomologarComoChefia =
    perfilChefiaAtivo || permissoes.includes("homologacao:gerenciar:chefia");
  const podeHomologarGlobal = permissoes.includes(
    "homologacao:gerenciar:global",
  );
  const podeHomologar = podeHomologarComoChefia || podeHomologarGlobal;

  if (!podeHomologar) {
    redirect("/acesso-negado");
  }

  const homologacaoServidorId = String(
    formData.get("homologacaoServidorId") ?? "",
  );
  const status = String(formData.get("status") ?? "HOMOLOGADO");
  const observacaoChefia = String(
    formData.get("observacaoChefia") ?? "",
  ).trim();

  if (!homologacaoServidorId) {
    throw new Error("Homologação do servidor não informada.");
  }

  const homologacaoAtual = await buscarHomologacaoServidorPorId(
    homologacaoServidorId,
  );

  if (!homologacaoAtual) {
    throw new Error("Homologação do servidor não encontrada.");
  }

  if (
    ["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(homologacaoAtual.status)
  ) {
    throw new Error("Este espelho já foi homologado.");
  }

  if (
    !["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA", "DEVOLVIDO"].includes(status)
  ) {
    throw new Error("Status de homologação inválido.");
  }

  if (!podeHomologarGlobal) {
    const unidadesSubordinadas = await listarIdsUnidadesSubordinadasPorUsuario(
      session.user.id,
    );
    const fechamentoEstaAbaixoDaChefia = unidadesSubordinadas.includes(
      homologacaoAtual.fechamento.unidadeId,
    );
    const servidorEstaAbaixoDaChefia = homologacaoAtual.servidor.lotacoes.some(
      (lotacao) => unidadesSubordinadas.includes(lotacao.unidadeId),
    );

    if (!fechamentoEstaAbaixoDaChefia && !servidorEstaAbaixoDaChefia) {
      redirect("/acesso-negado");
    }
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

  await atualizarStatusFechamentoService(homologacaoAtual.fechamentoId, {
    homologadoPorUsuarioId: status === "DEVOLVIDO" ? null : session.user.id,
  });

  revalidatePath(`/homologacao/${homologacaoAtual.fechamentoId}`);
  revalidatePath("/homologacao");
  redirect(`/homologacao/${homologacaoAtual.fechamentoId}`);
}
