"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { validarAssinaturaDocumento } from "@/modules/documentos-autenticacao/application/services/validar-assinatura-documento.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { atualizarStatusFechamentoService } from "../services/atualizar-status-fechamento.service";
import { buscarHomologacaoServidorPorId } from "../../infrastructure/repositories/homologacao.repository";

type AssinaturaActionState = {
  erro?: string | null;
};

export async function homologarServidorMesAction(
  _state: AssinaturaActionState,
  formData: FormData,
): Promise<AssinaturaActionState> {
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
  const senhaAssinatura = String(formData.get("senhaAssinatura") ?? "");
  const cargoFuncaoAssinatura = String(
    formData.get("cargoFuncaoAssinatura") ?? "",
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

  const assinatura = await validarAssinaturaDocumento({
    session,
    senha: senhaAssinatura,
  }).catch((error: unknown) => {
    if (error instanceof Error) {
      return { erro: error.message } as const;
    }

    return { erro: "Não foi possível validar a assinatura." } as const;
  });

  if ("erro" in assinatura) {
    return { erro: assinatura.erro };
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
          assinatura: {
            usuarioId: assinatura.usuarioId,
            matricula: assinatura.matricula,
            nome: assinatura.nome,
            cargoFuncao: cargoFuncaoAssinatura || null,
            assinadoEm: assinatura.assinadoEm.toISOString(),
          },
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
